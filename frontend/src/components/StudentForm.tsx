import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { api } from '../api/client';
import { User, Program, Batch, Student, BatchType, PaymentMode, InstallmentType, DOMICILE_OPTIONS, BATCH_TYPE_OPTIONS } from '../types';
import { CreditCard, Calendar, Clock, DollarSign, CheckCircle2, Cake } from 'lucide-react';

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Student | null;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);

  // Registration Fields State
  const [fullName, setFullName] = useState(initialData?.user?.full_name || '');
  const [email, setEmail] = useState(initialData?.user?.email || '');
  const [contactNumber, setContactNumber] = useState(initialData?.contact_number || initialData?.user?.phone || '');
  const [dob, setDob] = useState<string>(initialData?.dob || '');
  const [age, setAge] = useState<string>(initialData?.age ? String(initialData.age) : '');
  const [guardianName, setGuardianName] = useState(initialData?.guardian_name || '');
  const [maritalStatus, setMaritalStatus] = useState(initialData?.marital_status || 'Single');
  const [programId, setProgramId] = useState(initialData?.program_id || '');
  const [batchId, setBatchId] = useState(initialData?.batch_id || '');
  const [rollNumber, setRollNumber] = useState(initialData?.roll_number || '');
  const [collegeName, setCollegeName] = useState(initialData?.college_name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [qualification, setQualification] = useState(initialData?.qualification || '');
  const [passoutYear, setPassoutYear] = useState<string>(initialData?.passout_year ? String(initialData.passout_year) : '');
  const [domicile, setDomicile] = useState(initialData?.domicile || '');
  const [isCustomDomicile, setIsCustomDomicile] = useState(false);

  // Batch Type & Financial Fields
  const [batchType, setBatchType] = useState<string>(initialData?.batch_type || 'TECH_MASTER');
  const [totalFees, setTotalFees] = useState<string>(initialData?.total_fees ? String(initialData.total_fees) : '');
  const [paymentMode, setPaymentMode] = useState<string>(initialData?.payment_mode || 'ONLINE');
  const [installmentType, setInstallmentType] = useState<string>(initialData?.installment_type || 'ONE_TIME');
  const [startDate, setStartDate] = useState(initialData?.start_date || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDobChange = (newDob: string) => {
    setDob(newDob);
    if (newDob) {
      try {
        const birthDate = new Date(newDob);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge > 0 && calculatedAge < 100) {
          setAge(String(calculatedAge));
        }
      } catch {
        // Keep existing age
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDropdownOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    setError(null);
    setSuccessMessage(null);
    if (initialData) {
      setFullName(initialData.user?.full_name || '');
      setEmail(initialData.user?.email || '');
      setContactNumber(initialData.contact_number || initialData.user?.phone || '');
      setDob(initialData.dob || '');
      setAge(initialData.age ? String(initialData.age) : '');
      setGuardianName(initialData.guardian_name || '');
      setMaritalStatus(initialData.marital_status || 'Single');
      const dom = initialData.domicile || '';
      setDomicile(dom);
      setIsCustomDomicile(Boolean(dom && !DOMICILE_OPTIONS.includes(dom as any)));
      setProgramId(initialData.program_id || '');
      setBatchId(initialData.batch_id || '');
      setRollNumber(initialData.roll_number || '');
      setCollegeName(initialData.college_name || '');
      setAddress(initialData.address || '');
      setQualification(initialData.qualification || '');
      setPassoutYear(initialData.passout_year ? String(initialData.passout_year) : '');
      const rawBt = (initialData.batch_type || 'TECH_MASTER').toUpperCase();
      const normBt =
        rawBt === 'SIX_MONTHS' || rawBt === '6 MONTHS' || rawBt === '6 MONTHS PROGRAM'
          ? 'SHORT_DURATION'
          : rawBt;
      setBatchType(normBt);
      setTotalFees(initialData.total_fees ? String(initialData.total_fees) : '');
      setPaymentMode(initialData.payment_mode || 'ONLINE');
      setInstallmentType(initialData.installment_type || 'ONE_TIME');
      setStartDate(initialData.start_date || '');
    } else {
      setFullName('');
      setEmail('');
      setContactNumber('');
      setDob('');
      setAge('');
      setGuardianName('');
      setMaritalStatus('Single');
      setDomicile('');
      setIsCustomDomicile(false);
      setProgramId('');
      setBatchId('');
      setRollNumber(`NL-2026-${Math.floor(100 + Math.random() * 900)}`);
      setCollegeName('');
      setAddress('');
      setQualification('');
      setPassoutYear('');
      setBatchType('TECH_MASTER');
      setTotalFees('60000');
      setPaymentMode('ONLINE');
      setInstallmentType('ONE_TIME');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, isOpen]);

  // Dynamically filter batches when program selection changes
  useEffect(() => {
    if (programId) {
      setFilteredBatches(batches.filter((b) => b.program_id === programId));
      if (batchId && !batches.some((b) => b.id === batchId && b.program_id === programId)) {
        setBatchId('');
      }
    } else {
      setFilteredBatches(batches);
    }
  }, [programId, batches]);

  const fetchDropdownOptions = async () => {
    try {
      const [allUsers, allProgs, allBatches] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<Program[]>('/programs'),
        api.get<Batch[]>('/batches'),
      ]);

      const studentUsers = allUsers.filter((u) => u.role === 'STUDENT');
      setUsers(studentUsers);
      setPrograms(allProgs.filter((p) => p.is_active));
      setBatches(allBatches);
      setFilteredBatches(allBatches);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    }
  };

  const extractErrorMessage = (err: any): string => {
    if (!err) return 'An unexpected error occurred.';
    if (typeof err === 'string') return err;
    if (typeof err.message === 'string' && err.message !== '[object Object]') return err.message;
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) {
      return err.detail.map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join('; ');
    }
    if (err.data) {
      if (typeof err.data.detail === 'string') return err.data.detail;
      if (Array.isArray(err.data.detail)) {
        return err.data.detail.map((d: any) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join('; ');
      }
      if (typeof err.data.message === 'string') return err.data.message;
    }
    try {
      const jsonStr = JSON.stringify(err);
      return jsonStr !== '{}' && jsonStr !== '[]' ? jsonStr : 'Failed to process request.';
    } catch {
      return 'Failed to save student record.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) return setError('Student Name is required.');
    if (!email.trim()) return setError('Email Address is required.');
    if (!rollNumber.trim()) return setError('Roll Number / Enrollment Number is required.');

    const parsedFees = totalFees ? parseFloat(totalFees) : undefined;
    if (totalFees && (isNaN(parsedFees!) || parsedFees! < 0)) {
      return setError('Please enter a valid non-negative course fee amount.');
    }

    setIsLoading(true);
    try {
      const parsedAge = age && !isNaN(parseInt(age, 10)) ? parseInt(age, 10) : undefined;
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        contact_number: contactNumber.trim() || undefined,
        age: parsedAge,
        dob: dob && dob.trim() !== '' ? dob : undefined,
        guardian_name: guardianName.trim() || undefined,
        marital_status: maritalStatus || undefined,
        domicile: domicile.trim() || undefined,
        program_id: programId && programId.trim() !== '' ? programId : undefined,
        batch_id: batchId && batchId.trim() !== '' ? batchId : undefined,
        roll_number: rollNumber.trim(),
        college_name: collegeName.trim() || undefined,
        address: address.trim() || undefined,
        qualification: qualification.trim() || undefined,
        passout_year: passoutYear && !isNaN(parseInt(passoutYear, 10)) ? parseInt(passoutYear, 10) : undefined,
        batch_type: batchType,
        total_fees: parsedFees,
        payment_mode: paymentMode,
        installment_type: installmentType,
        start_date: startDate && startDate.trim() !== '' ? startDate : undefined,
        enrollment_status: 'ACTIVE',
      };

      if (initialData) {
        await api.put(`/students/${initialData.id}`, payload);
        setSuccessMessage('Student details updated successfully!');
      } else {
        await api.post('/students', payload);
        setSuccessMessage('Student successfully registered! Added to student list.');
      }

      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const numericFees = totalFees ? parseFloat(totalFees) : 0;
  const halfFees = !isNaN(numericFees) ? numericFees / 2 : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Student Details' : 'Register New Trainee / Student'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs max-h-[82vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-medium">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Section 1: Basic Identity */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800 pb-1">
            1. Personal & Contact Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Student Full Name *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter student full name"
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Contact Number"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. +91 9876543210"
            />
            <div>
              <Input
                label="Date of Birth (DOB)"
                type="date"
                value={dob}
                onChange={(e) => handleDobChange(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-[10px] text-pink-600 dark:text-pink-400 mt-1 flex items-center gap-1 font-semibold">
                <Cake className="w-3 h-3 text-pink-500 shrink-0" />
                Auto-syncs with Calendar & HR Reminder
              </p>
            </div>
            <Input
              label="Age (Years)"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 22"
              min={15}
              max={70}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Guardian Name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Father's / Mother's / Guardian Name"
            />
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Marital Status</label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Domicile (Domecile)
              </label>
              <select
                value={
                  DOMICILE_OPTIONS.includes(domicile as any)
                    ? domicile
                    : domicile
                    ? 'OTHER_CUSTOM'
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'OTHER_CUSTOM') {
                    setIsCustomDomicile(true);
                    if (DOMICILE_OPTIONS.includes(domicile as any)) setDomicile('');
                  } else {
                    setIsCustomDomicile(false);
                    setDomicile(val);
                  }
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">-- Select Domicile --</option>
                <option value="Madhya Pradesh">Madhya Pradesh (MP)</option>
                <option value="Other State">Other State (Non-MP)</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Bihar">Bihar</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi / NCR">Delhi / NCR</option>
                <option value="OTHER_CUSTOM">Other State / Custom</option>
              </select>
              {(isCustomDomicile || (!DOMICILE_OPTIONS.includes(domicile as any) && domicile.trim() !== '')) && (
                <input
                  type="text"
                  value={domicile}
                  onChange={(e) => setDomicile(e.target.value)}
                  placeholder="Specify domicile state / location"
                  className="mt-2 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Program & Batch Type Selection */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            2. Program & Batch Type Selection
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Program Name</label>
              <select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Program --</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Batch Type *</label>
              <select
                value={batchType}
                onChange={(e) => setBatchType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              >
                {BATCH_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        {/* Section 3: Fees & Payment Structure */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            3. Fees & Payment Options
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Total Fees (₹) *"
              type="number"
              value={totalFees}
              onChange={(e) => setTotalFees(e.target.value)}
              placeholder="e.g. 60000"
              min={0}
              required
            />

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ONLINE">Online Payment (UPI/Card/NetBanking)</option>
                <option value="CASH">Cash Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Installment Plan *</label>
              <select
                value={installmentType}
                onChange={(e) => setInstallmentType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ONE_TIME">One Time Payment (Full Fee)</option>
                <option value="TWO_INSTALLMENTS">2 Time Installment (50% / 50%)</option>
              </select>
            </div>
          </div>

          {/* Live Installment Breakdown Preview Box */}
          {numericFees > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-semibold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Payment Structure Summary:
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Total: ₹{numericFees.toLocaleString('en-IN')}</span>
              </div>

              {installmentType === 'TWO_INSTALLMENTS' ? (
                <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">1st Installment (50% At Admission)</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-300 font-bold text-sm">₹{halfFees.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">2nd Installment (50% Mid-Course)</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-300 font-bold text-sm">₹{halfFees.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Full Lump-Sum Fee:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-300 font-bold text-sm">₹{numericFees.toLocaleString('en-IN')} ({paymentMode})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Academic & Institutional Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800 pb-1">
            4. Academic Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Roll Number / Enrollment Number *"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. NL-2026-001"
              required
            />
            <Input
              label="College / Institute"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. SIRT / Institute of Technology"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Qualification"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="e.g. B.Tech / MCA / B.Sc"
            />
            <Input
              label="Passout Year"
              type="number"
              value={passoutYear}
              onChange={(e) => setPassoutYear(e.target.value)}
              placeholder="e.g. 2024 / 2025"
              min={1990}
              max={2035}
            />
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full residential address"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Register Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

