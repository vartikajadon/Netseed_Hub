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
import { StudentAttendanceCalendarModal } from '../components/StudentAttendanceCalendarModal';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { Student, Program, Batch, User, PaginatedStudentList, formatBatchType, BATCH_TYPE_OPTIONS } from '../types';
import { Users, UserPlus, Search, Filter, Eye, Edit, UserCheck, RefreshCw, Trash2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HRStudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 10;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedBatchType, setSelectedBatchType] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [assigningMentorStudent, setAssigningMentorStudent] = useState<Student | null>(null);
  const [changingStatusStudent, setChangingStatusStudent] = useState<Student | null>(null);
  const [viewingCalendarStudent, setViewingCalendarStudent] = useState<Student | null>(null);
  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchFilters = async () => {
    try {
      const [progs, bts, usrs] = await Promise.all([
        api.get<Program[]>('/programs'),
        api.get<Batch[]>('/batches'),
        api.get<User[]>('/users'),
      ]);
      setPrograms(progs);
      setBatches(bts);
      setMentors(usrs.filter((u) => u.role === 'MENTOR'));
    } catch {
      // Ignore filter load failure
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.append('search', search.trim());
      if (selectedProgram) queryParams.append('program_id', selectedProgram);
      if (selectedBatchType) queryParams.append('batch_type', selectedBatchType);
      if (selectedMentor) queryParams.append('mentor_id', selectedMentor);
      if (selectedStatus) queryParams.append('status', selectedStatus);
      queryParams.append('skip', skip.toString());
      queryParams.append('limit', limit.toString());

      const res = await api.get<PaginatedStudentList>(`/students?${queryParams.toString()}`);
      setStudents(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, selectedProgram, selectedBatchType, selectedMentor, selectedStatus, skip]);

  const handleRemoveStudent = async () => {
    if (!removingStudent) return;
    try {
      setIsRemoving(true);
      setDeleteError(null);
      await api.delete(`/students/${removingStudent.id}`);
      setRemovingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove student.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedProgram('');
    setSelectedBatchType('');
    setSelectedMentor('');
    setSelectedStatus('');
    setSkip(0);
  };

  const columns: Column<Student>[] = [
    {
      header: 'Roll Number',
      accessor: (s) => (
        <div>
          <span className="font-bold text-indigo-600 dark:text-indigo-300 font-mono block text-xs">{s.roll_number}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">ID: {s.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      header: 'Student Name',
      accessor: (s) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{s.user?.full_name || 'N/A'}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{s.user?.email || 'N/A'}</div>
          {s.domicile && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Domicile: {s.domicile}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Program & Batch',
      accessor: (s) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{s.program?.title || s.program_id || 'Unassigned'}</div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{s.batch?.name || s.batch_id || 'No Batch'}</div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatBatchType(s.batch_type)}
          </div>
        </div>
      ),
    },
    {
      header: 'Fees & Payment',
      accessor: (s) => (
        <div>
          <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
            ₹{s.total_fees ? s.total_fees.toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {s.installment_type === 'TWO_INSTALLMENTS' ? '2 Installments' : 'One Time'} • {s.payment_mode || 'ONLINE'}
          </div>
        </div>
      ),
    },
    {
      header: 'Lead Mentor',
      accessor: (s) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {s.mentor?.full_name || (s.mentor_id ? 'Mentor Assigned' : 'Unassigned')}
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
              : s.enrollment_status === 'DROPPED' || s.enrollment_status === 'TERMINATED'
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
          <Link to={`/hr/students/${s.id}`} title="View Full Profile">
            <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-2xs hover:scale-105 active:scale-95 transition-all">
              <Eye className="w-3.5 h-3.5" />
            </span>
          </Link>
          <button
            type="button"
            title="View Monthly Attendance Calendar"
            onClick={() => setViewingCalendarStudent(s)}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-2xs hover:scale-105 active:scale-95 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Edit Details"
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
            title="Change Enrollment Status"
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Student Roster & Lifecycle Management
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Register trainees, assign mentors, manage status, and query enrolled student profiles.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingStudent(null);
              setIsFormOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Student
          </Button>
        </div>

        {/* Filter Panel */}
        <Card title="Roster Search & Filters" subtitle="Server-side Multi-Field Filter Query">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              {/* Search input */}
              <div className="md:col-span-2">
                <Input
                  label="Search Student"
                  placeholder="Search by Roll Number, Name, Email, College..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Program filter */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 text-xs">Program</label>
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Programs</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Type filter */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 text-xs">Batch Type</label>
                <select
                  value={selectedBatchType}
                  onChange={(e) => {
                    setSelectedBatchType(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Batch Types</option>
                  <option value="TECH_MASTER">Tech Master</option>
                  <option value="SHORT_DURATION">Short Duration</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 text-xs">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ENROLLED">ENROLLED</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>
            </div>

            {(search || selectedProgram || selectedBatchType || selectedMentor || selectedStatus) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400">Active Query Filter Applied</span>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Roster Table */}
        {isLoading && <Loading message="Querying student database..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && !error && (
          <Card title={`Student Roster (${total} total records)`} subtitle="Page-based paginated results">
            <Table columns={columns} data={students} keyExtractor={(s) => s.id} emptyMessage="No student records match your query." />

            {/* Pagination Controls */}
            {total > limit && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Showing {skip + 1}–{Math.min(skip + limit, total)} of {total} records
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    disabled={skip === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSkip(skip + limit)}
                    disabled={skip + limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Modals */}
        <StudentForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchStudents}
          initialData={editingStudent}
        />

        <MentorSelectorModal
          isOpen={!!assigningMentorStudent}
          onClose={() => setAssigningMentorStudent(null)}
          onSuccess={fetchStudents}
          student={assigningMentorStudent}
        />

        <StatusChangeModal
          isOpen={!!changingStatusStudent}
          onClose={() => setChangingStatusStudent(null)}
          onSuccess={fetchStudents}
          student={changingStatusStudent}
        />

        <StudentAttendanceCalendarModal
          isOpen={!!viewingCalendarStudent}
          onClose={() => setViewingCalendarStudent(null)}
          student={viewingCalendarStudent}
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
