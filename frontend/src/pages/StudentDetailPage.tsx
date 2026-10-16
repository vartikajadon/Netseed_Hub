import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { MentorSelectorModal } from '../components/MentorSelectorModal';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { StudentAttendanceCalendarModal } from '../components/StudentAttendanceCalendarModal';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { Student, formatBatchType } from '../types';
import { PhotoAdjusterModal } from '../components/PhotoAdjusterModal';
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  RefreshCw,
  UserCheck,
  Trash2,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  Save,
  Move,
  Cake,
} from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { student_id } = useParams<{ student_id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAssigningMentor, setIsAssigningMentor] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Photo management state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchDetails = async () => {
    if (!student_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Student>(`/students/${student_id}`);
      setStudent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load student detailed profile');
    } finally {
      setIsLoading(false);
    }
  };

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
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            width = maxSize;
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
    if (!student) return;
    setIsUpdatingPhoto(true);
    setPhotoError(null);
    setPhotoSuccess(null);
    try {
      await api.put(`/students/${student.id}`, { avatar_url: avatarUrl });
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              user: prev.user ? { ...prev.user, avatar_url: avatarUrl } : null,
            }
          : null
      );
      setSelectedPhotoPreview(null);
      setPhotoSuccess(avatarUrl ? 'Profile photo saved successfully!' : 'Photo removed successfully!');
      setTimeout(() => setPhotoSuccess(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to update student photo.');
    } finally {
      setIsUpdatingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteStudent = async () => {
    if (!student) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.delete(`/students/${student.id}`);
      navigate('/hr/students');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to remove student.');
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [student_id]);

  if (isLoading) {
    return (
      <Layout>
        <Loading fullScreen message="Loading student detailed profile..." />
      </Layout>
    );
  }

  if (error || !student) {
    return (
      <Layout>
        <div className="space-y-4">
          <Link to="/hr/students" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Roster
          </Link>
          <ErrorMessage message={error || 'Student not found'} />
        </div>
      </Layout>
    );
  }

  const isFaceEnrolled = student.face_enrollment_status === 'ENROLLED';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {student.user?.avatar_url ? (
              <img
                src={student.user.avatar_url}
                alt={student.user?.full_name || student.roll_number}
                className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-md ring-2 ring-indigo-500/20">
                {(student.user?.full_name || student.roll_number || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <Link to="/hr/students" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mb-1 font-medium">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Directory
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {student.user?.full_name || student.roll_number}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                Roll Number: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{student.roll_number}</span> | ID: {student.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCalendarOpen(true)}>
              <Calendar className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" /> Attendance Calendar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAssigningMentor(true)}>
              <UserCheck className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" /> Reassign Mentor
            </Button>
            <Button size="sm" variant="primary" onClick={() => setIsChangingStatus(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Change Status
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setDeleteError(null);
                setIsConfirmingDelete(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Student
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Section 1: Basic Information */}
          <Card title="Basic Information" subtitle="Trainee Identity & Status">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Enrollment Status</span>
                <Badge variant={student.enrollment_status === 'ACTIVE' ? 'success' : 'info'}>
                  {student.enrollment_status}
                </Badge>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{student.user?.full_name || 'N/A'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Email Address</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-xs">{student.user?.email || 'N/A'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Phone</span>
                <span className="text-slate-700 dark:text-slate-300">{student.user?.phone || 'N/A'}</span>
              </div>

              {student.dob && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Date of Birth (DOB)</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                    <Cake className="w-3.5 h-3.5 text-pink-500" />
                    {student.dob} {student.age ? `(${student.age} yrs)` : ''}
                  </span>
                </div>
              )}

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">College / Institute</span>
                <span className="text-slate-700 dark:text-slate-300">{student.college_name || 'N/A'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Degree Qualification</span>
                <span className="text-slate-700 dark:text-slate-300">{student.qualification || 'N/A'}</span>
              </div>

              {student.domicile && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Domicile</span>
                  <span className="text-slate-700 dark:text-slate-300">{student.domicile}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Section 2: Program & Batch Information */}
          <Card title="Program & Schedule" subtitle="Curriculum Assignment & Financials">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Training Program</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {student.program?.title || student.program_id || 'Unassigned'}
                </span>
                {student.program?.code && (
                  <Badge variant="neutral" className="ml-2">{student.program.code}</Badge>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Program Batch</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {student.batch?.name || student.batch_id || 'Unassigned'}
                </span>
              </div>

              {/* Batch Type Breakdown Card */}
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

              {/* Fees & Payment Info Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Total Course Fees:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹{student.total_fees ? student.total_fees.toLocaleString('en-IN') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Payment Mode:</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">{student.payment_mode || 'ONLINE'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Installment Plan:</span>
                  <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
                    {student.installment_type === 'TWO_INSTALLMENTS' ? '2 Time Installment (50%/50%)' : 'One Time (Full Payment)'}
                  </span>
                </div>
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

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Assigned Lead Mentor</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 mt-0.5">
                  <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {student.mentor?.full_name || (student.mentor_id ? 'Mentor Assigned' : 'Unassigned')}
                </span>
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
                  ) : student.user?.avatar_url ? (
                    <img
                      src={student.user.avatar_url}
                      alt={student.user?.full_name || student.roll_number}
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

                <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUpdatingPhoto}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    {selectedPhotoPreview ? 'Select Other Photo' : student.user?.avatar_url ? 'Change Photo' : 'Upload Photo'}
                  </Button>

                  {(student.user?.avatar_url || selectedPhotoPreview) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsAdjusterOpen(true)}
                      disabled={isUpdatingPhoto}
                    >
                      <Move className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" /> Adjust & Fit Frame
                    </Button>
                  )}

                  {selectedPhotoPreview && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => uploadPhoto(selectedPhotoPreview)}
                      disabled={isUpdatingPhoto}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" /> Save Photo
                    </Button>
                  )}

                  {(student.user?.avatar_url || selectedPhotoPreview) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPhotoPreview(null);
                        if (student.user?.avatar_url) uploadPhoto(null);
                      }}
                      disabled={isUpdatingPhoto}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
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
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Face Enrolled</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Biometric Baseline Sample</div>
                  </div>
                </div>
                <Badge variant={isFaceEnrolled ? 'success' : 'neutral'}>
                  {student.face_enrollment_status}
                </Badge>
              </div>

              {/* Data Security Guarantee */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-300 font-medium">
                Data Security Guarantee: Raw biometric images and vector embeddings are encrypted and never exposed over public API endpoints.
              </div>
            </div>
          </Card>
        </div>

        {/* Modals */}
        <MentorSelectorModal
          isOpen={isAssigningMentor}
          onClose={() => setIsAssigningMentor(false)}
          onSuccess={fetchDetails}
          student={student}
        />

        <StatusChangeModal
          isOpen={isChangingStatus}
          onClose={() => setIsChangingStatus(false)}
          onSuccess={fetchDetails}
          student={student}
        />

        <StudentAttendanceCalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          student={student}
        />

        {/* Remove Student Confirmation Modal */}
        <Modal
          isOpen={isConfirmingDelete}
          onClose={() => {
            if (!isDeleting) {
              setIsConfirmingDelete(false);
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
                "{student?.user?.full_name || student?.roll_number}"
              </strong>{' '}
              (Roll: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{student?.roll_number}</span>)?
            </p>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl leading-relaxed">
              Warning: This will permanently delete the student's enrollment profile, biometric face templates, device registrations, and attendance logs.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteStudent}
                isLoading={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Yes, Remove Student
              </Button>
            </div>
          </div>
        </Modal>

        {/* Interactive Photo Adjuster Modal */}
        <PhotoAdjusterModal
          isOpen={isAdjusterOpen}
          imageSrc={selectedPhotoPreview || student?.user?.avatar_url || null}
          onClose={() => setIsAdjusterOpen(false)}
          onSave={handleSaveFittedPhoto}
          isSaving={isUpdatingPhoto}
        />
      </div>
    </Layout>
  );
};
