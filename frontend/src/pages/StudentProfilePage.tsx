import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Student, formatBatchType } from '../types';
import { PhotoAdjusterModal } from '../components/PhotoAdjusterModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import {
  UserCheck,
  GraduationCap,
  Calendar,
  Lock,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Save,
  Move,
  FileText,
  ExternalLink,
  Download,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // CV / Resume upload state
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [cvSuccess, setCvSuccess] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  // Password management modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Student>('/students/me');
      setStudent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 400;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          setSelectedPhotoPreview(dataUrl);
          setIsAdjusterOpen(true);
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFittedPhoto = async (fittedDataUrl: string) => {
    setSelectedPhotoPreview(fittedDataUrl);
    setIsAdjusterOpen(false);
    await uploadPhoto(fittedDataUrl);
  };

  const uploadPhoto = async (avatarUrl: string | null) => {
    if (!user) return;
    setIsUpdatingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);
    try {
      await api.put(`/users/${user.id}`, { avatar_url: avatarUrl });
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              user: prev.user ? { ...prev.user, avatar_url: avatarUrl } : null,
            }
          : null
      );
      setPhotoSuccess(avatarUrl ? 'Photo updated successfully!' : 'Photo removed successfully!');
      setTimeout(() => setPhotoSuccess(null), 3000);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to update profile photo.');
    } finally {
      setIsUpdatingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const isDoc =
      validTypes.includes(file.type) ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.doc');

    if (!isDoc) {
      setCvError('Please select a valid document format (.pdf, .doc, or .docx).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCvError('File size exceeds 10MB limit. Please upload a smaller document.');
      return;
    }

    setIsUploadingCv(true);
    setCvError(null);
    setCvSuccess(null);

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      try {
        const dataUrl = readerEvent.target?.result as string;
        const res = await api.post<{ message: string; cv_url: string; cv_file_name: string; cv_updated_at: string }>(
          '/students/me/cv',
          {
            cv_url: dataUrl,
            cv_file_name: file.name,
          }
        );
        setStudent((prev) =>
          prev
            ? {
                ...prev,
                cv_url: res.cv_url,
                cv_file_name: res.cv_file_name,
                cv_updated_at: res.cv_updated_at,
              }
            : null
        );
        setCvSuccess('Your CV has been uploaded successfully! Mentors and HR can now view your profile resume.');
        setTimeout(() => setCvSuccess(null), 4000);
      } catch (err: any) {
        setCvError(err.message || 'Failed to upload CV document.');
      } finally {
        setIsUploadingCv(false);
        if (cvFileInputRef.current) cvFileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setCvError('Failed to read selected document.');
      setIsUploadingCv(false);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <Layout>
        <Loading fullScreen message="Loading your enrolled student profile..." />
      </Layout>
    );
  }

  if (error || !student) {
    return (
      <Layout>
        <ErrorMessage message={error || 'No enrolled student profile record found for your user identity.'} />
      </Layout>
    );
  }

  const currentAvatar = student.user?.avatar_url || user?.avatar_url;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt={user?.full_name || student.roll_number}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md ring-2 ring-indigo-500/20 shrink-0">
              {(user?.full_name || student.roll_number || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Enrolled Student Profile
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium">
              View your enrollment details, active program, assigned batch, and lead mentor.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Identity & Enrollment */}
          <Card title="Student Identity" subtitle="Registration & Roll Number">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Roll Number</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{student.roll_number}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Full Name</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{user?.full_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Email Address</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-xs">{user?.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">College / Institute</span>
                <span className="text-slate-700 dark:text-slate-300">{student.college_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Qualification</span>
                <span className="text-slate-700 dark:text-slate-300">{student.qualification || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Passout Year</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {student.passout_year ? String(student.passout_year) : 'N/A'}
                </span>
              </div>
              {student.domicile && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Domicile</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{student.domicile}</span>
                </div>
              )}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Enrollment Status</span>
                <Badge variant={student.enrollment_status === 'ACTIVE' ? 'success' : 'info'}>
                  {student.enrollment_status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Program & Mentor */}
          <Card title="Program & Financial Summary" subtitle="Curriculum & Fee Details">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Training Program</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {student.program?.title || student.program_id || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Program Batch</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {student.batch?.name || student.batch_id || 'Unassigned'}
                </span>
              </div>

              {/* Batch Type Duration Breakdown */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-indigo-700 dark:text-indigo-300">
                  <span>Batch Type: {formatBatchType(student.batch_type)}</span>
                  <Badge variant={student.batch_type === 'TECH_MASTER' ? 'info' : student.batch_type === 'INTERNSHIP' ? 'neutral' : 'success'}>
                    {student.batch_type === 'TECH_MASTER' ? '1 Year Total' : student.batch_type === 'INTERNSHIP' ? 'Industrial Training' : 'Short Duration'}
                  </Badge>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                  {student.batch_type === 'TECH_MASTER'
                    ? '6 Months Training + 6 Months Internship'
                    : student.batch_type === 'INTERNSHIP'
                    ? 'Industrial Live Projects & Practical Training'
                    : '3 Months Training + 3 Months Internship'}
                </div>
              </div>

              {/* Fees Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Total Course Fees:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹{student.total_fees ? student.total_fees.toLocaleString('en-IN') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Payment Plan:</span>
                  <span className="text-slate-900 dark:text-slate-200 font-medium">
                    {student.installment_type === 'TWO_INSTALLMENTS' ? '2 Time Installments (50%/50%)' : 'One Time Payment'} ({student.payment_mode || 'ONLINE'})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block flex items-center gap-1 font-medium">
                  <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Lead Mentor
                </span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {student.mentor?.full_name || (student.mentor_id ? 'Mentor Assigned' : 'Unassigned')}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-amber-500" /> Start Date
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{student.start_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-amber-500" /> End Date
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{student.end_date || 'N/A'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Student Photo & Biometrics */}
          <Card title="Student Photo & Biometrics" subtitle="Identity Baseline & Face Verification">
            <div className="space-y-4 text-xs">
              {/* Photo Display & Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center text-center shadow-xs">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="relative group">
                  {selectedPhotoPreview ? (
                    <img
                      src={selectedPhotoPreview}
                      alt="Selected Preview"
                      className="w-28 h-28 object-cover rounded-2xl border-2 border-emerald-500 shadow-md ring-4 ring-emerald-500/20"
                    />
                  ) : currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt={user?.full_name || student.roll_number}
                      className="w-28 h-28 object-cover rounded-2xl border-2 border-indigo-500/50 shadow-md ring-4 ring-indigo-500/10"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-900/30 dark:to-violet-900/30 border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 flex flex-col items-center justify-center text-indigo-500 dark:text-indigo-400">
                      <Camera className="w-8 h-8 mb-1 opacity-70" />
                      <span className="text-[11px] font-medium">No photo uploaded</span>
                    </div>
                  )}

                  {isUpdatingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUpdatingPhoto}
                    className="w-full sm:w-auto justify-center min-h-[38px]"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1 shrink-0" />
                    {selectedPhotoPreview ? 'Select Other Photo' : currentAvatar ? 'Change Photo' : 'Upload Photo'}
                  </Button>

                  {(currentAvatar || selectedPhotoPreview) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsAdjusterOpen(true)}
                      disabled={isUpdatingPhoto}
                      className="w-full sm:w-auto justify-center min-h-[38px]"
                    >
                      <Move className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400 shrink-0" /> Adjust & Fit Frame
                    </Button>
                  )}

                  {selectedPhotoPreview && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => uploadPhoto(selectedPhotoPreview)}
                      disabled={isUpdatingPhoto}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 w-full sm:w-auto justify-center min-h-[38px]"
                    >
                      <Save className="w-3.5 h-3.5 mr-1 shrink-0" /> Save Photo
                    </Button>
                  )}

                  {(currentAvatar || selectedPhotoPreview) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPhotoPreview(null);
                        if (currentAvatar) uploadPhoto(null);
                      }}
                      disabled={isUpdatingPhoto}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 w-full sm:w-auto justify-center min-h-[38px]"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 shrink-0" /> Remove
                    </Button>
                  )}
                </div>

                {photoSuccess && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {photoSuccess}
                  </div>
                )}
                {photoError && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> {photoError}
                  </div>
                )}
              </div>

              {/* Face Enrolled Status */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Face Enrollment</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Biometric Baseline</div>
                  </div>
                </div>
                <Badge variant={student.face_enrollment_status === 'ENROLLED' ? 'success' : 'neutral'}>
                  {student.face_enrollment_status}
                </Badge>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium shadow-xs">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span>Protected Fields: Program, Batch, Mentor, and Enrollment Status can only be modified by HR or Super Admin.</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 4: Resume / Curriculum Vitae (CV) */}
        <Card
          title="Curriculum Vitae (CV / Resume)"
          subtitle="Upload and manage your profile resume for Mentor project guidance and HR placement tracking"
        >
          <div className="space-y-4">
            <input
              type="file"
              ref={cvFileInputRef}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleCvSelect}
              className="hidden"
            />

            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {student.cv_file_name || (student.cv_url ? 'Resume_Document.pdf' : 'No Resume Uploaded')}
                    </h4>
                    {student.cv_url ? (
                      <Badge variant="success">Uploaded & Active</Badge>
                    ) : (
                      <Badge variant="warning">Pending Upload</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {student.cv_updated_at
                      ? `Last updated on ${new Date(student.cv_updated_at).toLocaleString()}`
                      : 'Accepts PDF, DOC, or DOCX formats up to 10MB.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {student.cv_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (student.cv_url) {
                        const win = window.open();
                        if (win) {
                          win.document.write(
                            `<iframe src="${student.cv_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                          );
                          win.document.title = student.cv_file_name || 'Student_CV';
                        } else {
                          window.open(student.cv_url, '_blank');
                        }
                      }
                    }}
                    className="flex-1 md:flex-none justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1 text-indigo-500" /> View CV
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => cvFileInputRef.current?.click()}
                  disabled={isUploadingCv}
                  className="flex-1 md:flex-none justify-center"
                >
                  {isUploadingCv ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {student.cv_url ? 'Replace / Update CV' : 'Upload CV'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {cvSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cvSuccess}</span>
              </div>
            )}

            {cvError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cvError}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Note: Mentors and HR team members can review your CV directly in their mentor dashboard and student profile sheets to track your qualifications and recommend project assignments.
            </p>
          </div>
        </Card>

        {/* Section 5: Account Security & Password Management */}
        <Card
          title="Account Security & Password"
          subtitle="Manage your credentials and maintain account security"
        >
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Account Password
                  </h4>
                  <Badge variant="success">Active & Protected</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Password: <span className="font-mono tracking-widest text-slate-700 dark:text-slate-300">••••••••••••</span>
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  For your privacy and security, change your password periodically. If you ever forget it, contact HR to reset your credentials.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full md:w-auto justify-center"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Change Password
            </Button>
          </div>
        </Card>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          requireCurrentPassword={true}
        />

        {/* Photo Adjuster Modal */}
        <PhotoAdjusterModal
          isOpen={isAdjusterOpen}
          imageSrc={selectedPhotoPreview || currentAvatar || null}
          onClose={() => setIsAdjusterOpen(false)}
          onSave={handleSaveFittedPhoto}
          isSaving={isUpdatingPhoto}
        />
      </div>
    </Layout>
  );
};
