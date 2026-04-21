import uuid
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models.group import ExpenseSplit, Group, GroupExpense, GroupMember
from app.models.user import User
from app.schemas.group import (
    ExpenseCreate,
    GroupCreate,
    GroupDetail,
    GroupDetailExpense,
    GroupDetailMember,
    GroupExpenseRead,
    GroupRead,
    MemberAdd,
    PairBalance,
    SettleRequest,
)
from app.services.transfer_service import execute_transfer, normalize_amount

router = APIRouter(prefix="/groups", tags=["groups"])


def iso_z(value) -> str:
    return value.isoformat().replace("+00:00", "Z") + ("Z" if value.tzinfo is None else "")


async def require_group(session: AsyncSession, group_id: uuid.UUID) -> Group:
    group = await session.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


async def require_member(session: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> None:
    member = await session.get(GroupMember, {"group_id": group_id, "user_id": user_id})
    if member is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a group member")


async def build_group_detail(session: AsyncSession, group: Group) -> GroupDetail:
    members_result = await session.execute(
        select(GroupMember.user_id, User.name)
        .join(User, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group.id)
        .order_by(User.name.asc())
    )
    member_rows = list(members_result.all())
    balances = {user_id: Decimal("0.00") for user_id, _ in member_rows}

    splits_result = await session.execute(
        select(ExpenseSplit, GroupExpense)
        .join(GroupExpense, ExpenseSplit.expense_id == GroupExpense.id)
        .where(GroupExpense.group_id == group.id, ExpenseSplit.settled.is_(False), ExpenseSplit.user_id != GroupExpense.paid_by)
    )
    for split, expense in splits_result.all():
        balances[split.user_id] = balances.get(split.user_id, Decimal("0.00")) - split.amount
        balances[expense.paid_by] = balances.get(expense.paid_by, Decimal("0.00")) + split.amount

    expenses_result = await session.execute(
        select(GroupExpense, User.name)
        .join(User, GroupExpense.paid_by == User.id)
        .where(GroupExpense.group_id == group.id)
        .order_by(GroupExpense.created_at.desc())
    )
    expense_rows = list(expenses_result.all())
    expense_ids = [expense.id for expense, _ in expense_rows]
    split_among: dict[uuid.UUID, list[uuid.UUID]] = {expense_id: [] for expense_id in expense_ids}
    if expense_ids:
        split_result = await session.execute(
            select(ExpenseSplit.expense_id, ExpenseSplit.user_id)
            .where(ExpenseSplit.expense_id.in_(expense_ids))
            .order_by(ExpenseSplit.user_id.asc())
        )
        for expense_id, user_id in split_result.all():
            split_among.setdefault(expense_id, []).append(user_id)

    return GroupDetail(
        id=group.id,
        name=group.name,
        members=[
            GroupDetailMember(userId=user_id, name=name, balance=balances.get(user_id, Decimal("0.00")))
            for user_id, name in member_rows
        ],
        expenses=[
            GroupDetailExpense(
                id=expense.id,
                description=expense.description,
                amount=expense.total_amount,
                paidByUserId=expense.paid_by,
                paidByName=paid_by_name,
                splitAmong=split_among.get(expense.id, []),
                date=iso_z(expense.created_at),
            )
            for expense, paid_by_name in expense_rows
        ],
    )


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Group:
    group = Group(name=payload.name, created_by=current_user.id)
    session.add(group)
    await session.flush()
    session.add(GroupMember(group_id=group.id, user_id=current_user.id))
    await session.commit()
    await session.refresh(group)
    return group


@router.get("", response_model=list[GroupDetail])
async def list_groups(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[GroupDetail]:
    result = await session.execute(
        select(Group)
        .join(GroupMember, Group.id == GroupMember.group_id)
        .where(GroupMember.user_id == current_user.id)
        .order_by(Group.created_at.desc())
    )
    groups = list(result.scalars().all())
    return [await build_group_detail(session, group) for group in groups]


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupDetail:
    group = await require_group(session, group_id)
    await require_member(session, group_id, current_user.id)
    return await build_group_detail(session, group)


@router.post("/{group_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member(
    group_id: uuid.UUID,
    payload: MemberAdd,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_group(session, group_id)
    await require_member(session, group_id, current_user.id)
    user = await session.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    existing = await session.get(GroupMember, {"group_id": group_id, "user_id": payload.user_id})
    if existing is None:
        session.add(GroupMember(group_id=group_id, user_id=payload.user_id))
        await session.commit()
    return {"status": "ok"}


@router.post("/{group_id}/expenses", response_model=GroupExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    group_id: uuid.UUID,
    payload: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> GroupExpense:
    await require_group(session, group_id)
    await require_member(session, group_id, current_user.id)
    await require_member(session, group_id, payload.paid_by)
    result = await session.execute(select(GroupMember).where(GroupMember.group_id == group_id))
    members = list(result.scalars().all())
    if not members:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group has no members")
    total = normalize_amount(payload.total_amount)
    share = (total / Decimal(len(members))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    expense = GroupExpense(group_id=group_id, paid_by=payload.paid_by, total_amount=total, description=payload.description)
    session.add(expense)
    await session.flush()
    remainder = total
    for index, member in enumerate(members):
        amount = share if index < len(members) - 1 else remainder
        remainder -= amount
        session.add(ExpenseSplit(expense_id=expense.id, user_id=member.user_id, amount=amount))
    await session.commit()
    await session.refresh(expense)
    return expense


@router.get("/{group_id}/balances", response_model=list[PairBalance])
async def balances(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[PairBalance]:
    await require_group(session, group_id)
    await require_member(session, group_id, current_user.id)
    result = await session.execute(
        select(ExpenseSplit, GroupExpense, User)
        .join(GroupExpense, ExpenseSplit.expense_id == GroupExpense.id)
        .join(User, ExpenseSplit.user_id == User.id)
        .where(GroupExpense.group_id == group_id, ExpenseSplit.settled.is_(False), ExpenseSplit.user_id != GroupExpense.paid_by)
    )
    direct: dict[tuple[uuid.UUID, uuid.UUID], Decimal] = {}
    names: dict[uuid.UUID, str] = {}
    payer_ids = {row.GroupExpense.paid_by for row in result.all()}
    result = await session.execute(
        select(ExpenseSplit, GroupExpense, User)
        .join(GroupExpense, ExpenseSplit.expense_id == GroupExpense.id)
        .join(User, ExpenseSplit.user_id == User.id)
        .where(GroupExpense.group_id == group_id, ExpenseSplit.settled.is_(False), ExpenseSplit.user_id != GroupExpense.paid_by)
    )
    for split, expense, debtor in result.all():
        direct[(split.user_id, expense.paid_by)] = direct.get((split.user_id, expense.paid_by), Decimal("0.00")) + split.amount
        names[debtor.id] = debtor.name
    if payer_ids:
        payers = await session.execute(select(User).where(User.id.in_(payer_ids)))
        names.update({payer.id: payer.name for payer in payers.scalars().all()})
    output: list[PairBalance] = []
    seen: set[tuple[uuid.UUID, uuid.UUID]] = set()
    for (debtor_id, creditor_id), amount in direct.items():
        if (debtor_id, creditor_id) in seen:
            continue
        reverse = direct.get((creditor_id, debtor_id), Decimal("0.00"))
        net = amount - reverse
        seen.add((debtor_id, creditor_id))
        seen.add((creditor_id, debtor_id))
        if net > Decimal("0.00"):
            output.append(PairBalance(debtor_id=debtor_id, debtor_name=names[debtor_id], creditor_id=creditor_id, creditor_name=names[creditor_id], amount=net))
        elif net < Decimal("0.00"):
            output.append(PairBalance(debtor_id=creditor_id, debtor_name=names[creditor_id], creditor_id=debtor_id, creditor_name=names[debtor_id], amount=-net))
    return output


@router.post("/{group_id}/settle")
async def settle(
    group_id: uuid.UUID,
    payload: SettleRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, Decimal | str]:
    await require_group(session, group_id)
    await require_member(session, group_id, current_user.id)
    await require_member(session, group_id, payload.debtor_id)
    await require_member(session, group_id, payload.creditor_id)
    result = await session.execute(
        select(ExpenseSplit)
        .join(GroupExpense, ExpenseSplit.expense_id == GroupExpense.id)
        .where(
            and_(
                GroupExpense.group_id == group_id,
                GroupExpense.paid_by == payload.creditor_id,
                ExpenseSplit.user_id == payload.debtor_id,
                ExpenseSplit.settled.is_(False),
            )
        )
        .with_for_update()
    )
    splits = list(result.scalars().all())
    amount = sum((split.amount for split in splits), Decimal("0.00"))
    if amount <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to settle")
    try:
        await execute_transfer(session, payload.debtor_id, payload.creditor_id, amount, "Group expense settlement")
        for split in splits:
            split.settled = True
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    return {"status": "ok", "amount": amount}
