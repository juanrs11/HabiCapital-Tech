import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendMoney } from '@/services/transactions';
import { getAllUsers } from '@/services/auth';
import { User } from '@/types';
import { Check, Search } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function SendMoneyPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'amount' | 'confirm' | 'done'>('select');
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    getAllUsers().then(setAllUsers).catch(() => setAllUsers([]));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  const handleSend = async () => {
    if (!recipient) return;
    setLoading(true);
    setError('');
    try {
      await sendMoney(user.id, user.balance, recipient.id, parseFloat(amount), label || 'Transfer');
      await refreshUser();
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <AppLayout>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-success/10 p-4 mb-4"><Check className="h-8 w-8 text-success" /></div>
          <h2 className="text-xl font-bold font-heading text-foreground">Money sent!</h2>
          <p className="text-muted-foreground mt-1">${parseFloat(amount).toFixed(2)} to {recipient?.name}</p>
          <button onClick={() => navigate('/')} className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Back to home</button>
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold font-heading text-foreground">Send money</h2>

        {step === 'select' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              {filtered.length === 0 && query.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Loading users...</p>
              )}
              {filtered.length === 0 && query.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
              {filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setRecipient(u); setStep('amount'); }}
                  className="w-full flex items-center gap-3 rounded-xl bg-card p-3 shadow-card hover:shadow-elevated transition text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'amount' && recipient && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
                {recipient.name.charAt(0)}
              </div>
              <p className="text-sm font-medium text-foreground">{recipient.name}</p>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-2xl font-heading text-foreground outline-none focus:ring-2 focus:ring-ring text-center"
              min="0"
              step="0.01"
            />
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="What's it for? (e.g. March rent)"
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => setStep('confirm')}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              Review
            </button>
          </div>
        )}

        {step === 'confirm' && recipient && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-xl bg-card p-5 shadow-card space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">To</span><span className="font-medium text-foreground">{recipient.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold text-foreground text-lg">${parseFloat(amount).toFixed(2)}</span></div>
              {label && <div className="flex justify-between text-sm"><span className="text-muted-foreground">For</span><span className="text-foreground">{label}</span></div>}
            </div>
            {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Confirm & Send'}
            </button>
            <button onClick={() => setStep('amount')} className="w-full text-sm text-muted-foreground hover:text-foreground">Go back</button>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}