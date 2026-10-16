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
import { IssuedLetter, LetterCreatePayload, Student } from '../types';
import {
  Mail, FileText, Plus, Search, Upload, Printer, Download,
  CheckCircle2, Clock, Trash2, User, Building2, Send, Eye, AlertCircle
} from 'lucide-react';

const LETTER_TEMPLATES: Record<string, { title: string; body: string }> = {
  OFFER_LETTER: {
    title: 'Offer Letter - Trainee Engineer',
    body: `Dear {NAME},

We are pleased to offer you the position of Trainee Engineer at Netlink Software Group America Inc. under our netSEED Internship & Talent Acceleration Program.

During this program, you will undergo rigorous industry-standard hands-on training, mentored software development sprints, and real-world client engagements.

We look forward to welcoming you to the Netlink innovation family!

Sincerely,
HR & Talent Operations
Netlink Software Group America Inc.`,
  },
  INTERNSHIP_JOINING: {
    title: 'Internship Joining & Confirmation Letter',
    body: `Dear {NAME},

This letter confirms that your internship commencement has been formally approved and registered in our central lifecycle platform starting on {DATE}.

You will be assigned to batch curriculum and your primary mentor will supervise your daily code reviews and attendance milestones.

Welcome aboard!

HR Department
Netlink Software Group`,
  },
  COMPLETION_LETTER: {
    title: 'Internship & Traineeship Completion Letter',
    body: `To Whom It May Concern,

This is to certify that {NAME} has successfully completed the Traineeship Program at Netlink Software Group America Inc.

During this tenure, the candidate demonstrated outstanding technical capability, disciplined attendance, and excellent team collaboration skills.

We wish them all the best in their future career endeavors!

HR & Academic Partnerships
Netlink Software Group`,
  },
  RECOMMENDATION: {
    title: 'Letter of Recommendation',
    body: `To Whom It May Concern,

I am writing this letter of recommendation on behalf of {NAME}. During their engagement in our software engineering acceleration program, they consistently exhibited exemplary problem-solving skills, proactiveness, and high code quality.

They possess exceptional potential and I confidently recommend them for advanced engineering roles.

Lead Mentor & Program Management
Netlink Software Group`,
  },
  RELIEVING_LETTER: {
    title: 'Relieving & Clearance Letter',
    body: `Dear {NAME},

This is to confirm that you have been formally relieved from your traineeship role following completion of all program requirements and clearance of No Dues with all departments.

We thank you for your contributions and wish you great success ahead.

Human Resources Department
Netlink Software Group`,
  },
};

export const HRLetters: React.FC = () => {
  const { showToast } = useNotifications();

  const [letters, setLetters] = useState<IssuedLetter[]>([]);
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
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [letterType, setLetterType] = useState('OFFER_LETTER');
  const [letterTitle, setLetterTitle] = useState(LETTER_TEMPLATES.OFFER_LETTER.title);
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [letterContent, setLetterContent] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const [importedFileUrl, setImportedFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View / Print Modal
  const [viewingLetter, setViewingLetter] = useState<IssuedLetter | null>(null);

  const fetchLetters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [lets, studs] = await Promise.all([
        api.get<IssuedLetter[]>('/letters'),
        api.get<any>('/students?limit=200'),
      ]);
      setLetters(lets || []);
      const sList = Array.isArray(studs) ? studs : studs?.items || [];
      setStudents(sList);
    } catch (err: any) {
      setError(err.message || 'Failed to load letters.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const openCreateModal = () => {
    setFormError(null);
    setRecipientType('STUDENT');
    const firstStudent = students[0];
    setSelectedStudentId(firstStudent?.id || '');
    setCustomRecipientName('');
    setCustomRecipientEmail('');
    setLetterType('OFFER_LETTER');
    setLetterTitle(LETTER_TEMPLATES.OFFER_LETTER.title);
    setLetterDate(new Date().toISOString().split('T')[0]);

    // Apply template
    const tmpl = LETTER_TEMPLATES.OFFER_LETTER;
    const studentName = firstStudent?.user?.full_name || 'Trainee';
    setLetterContent(
      tmpl.body
        .replace('{NAME}', studentName)
        .replace('{DATE}', new Date().toISOString().split('T')[0])
    );
    setImportedFileName('');
    setImportedFileUrl('');
    setIsCreateModalOpen(true);
  };

  const handleTemplateChange = (type: string) => {
    setLetterType(type);
    const tmpl = LETTER_TEMPLATES[type] || { title: 'Official Letter', body: '' };
    setLetterTitle(tmpl.title);

    let recipientName = 'Trainee';
    if (recipientType === 'STUDENT') {
      const st = students.find((s) => s.id === selectedStudentId);
      if (st?.user?.full_name) recipientName = st.user.full_name;
    } else if (customRecipientName.trim()) {
      recipientName = customRecipientName.trim();
    }

    setLetterContent(
      tmpl.body
        .replace('{NAME}', recipientName)
        .replace('{DATE}', letterDate)
    );
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
    let email = '';
    let studentId: string | undefined = undefined;

    if (recipientType === 'STUDENT') {
      const st = students.find((s) => s.id === selectedStudentId);
      if (!st) {
        setFormError('Please select a student.');
        return;
      }
      studentId = st.id;
      name = st.user?.full_name || 'Student';
      email = st.user?.email || '';
    } else {
      if (!customRecipientName.trim()) {
        setFormError('Recipient name is required.');
        return;
      }
      name = customRecipientName.trim();
      email = customRecipientEmail.trim();
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload: LetterCreatePayload = {
        title: letterTitle.trim(),
        letter_type: letterType,
        recipient_student_id: studentId,
        recipient_name: name,
        recipient_email: email || undefined,
        issue_date: letterDate,
        content: letterContent.trim() || undefined,
        file_url: importedFileUrl || undefined,
        file_name: importedFileName || undefined,
      };

      await api.post('/letters', payload);
      showToast('Letter Issued Successfully', `Letter sent to ${name}.`, 'LETTER_ISSUED');
      setIsCreateModalOpen(false);
      await fetchLetters();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue letter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLetter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this letter record?')) return;
    try {
      await api.delete(`/letters/${id}`);
      showToast('Letter Record Deleted', 'Letter has been removed from archives.', 'LETTER_ISSUED');
      setLetters((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete letter.');
    }
  };

  // Filtered
  const filteredLetters = useMemo(() => {
    return letters.filter((l) => {
      if (typeFilter !== 'ALL' && l.letter_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          l.title.toLowerCase().includes(q) ||
          l.recipient_name.toLowerCase().includes(q) ||
          (l.recipient_email && l.recipient_email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [letters, typeFilter, searchQuery]);

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-800 text-white p-6 rounded-3xl shadow-lg border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Official Letters & Document Issuance</h1>
              <p className="text-xs text-purple-100 font-medium mt-0.5 max-w-xl">
                Generate and import Offer Letters, Internship Joining, Recommendations, and Relieving Letters with automated student notification and acknowledgment tracking.
              </p>
            </div>
          </div>

          <Button
            variant="white"
            size="md"
            onClick={openCreateModal}
            className="shadow-lg text-indigo-700 font-bold hover:bg-sky-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-indigo-700" />
            <span className="font-bold text-indigo-700">Issue / Import Letter</span>
          </Button>
        </div>

        {/* Analytics Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Letters Issued</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{letters.length}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Offer Letters</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {letters.filter((l) => l.letter_type === 'OFFER_LETTER').length}
              </div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion Letters</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {letters.filter((l) => l.letter_type === 'COMPLETION_LETTER').length}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Acknowledged</span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                {letters.filter((l) => l.status === 'ACKNOWLEDGED').length}
              </div>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
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
              placeholder="Search by recipient name, title, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {['ALL', 'OFFER_LETTER', 'INTERNSHIP_JOINING', 'COMPLETION_LETTER', 'RECOMMENDATION', 'RELIEVING_LETTER'].map(
              (type) => (
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
                    : type === 'OFFER_LETTER'
                    ? 'Offer'
                    : type === 'INTERNSHIP_JOINING'
                    ? 'Joining'
                    : type === 'COMPLETION_LETTER'
                    ? 'Completion'
                    : type === 'RECOMMENDATION'
                    ? 'Recommendation'
                    : 'Relieving'}
                </button>
              )
            )}
          </div>
        </div>

        {isLoading && <Loading message="Loading issued official letters..." />}
        {error && <ErrorMessage message={error} />}

        {/* Letters Table */}
        {!isLoading && filteredLetters.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Official Letters Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Issue an offer letter, joining confirmation, or completion certificate letter to send directly to recipient.
            </p>
            <Button variant="primary" size="sm" onClick={openCreateModal} className="mt-2 font-bold">
              <Plus className="w-4 h-4 mr-1" />
              Issue First Letter
            </Button>
          </div>
        ) : (
          !isLoading && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4">Recipient Name</th>
                    <th className="p-4">Letter Title</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Attachment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLetters.map((lettr) => (
                    <tr key={lettr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{lettr.recipient_name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{lettr.recipient_email || '—'}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{lettr.title}</td>
                      <td className="p-4">
                        <Badge variant="info">{lettr.letter_type.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{lettr.issue_date}</td>
                      <td className="p-4">
                        {lettr.status === 'ACKNOWLEDGED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                            <Clock className="w-3.5 h-3.5" /> Sent
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {lettr.file_name ? (
                          <span className="text-[11px] font-mono text-indigo-600 truncate max-w-[120px] block">
                            📎 {lettr.file_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Template</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewingLetter(lettr)}
                          className="text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLetter(lettr.id)}
                          className="text-rose-500 hover:text-rose-700 p-1.5"
                          title="Delete letter"
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

        {/* Modal 1: Issue / Import Letter */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Issue or Import Official Letter"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Recipient Mode Radio */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-bold">Select Recipient Target *</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="recType"
                    checked={recipientType === 'STUDENT'}
                    onChange={() => setRecipientType('STUDENT')}
                  />
                  <span>Registered Student / Trainee</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="recType"
                    checked={recipientType === 'CUSTOM'}
                    onChange={() => setRecipientType('CUSTOM')}
                  />
                  <span>Send to Custom Person by Name</span>
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
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    const st = students.find((s) => s.id === e.target.value);
                    if (st?.user?.full_name) {
                      const tmpl = LETTER_TEMPLATES[letterType];
                      if (tmpl) {
                        setLetterContent(tmpl.body.replace('{NAME}', st.user.full_name).replace('{DATE}', letterDate));
                      }
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  required
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.user?.full_name} ({st.roll_number}) - {st.user?.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Recipient Full Name *"
                  placeholder="e.g. Michael Scott"
                  value={customRecipientName}
                  onChange={(e) => setCustomRecipientName(e.target.value)}
                  required
                />
                <Input
                  label="Recipient Email Address"
                  type="email"
                  placeholder="e.g. michael@example.com"
                  value={customRecipientEmail}
                  onChange={(e) => setCustomRecipientEmail(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Letter Category *</label>
                <select
                  value={letterType}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="INTERNSHIP_JOINING">Internship Joining Letter</option>
                  <option value="COMPLETION_LETTER">Completion Letter</option>
                  <option value="RECOMMENDATION">Letter of Recommendation</option>
                  <option value="RELIEVING_LETTER">Relieving Letter</option>
                  <option value="WARNING_LETTER">Formal Notice / Warning</option>
                  <option value="CUSTOM">Custom Formal Letter</option>
                </select>
              </div>

              <Input
                label="Date of Issuance *"
                type="date"
                value={letterDate}
                onChange={(e) => setLetterDate(e.target.value)}
                required
              />
            </div>

            <Input
              label="Letter Subject / Title *"
              value={letterTitle}
              onChange={(e) => setLetterTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Letter Body Content (Editable)
              </label>
              <textarea
                value={letterContent}
                onChange={(e) => setLetterContent(e.target.value)}
                rows={6}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed font-sans"
              />
            </div>

            {/* Optional Import File Attachment */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                Or Import Any Letter Document (PDF / DOC / Image)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                <Send className="w-3.5 h-3.5 mr-1" />
                Send Letter
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: View / Print Letter */}
        <Modal
          isOpen={!!viewingLetter}
          onClose={() => setViewingLetter(null)}
          title={`Official Letter: ${viewingLetter?.title || ''}`}
        >
          {viewingLetter && (
            <div className="space-y-4 font-sans text-xs">
              {/* Formal Letterhead Preview */}
              <div className="p-8 bg-white text-slate-900 border border-slate-300 rounded-2xl space-y-6 shadow-sm print:shadow-none">
                {/* Letterhead Header */}
                <div className="flex items-center justify-between border-b-2 border-indigo-700 pb-4">
                  <div className="flex items-center gap-3">
                    <img src="/netseed-logo.jpg" alt="Netlink Logo" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <h2 className="text-base font-black tracking-tight text-indigo-900">
                        Netlink Software Group America Inc.
                      </h2>
                      <div className="text-[10px] text-slate-500 font-medium">
                        netSEED Lifecycle & Talent Acceleration Platform
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Date: <strong>{viewingLetter.issue_date}</strong></div>
                    <div className="font-mono text-[10px]">Ref: NL-LET-{viewingLetter.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-0.5 text-xs">
                  <div className="text-slate-500 uppercase tracking-wider font-bold text-[10px]">To:</div>
                  <div className="text-sm font-black text-slate-900">{viewingLetter.recipient_name}</div>
                  {viewingLetter.recipient_email && (
                    <div className="text-slate-600">{viewingLetter.recipient_email}</div>
                  )}
                </div>

                {/* Subject */}
                <div className="text-xs font-bold text-indigo-900 bg-indigo-50/70 p-2 rounded-lg">
                  Subject: {viewingLetter.title}
                </div>

                {/* Body Content */}
                <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-serif">
                  {viewingLetter.content}
                </div>

                {/* Attached File Preview if any */}
                {viewingLetter.file_url && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" /> Attached Document: {viewingLetter.file_name}
                    </div>
                    {viewingLetter.file_url.startsWith('data:image') && (
                      <img
                        src={viewingLetter.file_url}
                        alt="Attached document"
                        className="max-h-48 rounded-lg border object-contain mx-auto"
                      />
                    )}
                  </div>
                )}

                {/* Sign-off Seal */}
                <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-xs">Authorized Signatory</div>
                    <div className="text-[11px] text-slate-600">Netlink Human Resources Department</div>
                    <div className="text-[10px] text-emerald-600 font-bold">✓ Digitally Verified via netSEED Hub</div>
                  </div>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-[9px] font-black uppercase text-indigo-700 rotate-[-12deg]">
                    OFFICIAL SEAL
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print / Save PDF
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingLetter(null)}>
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
