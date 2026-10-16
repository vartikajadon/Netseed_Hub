import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Shield, KeyRound, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, getDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('logout') === 'success') {
      setSuccessMsg('You have been logged out successfully.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(email.trim());
      setSuccessMsg(`Login successful! Welcome back, ${loggedUser.full_name}. Redirecting...`);
      const route = getDashboardRoute(loggedUser.role);
      setTimeout(() => {
        navigate(route);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-3 shadow-md shadow-sky-500/10">
            <img
              src="/netseed-logo.jpg"
              alt="netSEED Hub Logo"
              className="w-16 h-16 rounded-xl object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">netSEED Hub</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Lifecycle Management & Verification System</p>
        </div>

        <Card title="Sign In to Your Account">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorMessage message={error} />}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. student1@netlink.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full py-2.5 font-bold" isLoading={isLoading}>
              <KeyRound className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Quick Demo Accounts (Seed Data):</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('student1@netlink.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80 text-left transition-all shadow-xs"
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">Student 1</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">student1@netlink.org</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('mentor@netlink.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80 text-left transition-all shadow-xs"
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">Mentor</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">mentor@netlink.org</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('hr@netlink.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80 text-left transition-all shadow-xs"
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">HR Manager</div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Prerna Verma</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">hr@netlink.org</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@netlink.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80 text-left transition-all shadow-xs"
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">Super Admin</div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Abhishek Verma</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">admin@netlink.org</div>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
