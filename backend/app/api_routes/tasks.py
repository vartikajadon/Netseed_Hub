import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, Batch, Task, TaskSubmission
from app.schemas.task_schemas import (
    TaskCreate,
    TaskResponse,
    TaskSubmissionCreate,
    TaskEvaluationRequest,
    TaskSubmissionResponse
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/tasks", tags=["Task Assignment & Evaluation"])

def serialize_task(
    t: Task,
    db: Session,
    batches_map: Optional[dict] = None,
    mentors_map: Optional[dict] = None,
    sub_counts_map: Optional[dict] = None
) -> TaskResponse:
    if batches_map is not None:
        batch_name = batches_map.get(t.batch_id)
    else:
        batch = db.query(Batch).filter(Batch.id == t.batch_id).first()
        batch_name = batch.name if batch else None

    if mentors_map is not None:
        mentor_name = mentors_map.get(t.mentor_id)
    elif t.mentor_id:
        mentor = db.query(User).filter(User.id == t.mentor_id).first()
        mentor_name = mentor.full_name if mentor else None
    else:
        mentor_name = None

    if sub_counts_map is not None:
        submission_count = sub_counts_map.get(t.id, 0)
    else:
        submission_count = db.query(TaskSubmission).filter(TaskSubmission.task_id == t.id).count()

    assigned_ids = []
    if t.assigned_student_ids:
        try:
            assigned_ids = json.loads(t.assigned_student_ids)
        except Exception:
            assigned_ids = []

    return TaskResponse(
        id=t.id,
        title=t.title,
        description=t.description,
        file_url=t.file_url,
        file_name=t.file_name,
        batch_id=t.batch_id,
        batch_name=batch_name,
        mentor_id=t.mentor_id,
        mentor_name=mentor_name,
        due_date=t.due_date,
        assign_to_all=t.assign_to_all,
        assigned_student_ids=assigned_ids,
        max_marks=t.max_marks or 100,
        submission_count=submission_count,
        created_at=t.created_at
    )

def serialize_submission(
    sub: TaskSubmission,
    db: Session,
    tasks_map: Optional[dict] = None,
    students_map: Optional[dict] = None,
    users_map: Optional[dict] = None,
    batches_map: Optional[dict] = None
) -> TaskSubmissionResponse:
    if tasks_map is not None:
        task = tasks_map.get(sub.task_id)
    else:
        task = db.query(Task).filter(Task.id == sub.task_id).first()

    if students_map is not None:
        student = students_map.get(sub.student_id)
    else:
        student = db.query(Student).filter(Student.id == sub.student_id).first()

    student_user = None
    if student:
        if users_map is not None:
            student_user = users_map.get(student.user_id)
        else:
            student_user = student.user

    batch_name = None
    batch_id = student.batch_id if student and student.batch_id else (task.batch_id if task else None)
    if batches_map is not None:
        batch_name = batches_map.get(batch_id)
    elif batch_id:
        batch = db.query(Batch).filter(Batch.id == batch_id).first()
        batch_name = batch.name if batch else None

    evaluator_name = None
    if sub.evaluated_by:
        if users_map is not None:
            eval_user = users_map.get(sub.evaluated_by)
            evaluator_name = eval_user.full_name if eval_user else None
        else:
            evaluator = db.query(User).filter(User.id == sub.evaluated_by).first()
            evaluator_name = evaluator.full_name if evaluator else None

    return TaskSubmissionResponse(
        id=sub.id,
        task_id=sub.task_id,
        task_title=task.title if task else "Untitled Task",
        batch_id=batch_id,
        batch_name=batch_name,
        student_id=sub.student_id,
        student_name=student_user.full_name if student_user else "Unknown Student",
        student_roll_no=student.roll_number if student else "N/A",
        student_email=student_user.email if student_user else None,
        submission_type=sub.submission_type or "CODE_LINK",
        code_link=sub.code_link,
        text_output=sub.text_output,
        file_url=sub.file_url,
        file_name=sub.file_name,
        status=sub.status,
        marks=float(sub.marks) if sub.marks is not None else None,
        max_marks=sub.max_marks or 100,
        feedback=sub.feedback,
        evaluated_by_name=evaluator_name,
        evaluated_at=sub.evaluated_at,
        ack_sent_to_student=sub.ack_sent_to_student or False,
        ack_sent_to_hr=sub.ack_sent_to_hr or False,
        ack_message=sub.ack_message,
        due_date=task.due_date if task else None,
        submitted_at=sub.submitted_at
    )

# ----------------------------------------------------
# 1. TASK ASSIGNMENT ENDPOINTS
# ----------------------------------------------------

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    batch_id: Optional[str] = None,
    mentor_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List tasks. Mentors/HR/Admins see all created tasks (optionally filtered by batch).
    Students only see tasks assigned to their batch where they are eligible.
    """
    query = db.query(Task)

    if current_user.role == "STUDENT":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile or not student_profile.batch_id:
            return []
        query = query.filter(Task.batch_id == student_profile.batch_id)
        tasks = query.order_by(Task.created_at.desc()).all()

        eligible_tasks = []
        for t in tasks:
            if t.assign_to_all:
                eligible_tasks.append(t)
            else:
                try:
                    s_ids = json.loads(t.assigned_student_ids or "[]")
                    if student_profile.id in s_ids:
                        eligible_tasks.append(t)
                except Exception:
                    pass
        tasks = eligible_tasks
    else:
        if batch_id:
            query = query.filter(Task.batch_id == batch_id)
        if mentor_id:
            query = query.filter(Task.mentor_id == mentor_id)
        if search:
            query = query.filter(Task.title.ilike(f"%{search}%"))
        tasks = query.order_by(Task.created_at.desc()).all()

    if not tasks:
        return []

    # Batch pre-fetch lookups to eliminate N+1 queries
    batch_ids = {t.batch_id for t in tasks if t.batch_id}
    mentor_ids = {t.mentor_id for t in tasks if t.mentor_id}
    task_ids = [t.id for t in tasks]

    batches_map = {}
    if batch_ids:
        b_rows = db.query(Batch.id, Batch.name).filter(Batch.id.in_(batch_ids)).all()
        batches_map = {b[0]: b[1] for b in b_rows}

    mentors_map = {}
    if mentor_ids:
        m_rows = db.query(User.id, User.full_name).filter(User.id.in_(mentor_ids)).all()
        mentors_map = {m[0]: m[1] for m in m_rows}

    sub_counts_map = {}
    if task_ids:
        counts = db.query(TaskSubmission.task_id, func.count(TaskSubmission.id)).filter(
            TaskSubmission.task_id.in_(task_ids)
        ).group_by(TaskSubmission.task_id).all()
        sub_counts_map = {c[0]: c[1] for c in counts}

    return [
        serialize_task(t, db, batches_map=batches_map, mentors_map=mentors_map, sub_counts_map=sub_counts_map)
        for t in tasks
    ]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MENTOR", "HR", "SUPER_ADMIN"]))
):
    """
    Mentor assigns a task to an active batch.
    Can write instructions or import a PDF document (or both), with title, due date,
    and assignee targeting (all students in batch or specific students).
    """
    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Specified batch does not exist.")

    # Convert assigned student IDs to JSON string if provided
    assigned_json = json.dumps(payload.assigned_student_ids or []) if not payload.assign_to_all else None

    new_task = Task(
        id=str(uuid.uuid4()),
        title=payload.title,
        description=payload.description,
        file_url=payload.file_url,
        file_name=payload.file_name,
        batch_id=payload.batch_id,
        mentor_id=current_user.id,
        due_date=payload.due_date,
        assign_to_all=payload.assign_to_all,
        assigned_student_ids=assigned_json,
        max_marks=payload.max_marks or 100,
        created_at=datetime.utcnow()
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Dispatch notification to batch trainees
    students_query = db.query(Student).filter(Student.batch_id == payload.batch_id)
    if not payload.assign_to_all and payload.assigned_student_ids:
        students_query = students_query.filter(Student.id.in_(payload.assigned_student_ids))
    target_students = students_query.all()

    due_str = payload.due_date.strftime("%b %d, %Y %I:%M %p") if isinstance(payload.due_date, datetime) else str(payload.due_date)
    for std in target_students:
        create_notification(
            db=db,
            user_id=std.user_id,
            title=f"New Task Assigned: {payload.title}",
            message=f"Mentor {current_user.full_name} assigned a new task '{payload.title}' for {batch.name}. Last date for submission: {due_str}.",
            notification_type="GENERAL",
            link_url="/student/tasks"
        )

    return serialize_task(new_task, db)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return serialize_task(task, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MENTOR", "HR", "SUPER_ADMIN"]))
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()
    return None


# ----------------------------------------------------
# 2. TASK SUBMISSION & EVALUATION ENDPOINTS
# ----------------------------------------------------

@router.post("/{task_id}/submit", response_model=TaskSubmissionResponse)
def submit_task(
    task_id: str,
    payload: TaskSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Student submits their work for a task: code repository link or text output.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=403, detail="Only enrolled trainees can submit tasks.")

    if not payload.code_link and not payload.text_output and not payload.file_url:
        raise HTTPException(status_code=400, detail="Please provide either a code repository link or text output.")

    # Determine submission type
    sub_type = "BOTH" if (payload.code_link and payload.text_output) else ("CODE_LINK" if payload.code_link else "TEXT_OUTPUT")

    # Check if student already submitted for this task
    existing_sub = db.query(TaskSubmission).filter(
        TaskSubmission.task_id == task_id,
        TaskSubmission.student_id == student.id
    ).first()

    if existing_sub:
        existing_sub.code_link = payload.code_link
        existing_sub.text_output = payload.text_output
        existing_sub.file_url = payload.file_url
        existing_sub.file_name = payload.file_name
        existing_sub.submission_type = sub_type
        existing_sub.submitted_at = datetime.utcnow()
        existing_sub.status = "PENDING_EVALUATION"
        db.commit()
        db.refresh(existing_sub)
        sub_record = existing_sub
    else:
        sub_record = TaskSubmission(
            id=str(uuid.uuid4()),
            task_id=task_id,
            student_id=student.id,
            submission_type=sub_type,
            code_link=payload.code_link,
            text_output=payload.text_output,
            file_url=payload.file_url,
            file_name=payload.file_name,
            status="PENDING_EVALUATION",
            max_marks=task.max_marks or 100,
            submitted_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(sub_record)
        db.commit()
        db.refresh(sub_record)

    # Notify mentor
    if task.mentor_id:
        create_notification(
            db=db,
            user_id=task.mentor_id,
            title=f"Task Submission: {task.title}",
            message=f"{current_user.full_name} submitted work for task '{task.title}' ({'Code link' if payload.code_link else 'Text output'}). Ready for evaluation.",
            notification_type="TASK_COMPLETED",
            link_url="/mentor/task-evaluation"
        )

    return serialize_submission(sub_record, db)


# Global submission listing (for evaluation portal)
submission_router = APIRouter(prefix="/task-submissions", tags=["Task Evaluation & Grading"])

@submission_router.get("", response_model=List[TaskSubmissionResponse])
def list_task_submissions(
    task_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    student_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List submissions for evaluation. Mentors and HR can inspect code link, text output,
    marks, and acknowledgement delivery statuses.
    """
    query = db.query(TaskSubmission)

    if current_user.role == "STUDENT":
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile:
            return []
        query = query.filter(TaskSubmission.student_id == student_profile.id)
    elif student_id:
        query = query.filter(TaskSubmission.student_id == student_id)

    if task_id:
        query = query.filter(TaskSubmission.task_id == task_id)

    if status_filter and status_filter != "ALL":
        query = query.filter(TaskSubmission.status == status_filter)

    submissions = query.order_by(TaskSubmission.submitted_at.desc()).all()
    if not submissions:
        return []

    # Batch pre-fetch lookups to eliminate N+1 queries
    task_ids = {s.task_id for s in submissions if s.task_id}
    student_ids = {s.student_id for s in submissions if s.student_id}
    eval_user_ids = {s.evaluated_by for s in submissions if s.evaluated_by}

    tasks_map = {}
    if task_ids:
        t_rows = db.query(Task).filter(Task.id.in_(task_ids)).all()
        tasks_map = {t.id: t for t in t_rows}

    students_map = {}
    student_user_ids = set()
    batch_ids = set()
    if student_ids:
        st_rows = db.query(Student).filter(Student.id.in_(student_ids)).all()
        students_map = {st.id: st for st in st_rows}
        for st in st_rows:
            if st.user_id:
                student_user_ids.add(st.user_id)
            if st.batch_id:
                batch_ids.add(st.batch_id)

    all_user_ids = eval_user_ids.union(student_user_ids)
    users_map = {}
    if all_user_ids:
        u_rows = db.query(User).filter(User.id.in_(all_user_ids)).all()
        users_map = {u.id: u for u in u_rows}

    for t in tasks_map.values():
        if t.batch_id:
            batch_ids.add(t.batch_id)

    batches_map = {}
    if batch_ids:
        b_rows = db.query(Batch.id, Batch.name).filter(Batch.id.in_(batch_ids)).all()
        batches_map = {b[0]: b[1] for b in b_rows}

    # Filter in memory if batch_id or search is provided
    results = []
    for sub in submissions:
        serialized = serialize_submission(
            sub, db,
            tasks_map=tasks_map,
            students_map=students_map,
            users_map=users_map,
            batches_map=batches_map
        )
        if batch_id and serialized.batch_id != batch_id:
            continue
        if search:
            q = search.lower()
            if not (q in serialized.student_name.lower() or q in serialized.student_roll_no.lower() or q in serialized.task_title.lower()):
                continue
        results.append(serialized)

    return results


@submission_router.put("/{submission_id}/evaluate", response_model=TaskSubmissionResponse)
def evaluate_submission(
    submission_id: str,
    payload: TaskEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["MENTOR", "HR", "SUPER_ADMIN"]))
):
    """
    Mentor evaluates submission: assigns marks, adds review feedback,
    and dispatches acknowledgement to HR and/or Student based on mentor's respective choice.
    """
    sub = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Task submission not found.")

    task = db.query(Task).filter(Task.id == sub.task_id).first()
    student = db.query(Student).filter(Student.id == sub.student_id).first()
    student_user = student.user if student else None

    # Update evaluation fields
    sub.marks = payload.marks
    sub.max_marks = payload.max_marks or 100
    sub.feedback = payload.feedback
    sub.status = "EVALUATED"
    sub.evaluated_by = current_user.id
    sub.evaluated_at = datetime.utcnow()
    sub.ack_sent_to_student = payload.send_ack_student
    sub.ack_sent_to_hr = payload.send_ack_hr
    sub.ack_message = payload.ack_message

    db.commit()
    db.refresh(sub)

    # 1. Dispatch acknowledgement to Student if selected by mentor
    if payload.send_ack_student and student_user:
        feedback_snippet = f" Feedback: '{payload.feedback}'" if payload.feedback else ""
        ack_note = f" Note: {payload.ack_message}" if payload.ack_message else ""
        create_notification(
            db=db,
            user_id=student_user.id,
            title=f"Task Evaluated: {task.title if task else 'Assigned Task'}",
            message=f"Mentor {current_user.full_name} evaluated your submission with {payload.marks}/{sub.max_marks} marks.{feedback_snippet}{ack_note}",
            notification_type="ACKNOWLEDGEMENT",
            link_url="/student/tasks"
        )

    # 2. Dispatch acknowledgement to HR if selected by mentor
    if payload.send_ack_hr:
        std_name = student_user.full_name if student_user else "Trainee"
        roll = student.roll_number if student else "N/A"
        t_title = task.title if task else "Task"
        create_notification(
            db=db,
            target_role="HR",
            title=f"Trainee Task Evaluation Acknowledged: {std_name}",
            message=f"Mentor {current_user.full_name} completed task evaluation for trainee {std_name} (Roll: {roll}) on '{t_title}'. Score awarded: {payload.marks}/{sub.max_marks}.",
            notification_type="ACKNOWLEDGEMENT",
            link_url="/mentor/task-evaluation"
        )

    return serialize_submission(sub, db)
