import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  User as UserIcon,
  ChevronDown,
  KeyRound,
  LogOut,
  Mail,
  Shield,
  Phone,
  Sparkles,
} from 'lucide-react';

interface UserProfileDropdownProps {
  onLogoutClick: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ onLogoutClick }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const roleLabels: Record<string, { label: string; color: string }> = {
    SUPER_ADMIN: { label: 'Admin', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    HR: { label: 'HR Admin', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    MENTOR: { label: 'Mentor', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
    STUDENT: { label: 'Student', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  };

  const currentRole = roleLabels[user.role] || {
    label: user.role,
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 pr-2.5 sm:pr-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all text-left group"
        title="Account & Profile Settings"
      >
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-indigo-500/20 ring-2 ring-white dark:ring-slate-900 shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            initials
          )}
        </div>

        <div className="hidden sm:block text-xs">
          <div className="text-slate-900 dark:text-slate-100 font-bold leading-tight truncate max-w-[140px] group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors">
            {user.full_name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md border ${currentRole.color}`}
            >
              {currentRole.label}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fadeIn divide-y divide-slate-100 dark:divide-slate-800">
          {/* Header user overview */}
          <div className="px-4 py-3 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold flex items-center justify-center text-sm shadow-md ring-2 ring-indigo-500/30 shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.full_name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-500" /> Role Authority
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full border text-[10px] ${currentRole.color}`}
              >
                {currentRole.label}
              </span>
            </div>

            {user.phone && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>

          {/* Action options */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPasswordModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div>Manage & Change Password</div>
                <div className="text-[10px] font-normal text-slate-400">Update your account credentials</div>
              </div>
            </button>
          </div>

          {/* Sign Out option */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogoutClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <div>Sign Out</div>
                <div className="text-[10px] font-normal text-rose-400/80">Log out of your session</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        requireCurrentPassword={true}
      />
    </div>
  );
};
