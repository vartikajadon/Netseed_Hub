import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { Student, AttendanceDailyRecord, CalendarEvent } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Palmtree,
  PartyPopper,
  Sparkles,
  Building,
  Info,
  CalendarDays,
  Send,
  AlertCircle
} from 'lucide-react';
import { Loading } from './Loading';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { parseUtcDate, getStandardNow, getStandardDateString } from '../lib/dateUtils';

interface StudentAttendanceCalendarProps {
  student: Student | null;
  studentId?: string;
  studentName?: string;
  onRegularize?: (date: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(isoString?: string | null): string {
  if (!isoString) return '';
  const date = parseUtcDate(isoString);
  if (!date || isNaN(date.getTime())) return '';
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export const StudentAttendanceCalendar: React.FC<StudentAttendanceCalendarProps> = ({
  student,
  studentId,
  studentName,
  onRegularize,
}) => {
  const effectiveStudentId = student?.id || studentId;
  const displayName = student?.user?.full_name || studentName || student?.roll_number || 'Student';
  const rollNumber = student?.roll_number;

  const today = getStandardNow();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  const [records, setRecords] = useState<Record<string, AttendanceDailyRecord>>({});
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Day Modal
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const fetchCalendarAndAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // 1. Fetch attendance records
      const attendancePromise = effectiveStudentId
        ? api.get<AttendanceDailyRecord[]>(
            `/attendance/student/${effectiveStudentId}/records?start_date=${startDate}&end_date=${endDate}`
          ).catch(() => [])
        : api.get<AttendanceDailyRecord[]>('/attendance/my-records').catch(() => []);

      // 2. Fetch official calendar events
      const eventsPromise = api.get<CalendarEvent[]>('/calendar/events').catch(() => []);

      const [recList, evList] = await Promise.all([attendancePromise, eventsPromise]);

      const todayStr = getStandardDateString(getStandardNow());
      const recMap: Record<string, AttendanceDailyRecord> = {};
      (recList || []).forEach((r) => {
        // Never show or store ABSENT for any future date
        if (r.date > todayStr && r.status === 'ABSENT') {
          return;
        }
        recMap[r.date] = r;
      });
      setRecords(recMap);

      // Exclude birthdays per requirement: "dont include the birthdays here"
      const nonBirthdayEvents = (evList || []).filter((e) => e.event_type !== 'BIRTHDAY');
      setCalendarEvents(nonBirthdayEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance calendar.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarAndAttendance();
  }, [effectiveStudentId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDayDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDayDate(null);
  };

  const handleTodayJump = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDayDate(null);
  };

  // Map events to dateString for instant O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of calendarEvents) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [calendarEvents]);

  // Calendar Grid Days Calculation (Same standard 7-col grid starting on Sunday)
  const calendarGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      dateString: string;
      isToday: boolean;
      isWeekend: boolean; // Saturdays and Sundays
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
  }, [currentYear, currentMonth, today]);

  // Monthly stats calculations
  const monthRecordsList = Object.values(records);
  const presentCount = monthRecordsList.filter((r) => r.status === 'PRESENT' || r.status === 'REGULARIZED').length;
  const incompleteCount = monthRecordsList.filter((r) => r.status === 'INCOMPLETE').length;
  const totalWorkingHours = monthRecordsList.reduce((acc, r) => acc + (Number(r.total_working_hours) || 0), 0);

  // Selected Day Details Modal Data
  const selectedDayData = useMemo(() => {
    if (!selectedDayDate) return null;
    const dateObj = new Date(selectedDayDate);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayEvents = eventsByDate.get(selectedDayDate) || [];
    const record = records[selectedDayDate] || null;
    const hasOffDay = isWeekend || dayEvents.some((e) => e.is_off_day || e.event_type === 'OFF_DAY');

    return {
      date: selectedDayDate,
      isWeekend,
      dayEvents,
      record,
      hasOffDay,
    };
  }, [selectedDayDate, eventsByDate, records]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xs font-sans space-y-4 sm:space-y-5">
      {/* 1. Header Navigation Bar (Matches CalendarPage.tsx layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-2">
        {/* Left: Month Navigator & Title */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTodayJump}
              className="px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </div>
        </div>

        {/* Right: Legend Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-bold text-[11px]">
            <PartyPopper className="w-3.5 h-3.5 text-indigo-500" />
            Festivals
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-[11px]">
            <Palmtree className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Weekends (Sat/Sun) & Holidays
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Present
          </span>
        </div>
      </div>

      {/* Institutional Schedule Banner: Saturdays and Sundays are Off (Neutral Professional Gray) */}
      <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <Palmtree className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>
            <strong className="text-slate-900 dark:text-slate-100">Institutional Schedule:</strong> Saturdays and Sundays are regular weekly off days (marked in gray). Working attendance schedule applies Monday through Friday.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase shrink-0 border border-slate-300/60 dark:border-slate-700">
          Weekly Off
        </span>
      </div>

      {isLoading && <Loading message="Loading monthly attendance calendar and events..." />}
      {error && (
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main Calendar View */}
      {!isLoading && (
        <div className="space-y-2">
          {/* Day Names Header Row: Sun and Sat in subtle professional gray */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1">
            {DAY_NAMES.map((name, i) => {
              const isWeekend = i === 0 || i === 6;
              return (
                <div
                  key={name}
                  className={`text-center py-2 text-xs uppercase tracking-wider rounded-xl ${
                    isWeekend
                      ? 'text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/50 font-bold border border-slate-200/50 dark:border-slate-800/50'
                      : 'text-slate-700 dark:text-slate-300 font-black'
                  }`}
                >
                  <span>{name}</span>
                  {isWeekend && (
                    <span className="block text-[9px] font-semibold text-slate-400 dark:text-slate-500 lowercase tracking-normal">
                      (weekend)
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 7-Column Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarGridDays.map((slot, index) => {
              const dayEvents = eventsByDate.get(slot.dateString) || [];
              const hasOffDayEvent = dayEvents.some((e) => e.is_off_day || e.event_type === 'OFF_DAY');
              const festivals = dayEvents.filter((e) => e.event_type === 'FESTIVAL');
              const orgEvents = dayEvents.filter((e) => e.title.toLowerCase().includes('netlink'));
              const record = slot.dateString ? records[slot.dateString] : null;

              const todayStr = getStandardDateString(today);
              const isFutureDate = slot.dateString > todayStr;

              // Saturdays & Sundays are institutional off days for everyone
              const isWeekendOff = slot.isWeekend;
              const isOffDay = isWeekendOff || hasOffDayEvent;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (slot.isCurrentMonth && slot.dateString) {
                      setSelectedDayDate(slot.dateString);
                    }
                  }}
                  className={`min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    slot.isToday
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30'
                      : slot.isCurrentMonth
                      ? isWeekendOff
                        ? 'border-slate-200/70 dark:border-slate-800/60 bg-slate-100/60 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        : hasOffDayEvent
                        ? 'border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700'
                      : 'border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-950/10 opacity-35'
                  }`}
                >
                  {/* Top: Day Number & Status Badges */}
                  <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                    <span
                      className={`text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 ${
                        slot.isToday
                          ? 'bg-indigo-600 text-white font-bold'
                          : isWeekendOff
                          ? 'text-slate-500 dark:text-slate-400 font-bold'
                          : hasOffDayEvent
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                          : slot.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {slot.dayNumber}
                    </span>

                    {/* Status indicator on Mobile (compact dot) */}
                    <div className="flex sm:hidden items-center gap-0.5">
                      {isWeekendOff ? (
                        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" title="Weekend Off" />
                      ) : hasOffDayEvent ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-500" title="Holiday" />
                      ) : isFutureDate ? null : record ? (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            record.status === 'PRESENT' || record.status === 'REGULARIZED'
                              ? 'bg-emerald-500'
                              : record.status === 'INCOMPLETE'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          title={record.status}
                        />
                      ) : null}
                    </div>

                    {/* Status Pills on Tablet & Desktop */}
                    <div className="hidden sm:block">
                      {isWeekendOff ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 uppercase tracking-tight shrink-0">
                          Weekend
                        </span>
                      ) : hasOffDayEvent ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-tight shrink-0">
                          Holiday
                        </span>
                      ) : isFutureDate ? null : record ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight shrink-0 ${
                            record.status === 'PRESENT' || record.status === 'REGULARIZED'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : record.status === 'INCOMPLETE'
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {record.status === 'REGULARIZED' ? 'REG' : record.status}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Mobile Indicator Dots for Festivals/Punches */}
                  <div className="flex sm:hidden items-center justify-center gap-1 my-0.5">
                    {festivals.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Festival" />
                    )}
                    {orgEvents.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Event" />
                    )}
                    {record?.first_punch_in && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Punched" />
                    )}
                  </div>

                  {/* Middle: Festivals, Off Days & Punches (Desktop / Tablet) */}
                  <div className="hidden sm:block space-y-1 my-1 overflow-hidden">
                    {/* Festivals Chips */}
                    {festivals.slice(0, 1).map((ev) => (
                      <div
                        key={ev.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border border-indigo-400/30 font-bold text-[10px] truncate w-full"
                        title={ev.title}
                      >
                        <PartyPopper className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}

                    {/* Declared Off-Day Chips */}
                    {!isWeekendOff && hasOffDayEvent && dayEvents.filter((e) => e.is_off_day || e.event_type === 'OFF_DAY').slice(0, 1).map((ev) => (
                      <div
                        key={ev.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-800 dark:text-rose-200 border border-rose-400/30 font-bold text-[10px] truncate w-full"
                        title={ev.title}
                      >
                        <Palmtree className="w-3 h-3 text-rose-600 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}

                    {/* Netlink Organization Milestone Chip */}
                    {orgEvents.slice(0, 1).map((ev) => (
                      <div
                        key={ev.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/30 font-bold text-[10px] truncate w-full"
                        title={ev.title}
                      >
                        <Building className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}

                    {/* Institutional Weekend Off Notice */}
                    {isWeekendOff && (
                      <div className="text-[10px] font-semibold text-rose-700/90 dark:text-rose-400/90 flex items-center gap-1">
                        <Palmtree className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>Weekend Off</span>
                      </div>
                    )}

                    {/* Attendance Punch Timings (Working Days) */}
                    {!isWeekendOff && !isFutureDate && record && (
                      <div className="space-y-0.5 pt-0.5">
                        {record.first_punch_in && (
                          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>IN {formatTime(record.first_punch_in)}</span>
                          </div>
                        )}
                        {record.last_punch_out && (
                          <div className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>OUT {formatTime(record.last_punch_out)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Working Hours or Availability Status */}
                  <div className="text-[9px] pt-0.5 sm:pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    {isWeekendOff ? (
                      <span className="text-slate-400 dark:text-slate-500 italic truncate text-[8px] sm:text-[9px]">
                        <span className="sm:inline hidden">Closed (No Attendance)</span>
                        <span className="sm:hidden inline">Off</span>
                      </span>
                    ) : hasOffDayEvent ? (
                      <span className="text-rose-500 font-medium truncate text-[8px] sm:text-[9px]">Holiday</span>
                    ) : isFutureDate ? (
                      <span className="text-slate-400 italic">—</span>
                    ) : record?.total_working_hours ? (
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[8px] sm:text-[9px]">
                        {record.total_working_hours}h
                      </span>
                    ) : slot.isCurrentMonth && slot.dateString < todayStr ? (
                      <span className="text-slate-400 italic text-[8px] sm:text-[9px]">
                        <span className="hidden sm:inline">Unrecorded</span>
                        <span className="sm:hidden inline">—</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}

                    <span className="hidden sm:inline text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      View →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly Attendance Metrics & Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-3">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                <strong>Attendance Roster:</strong> {displayName} {rollNumber ? `• (${rollNumber})` : ''}
              </span>
            </div>

            <div className="flex items-center gap-4 font-bold text-xs flex-wrap">
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Present: <span className="font-mono text-sm">{presentCount}</span> days
              </span>
              {incompleteCount > 0 && (
                <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Incomplete: <span className="font-mono text-sm">{incompleteCount}</span> days
                </span>
              )}
              <span className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Logged Hours: <span className="font-mono text-sm">{totalWorkingHours.toFixed(1)}</span> hrs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Details Modal (Matches CalendarPage.tsx modal experience) */}
      <Modal
        isOpen={!!selectedDayDate}
        onClose={() => setSelectedDayDate(null)}
        title={selectedDayDate ? `Attendance & Schedule: ${selectedDayDate}` : 'Day Details'}
      >
        {selectedDayData && (
          <div className="space-y-4 text-xs font-sans">
            {/* Header Date Tag */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {selectedDayData.date === getStandardDateString(today) && (
                <Badge variant="info">Today</Badge>
              )}
            </div>

            {/* If Weekend: Institutional Off Day Notice */}
            {selectedDayData.isWeekend && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-start gap-3">
                <Palmtree className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100">
                    Institutional Weekend Off (Saturday / Sunday)
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    In our institutions, all Saturdays and Sundays are off for everyone. The campus and biometric punch systems are unavailable for marking attendance on weekends.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-100 font-bold text-[11px] mt-2">
                    <XCircle className="w-3.5 h-3.5" />
                    Attendance Marking Unavailable
                  </div>
                </div>
              </div>
            )}

            {/* Festivals and Calendar Events on this Day */}
            {selectedDayData.dayEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Calendar Events & Festivals
                </h4>
                <div className="space-y-2">
                  {selectedDayData.dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {ev.event_type === 'FESTIVAL' ? (
                            <PartyPopper className="w-4 h-4 text-indigo-500" />
                          ) : ev.is_off_day ? (
                            <Palmtree className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Building className="w-4 h-4 text-amber-500" />
                          )}
                          {ev.title}
                        </span>
                        <Badge variant={ev.is_off_day ? 'error' : 'info'}>
                          {ev.is_off_day ? 'Official Off Day' : ev.event_type}
                        </Badge>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Working Day Attendance Punch Status */}
            {!selectedDayData.isWeekend && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Attendance Punch Records
                </h4>

                {selectedDayData.date > getStandardDateString(today) ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      This is an upcoming working day. Attendance has not been recorded yet.
                    </p>
                  </div>
                ) : selectedDayData.record ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        Attendance Status:
                      </span>
                      <Badge
                        variant={
                          selectedDayData.record.status === 'PRESENT' || selectedDayData.record.status === 'REGULARIZED'
                            ? 'success'
                            : selectedDayData.record.status === 'INCOMPLETE'
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {selectedDayData.record.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block mb-0.5">First Punch IN</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {selectedDayData.record.first_punch_in ? formatTime(selectedDayData.record.first_punch_in) : '—'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block mb-0.5">Last Punch OUT</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {selectedDayData.record.last_punch_out ? formatTime(selectedDayData.record.last_punch_out) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Working Duration:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                        {selectedDayData.record.total_working_hours} hrs
                      </span>
                    </div>

                    {selectedDayData.record.is_regularized && (
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-700 dark:text-indigo-300 text-[11px] font-medium">
                        ✓ Attendance regularized and approved by HR.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      No biometric attendance punch was recorded for this past working day.
                    </p>

                    {/* Regularize action for past working days */}
                    {selectedDayData.date < getStandardDateString(today) && onRegularize && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const target = selectedDayData.date;
                          setSelectedDayDate(null);
                          onRegularize(target);
                        }}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        Request Attendance Regularization
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer close button */}
            <div className="pt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setSelectedDayDate(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
