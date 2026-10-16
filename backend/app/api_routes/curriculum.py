import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_role
from app.models.all_models import (
    User, Student, Batch, Program, CurriculumTopic, CurriculumProgress, AuditLog
)
from app.schemas.curriculum_schemas import (
    TopicProgressUpdate, TopicItemResponse, ProgramCurriculumResponse,
    CurriculumTopicCreate, CurriculumTopicUpdate,
    CurriculumImportRequest, CurriculumPublishPayload
)

router = APIRouter(prefix="/curriculum", tags=["Course Curriculum & Progress Tracking"])


def build_program_curriculum_response(
    program: Program,
    batch_id: Optional[str],
    db: Session,
    viewer_role: Optional[str] = None
) -> ProgramCurriculumResponse:
    batch = db.query(Batch).filter(Batch.id == batch_id).first() if batch_id else None
    is_published = getattr(program, "is_curriculum_published", True)
    if is_published is None:
        is_published = True

    # If viewer is STUDENT or MENTOR and curriculum is not yet published, hide topics
    if viewer_role in ("STUDENT", "MENTOR") and not is_published:
        return ProgramCurriculumResponse(
            program_id=program.id,
            program_title=program.title,
            program_code=program.code,
            batch_id=batch.id if batch else None,
            batch_name=batch.name if batch else None,
            total_topics=0,
            completed_topics=0,
            completion_percentage=0.0,
            is_published=False,
            topics=[]
        )

    # Fetch topics for program ordered by order_index
    topics = db.query(CurriculumTopic)\
        .filter(CurriculumTopic.program_id == program.id)\
        .order_by(CurriculumTopic.order_index.asc(), CurriculumTopic.id.asc())\
        .all()

    # Fetch progress records
    progress_query = db.query(CurriculumProgress)\
        .filter(CurriculumProgress.program_id == program.id)

    if batch_id:
        # Match batch-specific progress, fallback to general progress
        progress_records = progress_query.filter(
            (CurriculumProgress.batch_id == batch_id) | (CurriculumProgress.batch_id.is_(None))
        ).all()
    else:
        progress_records = progress_query.all()

    # Build topic_id -> progress map (prioritizing batch-specific if available)
    progress_map = {}
    for p in progress_records:
        if p.topic_id not in progress_map or (p.batch_id == batch_id and batch_id is not None):
            progress_map[p.topic_id] = p

    # Build topic responses
    topic_responses: List[TopicItemResponse] = []
    completed_count = 0

    for t in topics:
        prog = progress_map.get(t.id)
        is_done = bool(prog and prog.is_completed)
        if is_done:
            completed_count += 1

        mentor = db.query(User).filter(User.id == prog.completed_by).first() if (prog and prog.completed_by) else None

        topic_responses.append(TopicItemResponse(
            id=t.id,
            program_id=t.program_id,
            module_name=t.module_name,
            title=t.title,
            description=t.description,
            order_index=t.order_index,
            is_completed=is_done,
            completed_at=prog.completed_at if prog else None,
            completed_by_id=prog.completed_by if prog else None,
            completed_by_name=mentor.full_name if mentor else None,
            assessment_name=prog.assessment_name if prog else None,
            notes=prog.notes if prog else None
        ))

    total_count = len(topics)
    pct = round((completed_count / total_count * 100.0), 1) if total_count > 0 else 0.0

    return ProgramCurriculumResponse(
        program_id=program.id,
        program_title=program.title,
        program_code=program.code,
        batch_id=batch.id if batch else None,
        batch_name=batch.name if batch else None,
        total_topics=total_count,
        completed_topics=completed_count,
        completion_percentage=pct,
        is_published=is_published,
        topics=topic_responses
    )


@router.get("/programs/{program_id}", response_model=ProgramCurriculumResponse)
def get_program_curriculum(
    program_id: str,
    batch_id: Optional[str] = Query(None, description="Optional batch ID to get cohort-specific progress"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get curriculum topics and completion progress for a given program/batch.
    Accessible to Mentor, Student, HR, and Super Admin.
    """
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found.")

    return build_program_curriculum_response(program, batch_id, db, viewer_role=current_user.role)


@router.get("/my-curriculum", response_model=ProgramCurriculumResponse)
def get_my_curriculum(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the curriculum and progress for the current logged-in user:
    - If STUDENT: returns their enrolled program and batch curriculum.
    - If MENTOR / HR: returns the default active program curriculum.
    """
    if current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or not student.program_id:
            # Fallback to first program if profile has no program set
            program = db.query(Program).first()
            if not program:
                raise HTTPException(status_code=404, detail="No programs configured.")
            return build_program_curriculum_response(program, None, db, viewer_role=current_user.role)

        program = db.query(Program).filter(Program.id == student.program_id).first()
        if not program:
            raise HTTPException(status_code=404, detail="Enrolled program not found.")
        return build_program_curriculum_response(program, student.batch_id, db, viewer_role=current_user.role)

    # For MENTOR / HR / SUPER_ADMIN, return the first program
    program = db.query(Program).first()
    if not program:
        raise HTTPException(status_code=404, detail="No programs configured.")
    return build_program_curriculum_response(program, None, db, viewer_role=current_user.role)


@router.get("/summary", response_model=List[ProgramCurriculumResponse])
def get_all_programs_curriculum_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns curriculum summaries for all active programs.
    Used on HR and Mentor dashboard overviews.
    """
    programs = db.query(Program).all()
    results = []
    for p in programs:
        results.append(build_program_curriculum_response(p, None, db, viewer_role=current_user.role))
    return results


@router.put("/programs/{program_id}/publish", response_model=ProgramCurriculumResponse)
def publish_program_curriculum(
    program_id: str,
    payload: CurriculumPublishPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Publish or unpublish the curriculum for a program.
    When published, it is visible to Mentors and registered Students of this program.
    """
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found.")

    program.is_curriculum_published = payload.is_published
    program.updated_at = datetime.utcnow()

    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="PUBLISH_CURRICULUM" if payload.is_published else "UNPUBLISH_CURRICULUM",
        entity="Program",
        entity_id=program.id,
        new_values=json.dumps({
            "program_id": program.id,
            "is_curriculum_published": payload.is_published,
            "published_by": current_user.full_name
        }),
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(program)

    return build_program_curriculum_response(program, None, db, viewer_role=current_user.role)


@router.post("/programs/{program_id}/import", response_model=ProgramCurriculumResponse)
def import_program_curriculum(
    program_id: str,
    payload: CurriculumImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Bulk import curriculum topics for a program from CSV or JSON.
    Optionally replaces existing topics or appends to them.
    """
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found.")

    if not payload.topics:
        raise HTTPException(status_code=400, detail="Cannot import empty curriculum topic list.")

    if payload.replace_existing:
        # Delete existing topics for this program
        db.query(CurriculumTopic).filter(CurriculumTopic.program_id == program.id).delete(synchronize_session=False)

    # Determine starting order index
    existing_max_order = db.query(CurriculumTopic.order_index)\
        .filter(CurriculumTopic.program_id == program.id)\
        .order_by(CurriculumTopic.order_index.desc())\
        .first()
    current_order = (existing_max_order[0] if existing_max_order else 0)

    imported_topics = []
    for item in payload.topics:
        current_order += 1
        new_topic = CurriculumTopic(
            id=str(uuid.uuid4()),
            program_id=program.id,
            module_name=item.module_name.strip(),
            title=item.title.strip(),
            description=item.description.strip() if item.description else None,
            order_index=item.order_index if item.order_index is not None else current_order,
            created_at=datetime.utcnow()
        )
        db.add(new_topic)
        imported_topics.append(new_topic)

    # Log action in audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        actor_id=current_user.id,
        action="IMPORT_CURRICULUM",
        entity="Program",
        entity_id=program.id,
        new_values=json.dumps({
            "program_id": program.id,
            "imported_count": len(imported_topics),
            "replace_existing": payload.replace_existing,
            "imported_by": current_user.full_name
        }),
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(program)

    return build_program_curriculum_response(program, None, db, viewer_role=current_user.role)


@router.post("/programs/{program_id}/topics", response_model=TopicItemResponse)
def add_single_topic(
    program_id: str,
    payload: CurriculumTopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Manually add an individual topic to a program's curriculum.
    """
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found.")

    topic = CurriculumTopic(
        id=str(uuid.uuid4()),
        program_id=program.id,
        module_name=payload.module_name.strip(),
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        order_index=payload.order_index or 1,
        created_at=datetime.utcnow()
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return TopicItemResponse(
        id=topic.id,
        program_id=topic.program_id,
        module_name=topic.module_name,
        title=topic.title,
        description=topic.description,
        order_index=topic.order_index,
        is_completed=False
    )


@router.put("/topics/{topic_id}", response_model=TopicItemResponse)
def update_topic(
    topic_id: str,
    payload: CurriculumTopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Update topic module name, title, description, or sequence order.
    """
    topic = db.query(CurriculumTopic).filter(CurriculumTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found.")

    if payload.module_name is not None:
        topic.module_name = payload.module_name.strip()
    if payload.title is not None:
        topic.title = payload.title.strip()
    if payload.description is not None:
        topic.description = payload.description.strip()
    if payload.order_index is not None:
        topic.order_index = payload.order_index

    db.commit()
    db.refresh(topic)

    return TopicItemResponse(
        id=topic.id,
        program_id=topic.program_id,
        module_name=topic.module_name,
        title=topic.title,
        description=topic.description,
        order_index=topic.order_index,
        is_completed=False
    )


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(
    topic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Delete a single curriculum topic.
    """
    topic = db.query(CurriculumTopic).filter(CurriculumTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found.")

    db.delete(topic)
    db.commit()
    return None


@router.put("/topics/{topic_id}/progress", response_model=TopicItemResponse)
def update_topic_progress(
    topic_id: str,
    payload: TopicProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MENTOR", "HR", "SUPER_ADMIN"]))
):
    """
    Mark a curriculum topic as completed or in-progress after an assessment.
    Automatically updates the completion percentage across mentor, student, and HR views.
    """
    topic = db.query(CurriculumTopic).filter(CurriculumTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Curriculum topic not found.")

    # Check if a progress record exists for this topic and batch
    progress_record = db.query(CurriculumProgress).filter(
        CurriculumProgress.topic_id == topic_id,
        CurriculumProgress.batch_id == payload.batch_id
    ).first()

    now = datetime.utcnow()

    if progress_record:
        progress_record.is_completed = payload.is_completed
        progress_record.completed_at = now if payload.is_completed else None
        progress_record.completed_by = current_user.id if payload.is_completed else None
        progress_record.assessment_name = payload.assessment_name if payload.is_completed else None
        progress_record.notes = payload.notes if payload.is_completed else None
        progress_record.updated_at = now
        db.commit()
        db.refresh(progress_record)
    else:
        progress_record = CurriculumProgress(
            id=str(uuid.uuid4()),
            topic_id=topic_id,
            program_id=topic.program_id,
            batch_id=payload.batch_id,
            is_completed=payload.is_completed,
            completed_at=now if payload.is_completed else None,
            completed_by=current_user.id if payload.is_completed else None,
            assessment_name=payload.assessment_name if payload.is_completed else None,
            notes=payload.notes if payload.is_completed else None,
            created_at=now,
            updated_at=now
        )
        db.add(progress_record)
        db.commit()
        db.refresh(progress_record)

    mentor = db.query(User).filter(User.id == progress_record.completed_by).first() if progress_record.completed_by else None

    return TopicItemResponse(
        id=topic.id,
        program_id=topic.program_id,
        module_name=topic.module_name,
        title=topic.title,
        description=topic.description,
        order_index=topic.order_index,
        is_completed=progress_record.is_completed,
        completed_at=progress_record.completed_at,
        completed_by_id=progress_record.completed_by,
        completed_by_name=mentor.full_name if mentor else current_user.full_name,
        assessment_name=progress_record.assessment_name,
        notes=progress_record.notes
    )
