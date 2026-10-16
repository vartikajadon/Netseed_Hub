import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, IssuedLetter
from app.schemas.lifecycle_extensions_schemas import LetterCreate, LetterResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/letters", tags=["Official Letters & Documents"])

def serialize_letter(let: IssuedLetter) -> LetterResponse:
    issuer_name = let.issuer.full_name if let.issuer else None
    return LetterResponse(
        id=let.id,
        title=let.title,
        letter_type=let.letter_type,
        recipient_student_id=let.recipient_student_id,
        recipient_name=let.recipient_name,
        recipient_email=let.recipient_email,
        issued_by_name=issuer_name,
        issue_date=let.issue_date,
        content=let.content,
        file_url=let.file_url,
        file_name=let.file_name,
        status=let.status,
        acknowledged_at=let.acknowledged_at,
        created_at=let.created_at
    )

@router.get("", response_model=List[LetterResponse])
def list_letters(
    recipient_student_id: Optional[str] = None,
    letter_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(IssuedLetter)

    if current_user.role == "STUDENT":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(IssuedLetter.recipient_student_id == student_profile.id)
    elif recipient_student_id:
        query = query.filter(IssuedLetter.recipient_student_id == recipient_student_id)

    if letter_type:
        query = query.filter(IssuedLetter.letter_type == letter_type)

    if search:
        q = f"%{search.lower()}%"
        query = query.filter(
            (IssuedLetter.title.ilike(q)) | (IssuedLetter.recipient_name.ilike(q))
        )

    letters = query.order_by(IssuedLetter.created_at.desc()).all()
    return [serialize_letter(l) for l in letters]


@router.get("/my-letters", response_model=List[LetterResponse])
def get_my_letters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "STUDENT":
        return []

    student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student_profile:
        return []

    letters = db.query(IssuedLetter).filter(
        IssuedLetter.recipient_student_id == student_profile.id
    ).order_by(IssuedLetter.issue_date.desc()).all()

    return [serialize_letter(l) for l in letters]


@router.post("", response_model=LetterResponse, status_code=status.HTTP_201_CREATED)
def issue_letter(
    payload: LetterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Creates/imports a letter and sends it to recipient by name/student_id.
    """
    recipient_student = None
    recipient_email = payload.recipient_email
    recipient_name = payload.recipient_name.strip()

    if payload.recipient_student_id:
        recipient_student = db.query(Student).filter(Student.id == payload.recipient_student_id).first()
        if recipient_student and recipient_student.user:
            recipient_name = recipient_student.user.full_name
            recipient_email = recipient_student.user.email

    letter = IssuedLetter(
        id=str(uuid.uuid4()),
        title=payload.title.strip(),
        letter_type=payload.letter_type,
        recipient_student_id=payload.recipient_student_id,
        recipient_name=recipient_name,
        recipient_email=recipient_email,
        issued_by=current_user.id,
        issue_date=payload.issue_date,
        content=payload.content,
        file_url=payload.file_url,
        file_name=payload.file_name,
        status="SENT",
        created_at=datetime.utcnow()
    )
    db.add(letter)
    db.commit()
    db.refresh(letter)

    # Notify student if linked
    if recipient_student:
        create_notification(
            db=db,
            title=f"New Official Letter Issued: {letter.title}",
            message=f"You have received a new official letter ({letter.letter_type.replace('_', ' ').title()}) from HR. Please review and acknowledge.",
            notification_type="LETTER_ISSUED",
            user_id=recipient_student.user_id,
            link_url="/student"
        )

    return serialize_letter(letter)


@router.put("/{letter_id}/acknowledge", response_model=LetterResponse)
@router.post("/{letter_id}/acknowledge", response_model=LetterResponse)
def acknowledge_letter(
    letter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Recipient student acknowledges receipt of official letter.
    """
    letter = db.query(IssuedLetter).filter(IssuedLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found.")

    letter.status = "ACKNOWLEDGED"
    letter.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(letter)

    # Notify HR of acknowledgement
    create_notification(
        db=db,
        title="Letter Acknowledged by Trainee",
        message=f"{letter.recipient_name} has acknowledged receipt of official letter '{letter.title}'.",
        notification_type="ACKNOWLEDGEMENT",
        target_role="HR",
        link_url="/hr/letters"
    )

    return serialize_letter(letter)


@router.delete("/{letter_id}")
def delete_letter(
    letter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    letter = db.query(IssuedLetter).filter(IssuedLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Letter not found.")

    db.delete(letter)
    db.commit()
    return {"message": "Letter record deleted."}
