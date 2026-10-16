import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, InstitutionTraining, InstitutionStudent, AuditLog
from app.schemas.institution_training_schemas import (
    InstitutionTrainingCreate, InstitutionTrainingUpdate, InstitutionTrainingResponse,
    InstitutionStudentCreate, InstitutionStudentUpdate, InstitutionStudentResponse
)

router = APIRouter(prefix="/institution-trainings", tags=["Institution Training"])


@router.get("", response_model=List[InstitutionTrainingResponse], summary="List all Institution Trainings")
def list_institution_trainings(
    query: Optional[str] = Query(None, description="Search by institution name, batch or training title"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN", "MENTOR"]))
):
    """
    Retrieve all institution trainings.
    """
    q = db.query(InstitutionTraining)
    if status_filter:
        q = q.filter(InstitutionTraining.status == status_filter.upper())
    if query:
        search = f"%{query}%"
        q = q.filter(
            (InstitutionTraining.institution_name.ilike(search)) |
            (InstitutionTraining.training_title.ilike(search)) |
            (InstitutionTraining.batch_name.ilike(search))
        )
    trainings = q.order_by(InstitutionTraining.created_at.desc()).all()
    
    response = []
    for t in trainings:
        t_data = InstitutionTrainingResponse(
            id=t.id,
            institution_name=t.institution_name,
            training_title=t.training_title,
            batch_name=t.batch_name,
            start_date=t.start_date,
            end_date=t.end_date,
            cost_per_batch=float(t.cost_per_batch or 0.0),
            trainer_name=t.trainer_name,
            status=t.status,
            description=t.description,
            created_by=t.created_by,
            created_at=t.created_at,
            updated_at=t.updated_at,
            student_count=len(t.students),
            students=[InstitutionStudentResponse.model_validate(s) for s in t.students]
        )
        response.append(t_data)
    return response


@router.post("", response_model=InstitutionTrainingResponse, status_code=status.HTTP_201_CREATED, summary="Create Institution Training")
def create_institution_training(
    payload: InstitutionTrainingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    HR endpoint to create a new institution training batch with optional initial student roster.
    """
    training = InstitutionTraining(
        id=str(uuid.uuid4()),
        institution_name=payload.institution_name.strip(),
        training_title=payload.training_title.strip(),
        batch_name=payload.batch_name.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        cost_per_batch=payload.cost_per_batch,
        trainer_name=payload.trainer_name.strip() if payload.trainer_name else None,
        status=payload.status.upper(),
        description=payload.description.strip() if payload.description else None,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(training)
    db.flush()

    # Add initial students if provided
    created_students = []
    if payload.students:
        for s in payload.students:
            st = InstitutionStudent(
                id=str(uuid.uuid4()),
                institution_training_id=training.id,
                student_name=s.student_name.strip(),
                student_roll_no=s.student_roll_no.strip(),
                email=s.email.strip() if s.email else None,
                contact_no=s.contact_no.strip() if s.contact_no else None,
                course=s.course.strip() if s.course else None,
                branch=s.branch.strip() if s.branch else None,
                training=s.training.strip() if s.training else payload.training_title,
                cost_per_batch=s.cost_per_batch if s.cost_per_batch is not None else payload.cost_per_batch,
                notes=s.notes.strip() if s.notes else None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(st)
            created_students.append(st)

    # Log audit entry
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="CREATE_INSTITUTION_TRAINING",
        entity="InstitutionTraining",
        entity_id=training.id,
        new_values=f"Created {training.institution_name} - {training.training_title} ({training.batch_name}) with {len(created_students)} students",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(training)

    return InstitutionTrainingResponse(
        id=training.id,
        institution_name=training.institution_name,
        training_title=training.training_title,
        batch_name=training.batch_name,
        start_date=training.start_date,
        end_date=training.end_date,
        cost_per_batch=float(training.cost_per_batch or 0.0),
        trainer_name=training.trainer_name,
        status=training.status,
        description=training.description,
        created_by=training.created_by,
        created_at=training.created_at,
        updated_at=training.updated_at,
        student_count=len(training.students),
        students=[InstitutionStudentResponse.model_validate(s) for s in training.students]
    )


@router.get("/{training_id}", response_model=InstitutionTrainingResponse, summary="Get Institution Training Details")
def get_institution_training(
    training_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN", "MENTOR"]))
):
    """
    Get full details of a specific institution training including all enrolled students.
    """
    training = db.query(InstitutionTraining).filter(InstitutionTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Institution training not found.")

    return InstitutionTrainingResponse(
        id=training.id,
        institution_name=training.institution_name,
        training_title=training.training_title,
        batch_name=training.batch_name,
        start_date=training.start_date,
        end_date=training.end_date,
        cost_per_batch=float(training.cost_per_batch or 0.0),
        trainer_name=training.trainer_name,
        status=training.status,
        description=training.description,
        created_by=training.created_by,
        created_at=training.created_at,
        updated_at=training.updated_at,
        student_count=len(training.students),
        students=[InstitutionStudentResponse.model_validate(s) for s in training.students]
    )


@router.put("/{training_id}", response_model=InstitutionTrainingResponse, summary="Update Institution Training")
def update_institution_training(
    training_id: str,
    payload: InstitutionTrainingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Update institution training metadata.
    """
    training = db.query(InstitutionTraining).filter(InstitutionTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Institution training not found.")

    if payload.institution_name is not None:
        training.institution_name = payload.institution_name.strip()
    if payload.training_title is not None:
        training.training_title = payload.training_title.strip()
    if payload.batch_name is not None:
        training.batch_name = payload.batch_name.strip()
    if payload.start_date is not None:
        training.start_date = payload.start_date
    if payload.end_date is not None:
        training.end_date = payload.end_date
    if payload.cost_per_batch is not None:
        training.cost_per_batch = payload.cost_per_batch
    if payload.trainer_name is not None:
        training.trainer_name = payload.trainer_name.strip() if payload.trainer_name else None
    if payload.status is not None:
        training.status = payload.status.upper()
    if payload.description is not None:
        training.description = payload.description.strip() if payload.description else None

    training.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(training)

    return InstitutionTrainingResponse(
        id=training.id,
        institution_name=training.institution_name,
        training_title=training.training_title,
        batch_name=training.batch_name,
        start_date=training.start_date,
        end_date=training.end_date,
        cost_per_batch=float(training.cost_per_batch or 0.0),
        trainer_name=training.trainer_name,
        status=training.status,
        description=training.description,
        created_by=training.created_by,
        created_at=training.created_at,
        updated_at=training.updated_at,
        student_count=len(training.students),
        students=[InstitutionStudentResponse.model_validate(s) for s in training.students]
    )


@router.delete("/{training_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Institution Training")
def delete_institution_training(
    training_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Delete institution training batch and its associated student records.
    """
    training = db.query(InstitutionTraining).filter(InstitutionTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Institution training not found.")

    db.delete(training)
    db.commit()
    return None


@router.post("/{training_id}/students", response_model=InstitutionStudentResponse, status_code=status.HTTP_201_CREATED, summary="Add Student to Institution Training")
def add_student_to_training(
    training_id: str,
    payload: InstitutionStudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Add a student to an institution training batch.
    Required fields: student_name, student_roll_no, email, contact_no, course, branch, training, cost_per_batch.
    """
    training = db.query(InstitutionTraining).filter(InstitutionTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Institution training not found.")

    student = InstitutionStudent(
        id=str(uuid.uuid4()),
        institution_training_id=training.id,
        student_name=payload.student_name.strip(),
        student_roll_no=payload.student_roll_no.strip(),
        email=payload.email.strip() if payload.email else None,
        contact_no=payload.contact_no.strip() if payload.contact_no else None,
        course=payload.course.strip() if payload.course else None,
        branch=payload.branch.strip() if payload.branch else None,
        training=payload.training.strip() if payload.training else training.training_title,
        cost_per_batch=payload.cost_per_batch if payload.cost_per_batch is not None else training.cost_per_batch,
        notes=payload.notes.strip() if payload.notes else None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return InstitutionStudentResponse.model_validate(student)


@router.post("/{training_id}/bulk-students", response_model=List[InstitutionStudentResponse], status_code=status.HTTP_201_CREATED, summary="Bulk Add Students to Institution Training")
def bulk_add_students_to_training(
    training_id: str,
    payload: List[InstitutionStudentCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Bulk import multiple students into an institution training batch.
    """
    training = db.query(InstitutionTraining).filter(InstitutionTraining.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Institution training not found.")

    created = []
    for s in payload:
        st = InstitutionStudent(
            id=str(uuid.uuid4()),
            institution_training_id=training.id,
            student_name=s.student_name.strip(),
            student_roll_no=s.student_roll_no.strip(),
            email=s.email.strip() if s.email else None,
            contact_no=s.contact_no.strip() if s.contact_no else None,
            course=s.course.strip() if s.course else None,
            branch=s.branch.strip() if s.branch else None,
            training=s.training.strip() if s.training else training.training_title,
            cost_per_batch=s.cost_per_batch if s.cost_per_batch is not None else training.cost_per_batch,
            notes=s.notes.strip() if s.notes else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(st)
        created.append(st)

    db.commit()
    for c in created:
        db.refresh(c)
    return [InstitutionStudentResponse.model_validate(c) for c in created]


@router.put("/{training_id}/students/{student_id}", response_model=InstitutionStudentResponse, summary="Update Student in Training")
def update_student_in_training(
    training_id: str,
    student_id: str,
    payload: InstitutionStudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Update an institution student's details.
    """
    student = db.query(InstitutionStudent).filter(
        InstitutionStudent.id == student_id,
        InstitutionStudent.institution_training_id == training_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found in this training.")

    if payload.student_name is not None:
        student.student_name = payload.student_name.strip()
    if payload.student_roll_no is not None:
        student.student_roll_no = payload.student_roll_no.strip()
    if payload.email is not None:
        student.email = payload.email.strip() if payload.email else None
    if payload.contact_no is not None:
        student.contact_no = payload.contact_no.strip() if payload.contact_no else None
    if payload.course is not None:
        student.course = payload.course.strip() if payload.course else None
    if payload.branch is not None:
        student.branch = payload.branch.strip() if payload.branch else None
    if payload.training is not None:
        student.training = payload.training.strip() if payload.training else None
    if payload.cost_per_batch is not None:
        student.cost_per_batch = payload.cost_per_batch
    if payload.notes is not None:
        student.notes = payload.notes.strip() if payload.notes else None

    student.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(student)
    return InstitutionStudentResponse.model_validate(student)


@router.delete("/{training_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove Student from Training")
def delete_student_from_training(
    training_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Delete a student from an institution training batch.
    """
    student = db.query(InstitutionStudent).filter(
        InstitutionStudent.id == student_id,
        InstitutionStudent.institution_training_id == training_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found in this training.")

    db.delete(student)
    db.commit()
    return None
