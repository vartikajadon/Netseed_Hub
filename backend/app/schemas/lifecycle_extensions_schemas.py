from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field

# ----------------------------------------------------
# 1. NO DUES SCHEMAS
# ----------------------------------------------------
class NoDuesChecklistItem(BaseModel):
    id: str = Field(..., description="Unique ID for checklist item")
    item_name: str = Field(..., description="Name of clearance item e.g. Library Books Return")
    department: str = Field("General", description="Department responsible for clearance")
    is_cleared: bool = Field(False, description="Whether student/department marked as cleared")
    student_remarks: Optional[str] = None
    cleared_at: Optional[str] = None

class NoDuesTemplateOptionCreate(BaseModel):
    item_name: str = Field(..., min_length=2, description="Checklist item name")
    department: str = Field("General", description="Department responsible")
    is_required: bool = True

class NoDuesTemplateOptionResponse(BaseModel):
    id: str
    item_name: str
    department: str
    is_required: bool
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)

class NoDuesCreateRequest(BaseModel):
    student_id: str
    title: str = "Internship / Trainee No Dues Clearance"
    checklist_items: List[NoDuesChecklistItem]
    remarks: Optional[str] = None

class NoDuesStudentSubmitRequest(BaseModel):
    checklist_items: List[NoDuesChecklistItem]
    student_notes: Optional[str] = None

class NoDuesReviewRequest(BaseModel):
    status: Optional[str] = Field(None, description="'APPROVED' or 'REJECTED'")
    action: Optional[str] = Field(None, description="Alias for status e.g. 'APPROVE' or 'REJECT'")
    rejection_reason: Optional[str] = None
    remarks: Optional[str] = None

class NoDuesResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_roll_no: str
    student_email: Optional[str] = None
    title: str
    status: str
    checklist_items: List[NoDuesChecklistItem]
    remarks: Optional[str] = None
    student_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    issued_by_name: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    issued_at: dt_datetime
    submitted_at: Optional[dt_datetime] = None
    approved_at: Optional[dt_datetime] = None
    updated_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 2. FEES & PAYMENTS SCHEMAS
# ----------------------------------------------------
class FeePaymentCreate(BaseModel):
    student_id: str
    amount_paid: float = Field(..., gt=0, description="Amount paid in rupees")
    payment_date: dt_date
    payment_mode: str = Field("ONLINE", description="'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE'")
    transaction_reference: Optional[str] = Field(None, description="UTR, UPI Ref, Cheque No, or Receipt ID")
    receipt_number: Optional[str] = None
    notes: Optional[str] = None

class FeePaymentResponse(BaseModel):
    id: str
    student_id: str
    amount_paid: float
    payment_date: dt_date
    payment_mode: str
    transaction_reference: Optional[str] = None
    receipt_number: Optional[str] = None
    notes: Optional[str] = None
    received_by_name: Optional[str] = None
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)

class StudentFeeSummaryResponse(BaseModel):
    student_id: str
    user_id: str
    full_name: str
    roll_number: str
    email: str
    contact_number: Optional[str] = None
    batch_name: Optional[str] = None
    total_fees: float
    total_paid: float
    remaining_fees: float
    payment_status: str # 'PAID', 'PARTIAL', 'UNPAID'
    payment_mode: Optional[str] = None
    installment_type: Optional[str] = None
    payments_count: int
    last_payment_date: Optional[dt_date] = None
    payments: List[FeePaymentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class StudentFeeStructureUpdate(BaseModel):
    total_fees: float = Field(..., ge=0)
    payment_mode: Optional[str] = "ONLINE"
    installment_type: Optional[str] = "ONE_TIME"


# ----------------------------------------------------
# 3. LETTERS SCHEMAS
# ----------------------------------------------------
class LetterCreate(BaseModel):
    title: str = Field(..., min_length=2)
    letter_type: str = Field("OFFER_LETTER", description="'OFFER_LETTER', 'INTERNSHIP_JOINING', 'COMPLETION_LETTER', 'RECOMMENDATION', 'RELIEVING_LETTER', 'WARNING_LETTER', 'CUSTOM'")
    recipient_student_id: Optional[str] = None
    recipient_name: str = Field(..., min_length=1)
    recipient_email: Optional[str] = None
    issue_date: dt_date
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class LetterResponse(BaseModel):
    id: str
    title: str
    letter_type: str
    recipient_student_id: Optional[str] = None
    recipient_name: str
    recipient_email: Optional[str] = None
    issued_by_name: Optional[str] = None
    issue_date: dt_date
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    status: str
    acknowledged_at: Optional[dt_datetime] = None
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 4. CERTIFICATES SCHEMAS
# ----------------------------------------------------
class CertificateCreate(BaseModel):
    title: str = Field(..., min_length=2)
    certificate_type: str = Field("COMPLETION", description="'COMPLETION', 'EXCELLENCE', 'PARTICIPATION', 'INTERNSHIP', 'CUSTOM'")
    recipient_student_id: Optional[str] = None
    recipient_name: str = Field(..., min_length=1)
    recipient_roll_no: Optional[str] = None
    issue_date: dt_date
    credential_id: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class CertificateResponse(BaseModel):
    id: str
    title: str
    certificate_type: str
    recipient_student_id: Optional[str] = None
    recipient_name: str
    recipient_roll_no: Optional[str] = None
    issue_date: dt_date
    credential_id: str
    issued_by_name: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    status: str
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 5. NOTIFICATIONS SCHEMAS
# ----------------------------------------------------
class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    target_role: Optional[str] = None
    title: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    notification_type: str = Field("GENERAL", description="'TASK_COMPLETED', 'ACKNOWLEDGEMENT', 'NO_DUES', 'FEE_PAYMENT', 'LETTER_ISSUED', 'CERTIFICATE_ISSUED', 'GENERAL'")
    link_url: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    target_role: Optional[str] = None
    title: str
    message: str
    notification_type: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)


# ----------------------------------------------------
# 6. TRAINER LEAVES SCHEMAS
# ----------------------------------------------------
class TrainerLeaveCreate(BaseModel):
    trainer_id: str
    trainer_name: str
    start_date: dt_date
    end_date: dt_date
    reason: Optional[str] = "Casual Leave"
    substitute_trainer_name: Optional[str] = None
    notes: Optional[str] = None

class TrainerLeaveUpdate(BaseModel):
    status: Optional[str] = None # 'ON_LEAVE', 'COMPLETED', 'CANCELLED'
    notes: Optional[str] = None

class TrainerLeaveResponse(BaseModel):
    id: str
    trainer_id: str
    trainer_name: str
    start_date: dt_date
    end_date: dt_date
    reason: Optional[str] = None
    status: str
    substitute_trainer_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)

