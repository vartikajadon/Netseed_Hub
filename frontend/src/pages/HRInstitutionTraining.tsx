import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, Column } from '../components/Table';
import { api } from '../api/client';
import {
  InstitutionTraining,
  InstitutionStudent,
  InstitutionTrainingCreatePayload,
  InstitutionStudentCreatePayload,
} from '../types';
import {
  Building2,
  Users,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  BookOpen,
  GraduationCap,
  Download,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Upload
} from 'lucide-react';

interface StudentDraftRow {
  student_name: string;
  student_roll_no: string;
  email: string;
  contact_no: string;
  course: string;
  branch: string;
  training: string;
  cost_per_batch: string;
}

export const HRInstitutionTraining: React.FC = () => {
  const [trainings, setTrainings] = useState<InstitutionTraining[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null);

  // Create Training Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    institution_name: string;
    training_title: string;
    batch_name: string;
    start_date: string;
    end_date: string;
    cost_per_batch: string;
    trainer_name: string;
    description: string;
  }>({
    institution_name: '',
    training_title: '',
    batch_name: '',
    start_date: '',
    end_date: '',
    cost_per_batch: '',
    trainer_name: '',
    description: '',
  });

  const [draftStudents, setDraftStudents] = useState<StudentDraftRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Single Add Student to Existing Training Modal
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [targetTraining, setTargetTraining] = useState<InstitutionTraining | null>(null);
  const [newStudentForm, setNewStudentForm] = useState<StudentDraftRow>({
    student_name: '',
    student_roll_no: '',
    email: '',
    contact_no: '',
    course: 'B.Tech',
    branch: 'CSE',
    training: '',
    cost_per_batch: '',
  });

  // Edit Student Modal State
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<InstitutionStudent | null>(null);

  // CSV Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetTraining, setImportTargetTraining] = useState<InstitutionTraining | null>(null);
  const [parsedImportStudents, setParsedImportStudents] = useState<InstitutionStudentCreatePayload[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const parseStudentsCSV = (csvText: string, defaultTraining = '', defaultCost = 0): InstitutionStudentCreatePayload[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const getIndex = (aliases: string[]) => rawHeaders.findIndex((h) => aliases.some((a) => h.includes(a)));

    const nameIdx = getIndex(['student name', 'name', 'student_name', 'full_name']);
    const rollIdx = getIndex(['roll', 'roll_no', 'student_roll_no', 'roll number', 'id']);
    const emailIdx = getIndex(['email', 'mail']);
    const contactIdx = getIndex(['contact', 'phone', 'mobile', 'contact_no']);
    const courseIdx = getIndex(['course', 'degree', 'program']);
    const branchIdx = getIndex(['branch', 'dept', 'department']);
    const trainingIdx = getIndex(['training', 'batch']);
    const costIdx = getIndex(['cost', 'fee', 'amount']);

    const students: InstitutionStudentCreatePayload[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || cols.every((c) => c === '')) continue;

      const name = nameIdx !== -1 ? cols[nameIdx] : cols[0];
      const roll = rollIdx !== -1 ? cols[rollIdx] : cols[1];

      if (!name || !roll) continue;

      students.push({
        student_name: name,
        student_roll_no: roll,
        email: emailIdx !== -1 ? cols[emailIdx] : undefined,
        contact_no: contactIdx !== -1 ? cols[contactIdx] : undefined,
        course: courseIdx !== -1 ? cols[courseIdx] || 'B.Tech' : 'B.Tech',
        branch: branchIdx !== -1 ? cols[branchIdx] || 'CSE' : 'CSE',
        training: trainingIdx !== -1 && cols[trainingIdx] ? cols[trainingIdx] : defaultTraining,
        cost_per_batch: costIdx !== -1 && parseFloat(cols[costIdx]) ? parseFloat(cols[costIdx]) : defaultCost,
      });
    }
    return students;
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>, defaultTraining = '', defaultCost = 0) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = (evt.target?.result as string) || '';
        const parsed = parseStudentsCSV(text, defaultTraining, defaultCost);
        if (parsed.length === 0) {
          setImportError('No valid student rows found. File must contain headers with Student Name and Roll No.');
          return;
        }
        setParsedImportStudents(parsed);
      } catch (err: any) {
        setImportError(err.message || 'Failed to read CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importTargetTraining || parsedImportStudents.length === 0) return;

    setIsImporting(true);
    setImportError(null);
    try {
      await api.post(`/institution-trainings/${importTargetTraining.id}/bulk-students`, parsedImportStudents);
      setIsImportModalOpen(false);
      setParsedImportStudents([]);
      setImportFileName('');
      await fetchTrainings();
    } catch (err: any) {
      setImportError(err.message || 'Failed to import student roster.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const headers = 'Student Name,Student Roll No,Email,Contact No,Course,Branch,Training,Cost Per Batch\n';
    const sample = 'Aarav Sharma,NL-2026-001,aarav.s@example.com,9876543210,B.Tech,CSE,Full-Stack Training,5000\nAnanya Patel,NL-2026-002,ananya.p@example.com,9876543211,B.Tech,IT,Full-Stack Training,5000\nRohit Verma,NL-2026-003,rohit.v@example.com,9876543212,MCA,Cloud & DevOps,5000\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'institution_students_import_template.csv';
    link.click();
  };

  const fetchTrainings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<InstitutionTraining[]>('/institution-trainings');
      setTrainings(res || []);
      if (res && res.length > 0 && !expandedTrainingId) {
        setExpandedTrainingId(res[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load institution trainings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleAddDraftStudentRow = () => {
    setDraftStudents((prev) => [
      ...prev,
      {
        student_name: '',
        student_roll_no: '',
        email: '',
        contact_no: '',
        course: 'B.Tech',
        branch: 'CSE',
        training: createForm.training_title || '',
        cost_per_batch: createForm.cost_per_batch || '',
      },
    ]);
  };

  const handleRemoveDraftStudentRow = (idx: number) => {
    setDraftStudents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDraftStudentChange = (idx: number, field: keyof StudentDraftRow, val: string) => {
    setDraftStudents((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const handleCreateTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.institution_name.trim() || !createForm.training_title.trim() || !createForm.batch_name.trim()) {
      setFormError('Institution Name, Training Title, and Batch Name are mandatory.');
      return;
    }

    const costVal = parseFloat(createForm.cost_per_batch) || 0.0;

    // Validate students rows
    const studentsPayload: InstitutionStudentCreatePayload[] = [];
    for (const [index, s] of draftStudents.entries()) {
      if (!s.student_name.trim() || !s.student_roll_no.trim()) {
        setFormError(`Student row #${index + 1} requires both Student Name and Roll Number.`);
        return;
      }
      studentsPayload.push({
        student_name: s.student_name.trim(),
        student_roll_no: s.student_roll_no.trim(),
        email: s.email.trim() || undefined,
        contact_no: s.contact_no.trim() || undefined,
        course: s.course.trim() || undefined,
        branch: s.branch.trim() || undefined,
        training: s.training.trim() || createForm.training_title.trim(),
        cost_per_batch: s.cost_per_batch ? parseFloat(s.cost_per_batch) : costVal,
      });
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: InstitutionTrainingCreatePayload = {
        institution_name: createForm.institution_name.trim(),
        training_title: createForm.training_title.trim(),
        batch_name: createForm.batch_name.trim(),
        start_date: createForm.start_date || undefined,
        end_date: createForm.end_date || undefined,
        cost_per_batch: costVal,
        trainer_name: createForm.trainer_name.trim() || undefined,
        description: createForm.description.trim() || undefined,
        students: studentsPayload,
      };

      await api.post('/institution-trainings', payload);
      setIsCreateModalOpen(false);
      // Reset form
      setCreateForm({
        institution_name: '',
        training_title: '',
        batch_name: '',
        start_date: '',
        end_date: '',
        cost_per_batch: '',
        trainer_name: '',
        description: '',
      });
      setDraftStudents([]);
      await fetchTrainings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create institution training.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTraining) return;
    if (!newStudentForm.student_name.trim() || !newStudentForm.student_roll_no.trim()) {
      setFormError('Student Name and Student Roll No are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: InstitutionStudentCreatePayload = {
        student_name: newStudentForm.student_name.trim(),
        student_roll_no: newStudentForm.student_roll_no.trim(),
        email: newStudentForm.email.trim() || undefined,
        contact_no: newStudentForm.contact_no.trim() || undefined,
        course: newStudentForm.course.trim() || undefined,
        branch: newStudentForm.branch.trim() || undefined,
        training: newStudentForm.training.trim() || targetTraining.training_title,
        cost_per_batch: newStudentForm.cost_per_batch
          ? parseFloat(newStudentForm.cost_per_batch)
          : targetTraining.cost_per_batch,
      };

      await api.post(`/institution-trainings/${targetTraining.id}/students`, payload);
      setIsAddStudentModalOpen(false);
      setNewStudentForm({
        student_name: '',
        student_roll_no: '',
        email: '',
        contact_no: '',
        course: 'B.Tech',
        branch: 'CSE',
        training: '',
        cost_per_batch: '',
      });
      await fetchTrainings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add student to training.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (trainingId: string, studentId: string) => {
    if (!window.confirm('Are you sure you want to remove this student record from the institution training?')) {
      return;
    }
    try {
      await api.delete(`/institution-trainings/${trainingId}/students/${studentId}`);
      await fetchTrainings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete student.');
    }
  };

  const handleDeleteTraining = async (trainingId: string) => {
    if (!window.confirm('Are you sure you want to delete this Institution Training and all its enrolled student records? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/institution-trainings/${trainingId}`);
      await fetchTrainings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete institution training.');
    }
  };

  const handleExportStudentsCSV = (training: InstitutionTraining) => {
    if (!training.students || training.students.length === 0) {
      alert('No students to export.');
      return;
    }
    const headers = [
      'Student Name',
      'Roll Number',
      'Email ID',
      'Contact No',
      'Course',
      'Branch',
      'Training',
      'Cost in Value per Batch',
      'Notes'
    ];
    const rows = training.students.map((s) => [
      `"${s.student_name}"`,
      `"${s.student_roll_no}"`,
      `"${s.email || ''}"`,
      `"${s.contact_no || ''}"`,
      `"${s.course || ''}"`,
      `"${s.branch || ''}"`,
      `"${s.training || ''}"`,
      `"${s.cost_per_batch ?? training.cost_per_batch}"`,
      `"${s.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${training.institution_name}_${training.batch_name}_students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter trainings
  const filteredTrainings = trainings.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.institution_name.toLowerCase().includes(q) ||
      t.training_title.toLowerCase().includes(q) ||
      t.batch_name.toLowerCase().includes(q) ||
      (t.trainer_name && t.trainer_name.toLowerCase().includes(q))
    );
  });

  // Analytics Metrics
  const totalInstitutions = new Set(trainings.map((t) => t.institution_name)).size;
  const totalStudentsEnrolled = trainings.reduce((acc, t) => acc + (t.student_count || 0), 0);
  const totalCostValue = trainings.reduce((acc, t) => acc + (t.cost_per_batch || 0), 0);

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white p-6 rounded-2xl shadow-md border border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Institution Training Management</h1>
                <p className="text-xs text-sky-100 font-medium mt-0.5">
                  HR Portal to create university & college customized batches and manage institutional student rosters.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="white"
            size="lg"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 self-start md:self-auto shrink-0 shadow-lg text-indigo-700 font-bold hover:bg-indigo-50"
          >
            <Plus className="w-5 h-5 stroke-[2.5] text-indigo-700" />
            <span className="text-indigo-700 font-bold">Create Institution Training</span>
          </Button>
        </div>

        {/* Analytics Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Institutions</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalInstitutions}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Batches</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{trainings.length}</div>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Students Enrolled</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalStudentsEnrolled}</div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Batch Value</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                ₹{totalCostValue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by institution, batch, or training..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold self-end sm:self-auto">
            Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredTrainings.length}</strong> trainings
          </span>
        </div>

        {isLoading && <Loading message="Loading institution trainings and student rosters..." />}
        {error && <ErrorMessage message={error} />}

        {/* Trainings List Accordion */}
        {!isLoading && filteredTrainings.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Institution Trainings Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Create a training batch for an external college or institution to manage and store students data.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3 font-bold shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Create First Institution Training
            </Button>
          </div>
        )}

        {!isLoading && filteredTrainings.length > 0 && (
          <div className="space-y-4">
            {filteredTrainings.map((training) => {
              const isExpanded = expandedTrainingId === training.id;

              return (
                <div
                  key={training.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-all"
                >
                  {/* Card Header / Summary Bar */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          {training.institution_name}
                        </span>
                        <Badge variant="info">Batch: {training.batch_name}</Badge>
                        <Badge variant={training.status === 'ACTIVE' ? 'success' : 'neutral'}>
                          {training.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2 flex-wrap">
                        <span className="text-indigo-600 dark:text-indigo-300 font-bold">{training.training_title}</span>
                        {training.trainer_name && (
                          <span className="text-slate-500 dark:text-slate-400">
                            • Trainer: <strong className="text-slate-700 dark:text-slate-300">{training.trainer_name}</strong>
                          </span>
                        )}
                        {training.start_date && (
                          <span className="text-slate-500 dark:text-slate-400">
                            • Duration: {training.start_date} {training.end_date ? `to ${training.end_date}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-600/30 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Cost: ₹{Number(training.cost_per_batch).toLocaleString('en-IN')} / batch</span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetTraining(training);
                          setNewStudentForm({
                            student_name: '',
                            student_roll_no: '',
                            email: '',
                            contact_no: '',
                            course: 'B.Tech',
                            branch: 'CSE',
                            training: training.training_title,
                            cost_per_batch: String(training.cost_per_batch),
                          });
                          setIsAddStudentModalOpen(true);
                        }}
                        className="bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Add Student</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImportTargetTraining(training);
                          setParsedImportStudents([]);
                          setImportFileName('');
                          setImportError(null);
                          setIsImportModalOpen(true);
                        }}
                        className="bg-emerald-50/80 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800/80 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Import CSV</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportStudentsCSV(training)}
                        className="bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs"
                        title="Export students CSV"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600 dark:text-slate-300" />
                        <span>CSV Export</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTraining(training.id)}
                        className="bg-rose-50/80 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/60 shadow-xs"
                        title="Delete Training"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      </Button>

                      <button
                        onClick={() => setExpandedTrainingId(isExpanded ? null : training.id)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        title={isExpanded ? 'Collapse Student Roster' : 'View Student Roster'}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Student Roster Table */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Enrolled Students Roster ({training.students.length} students)
                          </h4>
                        </div>
                      </div>

                      {training.students.length === 0 ? (
                        <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            No students registered for this institution training yet.
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-3">
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs font-bold shadow-xs"
                              onClick={() => {
                                setTargetTraining(training);
                                setIsAddStudentModalOpen(true);
                              }}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                              Add First Student
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-bold shadow-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100"
                              onClick={() => {
                                setImportTargetTraining(training);
                                setParsedImportStudents([]);
                                setImportFileName('');
                                setImportError(null);
                                setIsImportModalOpen(true);
                              }}
                            >
                              <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                              Import CSV
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="p-3">Student Name</th>
                                <th className="p-3">Student Roll No</th>
                                <th className="p-3">Email ID</th>
                                <th className="p-3">Contact No</th>
                                <th className="p-3">Course</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3">Training</th>
                                <th className="p-3">Cost Value / Batch</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {training.students.map((st) => (
                                <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                                    {st.student_name}
                                  </td>
                                  <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                    {st.student_roll_no}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                                    {st.email || '—'}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">
                                    {st.contact_no || '—'}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                                    {st.course || '—'}
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-300">
                                    {st.branch || '—'}
                                  </td>
                                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                    {st.training || training.training_title}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                                    ₹{Number(st.cost_per_batch ?? training.cost_per_batch).toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleDeleteStudent(training.id, st.id)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-2xs hover:scale-105 transition-all"
                                      title="Remove Student"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal 1: Create Institution Training */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Institution Training Batch"
        >
          <form onSubmit={handleCreateTrainingSubmit} className="space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto pr-1">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {formError}
              </div>
            )}

            {/* Institution & Training Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Institution / College Name *"
                placeholder="e.g. LNCT Bhopal / UIT RGPV"
                value={createForm.institution_name}
                onChange={(e) => setCreateForm({ ...createForm, institution_name: e.target.value })}
                required
              />

              <Input
                label="Training Topic / Title *"
                placeholder="e.g. Cloud Computing & DevOps Masterclass"
                value={createForm.training_title}
                onChange={(e) => setCreateForm({ ...createForm, training_title: e.target.value })}
                required
              />

              <Input
                label="Batch Name / Code *"
                placeholder="e.g. LNCT-2026-B1"
                value={createForm.batch_name}
                onChange={(e) => setCreateForm({ ...createForm, batch_name: e.target.value })}
                required
              />

              <Input
                label="Cost in Value Per Batch (₹) *"
                type="number"
                placeholder="e.g. 150000"
                value={createForm.cost_per_batch}
                onChange={(e) => setCreateForm({ ...createForm, cost_per_batch: e.target.value })}
                required
              />

              <Input
                label="Start Date"
                type="date"
                value={createForm.start_date}
                onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
              />

              <Input
                label="End Date"
                type="date"
                value={createForm.end_date}
                onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
              />

              <Input
                label="Trainer / Mentor Assigned"
                placeholder="e.g. Alex Rivera"
                value={createForm.trainer_name}
                onChange={(e) => setCreateForm({ ...createForm, trainer_name: e.target.value })}
              />

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Batch Status</label>
                <select
                  value="ACTIVE"
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300"
                >
                  <option value="ACTIVE">ACTIVE</option>
                </select>
              </div>
            </div>

            {/* Students Data Entry Table */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Enrolled Students Information
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add students data (Student Name, Roll No, Email, Contact No, Course, Branch, Training, Cost per batch).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors">
                    <Upload className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const text = (evt.target?.result as string) || '';
                          const parsed = parseStudentsCSV(text, createForm.training_title, parseFloat(createForm.cost_per_batch) || 0);
                          if (parsed.length > 0) {
                            setDraftStudents((prev) => [
                              ...prev,
                              ...parsed.map((p) => ({
                                student_name: p.student_name,
                                student_roll_no: p.student_roll_no,
                                email: p.email || '',
                                contact_no: p.contact_no || '',
                                course: p.course || 'B.Tech',
                                branch: p.branch || 'CSE',
                                training: p.training || createForm.training_title,
                                cost_per_batch: p.cost_per_batch ? String(p.cost_per_batch) : createForm.cost_per_batch,
                              })),
                            ]);
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleTemplate}
                    className="text-xs"
                    title="Download Sample CSV Template"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddDraftStudentRow}
                    className="text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Student Row
                  </Button>
                </div>
              </div>

              {draftStudents.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No initial student rows added. Click "+ Add Student Row" above or add students later after creating the batch.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {draftStudents.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          Student #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftStudentRow(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Student Name *"
                          value={row.student_name}
                          onChange={(e) => handleDraftStudentChange(idx, 'student_name', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Student Roll No *"
                          value={row.student_roll_no}
                          onChange={(e) => handleDraftStudentChange(idx, 'student_roll_no', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          required
                        />
                        <input
                          type="email"
                          placeholder="Email ID"
                          value={row.email}
                          onChange={(e) => handleDraftStudentChange(idx, 'email', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Contact No."
                          value={row.contact_no}
                          onChange={(e) => handleDraftStudentChange(idx, 'contact_no', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Course (e.g. B.Tech)"
                          value={row.course}
                          onChange={(e) => handleDraftStudentChange(idx, 'course', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Branch (e.g. CSE)"
                          value={row.branch}
                          onChange={(e) => handleDraftStudentChange(idx, 'branch', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Training Title"
                          value={row.training}
                          onChange={(e) => handleDraftStudentChange(idx, 'training', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Cost per batch (₹)"
                          value={row.cost_per_batch}
                          onChange={(e) => handleDraftStudentChange(idx, 'cost_per_batch', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                Save Institution Training & Students
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: Add Student to Existing Training */}
        <Modal
          isOpen={isAddStudentModalOpen}
          onClose={() => setIsAddStudentModalOpen(false)}
          title={`Add Student to ${targetTraining?.institution_name || 'Institution Training'}`}
        >
          <form onSubmit={handleAddSingleStudent} className="space-y-3 text-xs font-sans">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {formError}
              </div>
            )}

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                Batch: {targetTraining?.batch_name} ({targetTraining?.training_title})
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Default Batch Cost: ₹{targetTraining?.cost_per_batch?.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Student Name *"
                placeholder="e.g. Rahul Sharma"
                value={newStudentForm.student_name}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, student_name: e.target.value })}
                required
              />

              <Input
                label="Student Roll No *"
                placeholder="e.g. 0103CS221045"
                value={newStudentForm.student_roll_no}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, student_roll_no: e.target.value })}
                required
              />

              <Input
                label="Email ID"
                type="email"
                placeholder="e.g. student@college.edu"
                value={newStudentForm.email}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
              />

              <Input
                label="Contact Number"
                placeholder="e.g. +91 9876543210"
                value={newStudentForm.contact_no}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, contact_no: e.target.value })}
              />

              <Input
                label="Course"
                placeholder="e.g. B.Tech / MCA / BCA"
                value={newStudentForm.course}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, course: e.target.value })}
              />

              <Input
                label="Branch"
                placeholder="e.g. CSE / IT / AI-DS"
                value={newStudentForm.branch}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, branch: e.target.value })}
              />

              <Input
                label="Training Topic / Title"
                placeholder={targetTraining?.training_title}
                value={newStudentForm.training}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, training: e.target.value })}
              />

              <Input
                label="Cost in Value per Batch (₹)"
                type="number"
                placeholder={String(targetTraining?.cost_per_batch || '')}
                value={newStudentForm.cost_per_batch}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, cost_per_batch: e.target.value })}
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddStudentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                Save Student Record
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 3: Import CSV Students Roster to Institution Training */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setParsedImportStudents([]);
            setImportFileName('');
            setImportError(null);
          }}
          title={`Import Students CSV — ${importTargetTraining?.institution_name || 'Institution Training'}`}
        >
          <div className="space-y-4 text-xs font-sans">
            {importError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {importError}
              </div>
            )}

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Batch: {importTargetTraining?.batch_name} ({importTargetTraining?.training_title})</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                  Default Cost: ₹{importTargetTraining?.cost_per_batch?.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Upload a CSV spreadsheet with student details (Name, Roll No, Email, Contact, Course, Branch). The students will be automatically enrolled into this institution training roster.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">Sample CSV Template</div>
                <div className="text-[11px] text-slate-500">Includes headers and sample data format.</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadSampleTemplate}
                className="text-xs font-semibold bg-white dark:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Download Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/50 transition-colors">
              <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {importFileName ? importFileName : 'Choose or Drag CSV File'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Accepts standard .csv files</p>
              <label className="mt-3 inline-block">
                <span className="cursor-pointer px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors">
                  Browse CSV
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleCSVFileChange(e, importTargetTraining?.training_title || '', importTargetTraining?.cost_per_batch || 0)}
                />
              </label>
            </div>

            {parsedImportStudents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>Preview Parsed Students ({parsedImportStudents.length})</span>
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Import
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Roll No</th>
                        <th className="p-2">Course / Branch</th>
                        <th className="p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedImportStudents.map((st, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">{st.student_name}</td>
                          <td className="p-2 font-mono text-indigo-600 dark:text-indigo-400">{st.student_roll_no}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">{st.course} - {st.branch}</td>
                          <td className="p-2 text-slate-500">{st.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedImportStudents([]);
                  setImportFileName('');
                  setImportError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                isLoading={isImporting}
                disabled={parsedImportStudents.length === 0}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Import {parsedImportStudents.length} Students
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
