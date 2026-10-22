from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = Field(..., description="Role must be STUDENT, MENTOR, HR, or SUPER_ADMIN")
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- GEOFENCE SCHEMAS ---
class GeofenceBase(BaseModel):
    name: str
    center_latitude: float
    center_longitude: float
    radius_meters: float = 100.0
    address: Optional[str] = None
    is_active: bool = True

class GeofenceCreate(GeofenceBase):
    pass

class GeofenceUpdate(BaseModel):
    name: Optional[str] = None
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None
    radius_meters: Optional[float] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class GeofenceResponse(GeofenceBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- PROGRAM SCHEMAS ---
class ProgramBase(BaseModel):
    title: str
    code: Optional[str] = None
    description: Optional[str] = None
    duration_weeks: Optional[int] = 12
    is_active: bool = True
    mentor_id: Optional[str] = None
    max_students: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    program_type: Optional[str] = None
    skills: Optional[List[str]] = None

    @field_validator("skills", mode="before")
    @classmethod
    def parse_skills(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_program_date(cls, v):
        if v is None or v == "" or (isinstance(v, str) and not v.strip()):
            return None
        if isinstance(v, str):
            v_str = v.strip()
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                try:
                    return datetime.strptime(v_str, fmt).date()
                except ValueError:
                    pass
        return v

class ProgramCreate(ProgramBase):
    created_by: Optional[str] = None

class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    duration_weeks: Optional[int] = None
    is_active: Optional[bool] = None
    mentor_id: Optional[str] = None
    max_students: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    program_type: Optional[str] = None
    skills: Optional[List[str]] = None

class ProgramResponse(ProgramBase):
    id: str
    created_by: Optional[str] = None
    mentor: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- BATCH SCHEMAS ---
class BatchBase(BaseModel):
    program_id: str
    name: str = ""
    batch_type: str = "TECH_MASTER" # 'TECH_MASTER', 'SHORT_DURATION', 'INTERNSHIP'
    training_duration_months: int = 6
    internship_duration_months: int = 6
    start_date: date
    end_date: Optional[date] = None
    geofence_id: Optional[str] = None
    mentor_id: Optional[str] = None
    status: str = "ACTIVE"

class BatchCreate(BatchBase):
    name: Optional[str] = None
    end_date: Optional[date] = None

class BatchUpdate(BaseModel):
    name: Optional[str] = None
    batch_type: Optional[str] = None
    training_duration_months: Optional[int] = None
    internship_duration_months: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    geofence_id: Optional[str] = None
    mentor_id: Optional[str] = None
    status: Optional[str] = None

class BatchResponse(BatchBase):
    id: str
    program: Optional[ProgramResponse] = None
    mentor: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- STUDENT SCHEMAS ---
class StudentBase(BaseModel):
    user_id: str
    program_id: Optional[str] = None
    batch_id: Optional[str] = None
    mentor_id: Optional[str] = None
    roll_number: str
    college_name: Optional[str] = None
    qualification: Optional[str] = None
    contact_number: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[date] = None
    guardian_name: Optional[str] = None
    marital_status: Optional[str] = None
    address: Optional[str] = None
    domicile: Optional[str] = None
    batch_type: Optional[str] = "TECH_MASTER" # 'TECH_MASTER', 'SHORT_DURATION', 'INTERNSHIP', 'SIX_MONTHS'
    total_fees: Optional[float] = None
    payment_mode: Optional[str] = "ONLINE" # 'CASH' or 'ONLINE'
    installment_type: Optional[str] = "ONE_TIME" # 'ONE_TIME' or 'TWO_INSTALLMENTS'
    start_date: Optional[date] = None
    enrollment_status: str = "ENROLLED"
    dropout_reason: Optional[str] = None
    dropout_date: Optional[date] = None
    dropout_marked_by: Optional[str] = None
    registered_device_id: Optional[str] = None
    face_enrollment_status: str = "NOT_ENROLLED"
    passout_year: Optional[int] = None
    cv_url: Optional[str] = None
    cv_file_name: Optional[str] = None
    cv_updated_at: Optional[datetime] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    project_status: Optional[str] = "NOT_ASSIGNED"
    project_url: Optional[str] = None
    project_assigned_at: Optional[datetime] = None
    project_submitted_at: Optional[datetime] = None

class StudentCreate(BaseModel):
    user_id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    program_id: Optional[str] = None
    batch_id: Optional[str] = None
    mentor_id: Optional[str] = None
    roll_number: str
    college_name: Optional[str] = None
    qualification: Optional[str] = None
    contact_number: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[date] = None
    guardian_name: Optional[str] = None
    marital_status: Optional[str] = None
    address: Optional[str] = None
    domicile: Optional[str] = None
    batch_type: Optional[str] = "TECH_MASTER"
    total_fees: Optional[float] = None
    payment_mode: Optional[str] = "ONLINE"
    installment_type: Optional[str] = "ONE_TIME"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    enrollment_status: str = "ENROLLED"
    registered_device_id: Optional[str] = None
    face_enrollment_status: str = "NOT_ENROLLED"
    passout_year: Optional[int] = None
    cv_url: Optional[str] = None
    cv_file_name: Optional[str] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None

    @field_validator("user_id", "program_id", "batch_id", "mentor_id", "college_name", "qualification", "contact_number", "guardian_name", "marital_status", "address", "domicile", "batch_type", "payment_mode", "installment_type", "enrollment_status", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("start_date", "end_date", "dob", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if v == "" or v is None or (isinstance(v, str) and not v.strip()):
            return None
        if isinstance(v, str):
            v_str = v.strip().split('T')[0]
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                try:
                    return datetime.strptime(v_str, fmt).date()
                except ValueError:
                    continue
        return v

    @field_validator("age", "total_fees", "passout_year", mode="before")
    @classmethod
    def empty_num_to_none(cls, v):
        if v == "" or v is None:
            return None
        try:
            return float(v) if "." in str(v) else int(v)
        except (ValueError, TypeError):
            return None

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    program_id: Optional[str] = None
    batch_id: Optional[str] = None
    mentor_id: Optional[str] = None
    college_name: Optional[str] = None
    qualification: Optional[str] = None
    contact_number: Optional[str] = None
    age: Optional[int] = None
    dob: Optional[date] = None
    guardian_name: Optional[str] = None
    marital_status: Optional[str] = None
    address: Optional[str] = None
    domicile: Optional[str] = None
    batch_type: Optional[str] = None
    total_fees: Optional[float] = None
    payment_mode: Optional[str] = None
    installment_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    enrollment_status: Optional[str] = None
    dropout_reason: Optional[str] = None
    dropout_date: Optional[date] = None
    dropout_marked_by: Optional[str] = None
    registered_device_id: Optional[str] = None
    face_enrollment_status: Optional[str] = None
    passout_year: Optional[int] = None
    cv_url: Optional[str] = None
    cv_file_name: Optional[str] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    project_status: Optional[str] = None
    project_url: Optional[str] = None

    @field_validator("program_id", "batch_id", "mentor_id", "college_name", "qualification", "contact_number", "guardian_name", "marital_status", "address", "domicile", "batch_type", "payment_mode", "installment_type", "enrollment_status", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("start_date", "end_date", "dob", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if v == "" or v is None or (isinstance(v, str) and not v.strip()):
            return None
        if isinstance(v, str):
            v_str = v.strip().split('T')[0]
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                try:
                    return datetime.strptime(v_str, fmt).date()
                except ValueError:
                    continue
        return v

    @field_validator("age", "passout_year", mode="before")
    @classmethod
    def empty_age_to_none(cls, v):
        if v == "" or v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

class StudentResponse(StudentBase):
    id: str
    user: Optional[UserResponse] = None
    program: Optional[ProgramResponse] = None
    batch: Optional[BatchResponse] = None
    mentor: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MentorAssignmentPayload(BaseModel):
    mentor_id: str

class StudentStatusPayload(BaseModel):
    status: str
    reason: Optional[str] = None

class PaginatedStudentList(BaseModel):
    items: List[StudentResponse]
    total: int
    skip: int
    limit: int


# --- DEVICE SCHEMAS ---
class DeviceBase(BaseModel):
    user_id: str
    student_id: Optional[str] = None
    device_fingerprint: str
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    status: str = "PENDING"

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    status: Optional[str] = None
    approved_by: Optional[str] = None

class DeviceResponse(DeviceBase):
    id: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- CONSENT SCHEMAS ---
class ConsentBase(BaseModel):
    user_id: str
    student_id: Optional[str] = None
    consent_type: str = "FACIAL_BIOMETRIC_ATTENDANCE"
    consent_version: str = "v1.0"
    is_granted: bool = True
    ip_address: Optional[str] = None

class ConsentCreate(ConsentBase):
    pass

class ConsentResponse(ConsentBase):
    id: str
    granted_at: datetime
    revoked_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- FACE TEMPLATE SCHEMAS ---
class FaceTemplateResponse(BaseModel):
    id: str
    user_id: str
    student_id: Optional[str] = None
    embedding_reference: str
    confidence_score: float
    quality_score: float
    enrolled_by: Optional[str] = None
    enrolled_at: datetime
    consent_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- AUDIT LOG SCHEMAS ---
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
