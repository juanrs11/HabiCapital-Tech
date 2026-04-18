import { apiFetch } from './api';

export interface PaymentLink {
  id: string;
  token: string;
  creatorId: string;
  amount: number;
  description: string;
  payCount: number;
  active: boolean;
  createdAt: string;
}

export interface PublicPaymentLink {
  creatorName: string;
  amount: number;
  description: string;
}

export async function getMyPaymentLinks(): Promise<PaymentLink[]> {
  const data = await apiFetch('/payment-links');
  return data.map((l: any) => ({
    id: l.id,
    token: l.token,
    creatorId: l.creator_id,
    amount: parseFloat(l.amount),
    description: l.description,
    payCount: l.pay_count,
    active: l.active,
    createdAt: l.created_at,
  }));
}

export async function createPaymentLink(
  amount: number,
  description: string
): Promise<PaymentLink> {
  const data = await apiFetch('/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      amount: amount.toFixed(2),
      description,
    }),
  });
  return {
    id: data.id,
    token: data.token,
    creatorId: data.creator_id,
    amount: parseFloat(data.amount),
    description: data.description,
    payCount: data.pay_count,
    active: data.active,
    createdAt: data.created_at,
  };
}

export async function resolvePaymentLink(token: string): Promise<PublicPaymentLink> {
  const data = await apiFetch(`/payment-links/${token}`);
  return {
    creatorName: data.creator_name,
    amount: parseFloat(data.amount),
    description: data.description,
  };
}

export async function payPaymentLink(token: string): Promise<{ balance: number }> {
  const data = await apiFetch(`/payment-links/${token}/pay`, { method: 'POST' });
  return { balance: parseFloat(data.balance) };
}