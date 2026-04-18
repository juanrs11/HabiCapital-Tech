import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getTransactions } from '@/services/transactions';
import { Transaction } from '@/types';
import { ArrowUpRight, ArrowDownLeft, Plus, Send, Users, Link2, RefreshCw  } from 'lucide-react';
import AppLayout from '@/components/AppLayout';


export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await refreshUser();
      const t = await getTransactions(user.id);
      setTransactions(t.slice(0, 5));
    };
    load();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-6 text-primary-foreground"
          style={{ background: 'var(--gradient-hero)' }}
        >
          <p className="text-sm opacity-80">Available balance</p>
          <p className="text-4xl font-bold font-heading mt-1">${user.balance.toFixed(2)}</p>
          <p className="text-xs opacity-60 mt-2">HabiPay • {user.name}</p>
        </motion.div>

        <div className="grid grid-cols-4 gap-3">
          <Link to="/add-funds" className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card hover:shadow-elevated transition">
            <div className="rounded-full bg-secondary p-2.5">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Add funds</span>
          </Link>
          <Link to="/send" className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card hover:shadow-elevated transition">
            <div className="rounded-full bg-secondary p-2.5">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Send</span>
          </Link>
          <Link to="/groups" className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card hover:shadow-elevated transition">
            <div className="rounded-full bg-secondary p-2.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Groups</span>
          </Link>
          <Link to="/links" className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card hover:shadow-elevated transition">
            <div className="rounded-full bg-secondary p-2.5">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Links</span>
          </Link>
        </div>


        <div className="grid grid-cols-1 gap-3">
          <Link to="/recurring" className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card hover:shadow-elevated transition">
            <div className="rounded-full bg-secondary p-2.5">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Recurring</span>
          </Link>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold font-heading text-foreground">Recent activity</h2>
            <Link to="/history" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
            )}
            {transactions.map((txn, i) => (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card"
              >
                <div className={`rounded-full p-2 ${txn.type === 'sent' ? 'bg-destructive/10' : txn.type === 'received' ? 'bg-success/10' : 'bg-secondary'}`}>
                  {txn.type === 'sent' ? <ArrowUpRight className="h-4 w-4 text-destructive" /> :
                   txn.type === 'received' ? <ArrowDownLeft className="h-4 w-4 text-success" /> :
                   <Plus className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{txn.label}</p>
                  <p className="text-xs text-muted-foreground">{txn.counterpart || 'Top up'} • {new Date(txn.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${txn.type === 'sent' ? 'text-destructive' : 'text-success'}`}>
                  {txn.type === 'sent' ? '-' : '+'}${txn.amount.toFixed(2)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}