from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ProjectBatchAssignPayload(BaseModel):
    project_title: str = Field(..., min_length=2, max_length=255)
    project_description: str = Field(..., min_length=5)
    student_ids: Optional[List[str]] = None  # None or empty = all students in batch

class ProjectStudentUpdatePayload(BaseModel):
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    project_status: Optional[str] = None  # 'NOT_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'
    project_url: Optional[str] = None

class StudentProjectSubmitPayload(BaseModel):
    project_url: str = Field(..., min_length=3, max_length=500)

class StudentCVUploadPayload(BaseModel):
    cv_url: str = Field(..., min_length=5)
    cv_file_name: Optional[str] = "Student_Resume.pdf"

class ProjectStudentItem(BaseModel):
    student_id: str
    student_name: str
    student_email: Optional[str] = None
    roll_number: str
    batch_id: str
    batch_name: str
    passout_year: Optional[int] = None
    cv_url: Optional[str] = None
    cv_file_name: Optional[str] = None
    cv_updated_at: Optional[datetime] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    project_status: str = "NOT_ASSIGNED"
    project_url: Optional[str] = None
    project_assigned_at: Optional[datetime] = None
    project_submitted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class ProjectBatchResponse(BaseModel):
    batch_id: str
    batch_name: str
    total_students: int
    assigned_count: int
    submitted_count: int
    students: List[ProjectStudentItem]
