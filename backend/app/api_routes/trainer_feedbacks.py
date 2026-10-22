import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, Batch, TrainerFeedback
from app.schemas.trainer_feedback_schemas import (
    TrainerFeedbackCreate,
    TrainerFeedbackResponse,
    TrainerOptionItem,
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/trainer-feedbacks", tags=["Student-to-Trainer Feedback"])


def serialize_trainer_feedback(
    tf: TrainerFeedback,
    db: Session,
    viewer: User,
) -> TrainerFeedbackResponse:
    student = db.query(Student).filter(Student.id == tf.student_id).first() if tf.student_id else None
    student_user = student.user if student else None
    trainer = db.query(User).filter(User.id == tf.trainer_id).first()
    batch = db.query(Batch).filter(Batch.id == tf.batch_id).first() if tf.batch_id else None

    # Mask student identity if feedback is anonymous AND viewer is the trainer or mentor
    is_masked = bool(tf.is_anonymous) and (viewer.role == "MENTOR")
    if is_masked:
        student_id = None
        student_name = "Anonymous Trainee"
        student_roll_no = "ANONYMOUS"
    else:
        student_id = tf.student_id
        student_name = student_user.full_name if student_user else (student.roll_number if student else "Anonymous Trainee")
        student_roll_no = student.roll_number if student else None

    return TrainerFeedbackResponse(
        id=tf.id,
        student_id=student_id,
        student_name=student_name,
        student_roll_no=student_roll_no,
        trainer_id=tf.trainer_id,
        trainer_name=trainer.full_name if trainer else "Unknown Trainer",
        batch_id=tf.batch_id,
        batch_name=batch.name if batch else None,
        is_anonymous=bool(tf.is_anonymous),
        technical_rating=tf.technical_rating,
        technical_text=tf.technical_text,
        teaching_rating=tf.teaching_rating,
        teaching_text=tf.teaching_text,
        doubt_solving_rating=tf.doubt_solving_rating,
        doubt_solving_text=tf.doubt_solving_text,
        practical_guidance_rating=tf.practical_guidance_rating,
        practical_guidance_text=tf.practical_guidance_text,
        communication_rating=tf.communication_rating,
        communication_text=tf.communication_text,
        overall_feedback_text=tf.overall_feedback_text,
        average_rating=float(tf.average_rating) if tf.average_rating is not None else None,
        created_at=tf.created_at,
    )


@router.get("/trainers", response_model=List[TrainerOptionItem], summary="List Available Trainers for Feedback")
def list_available_trainers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first() if current_user.role == "STUDENT" else None

    # Fetch users with role MENTOR or HR
    trainers = db.query(User).filter(User.role.in_(["MENTOR", "SUPER_ADMIN"]), User.is_active == True).all()

    result = []
    for t in trainers:
        batch = None
        if student and student.batch:
            batch = student.batch
        result.append(
            TrainerOptionItem(
                id=t.id,
                full_name=t.full_name,
                email=t.email,
                role=t.role,
                batch_id=batch.id if batch else None,
                batch_name=batch.name if batch else None,
            )
        )
    return result


@router.post("", response_model=TrainerFeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit Feedback for Trainer")
def submit_trainer_feedback(
    payload: TrainerFeedbackCreate,
    current_user: User = Depends(require_role(["STUDENT"])),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    trainer = db.query(User).filter(User.id == payload.trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")

    # Calculate average rating across any provided numerical categories
    ratings = [
        payload.technical_rating,
        payload.teaching_rating,
        payload.doubt_solving_rating,
        payload.practical_guidance_rating,
        payload.communication_rating,
    ]
    valid_ratings = [r for r in ratings if r is not None and 1 <= r <= 5]
    avg_rating = round(sum(valid_ratings) / len(valid_ratings), 2) if valid_ratings else None

    target_batch_id = payload.batch_id or student.batch_id

    new_feedback = TrainerFeedback(
        student_id=student.id,
        trainer_id=payload.trainer_id,
        batch_id=target_batch_id,
        is_anonymous=payload.is_anonymous,
        technical_rating=payload.technical_rating,
        technical_text=payload.technical_text.strip() if payload.technical_text else None,
        teaching_rating=payload.teaching_rating,
        teaching_text=payload.teaching_text.strip() if payload.teaching_text else None,
        doubt_solving_rating=payload.doubt_solving_rating,
        doubt_solving_text=payload.doubt_solving_text.strip() if payload.doubt_solving_text else None,
        practical_guidance_rating=payload.practical_guidance_rating,
        practical_guidance_text=payload.practical_guidance_text.strip() if payload.practical_guidance_text else None,
        communication_rating=payload.communication_rating,
        communication_text=payload.communication_text.strip() if payload.communication_text else None,
        overall_feedback_text=payload.overall_feedback_text.strip() if payload.overall_feedback_text else None,
        average_rating=avg_rating,
        created_at=datetime.utcnow(),
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    # Prepare author display
    author_display = "an Anonymous Trainee" if payload.is_anonymous else f"{current_user.full_name} ({student.roll_number})"

    # 1. Notify Trainer
    create_notification(
        db=db,
        user_id=trainer.id,
        title="New Feedback Received from Trainee",
        message=f"You received new evaluation feedback from {author_display}.",
        notification_type="FEEDBACK",
        link_url="/mentor/feedback",
    )

    # 2. Notify HR
    create_notification(
        db=db,
        title=f"Trainer Feedback Submitted for {trainer.full_name}",
        message=f"{author_display} submitted performance feedback for trainer {trainer.full_name}.",
        notification_type="FEEDBACK",
        target_role="HR",
        link_url="/hr/reports",
    )

    # 3. Notify Manager / Super Admin
    create_notification(
        db=db,
        title=f"Trainer Feedback Recorded: {trainer.full_name}",
        message=f"Feedback submitted for trainer {trainer.full_name} by {author_display}.",
        notification_type="FEEDBACK",
        target_role="SUPER_ADMIN",
        link_url="/hr/reports",
    )

    return serialize_trainer_feedback(new_feedback, db, current_user)


@router.get("", response_model=List[TrainerFeedbackResponse], summary="List Trainer Feedbacks")
def list_trainer_feedbacks(
    trainer_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TrainerFeedback)

    if current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return []
        query = query.filter(TrainerFeedback.student_id == student.id)
    elif current_user.role == "MENTOR":
        query = query.filter(TrainerFeedback.trainer_id == current_user.id)
    else:
        if trainer_id:
            query = query.filter(TrainerFeedback.trainer_id == trainer_id)
        if batch_id:
            query = query.filter(TrainerFeedback.batch_id == batch_id)

    feedbacks = query.order_by(TrainerFeedback.created_at.desc()).all()
    return [serialize_trainer_feedback(fb, db, current_user) for fb in feedbacks]
