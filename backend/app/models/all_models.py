import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Numeric, Date, DateTime, Text, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True) # 'STUDENT', 'MENTOR', 'HR', 'SUPER_ADMIN'
    phone = Column(String(20), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, foreign_keys="[Student.user_id]", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", foreign_keys="[Device.user_id]", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="user", foreign_keys="[Consent.user_id]", cascade="all, delete-orphan")
    face_template = relationship("FaceTemplate", back_populates="user", uselist=False, foreign_keys="[FaceTemplate.user_id]", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor", foreign_keys="[AuditLog.actor_id]")


class Geofence(Base):
    __tablename__ = "geofences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    center_latitude = Column(Numeric(10, 8), nullable=False)
    center_longitude = Column(Numeric(11, 8), nullable=False)
    radius_meters = Column(Numeric(6, 2), nullable=False, default=100.00)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    batches = relationship("Batch", back_populates="geofence")


class Program(Base):
    __tablename__ = "programs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    duration_weeks = Column(Integer, nullable=False, default=12)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    max_students = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    program_type = Column(String(100), nullable=True)
    skills = Column(Text, nullable=True)
    is_curriculum_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    batches = relationship("Batch", back_populates="program", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="program")
    mentor = relationship("User", foreign_keys=[mentor_id])


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    batch_type = Column(String(50), nullable=False, default="TECH_MASTER") # 'TECH_MASTER', 'SHORT_DURATION', 'INTERNSHIP'
    training_duration_months = Column(Integer, nullable=False, default=6) # 6 months for Tech Master, 3 for Short Duration, 0 for Internship
    internship_duration_months = Column(Integer, nullable=False, default=6) # 6 months for Tech Master, 3 for Short Duration, 6 for Internship
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    geofence_id = Column(String(36), ForeignKey("geofences.id", ondelete="SET NULL"), nullable=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), nullable=False, default="UPCOMING", index=True) # 'UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    program = relationship("Program", back_populates="batches")
    geofence = relationship("Geofence", back_populates="batches")
    mentor = relationship("User", foreign_keys=[mentor_id])
    students = relationship("Student", back_populates="batch")
    tasks = relationship("Task", back_populates="batch", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="SET NULL"), nullable=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    roll_number = Column(String(50), nullable=False, unique=True, index=True)
    college_name = Column(String(255), nullable=True)
    qualification = Column(String(100), nullable=True)
    contact_number = Column(String(20), nullable=True)
    age = Column(Integer, nullable=True)
    dob = Column(Date, nullable=True)
    guardian_name = Column(String(255), nullable=True)
    marital_status = Column(String(50), nullable=True, default="Single")
    address = Column(Text, nullable=True)
    domicile = Column(String(100), nullable=True)
    batch_type = Column(String(50), nullable=True, default="TECH_MASTER") # 'TECH_MASTER', 'SHORT_DURATION', 'INTERNSHIP', 'SIX_MONTHS'
    total_fees = Column(Numeric(10, 2), nullable=True) # Fee amount
    payment_mode = Column(String(50), nullable=True, default="ONLINE") # 'CASH' or 'ONLINE'
    installment_type = Column(String(50), nullable=True, default="ONE_TIME") # 'ONE_TIME' or 'TWO_INSTALLMENTS'
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    enrollment_status = Column(String(50), nullable=False, default="ENROLLED") # 'ENROLLED', 'ACTIVE', 'ON_LEAVE', 'GRADUATED', 'TERMINATED', 'DROPOUT'
    dropout_reason = Column(Text, nullable=True) # Reason why student switched or discontinued mid-course
    dropout_date = Column(Date, nullable=True) # Date when marked as dropout
    dropout_marked_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # HR staff actor who recorded dropout
    registered_device_id = Column(String(36), nullable=True)
    face_enrollment_status = Column(String(50), nullable=False, default="NOT_ENROLLED") # 'NOT_ENROLLED', 'PENDING', 'ENROLLED'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    program = relationship("Program", back_populates="students")
    batch = relationship("Batch", back_populates="students")
    mentor = relationship("User", foreign_keys=[mentor_id])
    devices = relationship("Device", back_populates="student", foreign_keys="[Device.student_id]", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="student", foreign_keys="[Consent.student_id]", cascade="all, delete-orphan")
    face_template = relationship("FaceTemplate", back_populates="student", uselist=False, foreign_keys="[FaceTemplate.student_id]", cascade="all, delete-orphan")
    attendance_events = relationship("AttendanceEvent", back_populates="student", foreign_keys="[AttendanceEvent.student_id]", cascade="all, delete-orphan")
    daily_attendance_records = relationship("AttendanceDailyRecord", back_populates="student", foreign_keys="[AttendanceDailyRecord.student_id]", cascade="all, delete-orphan")
    regularization_requests = relationship("RegularizationRequest", back_populates="student", foreign_keys="[RegularizationRequest.student_id]", cascade="all, delete-orphan")
    no_dues_requests = relationship("NoDuesRequest", back_populates="student", cascade="all, delete-orphan")
    fee_payments = relationship("StudentFeePayment", back_populates="student", cascade="all, delete-orphan")
    issued_letters = relationship("IssuedLetter", back_populates="student")
    issued_certificates = relationship("IssuedCertificate", back_populates="student")
    task_submissions = relationship("TaskSubmission", back_populates="student", cascade="all, delete-orphan")
    feedbacks = relationship("MentorFeedback", back_populates="student", cascade="all, delete-orphan", order_by="desc(MentorFeedback.created_at)")


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    device_fingerprint = Column(String(255), nullable=False, index=True)
    device_model = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="PENDING") # 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED'
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "device_fingerprint", name="uq_user_device"),
    )

    # Relationships
    user = relationship("User", back_populates="devices", foreign_keys=[user_id])
    student = relationship("Student", back_populates="devices", foreign_keys=[student_id])
    approver = relationship("User", foreign_keys=[approved_by])


class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    consent_type = Column(String(100), nullable=False, default="FACIAL_BIOMETRIC_ATTENDANCE")
    consent_version = Column(String(20), nullable=False, default="v1.0")
    is_granted = Column(Boolean, nullable=False, default=True)
    ip_address = Column(String(45), nullable=True)
    granted_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="consents", foreign_keys=[user_id])
    student = relationship("Student", back_populates="consents", foreign_keys=[student_id])


class FaceTemplate(Base):
    __tablename__ = "face_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    embedding_reference = Column(Text, nullable=False)
    confidence_score = Column(Numeric(5, 4), nullable=False, default=0.9500)
    quality_score = Column(Numeric(5, 4), nullable=False, default=0.9500)
    enrolled_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    consent_id = Column(String(36), ForeignKey("consents.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="face_template", foreign_keys=[user_id])
    student = relationship("Student", back_populates="face_template", foreign_keys=[student_id])
    enroller = relationship("User", foreign_keys=[enrolled_by])
    consent = relationship("Consent", foreign_keys=[consent_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(36), nullable=True)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    actor = relationship("User", back_populates="audit_logs", foreign_keys=[actor_id])


class AttendanceEvent(Base):
    __tablename__ = "attendance_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(10), nullable=False)  # 'IN' or 'OUT'
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    date = Column(Date, nullable=False, index=True)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    distance_from_geofence_meters = Column(Numeric(8, 2), nullable=False)
    is_geofence_valid = Column(Boolean, nullable=False, default=True)
    verification_method = Column(String(50), nullable=False, default="FACE_LIVENESS")  # 'FACE_LIVENESS', 'HR_OVERRIDE'
    liveness_score = Column(Numeric(5, 4), nullable=False, default=0.9800)
    face_match_confidence = Column(Numeric(5, 4), nullable=False, default=0.9600)
    device_fingerprint = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="attendance_events", foreign_keys=[student_id])
    user = relationship("User", foreign_keys=[user_id])


class AttendanceDailyRecord(Base):
    __tablename__ = "attendance_daily_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    first_punch_in = Column(DateTime, nullable=True)
    last_punch_out = Column(DateTime, nullable=True)
    total_working_minutes = Column(Integer, nullable=False, default=0)
    total_working_hours = Column(Numeric(5, 2), nullable=False, default=0.00)
    punch_count = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="ABSENT", index=True)  # 'PRESENT', 'ABSENT', 'INCOMPLETE', 'REGULARIZED'
    is_regularized = Column(Boolean, nullable=False, default=False)
    regularized_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    regularized_at = Column(DateTime, nullable=True)
    regularization_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_student_daily_attendance"),
    )

    # Relationships
    student = relationship("Student", back_populates="daily_attendance_records", foreign_keys=[student_id])
    regularizer = relationship("User", foreign_keys=[regularized_by])
    regularization_requests = relationship("RegularizationRequest", back_populates="daily_record", cascade="all, delete-orphan")


class RegularizationRequest(Base):
    __tablename__ = "regularization_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_record_id = Column(String(36), ForeignKey("attendance_daily_records.id", ondelete="CASCADE"), nullable=True, index=True)
    date = Column(Date, nullable=False)
    requested_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    proposed_working_hours = Column(Numeric(5, 2), nullable=False, default=8.00)
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # 'PENDING', 'APPROVED', 'REJECTED'
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="regularization_requests", foreign_keys=[student_id])
    daily_record = relationship("AttendanceDailyRecord", back_populates="regularization_requests", foreign_keys=[attendance_record_id])
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class InstitutionTraining(Base):
    __tablename__ = "institution_trainings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_name = Column(String(255), nullable=False, index=True)
    training_title = Column(String(255), nullable=False)
    batch_name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    cost_per_batch = Column(Numeric(12, 2), nullable=False, default=0.00)  # cost in value per batch
    trainer_name = Column(String(150), nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)  # 'UPCOMING', 'ACTIVE', 'COMPLETED'
    description = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    students = relationship("InstitutionStudent", back_populates="institution_training", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class InstitutionStudent(Base):
    __tablename__ = "institution_students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_training_id = Column(String(36), ForeignKey("institution_trainings.id", ondelete="CASCADE"), nullable=False, index=True)
    student_name = Column(String(255), nullable=False, index=True)
    student_roll_no = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    contact_no = Column(String(30), nullable=True)
    course = Column(String(100), nullable=True)  # e.g. B.Tech, MCA
    branch = Column(String(100), nullable=True)  # e.g. CSE, IT, ME
    training = Column(String(255), nullable=True)  # Training title/module
    cost_per_batch = Column(Numeric(12, 2), nullable=True)  # Cost in value per batch / share
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution_training = relationship("InstitutionTraining", back_populates="students")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # 'FESTIVAL', 'OFF_DAY', 'BIRTHDAY', 'EVENT'
    is_off_day = Column(Boolean, nullable=False, default=False)
    person_name = Column(String(150), nullable=True)  # Student or staff/organization name for birthdays
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NoDuesTemplateOption(Base):
    __tablename__ = "no_dues_template_options"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    item_name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False, default="General")
    is_required = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NoDuesRequest(Base):
    __tablename__ = "no_dues_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="Internship / Trainee No Dues Clearance")
    status = Column(String(50), nullable=False, default="PENDING_STUDENT", index=True)  # 'PENDING_STUDENT', 'SUBMITTED', 'APPROVED', 'REJECTED'
    issued_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    student_notes = Column(Text, nullable=True)
    checklist_items_json = Column(Text, nullable=False, default="[]")  # JSON serialized list of {id, item_name, department, is_cleared, student_remarks, cleared_at}
    issued_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="no_dues_requests")
    issuer = relationship("User", foreign_keys=[issued_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class StudentFeePayment(Base):
    __tablename__ = "student_fee_payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_mode = Column(String(50), nullable=False, default="ONLINE")  # 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE'
    transaction_reference = Column(String(100), nullable=True)
    receipt_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    received_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="fee_payments")
    receiver = relationship("User", foreign_keys=[received_by])


class IssuedLetter(Base):
    __tablename__ = "issued_letters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    letter_type = Column(String(100), nullable=False, default="CUSTOM")  # 'OFFER_LETTER', 'INTERNSHIP_JOINING', 'COMPLETION_LETTER', 'RECOMMENDATION', 'RELIEVING_LETTER', 'WARNING_LETTER', 'CUSTOM'
    recipient_student_id = Column(String(36), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient_name = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=True)
    issued_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    issue_date = Column(Date, nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="SENT", index=True)  # 'SENT', 'ACKNOWLEDGED', 'ARCHIVED'
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="issued_letters")
    issuer = relationship("User", foreign_keys=[issued_by])


class IssuedCertificate(Base):
    __tablename__ = "issued_certificates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    certificate_type = Column(String(100), nullable=False, default="COMPLETION")  # 'COMPLETION', 'EXCELLENCE', 'PARTICIPATION', 'INTERNSHIP', 'CUSTOM'
    recipient_student_id = Column(String(36), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient_name = Column(String(255), nullable=False)
    recipient_roll_no = Column(String(100), nullable=True)
    issue_date = Column(Date, nullable=False)
    credential_id = Column(String(100), nullable=False, unique=True, index=True)
    issued_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="ISSUED", index=True)  # 'ISSUED', 'VERIFIED', 'REVOKED'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="issued_certificates")
    issuer = relationship("User", foreign_keys=[issued_by])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)  # None = role broadcast
    target_role = Column(String(50), nullable=True, index=True)  # 'STUDENT', 'MENTOR', 'HR', 'SUPER_ADMIN'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, default="GENERAL", index=True)  # 'TASK_COMPLETED', 'ACKNOWLEDGEMENT', 'NO_DUES', 'FEE_PAYMENT', 'LETTER_ISSUED', 'CERTIFICATE_ISSUED', 'GENERAL'
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class TrainerLeave(Base):
    __tablename__ = "trainer_leaves"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    trainer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trainer_name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(255), nullable=True)  # 'SICK_LEAVE', 'CASUAL_LEAVE', 'EMERGENCY', 'CONFERENCE', 'PERSONAL'
    status = Column(String(50), nullable=False, default="ON_LEAVE", index=True)  # 'ON_LEAVE', 'COMPLETED', 'CANCELLED'
    substitute_trainer_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    trainer = relationship("User", foreign_keys=[trainer_id])


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime, nullable=False)
    assign_to_all = Column(Boolean, nullable=False, default=True)
    assigned_student_ids = Column(Text, nullable=True)  # JSON-encoded list of specific student IDs
    max_marks = Column(Integer, nullable=False, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="tasks")
    mentor = relationship("User", foreign_keys=[mentor_id])
    submissions = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan")


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    submission_type = Column(String(50), nullable=False, default="CODE_LINK")  # 'CODE_LINK', 'TEXT_OUTPUT', 'BOTH'
    code_link = Column(String(500), nullable=True)
    text_output = Column(Text, nullable=True)
    file_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="PENDING_EVALUATION", index=True)  # 'PENDING_EVALUATION', 'EVALUATED'
    marks = Column(Numeric(5, 2), nullable=True)
    max_marks = Column(Integer, nullable=False, default=100)
    feedback = Column(Text, nullable=True)
    evaluated_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    evaluated_at = Column(DateTime, nullable=True)
    ack_sent_to_student = Column(Boolean, nullable=False, default=False)
    ack_sent_to_hr = Column(Boolean, nullable=False, default=False)
    ack_message = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    task = relationship("Task", back_populates="submissions")
    student = relationship("Student", back_populates="task_submissions")
    evaluator = relationship("User", foreign_keys=[evaluated_by])


class MentorFeedback(Base):
    __tablename__ = "mentor_feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    technical_skills = Column(Integer, nullable=False)
    task_performance = Column(Integer, nullable=False)
    communication = Column(Integer, nullable=False)
    punctuality_professionalism = Column(Integer, nullable=False)
    learning_attitude = Column(Integer, nullable=False)
    average_rating = Column(Numeric(3, 2), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="feedbacks", foreign_keys=[student_id])
    mentor = relationship("User", foreign_keys=[mentor_id])


class CurriculumTopic(Base):
    __tablename__ = "curriculum_topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    module_name = Column(String(150), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    program = relationship("Program", backref="curriculum_topics")
    progress_records = relationship("CurriculumProgress", back_populates="topic", cascade="all, delete-orphan")


class CurriculumProgress(Base):
    __tablename__ = "curriculum_progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    topic_id = Column(String(36), ForeignKey("curriculum_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=True, index=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assessment_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    topic = relationship("CurriculumTopic", back_populates="progress_records")
    program = relationship("Program")
    batch = relationship("Batch")
    mentor = relationship("User", foreign_keys=[completed_by])




