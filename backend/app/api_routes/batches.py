from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_hr
from app.models.all_models import User
from app.schemas.all_schemas import BatchResponse, BatchCreate, BatchUpdate
from app.services.base_services import BatchService

router = APIRouter(prefix="/batches", tags=["Batches"])

@router.get("", response_model=List[BatchResponse])
def list_batches(
    program_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List active program batches with role filtering:
    - MENTOR role sees batches assigned to them.
    - All other roles see active batches.
    """
    service = BatchService(db)
    all_batches = service.list_batches(program_id=program_id, skip=skip, limit=limit)
    if current_user.role == "MENTOR":
        return [b for b in all_batches if b.mentor_id == current_user.id]
    return all_batches

@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = BatchService(db)
    return service.get_batch(batch_id)

@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    data: BatchCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    service = BatchService(db)
    return service.create_batch(data, actor_id=current_user.id)

@router.put("/{batch_id}", response_model=BatchResponse)
@router.patch("/{batch_id}", response_model=BatchResponse)
def update_batch(
    batch_id: str,
    data: BatchUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    service = BatchService(db)
    return service.update_batch(batch_id, data, actor_id=current_user.id)
