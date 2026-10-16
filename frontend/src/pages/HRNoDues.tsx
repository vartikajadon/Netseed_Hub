import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import {
  NoDuesRequest,
  NoDuesTemplateOption,
  NoDuesChecklistItem,
  NoDuesCreatePayload,
  Student
} from '../types';
import {
  FileCheck, Plus, Search, CheckCircle2, AlertCircle, Clock,
  XCircle, Filter, Trash2, Printer, ShieldCheck, User, Building2,
  ListChecks, Settings, ExternalLink, ChevronRight
} from 'lucide-react';

export const HRNoDues: React.FC = () => {
  const { showToast } = useNotifications();

  const [requests, setRequests] = useState<NoDuesRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [templateOptions, setTemplateOptions] = useState<NoDuesTemplateOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Issue Modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formTitle, setFormTitle] = useState('Internship / Trainee No Dues Clearance');
  const [formRemarks, setFormRemarks] = useState('');
  const [customChecklist, setCustomChecklist] = useState<NoDuesChecklistItem[]>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionDept, setNewOptionDept] = useState('General');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Review Modal
  const [reviewingRequest, setReviewingRequest] = useState<NoDuesRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Certificate / View Modal
  const [viewingRequest, setViewingRequest] = useState<NoDuesRequest | null>(null);

  // Manage Templates Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const isExcludedChecklistItem = (name: string, dept: string) => {
    const n = (name || '').toLowerCase();
    const d = (dept || '').toLowerCase();
    return (
      n.includes('library') ||
      n.includes('it asset') ||
      n.includes('it / asset') ||
      n.includes('laptop') ||
      n.includes('hostel') ||
      n.includes('hardware') ||
      d.includes('library') ||
      d.includes('hostel') ||
      d.includes('it / hardware') ||
      d.includes('hardware') ||
      d.includes('it asset')
    );
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [reqs, studs, opts] = await Promise.all([
        api.get<NoDuesRequest[]>('/no-dues/requests'),
        api.get<any>('/students?limit=200'),
        api.get<NoDuesTemplateOption[]>('/no-dues/template-options'),
      ]);

      const sanitizedReqs = (reqs || []).map((r) => ({
        ...r,
        checklist_items: (r.checklist_items || []).filter(
          (i) => !isExcludedChecklistItem(i.item_name, i.department)
        ),
      }));
      setRequests(sanitizedReqs);
      const studentList = Array.isArray(studs) ? studs : studs?.items || [];
      setStudents(studentList);
      const validOptions = (opts || []).filter(
        (opt) => !isExcludedChecklistItem(opt.item_name, opt.department)
      );
      setTemplateOptions(validOptions);
    } catch (err: any) {
      setError(err.message || 'Failed to load No Dues data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openIssueModal = () => {
    setFormError(null);
    setSelectedStudentId(students[0]?.id || '');
    setFormTitle('Internship / Trainee No Dues Clearance');
    setFormRemarks('');
    // Pre-populate with default template options excluding library, IT assets, and hostel
    setCustomChecklist(
      templateOptions
        .filter((opt) => !isExcludedChecklistItem(opt.item_name, opt.department))
        .map((opt) => ({
          id: opt.id,
          item_name: opt.item_name,
          department: opt.department,
          is_cleared: false,
        }))
    );
    setIsIssueModalOpen(true);
  };

  const handleAddCustomChecklistItem = async () => {
    if (!newOptionName.trim()) return;

    const newItem: NoDuesChecklistItem = {
      id: `custom-${Date.now()}`,
      item_name: newOptionName.trim(),
      department: newOptionDept.trim() || 'General',
      is_cleared: false,
    };

    setCustomChecklist((prev) => [...prev, newItem]);

    if (saveAsTemplate) {
      try {
        await api.post('/no-dues/template-options', {
          item_name: newOptionName.trim(),
          department: newOptionDept.trim() || 'General',
          is_required: true,
        });
        const opts = await api.get<NoDuesTemplateOption[]>('/no-dues/template-options');
        setTemplateOptions(opts || []);
      } catch (err: any) {
        console.error('Failed to save template option:', err);
      }
    }

    setNewOptionName('');
    setNewOptionDept('General');
    setSaveAsTemplate(false);
  };

  const handleRemoveChecklistItem = (id: string) => {
    setCustomChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setFormError('Please select a student.');
      return;
    }
    if (customChecklist.length === 0) {
      setFormError('Please include at least one clearance checklist item.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload: NoDuesCreatePayload = {
        student_id: selectedStudentId,
        title: formTitle.trim(),
        checklist_items: customChecklist,
        remarks: formRemarks.trim() || undefined,
      };

      await api.post('/no-dues/requests', payload);
      showToast('No Dues Form Issued', 'The student has been notified to complete clearance.', 'NO_DUES');
      setIsIssueModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue No Dues form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRequest) return;

    if (reviewAction === 'REJECT' && !rejectionReason.trim()) {
      alert('Please specify rejection / return reason.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/no-dues/requests/${reviewingRequest.id}/review`, {
        status: reviewAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        remarks: reviewRemarks.trim() || undefined,
        rejection_reason: reviewAction === 'REJECT' ? rejectionReason.trim() : undefined,
      });

      showToast(
        reviewAction === 'APPROVE' ? 'No Dues Approved' : 'No Dues Returned',
        `Clearance request has been ${reviewAction === 'APPROVE' ? 'approved' : 'returned to student'}.`,
        'NO_DUES'
      );
      setReviewingRequest(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (optId: string) => {
    if (!window.confirm('Remove this checklist item from templates?')) return;
    try {
      await api.delete(`/no-dues/template-options/${optId}`);
      setTemplateOptions((prev) => prev.filter((o) => o.id !== optId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete template option.');
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.student_name.toLowerCase().includes(q) ||
          r.student_roll_no.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  // Stats
  const totalIssued = requests.length;
  const pendingStudent = requests.filter((r) => r.status === 'PENDING_STUDENT').length;
  const submittedReview = requests.filter((r) => r.status === 'SUBMITTED').length;
  const approvedCleared = requests.filter((r) => r.status === 'APPROVED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">Cleared & Approved</Badge>;
      case 'SUBMITTED':
        return <Badge variant="warning">Submitted for Review</Badge>;
      case 'REJECTED':
        return <Badge variant="error">Returned / Dues Found</Badge>;
      default:
        return <Badge variant="info">Pending Trainee Action</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-700 via-sky-700 to-blue-800 text-white p-6 rounded-3xl shadow-lg border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl">
              <FileCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">No Dues Clearance Management</h1>
              <p className="text-xs text-sky-100 font-medium mt-0.5 max-w-xl">
                Design custom clearance criteria, send formal No Dues forms directly to student dashboards, and authorize final sign-offs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsTemplateModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold backdrop-blur-sm"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Checklist Options
            </Button>

            <Button
              variant="white"
              size="md"
              onClick={openIssueModal}
              className="shadow-lg text-indigo-700 font-bold hover:bg-sky-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5] text-indigo-700" />
              <span className="font-bold text-indigo-700">Issue No Dues Form</span>
            </Button>
          </div>
        </div>

        {/* Analytics Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Issued</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalIssued}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Trainee</span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{pendingStudent}</div>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Needs HR Review</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{submittedReview}</div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fully Cleared</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCleared}</div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, roll no, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {['ALL', 'PENDING_STUDENT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st === 'ALL'
                  ? 'All'
                  : st === 'PENDING_STUDENT'
                  ? 'Pending'
                  : st === 'SUBMITTED'
                  ? 'Submitted'
                  : st === 'APPROVED'
                  ? 'Approved'
                  : 'Returned'}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <Loading message="Loading No Dues requests & student records..." />}
        {error && <ErrorMessage message={error} />}

        {/* Requests Table */}
        {!isLoading && filteredRequests.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <FileCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No No Dues Requests Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Issue a No Dues Clearance form to an intern or trainee to initiate clearance checklist verification.
            </p>
            <Button variant="primary" size="sm" onClick={openIssueModal} className="mt-2 font-bold">
              <Plus className="w-4 h-4 mr-1" />
              Issue First No Dues Form
            </Button>
          </div>
        ) : (
          !isLoading && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4">Trainee / Student</th>
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Clearance Title</th>
                    <th className="p-4">Checklist Progress</th>
                    <th className="p-4">Issued On</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.map((req) => {
                    const totalItems = req.checklist_items.length;
                    const clearedCount = req.checklist_items.filter((i) => i.is_cleared).length;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{req.student_name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{req.student_email}</div>
                        </td>
                        <td className="p-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {req.student_roll_no}
                        </td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                          {req.title}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {clearedCount}/{totalItems}
                            </span>
                            <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  clearedCount === totalItems ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${totalItems ? (clearedCount / totalItems) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {req.issued_at.split('T')[0]}
                        </td>
                        <td className="p-4">{getStatusBadge(req.status)}</td>
                        <td className="p-4 text-right space-x-2">
                          {req.status === 'SUBMITTED' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setReviewingRequest(req);
                                setReviewAction('APPROVE');
                                setReviewRemarks('');
                                setRejectionReason('');
                              }}
                              className="font-bold text-xs"
                            >
                              Review & Sign
                            </Button>
                          ) : req.status === 'APPROVED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingRequest(req)}
                              className="text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1" />
                              Certificate
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setViewingRequest(req)}
                              className="text-xs"
                            >
                              View Details
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Modal 1: Issue No Dues Form */}
        <Modal
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          title="Issue No Dues Form to Student"
        >
          <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs font-sans">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Select Student / Trainee *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                required
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.user?.full_name || 'Student'} ({st.roll_number}) - {st.batch?.name || 'No Batch'}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Clearance Title *"
              placeholder="e.g. Internship Completion No Dues Clearance"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />

            {/* Checklist Customization Section */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Clearance Checklist Items ({customChecklist.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    The student must review and clear each item before submitting.
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {customChecklist.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Dept: {item.department}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Custom Item Inputs */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add New Clearance Item / Option
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Clearance Item Name (e.g. Mentor Sign-off, Identity Card)"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Department (e.g. Training / Accounts / Administration)"
                    value={newOptionDept}
                    onChange={(e) => setNewOptionDept(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Save as reusable template option for future forms</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomChecklistItem}
                    className="text-xs font-semibold"
                  >
                    Add Item
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                HR Instructions / Special Remarks (Optional)
              </label>
              <textarea
                placeholder="Add instructions or specific requirements for the student..."
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsIssueModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                Send to Student Dashboard
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: Review & Sign No Dues Form */}
        <Modal
          isOpen={!!reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          title={`Review No Dues: ${reviewingRequest?.student_name || ''}`}
        >
          {reviewingRequest && (
            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">{reviewingRequest.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Student: <strong>{reviewingRequest.student_name}</strong> ({reviewingRequest.student_roll_no})
                </div>
                {reviewingRequest.student_notes && (
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg mt-2 font-medium">
                    Student Submission Notes: "{reviewingRequest.student_notes}"
                  </div>
                )}
              </div>

              {/* Submitted Checklist verification */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Checklist Status Submitted by Student:</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {reviewingRequest.checklist_items.map((item, i) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {item.is_cleared ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                          <div className="text-[10px] text-slate-400">Dept: {item.department}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold ${item.is_cleared ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {item.is_cleared ? 'Marked Cleared' : 'Uncleared'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Action Radio */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block font-bold text-slate-900 dark:text-white">HR Action Decision *</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-600">
                    <input
                      type="radio"
                      name="action"
                      checked={reviewAction === 'APPROVE'}
                      onChange={() => setReviewAction('APPROVE')}
                    />
                    <span>Approve & Issue Final Clearance</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-rose-600">
                    <input
                      type="radio"
                      name="action"
                      checked={reviewAction === 'REJECT'}
                      onChange={() => setReviewAction('REJECT')}
                    />
                    <span>Return / Reject (Dues Pending)</span>
                  </label>
                </div>
              </div>

              {reviewAction === 'REJECT' ? (
                <div>
                  <label className="block text-rose-600 font-bold mb-1">Return / Rejection Reason *</label>
                  <textarea
                    placeholder="Describe which books, assets, or fee amounts are still pending..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Approval Remarks / Sign-off Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. All departments verified. Best wishes for your career!"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="secondary" size="sm" onClick={() => setReviewingRequest(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={reviewAction === 'APPROVE' ? 'primary' : 'danger'}
                  size="sm"
                  isLoading={isSubmitting}
                  className="font-bold"
                >
                  {reviewAction === 'APPROVE' ? 'Confirm Approval' : 'Return to Student'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal 3: View Clearance Certificate / Summary */}
        <Modal
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          title={`No Dues Clearance Certificate: ${viewingRequest?.student_name || ''}`}
        >
          {viewingRequest && (
            <div className="space-y-4 font-sans text-xs">
              {/* Printable Certificate Card */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <img src="/netseed-logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">Netlink Software Group</h3>
                      <div className="text-[10px] text-slate-500">Official Clearance & No Dues Certificate</div>
                    </div>
                  </div>
                  {getStatusBadge(viewingRequest.status)}
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">This certifies that:</div>
                  <div className="text-base font-black text-indigo-700 dark:text-indigo-400">
                    {viewingRequest.student_name}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                    Roll No: {viewingRequest.student_roll_no}
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  Has fulfilled all required obligations for <strong>{viewingRequest.title}</strong> across departments, including Mentor evaluations, Project reviews, and Finance accounts.
                </p>

                <div className="space-y-1.5 pt-2">
                  <div className="font-bold text-slate-900 dark:text-white">Department Clearances:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {viewingRequest.checklist_items.map((it) => (
                      <div
                        key={it.id}
                        className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-semibold text-[11px] truncate">{it.item_name}</span>
                        {it.is_cleared ? (
                          <span className="text-emerald-600 font-bold text-[10px]">✓ Cleared</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                  <div>
                    Issued: <strong>{viewingRequest.issued_at.split('T')[0]}</strong>
                  </div>
                  {viewingRequest.approved_at && (
                    <div className="text-right">
                      Cleared: <strong>{viewingRequest.approved_at.split('T')[0]}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Certificate
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingRequest(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal 4: Manage Template Options */}
        <Modal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title="Manage Default Clearance Checklist Criteria"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              These default options automatically appear when issuing any new No Dues form.
            </p>

            <div className="space-y-2">
              {templateOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{opt.item_name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Department: {opt.department}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(opt.id)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                    title="Delete Option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsTemplateModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
