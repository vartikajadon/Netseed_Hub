from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AssessmentBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    level: str = Field("ENTRY_LEVEL", description="ENTRY_LEVEL, MIDDLE_LEVEL, or EXIT_LEVEL")
    batch_id: str
    scheduled_date: datetime
    duration_minutes: int = Field(60, ge=1)
    total_marks: int = Field(100, ge=1)
    passing_marks: int = Field(40, ge=1)
    paper_content: Optional[str] = None
    paper_file_url: Optional[str] = None
    paper_file_name: Optional[str] = None

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    batch_id: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[int] = None
    passing_marks: Optional[int] = None
    paper_content: Optional[str] = None
    paper_file_url: Optional[str] = None
    paper_file_name: Optional[str] = None
    is_unlocked: Optional[bool] = None

class AssessmentUnlockToggle(BaseModel):
    is_unlocked: bool

class AssessmentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    level: str
    batch_id: str
    batch_name: Optional[str] = None
    mentor_id: Optional[str] = None
    mentor_name: Optional[str] = None
    scheduled_date: datetime
    duration_minutes: int
    total_marks: int
    passing_marks: int
    paper_content: Optional[str] = None
    paper_file_url: Optional[str] = None
    paper_file_name: Optional[str] = None
    is_unlocked: bool
    is_visible_to_student: bool = True
    can_attempt: bool = False
    submission_count: int = 0
    has_submitted: Optional[bool] = False
    my_submission: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class AssessmentSubmissionCreate(BaseModel):
    submission_link: str = Field(..., max_length=500, description="Link to assessment solution repository, document, or code")
    submission_notes: Optional[str] = None
    answer_file_url: Optional[str] = None
    answer_file_name: Optional[str] = None

class AssessmentEvaluationRequest(BaseModel):
    marks_obtained: float = Field(..., ge=0)
    feedback: Optional[str] = None

class AssessmentSubmissionResponse(BaseModel):
    id: str
    assessment_id: str
    assessment_title: str
    assessment_level: str
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    student_id: str
    student_name: str
    student_roll_no: str
    student_email: Optional[str] = None
    submission_link: str
    submission_notes: Optional[str] = None
    answer_file_url: Optional[str] = None
    answer_file_name: Optional[str] = None
    status: str
    marks_obtained: Optional[float] = None
    total_marks: int = 100
    passing_marks: int = 40
    is_passed: Optional[bool] = None
    feedback: Optional[str] = None
    evaluated_by_name: Optional[str] = None
    evaluated_at: Optional[datetime] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}

class ScoreSheetEntry(BaseModel):
    assessment_id: str
    title: str
    status: str
    marks_obtained: Optional[float] = None
    total_marks: int
    passing_marks: int
    is_passed: Optional[bool] = None
    feedback: Optional[str] = None
    submission_link: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    evaluated_at: Optional[datetime] = None

class StudentScoreSheetItem(BaseModel):
    student_id: str
    student_name: str
    roll_number: str
    batch_id: str
    batch_name: str
    project_url: Optional[str] = None
    certificate_approved_by_mentor: bool = False
    certificate_approved_at: Optional[datetime] = None
    certificate_approved_by_name: Optional[str] = None
    entry_level: Optional[ScoreSheetEntry] = None
    middle_level: Optional[ScoreSheetEntry] = None
    exit_level: Optional[ScoreSheetEntry] = None
    total_obtained: float = 0.0
    total_max: float = 0.0
    percentage: float = 0.0
    final_status: str = "IN_PROGRESS"  # 'PASSED', 'FAILED', 'IN_PROGRESS'

class StudentScoresheetUpdate(BaseModel):
    project_url: Optional[str] = None
    certificate_approved_by_mentor: Optional[bool] = None

class AssessmentMarksDirectUpdate(BaseModel):
    assessment_id: str
    marks_obtained: float = Field(..., ge=0)
    feedback: Optional[str] = None

class BatchSendToManagementRequest(BaseModel):
    notes: Optional[str] = None

