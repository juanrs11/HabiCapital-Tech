import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addFunds } from '@/services/transactions';
import { Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function AddFundsPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  if (!user) return <Navigate to="/login" replace />;

  const presets = [50, 100, 250, 500];

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    try {
      await addFunds(user.id, user.balance, val);
      await refreshUser();
      // Leer el balance actualizado del contexto no es inmediato,
      // así que calculamos el estimado para el mensaje de éxito
      setNewBalance(user.balance + val);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="rounded-full bg-success/10 p-4 mb-4">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">Funds added!</h2>
          <p className="text-muted-foreground mt-1">
            New balance:{' '}
            <span className="font-semibold text-foreground">
              ${(newBalance ?? user.balance).toFixed(2)}
            </span>
          </p>
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold font-heading text-foreground">Add funds</h2>
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-2xl font-heading text-foreground outline-none focus:ring-2 focus:ring-ring text-center"
            min="0"
            step="0.01"
          />
          <div className="flex gap-2">
            {presets.map(p => (
              <button
                key={p}
                onClick={() => setAmount(p.toString())}
                className="flex-1 rounded-lg bg-secondary py-2 text-sm font-medium text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition"
              >
                ${p}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Add funds'}
        </button>
      </div>
    </AppLayout>
  );
}