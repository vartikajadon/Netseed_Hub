import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { MentorFeedbackModal } from '../components/MentorFeedbackModal';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import { Student, Batch, PaginatedStudentList, MentorFeedbackItem } from '../types';
import {
  Users, Search, MessageSquare, PlusCircle, Star, Filter, RefreshCw, FileText, Award, CheckCircle2
} from 'lucide-react';

export const MentorStudentsPage: React.FC = () => {
  const { addToast } = useNotifications();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingCertId, setUpdatingCertId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DEFAULTERS' | 'DROPOUTS'>('ALL');

  // Modal
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [stdRes, batchData, feedbackData] = await Promise.all([
        api.get<PaginatedStudentList | Student[]>('/students'),
        api.get<Batch[]>('/batches'),
        api.get<MentorFeedbackItem[]>('/feedbacks').catch(() => []),
      ]);

      const studentList = Array.isArray(stdRes) ? stdRes : stdRes.items || [];
      setStudents(studentList);
      setBatches(batchData);
      setFeedbacks(feedbackData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned students.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenFeedback = (studentId?: string) => {
    setSelectedStudentForFeedback(studentId);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmitted = (newFeedback: MentorFeedbackItem) => {
    setFeedbacks((prev) => [newFeedback, ...prev]);
  };

  const handleToggleCertificate = async (student: Student, approve: boolean) => {
    try {
      setUpdatingCertId(student.id);
      await api.put(`/students/${student.id}/release-certificate`, { approve });
      addToast({
        type: 'success',
        title: approve ? 'Certificate Released' : 'Release Revoked',
        message: approve
          ? `Certificate release approved for ${student.user?.full_name || student.roll_number}. HR has been unlocked to generate and issue the certificate.`
          : `Certificate release approval revoked for ${student.user?.full_name || student.roll_number}.`,
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, certificate_approved_by_mentor: approve } : s
        )
      );
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Certification Error',
        message: err.message || 'Failed to update certificate approval status.',
      });
    } finally {
      setUpdatingCertId(null);
    }
  };

  const studentFeedbackMap = useMemo(() => {
    const map: Record<string, { latestRating: number; latestComment: string }> = {};
    feedbacks.forEach((fb) => {
      if (!map[fb.student_id]) {
        map[fb.student_id] = {
          latestRating: Number(fb.average_rating),
          latestComment: fb.comment,
        };
      }
    });
    return map;
  }, [feedbacks]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = (s.user?.full_name || '').toLowerCase();
      const roll = (s.roll_number || '').toLowerCase();
      const email = (s.user?.email || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || roll.includes(q) || email.includes(q);
      const matchesBatch = batchFilter === 'ALL' || s.batch_id === batchFilter;

      const ratingInfo = studentFeedbackMap[s.id];
      const isDefaulter = ratingInfo && ratingInfo.latestRating < 2.0;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && (s.enrollment_status === 'ACTIVE' || s.enrollment_status === 'ENROLLED')) ||
        (statusFilter === 'DROPOUTS' && (s.enrollment_status === 'DROPOUT' || s.enrollment_status === 'DROPPED')) ||
        (statusFilter === 'DEFAULTERS' && isDefaulter);

      return matchesSearch && matchesBatch && matchesStatus;
    });
  }, [students, searchQuery, batchFilter, statusFilter, studentFeedbackMap]);

  const columns: Column<Student>[] = [
    {
      header: 'Roll Number',
      accessor: (item) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
          {item.roll_number}
        </span>
      ),
    },
    {
      header: 'Student Name',
      accessor: (item) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{item.user?.full_name || 'N/A'}</div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">{item.user?.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Program & Batch',
      accessor: (item) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {item.program?.title || item.program_id || 'Unassigned'}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
            {item.batch?.name || item.batch_id || 'No Batch'}
          </div>
        </div>
      ),
    },
    {
      header: 'Passout Year',
      accessor: (item) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.passout_year || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (item) => {
        const isDropout = item.enrollment_status === 'DROPOUT' || item.enrollment_status === 'DROPPED';
        return (
          <div>
            <Badge
              variant={
                item.enrollment_status === 'ACTIVE'
                  ? 'success'
                  : isDropout
                  ? 'error'
                  : 'neutral'
              }
            >
              {item.enrollment_status}
            </Badge>
            {isDropout && item.dropout_reason && (
              <div
                className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 max-w-[180px] truncate italic"
                title={item.dropout_reason}
              >
                "{item.dropout_reason}"
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Rating',
      accessor: (item) => {
        const info = studentFeedbackMap[item.id];
        if (!info) {
          return (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic">
              Not evaluated
            </span>
          );
        }
        const isDefaulter = info.latestRating < 2.0;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                isDefaulter
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <Star
                className={`w-3 h-3 ${
                  isDefaulter ? 'fill-rose-500 text-rose-500' : 'fill-amber-500 text-amber-500'
                }`}
              />
              {info.latestRating.toFixed(1)}
            </span>
            {isDefaulter && (
              <Badge variant="error" className="text-[9px] uppercase tracking-wider font-black">
                Defaulter
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Certificate Release',
      accessor: (item) => (
        <div className="flex items-center gap-1.5">
          {item.certificate_approved_by_mentor ? (
            <div className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Released
              </span>
              <button
                type="button"
                onClick={() => handleToggleCertificate(item, false)}
                disabled={updatingCertId === item.id}
                className="text-[10px] text-slate-400 hover:text-rose-600 underline font-medium"
              >
                Revoke
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleCertificate(item, true)}
              isLoading={updatingCertId === item.id}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs px-2.5 py-1"
            >
              <Award className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Release Certificate
            </Button>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex items-center gap-1.5">
          {item.cv_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (item.cv_url) {
                  const win = window.open();
                  if (win) {
                    win.document.write(
                      `<iframe src="${item.cv_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                    );
                    win.document.title = `${item.user?.full_name || item.roll_number}_CV`;
                  } else {
                    window.open(item.cv_url, '_blank');
                  }
                }
              }}
              title="View Trainee Resume"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:border-indigo-500"
            >
              <FileText className="w-3 h-3 mr-1" />
              CV
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenFeedback(item.id)}
            className="text-xs font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <MessageSquare className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
            Feedback
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Assigned Students Roster
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Browse, filter, and evaluate all trainees assigned to your cohorts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchData} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenFeedback()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Give Feedback
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Filter controls */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Trainees</option>
              <option value="DROPOUTS">Dropout Students</option>
              <option value="DEFAULTERS">Defaulters (&lt; 2.0)</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        {isLoading ? (
          <Loading message="Loading student roster..." />
        ) : (
          <Card>
            <Table
              columns={columns}
              data={filteredStudents}
              keyExtractor={(s) => s.id}
              emptyMessage="No students match the selected filter criteria."
            />
          </Card>
        )}

        {/* Feedback Modal */}
        <MentorFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          students={students}
          preselectedStudentId={selectedStudentForFeedback}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      </div>
    </Layout>
  );
};
