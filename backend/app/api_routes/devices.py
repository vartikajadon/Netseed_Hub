from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_hr
from app.models.all_models import User
from app.schemas.all_schemas import DeviceResponse, DeviceCreate
from app.services.base_services import DeviceService
from pydantic import BaseModel

class ApproveDevicePayload(BaseModel):
    approver_id: Optional[str] = None

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("", response_model=List[DeviceResponse])
def list_devices(
    user_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List devices with isolation checks:
    - STUDENT role can ONLY view their own devices.
    - Staff roles (MENTOR, HR, SUPER_ADMIN) can view devices.
    """
    target_user_id = user_id
    if current_user.role == "STUDENT":
        target_user_id = current_user.id
    elif not target_user_id and current_user.role not in ["HR", "SUPER_ADMIN"]:
        target_user_id = current_user.id

    service = DeviceService(db)
    return service.list_devices(user_id=target_user_id, status_filter=status_filter, skip=skip, limit=limit)

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = DeviceService(db)
    device = service.get_device(device_id)
    if current_user.role == "STUDENT" and device.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Cannot view other users' devices.")
    return device

@router.post("/register", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    data: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "STUDENT" and data.user_id != current_user.id:
        data.user_id = current_user.id
    service = DeviceService(db)
    return service.register_device(data)

@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(
    data: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return register_device(data, current_user=current_user, db=db)

@router.put("/{device_id}/approve", response_model=DeviceResponse)
def approve_device(
    device_id: str,
    payload: ApproveDevicePayload,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Approve registered device. HR and Super Admin only.
    """
    approver = payload.approver_id or current_user.id
    service = DeviceService(db)
    return service.approve_device(device_id, approver)
