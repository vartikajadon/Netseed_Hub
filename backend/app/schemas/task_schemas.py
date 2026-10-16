from datetime import datetime as dt_datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, description="Title of the task")
    description: Optional[str] = Field(None, description="Detailed instructions or markdown notes")
    file_url: Optional[str] = Field(None, description="Base64 or URL of imported PDF document")
    file_name: Optional[str] = Field(None, description="Original filename of imported PDF")
    batch_id: str = Field(..., description="ID of the active batch")
    due_date: dt_datetime = Field(..., description="Last date and time for task submission")
    assign_to_all: bool = Field(True, description="True if assigned to all students in batch")
    assigned_student_ids: Optional[List[str]] = Field(default=[], description="List of specific student IDs if not all")
    max_marks: int = Field(100, description="Total maximum score")

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    batch_id: str
    batch_name: Optional[str] = None
    mentor_id: Optional[str] = None
    mentor_name: Optional[str] = None
    due_date: dt_datetime
    assign_to_all: bool
    assigned_student_ids: Optional[List[str]] = []
    max_marks: int
    submission_count: int = 0
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)

class TaskSubmissionCreate(BaseModel):
    submission_type: str = Field("CODE_LINK", description="'CODE_LINK', 'TEXT_OUTPUT', or 'BOTH'")
    code_link: Optional[str] = Field(None, description="Git/GitHub/GitLab repository URL")
    text_output: Optional[str] = Field(None, description="Direct text output, console logs, or answer notes")
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class TaskEvaluationRequest(BaseModel):
    marks: float = Field(..., ge=0, description="Marks awarded to student")
    max_marks: Optional[int] = Field(100, description="Max possible marks")
    feedback: Optional[str] = Field(None, description="Mentor qualitative review")
    send_ack_student: bool = Field(False, description="Whether to dispatch acknowledgement with marks to student")
    send_ack_hr: bool = Field(False, description="Whether to dispatch acknowledgement with marks to HR")
    ack_message: Optional[str] = Field(None, description="Optional custom acknowledgement note")

class TaskSubmissionResponse(BaseModel):
    id: str
    task_id: str
    task_title: str
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    student_id: str
    student_name: str
    student_roll_no: str
    student_email: Optional[str] = None
    submission_type: str
    code_link: Optional[str] = None
    text_output: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    status: str
    marks: Optional[float] = None
    max_marks: int
    feedback: Optional[str] = None
    evaluated_by_name: Optional[str] = None
    evaluated_at: Optional[dt_datetime] = None
    ack_sent_to_student: bool
    ack_sent_to_hr: bool
    ack_message: Optional[str] = None
    due_date: Optional[dt_datetime] = None
    submitted_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)
