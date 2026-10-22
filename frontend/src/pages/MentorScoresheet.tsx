import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import {
  Batch, ScoreSheetRow, ScoreSheetAssessmentEntry, Assessment, AssessmentLevel
} from '../types';
import {
  Award, FileSpreadsheet, ExternalLink, Send, CheckCircle2,
  Clock, Search, Edit3, Globe, RefreshCw, Users, Sparkles
} from 'lucide-react';

export const MentorScoresheet: React.FC = () => {
  const { addToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batchAssessments, setBatchAssessments] = useState<Assessment[]>([]);
  const [scoreSheet, setScoreSheet] = useState<ScoreSheetRow[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingScoresheet, setIsLoadingScoresheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Marks Modal
  const [editingStudent, setEditingStudent] = useState<ScoreSheetRow | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string>('');
  const [editingLevelName, setEditingLevelName] = useState<string>('');
  const [marksObtained, setMarksObtained] = useState<number>(0);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [mentorFeedback, setMentorFeedback] = useState<string>('');
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Edit Project URL Modal
  const [projectUrlStudent, setProjectUrlStudent] = useState<ScoreSheetRow | null>(null);
  const [projectUrlValue, setProjectUrlValue] = useState<string>('');
  const [isSavingProjectUrl, setIsSavingProjectUrl] = useState(false);

  // Send to HR & Management Modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [managementNotes, setManagementNotes] = useState('');
  const [isSendingToManagement, setIsSendingToManagement] = useState(false);

  // Release Certificate Confirmation Modal
  const [certificateStudent, setCertificateStudent] = useState<ScoreSheetRow | null>(null);
  const [isApprovingCert, setIsApprovingCert] = useState(false);

  // Load batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setIsLoadingBatches(true);
        setError(null);
        const data = await api.get<Batch[]>('/batches');
        const list = data || [];
        setBatches(list);
        if (list.length > 0) {
          setSelectedBatchId(list[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load batches.');
      } finally {
        setIsLoadingBatches(false);
      }
    };
    fetchBatches();
  }, []);

  // Load scoresheet and batch assessments when selectedBatchId changes
  const fetchScoresheet = async (batchId: string) => {
    if (!batchId) return;
    try {
      setIsLoadingScoresheet(true);
      setError(null);
      const [matrixData, assessData] = await Promise.all([
        api.get<ScoreSheetRow[]>(`/assessments/score-sheet/matrix?batch_id=${batchId}`),
        api.get<Assessment[]>(`/assessments?batch_id=${batchId}`).catch(() => []),
      ]);
      setScoreSheet(matrixData || []);
      setBatchAssessments(assessData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch scoresheet.');
      addToast({
        type: 'error',
        title: 'Scoresheet Error',
        message: err.message || 'Unable to retrieve assessment matrix.',
      });
    } finally {
      setIsLoadingScoresheet(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchScoresheet(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Open Edit Marks Modal
  const handleOpenEditMarks = (
    student: ScoreSheetRow,
    levelName: string,
    entry: ScoreSheetAssessmentEntry | null | undefined,
    levelEnum: AssessmentLevel
  ) => {
    // Determine assessment_id
    let aId = entry?.assessment_id;
    let totalMarks = entry?.total_marks || 100;
    if (!aId) {
      const match = batchAssessments.find((a) => a.level === levelEnum);
      if (match) {
        aId = match.id;
        totalMarks = match.total_marks || 100;
      }
    }

    if (!aId) {
      addToast({
        type: 'error',
        title: 'Assessment Not Found',
        message: `No ${levelName} assessment is currently configured for this batch. Please configure it in Assessments first.`,
      });
      return;
    }

    setEditingStudent(student);
    setEditingAssessmentId(aId);
    setEditingLevelName(levelName);
    setMarksObtained(entry?.marks_obtained ?? 0);
    setMaxMarks(totalMarks);
    setMentorFeedback(entry?.feedback || '');
  };

  // Submit Updated Marks
  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingAssessmentId) return;
    try {
      setIsSavingMarks(true);
      await api.put(`/assessments/scoresheet/student/${editingStudent.student_id}/marks`, {
        assessment_id: editingAssessmentId,
        marks_obtained: marksObtained,
        feedback: mentorFeedback.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Marks Updated',
        message: `Updated ${editingLevelName} marks for ${editingStudent.student_name}.`,
      });

      setEditingStudent(null);
      fetchScoresheet(selectedBatchId);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update student assessment marks.',
      });
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Open Project URL Modal
  const handleOpenProjectUrl = (student: ScoreSheetRow) => {
    setProjectUrlStudent(student);
    setProjectUrlValue(student.project_url || '');
  };

  // Save Project URL
  const handleSaveProjectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectUrlStudent) return;
    try {
      setIsSavingProjectUrl(true);
      await api.put(`/assessments/scoresheet/student/${projectUrlStudent.student_id}`, {
        project_url: projectUrlValue.trim(),
      });

      addToast({
        type: 'success',
        title: 'Project URL Saved',
        message: `Project link updated for ${projectUrlStudent.student_name}.`,
      });

      setProjectUrlStudent(null);
      fetchScoresheet(selectedBatchId);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save student project URL.',
      });
    } finally {
      setIsSavingProjectUrl(false);
    }
  };

  // Release Certificate Approval
  const handleToggleCertificateApproval = async (student: ScoreSheetRow, approve: boolean) => {
    try {
      setIsApprovingCert(true);
      await api.put(`/assessments/scoresheet/student/${student.student_id}`, {
        certificate_approved_by_mentor: approve,
      });

      addToast({
        type: 'success',
        title: approve ? 'Certificate Approved' : 'Approval Revoked',
        message: approve
          ? `Mentor approval recorded for ${student.student_name}. HR has been notified to generate completion certificate.`
          : `Certificate release approval revoked for ${student.student_name}.`,
      });

      setCertificateStudent(null);
      fetchScoresheet(selectedBatchId);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Approval Error',
        message: err.message || 'Failed to update certificate approval.',
      });
    } finally {
      setIsApprovingCert(false);
    }
  };

  // Send Scoresheet to HR & Management
  const handleSendToManagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    try {
      setIsSendingToManagement(true);
      const res: any = await api.post(`/assessments/scoresheet/batch/${selectedBatchId}/send-to-management`, {
        mentor_notes: managementNotes.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Scoresheet Sent',
        message: res.message || 'Scoresheet dispatched to HR and Management successfully.',
      });

      setShowSendModal(false);
      setManagementNotes('');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err.message || 'Could not send scoresheet to HR and Management.',
      });
    } finally {
      setIsSendingToManagement(false);
    }
  };

  // Format date helper
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered rows
  const filteredRows = scoreSheet.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.student_name.toLowerCase().includes(q) ||
      (row.roll_number && row.roll_number.toLowerCase().includes(q))
    );
  });

  // Batch stats
  const totalStudents = scoreSheet.length;
  const approvedCount = scoreSheet.filter((s) => s.certificate_approved_by_mentor).length;
  const avgBatchScore = totalStudents > 0
    ? (scoreSheet.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalStudents).toFixed(1)
    : '0.0';

  const currentBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600 dark:text-sky-400 shrink-0" />
              Trainee Assessment Scoresheet
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Consolidated evaluation matrix with assessment timestamps, project URLs, direct marks editing, and HR certificate clearance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => selectedBatchId && fetchScoresheet(selectedBatchId)}
              disabled={isLoadingScoresheet || !selectedBatchId}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingScoresheet ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowSendModal(true)}
              disabled={scoreSheet.length === 0}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Send to HR & Managers
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Batch Selector & Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Batch Selector Card */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs md:col-span-1 flex flex-col justify-between">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                Select Training Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={isLoadingBatches || batches.length === 0}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.program ? b.program.title : 'Program'})
                  </option>
                ))}
              </select>
            </div>
            {currentBatch && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Active Batch:</span> {currentBatch.name}
              </div>
            )}
          </div>

          {/* Stat 1: Total Trainees */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Total Trainees
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                {totalStudents}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">In selected cohort</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 2: Batch Average Score */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Batch Average
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {avgBatchScore}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Across all assessment levels</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 3: Certificate Approvals */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Certificates Released
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {approvedCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ {totalStudents}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Ready for HR certificate issue</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Scoresheet Table Card */}
        <Card>
          {/* Card Filter Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Evaluation Roster & Final Clearance
              </h2>
            </div>

            <div className="flex items-center gap-2 max-w-xs w-full">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoadingScoresheet ? (
            <div className="py-12">
              <Loading message="Compiling assessment scores and timestamps..." />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
              No trainee records found for the selected batch and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Trainee</th>
                    <th className="py-3 px-3">Entry Level</th>
                    <th className="py-3 px-3">Middle Level</th>
                    <th className="py-3 px-3">Exit Level</th>
                    <th className="py-3 px-3">Total / %</th>
                    <th className="py-3 px-3">Project Link</th>
                    <th className="py-3 px-4 text-center">Certificate Clearance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-sans">
                  {filteredRows.map((student) => {
                    const entryData = student.entry_level;
                    const middleData = student.middle_level;
                    const exitData = student.exit_level;

                    return (
                      <tr
                        key={student.student_id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Student Name & Roll */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {student.student_name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {student.roll_number || 'NO ROLL'}
                          </div>
                        </td>

                        {/* Entry Level */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between gap-1.5 group">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {entryData?.marks_obtained !== null && entryData?.marks_obtained !== undefined ? `${entryData.marks_obtained} / ${entryData.total_marks}` : '—'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatDateTime(entryData?.submitted_at || entryData?.scheduled_date)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleOpenEditMarks(student, 'Entry Level', entryData, 'ENTRY_LEVEL')}
                              className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                              title="Edit Entry Level Marks"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Middle Level */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between gap-1.5 group">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {middleData?.marks_obtained !== null && middleData?.marks_obtained !== undefined ? `${middleData.marks_obtained} / ${middleData.total_marks}` : '—'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatDateTime(middleData?.submitted_at || middleData?.scheduled_date)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleOpenEditMarks(student, 'Middle Level', middleData, 'MIDDLE_LEVEL')}
                              className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                              title="Edit Middle Level Marks"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Exit Level */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between gap-1.5 group">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {exitData?.marks_obtained !== null && exitData?.marks_obtained !== undefined ? `${exitData.marks_obtained} / ${exitData.total_marks}` : '—'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {formatDateTime(exitData?.submitted_at || exitData?.scheduled_date)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleOpenEditMarks(student, 'Exit Level', exitData, 'EXIT_LEVEL')}
                              className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                              title="Edit Exit Level Marks"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Total / Overall % */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {student.total_obtained} / {student.total_max}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-black text-sky-600 dark:text-sky-400 font-mono text-[11px]">
                              {student.percentage}%
                            </span>
                            <Badge
                              variant={
                                student.final_status === 'PASSED'
                                  ? 'success'
                                  : student.final_status === 'FAILED'
                                  ? 'error'
                                  : 'neutral'
                              }
                            >
                              {student.final_status}
                            </Badge>
                          </div>
                        </td>

                        {/* Project URL */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {student.project_url ? (
                              <a
                                href={student.project_url.startsWith('http') ? student.project_url : `https://${student.project_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-500 font-semibold max-w-[130px] truncate underline"
                                title={student.project_url}
                              >
                                <Globe className="w-3 h-3 shrink-0" />
                                <span className="truncate">{student.project_url}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Not added</span>
                            )}
                            <button
                              onClick={() => handleOpenProjectUrl(student)}
                              className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors shrink-0"
                              title="Edit Project URL"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Release Certificate Button */}
                        <td className="py-3 px-4 text-center">
                          {student.certificate_approved_by_mentor ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                Approved for HR
                              </span>
                              <button
                                onClick={() => handleToggleCertificateApproval(student, false)}
                                className="text-[10px] text-slate-400 hover:text-rose-600 underline mt-1"
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setCertificateStudent(student)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] px-2.5 py-1 flex items-center gap-1 mx-auto shadow-xs"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Release Certificate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal 1: Edit Assessment Marks */}
        <Modal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title={`Edit ${editingLevelName} Marks`}
        >
          {editingStudent && (
            <form onSubmit={handleSaveMarks} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {editingStudent.student_name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Roll: {editingStudent.roll_number || 'N/A'} • Batch: {editingStudent.batch_name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Marks Obtained *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxMarks}
                    step="0.5"
                    required
                    value={marksObtained}
                    onChange={(e) => setMarksObtained(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Marks (Configured)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={maxMarks}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mentor Remarks / Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide constructive assessment evaluation notes..."
                  value={mentorFeedback}
                  onChange={(e) => setMentorFeedback(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingMarks}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                >
                  {isSavingMarks ? 'Saving Marks...' : 'Save Marks'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal 2: Edit Project URL */}
        <Modal
          isOpen={!!projectUrlStudent}
          onClose={() => setProjectUrlStudent(null)}
          title="Update Capstone / Project URL"
        >
          {projectUrlStudent && (
            <form onSubmit={handleSaveProjectUrl} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {projectUrlStudent.student_name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Attach or update live project deployment, GitHub repository, or presentation slide link.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project URL *
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/org/project-repo"
                    value={projectUrlValue}
                    onChange={(e) => setProjectUrlValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setProjectUrlStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingProjectUrl}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                >
                  {isSavingProjectUrl ? 'Saving Link...' : 'Save Project Link'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal 3: Release Certificate Confirmation */}
        <Modal
          isOpen={!!certificateStudent}
          onClose={() => setCertificateStudent(null)}
          title="Approve & Release Certificate Clearance"
        >
          {certificateStudent && (
            <div className="space-y-4 text-xs font-sans">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-start gap-3">
                <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {certificateStudent.student_name}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    By approving certificate release, you certify that this student has satisfied all technical assessment criteria, submitted their project requirements, and is eligible for the official <strong>Certificate of Training Completion</strong>.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
                    Cumulative Score: {certificateStudent.percentage}% ({certificateStudent.total_obtained}/{certificateStudent.total_max})
                  </div>
                </div>
              </div>

              <p className="text-slate-500 dark:text-slate-400">
                Once approved, HR will receive an automated clearance alert to generate the certificate and dispatch it to the trainee.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCertificateStudent(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isApprovingCert}
                  onClick={() => handleToggleCertificateApproval(certificateStudent, true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  {isApprovingCert ? 'Recording Approval...' : 'Confirm Release Certificate'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal 4: Send to HR & Managers */}
        <Modal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          title="Send Scoresheet to HR & Management"
        >
          <form onSubmit={handleSendToManagement} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Official Scoresheet Dispatch
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Batch: <span className="font-semibold">{currentBatch?.name}</span> • Trainees: <span className="font-semibold">{totalStudents}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mentor Notes / Handover Remarks (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="e.g., Assessment evaluations and project reviews completed for all trainees. Ready for management audit and certificate generation."
                value={managementNotes}
                onChange={(e) => setManagementNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              An immutable dispatch record will be submitted to the HR desk and leadership dashboard with the current evaluation snapshot.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowSendModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSendingToManagement}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingToManagement ? 'Dispatching...' : 'Dispatch to HR & Managers'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};
