import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, TrainerLeave, Batch, Program
from app.schemas.lifecycle_extensions_schemas import (
    TrainerLeaveCreate, TrainerLeaveUpdate, TrainerLeaveResponse
)

router = APIRouter(prefix="/trainer-leaves", tags=["Trainer & Mentor Leaves"])


@router.get("", response_model=List[TrainerLeaveResponse], summary="List Trainer Leaves")
def list_trainer_leaves(
    status_filter: Optional[str] = Query(None, alias="status"),
    trainer_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns trainer leave records.
    """
    q = db.query(TrainerLeave)
    if status_filter:
        q = q.filter(TrainerLeave.status == status_filter.upper())
    if trainer_id:
        q = q.filter(TrainerLeave.trainer_id == trainer_id)

    leaves = q.order_by(TrainerLeave.start_date.desc()).all()
    return [TrainerLeaveResponse.model_validate(l) for l in leaves]


@router.post("", response_model=TrainerLeaveResponse, status_code=status.HTTP_201_CREATED, summary="Record Trainer Leave")
def record_trainer_leave(
    payload: TrainerLeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN", "MENTOR"]))
):
    """
    HR / Super Admin records that a trainer/mentor is on leave.
    """
    trainer = db.query(User).filter(User.id == payload.trainer_id).first()
    trainer_name = payload.trainer_name or (trainer.full_name if trainer else "Trainer")

    leave_record = TrainerLeave(
        id=str(uuid.uuid4()),
        trainer_id=payload.trainer_id,
        trainer_name=trainer_name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason or "Casual Leave",
        status="ON_LEAVE",
        substitute_trainer_name=payload.substitute_trainer_name,
        notes=payload.notes,
        created_at=datetime.utcnow()
    )
    db.add(leave_record)
    db.commit()
    db.refresh(leave_record)

    return TrainerLeaveResponse.model_validate(leave_record)


@router.put("/{leave_id}/status", response_model=TrainerLeaveResponse, summary="Update Trainer Leave Status")
def update_trainer_leave_status(
    leave_id: str,
    payload: TrainerLeaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Update trainer leave status, e.g. mark as 'COMPLETED' or back on duty.
    """
    leave_record = db.query(TrainerLeave).filter(TrainerLeave.id == leave_id).first()
    if not leave_record:
        raise HTTPException(status_code=404, detail="Trainer leave record not found")

    if payload.status:
        leave_record.status = payload.status.upper()
    if payload.notes is not None:
        leave_record.notes = payload.notes

    db.commit()
    db.refresh(leave_record)
    return TrainerLeaveResponse.model_validate(leave_record)


@router.delete("/{leave_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Cancel/Delete Trainer Leave")
def delete_trainer_leave(
    leave_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    leave_record = db.query(TrainerLeave).filter(TrainerLeave.id == leave_id).first()
    if not leave_record:
        raise HTTPException(status_code=404, detail="Trainer leave record not found")

    db.delete(leave_record)
    db.commit()
    return None
