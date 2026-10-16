from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_hr
from app.models.all_models import User
from app.schemas.all_schemas import ProgramResponse, ProgramCreate, ProgramUpdate
from app.services.base_services import ProgramService

router = APIRouter(prefix="/programs", tags=["Programs"])

@router.get("", response_model=List[ProgramResponse])
def list_programs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ProgramService(db)
    return service.list_programs(skip=skip, limit=limit)

@router.get("/{program_id}", response_model=ProgramResponse)
def get_program(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = ProgramService(db)
    return service.get_program(program_id)

@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(
    data: ProgramCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    service = ProgramService(db)
    return service.create_program(data, actor_id=current_user.id)

@router.put("/{program_id}", response_model=ProgramResponse)
@router.patch("/{program_id}", response_model=ProgramResponse)
def update_program(
    program_id: str,
    data: ProgramUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    service = ProgramService(db)
    return service.update_program(program_id, data, actor_id=current_user.id)

@router.delete("/{program_id}", status_code=status.HTTP_200_OK)
def delete_program(
    program_id: str,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Delete a training program. Restricted to HR and SUPER_ADMIN.
    """
    service = ProgramService(db)
    return service.delete_program(program_id, actor_id=current_user.id)


# -------------------------------------------------------------------------
# COURSE CURRICULUM MANAGEMENT (HR/Admin Import, Mentor & Student Visibility)
# -------------------------------------------------------------------------
import os
import json
from pydantic import BaseModel
from typing import Dict, Any, Optional

CURRICULUM_DATA_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "course_curriculums.json"))

def _load_curriculums() -> Dict[str, Any]:
    if os.path.exists(CURRICULUM_DATA_FILE):
        try:
            with open(CURRICULUM_DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_curriculums(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(CURRICULUM_DATA_FILE), exist_ok=True)
    with open(CURRICULUM_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

class CurriculumImportPayload(BaseModel):
    course_id: str
    course_name: Optional[str] = None
    category: Optional[str] = None
    total_duration: Optional[str] = None
    target_role: Optional[str] = None
    description: Optional[str] = None
    stages: List[Dict[str, Any]]

@router.get("/curriculums", summary="List All Course Curriculums")
def get_all_course_curriculums(
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve imported course curriculums. Visible to HR, Super Admin, Mentors, and registered Students.
    """
    return _load_curriculums()

@router.post("/curriculums/import", summary="Import Course Curriculum")
def import_course_curriculum(
    payload: CurriculumImportPayload,
    current_user: User = Depends(require_hr)
):
    """
    HR / Admin endpoint to import curriculum for a program course.
    """
    curriculums = _load_curriculums()
    course_id = payload.course_id.strip().lower()
    
    curriculums[course_id] = {
        "course_id": course_id,
        "course_name": payload.course_name or course_id,
        "category": payload.category or "General",
        "total_duration": payload.total_duration or "N/A",
        "target_role": payload.target_role or "Specialist",
        "description": payload.description or "",
        "stages": payload.stages,
        "imported_by": current_user.full_name,
        "imported_at": datetime.utcnow().isoformat()
    }
    _save_curriculums(curriculums)
    return {"message": f"Curriculum for course '{course_id}' imported successfully.", "curriculum": curriculums[course_id]}
