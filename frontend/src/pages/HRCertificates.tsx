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
import { IssuedCertificate, CertificateCreatePayload, Student } from '../types';
import {
  Award, Plus, Search, Printer, Download, CheckCircle2,
  Trash2, ShieldCheck, Sparkles, User, FileText, Eye, QrCode, AlertCircle
} from 'lucide-react';

export const HRCertificates: React.FC = () => {
  const { showToast } = useNotifications();

  const [certificates, setCertificates] = useState<IssuedCertificate[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Issue / Import Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<'STUDENT' | 'CUSTOM'>('STUDENT');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [customRecipientName, setCustomRecipientName] = useState('');
  const [customRollNo, setCustomRollNo] = useState('');
  const [certTitle, setCertTitle] = useState('Certificate of Traineeship Completion');
  const [certType, setCertType] = useState('COMPLETION');
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0]);
  const [credentialId, setCredentialId] = useState('');
  const [description, setDescription] = useState(
    'In recognition of successful completion of the full-stack engineering curriculum and demonstrated technical excellence.'
  );
  const [importedFileName, setImportedFileName] = useState('');
  const [importedFileUrl, setImportedFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View / Print Modal
  const [viewingCert, setViewingCert] = useState<IssuedCertificate | null>(null);

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [certs, studs] = await Promise.all([
        api.get<IssuedCertificate[]>('/certificates'),
        api.get<any>('/students?limit=200'),
      ]);
      setCertificates(certs || []);
      const sList = Array.isArray(studs) ? studs : studs?.items || [];
      setStudents(sList);
    } catch (err: any) {
      setError(err.message || 'Failed to load certificates.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const openCreateModal = () => {
    setFormError(null);
    setRecipientType('STUDENT');
    const firstStudent = students[0];
    setSelectedStudentId(firstStudent?.id || '');
    setCustomRecipientName('');
    setCustomRollNo('');
    setCertTitle('Certificate of Traineeship Completion');
    setCertType('COMPLETION');
    setCertDate(new Date().toISOString().split('T')[0]);
    setCredentialId(`NETLINK-CERT-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setDescription(
      'In recognition of successful completion of the full-stack engineering curriculum and demonstrated technical excellence.'
    );
    setImportedFileName('');
    setImportedFileUrl('');
    setIsCreateModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setImportedFileUrl(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let name = '';
    let rollNo = '';
    let studentId: string | undefined = undefined;

    if (recipientType === 'STUDENT') {
      const st = students.find((s) => s.id === selectedStudentId);
      if (!st) {
        setFormError('Please select a student.');
        return;
      }
      studentId = st.id;
      name = st.user?.full_name || 'Student';
      rollNo = st.roll_number;
    } else {
      if (!customRecipientName.trim()) {
        setFormError('Recipient name is required.');
        return;
      }
      name = customRecipientName.trim();
      rollNo = customRollNo.trim();
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload: CertificateCreatePayload = {
        title: certTitle.trim(),
        certificate_type: certType,
        recipient_student_id: studentId,
        recipient_name: name,
        recipient_roll_no: rollNo || undefined,
        issue_date: certDate,
        credential_id: credentialId.trim() || undefined,
        description: description.trim() || undefined,
        file_url: importedFileUrl || undefined,
        file_name: importedFileName || undefined,
      };

      await api.post('/certificates', payload);
      showToast('Certificate Issued Successfully', `Certificate issued to ${name}.`, 'CERTIFICATE_ISSUED');
      setIsCreateModalOpen(false);
      await fetchCertificates();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue certificate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this certificate record?')) return;
    try {
      await api.delete(`/certificates/${id}`);
      showToast('Certificate Deleted', 'Certificate record removed.', 'CERTIFICATE_ISSUED');
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete certificate.');
    }
  };

  // Filtered
  const filteredCerts = useMemo(() => {
    return certificates.filter((c) => {
      if (typeFilter !== 'ALL' && c.certificate_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.recipient_name.toLowerCase().includes(q) ||
          c.credential_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [certificates, typeFilter, searchQuery]);

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-700 text-white p-6 rounded-3xl shadow-lg border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Certificates & Credentials Issuance</h1>
              <p className="text-xs text-amber-100 font-medium mt-0.5 max-w-xl">
                Generate and import official Traineeship Completion, Excellence Awards, and Verifiable Credentials with tamper-proof unique IDs.
              </p>
            </div>
          </div>

          <Button
            variant="white"
            size="md"
            onClick={openCreateModal}
            className="shadow-lg text-amber-800 font-bold hover:bg-amber-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-amber-800" />
            <span className="font-bold text-amber-800">Issue / Import Certificate</span>
          </Button>
        </div>

        {/* Analytics Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Issued</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{certificates.length}</div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion Certs</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {certificates.filter((c) => c.certificate_type === 'COMPLETION').length}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Excellence Awards</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {certificates.filter((c) => c.certificate_type === 'EXCELLENCE').length}
              </div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verified Credentials</span>
              <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mt-1">
                {certificates.length}
              </div>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient name, title, or credential ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {['ALL', 'COMPLETION', 'EXCELLENCE', 'PARTICIPATION', 'INTERNSHIP'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  typeFilter === type
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type === 'ALL'
                  ? 'All'
                  : type === 'COMPLETION'
                  ? 'Completion'
                  : type === 'EXCELLENCE'
                  ? 'Excellence'
                  : type === 'PARTICIPATION'
                  ? 'Participation'
                  : 'Internship'}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <Loading message="Loading issued certificates & verifiable credentials..." />}
        {error && <ErrorMessage message={error} />}

        {/* Certificates Table */}
        {!isLoading && filteredCerts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Certificates Issued Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Issue or import a traineeship completion or excellence certificate for any student or external participant.
            </p>
            <Button variant="primary" size="sm" onClick={openCreateModal} className="mt-2 font-bold">
              <Plus className="w-4 h-4 mr-1" />
              Issue First Certificate
            </Button>
          </div>
        ) : (
          !isLoading && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4">Recipient Name</th>
                    <th className="p-4">Certificate Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Credential ID</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Attachment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{cert.recipient_name}</div>
                        {cert.recipient_roll_no && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            Roll: {cert.recipient_roll_no}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{cert.title}</td>
                      <td className="p-4">
                        <Badge variant="warning">{cert.certificate_type}</Badge>
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {cert.credential_id}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{cert.issue_date}</td>
                      <td className="p-4">
                        {cert.file_name ? (
                          <span className="text-[11px] font-mono text-indigo-600 truncate max-w-[120px] block">
                            📎 {cert.file_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Netlink Template</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewingCert(cert)}
                          className="text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Certificate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCertificate(cert.id)}
                          className="text-rose-500 hover:text-rose-700 p-1.5"
                          title="Delete Certificate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Modal 1: Issue / Import Certificate */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Issue or Import Official Certificate"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Target Selection */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-bold">Select Recipient Target *</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="certRecType"
                    checked={recipientType === 'STUDENT'}
                    onChange={() => setRecipientType('STUDENT')}
                  />
                  <span>Registered Student / Trainee</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="certRecType"
                    checked={recipientType === 'CUSTOM'}
                    onChange={() => setRecipientType('CUSTOM')}
                  />
                  <span>Custom Recipient by Name</span>
                </label>
              </div>
            </div>

            {recipientType === 'STUDENT' ? (
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Choose Student *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  required
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.user?.full_name} ({st.roll_number}) - {st.batch?.name || 'No Batch'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Recipient Full Name *"
                  placeholder="e.g. Rahul Sharma"
                  value={customRecipientName}
                  onChange={(e) => setCustomRecipientName(e.target.value)}
                  required
                />
                <Input
                  label="Roll / Student ID (Optional)"
                  placeholder="e.g. 0103CS221045"
                  value={customRollNo}
                  onChange={(e) => setCustomRollNo(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Certificate Category *
                </label>
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="COMPLETION">Traineeship Completion Certificate</option>
                  <option value="EXCELLENCE">Certificate of Excellence</option>
                  <option value="PARTICIPATION">Certificate of Participation</option>
                  <option value="INTERNSHIP">Internship Experience Certificate</option>
                  <option value="CUSTOM">Custom Award Certificate</option>
                </select>
              </div>

              <Input
                label="Date of Award *"
                type="date"
                value={certDate}
                onChange={(e) => setCertDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Certificate Title *"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                required
              />

              <Input
                label="Verifiable Credential ID *"
                placeholder="e.g. NETLINK-CERT-2026-X84J9"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Citation / Description Statement
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed"
              />
            </div>

            {/* Optional Import File Attachment */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                Or Import Any Certificate Document / Scan (PDF / Image)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
                />
                {importedFileName && (
                  <span className="text-[11px] font-mono text-emerald-600 font-bold truncate">
                    ✓ Attached: {importedFileName}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="font-bold">
                <Award className="w-3.5 h-3.5 mr-1" />
                Issue Certificate
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: View / Print Netlink Certificate */}
        <Modal
          isOpen={!!viewingCert}
          onClose={() => setViewingCert(null)}
          title={`Official Certificate: ${viewingCert?.title || ''}`}
        >
          {viewingCert && (
            <div className="space-y-4 font-sans text-xs">
              {/* Certificate Canvas Box */}
              <div className="relative p-8 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 text-slate-900 border-8 border-double border-amber-500/80 rounded-3xl shadow-xl text-center space-y-4 print:shadow-none overflow-hidden">
                <div className="absolute top-2 left-2 w-16 h-16 border-t-2 border-l-2 border-amber-600/50 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-16 h-16 border-b-2 border-r-2 border-amber-600/50 pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-center gap-3">
                  <img src="/netseed-logo.jpg" alt="Netlink Logo" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                  <div className="text-left">
                    <h2 className="text-base font-black tracking-tight text-slate-900">
                      NETLINK SOFTWARE GROUP AMERICA INC.
                    </h2>
                    <div className="text-[11px] text-amber-700 font-bold tracking-widest uppercase">
                      netSEED Hub • Center of Excellence
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">This is to certify that</div>
                  <h1 className="text-2xl sm:text-3xl font-black text-amber-800 font-serif tracking-wide mt-1">
                    {viewingCert.recipient_name}
                  </h1>
                  {viewingCert.recipient_roll_no && (
                    <div className="text-xs font-mono font-semibold text-slate-600 mt-0.5">
                      Roll Number: {viewingCert.recipient_roll_no}
                    </div>
                  )}
                </div>

                <div className="max-w-lg mx-auto space-y-2">
                  <div className="text-sm font-extrabold text-slate-900">
                    has been awarded the <span className="text-amber-700">{viewingCert.title}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-serif italic">
                    "{viewingCert.description}"
                  </p>
                </div>

                {/* Imported File Scan if present */}
                {viewingCert.file_url && viewingCert.file_url.startsWith('data:image') && (
                  <div className="p-2 bg-white rounded-xl border border-amber-200 shadow-sm max-w-sm mx-auto">
                    <img
                      src={viewingCert.file_url}
                      alt="Certificate attachment"
                      className="max-h-48 object-contain mx-auto rounded-lg"
                    />
                  </div>
                )}

                {/* Bottom Signature & Verifier */}
                <div className="pt-6 border-t border-amber-200/80 flex items-center justify-between text-left text-[11px]">
                  <div>
                    <div className="font-mono text-[10px] text-slate-500">
                      Credential ID: <strong className="text-amber-800">{viewingCert.credential_id}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500">Date of Award: {viewingCert.issue_date}</div>
                    <div className="text-[9px] text-emerald-600 font-bold mt-0.5">✓ Verified Digital Record</div>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-600 flex items-center justify-center mx-auto text-[8px] font-black uppercase text-amber-700 rotate-[-10deg] shadow-xs bg-amber-50">
                      NETLINK GOLD SEAL
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 mt-1">Program Director</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Certificate
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingCert(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
