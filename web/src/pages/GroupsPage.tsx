import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGroups, createGroup, addExpense, settleDebt } from '@/services/groups';
import { getAllUsers } from '@/services/auth';
import { Group, User } from '@/types';
import { Plus, ChevronRight, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function GroupsPage() {
  const { user, refreshUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [others, setOthers] = useState<User[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'expense'>('list');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('');

  useEffect(() => {
    if (user) {
      getGroups().then(setGroups);
      getAllUsers().then(setOthers).catch(() => setOthers([]));
    }
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length === 0) return;
    const g = await createGroup(groupName, [user.id, ...selectedMembers]);
    setGroups(prev => [...prev, g]);
    setGroupName('');
    setSelectedMembers([]);
    setView('list');
  };

  const handleAddExpense = async () => {
    if (!selectedGroup || !expDesc || !expAmount || !expPayer) return;
    const updated = await addExpense(
      selectedGroup.id,
      expDesc,
      parseFloat(expAmount),
      expPayer,
      selectedGroup.members.map(m => m.userId)
    );
    setSelectedGroup(updated);
    setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
    setExpDesc('');
    setExpAmount('');
    setExpPayer('');
    setView('detail');
  };

  const handleSettle = async (fromId: string, toId: string, amount: number) => {
    if (!selectedGroup) return;
    try {
      const updated = await settleDebt(selectedGroup.id, fromId, toId, Math.abs(amount));
      await refreshUser();
      setSelectedGroup(updated);
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-heading text-foreground">Groups</h2>
              <button onClick={() => setView('create')} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <Plus className="h-4 w-4 inline mr-1" />New
              </button>
            </div>
            {groups.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No groups yet</p>}
            <div className="space-y-2">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGroup(g); setView('detail'); }}
                  className="w-full flex items-center justify-between rounded-xl bg-card p-4 shadow-card hover:shadow-elevated transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.members.length} members • {g.expenses.length} expenses</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'create' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading text-foreground">Create group</h2>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Add members</p>
              <div className="space-y-2">
                {others.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading users...</p>
                )}
                {others.map(u => {
                  const selected = selectedMembers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedMembers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 transition ${selected ? 'bg-primary/10 border border-primary' : 'bg-card shadow-card'}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">{u.name.charAt(0)}</div>
                      <span className="text-sm text-foreground">{u.name}</span>
                      {selected && <Check className="h-4 w-4 text-primary ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={handleCreateGroup} disabled={!groupName || selectedMembers.length === 0} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Create group
            </button>
            <button onClick={() => setView('list')} className="w-full text-sm text-muted-foreground">Cancel</button>
          </div>
        )}

        {view === 'detail' && selectedGroup && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-heading text-foreground">{selectedGroup.name}</h2>
              <button onClick={() => { setExpPayer(user.id); setView('expense'); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                Add expense
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Balances</p>
              {selectedGroup.members.map(m => (
                <div key={m.userId} className="flex items-center justify-between rounded-xl bg-card p-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">{m.name.charAt(0)}</div>
                    <span className="text-sm text-foreground">{m.name}{m.userId === user.id ? ' (you)' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${m.balance > 0 ? 'text-success' : m.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {m.balance > 0 ? '+' : ''}{m.balance === 0 ? 'Settled' : `$${Math.abs(m.balance).toFixed(2)}`}
                    </span>
                    {m.balance < 0 && m.userId === user.id && (
                      <button
                        onClick={() => {
                          const creditor = selectedGroup.members.find(mem => mem.balance > 0);
                          if (creditor) handleSettle(user.id, creditor.userId, m.balance);
                        }}
                        className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground font-medium"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Expenses</p>
              {selectedGroup.expenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No expenses yet</p>}
              {selectedGroup.expenses.map(exp => (
                <div key={exp.id} className="rounded-xl bg-card p-3 shadow-card">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">{exp.description}</span>
                    <span className="text-sm font-semibold text-foreground">${exp.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Paid by {exp.paidByName} • {new Date(exp.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>

            <button onClick={() => { setSelectedGroup(null); setView('list'); }} className="w-full text-sm text-muted-foreground">← Back to groups</button>
          </div>
        )}

        {view === 'expense' && selectedGroup && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading text-foreground">Add expense</h2>
            <input
              value={expDesc}
              onChange={e => setExpDesc(e.target.value)}
              placeholder="Description (e.g. Dinner)"
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              value={expAmount}
              onChange={e => setExpAmount(e.target.value)}
              placeholder="Total amount"
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              min="0"
              step="0.01"
            />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Who paid?</p>
              <div className="flex gap-2 flex-wrap">
                {selectedGroup.members.map(m => (
                  <button
                    key={m.userId}
                    onClick={() => setExpPayer(m.userId)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${expPayer === m.userId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Split equally among all {selectedGroup.members.length} members</p>
            <button onClick={handleAddExpense} disabled={!expDesc || !expAmount || !expPayer} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Add expense
            </button>
            <button onClick={() => setView('detail')} className="w-full text-sm text-muted-foreground">Cancel</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}