import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import {
  User,
  BirthdayRemindersResponse,
  CalendarEvent,
  AttendanceDailyRecord,
  StudentFeeSummary,
  TrainerLeave,
  TrainerLeaveCreatePayload
} from '../types';
import {
  Cake,
  PartyPopper,
  Gift,
  Mail,
  Calendar,
  ArrowRight,
  Clock,
  UserCheck,
  UserX,
  Users,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  PhoneCall,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Briefcase
} from 'lucide-react';

export const HRDashboard: React.FC = () => {
  // 1. Birthday Reminders (Today's Birthdays)
  const [birthdayReminders, setBirthdayReminders] = useState<BirthdayRemindersResponse | null>(null);

  // 2. Tomorrow's Events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // 3. Current & Past Day Absentees
  const [todayAbsentees, setTodayAbsentees] = useState<AttendanceDailyRecord[]>([]);
  const [yesterdayAbsentees, setYesterdayAbsentees] = useState<AttendanceDailyRecord[]>([]);
  const [absenteeTab, setAbsenteeTab] = useState<'TODAY' | 'YESTERDAY'>('TODAY');
  const [absenteeSearch, setAbsenteeSearch] = useState('');

  // 4. Fee Defaulters / Remaining
  const [feeDefaulters, setFeeDefaulters] = useState<StudentFeeSummary[]>([]);
  const [defaulterSearch, setDefaulterSearch] = useState('');

  // 5. Trainer on Leave
  const [trainerLeaves, setTrainerLeaves] = useState<TrainerLeave[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState<TrainerLeaveCreatePayload>({
    trainer_id: '',
    trainer_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: 'Casual Leave',
    substitute_trainer_name: '',
    notes: '',
  });

  // Global loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date helpers
  const getFormattedDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getFormattedDateString(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getFormattedDateString(d);
  }, []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getFormattedDateString(d);
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);

      const [
        birthdaysRes,
        eventsRes,
        todayAttendanceRes,
        yesterdayAttendanceRes,
        feesRes,
        leavesRes,
        usersRes,
      ] = await Promise.allSettled([
        api.get<BirthdayRemindersResponse>('/calendar/birthday-reminders'),
        api.get<CalendarEvent[]>('/calendar/events'),
        api.get<AttendanceDailyRecord[]>(`/attendance/daily-records?target_date=${todayStr}`),
        api.get<AttendanceDailyRecord[]>(`/attendance/daily-records?target_date=${yesterdayStr}`),
        api.get<StudentFeeSummary[]>('/fees/students'),
        api.get<TrainerLeave[]>('/trainer-leaves'),
        api.get<User[]>('/users'),
      ]);

      // 1. Birthdays
      if (birthdaysRes.status === 'fulfilled' && birthdaysRes.value) {
        setBirthdayReminders(birthdaysRes.value);
      }

      // 2. Events
      if (eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value)) {
        setCalendarEvents(eventsRes.value);
      }

      // 3. Attendance
      if (todayAttendanceRes.status === 'fulfilled' && Array.isArray(todayAttendanceRes.value)) {
        setTodayAbsentees(todayAttendanceRes.value.filter((r) => r.status === 'ABSENT'));
      }
      if (yesterdayAttendanceRes.status === 'fulfilled' && Array.isArray(yesterdayAttendanceRes.value)) {
        setYesterdayAbsentees(yesterdayAttendanceRes.value.filter((r) => r.status === 'ABSENT'));
      }

      // 4. Fees Defaulters
      if (feesRes.status === 'fulfilled' && Array.isArray(feesRes.value)) {
        setFeeDefaulters(feesRes.value.filter((s) => s.remaining_fees > 0));
      }

      // 5. Trainer Leaves & Mentors
      if (leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value)) {
        setTrainerLeaves(leavesRes.value);
      }
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        const mentorList = usersRes.value.filter((u) => u.role === 'MENTOR' || u.role === 'SUPER_ADMIN');
        setMentors(mentorList);
        if (mentorList.length > 0 && !leaveForm.trainer_id) {
          setLeaveForm((prev) => ({
            ...prev,
            trainer_id: mentorList[0].id,
            trainer_name: mentorList[0].full_name,
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load HR dashboard briefing.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  // --------------------------------------------------------------------------
  // ITEM 1: Today's Birthday Members
  // --------------------------------------------------------------------------
  const todayBirthdays = birthdayReminders?.today || [];
  const upcomingBirthdays = useMemo(() => {
    const todayIds = new Set((birthdayReminders?.today || []).map((b) => b.student_id));
    return (birthdayReminders?.upcoming_7_days || []).filter((b) => !todayIds.has(b.student_id));
  }, [birthdayReminders]);
  const nextUpcomingBirthday = upcomingBirthdays.length > 0 ? upcomingBirthdays[0] : null;

  // --------------------------------------------------------------------------
  // ITEM 2: This Month's Festival & Thematic Styling
  // --------------------------------------------------------------------------
  const monthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const currentMonthFestivals = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    return calendarEvents
      .filter((ev) => {
        if (!ev.date) return false;
        const parts = ev.date.split('-');
        const evYear = Number(parts[0]);
        const evMonth = Number(parts[1]);
        if (evYear !== curYear || evMonth !== curMonth) return false;
        return (
          ev.event_type === 'FESTIVAL' ||
          ev.event_type === 'OFF_DAY' ||
          ev.title.toLowerCase().includes('festival') ||
          ev.title.toLowerCase().includes('fest') ||
          ev.title.toLowerCase().includes('diwali') ||
          ev.title.toLowerCase().includes('dussehra') ||
          ev.title.toLowerCase().includes('jayanti') ||
          ev.title.toLowerCase().includes('eid') ||
          ev.title.toLowerCase().includes('holi') ||
          ev.title.toLowerCase().includes('christmas')
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents]);

  const activeFestival = useMemo(() => {
    if (currentMonthFestivals.length > 0) {
      const todayFest = currentMonthFestivals.find((e) => e.date === todayStr);
      if (todayFest) return todayFest;
      const upcomingFest = currentMonthFestivals.find((e) => e.date >= todayStr);
      if (upcomingFest) return upcomingFest;
      return currentMonthFestivals[0];
    }
    const upcomingAny = calendarEvents
      .filter((e) => (e.event_type === 'FESTIVAL' || e.event_type === 'OFF_DAY') && e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcomingAny.length > 0) return upcomingAny[0];
    return calendarEvents.find((e) => e.event_type === 'FESTIVAL') || null;
  }, [currentMonthFestivals, calendarEvents, todayStr]);

  const displayFestivals = useMemo(() => {
    if (currentMonthFestivals.length > 0) {
      const upcoming = currentMonthFestivals.filter((f) => f.date >= todayStr);
      const past = currentMonthFestivals.filter((f) => f.date < todayStr);
      return [...upcoming, ...past].slice(0, 2);
    }
    if (activeFestival) {
      return [activeFestival];
    }
    return [];
  }, [currentMonthFestivals, activeFestival, todayStr]);

  const festivalTheme = useMemo(() => {
    const title = activeFestival?.title || '';
    const name = title.toLowerCase();

    // 1. Diwali / Deepavali / Milan / Dhanteras
    if (name.includes('diwali') || name.includes('deepavali') || name.includes('milan') || name.includes('dhanteras')) {
      return {
        gradient: 'from-amber-600 via-orange-600 to-yellow-600',
        shadow: 'shadow-amber-500/15',
        accentGlow: 'bg-yellow-300/10',
        badgeBg: 'bg-white text-amber-800',
        subText: 'text-amber-100',
        iconText: 'text-amber-600',
        buttonBg: 'text-amber-800 hover:bg-amber-50',
        tagBg: 'bg-amber-400 text-slate-950',
        icon: '🪔',
      };
    }

    // 2. Dussehra / Vijayadashami / Navratri
    if (name.includes('dussehra') || name.includes('vijayadashami') || name.includes('navratri')) {
      return {
        gradient: 'from-orange-600 via-amber-600 to-red-600',
        shadow: 'shadow-orange-500/15',
        accentGlow: 'bg-orange-300/10',
        badgeBg: 'bg-white text-orange-800',
        subText: 'text-orange-100',
        iconText: 'text-orange-600',
        buttonBg: 'text-orange-800 hover:bg-orange-50',
        tagBg: 'bg-amber-400 text-slate-950',
        icon: '🏹',
      };
    }

    // 3. Holi
    if (name.includes('holi')) {
      return {
        gradient: 'from-purple-600 via-fuchsia-600 to-pink-600',
        shadow: 'shadow-purple-500/15',
        accentGlow: 'bg-fuchsia-300/10',
        badgeBg: 'bg-white text-purple-800',
        subText: 'text-purple-100',
        iconText: 'text-purple-600',
        buttonBg: 'text-purple-800 hover:bg-purple-50',
        tagBg: 'bg-yellow-300 text-purple-950',
        icon: '🎨',
      };
    }

    // 4. Eid / Ramadan / Milad / Muharram
    if (name.includes('eid') || name.includes('ramadan') || name.includes('bakrid') || name.includes('milad') || name.includes('muharram')) {
      return {
        gradient: 'from-emerald-600 via-teal-600 to-green-700',
        shadow: 'shadow-emerald-500/15',
        accentGlow: 'bg-emerald-300/10',
        badgeBg: 'bg-white text-emerald-800',
        subText: 'text-emerald-100',
        iconText: 'text-emerald-600',
        buttonBg: 'text-emerald-800 hover:bg-emerald-50',
        tagBg: 'bg-emerald-300 text-emerald-950',
        icon: '🌙',
      };
    }

    // 5. Christmas
    if (name.includes('christmas') || name.includes('xmas')) {
      return {
        gradient: 'from-red-600 via-rose-600 to-red-700',
        shadow: 'shadow-red-500/15',
        accentGlow: 'bg-red-300/10',
        badgeBg: 'bg-white text-red-800',
        subText: 'text-red-100',
        iconText: 'text-red-600',
        buttonBg: 'text-red-800 hover:bg-red-50',
        tagBg: 'bg-emerald-400 text-slate-950',
        icon: '🎄',
      };
    }

    // 6. National Holidays
    if (name.includes('independence') || name.includes('republic') || name.includes('gandhi') || name.includes('ambedkar')) {
      return {
        gradient: 'from-orange-600 via-amber-600 to-sky-700',
        shadow: 'shadow-orange-500/15',
        accentGlow: 'bg-orange-300/10',
        badgeBg: 'bg-white text-orange-800',
        subText: 'text-orange-100',
        iconText: 'text-orange-600',
        buttonBg: 'text-orange-800 hover:bg-orange-50',
        tagBg: 'bg-amber-300 text-slate-950',
        icon: '🇮🇳',
      };
    }

    // 7. Tech Synergy / Hackathon / Innovation Fest
    if (name.includes('tech') || name.includes('hackathon') || name.includes('synergy') || name.includes('innovation')) {
      return {
        gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
        shadow: 'shadow-indigo-500/15',
        accentGlow: 'bg-cyan-300/10',
        badgeBg: 'bg-white text-indigo-800',
        subText: 'text-indigo-100',
        iconText: 'text-indigo-600',
        buttonBg: 'text-indigo-800 hover:bg-indigo-50',
        tagBg: 'bg-cyan-300 text-slate-950',
        icon: '⚡',
      };
    }

    // 8. Fallback by month number
    const d = activeFestival?.date ? new Date(activeFestival.date) : new Date();
    const m = d.getMonth();
    switch (m) {
      case 9: // October
        return {
          gradient: 'from-orange-600 via-amber-600 to-red-600',
          shadow: 'shadow-orange-500/15',
          accentGlow: 'bg-amber-300/10',
          badgeBg: 'bg-white text-orange-800',
          subText: 'text-orange-100',
          iconText: 'text-orange-600',
          buttonBg: 'text-orange-800 hover:bg-orange-50',
          tagBg: 'bg-amber-300 text-slate-950',
          icon: '🪔',
        };
      case 10: // November
        return {
          gradient: 'from-amber-600 via-orange-600 to-yellow-600',
          shadow: 'shadow-amber-500/15',
          accentGlow: 'bg-yellow-300/10',
          badgeBg: 'bg-white text-amber-800',
          subText: 'text-amber-100',
          iconText: 'text-amber-600',
          buttonBg: 'text-amber-800 hover:bg-amber-50',
          tagBg: 'bg-amber-400 text-slate-950',
          icon: '🪔',
        };
      case 11: // December
        return {
          gradient: 'from-red-600 via-rose-600 to-red-700',
          shadow: 'shadow-red-500/15',
          accentGlow: 'bg-red-300/10',
          badgeBg: 'bg-white text-red-800',
          subText: 'text-red-100',
          iconText: 'text-red-600',
          buttonBg: 'text-red-800 hover:bg-red-50',
          tagBg: 'bg-emerald-300 text-slate-950',
          icon: '🎄',
        };
      case 2: // March
        return {
          gradient: 'from-purple-600 via-fuchsia-600 to-pink-600',
          shadow: 'shadow-purple-500/15',
          accentGlow: 'bg-fuchsia-300/10',
          badgeBg: 'bg-white text-purple-800',
          subText: 'text-purple-100',
          iconText: 'text-purple-600',
          buttonBg: 'text-purple-800 hover:bg-purple-50',
          tagBg: 'bg-yellow-300 text-purple-950',
          icon: '🎨',
        };
      default:
        return {
          gradient: 'from-amber-600 via-orange-600 to-amber-700',
          shadow: 'shadow-amber-500/15',
          accentGlow: 'bg-amber-300/10',
          badgeBg: 'bg-white text-amber-800',
          subText: 'text-amber-100',
          iconText: 'text-amber-600',
          buttonBg: 'text-amber-800 hover:bg-amber-50',
          tagBg: 'bg-amber-300 text-slate-950',
          icon: '🎉',
        };
    }
  }, [activeFestival]);

  // --------------------------------------------------------------------------
  // ITEM 3: Current & Past Day Absentees Filters
  // --------------------------------------------------------------------------
  const filteredTodayAbsentees = useMemo(() => {
    if (!absenteeSearch.trim()) return todayAbsentees;
    const q = absenteeSearch.toLowerCase();
    return todayAbsentees.filter(
      (a) =>
        a.student?.user?.full_name?.toLowerCase().includes(q) ||
        a.student?.roll_number?.toLowerCase().includes(q) ||
        a.student?.batch?.name?.toLowerCase().includes(q)
    );
  }, [todayAbsentees, absenteeSearch]);

  const filteredYesterdayAbsentees = useMemo(() => {
    if (!absenteeSearch.trim()) return yesterdayAbsentees;
    const q = absenteeSearch.toLowerCase();
    return yesterdayAbsentees.filter(
      (a) =>
        a.student?.user?.full_name?.toLowerCase().includes(q) ||
        a.student?.roll_number?.toLowerCase().includes(q) ||
        a.student?.batch?.name?.toLowerCase().includes(q)
    );
  }, [yesterdayAbsentees, absenteeSearch]);

  // --------------------------------------------------------------------------
  // ITEM 4: Fee Defaulters & Outstanding Balances
  // --------------------------------------------------------------------------
  const filteredFeeDefaulters = useMemo(() => {
    if (!defaulterSearch.trim()) return feeDefaulters;
    const q = defaulterSearch.toLowerCase();
    return feeDefaulters.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        f.roll_number.toLowerCase().includes(q) ||
        (f.batch_name && f.batch_name.toLowerCase().includes(q))
    );
  }, [feeDefaulters, defaulterSearch]);

  const totalOutstandingDue = useMemo(() => {
    return feeDefaulters.reduce((acc, curr) => acc + (curr.remaining_fees || 0), 0);
  }, [feeDefaulters]);

  // --------------------------------------------------------------------------
  // ITEM 5: Trainer on Leave
  // --------------------------------------------------------------------------
  const trainersOnLeaveToday = useMemo(() => {
    return trainerLeaves.filter((l) => {
      const isStatusOnLeave = l.status === 'ON_LEAVE';
      const isDateActive = l.start_date <= todayStr && l.end_date >= todayStr;
      return isStatusOnLeave && isDateActive;
    });
  }, [trainerLeaves, todayStr]);

  const handleRecordLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.trainer_id) {
      alert('Please select a trainer.');
      return;
    }
    try {
      setIsSubmittingLeave(true);
      const selectedMentor = mentors.find((m) => m.id === leaveForm.trainer_id);
      await api.post('/trainer-leaves', {
        ...leaveForm,
        trainer_name: selectedMentor?.full_name || leaveForm.trainer_name || 'Trainer',
      });
      setIsLeaveModalOpen(false);
      // Reset form
      setLeaveForm({
        trainer_id: mentors[0]?.id || '',
        trainer_name: mentors[0]?.full_name || '',
        start_date: todayStr,
        end_date: todayStr,
        reason: 'Casual Leave',
        substitute_trainer_name: '',
        notes: '',
      });
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to record trainer leave');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleCompleteLeave = async (leaveId: string) => {
    if (!window.confirm('Mark this trainer leave as completed and trainer returned to active duty?')) return;
    try {
      await api.put(`/trainer-leaves/${leaveId}/status`, { status: 'COMPLETED' });
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to update leave status');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* TOP HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                HR Live Briefing Hub
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {formatDisplayDate(todayStr)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2.5">
              <Briefcase className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              HR Operations Dashboard
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium max-w-2xl">
              Daily critical oversight: Today's birthdays, tomorrow's event reminders, current & past day absentees, fee defaulters, and trainer leave status.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* QUICK NAVIGATION STRIP */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">
            Quick Portals:
          </span>
          <Link
            to="/hr/students"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold whitespace-nowrap transition-colors"
          >
            Students Roster →
          </Link>
          <Link
            to="/hr/attendance"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold whitespace-nowrap transition-colors"
          >
            Global Attendance →
          </Link>
          <Link
            to="/hr/fees"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold whitespace-nowrap transition-colors"
          >
            Fees Management →
          </Link>
          <Link
            to="/calendar"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold whitespace-nowrap transition-colors"
          >
            Organization Calendar →
          </Link>
          <Link
            to="/hr/programs"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold whitespace-nowrap transition-colors"
          >
            Programs & Batches →
          </Link>
        </div>

        {isLoading && <Loading message="Loading HR briefing and operational monitors..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && (
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* 50/50 LAYOUT: 1. TODAY'S BIRTHDAY & 2. TOMORROW'S EVENTS IN CALENDAR      */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* ========================================================================= */}
              {/* 1. TODAY'S BIRTHDAY MEMBER (TWO SHADES DARKER PINK)                       */}
              {/* ========================================================================= */}
              <div className="rounded-3xl bg-gradient-to-br from-pink-200/80 via-rose-100 to-pink-200/90 dark:from-pink-950/50 dark:via-rose-950/40 dark:to-slate-900 border border-pink-300/90 dark:border-pink-800/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full overflow-hidden">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Symmetrical Header */}
                    <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-pink-300/60 dark:border-pink-800/60">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 sm:p-3 bg-white dark:bg-pink-900/40 border border-pink-300 dark:border-pink-700 rounded-2xl text-pink-700 dark:text-pink-300 flex items-center justify-center shrink-0 shadow-2xs">
                          <Cake className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-200 dark:bg-pink-900/80 text-pink-900 dark:text-pink-100 border border-pink-300 dark:border-pink-700 whitespace-nowrap">
                              🎂 1. Today's Birthday Member
                            </span>
                            <span className="text-[11px] font-semibold text-pink-900/90 dark:text-pink-200 whitespace-nowrap">
                              Live Birthday Alert ({formatDisplayDate(todayStr)})
                            </span>
                          </div>
                          <h2
                            className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1 truncate"
                            title={
                              todayBirthdays.length > 0
                                ? todayBirthdays.length === 1
                                  ? `Today is ${todayBirthdays[0].student_name}'s Birthday!`
                                  : `${todayBirthdays.length} Members Celebrating Birthdays Today!`
                                : 'No Birthdays Today'
                            }
                          >
                            {todayBirthdays.length > 0
                              ? todayBirthdays.length === 1
                                ? `Today is ${todayBirthdays[0].student_name}'s Birthday!`
                                : `${todayBirthdays.length} Members Celebrating Birthdays Today!`
                              : 'No Birthdays Today'}
                          </h2>
                        </div>
                      </div>

                      <Link
                        to="/calendar"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-700 text-xs font-bold transition-colors shrink-0 shadow-2xs whitespace-nowrap ml-2"
                      >
                        <Calendar className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                        <span>View Calendar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Birthday Member List or Empty State */}
                    {todayBirthdays.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                        {todayBirthdays.slice(0, todayBirthdays.length === 1 ? 1 : 2).map((member) => (
                          <div
                            key={member.student_id}
                            className="bg-white/95 dark:bg-slate-900/90 border border-pink-200/90 dark:border-pink-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-pink-300 dark:hover:border-pink-700 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-pink-200 dark:bg-pink-900/70 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-700 font-black text-sm flex items-center justify-center shrink-0">
                                  {member.student_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                                    {member.student_name}
                                  </h3>
                                  <span className="text-xs font-mono font-medium text-pink-800 dark:text-pink-300 block truncate">
                                    {member.roll_number}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-900/80 text-pink-900 dark:text-pink-100 border border-pink-300 dark:border-pink-700 text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0">
                                <PartyPopper className="w-3 h-3 text-pink-700 dark:text-pink-300" />
                                Today!
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-pink-100/60 dark:bg-pink-950/40 border border-pink-200/80 dark:border-pink-900/50 rounded-xl p-2.5">
                              {member.turning_age && (
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  <Gift className="w-3 h-3 text-pink-600" />
                                  <span>Turning {member.turning_age} Years Old Today</span>
                                </div>
                              )}
                              {(member.program_title || member.batch_name) && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                  {member.program_title} {member.batch_name ? `• ${member.batch_name}` : ''}
                                </div>
                              )}
                              {member.contact_number && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <PhoneCall className="w-3 h-3 text-pink-500" />
                                  <span>{member.contact_number}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-pink-100 dark:border-pink-900/40 flex items-center justify-between text-xs">
                              {member.email ? (
                                <a
                                  href={`mailto:${member.email}?subject=Happy Birthday from Netlink HR Team!&body=Dear ${member.student_name},%0D%0A%0D%0AWishing you a very Happy Birthday from all of us at Netlink Software Group America and the netSEED team! May this year bring you great achievements and learning milestones.%0D%0A%0D%0AWarm regards,%0D%0ANetlink HR & Mentorship Team`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-100 dark:bg-pink-950/70 border border-pink-300 dark:border-pink-700 text-pink-800 dark:text-pink-200 font-bold hover:bg-pink-200 dark:hover:bg-pink-900 transition-colors shadow-2xs text-xs"
                                >
                                  <Mail className="w-3 h-3" />
                                  Wish Birthday
                                </a>
                              ) : (
                                <span />
                              )}
                              <Link
                                to={`/hr/students/${member.student_id}`}
                                className="text-pink-800 dark:text-pink-300 hover:text-pink-950 dark:hover:text-pink-100 font-bold text-xs"
                              >
                                Profile →
                              </Link>
                            </div>
                          </div>
                        ))}

                        {/* Symmetrical balancing card when exactly 1 member is celebrating */}
                        {todayBirthdays.length === 1 && (
                          nextUpcomingBirthday ? (
                            <div
                              key={`upcoming-${nextUpcomingBirthday.student_id}`}
                              className="bg-white/95 dark:bg-slate-900/90 border border-pink-200/90 dark:border-pink-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-pink-300 dark:hover:border-pink-700 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-10 h-10 rounded-2xl bg-pink-200/80 dark:bg-pink-900/70 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-700 font-black text-sm flex items-center justify-center shrink-0">
                                    {nextUpcomingBirthday.student_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                                      {nextUpcomingBirthday.student_name}
                                    </h3>
                                    <span className="text-xs font-mono font-medium text-pink-800 dark:text-pink-300 block truncate">
                                      {nextUpcomingBirthday.roll_number}
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-900/80 text-pink-900 dark:text-pink-100 border border-pink-300 dark:border-pink-700 text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3 text-pink-700 dark:text-pink-300" />
                                  Upcoming
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-pink-100/60 dark:bg-pink-950/40 border border-pink-200/80 dark:border-pink-900/50 rounded-xl p-2.5">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  <Gift className="w-3 h-3 text-pink-600" />
                                  <span>
                                    {nextUpcomingBirthday.days_until === 1
                                      ? 'Birthday Tomorrow!'
                                      : `Birthday on ${formatDisplayDate(nextUpcomingBirthday.celebration_date || nextUpcomingBirthday.dob)}`}
                                  </span>
                                </div>
                                {(nextUpcomingBirthday.program_title || nextUpcomingBirthday.batch_name) && (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                    {nextUpcomingBirthday.program_title} {nextUpcomingBirthday.batch_name ? `• ${nextUpcomingBirthday.batch_name}` : ''}
                                  </div>
                                )}
                                {nextUpcomingBirthday.contact_number && (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                    <PhoneCall className="w-3 h-3 text-pink-500" />
                                    <span>{nextUpcomingBirthday.contact_number}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-pink-100 dark:border-pink-900/40 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-pink-700 dark:text-pink-300 font-medium">
                                  Next in line
                                </span>
                                <Link
                                  to={`/hr/students/${nextUpcomingBirthday.student_id}`}
                                  className="text-pink-800 dark:text-pink-300 hover:text-pink-950 dark:hover:text-pink-100 font-bold text-xs"
                                >
                                  Profile →
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white/95 dark:bg-slate-900/90 border border-pink-200/90 dark:border-pink-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-2xl bg-pink-200 dark:bg-pink-900/70 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-700 font-black text-sm flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-pink-700 dark:text-pink-300" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                                      Celebration Milestone
                                    </h3>
                                    <span className="text-xs font-medium text-pink-800 dark:text-pink-300 block">
                                      Faculty & Trainee Registry
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-900/80 text-pink-900 dark:text-pink-100 border border-pink-300 dark:border-pink-700 text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Synced
                                </span>
                              </div>

                              <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-pink-100/60 dark:bg-pink-950/40 border border-pink-200/80 dark:border-pink-900/50 rounded-xl p-2.5">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  <Sparkles className="w-3 h-3 text-pink-600" />
                                  <span>1 Active Birthday Celebration Today</span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                  Personalized greetings and cohort notifications are active. All upcoming trainee celebrations sync directly with the HR master roster.
                                </p>
                              </div>

                              <div className="pt-2 border-t border-pink-100 dark:border-pink-900/40 flex items-center justify-between text-xs">
                                <Link
                                  to="/calendar"
                                  className="inline-flex items-center gap-1 text-pink-800 dark:text-pink-300 font-bold hover:underline"
                                >
                                  <Calendar className="w-3 h-3" />
                                  All Milestones
                                </Link>
                                <Link
                                  to="/hr/students"
                                  className="text-pink-800 dark:text-pink-300 hover:text-pink-950 dark:hover:text-pink-100 font-bold text-xs"
                                >
                                  Directory →
                                </Link>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 p-6 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-pink-200/90 dark:border-pink-800/80 text-center space-y-2 flex-1 flex flex-col items-center justify-center min-h-[190px]">
                        <div className="inline-flex p-3 bg-pink-100 dark:bg-pink-950/70 border border-pink-300 dark:border-pink-700 rounded-full text-pink-700 dark:text-pink-300 mb-1">
                          <Cake className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Birthdays Today</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                          There are no trainee or staff member birthdays scheduled for today ({formatDisplayDate(todayStr)}).
                          Upcoming celebrations can be reviewed in the master calendar.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 2. THIS MONTH'S FESTIVAL (TWO SHADES DARKER ORANGE)                       */}
              {/* ========================================================================= */}
              <div className="rounded-3xl bg-gradient-to-br from-amber-200/80 via-orange-100 to-amber-200/90 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-slate-900 border border-orange-300/90 dark:border-orange-800/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full overflow-hidden">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Symmetrical Header */}
                    <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-orange-300/60 dark:border-orange-800/60">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 sm:p-3 bg-white dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-2xl text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0 shadow-2xs">
                          <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-200 dark:bg-amber-900/80 text-orange-900 dark:text-orange-100 border border-orange-300 dark:border-orange-700 whitespace-nowrap">
                              {festivalTheme.icon} 2. Month's Festival Spotlight
                            </span>
                            <span className="text-[11px] font-semibold text-orange-950/90 dark:text-orange-200 whitespace-nowrap">
                              {activeFestival ? `Festival Alert (${formatDisplayDate(activeFestival.date)})` : `Festive Season (${monthName})`}
                            </span>
                          </div>
                          <h2
                            className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1 truncate"
                            title={
                              activeFestival
                                ? activeFestival.date === todayStr
                                  ? `Today is ${activeFestival.title}!`
                                  : `${activeFestival.title}`
                                : 'No Festivals This Month'
                            }
                          >
                            {activeFestival
                              ? activeFestival.date === todayStr
                                ? `Today is ${activeFestival.title}!`
                                : `${activeFestival.title}`
                              : 'No Festivals This Month'}
                          </h2>
                        </div>
                      </div>

                      <Link
                        to="/calendar"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-755 text-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700 text-xs font-bold transition-colors shrink-0 shadow-2xs whitespace-nowrap ml-2"
                      >
                        <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span>View Calendar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Festival List or Empty State */}
                    {displayFestivals.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                        {displayFestivals.map((fest) => (
                          <div
                            key={fest.id || fest.title}
                            className="bg-white/95 dark:bg-slate-900/90 border border-orange-200/90 dark:border-orange-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-orange-200 dark:bg-orange-900/70 text-orange-900 dark:text-orange-100 border border-orange-300 dark:border-orange-700 font-black text-base flex items-center justify-center shrink-0">
                                  {festivalTheme.icon}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                                    {fest.title}
                                  </h3>
                                  <span className="text-xs font-mono font-medium text-orange-900 dark:text-orange-300 block truncate">
                                    {formatDisplayDate(fest.date)}
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border flex items-center gap-1 shrink-0 ${
                                fest.is_off_day
                                  ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-700'
                                  : 'bg-orange-200 dark:bg-orange-900/80 text-orange-950 dark:text-orange-100 border-orange-300 dark:border-orange-700'
                              }`}>
                                <Sparkles className="w-3 h-3 text-orange-700 dark:text-orange-300" />
                                {fest.date === todayStr ? 'Today!' : fest.is_off_day ? 'Holiday' : 'Festival'}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-orange-100/60 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/50 rounded-xl p-2.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                                <Calendar className="w-3 h-3 text-orange-600" />
                                <span>{fest.is_off_day ? 'Official Company Holiday' : 'Festival Celebration'}</span>
                              </div>
                              {fest.description && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {fest.description}
                                </div>
                              )}
                              {fest.person_name && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                                  <span>Celebrated by: {fest.person_name}</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-orange-100 dark:border-orange-900/40 flex items-center justify-between text-xs">
                              <Link
                                to="/calendar"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-200 font-bold hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors shadow-2xs text-xs"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                Calendar Event
                              </Link>
                              <Link
                                to="/calendar"
                                className="text-orange-900 dark:text-orange-300 hover:text-orange-950 dark:hover:text-orange-100 font-bold text-xs"
                              >
                                Details →
                              </Link>
                            </div>
                          </div>
                        ))}

                        {/* Symmetrical Balancing Slot when exactly 1 festival is displayed */}
                        {displayFestivals.length === 1 && (
                          <div className="bg-white/95 dark:bg-slate-900/90 border border-orange-200/90 dark:border-orange-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-orange-200 dark:bg-orange-900/70 text-orange-900 dark:text-orange-100 border border-orange-300 dark:border-orange-700 font-black text-sm flex items-center justify-center shrink-0">
                                  <Calendar className="w-5 h-5 text-orange-700 dark:text-orange-300" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                                    Academic & Training Schedule
                                  </h3>
                                  <span className="text-xs font-medium text-orange-900 dark:text-orange-300 block">
                                    Active Training Days
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-900/80 text-orange-900 dark:text-orange-100 border border-orange-300 dark:border-orange-700 text-[10px] font-bold rounded-lg flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-orange-100/60 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/50 rounded-xl p-2.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                                <Sparkles className="w-3 h-3 text-orange-600" />
                                <span>Regular Training Sessions Active</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                Class modules, project check-ins, and biometric attendance proceed according to batch schedules.
                              </p>
                            </div>

                            <div className="pt-2 border-t border-orange-100 dark:border-orange-900/40 flex items-center justify-between text-xs">
                              <Link
                                to="/calendar"
                                className="inline-flex items-center gap-1 text-orange-900 dark:text-orange-300 font-bold hover:underline"
                              >
                                <Calendar className="w-3 h-3" />
                                Full Calendar
                              </Link>
                              <Link
                                to="/hr/programs"
                                className="text-orange-900 dark:text-orange-300 hover:text-orange-950 dark:hover:text-orange-100 font-bold text-xs"
                              >
                                Batches →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 p-6 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-orange-200/90 dark:border-orange-800/80 text-center space-y-2 flex-1 flex flex-col items-center justify-center min-h-[190px]">
                        <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-700 rounded-full text-orange-700 dark:text-orange-300 mb-1">
                          <PartyPopper className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Festivals This Month</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                          There are no public festivals or declared company holidays scheduled for this month ({monthName}).
                          All regular training sessions proceed normally.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. CURRENT ABSENTEES AND PAST DAY ABSENTEES                                */}
            {/* ========================================================================= */}
            <Card
              title="3. Trainee Absentees Oversight"
              subtitle="Current day absentees and past day absentees across all batches"
              action={
                <div className="flex items-center gap-2">
                  <Link
                    to="/hr/attendance"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Attendance Roster <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              }
            >
              <div className="space-y-4">
                {/* TABS & SEARCH */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAbsenteeTab('TODAY')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        absenteeTab === 'TODAY'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Current Absentees (Today)
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                        absenteeTab === 'TODAY'
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {todayAbsentees.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setAbsenteeTab('YESTERDAY')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        absenteeTab === 'YESTERDAY'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Past Day Absentees (Yesterday)
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                        absenteeTab === 'YESTERDAY'
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {yesterdayAbsentees.length}
                      </span>
                    </button>
                  </div>

                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search absentee..."
                      value={absenteeSearch}
                      onChange={(e) => setAbsenteeSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* CURRENT TAB: TODAY'S ABSENTEES */}
                {absenteeTab === 'TODAY' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Date: {formatDisplayDate(todayStr)} — {filteredTodayAbsentees.length} Trainees Absent Today
                      </span>
                    </div>

                    {filteredTodayAbsentees.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredTodayAbsentees.map((record) => {
                          const student = record.student;
                          const name = student?.user?.full_name || 'Enrolled Student';
                          const roll = student?.roll_number || 'N/A';
                          const batch = student?.batch?.name || 'Assigned Cohort';
                          const phone = student?.contact_number || student?.user?.phone;
                          const email = student?.user?.email;

                          return (
                            <div
                              key={record.id}
                              className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200/80 dark:border-rose-900/40 flex flex-col justify-between space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                                    {name}
                                  </h4>
                                  <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                                    {roll}
                                  </div>
                                </div>
                                <Badge variant="error">ABSENT TODAY</Badge>
                              </div>

                              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  Batch: {batch}
                                </div>
                                {phone && (
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <PhoneCall className="w-3 h-3 text-slate-400" />
                                    <a href={`tel:${phone}`} className="hover:underline text-indigo-600 dark:text-indigo-400">
                                      {phone}
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between text-xs">
                                {email ? (
                                  <a
                                    href={`mailto:${email}?subject=Attendance Notice: Absence Today at Netlink&body=Dear ${name},%0D%0A%0D%0AWe observed that your attendance punch was not recorded for today (${todayStr}). Please ensure you check in or submit a regularization request if you faced any technical or transport delay.%0D%0A%0D%0ARegards,%0D%0ANetlink HR Operations`}
                                    className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 text-[11px]"
                                  >
                                    <Mail className="w-3 h-3" />
                                    Follow Up
                                  </a>
                                ) : (
                                  <span />
                                )}
                                {student?.id && (
                                  <Link
                                    to={`/hr/students/${student.id}`}
                                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-[11px]"
                                  >
                                    Profile →
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          100% Attendance Today!
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No trainees are marked absent for today ({formatDisplayDate(todayStr)}).
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* PAST DAY TAB: YESTERDAY'S ABSENTEES */}
                {absenteeTab === 'YESTERDAY' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Date: {formatDisplayDate(yesterdayStr)} — {filteredYesterdayAbsentees.length} Trainees Were Absent Yesterday
                      </span>
                    </div>

                    {filteredYesterdayAbsentees.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredYesterdayAbsentees.map((record) => {
                          const student = record.student;
                          const name = student?.user?.full_name || 'Enrolled Student';
                          const roll = student?.roll_number || 'N/A';
                          const batch = student?.batch?.name || 'Assigned Cohort';
                          const phone = student?.contact_number || student?.user?.phone;
                          const email = student?.user?.email;

                          return (
                            <div
                              key={record.id}
                              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                                    {name}
                                  </h4>
                                  <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                    {roll}
                                  </div>
                                </div>
                                <Badge variant="neutral">YESTERDAY ABSENT</Badge>
                              </div>

                              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  Batch: {batch}
                                </div>
                                {phone && (
                                  <div className="flex items-center gap-1.5 text-[11px]">
                                    <PhoneCall className="w-3 h-3 text-slate-400" />
                                    <a href={`tel:${phone}`} className="hover:underline text-indigo-600 dark:text-indigo-400">
                                      {phone}
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                                {email ? (
                                  <a
                                    href={`mailto:${email}?subject=Netlink Trainee Check-in: Past Day Absence&body=Dear ${name},%0D%0A%0D%0AWe noted your absence yesterday (${yesterdayStr}). Please reach out to your mentor if you need assistance catching up with class modules.%0D%0A%0D%0ARegards,%0D%0ANetlink HR Operations`}
                                    className="text-slate-600 dark:text-slate-400 hover:underline font-bold flex items-center gap-1 text-[11px]"
                                  >
                                    <Mail className="w-3 h-3" />
                                    Send Check-in
                                  </a>
                                ) : (
                                  <span />
                                )}
                                {student?.id && (
                                  <Link
                                    to={`/hr/students/${student.id}`}
                                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-[11px]"
                                  >
                                    Profile →
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          0 Absentees Yesterday
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          All students were present or accounted for on {formatDisplayDate(yesterdayStr)}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* ========================================================================= */}
            {/* 4. FEE DEFAULTERS / OR REMAINING                                          */}
            {/* ========================================================================= */}
            <Card
              title="4. Fee Defaulters & Remaining Balances"
              subtitle="Trainees with pending fees or unpaid installment balances requiring HR follow-up"
              action={
                <Link
                  to="/hr/fees"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  Fees Management Ledger
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="space-y-4">
                {/* SUMMARY STATS BANNER */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                      Total Fee Defaulters
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                      {feeDefaulters.length} Trainees
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider block">
                      Total Outstanding Dues
                    </span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block flex items-center gap-0.5">
                      <IndianRupee className="w-5 h-5" />
                      {totalOutstandingDue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Action Required
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                        Send Payment Notices
                      </span>
                    </div>
                    <Link
                      to="/hr/fees"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Collect Fees
                    </Link>
                  </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-full max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search defaulter by name, roll, batch..."
                      value={defaulterSearch}
                      onChange={(e) => setDefaulterSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Showing {filteredFeeDefaulters.length} defaulters
                  </span>
                </div>

                {/* DEFAULTERS LIST */}
                {filteredFeeDefaulters.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Trainee / Student</th>
                          <th className="py-3 px-4">Batch</th>
                          <th className="py-3 px-4">Total Fee</th>
                          <th className="py-3 px-4">Paid</th>
                          <th className="py-3 px-4 text-rose-600 dark:text-rose-400 font-black">Remaining Due</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                        {filteredFeeDefaulters.map((item) => (
                          <tr key={item.student_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {item.full_name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {item.roll_number}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                {item.batch_name || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                              ₹{(item.total_fees || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              ₹{(item.total_paid || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 font-mono font-black text-rose-600 dark:text-rose-400">
                              ₹{(item.remaining_fees || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={item.payment_status === 'UNPAID' ? 'error' : 'warning'}>
                                {item.payment_status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-[11px]">
                              {item.contact_number && (
                                <div className="flex items-center gap-1">
                                  <PhoneCall className="w-3 h-3 text-slate-400" />
                                  <a href={`tel:${item.contact_number}`} className="hover:underline">
                                    {item.contact_number}
                                  </a>
                                </div>
                              )}
                              {item.email && (
                                <div className="text-slate-400 truncate max-w-[140px]">
                                  {item.email}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {(() => {
                                const isFeesCompleted = (item.remaining_fees ?? 0) <= 0 || (item.payment_status as string) === 'PAID' || (item.payment_status as string) === 'COMPLETED';
                                if (isFeesCompleted) {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-[11px] cursor-not-allowed opacity-60 border border-slate-200 dark:border-slate-700 select-none"
                                      title="Fees completed — No dues remaining"
                                    >
                                      Record Pay
                                    </span>
                                  );
                                }
                                return (
                                  <Link
                                    to="/hr/fees"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors text-[11px]"
                                  >
                                    Record Pay
                                  </Link>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Zero Fee Defaulters!
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      All trainee fees have been collected in full.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* ========================================================================= */}
            {/* 5. IF TRAINER ON LEAVE                                                    */}
            {/* ========================================================================= */}
            <Card
              title="5. Trainer & Mentor Leave Status"
              subtitle="Faculty presence and active leave records for mentors & trainers"
            >
              {trainersOnLeaveToday.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-200 dark:bg-amber-900/60 rounded-xl text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                          Faculty Alert
                        </span>
                        <h4 className="font-black text-amber-950 dark:text-amber-100 text-sm">
                          {trainersOnLeaveToday.length === 1
                            ? `${trainersOnLeaveToday[0].trainer_name} is currently ON LEAVE today!`
                            : `${trainersOnLeaveToday.length} Trainers are ON LEAVE today`}
                        </h4>
                      </div>
                    </div>
                    <Badge variant="warning">ON LEAVE TODAY</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {trainersOnLeaveToday.map((leave) => (
                      <div
                        key={leave.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              {leave.trainer_name}
                            </h4>
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">
                              Reason: {leave.reason || 'Leave of Absence'}
                            </span>
                          </div>
                          <Badge variant="warning">{leave.status}</Badge>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {formatDisplayDate(leave.start_date)} ~ {formatDisplayDate(leave.end_date)}
                            </span>
                          </div>
                          {leave.substitute_trainer_name && (
                            <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                              Substitute: {leave.substitute_trainer_name}
                            </div>
                          )}
                          {leave.notes && (
                            <div className="text-[11px] text-slate-500 italic">
                              "{leave.notes}"
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {leave.id.slice(0, 8)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteLeave(leave.id)}
                            className="text-xs py-1 px-2.5 font-bold"
                          >
                            Mark Returned
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                          Faculty Full Roster
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          All Trainers Active On Duty
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                        No Trainers or Mentors on Leave Today
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        All assigned mentors and trainers are actively conducting sessions as per batch schedules.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="self-start sm:self-auto text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Log Leave Request
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* MODAL: RECORD TRAINER LEAVE */}
        <Modal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          title="Record Trainer / Mentor Leave"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRecordLeaveSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Trainer / Mentor *
              </label>
              <select
                value={leaveForm.trainer_id}
                onChange={(e) => {
                  const m = mentors.find((item) => item.id === e.target.value);
                  setLeaveForm({
                    ...leaveForm,
                    trainer_id: e.target.value,
                    trainer_name: m?.full_name || '',
                  });
                }}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              >
                <option value="">-- Choose Faculty Mentor --</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Leave *
              </label>
              <select
                value={leaveForm.reason || 'Casual Leave'}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency">Emergency</option>
                <option value="Faculty Conference / Workshop">Faculty Conference / Workshop</option>
                <option value="Personal Leave">Personal Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Substitute Trainer Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Abhishek Verma"
                value={leaveForm.substitute_trainer_name || ''}
                onChange={(e) => setLeaveForm({ ...leaveForm, substitute_trainer_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notes & Session Arrangements
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes or batch instructions..."
                value={leaveForm.notes || ''}
                onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={isSubmittingLeave}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingLeave}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {isSubmittingLeave ? 'Saving...' : 'Record Leave'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};
