// services/auth.ts
import { User } from '@/types';
import { apiFetch } from './api';

export async function signup(name: string, email: string, password: string): Promise<User> {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  localStorage.setItem('habipay_token', data.token);
  localStorage.setItem('habipay_current_user', JSON.stringify(data.user));
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('habipay_token', data.token);
  localStorage.setItem('habipay_current_user', JSON.stringify(data.user));
  return data.user;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('habipay_token');
  localStorage.removeItem('habipay_current_user');
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem('habipay_current_user');
  return raw ? JSON.parse(raw) : null;
}

export async function refreshCurrentUser(): Promise<User | null> {
  try {
    const user = await apiFetch('/me');
    localStorage.setItem('habipay_current_user', JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  return apiFetch('/users');
}