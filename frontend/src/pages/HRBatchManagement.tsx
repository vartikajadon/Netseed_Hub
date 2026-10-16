import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { StudentForm } from '../components/StudentForm';
import { MentorSelectorModal } from '../components/MentorSelectorModal';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { Student, Program, Batch, User, PaginatedStudentList, formatBatchType } from '../types';
import {
  Layers, UserPlus, Search, Filter, Eye, Edit, UserCheck, RefreshCw,
  Clock, BookOpen, Sparkles, CheckCircle2, GraduationCap, DollarSign,
  Trash2, Plus, Calendar, Award, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HRBatchManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'BATCHES'>('ROSTER');

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedBatchType, setSelectedBatchType] = useState<'ALL' | 'TECH_MASTER' | 'SHORT_DURATION' | 'INTERNSHIP'>('ALL');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [assigningMentorStudent, setAssigningMentorStudent] = useState<Student | null>(null);
  const [changingStatusStudent, setChangingStatusStudent] = useState<Student | null>(null);
  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Create Batch Modal State
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [newBatchProgramId, setNewBatchProgramId] = useState('');
  const [newBatchType, setNewBatchType] = useState<'TECH_MASTER' | 'SHORT_DURATION' | 'INTERNSHIP'>('TECH_MASTER');
  const [newBatchStartDate, setNewBatchStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBatchMentorId, setNewBatchMentorId] = useState('');
  const [customBatchName, setCustomBatchName] = useState('');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [createBatchError, setCreateBatchError] = useState<string | null>(null);

  const fetchBatchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [studentsRes, progsRes, batchesRes, usersRes] = await Promise.all([
        api.get<PaginatedStudentList>('/students?limit=200'),
        api.get<Program[]>('/programs'),
        api.get<Batch[]>('/batches'),
        api.get<User[]>('/users'),
      ]);

      setStudents(studentsRes.items || []);
      setPrograms(progsRes || []);
      setBatches(batchesRes || []);
      setMentors((usersRes || []).filter((u) => u.role === 'MENTOR'));

      if (progsRes && progsRes.length > 0 && !newBatchProgramId) {
        setNewBatchProgramId(progsRes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch batch & student roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchData();
  }, []);

  const handleRemoveStudent = async () => {
    if (!removingStudent) return;
    try {
      setIsRemoving(true);
      setDeleteError(null);
      await api.delete(`/students/${removingStudent.id}`);
      setRemovingStudent(null);
      fetchBatchData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove student.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Smart Batch Name Generation based on course type, date, and year
  const getSmartBatchName = (type: string, dateStr: string, existingList: Batch[]) => {
    const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    const sameYearAndType = existingList.filter((b) => {
      const bYear = b.start_date ? new Date(b.start_date).getFullYear() : year;
      return bYear === year && b.batch_type === type;
    });
    const count = sameYearAndType.length;

    if (type === 'TECH_MASTER') {
      const code = count === 0 ? 'A' : `A${count + 1}`;
      return `Batch ${year}-${code} (Tech Masters)`;
    } else if (type === 'SHORT_DURATION') {
      const code = `B${count + 1}`;
      return `Batch ${year}-${code} (Short Duration Course)`;
    } else {
      const code = count === 0 ? 'C' : `C${count + 1}`;
      return `Batch ${year}-${code} (Internship)`;
    }
  };

  // Smart Duration Info
  const getCourseDurationInfo = (type: string) => {
    if (type === 'TECH_MASTER') {
      return { training: 6, internship: 6, totalMonths: 12, label: '6m Training + 6m Internship (12 Months Total)' };
    } else if (type === 'SHORT_DURATION') {
      return { training: 3, internship: 3, totalMonths: 6, label: '3m Training + 3m Internship (6 Months Total)' };
    } else {
      return { training: 1, internship: 3, totalMonths: 4, label: '1m Training + 3m Internship (4 Months Total)' };
    }
  };

  // Auto-calculated End Date
  const calculateSmartEndDate = (startDateStr: string, totalMonths: number) => {
    if (!startDateStr) return '';
    const d = new Date(startDateStr);
    d.setMonth(d.getMonth() + totalMonths);
    return d.toISOString().slice(0, 10);
  };

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchProgramId) {
      setCreateBatchError('Please select a training program.');
      return;
    }

    try {
      setIsCreatingBatch(true);
      setCreateBatchError(null);

      const durationInfo = getCourseDurationInfo(newBatchType);
      const computedName = customBatchName.trim() || getSmartBatchName(newBatchType, newBatchStartDate, batches);
      const computedEndDate = calculateSmartEndDate(newBatchStartDate, durationInfo.totalMonths);

      const payload = {
        program_id: newBatchProgramId,
        name: computedName,
        batch_type: newBatchType,
        training_duration_months: durationInfo.training,
        internship_duration_months: durationInfo.internship,
        start_date: newBatchStartDate,
        end_date: computedEndDate,
        mentor_id: newBatchMentorId || null,
        status: 'ACTIVE',
      };

      await api.post('/batches', payload);
      setIsCreateBatchModalOpen(false);
      setCustomBatchName('');
      fetchBatchData();
    } catch (err: any) {
      setCreateBatchError(err.message || 'Failed to create new batch.');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // Extract unique available years across batches
  const availableYears = Array.from(
    new Set(
      batches
        .map((b) => (b.start_date ? new Date(b.start_date).getFullYear().toString() : '2026'))
        .filter(Boolean)
    )
  ).sort();

  // Filter students
  const filteredStudents = students.filter((s) => {
    // 1. Batch Type Filter
    if (selectedBatchType !== 'ALL') {
      const sBatchType = (s.batch_type || s.batch?.batch_type || 'TECH_MASTER').toUpperCase();
      if (selectedBatchType === 'SHORT_DURATION') {
        if (sBatchType !== 'SHORT_DURATION' && sBatchType !== 'SIX_MONTHS') return false;
      } else {
        if (sBatchType !== selectedBatchType) return false;
      }
    }

    // 2. Program Filter
    if (selectedProgramId && s.program_id !== selectedProgramId) {
      return false;
    }

    // 3. Batch Filter
    if (selectedBatchId && s.batch_id !== selectedBatchId) {
      return false;
    }

    // 4. Year Filter
    if (selectedYear !== 'ALL') {
      const b = batches.find((item) => item.id === s.batch_id);
      const bYear = b?.start_date ? new Date(b.start_date).getFullYear().toString() : '2026';
      if (bYear !== selectedYear) return false;
    }

    // 5. Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchRoll = s.roll_number.toLowerCase().includes(q);
      const matchName = (s.user?.full_name || '').toLowerCase().includes(q);
      const matchEmail = (s.user?.email || '').toLowerCase().includes(q);
      const matchProg = (s.program?.title || s.program_id || '').toLowerCase().includes(q);
      const matchBatch = (s.batch?.name || s.batch_id || '').toLowerCase().includes(q);
      return matchRoll || matchName || matchEmail || matchProg || matchBatch;
    }

    return true;
  });

  // Filter batches for the Batches tab
  const filteredBatches = batches.filter((b) => {
    if (selectedBatchType !== 'ALL' && b.batch_type !== selectedBatchType) {
      return false;
    }
    if (selectedProgramId && b.program_id !== selectedProgramId) {
      return false;
    }
    if (selectedYear !== 'ALL') {
      const bYear = b.start_date ? new Date(b.start_date).getFullYear().toString() : '2026';
      if (bYear !== selectedYear) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || (b.id && b.id.toLowerCase().includes(q));
    }
    return true;
  });

  // Statistics
  const techMasterCount = students.filter(
    (s) => (s.batch_type || s.batch?.batch_type || 'TECH_MASTER').toUpperCase() === 'TECH_MASTER'
  ).length;

  const shortDurationCount = students.filter((s) => {
    const bt = (s.batch_type || s.batch?.batch_type || '').toUpperCase();
    return bt === 'SHORT_DURATION' || bt === 'SIX_MONTHS';
  }).length;

  const internshipCount = students.filter(
    (s) => (s.batch_type || s.batch?.batch_type || '').toUpperCase() === 'INTERNSHIP'
  ).length;

  const columns: Column<Student>[] = [
    {
      header: 'Roll Number',
      accessor: (s) => (
        <div>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono block text-xs">{s.roll_number}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">ID: {s.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      header: 'Student Name & Contact',
      accessor: (s) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{s.user?.full_name || 'N/A'}</div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">{s.user?.email || 'N/A'}</div>
          {s.domicile && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Domicile: {s.domicile}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Program Name',
      accessor: (s) => (
        <div>
          <div className="font-semibold text-indigo-600 dark:text-indigo-300 text-xs flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {s.program?.title || programs.find((p) => p.id === s.program_id)?.title || 'General Program'}
          </div>
          {s.program?.code && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Code: {s.program.code}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Batch & Smart Course Structure',
      accessor: (s) => {
        const rawType = (s.batch_type || s.batch?.batch_type || 'TECH_MASTER').toUpperCase();
        const type = rawType === 'SIX_MONTHS' ? 'SHORT_DURATION' : rawType;
        const isTechMaster = type === 'TECH_MASTER';
        const isShortDuration = type === 'SHORT_DURATION';
        const isInternship = type === 'INTERNSHIP';
        return (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {s.batch?.name || s.batch_id || 'Batch 2026'}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                  isTechMaster
                    ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/40'
                    : isShortDuration
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                    : 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/40'
                }`}
              >
                {isTechMaster
                  ? 'Tech Masters'
                  : isShortDuration
                  ? 'Short Duration Course'
                  : 'Internship'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {isTechMaster
                ? '6m Training + 6m Internship (12 Months)'
                : isShortDuration
                ? '3m Training + 3m Internship (6 Months)'
                : '1m Training + 3m Internship (4 Months)'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Fees & Installments',
      accessor: (s) => (
        <div>
          <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            ₹{s.total_fees ? s.total_fees.toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
            {s.installment_type === 'TWO_INSTALLMENTS' ? '2 Time Installments (50%/50%)' : 'One Time Payment'}
          </div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">{s.payment_mode || 'ONLINE'}</div>
        </div>
      ),
    },
    {
      header: 'Lead Mentor',
      accessor: (s) => (
        <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          {s.mentor?.full_name || mentors.find((m) => m.id === s.mentor_id)?.full_name || 'Assigned Mentor'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => (
        <Badge
          variant={
            s.enrollment_status === 'ACTIVE'
              ? 'success'
              : s.enrollment_status === 'COMPLETED'
              ? 'info'
              : s.enrollment_status === 'DROPPED'
              ? 'error'
              : 'warning'
          }
        >
          {s.enrollment_status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (s) => (
        <div className="flex items-center gap-1.5">
          <Link to={`/hr/students/${s.id}`} title="View Full Student Profile">
            <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-2xs hover:scale-105 active:scale-95 transition-all">
              <Eye className="w-3.5 h-3.5" />
            </span>
          </Link>
          <button
            type="button"
            title="Edit Trainee Details"
            onClick={() => {
              setEditingStudent(s);
              setIsFormOpen(true);
            }}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white shadow-2xs hover:scale-105 active:scale-95 transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Assign Mentor"
            onClick={() => setAssigningMentorStudent(s)}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-2xs hover:scale-105 active:scale-95 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Change Status"
            onClick={() => setChangingStatusStudent(s)}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs hover:scale-105 active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Remove Student"
            onClick={() => {
              setDeleteError(null);
              setRemovingStudent(s);
            }}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-2xs hover:scale-105 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header with Action Button */}
        <div className="bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Program Batches & Enrolled Roster
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Manage smart batches (Tech Masters, Short Duration Course, Internship) with automated year-based naming codes and curriculum tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateBatchModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Smart Batch
            </Button>
          </div>
        </div>

        {/* Top Summary Banner: Batch Types Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tech Masters Summary Card */}
          <div
            onClick={() => {
              setSelectedBatchType(selectedBatchType === 'TECH_MASTER' ? 'ALL' : 'TECH_MASTER');
            }}
            className={`cursor-pointer p-5 rounded-2xl border transition-all shadow-sm ${
              selectedBatchType === 'TECH_MASTER'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <Badge variant="info">Tech Masters</Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tech Masters</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                6m Training + 6m Internship (1 Year)
              </p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{techMasterCount}</span>
                <span className="text-xs text-indigo-700 dark:text-indigo-400 font-bold">Enrolled Trainees</span>
              </div>
            </div>
          </div>

          {/* Short Duration Course Summary Card */}
          <div
            onClick={() => {
              setSelectedBatchType(selectedBatchType === 'SHORT_DURATION' ? 'ALL' : 'SHORT_DURATION');
            }}
            className={`cursor-pointer p-5 rounded-2xl border transition-all shadow-sm ${
              selectedBatchType === 'SHORT_DURATION'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500 ring-2 ring-emerald-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <Badge variant="success">Short Duration</Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Short Duration Course</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                3m Training + 3m Internship (6 Months)
              </p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{shortDurationCount}</span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">Enrolled Trainees</span>
              </div>
            </div>
          </div>

          {/* Internship Summary Card */}
          <div
            onClick={() => {
              setSelectedBatchType(selectedBatchType === 'INTERNSHIP' ? 'ALL' : 'INTERNSHIP');
            }}
            className={`cursor-pointer p-5 rounded-2xl border transition-all shadow-sm ${
              selectedBatchType === 'INTERNSHIP'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-500 ring-2 ring-purple-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <Badge variant="info">Internship</Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Internship</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                1m Training + 3m Internship (4 Months)
              </p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-300">{internshipCount}</span>
                <span className="text-xs text-purple-700 dark:text-purple-400 font-bold">Enrolled Trainees</span>
              </div>
            </div>
          </div>

          {/* Total Batches & Programs Summary */}
          <div
            onClick={() => {
              setSelectedBatchType('ALL');
              setSelectedProgramId('');
              setSelectedYear('ALL');
            }}
            className={`cursor-pointer p-5 rounded-2xl border transition-all shadow-sm ${
              selectedBatchType === 'ALL' && !selectedProgramId && selectedYear === 'ALL'
                ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 ring-2 ring-slate-400/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <Badge variant="neutral">{batches.length} Active Batches</Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">All Trainees</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                {programs.length} Curricula Options
              </p>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{students.length}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Total Students</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher: Enrolled Trainees vs Active Batches */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'ROSTER'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Enrolled Students Roster ({filteredStudents.length})
            </button>
            <button
              onClick={() => setActiveTab('BATCHES')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'BATCHES'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Active Batches & Cohorts ({filteredBatches.length})
            </button>
          </div>
        </div>

        {/* Smart Filter Controls Bar */}
        <Card title="Smart Batch & Program Roster Filters" subtitle="Filter by Course Structure, Program Curriculum, Calendar Year, or Search">
          <div className="space-y-4">
            {/* Batch Type Tab Buttons */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
              <button
                onClick={() => setSelectedBatchType('ALL')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs ${
                  selectedBatchType === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All Courses ({students.length})
              </button>
              <button
                onClick={() => setSelectedBatchType('TECH_MASTER')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                  selectedBatchType === 'TECH_MASTER'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Tech Masters (6m+6m) ({techMasterCount})
              </button>
              <button
                onClick={() => setSelectedBatchType('SHORT_DURATION')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                  selectedBatchType === 'SHORT_DURATION'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                Short Duration Course (3m+3m) ({shortDurationCount})
              </button>
              <button
                onClick={() => setSelectedBatchType('INTERNSHIP')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
                  selectedBatchType === 'INTERNSHIP'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                Internship (1m+3m) ({internshipCount})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search student, roll number, batch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-colors"
                />
              </div>

              {/* Program Name Filter */}
              <div>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">All 3 Programs (FSD, AI/ML, BA)</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="ALL">All Batch Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr} Batches
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Filter */}
              <div>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">All Specific Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(search || selectedProgramId || selectedBatchId || selectedYear !== 'ALL' || selectedBatchType !== 'ALL') && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span>
                  Showing {activeTab === 'ROSTER' ? filteredStudents.length : filteredBatches.length} items matching filter
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setSelectedProgramId('');
                    setSelectedBatchId('');
                    setSelectedYear('ALL');
                    setSelectedBatchType('ALL');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Content Section: Batches Tab vs Roster Tab */}
        {isLoading && <Loading message="Loading batch roster..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && !error && activeTab === 'BATCHES' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatches.map((batch) => {
                const enrolled = students.filter((s) => s.batch_id === batch.id).length;
                const prog = programs.find((p) => p.id === batch.program_id);
                const mentor = mentors.find((m) => m.id === batch.mentor_id);
                const isTechMaster = batch.batch_type === 'TECH_MASTER';
                const isShortDuration = batch.batch_type === 'SHORT_DURATION';

                return (
                  <div
                    key={batch.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {batch.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-3 h-3" />
                            {prog?.title || 'Program Track'}
                          </span>
                        </div>
                        <Badge variant="success">{batch.status || 'ACTIVE'}</Badge>
                      </div>

                      <div className="mt-3.5 space-y-2 text-xs">
                        {/* Course breakdown pill */}
                        <div
                          className={`p-2 rounded-xl text-xs font-semibold border ${
                            isTechMaster
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : isShortDuration
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          }`}
                        >
                          <span className="block font-bold">
                            {isTechMaster
                              ? 'Tech Masters'
                              : isShortDuration
                              ? 'Short Duration Course'
                              : 'Internship'}
                          </span>
                          <span className="text-[11px] font-normal opacity-90">
                            {isTechMaster
                              ? '6m Training + 6m Internship (12 Months)'
                              : isShortDuration
                              ? '3m Training + 3m Internship (6 Months)'
                              : '1m Training + 3m Internship (4 Months)'}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Trainees Enrolled</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 font-mono">
                              <UserCheck className="w-3 h-3 text-indigo-500" />
                              {enrolled} Students
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Lead Mentor</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                              {mentor?.full_name || 'Assigned Mentor'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {batch.start_date} ~ {batch.end_date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">ID: {batch.id}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setActiveTab('ROSTER');
                        }}
                        className="text-xs font-semibold flex items-center gap-1"
                      >
                        View Students
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === 'ROSTER' && (
          <Card
            title={`Registered Students (${filteredStudents.length} trainees)`}
            subtitle={
              selectedBatchType === 'TECH_MASTER'
                ? 'Showing Tech Masters Students (1 Year: 6 Months Training + 6 Months Internship)'
                : selectedBatchType === 'SHORT_DURATION'
                ? 'Showing Short Duration Course Students (6 Months: 3 Months Training + 3 Months Internship)'
                : selectedBatchType === 'INTERNSHIP'
                ? 'Showing Internship Trainees (4 Months: 1 Month Training + 3 Months Internship)'
                : 'Showing All Registered Batch Students with Program Tracks'
            }
          >
            <Table
              columns={columns}
              data={filteredStudents}
              keyExtractor={(s) => s.id}
              emptyMessage="No students found matching your selected filters."
            />
          </Card>
        )}

        {/* Modal: Create Smart Batch */}
        <Modal
          isOpen={isCreateBatchModalOpen}
          onClose={() => setIsCreateBatchModalOpen(false)}
          title="Create New Smart Cohort Batch"
        >
          <form onSubmit={handleCreateBatchSubmit} className="space-y-4 text-xs font-sans">
            {createBatchError && <ErrorMessage message={createBatchError} />}

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-300">
              <span className="font-bold block">Smart Batch Naming & Structure:</span>
              <p className="mt-1 leading-relaxed">
                Select the training curriculum, course structure, and start date. The platform automatically assigns the smart batch code and calendar year identifier.
              </p>
            </div>

            {/* Select Curriculum Program */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Program Curriculum <span className="text-rose-500">*</span>
              </label>
              <select
                value={newBatchProgramId}
                onChange={(e) => setNewBatchProgramId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Course Type / Batch Structure */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Course Structure & Duration <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewBatchType('TECH_MASTER')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newBatchType === 'TECH_MASTER'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">Tech Masters</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    6m Training + 6m Internship (12m)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBatchType('SHORT_DURATION')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newBatchType === 'SHORT_DURATION'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">Short Duration Course</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    3m Training + 3m Internship (6m)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewBatchType('INTERNSHIP')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newBatchType === 'INTERNSHIP'
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">Internship</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    1m Training + 3m Internship (4m)
                  </span>
                </button>
              </div>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={newBatchStartDate}
                  onChange={(e) => setNewBatchStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Auto-Calculated End Date
                </label>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center justify-between">
                  <span>{calculateSmartEndDate(newBatchStartDate, getCourseDurationInfo(newBatchType).totalMonths)}</span>
                  <span className="text-[10px] text-slate-500 font-sans">
                    ({getCourseDurationInfo(newBatchType).totalMonths} Months)
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Generated Name Preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Smart Assigned Batch Name:</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                {customBatchName.trim() || getSmartBatchName(newBatchType, newBatchStartDate, batches)}
              </span>
            </div>

            {/* Optional Custom Override */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Custom Name Override (Optional)
              </label>
              <Input
                placeholder="Leave blank to use smart generated batch name"
                value={customBatchName}
                onChange={(e) => setCustomBatchName(e.target.value)}
              />
            </div>

            {/* Lead Mentor Selection */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Lead Mentor (Optional)
              </label>
              <select
                value={newBatchMentorId}
                onChange={(e) => setNewBatchMentorId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Lead Mentor</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsCreateBatchModalOpen(false)}
                disabled={isCreatingBatch}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isCreatingBatch}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Batch
              </Button>
            </div>
          </form>
        </Modal>

        {/* Existing Modals */}
        <StudentForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchBatchData}
          initialData={editingStudent}
        />

        <MentorSelectorModal
          isOpen={!!assigningMentorStudent}
          onClose={() => setAssigningMentorStudent(null)}
          onSuccess={fetchBatchData}
          student={assigningMentorStudent}
        />

        <StatusChangeModal
          isOpen={!!changingStatusStudent}
          onClose={() => setChangingStatusStudent(null)}
          onSuccess={fetchBatchData}
          student={changingStatusStudent}
        />

        {/* Remove Student Confirmation Modal */}
        <Modal
          isOpen={!!removingStudent}
          onClose={() => {
            if (!isRemoving) {
              setRemovingStudent(null);
              setDeleteError(null);
            }
          }}
          title="Confirm Student Removal"
        >
          <div className="space-y-4 text-xs font-sans">
            {deleteError && <ErrorMessage message={deleteError} />}
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove student{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                "{removingStudent?.user?.full_name || removingStudent?.roll_number}"
              </strong>{' '}
              (Roll: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{removingStudent?.roll_number}</span>)?
            </p>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl leading-relaxed">
              Warning: This will permanently delete the student's enrollment profile, biometric face templates, device registrations, and attendance logs.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRemovingStudent(null);
                  setDeleteError(null);
                }}
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRemoveStudent}
                isLoading={isRemoving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Yes, Remove Student
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
