import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CalendarEvent, CalendarEventCreatePayload, Batch } from '../types';
import { getStandardNow, getStandardDateString, formatLocalTime } from '../lib/dateUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Sparkles,
  Cake,
  Building,
  Palmtree,
  Plus,
  Clock,
  Filter,
  Info,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Gift,
  Megaphone,
  Radio,
  Layers,
  X
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage: React.FC = () => {
  const { role } = useAuth();
  const isHRorAdmin = role === 'HR' || role === 'SUPER_ADMIN';

  const today = getStandardNow();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BROADCAST' | 'FESTIVAL' | 'OFF_DAY' | 'BIRTHDAY' | 'ORGANIZATION'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Day Details Modal
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: CalendarEvent[] } | null>(null);

  // Active Broadcast Dismiss state
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useState<string[]>([]);

  // Add Event Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<{
    title: string;
    description: string;
    date: string;
    event_type: string;
    is_off_day: boolean;
    person_name: string;
    target_scope: 'ALL' | 'SPECIFIC_BATCH';
    batch_id: string;
    scheduled_time: string;
    duration_minutes: number;
    is_recurring: boolean;
    recurrence_pattern: 'DAILY' | 'WEEKLY';
  }>({
    title: '',
    description: '',
    date: getStandardDateString(today),
    event_type: 'FESTIVAL',
    is_off_day: true,
    person_name: '',
    target_scope: 'ALL',
    batch_id: '',
    scheduled_time: '10:00',
    duration_minutes: 60,
    is_recurring: false,
    recurrence_pattern: 'DAILY',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [eventsRes, batchesRes] = await Promise.all([
        api.get<CalendarEvent[]>('/calendar/events'),
        api.get<Batch[]>('/batches').catch(() => []),
      ]);
      setEvents(eventsRes || []);
      setBatches(batchesRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleTodayJump = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Calendar Grid Days Calculation
  const calendarGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      dateString: string;
      isToday: boolean;
      isWeekend: boolean;
    }> = [];

    // Preceding padding days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(prevYear, prevMonth, dayNum).getDay();
      days.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateString: dateStr,
        isToday: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isDateToday =
        today.getFullYear() === currentYear &&
        today.getMonth() === currentMonth &&
        today.getDate() === d;
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateString: dateStr,
        isToday: isDateToday,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // Trailing padding days for complete 35 or 42 grid slots
    const remainingSlots = 42 - days.length;
    if (remainingSlots > 0 && remainingSlots < 7) {
      for (let nextD = 1; nextD <= remainingSlots; nextD++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
        const dayOfWeek = new Date(nextYear, nextMonth, nextD).getDay();
        days.push({
          dayNumber: nextD,
          isCurrentMonth: false,
          dateString: dateStr,
          isToday: false,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth]);

  // Filter events based on activeFilter
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'BROADCAST') return e.event_type === 'BROADCAST';
      if (activeFilter === 'FESTIVAL') return e.event_type === 'FESTIVAL';
      if (activeFilter === 'OFF_DAY') return e.is_off_day || e.event_type === 'OFF_DAY';
      if (activeFilter === 'BIRTHDAY') return e.event_type === 'BIRTHDAY' && !e.title.toLowerCase().includes('netlink');
      if (activeFilter === 'ORGANIZATION') return e.title.toLowerCase().includes('netlink');
      return true;
    });
  }, [events, activeFilter]);

  const todayStr = useMemo(() => getStandardDateString(today), [today]);

  // Active Broadcast Messages visible right now
  const activeBroadcasts = useMemo(() => {
    return events.filter(
      (e) =>
        e.event_type === 'BROADCAST' &&
        !dismissedBroadcastIds.includes(e.id) &&
        (e.is_active_broadcast || e.date === todayStr)
    );
  }, [events, todayStr, dismissedBroadcastIds]);

  // Map events to dateString for instant O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [filteredEvents]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Find festival or event today with Netlink celebration
  const todayNetlinkEvent = useMemo(() => {
    return events.find((e) => {
      if (e.date !== todayStr) return false;
      const titleLower = e.title.toLowerCase();
      const descLower = (e.description || '').toLowerCase();
      return (
        titleLower.includes('netlink') ||
        descLower.includes('netlink') ||
        e.event_type === 'FESTIVAL' ||
        e.event_type === 'EVENT'
      );
    });
  }, [events, todayStr]);

  // Upcoming celebrations (Next 30 days or sorted)
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [events, todayStr]);

  // Find upcoming festival or event with Netlink name
  const upcomingNetlinkEvent = useMemo(() => {
    const netlinkEvents = events.filter((e) => {
      const titleLower = e.title.toLowerCase();
      const descLower = (e.description || '').toLowerCase();
      const personLower = (e.person_name || '').toLowerCase();
      return (
        titleLower.includes('netlink') ||
        descLower.includes('netlink') ||
        personLower.includes('netlink')
      );
    });

    if (netlinkEvents.length === 0) return null;

    // First look for upcoming ones >= today
    const futureEvents = netlinkEvents
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (futureEvents.length > 0) {
      return futureEvents[0];
    }

    // Otherwise, pick the next event chronologically across dataset
    return [...netlinkEvents].sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [events]);

  const netlinkCountdown = useMemo(() => {
    if (!upcomingNetlinkEvent) return null;
    const targetDate = new Date(upcomingNetlinkEvent.date);
    const currentDate = new Date(getStandardDateString(today));
    const diffTime = targetDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today! 🎉';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Annual Cycle';
    return `In ${diffDays} Days`;
  }, [upcomingNetlinkEvent]);

  // KPI Metrics
  const festivalCount = useMemo(() => events.filter((e) => e.event_type === 'FESTIVAL').length, [events]);
  const birthdayCount = useMemo(() => events.filter((e) => e.event_type === 'BIRTHDAY').length, [events]);
  const offDayCount = useMemo(() => events.filter((e) => e.is_off_day || e.event_type === 'OFF_DAY').length, [events]);

  const jumpToEvent = (ev: CalendarEvent) => {
    if (!ev || !ev.date) return;
    const parts = ev.date.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
    setSelectedDayEvents({ date: ev.date, events: [ev] });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title.trim() || !addForm.date) {
      setFormError('Event title and date are required.');
      return;
    }

    if (addForm.event_type === 'BROADCAST' && addForm.target_scope === 'SPECIFIC_BATCH' && !addForm.batch_id) {
      setFormError('Please select a target batch for this broadcast message.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let startTimeIso: string | undefined = undefined;
      let endTimeIso: string | undefined = undefined;

      if (addForm.event_type === 'BROADCAST') {
        const timeStr = addForm.scheduled_time || '10:00';
        const startDt = new Date(`${addForm.date}T${timeStr}:00`);
        if (!isNaN(startDt.getTime())) {
          startTimeIso = startDt.toISOString();
          const endDt = new Date(startDt.getTime() + (addForm.duration_minutes || 60) * 60000);
          endTimeIso = endDt.toISOString();
        }
      }

      const payload: CalendarEventCreatePayload = {
        title: addForm.title.trim(),
        description: addForm.description.trim() || undefined,
        date: addForm.date,
        event_type: addForm.event_type,
        is_off_day: addForm.event_type === 'OFF_DAY' ? true : (addForm.event_type === 'BROADCAST' ? false : addForm.is_off_day),
        person_name: addForm.person_name.trim() || undefined,
        target_scope: addForm.event_type === 'BROADCAST' ? addForm.target_scope : 'ALL',
        batch_id: addForm.event_type === 'BROADCAST' && addForm.target_scope === 'SPECIFIC_BATCH' ? addForm.batch_id : undefined,
        start_time: startTimeIso,
        end_time: endTimeIso,
        duration_minutes: addForm.event_type === 'BROADCAST' ? Number(addForm.duration_minutes) : undefined,
        is_recurring: addForm.event_type === 'BROADCAST' ? addForm.is_recurring : false,
        recurrence_pattern: addForm.event_type === 'BROADCAST' && addForm.is_recurring ? addForm.recurrence_pattern : undefined,
      };

      await api.post('/calendar/events', payload);
      setIsAddModalOpen(false);
      setAddForm({
        title: '',
        description: '',
        date: getStandardDateString(today),
        event_type: 'FESTIVAL',
        is_off_day: true,
        person_name: '',
        target_scope: 'ALL',
        batch_id: '',
        scheduled_time: '10:00',
        duration_minutes: 60,
        is_recurring: false,
        recurrence_pattern: 'DAILY',
      });
      await fetchEvents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create calendar event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEventBadge = (event: CalendarEvent) => {
    if (event.event_type === 'BROADCAST') {
      const scopeLabel = event.target_scope === 'SPECIFIC_BATCH' && event.batch_name ? `[${event.batch_name}] ` : '[All Batches] ';
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-[10px] truncate">
          <Megaphone className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate">{scopeLabel}{event.title}</span>
        </span>
      );
    }
    const isOrg = event.title.toLowerCase().includes('netlink');
    if (isOrg) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-extrabold text-[10px] truncate">
          <Building className="w-3 h-3 text-orange-500 shrink-0" />
          <span className="truncate">{event.title}</span>
        </span>
      );
    }
    if (event.event_type === 'BIRTHDAY') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30 font-bold text-[10px] truncate">
          <Cake className="w-3 h-3 text-pink-500 shrink-0" />
          <span className="truncate">{event.title}</span>
        </span>
      );
    }
    if (event.event_type === 'FESTIVAL') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold text-[10px] truncate">
          <PartyPopper className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="truncate">{event.title}</span>
        </span>
      );
    }
    if (event.is_off_day || event.event_type === 'OFF_DAY') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-bold text-[10px] truncate">
          <Palmtree className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate">{event.title}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 font-medium text-[10px] truncate">
        <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
        <span className="truncate">{event.title}</span>
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Hero Top Bar */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-700 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-white/10">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold w-fit">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Netlink & netSEED Hub Event Calendar</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
                <CalendarIcon className="w-8 h-8 text-sky-200" />
                Festivals, Holidays & Birthdays
              </h1>
              <p className="text-xs text-purple-100 max-w-xl font-medium">
                Explore official national festivals, declared non-working days, students' birthdays, and organization anniversary celebrations.
              </p>
            </div>

            {isHRorAdmin && (
              <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
                <Button
                  variant="white"
                  size="md"
                  onClick={() => {
                    setFormError(null);
                    setAddForm({
                      title: '',
                      description: '',
                      date: getStandardDateString(today),
                      event_type: 'BROADCAST',
                      is_off_day: false,
                      person_name: '',
                      target_scope: 'ALL',
                      batch_id: batches[0]?.id || '',
                      scheduled_time: '10:00',
                      duration_minutes: 60,
                      is_recurring: false,
                      recurrence_pattern: 'DAILY',
                    });
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-2 shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-xl border border-purple-400/30 transition-all"
                >
                  <Megaphone className="w-4 h-4 stroke-[2.5]" />
                  <span>Schedule Broadcast</span>
                </Button>

                <Button
                  variant="white"
                  size="md"
                  onClick={() => {
                    setFormError(null);
                    setAddForm({
                      title: '',
                      description: '',
                      date: getStandardDateString(today),
                      event_type: 'FESTIVAL',
                      is_off_day: true,
                      person_name: '',
                      target_scope: 'ALL',
                      batch_id: '',
                      scheduled_time: '10:00',
                      duration_minutes: 60,
                      is_recurring: false,
                      recurrence_pattern: 'DAILY',
                    });
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-2 shadow-lg text-indigo-700 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] text-indigo-700" />
                  <span>Add Calendar Event</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Active Broadcasts Spotlight Banner */}
        {activeBroadcasts.length > 0 && (
          <div className="space-y-3">
            {activeBroadcasts.map((bc) => (
              <div
                key={bc.id}
                className="p-5 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-violet-800 text-white shadow-lg shadow-purple-900/20 border border-purple-400/40 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
              >
                <div className="flex items-start gap-3.5 relative z-10">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-amber-300 shrink-0 shadow-inner">
                    <Megaphone className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                        Active Broadcast Message
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] flex items-center gap-1">
                        <Radio className="w-3 h-3 text-purple-200" />
                        Target: {bc.target_scope === 'SPECIFIC_BATCH' ? (bc.batch_name || 'Specific Batch') : 'All Batches (Global)'}
                      </span>
                      {bc.duration_minutes && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-amber-200 font-bold text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Visible for {bc.duration_minutes}m
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-white">{bc.title}</h3>
                    {bc.description && (
                      <p className="text-xs text-purple-100 max-w-3xl leading-relaxed font-medium">{bc.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0 relative z-10">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => jumpToEvent(bc)}
                    className="text-xs py-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    View on Calendar
                  </Button>
                  <button
                    onClick={() => setDismissedBroadcastIds((prev) => [...prev, bc.id])}
                    className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
                    title="Dismiss Announcement"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Spotlight Row: Netlink Festival & Event */}
        <div>
          <div
            onClick={() => upcomingNetlinkEvent && jumpToEvent(upcomingNetlinkEvent)}
            className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 border border-orange-300/40 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group cursor-pointer hover:scale-[1.01] transition-all duration-300"
          >
            <div className="space-y-1.5 max-w-2xl relative z-10">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-wider uppercase text-white border border-white/30">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                  Netlink Festival & Event
                </span>
                {netlinkCountdown && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-orange-700 text-[11px] font-black shadow-xs shrink-0">
                    {netlinkCountdown}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug drop-shadow-xs">
                {upcomingNetlinkEvent ? upcomingNetlinkEvent.title : 'Netlink Tech Synergy & Hackathon'}
              </h2>

              <p className="text-xs text-orange-100 font-medium leading-relaxed">
                {upcomingNetlinkEvent?.description || 'Netlink organizational milestone and technology celebration.'}
              </p>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/20 relative z-10">
              <span className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                <CalendarDays className="w-4 h-4 text-amber-200" />
                {upcomingNetlinkEvent ? upcomingNetlinkEvent.date : 'Upcoming'}
              </span>
              <span className="text-white text-xs font-bold underline underline-offset-2 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                View on Calendar →
              </span>
            </div>
          </div>
        </div>

        {/* Calendar Navigation & Filter Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleTodayJump}
                className="px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Events ({events.length})
            </button>

            <button
              onClick={() => setActiveFilter('BROADCAST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'BROADCAST'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Broadcasts ({events.filter(e => e.event_type === 'BROADCAST').length})
            </button>

            <button
              onClick={() => setActiveFilter('FESTIVAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'FESTIVAL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
              }`}
            >
              <PartyPopper className="w-3.5 h-3.5" />
              Festivals
            </button>

            <button
              onClick={() => setActiveFilter('OFF_DAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'OFF_DAY'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              Off Days
            </button>

            <button
              onClick={() => setActiveFilter('BIRTHDAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'BIRTHDAY'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/60'
              }`}
            >
              <Cake className="w-3.5 h-3.5" />
              Student Birthdays
            </button>

            <button
              onClick={() => setActiveFilter('ORGANIZATION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'ORGANIZATION'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Organization Milestone
            </button>
          </div>
        </div>

        {isLoading && <Loading message="Loading calendar events, festivals and birthdays..." />}
        {error && <ErrorMessage message={error} />}

        {/* Main Calendar View & Sidebar */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar Grid (3 Columns) */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
              {/* Day Header Row */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAY_NAMES.map((name, i) => (
                  <div
                    key={name}
                    className={`text-center py-2 text-xs font-black uppercase tracking-wider rounded-lg ${
                      i === 0 || i === 6
                        ? 'text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarGridDays.map((slot, index) => {
                  const dayEvents = eventsByDate.get(slot.dateString) || [];
                  const hasOffDay = dayEvents.some((e) => e.is_off_day || e.event_type === 'OFF_DAY');
                  const hasBirthday = dayEvents.some((e) => e.event_type === 'BIRTHDAY');
                  const hasFestival = dayEvents.some((e) => e.event_type === 'FESTIVAL');
                  const hasOrg = dayEvents.some((e) => e.title.toLowerCase().includes('netlink'));

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedDayEvents({ date: slot.dateString, events: dayEvents });
                        }
                      }}
                      className={`min-h-[56px] sm:min-h-[105px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between ${
                        dayEvents.length > 0 ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
                      } ${
                        slot.isToday
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30'
                          : slot.isCurrentMonth
                          ? slot.isWeekend
                            ? 'border-slate-200/90 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-800/35'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                          : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 opacity-40'
                      }`}
                    >
                      {/* Top Day Number & Badges */}
                      <div className="flex items-center justify-between gap-0.5">
                        <span
                          className={`text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 ${
                            slot.isToday
                              ? 'bg-indigo-600 text-white font-bold'
                              : slot.isWeekend
                              ? 'text-slate-500 dark:text-slate-400 font-bold'
                              : slot.isCurrentMonth
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {slot.dayNumber}
                        </span>

                        <div className="flex items-center gap-0.5 sm:gap-1">
                          {hasOrg && <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />}
                          {hasBirthday && <Cake className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-500" />}
                          {hasFestival && <PartyPopper className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500" />}
                          {hasOffDay && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-400 dark:bg-slate-500" />}
                        </div>
                      </div>

                      {/* Event Chips List (Hidden on mobile to prevent overflow; visible on tablet/desktop) */}
                      <div className="hidden sm:block space-y-1 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div key={ev.id} className="truncate">
                            {getEventBadge(ev)}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Upcoming Celebrations & Highlights */}
            <div className="space-y-4">
              {/* Today's Netlink Festival and Event Card (Replaces Annual Milestone Card) */}
              <div
                onClick={() => (todayNetlinkEvent ? jumpToEvent(todayNetlinkEvent) : upcomingNetlinkEvent && jumpToEvent(upcomingNetlinkEvent))}
                className="p-5 bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white rounded-3xl shadow-sm border border-amber-400/30 space-y-3 cursor-pointer hover:scale-[1.01] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant={todayNetlinkEvent ? 'success' : 'warning'}>
                    {todayNetlinkEvent ? "Today's Event" : "Today's Schedule"}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm leading-snug">
                    Today's Netlink Festival and Event
                  </h3>
                  <div className="text-xs text-amber-100 font-semibold mt-1">
                    {formatDisplayDate(todayStr)}
                  </div>
                </div>

                {todayNetlinkEvent ? (
                  <div className="space-y-1.5 pt-1 border-t border-white/20">
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <PartyPopper className="w-4 h-4 text-amber-200 shrink-0" />
                      <span>{todayNetlinkEvent.title}</span>
                    </div>
                    {todayNetlinkEvent.description && (
                      <p className="text-[11px] text-amber-50 font-medium leading-relaxed">
                        {todayNetlinkEvent.description}
                      </p>
                    )}
                    {todayNetlinkEvent.is_off_day && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-white/20 text-white font-black text-[10px] uppercase">
                        Official Off Day / Holiday
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pt-1 border-t border-white/20">
                    <p className="text-[11px] text-amber-50 font-medium leading-relaxed">
                      No Netlink festival or event scheduled for today. Regular operations and training proceed as scheduled.
                    </p>
                    {upcomingNetlinkEvent && (
                      <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-xs space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-amber-200 block">Next Upcoming:</span>
                        <div className="font-bold text-white">{upcomingNetlinkEvent.title}</div>
                        <div className="text-[10px] text-amber-100 font-mono">{formatDisplayDate(upcomingNetlinkEvent.date)}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-bold text-white/90">
                  <span>{todayNetlinkEvent ? 'Active Today' : 'Upcoming Event'}</span>
                  <span className="underline underline-offset-2 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    {todayNetlinkEvent ? 'Highlight Date →' : 'Jump to Next →'}
                  </span>
                </div>
              </div>

              {/* Upcoming Highlights Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Upcoming Celebrations
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    Next {upcomingEvents.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedDayEvents({ date: ev.date, events: [ev] })}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {ev.title}
                        </span>
                        {ev.is_off_day && (
                          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">Off Day</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span className="font-mono">{ev.date}</span>
                        <Badge variant={ev.event_type === 'BIRTHDAY' ? 'warning' : 'info'}>
                          {ev.event_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Day Events Details */}
        <Modal
          isOpen={!!selectedDayEvents}
          onClose={() => setSelectedDayEvents(null)}
          title={`Events on ${selectedDayEvents?.date || ''}`}
        >
          <div className="space-y-3 text-xs font-sans">
            {selectedDayEvents?.events.map((ev) => (
              <div
                key={ev.id}
                className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ev.event_type === 'BROADCAST' ? (
                      <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : ev.event_type === 'BIRTHDAY' ? (
                      <Cake className="w-5 h-5 text-pink-500" />
                    ) : ev.event_type === 'FESTIVAL' ? (
                      <PartyPopper className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <Palmtree className="w-5 h-5 text-rose-500" />
                    )}
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{ev.title}</h4>
                  </div>
                  <Badge variant={ev.event_type === 'BROADCAST' ? 'info' : (ev.is_off_day ? 'error' : 'neutral')}>
                    {ev.event_type === 'BROADCAST' ? '📢 BROADCAST' : (ev.is_off_day ? 'OFF DAY / HOLIDAY' : ev.event_type)}
                  </Badge>
                </div>

                {ev.event_type === 'BROADCAST' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center gap-1">
                      <Radio className="w-3 h-3 text-purple-500" />
                      Target: {ev.target_scope === 'SPECIFIC_BATCH' ? (ev.batch_name || 'Specific Cohort') : 'All Batches (Global)'}
                    </span>
                    {ev.duration_minutes && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Visible Duration: {ev.duration_minutes} Minutes
                      </span>
                    )}
                    {ev.is_recurring && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                        Repeats: {ev.recurrence_pattern} (Fixed Schedule)
                      </span>
                    )}
                  </div>
                )}

                {ev.person_name && (
                  <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    Celebrating: {ev.person_name}
                  </div>
                )}

                {ev.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {ev.description}
                  </p>
                )}
              </div>
            ))}

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDayEvents(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Add Calendar Event or Broadcast Message (HR & Admin) */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={addForm.event_type === 'BROADCAST' ? 'Schedule Broadcast Announcement Message' : 'Add Calendar Event, Festival or Birthday'}
        >
          <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs font-sans">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {formError}
              </div>
            )}

            <Input
              label={addForm.event_type === 'BROADCAST' ? 'Broadcast Announcement Title *' : 'Event / Festival / Birthday Title *'}
              placeholder={addForm.event_type === 'BROADCAST' ? 'e.g. Project Evaluation Review Scheduled / Town Hall Meeting' : "e.g. Diwali Celebration / Rahul Sharma's Birthday"}
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Date *"
                type="date"
                value={addForm.date}
                onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                required
              />

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Event Category *
                </label>
                <select
                  value={addForm.event_type}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      event_type: e.target.value,
                      is_off_day: e.target.value === 'OFF_DAY' ? true : (e.target.value === 'BROADCAST' ? false : addForm.is_off_day),
                    })
                  }
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="BROADCAST">Broadcast Message (📢 Announcement)</option>
                  <option value="FESTIVAL">Festival (🎉)</option>
                  <option value="OFF_DAY">Company Off Day (🏖️)</option>
                  <option value="BIRTHDAY">Birthday Celebration (🎂)</option>
                  <option value="EVENT">Official Event (📅)</option>
                </select>
              </div>
            </div>

            {/* BROADCAST SPECIFIC CONFIGURATION CONTROLS */}
            {addForm.event_type === 'BROADCAST' && (
              <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-xs text-purple-950 dark:text-purple-200">
                    Broadcast Target Audience & Duration Settings
                  </span>
                </div>

                {/* Target Scope */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Target Batches:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, target_scope: 'ALL', batch_id: '' })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                        addForm.target_scope === 'ALL'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <Radio className="w-4 h-4 shrink-0" />
                      <span>All Batches (Global)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, target_scope: 'SPECIFIC_BATCH', batch_id: addForm.batch_id || (batches[0]?.id || '') })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                        addForm.target_scope === 'SPECIFIC_BATCH'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <Layers className="w-4 h-4 shrink-0" />
                      <span>Specific Batch</span>
                    </button>
                  </div>
                </div>

                {/* Batch Dropdown if Specific Batch */}
                {addForm.target_scope === 'SPECIFIC_BATCH' && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Select Cohort / Batch *
                    </label>
                    <select
                      value={addForm.batch_id}
                      onChange={(e) => setAddForm({ ...addForm, batch_id: e.target.value })}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="">-- Choose Target Batch --</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.batch_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Scheduled Time & Set Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600" /> Scheduled Start Time *
                    </label>
                    <input
                      type="time"
                      value={addForm.scheduled_time}
                      onChange={(e) => setAddForm({ ...addForm, scheduled_time: e.target.value })}
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Visible Duration (Set Time Window) *
                    </label>
                    <select
                      value={addForm.duration_minutes}
                      onChange={(e) => setAddForm({ ...addForm, duration_minutes: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour (60 Minutes)</option>
                      <option value={120}>2 Hours (120 Minutes)</option>
                      <option value={240}>4 Hours (Half Day)</option>
                      <option value={480}>8 Hours (Full Working Day)</option>
                      <option value={1440}>24 Hours (Full Day)</option>
                      <option value={2880}>48 Hours (2 Days)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1 bg-purple-100/70 dark:bg-purple-900/40 p-2 rounded-lg">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Will be actively displayed from <strong>{addForm.scheduled_time}</strong> on <strong>{addForm.date}</strong> for exactly <strong>{addForm.duration_minutes} minutes</strong>.
                  </span>
                </div>

                {/* Multiple Time Event / Recurring Option */}
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.is_recurring}
                      onChange={(e) => setAddForm({ ...addForm, is_recurring: e.target.checked })}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Schedule Multiple Time Event (Fixed Recurring Broadcast)
                    </span>
                  </label>

                  {addForm.is_recurring && (
                    <div className="pl-6 space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAddForm({ ...addForm, recurrence_pattern: 'DAILY' })}
                          className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                            addForm.recurrence_pattern === 'DAILY'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          Daily (Next 4 Days)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddForm({ ...addForm, recurrence_pattern: 'WEEKLY' })}
                          className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                            addForm.recurrence_pattern === 'WEEKLY'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          Weekly (Next 4 Weeks)
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Recurring events are pre-scheduled with fixed time and set duration across all occurrences.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {addForm.event_type === 'BIRTHDAY' && (
              <Input
                label="Person / Organization Name"
                placeholder="e.g. John Doe / Netlink Group"
                value={addForm.person_name}
                onChange={(e) => setAddForm({ ...addForm, person_name: e.target.value })}
              />
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                {addForm.event_type === 'BROADCAST' ? 'Broadcast Message Content / Instructions *' : 'Description'}
              </label>
              <textarea
                placeholder={addForm.event_type === 'BROADCAST' ? 'Enter detailed announcement or instructions for the students...' : 'Add celebration details, office schedule notes, or holiday greetings...'}
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                rows={3}
                required={addForm.event_type === 'BROADCAST'}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            {addForm.event_type !== 'BROADCAST' && (
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={addForm.is_off_day}
                  onChange={(e) => setAddForm({ ...addForm, is_off_day: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Mark as Non-Working / Holiday Off Day
                </span>
              </label>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                {addForm.event_type === 'BROADCAST' ? '📢 Publish Broadcast Message' : 'Save Event to Calendar'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};
