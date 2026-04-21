from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial_habipay"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    transaction_type = postgresql.ENUM("top_up", "transfer", name="transaction_type", create_type=False)
    recurring_frequency = postgresql.ENUM("weekly", "monthly", name="recurring_frequency", create_type=False)
    transaction_type.create(op.get_bind(), checkfirst=True)
    recurring_frequency.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("balance", sa.Numeric(18, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)

    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_groups_created_by"), "groups", ["created_by"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("receiver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("type", transaction_type, nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["receiver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transactions_receiver_id"), "transactions", ["receiver_id"], unique=False)
    op.create_index(op.f("ix_transactions_sender_id"), "transactions", ["sender_id"], unique=False)

    op.create_table(
        "group_members",
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("group_id", "user_id"),
    )

    op.create_table(
        "group_expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("paid_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"]),
        sa.ForeignKeyConstraint(["paid_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_group_expenses_group_id"), "group_expenses", ["group_id"], unique=False)
    op.create_index(op.f("ix_group_expenses_paid_by"), "group_expenses", ["paid_by"], unique=False)

    op.create_table(
        "expense_splits",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expense_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("settled", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["group_expenses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_expense_splits_expense_id"), "expense_splits", ["expense_id"], unique=False)
    op.create_index(op.f("ix_expense_splits_user_id"), "expense_splits", ["user_id"], unique=False)

    op.create_table(
        "recurring_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("frequency", recurring_frequency, nullable=False),
        sa.Column("next_run_at", sa.DateTime(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["from_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["to_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recurring_payments_active"), "recurring_payments", ["active"], unique=False)
    op.create_index(op.f("ix_recurring_payments_from_user_id"), "recurring_payments", ["from_user_id"], unique=False)
    op.create_index(op.f("ix_recurring_payments_next_run_at"), "recurring_payments", ["next_run_at"], unique=False)
    op.create_index(op.f("ix_recurring_payments_to_user_id"), "recurring_payments", ["to_user_id"], unique=False)

    op.create_table(
        "payment_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("pay_count", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_payment_links_creator_id"), "payment_links", ["creator_id"], unique=False)
    op.create_index(op.f("ix_payment_links_token"), "payment_links", ["token"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_links_token"), table_name="payment_links")
    op.drop_index(op.f("ix_payment_links_creator_id"), table_name="payment_links")
    op.drop_table("payment_links")
    op.drop_index(op.f("ix_recurring_payments_to_user_id"), table_name="recurring_payments")
    op.drop_index(op.f("ix_recurring_payments_next_run_at"), table_name="recurring_payments")
    op.drop_index(op.f("ix_recurring_payments_from_user_id"), table_name="recurring_payments")
    op.drop_index(op.f("ix_recurring_payments_active"), table_name="recurring_payments")
    op.drop_table("recurring_payments")
    op.drop_index(op.f("ix_expense_splits_user_id"), table_name="expense_splits")
    op.drop_index(op.f("ix_expense_splits_expense_id"), table_name="expense_splits")
    op.drop_table("expense_splits")
    op.drop_index(op.f("ix_group_expenses_paid_by"), table_name="group_expenses")
    op.drop_index(op.f("ix_group_expenses_group_id"), table_name="group_expenses")
    op.drop_table("group_expenses")
    op.drop_table("group_members")
    op.drop_index(op.f("ix_transactions_sender_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_receiver_id"), table_name="transactions")
    op.drop_table("transactions")
    op.drop_index(op.f("ix_groups_created_by"), table_name="groups")
    op.drop_table("groups")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    postgresql.ENUM(name="recurring_frequency").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="transaction_type").drop(op.get_bind(), checkfirst=True)
