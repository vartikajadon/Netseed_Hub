import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { LocationAccessPrompt } from '../components/LocationAccessPrompt';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import {
  Shield,
  KeyRound,
  CheckCircle2,
  MapPin,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Users,
  Building2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

interface DemoAccount {
  role: string;
  title: string;
  name: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'STUDENT',
    title: 'Student Trainee',
    name: 'John Doe',
    email: 'student1@netlink.org',
    password: 'password123',
    icon: GraduationCap,
    color: 'border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30',
  },
  {
    role: 'MENTOR',
    title: 'Lead Mentor',
    name: 'Varsha Yaduvanshi',
    email: 'varsha@netlink.org',
    password: 'password123',
    icon: Users,
    color: 'border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30',
  },
  {
    role: 'HR',
    title: 'HR Manager',
    name: 'Prerna Verma',
    email: 'hr@netlink.org',
    password: 'password123',
    icon: Building2,
    color: 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30',
  },
  {
    role: 'SUPER_ADMIN',
    title: 'Super Admin',
    name: 'Abhishek Verma',
    email: 'admin@netlink.org',
    password: 'password123',
    icon: ShieldAlert,
    color: 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30',
  },
];

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'demo'>('signin');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { login, getDashboardRoute } = useAuth();
  const { coords, permissionState, requestExplicitLocation } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('logout') === 'success') {
      setSuccessMsg('You have been logged out successfully.');
    }
    // Attempt saved email
    try {
      const savedEmail = localStorage.getItem('netseed_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {}
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your account password');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (rememberMe) {
        try {
          localStorage.setItem('netseed_remembered_email', email.trim());
        } catch {}
      } else {
        try {
          localStorage.removeItem('netseed_remembered_email');
        } catch {}
      }

      const loggedUser = await login(email.trim(), password);
      setSuccessMsg(`Welcome back, ${loggedUser.full_name}! Redirecting to workspace...`);
      const route = getDashboardRoute(loggedUser.role);
      setTimeout(() => {
        navigate(route);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
    setActiveTab('signin');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-radial from-indigo-50/40 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black transition-colors duration-200">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-indigo-500/10 mb-1 transition-transform hover:scale-105">
            <img
              src="/netseed-logo.jpg"
              alt="netSEED Hub Logo"
              className="w-14 h-14 rounded-xl object-cover"
              onError={(e) => {
                // Fallback to shield icon if logo image not found
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-black text-2xl shadow-inner hidden">
              N
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              netSEED Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Lifecycle Management & Verification Platform
            </p>
          </div>
        </div>

        {/* Explicit Location Access Card */}
        <LocationAccessPrompt variant="card" />

        {/* Login Main Card */}
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          {/* Tabs: Sign In / Quick Demo Accounts */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>User Credentials</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Demo Accounts</span>
            </button>
          </div>

          {activeTab === 'signin' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                error.includes('ACCESS_REVOKED') ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs space-y-2 text-rose-900 dark:text-rose-200">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      Account Access Suspended
                    </div>
                    <p className="leading-relaxed">
                      {error.replace('ACCESS_REVOKED: ', '')}
                    </p>
                    <div className="pt-1">
                      <a
                        href="mailto:hr@netlink.org?subject=Account%20Access%20Reactivation%20Inquiry"
                        className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5" /> Contact HR at hr@netlink.org &rarr;
                      </a>
                    </div>
                  </div>
                ) : (
                  <ErrorMessage message={error} />
                )
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@netlink.org"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Security notice */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-medium text-[11px]">Remember email</span>
                </label>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>GPS Audit Active</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 rounded-xl font-bold text-xs tracking-wide shadow-md shadow-indigo-500/20"
                isLoading={isLoading}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {isLoading ? 'Verifying Credentials & Location...' : 'Sign In to Account'}
              </Button>
            </form>
          ) : (
            /* Quick Demo Accounts Selection */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Click any pre-configured seed account to auto-fill its credentials and immediately test permissions for that role:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectDemo(acc)}
                      className={`p-3 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${acc.color} shadow-2xs hover:shadow-md`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{acc.title}</span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{acc.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {acc.email}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Security & Compliance Footer */}
        <div className="text-center space-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Protected by Netlink Zero-Trust RBAC & Biometric Geofencing</span>
          </div>
          <div>© {new Date().getFullYear()} Netlink Software Group. All rights reserved.</div>
        </div>
      </div>

      {/* Forgot Password / Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs font-sans">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Credential Assistance</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              For student trainees and staff: Default development passwords are set to{' '}
              <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                password123
              </code>
              . For institutional password resets or account recovery, please contact your HR Administrator or mentor.
            </p>
            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setShowHelpModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
