// services/groups.ts
import { Group } from '@/types';
import { apiFetch } from './api';

export async function getGroups(): Promise<Group[]> {
  return apiFetch('/groups');
}

export async function createGroup(name: string, memberIds: string[]): Promise<Group> {
  const group = await apiFetch('/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  // Agregar miembros uno por uno (excepto el creador, que se agrega solo)
  for (const userId of memberIds) {
    await apiFetch(`/groups/${group.id}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
  return apiFetch(`/groups/${group.id}`);
}

export async function addExpense(
  groupId: string,
  description: string,
  amount: number,
  paidByUserId: string,
  splitAmong: string[]
): Promise<Group> {
  await apiFetch(`/groups/${groupId}/expenses`, {
    method: 'POST',
    body: JSON.stringify({
      paid_by: paidByUserId,
      total_amount: amount.toFixed(2),
      description,
    }),
  });
  return apiFetch(`/groups/${groupId}`);
}

export async function settleDebt(
  groupId: string,
  fromUserId: string,
  toUserId: string,
  amount: number
): Promise<Group> {
  await apiFetch(`/groups/${groupId}/settle`, {
    method: 'POST',
    body: JSON.stringify({
      debtor_id: fromUserId,
      creditor_id: toUserId,
    }),
  });
  return apiFetch(`/groups/${groupId}`);
}