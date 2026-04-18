import { apiFetch } from './api';

export interface RecurringPayment {
  id: string;
  fromUserId: string;
  toUserId: string;
  toName: string;
  amount: number;
  label: string;
  frequency: 'weekly' | 'monthly';
  nextRunAt: string;
  active: boolean;
  createdAt: string;
}

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  const data = await apiFetch('/recurring');
  return data.map((p: any) => ({
    id: p.id,
    fromUserId: p.from_user_id,
    toUserId: p.to_user_id,
    toName: p.to_name,
    amount: parseFloat(p.amount),
    label: p.label,
    frequency: p.frequency,
    nextRunAt: p.next_run_at,
    active: p.active,
    createdAt: p.created_at,
  }));
}

export async function createRecurringPayment(
  toUserId: string,
  amount: number,
  label: string,
  frequency: 'weekly' | 'monthly',
  startDate: string
): Promise<RecurringPayment> {
  const data = await apiFetch('/recurring', {
    method: 'POST',
    body: JSON.stringify({
      to_user_id: toUserId,
      amount: amount.toFixed(2),
      label,
      frequency,
      start_date: startDate,
    }),
  });
  return {
    id: data.id,
    fromUserId: data.from_user_id,
    toUserId: data.to_user_id,
    toName: data.to_name,
    amount: parseFloat(data.amount),
    label: data.label,
    frequency: data.frequency,
    nextRunAt: data.next_run_at,
    active: data.active,
    createdAt: data.created_at,
  };
}

export async function cancelRecurringPayment(id: string): Promise<void> {
  await apiFetch(`/recurring/${id}`, { method: 'DELETE' });
}

export async function tickRecurring(): Promise<{ executed: number; skipped: number }> {
  return apiFetch('/recurring/tick', { method: 'POST' });
}