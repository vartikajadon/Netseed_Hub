export type UserRole = 'STUDENT' | 'MENTOR' | 'HR' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  last_login_latitude?: number | null;
  last_login_longitude?: number | null;
  last_logout_at?: string | null;
  last_logout_latitude?: number | null;
  last_logout_longitude?: number | null;
}

export interface UserLocationLog {
  id: string;
  user_id: string;
  event_type: 'LOGIN' | 'LOGOUT';
  latitude?: number | null;
  longitude?: number | null;
  accuracy_meters?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  timestamp: string;
}

export type StudentStatus = 'ENROLLED' | 'ACTIVE' | 'ON_LEAVE' | 'COMPLETED' | 'DROPPED' | 'DROPOUT' | 'GRADUATED' | 'TERMINATED';
export type BatchType = 'TECH_MASTER' | 'SHORT_DURATION' | 'INTERNSHIP' | 'SIX_MONTHS';

export const BATCH_TYPE_OPTIONS = [
  { value: 'TECH_MASTER', label: 'Tech Masters (6m Training + 6m Internship)' },
  { value: 'SHORT_DURATION', label: 'Short Duration Course (3m Training + 3m Internship)' },
  { value: 'INTERNSHIP', label: 'Internship (1m Training + 3m Internship)' },
] as const;

export const DOMICILE_OPTIONS = [
  'Madhya Pradesh',
  'Other State',
  'Uttar Pradesh',
  'Chhattisgarh',
  'Rajasthan',
  'Bihar',
  'Maharashtra',
  'Delhi / NCR',
] as const;

export const formatBatchType = (type?: string | null): string => {
  if (!type) return 'Tech Masters';
  const upper = type.toUpperCase();
  if (upper === 'TECH_MASTER' || upper === 'TECH MASTER' || upper === 'TECH MASTERS') {
    return 'Tech Masters';
  }
  if (
    upper === 'SHORT_DURATION' ||
    upper === 'SHORT DURATION' ||
    upper === 'SHORT DURATION COURSE' ||
    upper === 'SIX_MONTHS' ||
    upper === '6 MONTHS' ||
    upper === '6 MONTHS PROGRAM'
  ) {
    return 'Short Duration Course';
  }
  if (upper === 'INTERNSHIP') {
    return 'Internship';
  }
  return type;
};

export type PaymentMode = 'CASH' | 'ONLINE';
export type InstallmentType = 'ONE_TIME' | 'TWO_INSTALLMENTS';

export interface Student {
  id: string;
  user_id: string;
  program_id?: string | null;
  batch_id?: string | null;
  mentor_id?: string | null;
  roll_number: string;
  college_name?: string | null;
  qualification?: string | null;
  contact_number?: string | null;
  age?: number | null;
  dob?: string | null;
  guardian_name?: string | null;
  marital_status?: string | null;
  address?: string | null;
  domicile?: string | null;
  batch_type?: BatchType | string | null;
  total_fees?: number | null;
  payment_mode?: PaymentMode | string | null;
  installment_type?: InstallmentType | string | null;
  start_date?: string | null;
  end_date?: string | null;
  enrollment_status: StudentStatus;
  dropout_reason?: string | null;
  dropout_date?: string | null;
  dropout_marked_by?: string | null;
  registered_device_id?: string | null;
  face_enrollment_status: 'NOT_ENROLLED' | 'PENDING' | 'ENROLLED';
  passout_year?: number | null;
  cv_url?: string | null;
  cv_file_name?: string | null;
  cv_updated_at?: string | null;
  project_title?: string | null;
  project_description?: string | null;
  project_status?: string | null;
  project_url?: string | null;
  project_assigned_at?: string | null;
  project_submitted_at?: string | null;
  certificate_approved_by_mentor?: boolean | null;
  certificate_approved_at?: string | null;
  certificate_approved_by?: string | null;
  user?: User | null;
  program?: Program | null;
  batch?: Batch | null;
  mentor?: User | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedStudentList {
  items: Student[];
  total: number;
  skip: number;
  limit: number;
}

export interface Program {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  duration_weeks: number;
  is_active: boolean;
  created_by?: string | null;
  mentor_id?: string | null;
  max_students?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  program_type?: string | null;
  skills?: string[] | string | null;
  mentor?: User | null;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  program_id: string;
  name: string;
  batch_type?: BatchType | string | null;
  training_duration_months?: number | null;
  internship_duration_months?: number | null;
  start_date: string;
  end_date: string;
  geofence_id?: string | null;
  mentor_id?: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  program?: Program | null;
  mentor?: User | null;
  created_at: string;
  updated_at: string;
}

export interface Geofence {
  id: string;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  address?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  student_id?: string | null;
  device_fingerprint: string;
  device_model?: string | null;
  os_version?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Consent {
  id: string;
  user_id: string;
  student_id?: string | null;
  consent_type: string;
  consent_version: string;
  is_granted: boolean;
  ip_address?: string | null;
  granted_at: string;
  revoked_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_values?: string | null;
  new_values?: string | null;
  ip_address?: string | null;
  timestamp: string;
}

export type AttendanceDailyStatus = 'PRESENT' | 'ABSENT' | 'INCOMPLETE' | 'REGULARIZED' | 'ON_LEAVE';

export interface AttendanceEvent {
  id: string;
  student_id: string;
  user_id: string;
  event_type: 'IN' | 'OUT';
  timestamp: string;
  date: string;
  latitude: number;
  longitude: number;
  distance_from_geofence_meters: number;
  is_geofence_valid: boolean;
  verification_method: string;
  liveness_score: number;
  face_match_confidence: number;
  device_fingerprint?: string | null;
}

export interface AttendanceDailyRecord {
  id: string;
  student_id: string;
  date: string;
  first_punch_in?: string | null;
  last_punch_out?: string | null;
  total_working_minutes: number;
  total_working_hours: number;
  punch_count: number;
  status: AttendanceDailyStatus;
  is_regularized: boolean;
  regularized_by?: string | null;
  regularized_at?: string | null;
  regularization_reason?: string | null;
  student?: Student | null;
}

export interface LivenessChallenge {
  challenge_token: string;
  challenge_type: string;
  instruction: string;
  expires_at: string;
}

export interface StudentAttendanceSummary {
  student_id: string;
  roll_number: string;
  student_name: string;
  date: string;
  status: AttendanceDailyStatus;
  total_working_hours: number;
  total_working_minutes: number;
  first_punch_in?: string | null;
  last_punch_out?: string | null;
  punch_count: number;
  events: AttendanceEvent[];
  is_geofence_valid: boolean;
  geofence_name: string;
  geofence_distance_meters: number;
}

// --- SUPER ADMIN DASHBOARD TYPES ---
export interface UsersSummary {
  total: number;
  active: number;
  super_admin_count: number;
  hr_count: number;
  mentor_count: number;
  student_count: number;
}

export interface StudentsSummary {
  total: number;
  active: number;
  enrolled: number;
  completed: number;
  on_hold: number;
  terminated_dropped: number;
}

export interface ProgramsSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface BatchesSummary {
  total: number;
  active: number;
  completed: number;
  upcoming: number;
}

export interface MentorsSummary {
  total: number;
  active: number;
  assigned_students_count: number;
}

export interface TodayAttendanceSummary {
  present: number;
  absent: number;
  incomplete: number;
  regularized: number;
  not_marked: number;
  total_marked: number;
  present_percentage: number;
  avg_working_hours: number;
}

export interface FaceEnrollmentSummary {
  total: number;
  enrolled: number;
  pending: number;
  requires_review: number;
  enrolled_percentage: number;
}

export interface CareerReadinessSummary {
  average_score: number;
  ready_count: number;
  needs_development_count: number;
  not_ready_count: number;
}

export interface SecurityAlertsSummary {
  total_alerts: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  device_violations: number;
  gps_violations: number;
  face_mismatches: number;
}

export interface AdminDashboardSummary {
  users: UsersSummary;
  students: StudentsSummary;
  programs: ProgramsSummary;
  batches: BatchesSummary;
  mentors: MentorsSummary;
  today_attendance: TodayAttendanceSummary;
  face_enrollment: FaceEnrollmentSummary;
  career_readiness: CareerReadinessSummary;
  security_alerts: SecurityAlertsSummary;
  generated_at: string;
}

export interface StudentOverviewItem {
  id: string;
  user_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  phone?: string | null;
  program_title?: string | null;
  program_code?: string | null;
  batch_name?: string | null;
  mentor_name?: string | null;
  enrollment_status: string;
  face_enrollment_status: string;
  attendance_rate: number;
  career_readiness_score: number;
  readiness_band: string;
  start_date?: string | null;
  end_date?: string | null;
}

export interface StudentOverviewData {
  total: number;
  active_count: number;
  completed_count: number;
  on_hold_count: number;
  terminated_dropped_count: number;
  distribution: Record<string, number>;
  items: StudentOverviewItem[];
}

export interface BatchItem {
  id: string;
  name: string;
  batch_type: string;
  status: string;
  start_date: string;
  end_date: string;
  mentor_name?: string | null;
  student_count: number;
  avg_attendance_pct: number;
}

export interface ProgramBatchItem {
  id: string;
  title: string;
  code: string;
  is_active: boolean;
  duration_weeks: number;
  total_students: number;
  active_students: number;
  batch_count: number;
  avg_attendance: number;
  avg_readiness: number;
  batches: BatchItem[];
}

export interface ProgramBatchOverviewData {
  total_programs: number;
  total_batches: number;
  programs: ProgramBatchItem[];
}

export interface BelowThresholdStudent {
  student_id: string;
  roll_number: string;
  full_name: string;
  program_title?: string | null;
  batch_name?: string | null;
  total_recorded_days: number;
  present_days: number;
  attendance_rate: number;
  threshold_rate: number;
}

export interface AttendanceDailyTrendItem {
  date: string;
  present: number;
  absent: number;
  incomplete: number;
  regularized: number;
  avg_hours: number;
}

export interface BatchAttendanceBreakdown {
  batch_id: string;
  batch_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_pct: number;
}

export interface AttendanceOverviewData {
  today: TodayAttendanceSummary;
  attendance_threshold: number;
  students_below_threshold: BelowThresholdStudent[];
  pending_regularizations_count: number;
  daily_trends: AttendanceDailyTrendItem[];
  batch_breakdowns: BatchAttendanceBreakdown[];
}

export interface SkillLevelDistribution {
  beginner: number;
  intermediate: number;
  proficient: number;
  expert: number;
}

export interface SkillMetricItem {
  skill_name: string;
  category: string;
  average_score: number;
  student_count: number;
  evaluated_percentage: number;
}

export interface StudentSkillGap {
  student_id: string;
  roll_number: string;
  full_name: string;
  program_title?: string | null;
  overall_skill_score: number;
  gap_areas: string[];
}

export interface TaskSkillOverviewData {
  tasks_assigned: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_overdue: number;
  avg_task_completion_pct: number;
  avg_skill_score: number;
  skill_distribution: SkillLevelDistribution;
  top_skills: SkillMetricItem[];
  students_with_skill_gaps: StudentSkillGap[];
}

export interface CareerReadinessStudentItem {
  student_id: string;
  roll_number: string;
  full_name: string;
  program_title?: string | null;
  batch_name?: string | null;
  readiness_score: number;
  category: string;
  category_label: string;
  attendance_score: number;
  task_score: number;
  skill_score: number;
  project_score: number;
  assessment_score: number;
  mentor_score: number;
}

export interface CareerReadinessData {
  average_score: number;
  ready_count: number;
  needs_development_count: number;
  not_ready_count: number;
  score_bands: Record<string, any>;
  formula_weights: Record<string, number>;
  disclaimer: string;
  students: CareerReadinessStudentItem[];
}

export interface OutcomesData {
  ppo_offer_count: number;
  extended_internship_count: number;
  referred_dept_count: number;
  completed_certificate_count: number;
  not_continued_count: number;
  dropped_out_count: number;
  active_in_progress_count: number;
  distribution: Record<string, number>;
  is_simulated: boolean;
}

export interface SecurityAlertItem {
  id: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  student_id?: string | null;
  student_name?: string | null;
  roll_number?: string | null;
  user_email?: string | null;
  status: 'DETECTED' | 'INVESTIGATING' | 'RESOLVED';
  timestamp: string;
}

export interface SecurityAlertsData {
  total_alerts: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  items: SecurityAlertItem[];
}

export interface ActivityItem {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  timestamp: string;
}

export interface RecentActivityData {
  total: number;
  items: ActivityItem[];
}

// Institution Training Interfaces
export interface InstitutionStudent {
  id: string;
  institution_training_id: string;
  student_name: string;
  student_roll_no: string;
  email?: string | null;
  contact_no?: string | null;
  course?: string | null;
  branch?: string | null;
  training?: string | null;
  cost_per_batch?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstitutionTraining {
  id: string;
  institution_name: string;
  training_title: string;
  batch_name: string;
  start_date?: string | null;
  end_date?: string | null;
  cost_per_batch: number;
  trainer_name?: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | string;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  student_count: number;
  students: InstitutionStudent[];
}

export interface InstitutionStudentCreatePayload {
  student_name: string;
  student_roll_no: string;
  email?: string;
  contact_no?: string;
  course?: string;
  branch?: string;
  training?: string;
  cost_per_batch?: number;
  notes?: string;
}

export interface InstitutionTrainingCreatePayload {
  institution_name: string;
  training_title: string;
  batch_name: string;
  start_date?: string;
  end_date?: string;
  cost_per_batch: number;
  trainer_name?: string;
  status?: string;
  description?: string;
  students?: InstitutionStudentCreatePayload[];
}

// Calendar Interfaces
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  event_type: 'FESTIVAL' | 'OFF_DAY' | 'BIRTHDAY' | 'EVENT' | 'BROADCAST' | string;
  is_off_day: boolean;
  person_name?: string | null;
  student_id?: string | null;
  batch_id?: string | null;
  batch_name?: string | null;
  target_scope?: 'ALL' | 'SPECIFIC_BATCH' | string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  is_recurring?: boolean;
  recurrence_pattern?: 'DAILY' | 'WEEKLY' | string | null;
  is_active_broadcast?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventCreatePayload {
  title: string;
  description?: string;
  date: string;
  event_type: string;
  is_off_day: boolean;
  person_name?: string;
  student_id?: string;
  batch_id?: string;
  target_scope?: 'ALL' | 'SPECIFIC_BATCH' | string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}

export interface BirthdayReminderItem {
  student_id: string;
  student_name: string;
  roll_number: string;
  email: string;
  contact_number: string;
  dob: string;
  celebration_date: string;
  days_until: number;
  turning_age?: number | null;
  program_title: string;
  batch_name: string;
  is_tomorrow: boolean;
  is_today: boolean;
}

export interface BirthdayRemindersResponse {
  today_count: number;
  one_day_before_count: number;
  one_day_before: BirthdayReminderItem[];
  today: BirthdayReminderItem[];
  upcoming_7_days: BirthdayReminderItem[];
  upcoming_month: BirthdayReminderItem[];
}

// Attendance Regularization Request Interfaces
export interface RegularizationRequest {
  id: string;
  student_id: string;
  student_name?: string | null;
  roll_number?: string | null;
  attendance_record_id?: string | null;
  date: string;
  requested_by: string;
  reason: string;
  proposed_working_hours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  assigned_to_name: string;
  assigned_to_email: string;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegularizationRequestCreatePayload {
  date: string;
  reason: string;
  attendance_record_id?: string;
  proposed_working_hours: number;
}

export interface RegularizationRequestReviewPayload {
  action: 'APPROVE' | 'REJECT';
  review_notes?: string;
  status?: string;
  override_working_hours?: number;
}

// ----------------------------------------------------
// NO DUES TYPES
// ----------------------------------------------------
export interface NoDuesChecklistItem {
  id: string;
  item_name: string;
  department: string;
  is_cleared: boolean;
  student_remarks?: string | null;
  cleared_at?: string | null;
}

export interface NoDuesTemplateOption {
  id: string;
  item_name: string;
  department: string;
  is_required: boolean;
  created_at: string;
}

export interface NoDuesRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_roll_no: string;
  student_email?: string | null;
  title: string;
  status: 'PENDING_STUDENT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  checklist_items: NoDuesChecklistItem[];
  remarks?: string | null;
  student_notes?: string | null;
  rejection_reason?: string | null;
  issued_by_name?: string | null;
  reviewed_by_name?: string | null;
  issued_at: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  updated_at: string;
}

export interface NoDuesCreatePayload {
  student_id: string;
  title: string;
  checklist_items: NoDuesChecklistItem[];
  remarks?: string;
}

// ----------------------------------------------------
// FEES & PAYMENTS TYPES
// ----------------------------------------------------
export interface FeePayment {
  id: string;
  student_id: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
  transaction_reference?: string | null;
  receipt_number?: string | null;
  notes?: string | null;
  received_by_name?: string | null;
  created_at: string;
}

export interface StudentFeeSummary {
  student_id: string;
  user_id: string;
  full_name: string;
  roll_number: string;
  email: string;
  contact_number?: string | null;
  batch_name?: string | null;
  total_fees: number;
  total_paid: number;
  remaining_fees: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
  payment_mode?: string | null;
  installment_type?: string | null;
  payments_count: number;
  last_payment_date?: string | null;
  payments: FeePayment[];
}

export interface FeePaymentCreatePayload {
  student_id: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
  transaction_reference?: string;
  receipt_number?: string;
  notes?: string;
}

// ----------------------------------------------------
// OFFICIAL LETTERS TYPES
// ----------------------------------------------------
export interface IssuedLetter {
  id: string;
  title: string;
  letter_type: string;
  recipient_student_id?: string | null;
  recipient_name: string;
  recipient_email?: string | null;
  issued_by_name?: string | null;
  issue_date: string;
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  status: 'SENT' | 'ACKNOWLEDGED' | 'ARCHIVED';
  acknowledged_at?: string | null;
  created_at: string;
}

export interface LetterCreatePayload {
  title: string;
  letter_type: string;
  recipient_student_id?: string;
  recipient_name: string;
  recipient_email?: string;
  issue_date: string;
  content?: string;
  file_url?: string;
  file_name?: string;
}

// ----------------------------------------------------
// CERTIFICATES TYPES
// ----------------------------------------------------
export interface IssuedCertificate {
  id: string;
  title: string;
  certificate_type: string;
  recipient_student_id?: string | null;
  recipient_name: string;
  recipient_roll_no?: string | null;
  issue_date: string;
  credential_id: string;
  issued_by_name?: string | null;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  status: 'ISSUED' | 'VERIFIED' | 'REVOKED';
  created_at: string;
}

export interface CertificateCreatePayload {
  title: string;
  certificate_type: string;
  recipient_student_id?: string;
  recipient_name: string;
  recipient_roll_no?: string;
  issue_date: string;
  credential_id?: string;
  description?: string;
  file_url?: string;
  file_name?: string;
}

// ----------------------------------------------------
// NOTIFICATIONS TYPES
// ----------------------------------------------------
export type NotificationType =
  | 'TASK_COMPLETED'
  | 'ACKNOWLEDGEMENT'
  | 'NO_DUES'
  | 'FEE_PAYMENT'
  | 'LETTER_ISSUED'
  | 'CERTIFICATE_ISSUED'
  | 'GENERAL';

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  target_role?: string | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCreatePayload {
  user_id?: string;
  target_role?: string;
  title: string;
  message: string;
  notification_type?: NotificationType;
  link_url?: string;
}

// ----------------------------------------------------
// TRAINER LEAVES TYPES
// ----------------------------------------------------
export interface TrainerLeave {
  id: string;
  trainer_id: string;
  trainer_name: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: 'ON_LEAVE' | 'COMPLETED' | 'CANCELLED' | string;
  substitute_trainer_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface TrainerLeaveCreatePayload {
  trainer_id: string;
  trainer_name?: string;
  start_date: string;
  end_date: string;
  reason?: string;
  substitute_trainer_name?: string;
  notes?: string;
}

// ----------------------------------------------------
// TASK ASSIGNMENT & EVALUATION TYPES
// ----------------------------------------------------
export interface AssignedTask {
  id: string;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  batch_id: string;
  batch_name?: string | null;
  mentor_id?: string | null;
  mentor_name?: string | null;
  due_date: string;
  assign_to_all: boolean;
  assigned_student_ids?: string[];
  max_marks: number;
  submission_count: number;
  created_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  batch_id: string;
  due_date: string;
  assign_to_all: boolean;
  assigned_student_ids?: string[];
  max_marks?: number;
}

export interface TaskSubmissionItem {
  id: string;
  task_id: string;
  task_title: string;
  batch_id?: string | null;
  batch_name?: string | null;
  student_id: string;
  student_name: string;
  student_roll_no: string;
  student_email?: string | null;
  submission_type: 'CODE_LINK' | 'TEXT_OUTPUT' | 'BOTH' | string;
  code_link?: string | null;
  text_output?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  status: 'PENDING_EVALUATION' | 'EVALUATED' | string;
  marks?: number | null;
  max_marks: number;
  feedback?: string | null;
  evaluated_by_name?: string | null;
  evaluated_at?: string | null;
  ack_sent_to_student: boolean;
  ack_sent_to_hr: boolean;
  ack_message?: string | null;
  due_date?: string | null;
  submitted_at: string;
}

export interface TaskEvaluationPayload {
  marks: number;
  max_marks?: number;
  feedback?: string;
  send_ack_student: boolean;
  send_ack_hr: boolean;
  ack_message?: string;
}

export type TaskResponse = AssignedTask;
export type TaskSubmissionResponse = TaskSubmissionItem;

export interface MentorFeedbackItem {
  id: string;
  student_id: string;
  student_name?: string | null;
  student_roll_number?: string | null;
  mentor_id: string;
  mentor_name?: string | null;
  technical_skills: number;
  task_performance: number;
  communication: number;
  punctuality_professionalism: number;
  learning_attitude: number;
  average_rating: number;
  comment: string;
  created_at: string;
}

export interface MentorFeedbackCreatePayload {
  student_id: string;
  technical_skills: number;
  task_performance: number;
  communication: number;
  punctuality_professionalism: number;
  learning_attitude: number;
  comment: string;
}

export interface CurriculumTopicItem {
  id: string;
  program_id: string;
  module_name: string;
  title: string;
  description?: string | null;
  order_index: number;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by_id?: string | null;
  completed_by_name?: string | null;
  assessment_name?: string | null;
  notes?: string | null;
}

export interface ProgramCurriculum {
  program_id: string;
  program_title: string;
  program_code: string;
  batch_id?: string | null;
  batch_name?: string | null;
  total_topics: number;
  completed_topics: number;
  completion_percentage: number;
  is_published: boolean;
  topics: CurriculumTopicItem[];
}

export interface TopicProgressUpdatePayload {
  is_completed: boolean;
  batch_id?: string | null;
  assessment_name?: string | null;
  notes?: string | null;
}

export interface CurriculumImportItem {
  module_name: string;
  title: string;
  description?: string;
  order_index?: number;
}

export interface CurriculumImportPayload {
  topics: CurriculumImportItem[];
  replace_existing: boolean;
}

export interface CurriculumPublishPayload {
  is_published: boolean;
}

// -------------------------------------------------------------
// Assessment Lifecycle Types
// -------------------------------------------------------------
export type AssessmentLevel = 'ENTRY_LEVEL' | 'MIDDLE_LEVEL' | 'EXIT_LEVEL';

export interface Assessment {
  id: string;
  title: string;
  description?: string | null;
  level: AssessmentLevel;
  batch_id: string;
  batch_name?: string | null;
  mentor_id?: string | null;
  mentor_name?: string | null;
  scheduled_date: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  paper_content?: string | null;
  paper_file_url?: string | null;
  paper_file_name?: string | null;
  skill_unlocked?: string | null;
  is_unlocked: boolean;
  is_visible_to_student: boolean;
  can_attempt: boolean;
  submission_count: number;
  has_submitted?: boolean;
  my_submission?: {
    id: string;
    submission_link: string;
    submission_notes?: string | null;
    status: string;
    marks_obtained?: number | null;
    total_marks: number;
    passing_marks: number;
    feedback?: string | null;
    submitted_at?: string | null;
    evaluated_at?: string | null;
  } | null;
  created_at: string;
}

export interface AssessmentCreatePayload {
  title: string;
  description?: string;
  level: AssessmentLevel;
  batch_id: string;
  scheduled_date: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  paper_content?: string;
  paper_file_url?: string;
  paper_file_name?: string;
  skill_unlocked?: string;
}

export interface StudentCurriculumSkillItem {
  id: string;
  skill_name: string;
  module_name: string;
  level: 'ENTRY_LEVEL' | 'MIDDLE_LEVEL' | 'EXIT_LEVEL';
  level_label: 'Beginner' | 'Intermediate' | 'Advanced';
  is_unlocked: boolean;
  status: 'UNLOCKED' | 'LOCKED';
  unlocked_at?: string | null;
  unlocked_by_name?: string | null;
  assessment_id?: string | null;
  assessment_title?: string | null;
  marks_obtained?: number | null;
  total_marks?: number | null;
  passing_marks?: number | null;
  score_percentage?: number | null;
  description?: string | null;
}

export interface StudentCurriculumSkillsResponse {
  program_id?: string | null;
  program_title?: string | null;
  batch_name?: string | null;
  student_name: string;
  student_roll_no: string;
  total_skills: number;
  unlocked_skills: number;
  locked_skills: number;
  completion_percentage: number;
  skills: StudentCurriculumSkillItem[];
}

export interface AssessmentSubmission {
  id: string;
  assessment_id: string;
  assessment_title: string;
  assessment_level: AssessmentLevel;
  batch_id?: string | null;
  batch_name?: string | null;
  student_id: string;
  student_name: string;
  student_roll_no: string;
  student_email?: string | null;
  submission_link: string;
  submission_notes?: string | null;
  answer_file_url?: string | null;
  answer_file_name?: string | null;
  status: 'SUBMITTED' | 'EVALUATED';
  marks_obtained?: number | null;
  total_marks: number;
  passing_marks: number;
  is_passed?: boolean | null;
  feedback?: string | null;
  evaluated_by_name?: string | null;
  evaluated_at?: string | null;
  submitted_at: string;
}

export interface ScoreSheetAssessmentEntry {
  assessment_id: string;
  title: string;
  status: string;
  marks_obtained?: number | null;
  total_marks: number;
  passing_marks: number;
  is_passed?: boolean | null;
  feedback?: string | null;
  submission_link?: string | null;
  scheduled_date?: string | null;
  submitted_at?: string | null;
  evaluated_at?: string | null;
}

export interface ScoreSheetRow {
  student_id: string;
  student_name: string;
  roll_number: string;
  batch_id: string;
  batch_name: string;
  project_url?: string | null;
  certificate_approved_by_mentor: boolean;
  certificate_approved_at?: string | null;
  certificate_approved_by_name?: string | null;
  entry_level?: ScoreSheetAssessmentEntry | null;
  middle_level?: ScoreSheetAssessmentEntry | null;
  exit_level?: ScoreSheetAssessmentEntry | null;
  total_obtained: number;
  total_max: number;
  percentage: number;
  final_status: 'PASSED' | 'FAILED' | 'IN_PROGRESS' | 'NOT_STARTED';
}

export interface TrainerFeedbackItem {
  id: string;
  student_id?: string | null;
  student_name: string;
  student_roll_no?: string | null;
  trainer_id: string;
  trainer_name: string;
  batch_id?: string | null;
  batch_name?: string | null;
  is_anonymous: boolean;
  technical_rating?: number | null;
  technical_text?: string | null;
  teaching_rating?: number | null;
  teaching_text?: string | null;
  doubt_solving_rating?: number | null;
  doubt_solving_text?: string | null;
  practical_guidance_rating?: number | null;
  practical_guidance_text?: string | null;
  communication_rating?: number | null;
  communication_text?: string | null;
  overall_feedback_text?: string | null;
  average_rating?: number | null;
  created_at: string;
}

export interface TrainerOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
  batch_id?: string | null;
  batch_name?: string | null;
}

export interface ProjectStudentItem {
  student_id: string;
  student_name: string;
  student_email?: string | null;
  roll_number: string;
  batch_id: string;
  batch_name: string;
  passout_year?: number | null;
  cv_url?: string | null;
  cv_file_name?: string | null;
  cv_updated_at?: string | null;
  project_title?: string | null;
  project_description?: string | null;
  project_status: string;
  project_url?: string | null;
  project_assigned_at?: string | null;
  project_submitted_at?: string | null;
}

export interface ProjectBatchResponse {
  batch_id: string;
  batch_name: string;
  total_students: number;
  assigned_count: number;
  submitted_count: number;
  students: ProjectStudentItem[];
}







