from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_hr
from app.models.all_models import User
from app.schemas.all_schemas import GeofenceResponse, GeofenceCreate, GeofenceUpdate
from app.services.base_services import GeofenceService

router = APIRouter(prefix="/geofences", tags=["Geofences"])

@router.get("", response_model=List[GeofenceResponse])
def list_geofences(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = GeofenceService(db)
    return service.list_geofences(skip=skip, limit=limit)

@router.get("/{geofence_id}", response_model=GeofenceResponse)
def get_geofence(
    geofence_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = GeofenceService(db)
    return service.get_geofence(geofence_id)

@router.post("", response_model=GeofenceResponse, status_code=status.HTTP_201_CREATED)
def create_geofence(
    data: GeofenceCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    service = GeofenceService(db)
    return service.create_geofence(data, actor_id=current_user.id)

@router.put("/{geofence_id}", response_model=GeofenceResponse)
def update_geofence(
    geofence_id: str,
    data: GeofenceUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    service = GeofenceService(db)
    return service.update_geofence(geofence_id, data, actor_id=current_user.id)
