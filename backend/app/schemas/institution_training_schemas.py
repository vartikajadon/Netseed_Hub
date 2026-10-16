from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class InstitutionStudentBase(BaseModel):
    student_name: str = Field(..., min_length=1, description="Student full name")
    student_roll_no: str = Field(..., min_length=1, description="Student roll number / enrollment ID")
    email: Optional[str] = None
    contact_no: Optional[str] = None
    course: Optional[str] = None  # e.g., B.Tech, MCA, BCA
    branch: Optional[str] = None  # e.g., Computer Science, IT, EC
    training: Optional[str] = None  # e.g., Full Stack Development, Data Science
    cost_per_batch: Optional[float] = Field(None, ge=0.0, description="Cost in value per batch")
    notes: Optional[str] = None

class InstitutionStudentCreate(InstitutionStudentBase):
    pass

class InstitutionStudentUpdate(BaseModel):
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None
    email: Optional[str] = None
    contact_no: Optional[str] = None
    course: Optional[str] = None
    branch: Optional[str] = None
    training: Optional[str] = None
    cost_per_batch: Optional[float] = None
    notes: Optional[str] = None

class InstitutionStudentResponse(InstitutionStudentBase):
    id: str
    institution_training_id: str
    created_at: dt_datetime
    updated_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)


class InstitutionTrainingBase(BaseModel):
    institution_name: str = Field(..., min_length=1, description="Institution / College name")
    training_title: str = Field(..., min_length=1, description="Training curriculum title")
    batch_name: str = Field(..., min_length=1, description="Institution batch name or code")
    start_date: Optional[dt_date] = None
    end_date: Optional[dt_date] = None
    cost_per_batch: float = Field(0.0, ge=0.0, description="Cost in value per batch")
    trainer_name: Optional[str] = None
    status: str = Field("ACTIVE", description="'UPCOMING', 'ACTIVE', 'COMPLETED'")
    description: Optional[str] = None

class InstitutionTrainingCreate(InstitutionTrainingBase):
    students: Optional[List[InstitutionStudentCreate]] = []

class InstitutionTrainingUpdate(BaseModel):
    institution_name: Optional[str] = None
    training_title: Optional[str] = None
    batch_name: Optional[str] = None
    start_date: Optional[dt_date] = None
    end_date: Optional[dt_date] = None
    cost_per_batch: Optional[float] = None
    trainer_name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class InstitutionTrainingResponse(InstitutionTrainingBase):
    id: str
    created_by: Optional[str] = None
    created_at: dt_datetime
    updated_at: dt_datetime
    student_count: int = 0
    students: List[InstitutionStudentResponse] = []

    model_config = ConfigDict(from_attributes=True)
