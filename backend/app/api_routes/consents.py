from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.models.all_models import User
from app.schemas.all_schemas import ConsentResponse, ConsentCreate
from app.services.base_services import ConsentService

router = APIRouter(prefix="/consents", tags=["Consents"])

@router.get("", response_model=List[ConsentResponse])
def list_consents(
    user_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get consent history with scope checks:
    - STUDENT can ONLY query their own consent status.
    - HR / SUPER_ADMIN can query any user.
    """
    target_user_id = user_id
    if current_user.role == "STUDENT":
        target_user_id = current_user.id
    elif not target_user_id and current_user.role not in ["HR", "SUPER_ADMIN"]:
        target_user_id = current_user.id

    service = ConsentService(db)
    return service.list_consents(user_id=target_user_id)

@router.get("/user/{user_id}", response_model=List[ConsentResponse])
def get_user_consents(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "STUDENT" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cannot view other users' consent status.")

    service = ConsentService(db)
    return service.get_user_consents(user_id)

@router.post("", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
def record_consent(
    data: ConsentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "STUDENT" and data.user_id != current_user.id:
        data.user_id = current_user.id

    service = ConsentService(db)
    return service.record_consent(data)
