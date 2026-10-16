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
import { StudentFeeSummary, FeePaymentCreatePayload, FeePayment } from '../types';
import { getStandardDateString } from '../lib/dateUtils';
import {
  IndianRupee, CreditCard, Search, Plus, Download, Printer,
  CheckCircle2, AlertCircle, Clock, Trash2, Calendar, FileText,
  User, Check, Filter
} from 'lucide-react';

export const HRFees: React.FC = () => {
  const { showToast } = useNotifications();

  const [feeSummaries, setFeeSummaries] = useState<StudentFeeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<StudentFeeSummary | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_date: getStandardDateString(),
    payment_mode: 'UPI',
    transaction_reference: '',
    receipt_number: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Ledger / History Modal
  const [selectedLedger, setSelectedLedger] = useState<StudentFeeSummary | null>(null);

  // Edit Fee Structure Modal
  const [editingStudent, setEditingStudent] = useState<StudentFeeSummary | null>(null);
  const [editTotalFees, setEditTotalFees] = useState<string>('');
  const [editPaymentMode, setEditPaymentMode] = useState('ONLINE');
  const [editInstallmentType, setEditInstallmentType] = useState('ONE_TIME');

  const fetchFees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<StudentFeeSummary[]>('/fees/students');
      setFeeSummaries(res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load student fees data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const openPaymentModal = (student: StudentFeeSummary) => {
    setTargetStudent(student);
    setPaymentError(null);
    setPaymentForm({
      amount_paid: student.remaining_fees > 0 ? String(student.remaining_fees) : '',
      payment_date: getStandardDateString(),
      payment_mode: 'UPI',
      transaction_reference: '',
      receipt_number: `REC-${Date.now().toString().slice(-6)}`,
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    const amount = parseFloat(paymentForm.amount_paid);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setPaymentError(null);

      const payload: FeePaymentCreatePayload = {
        student_id: targetStudent.student_id,
        amount_paid: amount,
        payment_date: paymentForm.payment_date,
        payment_mode: paymentForm.payment_mode,
        transaction_reference: paymentForm.transaction_reference.trim() || undefined,
        receipt_number: paymentForm.receipt_number.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      };

      await api.post('/fees/payments', payload);
      showToast(
        'Payment Recorded Successfully',
        `₹${amount.toLocaleString('en-IN')} recorded for ${targetStudent.full_name}.`,
        'FEE_PAYMENT'
      );
      setIsPaymentModalOpen(false);
      await fetchFees();

      // If ledger is currently open for this student, update it
      if (selectedLedger && selectedLedger.student_id === targetStudent.student_id) {
        const updated = await api.get<StudentFeeSummary>(`/fees/students/${targetStudent.student_id}`);
        setSelectedLedger(updated);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const total = parseFloat(editTotalFees);
    if (isNaN(total) || total < 0) {
      alert('Please enter a valid total fee amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/fees/students/${editingStudent.student_id}/structure`, {
        total_fees: total,
        payment_mode: editPaymentMode,
        installment_type: editInstallmentType,
      });

      showToast('Fee Structure Updated', `Updated fee structure for ${editingStudent.full_name}.`, 'FEE_PAYMENT');
      setEditingStudent(null);
      await fetchFees();
    } catch (err: any) {
      alert(err.message || 'Failed to update fee structure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will adjust the student balance.')) return;
    try {
      await api.delete(`/fees/payments/${paymentId}`);
      showToast('Payment Record Removed', 'The payment entry was deleted and balance adjusted.', 'FEE_PAYMENT');
      await fetchFees();
      if (selectedLedger) {
        const updated = await api.get<StudentFeeSummary>(`/fees/students/${selectedLedger.student_id}`);
        setSelectedLedger(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment.');
    }
  };

  const handleExportCSV = () => {
    if (feeSummaries.length === 0) return;

    const headers = [
      'Student Name',
      'Roll Number',
      'Email',
      'Batch',
      'Total Fees (INR)',
      'Total Paid (INR)',
      'Remaining Fees (INR)',
      'Status',
      'Last Payment Date',
    ];

    const rows = feeSummaries.map((s) => [
      `"${s.full_name}"`,
      `"${s.roll_number}"`,
      `"${s.email}"`,
      `"${s.batch_name || 'N/A'}"`,
      s.total_fees,
      s.total_paid,
      s.remaining_fees,
      s.payment_status,
      s.last_payment_date || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Netlink_Students_Fee_Ledger_${getStandardDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered
  const filteredSummaries = useMemo(() => {
    return feeSummaries.filter((s) => {
      if (statusFilter !== 'ALL' && s.payment_status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.full_name.toLowerCase().includes(q) ||
          s.roll_number.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.batch_name && s.batch_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [feeSummaries, statusFilter, searchQuery]);

  // Aggregate stats
  const totalExpected = feeSummaries.reduce((sum, s) => sum + s.total_fees, 0);
  const totalCollected = feeSummaries.reduce((sum, s) => sum + s.total_paid, 0);
  const totalOutstanding = feeSummaries.reduce((sum, s) => sum + s.remaining_fees, 0);
  const paidCount = feeSummaries.filter((s) => s.payment_status === 'PAID').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">Fully Paid</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning">Partially Paid</Badge>;
      default:
        return <Badge variant="error">Unpaid / Dues</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-800 text-white p-6 rounded-3xl shadow-lg border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl">
              <IndianRupee className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Student Fees & Accounts Management</h1>
              <p className="text-xs text-emerald-100 font-medium mt-0.5 max-w-xl">
                Track complete student fee structures, record installment payments with payment modes and receipts, and monitor outstanding dues.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold backdrop-blur-sm"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Analytics Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Expected Fees</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹{totalExpected.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Collected</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{totalCollected.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding Balance</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fully Paid Students</span>
              <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                {paidCount} / {feeSummaries.length}
              </div>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl">
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
              placeholder="Search by student, roll no, batch, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {['ALL', 'PAID', 'PARTIAL', 'UNPAID'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st === 'ALL' ? 'All Students' : st === 'PAID' ? 'Fully Paid' : st === 'PARTIAL' ? 'Partial' : 'Unpaid'}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <Loading message="Loading student fees roster & payment ledgers..." />}
        {error && <ErrorMessage message={error} />}

        {/* Fee Roster Table */}
        {!isLoading && filteredSummaries.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <IndianRupee className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Student Records Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Students registered under programs or batches will appear here with automated fee ledger tracking.
            </p>
          </div>
        ) : (
          !isLoading && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Batch</th>
                    <th className="p-4">Total Course Fee</th>
                    <th className="p-4">Amount Paid</th>
                    <th className="p-4">Balance Remaining</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Last Payment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSummaries.map((s) => (
                    <tr key={s.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{s.full_name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.email}</div>
                      </td>
                      <td className="p-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {s.roll_number}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                        {s.batch_name || '—'}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">
                        ₹{s.total_fees.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ₹{s.total_paid.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 font-bold font-mono">
                        {s.remaining_fees > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            ₹{s.remaining_fees.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">₹0 (Cleared)</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(s.payment_status)}</td>
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {s.last_payment_date || 'None'}
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {(() => {
                          const isFeesCompleted = (s.remaining_fees ?? 0) <= 0 || (s.payment_status as string) === 'COMPLETED' || (s.payment_status as string) === 'PAID' || (s.total_fees > 0 && s.total_paid >= s.total_fees);
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isFeesCompleted}
                              onClick={() => !isFeesCompleted && openPaymentModal(s)}
                              title={isFeesCompleted ? 'Fees completed — No dues remaining' : 'Record Fee Payment'}
                              className={
                                isFeesCompleted
                                  ? 'opacity-40 cursor-not-allowed pointer-events-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 text-xs font-semibold'
                                  : 'bg-emerald-50/80 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-bold'
                              }
                            >
                              {isFeesCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-slate-400 dark:text-slate-500" />
                                  <span>Record Pay</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                  <span>Record Pay</span>
                                </>
                              )}
                            </Button>
                          );
                        })()}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedLedger(s)}
                          className="text-xs font-semibold"
                        >
                          Ledger ({s.payments_count})
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingStudent(s);
                            setEditTotalFees(String(s.total_fees));
                            setEditPaymentMode(s.payment_mode || 'ONLINE');
                            setEditInstallmentType(s.installment_type || 'ONE_TIME');
                          }}
                          className="text-slate-500 hover:text-indigo-600 text-xs p-1.5"
                          title="Edit Total Fee Structure"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Modal 1: Record Payment Installment */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Record Fee Payment: ${targetStudent?.full_name || ''}`}
        >
          {targetStudent && (
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs font-sans">
              {paymentError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {paymentError}
                </div>
              )}

              {/* Balance Summary Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-500">Total Fee</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    ₹{targetStudent.total_fees.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Already Paid</div>
                  <div className="text-sm font-black text-emerald-600 font-mono mt-0.5">
                    ₹{targetStudent.total_paid.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Current Balance</div>
                  <div className="text-sm font-black text-rose-600 font-mono mt-0.5">
                    ₹{targetStudent.remaining_fees.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Payment Amount (₹) *"
                  type="number"
                  placeholder="e.g. 15000"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                  required
                />

                <Input
                  label="Payment Date *"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="ONLINE">Online Portal Gateway</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>

                <Input
                  label="Transaction Ref / UTR / Cheque No"
                  placeholder="e.g. UTR9384910284"
                  value={paymentForm.transaction_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Receipt Number"
                  placeholder="e.g. REC-849201"
                  value={paymentForm.receipt_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                />

                <Input
                  label="Remarks / Notes (Optional)"
                  placeholder="e.g. 2nd Installment payment"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                  Save Payment & Issue Receipt
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal 2: Student Fee Ledger & Payment History */}
        <Modal
          isOpen={!!selectedLedger}
          onClose={() => setSelectedLedger(null)}
          title={`Payment Ledger: ${selectedLedger?.full_name || ''}`}
        >
          {selectedLedger && (
            <div className="space-y-4 font-sans text-xs">
              {/* Top Summary Banner */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-black text-sm text-slate-900 dark:text-white">
                    {selectedLedger.full_name} ({selectedLedger.roll_number})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Batch: <strong>{selectedLedger.batch_name || 'N/A'}</strong> | Mode:{' '}
                    <strong>{selectedLedger.payment_mode || 'ONLINE'}</strong>
                  </div>
                </div>
                {getStatusBadge(selectedLedger.payment_status)}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/40 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">Total Course Fee</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    ₹{selectedLedger.total_fees.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 font-bold">Total Paid</div>
                  <div className="text-sm font-black text-emerald-600">
                    ₹{selectedLedger.total_paid.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-600 font-bold">Balance Due</div>
                  <div className="text-sm font-black text-rose-600">
                    ₹{selectedLedger.remaining_fees.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Installments History ({selectedLedger.payments.length})
                  </h4>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const st = selectedLedger;
                      setSelectedLedger(null);
                      openPaymentModal(st);
                    }}
                    className="text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Payment
                  </Button>
                </div>

                {selectedLedger.payments.length === 0 ? (
                  <div className="p-6 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-500">No installment payments recorded yet for this student.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Mode</th>
                          <th className="p-2.5">Receipt #</th>
                          <th className="p-2.5">Ref / UTR</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedLedger.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2.5 font-mono">{p.payment_date}</td>
                            <td className="p-2.5 font-bold text-emerald-600 font-mono">
                              ₹{p.amount_paid.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">
                              {p.payment_mode}
                            </td>
                            <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400">
                              {p.receipt_number || '—'}
                            </td>
                            <td className="p-2.5 font-mono text-slate-500">{p.transaction_reference || '—'}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                                title="Delete payment"
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

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Statement
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setSelectedLedger(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal 3: Update Fee Structure */}
        <Modal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title={`Update Total Fee Structure: ${editingStudent?.full_name || ''}`}
        >
          {editingStudent && (
            <form onSubmit={handleSaveFeeStructure} className="space-y-4 text-xs font-sans">
              <Input
                label="Total Course Fees (₹) *"
                type="number"
                value={editTotalFees}
                onChange={(e) => setEditTotalFees(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Payment Mode</label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Installment Plan</label>
                  <select
                    value={editInstallmentType}
                    onChange={(e) => setEditInstallmentType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="ONE_TIME">ONE_TIME (Full Payment)</option>
                    <option value="TWO_INSTALLMENTS">TWO_INSTALLMENTS (50% / 50%)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                  Save Fee Structure
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
