export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

export interface Transaction {
  id: string;
  type: 'sent' | 'received' | 'topup';
  amount: number;
  counterpart?: string;
  counterpartId?: string;
  label: string;
  date: string;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  expenses: GroupExpense[];
}

export interface GroupMember {
  userId: string;
  name: string;
  balance: number; // positive = owed money, negative = owes money
}

export interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  paidByUserId: string;
  paidByName: string;
  splitAmong: string[]; // user IDs
  date: string;
}
