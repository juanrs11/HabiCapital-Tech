// services/transactions.ts
import { Transaction } from '@/types';
import { apiFetch } from './api';

export async function getTransactions(userId: string): Promise<Transaction[]> {
  return apiFetch('/transfers/history');
}

export async function addFunds(userId: string, currentBalance: number, amount: number): Promise<Transaction> {
  return apiFetch('/accounts/topup', {
    method: 'POST',
    body: JSON.stringify({ amount: amount.toFixed(2) }),
  });
}

export async function getTags(): Promise<string[]> {
  return apiFetch('/transfers/tags');
}

export async function sendMoney(
  senderId: string,
  senderBalance: number,
  recipientId: string,
  amount: number,
  label: string
): Promise<Transaction> {
  return apiFetch('/transfers', {
    method: 'POST',
    body: JSON.stringify({
      receiver_id: recipientId,
      amount: amount.toFixed(2),
      description: label,
    }),
  });
}