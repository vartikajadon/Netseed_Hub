import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, NoDuesTemplateOption, NoDuesRequest
from app.schemas.lifecycle_extensions_schemas import (
    NoDuesTemplateOptionCreate,
    NoDuesTemplateOptionResponse,
    NoDuesCreateRequest,
    NoDuesStudentSubmitRequest,
    NoDuesReviewRequest,
    NoDuesResponse,
    NoDuesChecklistItem
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/no-dues", tags=["No Dues Clearance"])

DEFAULT_CHECKLIST_OPTIONS = [
    ("Final Project Code Review & Mentor Sign-off", "Mentor / Project"),
    ("Fee Dues & Accounts Settlement", "Accounts & Finance"),
]

def is_excluded_no_dues_item(name: Optional[str], dept: Optional[str]) -> bool:
    nl = (name or "").lower()
    dl = (dept or "").lower()
    return any(term in nl or term in dl for term in ["library", "it asset", "laptop", "hostel", "it hardware", "hardware"])

def ensure_default_template_options(db: Session):
    # Purge deprecated library, IT asset, and hostel options
    deprecated = db.query(NoDuesTemplateOption).all()
    for opt in deprecated:
        if is_excluded_no_dues_item(opt.item_name, opt.department):
            db.delete(opt)
    try:
        db.commit()
    except Exception:
        db.rollback()

    existing_count = db.query(NoDuesTemplateOption).count()
    if existing_count == 0:
        for name, dept in DEFAULT_CHECKLIST_OPTIONS:
            db.add(NoDuesTemplateOption(
                id=str(uuid.uuid4()),
                item_name=name,
                department=dept,
                is_required=True,
                created_at=datetime.utcnow()
            ))
        try:
            db.commit()
        except Exception:
            db.rollback()

def serialize_request_response(req: NoDuesRequest, db: Session) -> NoDuesResponse:
    student = req.student
    student_user = student.user if student else None
    issuer = req.issuer
    reviewer = req.reviewer

    items_raw = []
    try:
        items_raw = json.loads(req.checklist_items_json) if req.checklist_items_json else []
    except Exception:
        items_raw = []

    parsed_items = [
        NoDuesChecklistItem(
            id=item.get("id", str(uuid.uuid4())),
            item_name=item.get("item_name", "Clearance Item"),
            department=item.get("department", "General"),
            is_cleared=item.get("is_cleared", False),
            student_remarks=item.get("student_remarks"),
            cleared_at=item.get("cleared_at")
        )
        for item in items_raw
        if not is_excluded_no_dues_item(item.get("item_name", ""), item.get("department", ""))
    ]

    return NoDuesResponse(
        id=req.id,
        student_id=req.student_id,
        student_name=student_user.full_name if student_user else "Student",
        student_roll_no=student.roll_number if student else "N/A",
        student_email=student_user.email if student_user else None,
        title=req.title,
        status=req.status,
        checklist_items=parsed_items,
        remarks=req.remarks,
        student_notes=req.student_notes,
        rejection_reason=req.rejection_reason,
        issued_by_name=issuer.full_name if issuer else None,
        reviewed_by_name=reviewer.full_name if reviewer else None,
        issued_at=req.issued_at,
        submitted_at=req.submitted_at,
        approved_at=req.approved_at,
        updated_at=req.updated_at
    )


# -------------------------------------------------------------------------
# 1. TEMPLATE OPTIONS CRUD (HR / ADMIN)
# -------------------------------------------------------------------------
@router.get("/template-options", response_model=List[NoDuesTemplateOptionResponse])
@router.get("/options", response_model=List[NoDuesTemplateOptionResponse])
def get_template_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_default_template_options(db)
    options = db.query(NoDuesTemplateOption).order_by(NoDuesTemplateOption.created_at.asc()).all()
    return options

@router.post("/template-options", response_model=NoDuesTemplateOptionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/options", response_model=NoDuesTemplateOptionResponse, status_code=status.HTTP_201_CREATED)
def create_template_option(
    payload: NoDuesTemplateOptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """Allows HR to create dynamic new options/checklist items for the No Dues form."""
    new_opt = NoDuesTemplateOption(
        id=str(uuid.uuid4()),
        item_name=payload.item_name.strip(),
        department=payload.department.strip() or "General",
        is_required=payload.is_required,
        created_at=datetime.utcnow()
    )
    db.add(new_opt)
    db.commit()
    db.refresh(new_opt)
    return new_opt

@router.delete("/template-options/{option_id}")
def delete_template_option(
    option_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    opt = db.query(NoDuesTemplateOption).filter(NoDuesTemplateOption.id == option_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Option not found.")
    db.delete(opt)
    db.commit()
    return {"message": "Template option removed."}


# -------------------------------------------------------------------------
# 2. NO DUES REQUESTS
# -------------------------------------------------------------------------
@router.get("/requests", response_model=List[NoDuesResponse])
def list_no_dues_requests(
    student_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(NoDuesRequest)

    # RBAC: students can only see their own
    if current_user.role == "STUDENT":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(NoDuesRequest.student_id == student_profile.id)
    elif student_id:
        query = query.filter(NoDuesRequest.student_id == student_id)

    if status_filter:
        query = query.filter(NoDuesRequest.status == status_filter)

    requests = query.order_by(NoDuesRequest.issued_at.desc()).all()
    return [serialize_request_response(r, db) for r in requests]


@router.get("/requests/my-pending", response_model=Optional[NoDuesResponse])
def get_my_pending_no_dues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns active No Dues request for the student so a popup appears on their dashboard.
    """
    if current_user.role != "STUDENT":
        return None

    student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student_profile:
        return None

    # Find the most recent active request
    active_req = db.query(NoDuesRequest).filter(
        NoDuesRequest.student_id == student_profile.id,
        NoDuesRequest.status.in_(["PENDING_STUDENT", "SUBMITTED", "REJECTED"])
    ).order_by(NoDuesRequest.issued_at.desc()).first()

    if not active_req:
        return None

    return serialize_request_response(active_req, db)


@router.post("/requests", response_model=NoDuesResponse, status_code=status.HTTP_201_CREATED)
def issue_no_dues_form(
    payload: NoDuesCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    HR issues No Dues form to a student with selected checklist items.
    Triggers an instant notification & dashboard popup for that student.
    """
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Convert checklist items to dicts excluding library, IT assets, hostel
    items_dicts = [
        item.model_dump() for item in payload.checklist_items
        if not is_excluded_no_dues_item(item.item_name, item.department)
    ]

    req = NoDuesRequest(
        id=str(uuid.uuid4()),
        student_id=student.id,
        title=payload.title.strip() or "Internship / Trainee No Dues Clearance",
        status="PENDING_STUDENT",
        issued_by=current_user.id,
        remarks=payload.remarks,
        checklist_items_json=json.dumps(items_dicts),
        issued_at=datetime.utcnow()
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Send Notification to the student
    create_notification(
        db=db,
        title="Action Required: No Dues Clearance Form Received",
        message=f"HR has initiated a No Dues Clearance form '{req.title}' for you. Please review and submit your clearance checklist.",
        notification_type="NO_DUES",
        user_id=student.user_id,
        link_url="/student"
    )

    return serialize_request_response(req, db)


@router.put("/requests/{request_id}/student-submit", response_model=NoDuesResponse)
@router.post("/requests/{request_id}/student-submit", response_model=NoDuesResponse)
@router.put("/requests/{request_id}/submit-by-student", response_model=NoDuesResponse)
@router.post("/requests/{request_id}/submit-by-student", response_model=NoDuesResponse)
def student_submit_no_dues(
    request_id: str,
    payload: NoDuesStudentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Student ticks clearance checklist items, writes remarks, and submits for HR review.
    """
    req = db.query(NoDuesRequest).filter(NoDuesRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="No Dues request not found.")

    student = req.student
    if current_user.role == "STUDENT" and student.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    items_dicts = [item.model_dump() for item in payload.checklist_items]
    req.checklist_items_json = json.dumps(items_dicts)
    req.student_notes = payload.student_notes
    req.status = "SUBMITTED"
    req.submitted_at = datetime.utcnow()
    req.rejection_reason = None
    db.commit()
    db.refresh(req)

    # Notify HR that student submitted No Dues
    student_user = student.user
    student_name = student_user.full_name if student_user else "Student"
    create_notification(
        db=db,
        title="No Dues Form Submitted for Review",
        message=f"{student_name} ({student.roll_number}) has submitted their No Dues Clearance checklist for verification.",
        notification_type="NO_DUES",
        target_role="HR",
        link_url="/hr/no-dues"
    )

    return serialize_request_response(req, db)


@router.put("/requests/{request_id}/review", response_model=NoDuesResponse)
@router.post("/requests/{request_id}/review", response_model=NoDuesResponse)
def review_no_dues(
    request_id: str,
    payload: NoDuesReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    HR reviews and either APPROVES or REJECTS the No Dues request.
    """
    req = db.query(NoDuesRequest).filter(NoDuesRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="No Dues request not found.")

    raw_status = (payload.status or payload.action or "").upper()
    if raw_status in ["APPROVE", "APPROVED"]:
        status_val = "APPROVED"
    elif raw_status in ["REJECT", "REJECTED"]:
        status_val = "REJECTED"
    else:
        raise HTTPException(status_code=400, detail="Status must be APPROVED or REJECTED.")

    req.status = status_val
    req.reviewed_by = current_user.id
    req.remarks = payload.remarks
    if status_val == "APPROVED":
        req.approved_at = datetime.utcnow()
        req.rejection_reason = None
        notif_msg = f"Congratulations! Your No Dues clearance '{req.title}' has been APPROVED by HR."
    else:
        req.rejection_reason = payload.rejection_reason or "Requirements not met."
        notif_msg = f"Your No Dues clearance request was returned by HR: {req.rejection_reason}. Please resolve dues and re-submit."

    db.commit()
    db.refresh(req)

    # Notify student
    student = req.student
    if student:
        create_notification(
            db=db,
            title=f"No Dues Clearance {status_val.title()}",
            message=notif_msg,
            notification_type="NO_DUES",
            user_id=student.user_id,
            link_url="/student"
        )

    return serialize_request_response(req, db)
