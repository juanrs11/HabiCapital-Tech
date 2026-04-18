import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getRecurringPayments,
  createRecurringPayment,
  cancelRecurringPayment,
  tickRecurring,
  RecurringPayment,
} from '@/services/recurring';
import { getAllUsers } from '@/services/auth';
import { User } from '@/types';
import { Plus, RefreshCw, Trash2, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function RecurringPage() {
  const { user, refreshUser } = useAuth();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [loading, setLoading] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [tickResult, setTickResult] = useState<{ executed: number; skipped: number } | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (user) {
      getRecurringPayments().then(setPayments).catch(() => setPayments([]));
      getAllUsers().then(setAllUsers).catch(() => setAllUsers([]));
    }
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const handleCreate = async () => {
    if (!toUserId || !amount || !label || !startDate) return;
    setLoading(true);
    setError('');
    try {
      const p = await createRecurringPayment(
        toUserId,
        parseFloat(amount),
        label,
        frequency,
        new Date(startDate).toISOString()
      );
      setPayments(prev => [...prev, p]);
      setToUserId('');
      setAmount('');
      setLabel('');
      setStartDate('');
      setView('list');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelRecurringPayment(id);
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTick = async () => {
    setTicking(true);
    setTickResult(null);
    try {
      const result = await tickRecurring();
      setTickResult(result);
      const updated = await getRecurringPayments();
      setPayments(updated);
      await refreshUser();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTicking(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-heading text-foreground">Recurring payments</h2>
              <button
                onClick={() => setView('create')}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4 inline mr-1" />New
              </button>
            </div>

            {/* Simulate tick button */}
            <button
              onClick={handleTick}
              disabled={ticking}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-input bg-card py-2.5 text-sm font-medium text-foreground hover:shadow-elevated transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${ticking ? 'animate-spin' : ''}`} />
              {ticking ? 'Processing...' : 'Simulate scheduled run'}
            </button>

            {tickResult && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success font-medium"
              >
                ✓ {tickResult.executed} executed, {tickResult.skipped} skipped
              </motion.div>
            )}

            {payments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No recurring payments yet</p>
            )}

            <div className="space-y-2">
              {payments.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.label}</p>
                    <p className="text-xs text-muted-foreground">
                      To {p.toName} • ${p.amount.toFixed(2)} • {p.frequency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Next: {new Date(p.nextRunAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(p.id)}
                    className="ml-3 rounded-lg bg-destructive/10 p-2 hover:bg-destructive/20 transition"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {view === 'create' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading text-foreground">New recurring payment</h2>

            <div>
              <label className="text-sm font-medium text-foreground">Recipient</label>
              <select
                value={toUserId}
                onChange={e => setToUserId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a person</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Label</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. March rent"
                className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Frequency</label>
              <div className="flex gap-2 mt-1">
                {(['weekly', 'monthly'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      frequency === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !toUserId || !amount || !label || !startDate}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create recurring payment'}
            </button>
            <button onClick={() => setView('list')} className="w-full text-sm text-muted-foreground">
              Cancel
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}