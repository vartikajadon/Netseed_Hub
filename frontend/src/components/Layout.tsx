import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from './Badge';
import { Button } from './Button';
import { Modal } from './Modal';
import { NotificationCenter } from './NotificationCenter';
import { NotificationToastContainer } from './NotificationToast';
import {
  Shield, LogOut, Sun, Moon, Menu, X, ChevronLeft, ChevronRight,
  LayoutDashboard, Users, BookOpen, Layers, Clock, BarChart3,
  RefreshCw, GraduationCap, CheckSquare, Sparkles, MessageSquare,
  UserCheck, MapPin, Sliders, FileText, Fingerprint, Settings,
  Calendar, Building2, FileCheck, IndianRupee, Mail, Award
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('netseed_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('netseed_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login?logout=success');
  };

  const getSubNavItems = (): NavItem[] => {
    if (!role) return [];

    switch (role) {
      case 'STUDENT':
        return [
          { label: 'Overview', path: '/student', icon: LayoutDashboard },
          { label: 'Curriculum', path: '/student/curriculum', icon: BookOpen },
          { label: 'Attendance', path: '/student/attendance', icon: Clock },
          { label: 'Calendar', path: '/calendar', icon: Calendar },
          { label: 'Tasks', path: '/student/tasks', icon: CheckSquare },
          { label: 'Skills', path: '/student/skills', icon: Sparkles },
          { label: 'Career', path: '/student/career', icon: GraduationCap },
          { label: 'Feedback', path: '/student/feedback', icon: MessageSquare },
          { label: 'Profile', path: '/student/profile', icon: UserCheck },
        ];
      case 'MENTOR':
        return [
          { label: 'Overview', path: '/mentor', icon: LayoutDashboard },
          { label: 'Curriculum', path: '/mentor/curriculum', icon: BookOpen },
          { label: 'Students', path: '/mentor/students', icon: Users },
          { label: 'Calendar', path: '/calendar', icon: Calendar },
          { label: 'Task Assignment', path: '/mentor/task-assignment', icon: CheckSquare },
          { label: 'Task Evaluation', path: '/mentor/task-evaluation', icon: Award },
          { label: 'Feedback', path: '/mentor/feedback', icon: MessageSquare },
        ];
      case 'HR':
        return [
          { label: 'Overview', path: '/hr', icon: LayoutDashboard },
          { label: 'Students', path: '/hr/students', icon: Users },
          { label: 'Programs', path: '/hr/programs', icon: BookOpen },
          { label: 'Batches', path: '/hr/batches', icon: Layers },
          { label: 'Institution Training', path: '/hr/institution-training', icon: Building2 },
          { label: 'Attendance', path: '/hr/attendance', icon: Clock },
          { label: 'Calendar', path: '/calendar', icon: Calendar },
          { label: 'No Dues', path: '/hr/no-dues', icon: FileCheck },
          { label: 'Fees', path: '/hr/fees', icon: IndianRupee },
          { label: 'Letters', path: '/hr/letters', icon: Mail },
          { label: 'Certificates', path: '/hr/certificates', icon: Award },
          { label: 'Reports', path: '/hr/reports', icon: BarChart3 },
          { label: 'Curriculum', path: '/hr/curriculum', icon: BookOpen },
        ];
      case 'SUPER_ADMIN':
        return [
          { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { label: 'All Users', path: '/admin/users', icon: Users },
          { label: 'Roles & Access', path: '/admin/roles', icon: Shield },
          { label: 'Programs', path: '/hr/programs', icon: BookOpen },
          { label: 'Batches', path: '/hr/batches', icon: Layers },
          { label: 'Institution Training', path: '/hr/institution-training', icon: Building2 },
          { label: 'Students', path: '/hr/students', icon: GraduationCap },
          { label: 'Attendance Roster', path: '/hr/attendance', icon: Clock },
          { label: 'Calendar', path: '/calendar', icon: Calendar },
          { label: 'No Dues', path: '/hr/no-dues', icon: FileCheck },
          { label: 'Fees', path: '/hr/fees', icon: IndianRupee },
          { label: 'Letters', path: '/hr/letters', icon: Mail },
          { label: 'Certificates', path: '/hr/certificates', icon: Award },
          { label: 'Attendance Settings', path: '/admin/attendance-rules', icon: Sliders },
          { label: 'Campus Geofences', path: '/admin/geofences', icon: MapPin },
          { label: 'Biometrics & Privacy', path: '/admin/biometric-controls', icon: Fingerprint },
          { label: 'Curriculum', path: '/hr/curriculum', icon: BookOpen },
          { label: 'Reports & Analytics', path: '/hr/reports', icon: BarChart3 },
          { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
          { label: 'System Settings', path: '/admin/system', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const subNavItems = getSubNavItems();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Menu Hamburger */}
          {subNavItems.length > 0 && (
            <button
              onClick={() => setIsMobileOpen((prev) => !prev)}
              className="md:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 font-bold text-base sm:text-lg text-[#0284c7] dark:text-sky-400 group shrink-0">
            <img
              src="/netseed-logo.jpg"
              alt="netSEED Hub Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-xs border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
            />
            <span className="font-extrabold tracking-tight">
              netSEED<span className="text-slate-900 dark:text-slate-100 font-normal ml-0.5 sm:ml-1">Hub</span>
            </span>
          </Link>

          <div className="hidden min-[420px]:block">
            <Badge variant={role === 'SUPER_ADMIN' ? 'error' : role === 'HR' ? 'warning' : role === 'MENTOR' ? 'info' : 'success'}>
              {role || 'PUBLIC'}
            </Badge>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 min-h-[38px] min-w-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600 border border-slate-300 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-amber-400 dark:border-slate-700/60 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            )}
          </button>

          {/* In-app Notification Center Bell & Dropdown */}
          <NotificationCenter />

          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block text-xs text-right">
                <div className="text-slate-900 dark:text-slate-100 font-bold leading-tight truncate max-w-[150px]">{user.full_name}</div>
                <div className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px]">{user.email}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2 sm:px-3 min-h-[38px] flex items-center"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Body Container with Sidebar + Content */}
      <div className="flex-1 flex w-full relative">
        {/* Desktop Collapsible Sidebar */}
        {subNavItems.length > 0 && (
          <aside
            className={`hidden md:flex flex-col border-r border-[#0275ad]/40 dark:border-sky-950 bg-gradient-to-b from-[#026c9f] via-[#0284c7] to-[#0369a1] dark:from-[#072438] dark:via-[#093552] dark:to-[#0a4163] text-white transition-all duration-300 sticky top-[57px] h-[calc(100vh-57px)] shrink-0 z-30 select-none shadow-md ${
              isCollapsed ? 'w-20 overflow-visible' : 'w-60 overflow-hidden'
            }`}
          >
            {/* Navigation Items List */}
            <div className={`flex-1 py-4 px-3 space-y-1.5 ${isCollapsed ? 'overflow-y-auto overflow-x-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
              {subNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <div key={item.path} className="relative group">
                    <Link
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                        isCollapsed ? 'justify-center' : 'justify-start'
                      } ${
                        isActive
                          ? 'bg-white text-[#0275ad] dark:bg-sky-100 dark:text-[#025a85] shadow-md shadow-black/10 font-bold border border-white/80'
                          : 'text-sky-100/90 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive ? 'text-[#0275ad] dark:text-[#025a85]' : 'text-sky-200 group-hover:text-white'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>

                    {/* Floating Tooltip on Hover (When Collapsed) */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#072438] text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 flex items-center gap-1.5 border border-sky-400/40 backdrop-blur-md">
                        <span>{item.label}</span>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#072438]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Collapse / Expand Toggle Button Footer */}
            <div className="p-3 border-t border-white/15 dark:border-sky-900/60">
              <button
                onClick={toggleCollapse}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-sky-100 hover:text-white hover:bg-white/15 transition-colors text-xs font-semibold"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <>
                    <ChevronLeft className="w-5 h-5" />
                    <span>Collapse</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Slide-Over Drawer */}
        {subNavItems.length > 0 && isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Drawer Panel */}
            <aside className="relative w-72 max-w-[85vw] bg-gradient-to-b from-[#026c9f] via-[#0284c7] to-[#0369a1] dark:from-[#072438] dark:via-[#093552] dark:to-[#0a4163] text-white border-r border-[#0275ad]/40 dark:border-sky-950 flex flex-col h-full shadow-2xl z-10">
              {/* Drawer Header with User Info */}
              <div className="p-4 border-b border-white/15 dark:border-sky-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/20 text-white font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                    {(user?.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate leading-tight">
                      {user?.full_name || 'Authenticated User'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-sky-200/90 font-mono truncate max-w-[110px]">
                        {user?.email}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                        {role || 'STUDENT'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/15 transition-colors shrink-0"
                  title="Close Menu"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200/70">
                  Navigation Menu
                </div>
                {subNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                        isActive
                          ? 'bg-white text-[#0275ad] dark:bg-sky-100 dark:text-[#025a85] font-bold shadow-md shadow-black/10 border border-white/80'
                          : 'text-sky-100/90 hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#0275ad]' : 'text-sky-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Drawer Footer Actions */}
              {user && (
                <div className="p-3 border-t border-white/15 dark:border-sky-900/60">
                  <button
                    onClick={() => {
                      setIsMobileOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-57px)]">
          <main className={`flex-1 p-3 sm:p-5 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden ${role === 'STUDENT' ? 'pb-24 md:pb-8' : 'pb-8'}`}>
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-3 px-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium" />
        </div>
      </div>

      {/* Student Mobile Bottom Navigation Bar (Thumb-Friendly App Navigation) */}
      {role === 'STUDENT' && (
        <nav
          aria-label="Student Mobile Navigation Bar"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl transition-colors"
        >
          {[
            { label: 'Overview', path: '/student', icon: LayoutDashboard },
            { label: 'Attendance', path: '/student/attendance', icon: Clock },
            { label: 'Curriculum', path: '/student/curriculum', icon: BookOpen },
            { label: 'Tasks', path: '/student/tasks', icon: CheckSquare },
            { label: 'Profile', path: '/student/profile', icon: UserCheck },
          ].map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[46px] min-w-[54px] select-none ${
                  isActive
                    ? 'text-[#0284c7] dark:text-sky-400 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-transform ${
                    isActive ? 'scale-110 bg-sky-50 dark:bg-sky-950/70 text-[#0284c7] dark:text-sky-400 shadow-xs' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-none">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Sign Out"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-slate-600 dark:text-slate-300">
            Are you sure you want to end your session? Any unsaved work should be finalized before signing out.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmLogout}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>

      {/* Global Toast Alert Notifications */}
      <NotificationToastContainer />
    </div>
  );
};
