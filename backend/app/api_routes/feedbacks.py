import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_role, verify_student_access
from app.models.all_models import User, Student, Batch, MentorFeedback
from app.schemas.feedback_schemas import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedbacks", tags=["Mentor-to-Student Feedback"])


def serialize_feedback(fb: MentorFeedback, db: Session) -> FeedbackResponse:
    student = db.query(Student).filter(Student.id == fb.student_id).first()
    student_user = student.user if student else None
    mentor = db.query(User).filter(User.id == fb.mentor_id).first()

    return FeedbackResponse(
        id=fb.id,
        student_id=fb.student_id,
        student_name=student_user.full_name if student_user else (student.roll_number if student else "Unknown"),
        student_roll_number=student.roll_number if student else None,
        mentor_id=fb.mentor_id,
        mentor_name=mentor.full_name if mentor else "Mentor",
        technical_skills=fb.technical_skills,
        task_performance=fb.task_performance,
        communication=fb.communication,
        punctuality_professionalism=fb.punctuality_professionalism,
        learning_attitude=fb.learning_attitude,
        average_rating=float(fb.average_rating),
        comment=fb.comment,
        created_at=fb.created_at,
    )


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN"]))
):
    """
    Submit qualitative rating & evaluation for an assigned trainee.
    Mentors can only submit feedback for trainees explicitly assigned to them or their batch.
    """
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{payload.student_id}' does not exist."
        )

    # Enforce assignment check for MENTOR
    if current_user.role == "MENTOR":
        is_assigned = (student.mentor_id == current_user.id)
        if not is_assigned and student.batch_id:
            batch = db.query(Batch).filter(Batch.id == student.batch_id).first()
            if batch and batch.mentor_id == current_user.id:
                is_assigned = True

        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only submit feedback for trainees assigned to you or your batch."
            )

    # Calculate average across the 5 categories
    avg_score = round(
        (
            payload.technical_skills
            + payload.task_performance
            + payload.communication
            + payload.punctuality_professionalism
            + payload.learning_attitude
        ) / 5.0,
        2
    )

    feedback_record = MentorFeedback(
        id=str(uuid.uuid4()),
        student_id=student.id,
        mentor_id=current_user.id,
        technical_skills=payload.technical_skills,
        task_performance=payload.task_performance,
        communication=payload.communication,
        punctuality_professionalism=payload.punctuality_professionalism,
        learning_attitude=payload.learning_attitude,
        average_rating=avg_score,
        comment=payload.comment,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(feedback_record)
    db.commit()
    db.refresh(feedback_record)

    return serialize_feedback(feedback_record, db)


@router.get("", response_model=List[FeedbackResponse])
def list_feedbacks(
    student_id: Optional[str] = Query(None, description="Optional student ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List qualitative feedback records based on role:
    - STUDENT: Always isolated strictly to their own student record.
    - MENTOR: Feedback submitted by them or for their assigned students.
    - HR & SUPER_ADMIN: Can view all feedback or filter by student_id.
    """
    query = db.query(MentorFeedback)

    if current_user.role == "STUDENT":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(MentorFeedback.student_id == student_profile.id)

    elif current_user.role == "MENTOR":
        if student_id:
            # Verify mentor has permission for this student
            verify_student_access(current_user, student_id, db)
            query = query.filter(MentorFeedback.student_id == student_id)
        else:
            # Return feedback submitted by this mentor
            query = query.filter(MentorFeedback.mentor_id == current_user.id)

    else:
        # HR or SUPER_ADMIN
        if student_id:
            query = query.filter(MentorFeedback.student_id == student_id)

    # Show latest feedback first
    query = query.order_by(MentorFeedback.created_at.desc())
    records = query.all()

    return [serialize_feedback(fb, db) for fb in records]


@router.get("/student/{student_id}", response_model=List[FeedbackResponse])
def get_student_feedbacks(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve feedback history for a specific student.
    Enforces student isolation and mentor assignment verification.
    """
    verify_student_access(current_user, student_id, db)

    records = db.query(MentorFeedback)\
        .filter(MentorFeedback.student_id == student_id)\
        .order_by(MentorFeedback.created_at.desc())\
        .all()

    return [serialize_feedback(fb, db) for fb in records]
