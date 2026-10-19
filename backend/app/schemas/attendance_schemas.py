from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator, field_serializer
from app.schemas.all_schemas import StudentResponse, UserResponse

class FaceEnrollmentRequest(BaseModel):
    student_id: str = Field(..., description="Target student ID for enrollment")
    consent_granted: bool = Field(True, description="Explicit user biometric consent granted")
    consent_version: str = Field("v1.0", description="Biometric privacy consent version")
    face_image_base64: Optional[str] = Field(None, description="Captured facial baseline image or embedding sample")
    face_samples: Optional[List[str]] = Field(None, description="3-5 captured facial baseline images for multi-sample centroid enrollment")
    quality_score: float = Field(0.95, ge=0.0, le=1.0)

class FaceEnrollmentResponse(BaseModel):
    student_id: str
    face_enrollment_status: str
    template_id: str
    confidence_score: float
    quality_score: float
    enrolled_at: dt_datetime

class LivenessChallengeResponse(BaseModel):
    challenge_token: str
    challenge_type: str  # 'BLINK', 'HEAD_TURN_LEFT', 'HEAD_TURN_RIGHT', 'SMILE'
    instruction: str
    expires_at: dt_datetime

class AttendancePunchRequest(BaseModel):
    event_type: str = Field(..., description="Punch event type: IN or OUT")
    latitude: float = Field(..., description="Device GPS latitude coordinate")
    longitude: float = Field(..., description="Device GPS longitude coordinate")
    gps_accuracy_meters: Optional[float] = Field(None, description="Reported GPS accuracy radius in meters from browser Geolocation")
    challenge_token: str = Field(..., description="Active liveness challenge token")
    liveness_proof_base64: Optional[str] = Field(None, description="Live facial snapshot or liveness challenge proof")
    device_fingerprint: Optional[str] = Field(None, description="Optional device hardware fingerprint (no device registration required)")

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v):
        v_upper = v.upper().strip()
        if v_upper not in ("IN", "OUT"):
            raise ValueError("Event type must be either 'IN' or 'OUT'")
        return v_upper

class AttendanceEventResponse(BaseModel):
    id: str
    student_id: str
    user_id: str
    event_type: str
    timestamp: dt_datetime
    date: dt_date
    latitude: float
    longitude: float
    distance_from_geofence_meters: float
    is_geofence_valid: bool
    verification_method: str
    liveness_score: float
    face_match_confidence: float
    device_fingerprint: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("timestamp", check_fields=False)
    def serialize_timestamp(self, dt: Optional[dt_datetime]) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat() + "Z" if dt.tzinfo is None else dt.isoformat()

class AttendanceDailyRecordResponse(BaseModel):
    id: str
    student_id: str
    date: dt_date
    first_punch_in: Optional[dt_datetime] = None
    last_punch_out: Optional[dt_datetime] = None
    total_working_minutes: int
    total_working_hours: float
    punch_count: int
    status: str  # 'PRESENT', 'ABSENT', 'INCOMPLETE', 'REGULARIZED'
    is_regularized: bool
    regularized_by: Optional[str] = None
    regularized_at: Optional[dt_datetime] = None
    regularization_reason: Optional[str] = None
    student: Optional[StudentResponse] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("first_punch_in", "last_punch_out", "regularized_at", check_fields=False)
    def serialize_daily_dts(self, dt: Optional[dt_datetime]) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat() + "Z" if dt.tzinfo is None else dt.isoformat()

class AttendanceRegularizePayload(BaseModel):
    attendance_record_id: str = Field(..., description="Target daily attendance record ID")
    status: str = Field("REGULARIZED", description="New regularized status: PRESENT, ABSENT, or REGULARIZED")
    override_working_hours: float = Field(8.0, ge=0.0, le=24.0, description="Override total daily working hours")
    reason: str = Field(..., min_length=5, description="Mandatory business reason for attendance regularization")

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError("Reason for regularization must be at least 5 characters long")
        return v.strip()

class StudentAttendanceSummaryResponse(BaseModel):
    student_id: str
    roll_number: str
    student_name: str
    date: dt_date
    status: str  # 'PRESENT', 'ABSENT', 'INCOMPLETE', 'REGULARIZED'
    total_working_hours: float
    total_working_minutes: int
    first_punch_in: Optional[dt_datetime] = None
    last_punch_out: Optional[dt_datetime] = None
    punch_count: int
    events: List[AttendanceEventResponse] = []
    is_geofence_valid: bool = True
    geofence_name: str = "Netlink Main Campus HQ"
    geofence_distance_meters: float = 0.0

    @field_serializer("first_punch_in", "last_punch_out", check_fields=False)
    def serialize_summary_dts(self, dt: Optional[dt_datetime]) -> Optional[str]:
        if dt is None:
            return None
        return dt.isoformat() + "Z" if dt.tzinfo is None else dt.isoformat()


class RegularizationRequestCreate(BaseModel):
    date: dt_date = Field(..., description="Date for which regularization is requested")
    reason: str = Field(..., min_length=3, description="Note explaining why attendance was missed / needs regularization")
    attendance_record_id: Optional[str] = Field(None, description="Optional target daily attendance record ID")
    proposed_working_hours: float = Field(8.0, ge=0.0, le=24.0, description="Proposed working hours")


class RegularizationRequestReview(BaseModel):
    action: str = Field(..., description="'APPROVE' or 'REJECT'")
    review_notes: Optional[str] = Field(None, description="HR response note")
    status: Optional[str] = Field("REGULARIZED", description="Regularized status (e.g. REGULARIZED, PRESENT)")
    override_working_hours: Optional[float] = Field(8.0, ge=0.0, le=24.0)


class RegularizationRequestResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    attendance_record_id: Optional[str] = None
    date: dt_date
    requested_by: str
    reason: str
    proposed_working_hours: float
    status: str  # 'PENDING', 'APPROVED', 'REJECTED'
    assigned_to_name: str = "Prerna Verma (HR)"
    assigned_to_email: str = "hr@netlink.org"
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[dt_datetime] = None
    review_notes: Optional[str] = None
    created_at: dt_datetime
    updated_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)

