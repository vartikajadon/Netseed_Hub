from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# --- SUMMARY SCHEMAS ---
class UsersSummary(BaseModel):
    total: int
    active: int
    super_admin_count: int
    hr_count: int
    mentor_count: int
    student_count: int

class StudentsSummary(BaseModel):
    total: int
    active: int
    enrolled: int
    completed: int
    on_hold: int
    terminated_dropped: int

class ProgramsSummary(BaseModel):
    total: int
    active: int
    inactive: int

class BatchesSummary(BaseModel):
    total: int
    active: int
    completed: int
    upcoming: int

class MentorsSummary(BaseModel):
    total: int
    active: int
    assigned_students_count: int

class TodayAttendanceSummary(BaseModel):
    present: int
    absent: int
    incomplete: int
    regularized: int
    not_marked: int
    total_marked: int
    present_percentage: float
    avg_working_hours: float

class FaceEnrollmentSummary(BaseModel):
    total: int
    enrolled: int
    pending: int
    requires_review: int
    enrolled_percentage: float

class CareerReadinessSummary(BaseModel):
    average_score: float
    ready_count: int
    needs_development_count: int
    not_ready_count: int

class SecurityAlertsSummary(BaseModel):
    total_alerts: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    device_violations: int
    gps_violations: int
    face_mismatches: int

class AdminDashboardSummaryResponse(BaseModel):
    users: UsersSummary
    students: StudentsSummary
    programs: ProgramsSummary
    batches: BatchesSummary
    mentors: MentorsSummary
    today_attendance: TodayAttendanceSummary
    face_enrollment: FaceEnrollmentSummary
    career_readiness: CareerReadinessSummary
    security_alerts: SecurityAlertsSummary
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# --- STUDENT OVERVIEW SCHEMAS ---
class StudentOverviewItem(BaseModel):
    id: str
    user_id: str
    roll_number: str
    full_name: str
    email: str
    phone: Optional[str] = None
    program_title: Optional[str] = None
    program_code: Optional[str] = None
    batch_name: Optional[str] = None
    mentor_name: Optional[str] = None
    enrollment_status: str
    face_enrollment_status: str
    attendance_rate: float
    career_readiness_score: float
    readiness_band: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class StudentOverviewResponse(BaseModel):
    total: int
    active_count: int
    completed_count: int
    on_hold_count: int
    terminated_dropped_count: int
    distribution: Dict[str, int]
    items: List[StudentOverviewItem]


# --- PROGRAM & BATCH SCHEMAS ---
class BatchItem(BaseModel):
    id: str
    name: str
    batch_type: str
    status: str
    start_date: date
    end_date: date
    mentor_name: Optional[str] = None
    student_count: int
    avg_attendance_pct: float

class ProgramBatchItem(BaseModel):
    id: str
    title: str
    code: str
    is_active: bool
    duration_weeks: int
    total_students: int
    active_students: int
    batch_count: int
    avg_attendance: float
    avg_readiness: float
    batches: List[BatchItem]

class ProgramBatchOverviewResponse(BaseModel):
    total_programs: int
    total_batches: int
    programs: List[ProgramBatchItem]


# --- ATTENDANCE OVERVIEW SCHEMAS ---
class BelowThresholdStudent(BaseModel):
    student_id: str
    roll_number: str
    full_name: str
    program_title: Optional[str] = None
    batch_name: Optional[str] = None
    total_recorded_days: int
    present_days: int
    attendance_rate: float
    threshold_rate: float = 75.0

class AttendanceDailyTrendItem(BaseModel):
    date: str
    present: int
    absent: int
    incomplete: int
    regularized: int
    avg_hours: float

class BatchAttendanceBreakdown(BaseModel):
    batch_id: str
    batch_name: str
    total_students: int
    present_count: int
    absent_count: int
    attendance_pct: float

class AttendanceOverviewResponse(BaseModel):
    today: TodayAttendanceSummary
    attendance_threshold: float = 75.0
    students_below_threshold: List[BelowThresholdStudent]
    pending_regularizations_count: int
    daily_trends: List[AttendanceDailyTrendItem]
    batch_breakdowns: List[BatchAttendanceBreakdown]


# --- TASK & SKILL SCHEMAS ---
class SkillLevelDistribution(BaseModel):
    beginner: int       # 0 - 40
    intermediate: int   # 41 - 70
    proficient: int     # 71 - 90
    expert: int         # 91 - 100

class SkillMetricItem(BaseModel):
    skill_name: str
    category: str
    average_score: float
    student_count: int
    evaluated_percentage: float

class StudentSkillGap(BaseModel):
    student_id: str
    roll_number: str
    full_name: str
    program_title: Optional[str] = None
    overall_skill_score: float
    gap_areas: List[str]

class TaskSkillOverviewResponse(BaseModel):
    tasks_assigned: int
    tasks_completed: int
    tasks_pending: int
    tasks_overdue: int
    avg_task_completion_pct: float
    avg_skill_score: float
    skill_distribution: SkillLevelDistribution
    top_skills: List[SkillMetricItem]
    students_with_skill_gaps: List[StudentSkillGap]


# --- CAREER READINESS SCHEMAS ---
class CareerReadinessStudentItem(BaseModel):
    student_id: str
    roll_number: str
    full_name: str
    program_title: Optional[str] = None
    batch_name: Optional[str] = None
    readiness_score: float
    category: str  # 'READY', 'DEVELOPMENT', 'NOT_READY'
    category_label: str
    attendance_score: float
    task_score: float
    skill_score: float
    project_score: float
    assessment_score: float
    mentor_score: float

class CareerReadinessResponse(BaseModel):
    average_score: float
    ready_count: int
    needs_development_count: int
    not_ready_count: int
    score_bands: Dict[str, Any]
    formula_weights: Dict[str, float]
    disclaimer: str
    students: List[CareerReadinessStudentItem]


# --- OUTCOMES SCHEMAS ---
class OutcomesResponse(BaseModel):
    ppo_offer_count: int
    extended_internship_count: int
    referred_dept_count: int
    completed_certificate_count: int
    not_continued_count: int
    dropped_out_count: int
    active_in_progress_count: int
    distribution: Dict[str, int]
    is_simulated: bool = False


# --- SECURITY & FRAUD ALERTS SCHEMAS ---
class SecurityAlertItem(BaseModel):
    id: str
    alert_type: str
    severity: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    title: str
    description: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    user_email: Optional[str] = None
    status: str    # 'DETECTED', 'INVESTIGATING', 'RESOLVED'
    timestamp: datetime

class SecurityAlertsResponse(BaseModel):
    total_alerts: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    items: List[SecurityAlertItem]


# --- RECENT ACTIVITY SCHEMAS ---
class ActivityItem(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

class RecentActivityResponse(BaseModel):
    total: int
    items: List[ActivityItem]
