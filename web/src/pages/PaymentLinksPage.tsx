import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getMyPaymentLinks,
  createPaymentLink,
  resolvePaymentLink,
  payPaymentLink,
  PaymentLink,
  PublicPaymentLink,
} from '@/services/paymentLinks';
import { Link2, Plus, Copy, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

// ─── List + Create page (/links) ────────────────────────────────────────────

export default function PaymentLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user) getMyPaymentLinks().then(setLinks).catch(() => setLinks([]));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const handleCreate = async () => {
    if (!amount || !description) return;
    setLoading(true);
    setError('');
    try {
      const link = await createPaymentLink(parseFloat(amount), description);
      setLinks(prev => [link, ...prev]);
      setAmount('');
      setDescription('');
      setView('list');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/pay/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-heading text-foreground">Payment links</h2>
              <button
                onClick={() => setView('create')}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4 inline mr-1" />New link
              </button>
            </div>

            {links.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No payment links yet</p>
            )}

            <div className="space-y-2">
              {links.map((link, i) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{link.description}</p>
                      <p className="text-xs text-muted-foreground">
                        ${link.amount.toFixed(2)} • {link.payCount} {link.payCount === 1 ? 'payment' : 'payments'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                        /pay/{link.token}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(link.token)}
                      className="flex-shrink-0 rounded-lg bg-secondary p-2 hover:bg-primary/10 transition"
                    >
                      {copied === link.token
                        ? <Check className="h-4 w-4 text-success" />
                        : <Copy className="h-4 w-4 text-primary" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {view === 'create' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading text-foreground">New payment link</h2>

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
              <label className="text-sm font-medium text-foreground">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Guitar lesson — April"
                className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !amount || !description}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Generate link'}
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

// ─── Public pay page (/pay/:token) ──────────────────────────────────────────

export function PayLinkPage() {
  const { token } = useParams<{ token: string }>();
  const { user, refreshUser } = useAuth();
  const [link, setLink] = useState<PublicPaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    resolvePaymentLink(token)
      .then(setLink)
      .catch(() => setError('Payment link not found or expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    if (!token || !user) return;
    setPaying(true);
    setError('');
    try {
      await payPaymentLink(token);
      await refreshUser();
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="rounded-full bg-success/10 p-4 mb-4 inline-flex">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">Payment sent!</h2>
          <p className="text-muted-foreground mt-1">
            ${link?.amount.toFixed(2)} to {link?.creatorName}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <div className="rounded-full bg-secondary p-4 inline-flex mb-3">
            <Link2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">{link?.creatorName}</h1>
          <p className="text-muted-foreground text-sm mt-1">is requesting a payment</p>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-bold text-foreground text-lg">${link?.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">For</span>
            <span className="text-foreground">{link?.description}</span>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
        )}

        {!user ? (
          <p className="text-center text-sm text-muted-foreground">
            <a href={`/login?redirect=/pay/${token}`} className="text-primary font-medium hover:underline">
              Sign in
            </a>{' '}
            to complete this payment.
          </p>
        ) : (
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {paying ? 'Processing...' : `Pay $${link?.amount.toFixed(2)}`}
          </button>
        )}
      </motion.div>
    </div>
  );
}