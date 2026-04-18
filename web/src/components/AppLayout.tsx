import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, Users, LogOut } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/groups', icon: Users, label: 'Groups' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold font-heading text-primary">HabiPay</h1>
        <button onClick={logout} className="text-muted-foreground hover:text-foreground transition">
          <LogOut className="h-5 w-5" />
        </button>
      </header>
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {children}
      </main>
      <nav className="sticky bottom-0 bg-card/90 backdrop-blur border-t border-border">
        <div className="flex justify-around max-w-lg mx-auto">
          {navItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2 px-4 text-xs font-medium transition ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
