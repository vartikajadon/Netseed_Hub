import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, Batch, StudentFeePayment
from app.schemas.lifecycle_extensions_schemas import (
    FeePaymentCreate,
    FeePaymentResponse,
    StudentFeeSummaryResponse,
    StudentFeeStructureUpdate
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/fees", tags=["Student Fees & Accounts"])

def serialize_payment(p: StudentFeePayment) -> FeePaymentResponse:
    receiver_name = p.receiver.full_name if p.receiver else None
    return FeePaymentResponse(
        id=p.id,
        student_id=p.student_id,
        amount_paid=float(p.amount_paid or 0.0),
        payment_date=p.payment_date,
        payment_mode=p.payment_mode or "ONLINE",
        transaction_reference=p.transaction_reference,
        receipt_number=p.receipt_number,
        notes=p.notes,
        received_by_name=receiver_name,
        created_at=p.created_at
    )

def calculate_student_fee_summary(student: Student, db: Session) -> StudentFeeSummaryResponse:
    payments = db.query(StudentFeePayment).filter(
        StudentFeePayment.student_id == student.id
    ).order_by(StudentFeePayment.payment_date.desc()).all()

    total_fees = float(student.total_fees or 0.0)
    total_paid = sum(float(p.amount_paid or 0.0) for p in payments)
    remaining_fees = max(0.0, total_fees - total_paid)

    if total_fees == 0.0 and total_paid == 0.0:
        payment_status = "UNPAID"
    elif total_paid >= total_fees and total_fees > 0.0:
        payment_status = "PAID"
    elif total_paid > 0.0:
        payment_status = "PARTIAL"
    else:
        payment_status = "UNPAID"

    user = student.user
    batch = student.batch
    last_payment_date = payments[0].payment_date if payments else None

    return StudentFeeSummaryResponse(
        student_id=student.id,
        user_id=student.user_id,
        full_name=user.full_name if user else "Student",
        roll_number=student.roll_number,
        email=user.email if user else "",
        contact_number=student.contact_number,
        batch_name=batch.name if batch else None,
        total_fees=total_fees,
        total_paid=total_paid,
        remaining_fees=remaining_fees,
        payment_status=payment_status,
        payment_mode=student.payment_mode or "ONLINE",
        installment_type=student.installment_type or "ONE_TIME",
        payments_count=len(payments),
        last_payment_date=last_payment_date,
        payments=[serialize_payment(p) for p in payments]
    )


# -------------------------------------------------------------------------
# 1. LIST ALL STUDENTS WITH FEE DATA
# -------------------------------------------------------------------------
@router.get("/students", response_model=List[StudentFeeSummaryResponse])
def list_students_fees(
    batch_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns complete fee status ledger for all students.
    Students can only see their own fee details.
    """
    query = db.query(Student)

    if current_user.role == "STUDENT":
        query = query.filter(Student.user_id == current_user.id)
    else:
        if batch_id:
            query = query.filter(Student.batch_id == batch_id)

    students = query.all()
    summaries = [calculate_student_fee_summary(st, db) for st in students]

    # Filter in memory if search or status specified
    if search:
        q = search.lower()
        summaries = [
            s for s in summaries
            if q in s.full_name.lower() or q in s.roll_number.lower() or q in s.email.lower()
        ]

    if status_filter and status_filter.upper() != "ALL":
        summaries = [s for s in summaries if s.payment_status.upper() == status_filter.upper()]

    return summaries


@router.get("/students/{student_id}", response_model=StudentFeeSummaryResponse)
def get_student_fee_detail(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if current_user.role == "STUDENT" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    return calculate_student_fee_summary(student, db)


# -------------------------------------------------------------------------
# 2. UPDATE FEE STRUCTURE (TOTAL FEE, INSTALLMENT TYPE)
# -------------------------------------------------------------------------
@router.put("/students/{student_id}/structure")
def update_student_fee_structure(
    student_id: str,
    payload: StudentFeeStructureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.total_fees = payload.total_fees
    if payload.payment_mode:
        student.payment_mode = payload.payment_mode
    if payload.installment_type:
        student.installment_type = payload.installment_type

    db.commit()
    db.refresh(student)
    return {"message": "Student fee structure updated successfully.", "total_fees": float(student.total_fees)}


# -------------------------------------------------------------------------
# 3. RECORD PAYMENT INSTALLMENT (HR / ADMIN)
# -------------------------------------------------------------------------
@router.post("/payments", response_model=FeePaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment_installment(
    payload: FeePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    payment = StudentFeePayment(
        id=str(uuid.uuid4()),
        student_id=student.id,
        amount_paid=payload.amount_paid,
        payment_date=payload.payment_date,
        payment_mode=payload.payment_mode,
        transaction_reference=payload.transaction_reference,
        receipt_number=payload.receipt_number or f"REC-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
        notes=payload.notes,
        received_by=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Automatically notify student about fee payment receipt
    create_notification(
        db=db,
        title="Fee Payment Installment Recorded",
        message=f"A fee payment of ₹{payload.amount_paid:,.2f} on {payload.payment_date} via {payload.payment_mode} has been recorded (Receipt #{payment.receipt_number}).",
        notification_type="FEE_PAYMENT",
        user_id=student.user_id,
        link_url="/student"
    )

    return serialize_payment(payment)


@router.delete("/payments/{payment_id}")
def delete_payment_installment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    payment = db.query(StudentFeePayment).filter(StudentFeePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    db.delete(payment)
    db.commit()
    return {"message": "Payment record deleted successfully."}
