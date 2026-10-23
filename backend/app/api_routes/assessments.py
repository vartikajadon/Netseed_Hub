from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, Batch, Assessment, AssessmentSubmission, Program, CurriculumTopic
from app.schemas.assessment_schemas import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentUnlockToggle,
    AssessmentResponse,
    AssessmentSubmissionCreate,
    AssessmentEvaluationRequest,
    AssessmentSubmissionResponse,
    StudentScoreSheetItem,
    ScoreSheetEntry,
    StudentScoresheetUpdate,
    AssessmentMarksDirectUpdate,
    BatchSendToManagementRequest,
    StudentCurriculumSkillItem,
    StudentCurriculumSkillsResponse,
)
from app.services.notification_service import create_notification


router = APIRouter(prefix="/assessments", tags=["Mentor & Student Assessments"])
submission_router = APIRouter(prefix="/assessment-submissions", tags=["Assessment Submissions & Evaluation"])


def serialize_assessment(
    a: Assessment,
    db: Session,
    current_user: Optional[User] = None,
    student_record: Optional[Student] = None,
    batches_map: Optional[dict] = None,
    mentors_map: Optional[dict] = None,
    sub_counts_map: Optional[dict] = None,
    my_subs_map: Optional[dict] = None,
) -> AssessmentResponse:
    if batches_map is not None:
        batch_name = batches_map.get(a.batch_id)
    else:
        batch = db.query(Batch).filter(Batch.id == a.batch_id).first()
        batch_name = batch.name if batch else None

    if mentors_map is not None:
        mentor_name = mentors_map.get(a.mentor_id)
    elif a.mentor_id:
        mentor = db.query(User).filter(User.id == a.mentor_id).first()
        mentor_name = mentor.full_name if mentor else None
    else:
        mentor_name = None

    if sub_counts_map is not None:
        submission_count = sub_counts_map.get(a.id, 0)
    else:
        submission_count = db.query(AssessmentSubmission).filter(AssessmentSubmission.assessment_id == a.id).count()

    is_student = current_user and current_user.role == "STUDENT"
    now = datetime.utcnow()

    # Rule: Assessment automatically shows a week before scheduled date
    is_visible_to_student = True
    if a.scheduled_date:
        is_visible_to_student = (now >= (a.scheduled_date - timedelta(days=7))) or a.is_unlocked

    # Rule: Can only attempt and view/download question paper when mentor unlocks it
    can_attempt = bool(a.is_unlocked)

    has_submitted = False
    my_sub_data = None
    if student_record:
        if my_subs_map is not None:
            my_sub = my_subs_map.get(a.id)
        else:
            my_sub = db.query(AssessmentSubmission).filter(
                AssessmentSubmission.assessment_id == a.id,
                AssessmentSubmission.student_id == student_record.id,
            ).first()
        if my_sub:
            has_submitted = True
            my_sub_data = {
                "id": my_sub.id,
                "submission_link": my_sub.submission_link,
                "submission_notes": my_sub.submission_notes,
                "status": my_sub.status,
                "marks_obtained": float(my_sub.marks_obtained) if my_sub.marks_obtained is not None else None,
                "total_marks": a.total_marks,
                "passing_marks": a.passing_marks,
                "feedback": my_sub.feedback,
                "submitted_at": my_sub.submitted_at.isoformat() if my_sub.submitted_at else None,
                "evaluated_at": my_sub.evaluated_at.isoformat() if my_sub.evaluated_at else None,
            }

    # Hide paper content from students if locked
    paper_content = a.paper_content
    paper_file_url = a.paper_file_url
    paper_file_name = a.paper_file_name

    if is_student and not a.is_unlocked:
        paper_content = None
        paper_file_url = None
        paper_file_name = None

    return AssessmentResponse(
        id=a.id,
        title=a.title,
        description=a.description,
        level=a.level,
        batch_id=a.batch_id,
        batch_name=batch_name,
        mentor_id=a.mentor_id,
        mentor_name=mentor_name,
        scheduled_date=a.scheduled_date,
        duration_minutes=a.duration_minutes or 60,
        total_marks=a.total_marks or 100,
        passing_marks=a.passing_marks or 40,
        paper_content=paper_content,
        paper_file_url=paper_file_url,
        paper_file_name=paper_file_name,
        skill_unlocked=a.skill_unlocked,
        is_unlocked=bool(a.is_unlocked),
        is_visible_to_student=is_visible_to_student,
        can_attempt=can_attempt,
        submission_count=submission_count,
        has_submitted=has_submitted,
        my_submission=my_sub_data,
        created_at=a.created_at,
    )


def serialize_submission(sub: AssessmentSubmission, db: Session) -> AssessmentSubmissionResponse:
    assessment = db.query(Assessment).filter(Assessment.id == sub.assessment_id).first()
    student = db.query(Student).filter(Student.id == sub.student_id).first()
    student_user = student.user if student else None
    batch = db.query(Batch).filter(Batch.id == student.batch_id).first() if student and student.batch_id else None
    evaluator = db.query(User).filter(User.id == sub.evaluated_by).first() if sub.evaluated_by else None

    total_marks = assessment.total_marks if assessment else 100
    passing_marks = assessment.passing_marks if assessment else 40
    marks_val = float(sub.marks_obtained) if sub.marks_obtained is not None else None
    is_passed = (marks_val >= passing_marks) if marks_val is not None else None

    return AssessmentSubmissionResponse(
        id=sub.id,
        assessment_id=sub.assessment_id,
        assessment_title=assessment.title if assessment else "Untitled Assessment",
        assessment_level=assessment.level if assessment else "ENTRY_LEVEL",
        batch_id=batch.id if batch else (assessment.batch_id if assessment else None),
        batch_name=batch.name if batch else None,
        student_id=sub.student_id,
        student_name=student_user.full_name if student_user else "Unknown Student",
        student_roll_no=student.roll_number if student else "N/A",
        student_email=student_user.email if student_user else None,
        submission_link=sub.submission_link,
        submission_notes=sub.submission_notes,
        answer_file_url=sub.answer_file_url,
        answer_file_name=sub.answer_file_name,
        status=sub.status,
        marks_obtained=marks_val,
        total_marks=total_marks,
        passing_marks=passing_marks,
        is_passed=is_passed,
        feedback=sub.feedback,
        evaluated_by_name=evaluator.full_name if evaluator else None,
        evaluated_at=sub.evaluated_at,
        submitted_at=sub.submitted_at,
    )


# -------------------------------------------------------------
# Assessment Management Endpoints
# -------------------------------------------------------------

@router.get("", response_model=List[AssessmentResponse], summary="List Assessments")
def get_assessments(
    batch_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Assessment)

    student_record = None
    if current_user.role == "STUDENT":
        student_record = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_record or not student_record.batch_id:
            return []
        query = query.filter(Assessment.batch_id == student_record.batch_id)
    elif batch_id:
        query = query.filter(Assessment.batch_id == batch_id)

    if level:
        query = query.filter(Assessment.level == level)

    assessments = query.order_by(Assessment.scheduled_date.asc(), Assessment.created_at.desc()).all()
    if not assessments:
        return []

    # Batch pre-fetch maps to eliminate N+1 queries
    batch_ids = {a.batch_id for a in assessments if a.batch_id}
    mentor_ids = {a.mentor_id for a in assessments if a.mentor_id}
    assess_ids = [a.id for a in assessments]

    batches_map = {}
    if batch_ids:
        b_rows = db.query(Batch.id, Batch.name).filter(Batch.id.in_(batch_ids)).all()
        batches_map = {b[0]: b[1] for b in b_rows}

    mentors_map = {}
    if mentor_ids:
        m_rows = db.query(User.id, User.full_name).filter(User.id.in_(mentor_ids)).all()
        mentors_map = {m[0]: m[1] for m in m_rows}

    sub_counts_map = {}
    if assess_ids:
        counts = db.query(AssessmentSubmission.assessment_id, func.count(AssessmentSubmission.id)).filter(
            AssessmentSubmission.assessment_id.in_(assess_ids)
        ).group_by(AssessmentSubmission.assessment_id).all()
        sub_counts_map = {c[0]: c[1] for c in counts}

    my_subs_map = {}
    if student_record and assess_ids:
        subs = db.query(AssessmentSubmission).filter(
            AssessmentSubmission.assessment_id.in_(assess_ids),
            AssessmentSubmission.student_id == student_record.id
        ).all()
        my_subs_map = {s.assessment_id: s for s in subs}

    # Filter 1-week visibility rule for students
    now = datetime.utcnow()
    results = []
    for a in assessments:
        if current_user.role == "STUDENT":
            is_visible = (now >= (a.scheduled_date - timedelta(days=7))) or a.is_unlocked
            if not is_visible:
                continue
        results.append(serialize_assessment(
            a, db, current_user, student_record,
            batches_map=batches_map,
            mentors_map=mentors_map,
            sub_counts_map=sub_counts_map,
            my_subs_map=my_subs_map
        ))

    return results


@router.get("/student-curriculum-skills", response_model=StudentCurriculumSkillsResponse, summary="Get Student Skills Linked to Curriculum & Passed Assessments")
def get_student_curriculum_skills(
    student_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns skills structured according to the student's curriculum and level of concepts.
    Skills are dynamically unlocked when the student successfully passes (>= passing_marks)
    the assessment designated by the mentor for that topic/skill.
    """
    student = None
    if current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
    elif student_id:
        student = db.query(Student).filter(Student.id == student_id).first()
    else:
        student = db.query(Student).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    program = db.query(Program).filter(Program.id == student.program_id).first() if student.program_id else None
    if not program:
        program = db.query(Program).first()

    batch = db.query(Batch).filter(Batch.id == student.batch_id).first() if student.batch_id else None

    # Curriculum topics
    topics = []
    if program:
        topics = db.query(CurriculumTopic).filter(
            CurriculumTopic.program_id == program.id
        ).order_by(CurriculumTopic.order_index.asc()).all()

    # Assessments in student's batch
    batch_assessments = []
    if student.batch_id:
        batch_assessments = db.query(Assessment).filter(Assessment.batch_id == student.batch_id).all()
    else:
        batch_assessments = db.query(Assessment).all()

    # Student's evaluated submissions
    submissions = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.student_id == student.id
    ).all()
    sub_by_assessment = {sub.assessment_id: sub for sub in submissions}

    evaluator_ids = {sub.evaluated_by for sub in submissions if sub.evaluated_by}
    evaluators_map = {}
    if evaluator_ids:
        u_rows = db.query(User.id, User.full_name).filter(User.id.in_(evaluator_ids)).all()
        evaluators_map = {u[0]: u[1] for u in u_rows}

    def get_level_info(level_str: str):
        if level_str == "EXIT_LEVEL":
            return ("EXIT_LEVEL", "Advanced")
        elif level_str == "MIDDLE_LEVEL":
            return ("MIDDLE_LEVEL", "Intermediate")
        return ("ENTRY_LEVEL", "Beginner")

    skills_list: List[StudentCurriculumSkillItem] = []
    seen_skill_names = set()

    # 1. Process assessments with mentor-assigned `skill_unlocked`
    for assess in batch_assessments:
        if not assess.skill_unlocked:
            continue

        skill_title = assess.skill_unlocked.strip()
        if not skill_title or skill_title.lower() in seen_skill_names:
            continue
        seen_skill_names.add(skill_title.lower())

        sub = sub_by_assessment.get(assess.id)
        is_passed = False
        marks_obtained = None
        score_pct = None
        unlocked_at = None
        unlocked_by_name = None

        if sub and sub.status == "EVALUATED" and sub.marks_obtained is not None:
            marks_obtained = float(sub.marks_obtained)
            total = assess.total_marks or 100
            score_pct = round((marks_obtained / total) * 100, 1) if total > 0 else 0
            passing = assess.passing_marks or 40
            if marks_obtained >= passing:
                is_passed = True
                unlocked_at = sub.evaluated_at or sub.updated_at
                unlocked_by_name = evaluators_map.get(sub.evaluated_by, "Mentor") if sub.evaluated_by else "Mentor"

        lvl, lvl_lbl = get_level_info(assess.level)

        skills_list.append(StudentCurriculumSkillItem(
            id=f"assess-skill-{assess.id}",
            skill_name=skill_title,
            module_name=assess.level.replace("_", " ").title(),
            level=lvl,
            level_label=lvl_lbl,
            is_unlocked=is_passed,
            status="UNLOCKED" if is_passed else "LOCKED",
            unlocked_at=unlocked_at,
            unlocked_by_name=unlocked_by_name,
            assessment_id=assess.id,
            assessment_title=assess.title,
            marks_obtained=marks_obtained,
            total_marks=assess.total_marks or 100,
            passing_marks=assess.passing_marks or 40,
            score_percentage=score_pct,
            description=assess.description or f"Unlocked by achieving ≥{assess.passing_marks or 40}% in {assess.title}."
        ))

    # 2. Process curriculum topics according to curriculum concept levels
    num_topics = len(topics)
    for idx, topic in enumerate(topics):
        topic_title = topic.title.strip()
        if idx < num_topics * 0.35:
            lvl, lvl_lbl = ("ENTRY_LEVEL", "Beginner")
        elif idx < num_topics * 0.70:
            lvl, lvl_lbl = ("MIDDLE_LEVEL", "Intermediate")
        else:
            lvl, lvl_lbl = ("EXIT_LEVEL", "Advanced")

        skill_display_name = f"{topic_title} ({lvl_lbl})"
        if skill_display_name.lower() in seen_skill_names or topic_title.lower() in seen_skill_names:
            continue
        seen_skill_names.add(skill_display_name.lower())

        matching_assess = None
        for a in batch_assessments:
            if (a.skill_unlocked and a.skill_unlocked.lower() == skill_display_name.lower()) or \
               (topic_title.lower() in a.title.lower()) or \
               (a.level == lvl):
                matching_assess = a
                break

        is_passed = False
        marks_obtained = None
        score_pct = None
        unlocked_at = None
        unlocked_by_name = None

        if matching_assess:
            sub = sub_by_assessment.get(matching_assess.id)
            if sub and sub.status == "EVALUATED" and sub.marks_obtained is not None:
                marks_obtained = float(sub.marks_obtained)
                total = matching_assess.total_marks or 100
                score_pct = round((marks_obtained / total) * 100, 1) if total > 0 else 0
                if marks_obtained >= (matching_assess.passing_marks or 40):
                    is_passed = True
                    unlocked_at = sub.evaluated_at or sub.updated_at
                    evaluator = db.query(User).filter(User.id == sub.evaluated_by).first() if sub.evaluated_by else None
                    unlocked_by_name = evaluator.full_name if evaluator else "Mentor"

        skills_list.append(StudentCurriculumSkillItem(
            id=f"topic-skill-{topic.id}",
            skill_name=f"{topic_title} ({lvl_lbl})",
            module_name=topic.module_name,
            level=lvl,
            level_label=lvl_lbl,
            is_unlocked=is_passed,
            status="UNLOCKED" if is_passed else "LOCKED",
            unlocked_at=unlocked_at,
            unlocked_by_name=unlocked_by_name,
            assessment_id=matching_assess.id if matching_assess else None,
            assessment_title=matching_assess.title if matching_assess else f"{lvl_lbl} Assessment",
            marks_obtained=marks_obtained,
            total_marks=matching_assess.total_marks if matching_assess else 100,
            passing_marks=matching_assess.passing_marks if matching_assess else 40,
            score_percentage=score_pct,
            description=topic.description or f"Mastery of {topic_title} in {topic.module_name}."
        ))

    # 3. Default fallback curriculum skills if curriculum has not been imported yet
    if not skills_list:
        default_skills = [
            ("Python Basics & Syntax (Beginner)", "Module 1: Programming Foundations", "ENTRY_LEVEL", "Beginner", "Python variables, control flow, loops, functions, and fundamental syntax."),
            ("Python Data Structures (Beginner)", "Module 2: Core Data Structures", "ENTRY_LEVEL", "Beginner", "Lists, dictionaries, tuples, sets, and basic algorithmic complexity."),
            ("Python OOP & Class Architecture (Intermediate)", "Module 3: Object-Oriented Engineering", "MIDDLE_LEVEL", "Intermediate", "Classes, inheritance, polymorphism, encapsulation, and clean design patterns."),
            ("FastAPI Microservices & Web APIs (Intermediate)", "Module 4: Backend Engineering", "MIDDLE_LEVEL", "Intermediate", "Building REST APIs, routing, Pydantic data validation, and dependency injection."),
            ("SQLAlchemy ORM & Database Persistence (Intermediate)", "Module 5: Persistence & Databases", "MIDDLE_LEVEL", "Intermediate", "Database schema modeling, SQL queries, transactions, and migration techniques."),
            ("Production Deployment & CI/CD Pipelines (Advanced)", "Module 6: Cloud & DevOps", "EXIT_LEVEL", "Advanced", "Docker containerization, automated testing suites, and production release pipelines."),
        ]
        for idx, (s_title, mod, lvl, lvl_lbl, desc) in enumerate(default_skills):
            matched_a = next((a for a in batch_assessments if a.level == lvl), None)
            is_p = False
            m_obt = None
            sc_pct = None
            u_at = None
            u_by = None
            if matched_a:
                sub = sub_by_assessment.get(matched_a.id)
                if sub and sub.status == "EVALUATED" and sub.marks_obtained is not None:
                    m_obt = float(sub.marks_obtained)
                    tot = matched_a.total_marks or 100
                    sc_pct = round((m_obt / tot) * 100, 1)
                    if m_obt >= (matched_a.passing_marks or 40):
                        is_p = True
                        u_at = sub.evaluated_at
                        ev = db.query(User).filter(User.id == sub.evaluated_by).first() if sub.evaluated_by else None
                        u_by = ev.full_name if ev else "Mentor"

            skills_list.append(StudentCurriculumSkillItem(
                id=f"default-skill-{idx+1}",
                skill_name=s_title,
                module_name=mod,
                level=lvl,
                level_label=lvl_lbl,
                is_unlocked=is_p,
                status="UNLOCKED" if is_p else "LOCKED",
                unlocked_at=u_at,
                unlocked_by_name=u_by,
                assessment_id=matched_a.id if matched_a else None,
                assessment_title=matched_a.title if matched_a else f"{lvl_lbl} Assessment",
                marks_obtained=m_obt,
                total_marks=matched_a.total_marks if matched_a else 100,
                passing_marks=matched_a.passing_marks if matched_a else 40,
                score_percentage=sc_pct,
                description=desc
            ))

    total = len(skills_list)
    unlocked = sum(1 for s in skills_list if s.is_unlocked)
    locked = total - unlocked
    pct = round((unlocked / total) * 100, 1) if total > 0 else 0.0

    prog_title = "Enrolled Curriculum"
    if program:
        prog_title = getattr(program, 'title', None) or getattr(program, 'name', None) or "Enrolled Curriculum"

    return StudentCurriculumSkillsResponse(
        program_id=program.id if program else None,
        program_title=prog_title,
        batch_name=batch.name if batch else None,
        student_name=student.user.full_name if student.user else student.roll_number,
        student_roll_no=student.roll_number,
        total_skills=total,
        unlocked_skills=unlocked,
        locked_skills=locked,
        completion_percentage=pct,
        skills=skills_list
    )


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED, summary="Create Assessment")
def create_assessment(
    payload: AssessmentCreate,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    # Verify batch exists
    batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    new_assessment = Assessment(
        title=payload.title,
        description=payload.description,
        level=payload.level,
        batch_id=payload.batch_id,
        mentor_id=current_user.id,
        scheduled_date=payload.scheduled_date,
        duration_minutes=payload.duration_minutes,
        total_marks=payload.total_marks,
        passing_marks=payload.passing_marks,
        paper_content=payload.paper_content,
        paper_file_url=payload.paper_file_url,
        paper_file_name=payload.paper_file_name,
        skill_unlocked=payload.skill_unlocked,
        is_unlocked=False,
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    # Notify students in batch
    students = db.query(Student).filter(Student.batch_id == payload.batch_id).all()
    level_label = payload.level.replace("_", " ").title()
    for s in students:
        create_notification(
            db=db,
            user_id=s.user_id,
            title=f"New Assessment Scheduled: {payload.title}",
            message=f"A new {level_label} assessment has been scheduled for {payload.scheduled_date.strftime('%b %d, %Y')}.",
            notification_type="ASSESSMENT",
            link_url="/student/assessments",
        )


    return serialize_assessment(new_assessment, db, current_user)


@router.get("/{assessment_id}", response_model=AssessmentResponse, summary="Get Assessment Details")
def get_assessment_by_id(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    student_record = None
    if current_user.role == "STUDENT":
        student_record = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_record or student_record.batch_id != assessment.batch_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this assessment")

        now = datetime.utcnow()
        is_visible = (now >= (assessment.scheduled_date - timedelta(days=7))) or assessment.is_unlocked
        if not is_visible:
            raise HTTPException(status_code=403, detail="Assessment is not yet visible")

    return serialize_assessment(assessment, db, current_user, student_record)


@router.put("/{assessment_id}", response_model=AssessmentResponse, summary="Update Assessment Details & Paper")
def update_assessment(
    assessment_id: str,
    payload: AssessmentUpdate,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if payload.title is not None:
        assessment.title = payload.title
    if payload.description is not None:
        assessment.description = payload.description
    if payload.level is not None:
        assessment.level = payload.level
    if payload.batch_id is not None:
        assessment.batch_id = payload.batch_id
    if payload.scheduled_date is not None:
        assessment.scheduled_date = payload.scheduled_date
    if payload.duration_minutes is not None:
        assessment.duration_minutes = payload.duration_minutes
    if payload.total_marks is not None:
        assessment.total_marks = payload.total_marks
    if payload.passing_marks is not None:
        assessment.passing_marks = payload.passing_marks
    if payload.paper_content is not None:
        assessment.paper_content = payload.paper_content
    if payload.paper_file_url is not None:
        assessment.paper_file_url = payload.paper_file_url
    if payload.paper_file_name is not None:
        assessment.paper_file_name = payload.paper_file_name
    if payload.skill_unlocked is not None:
        assessment.skill_unlocked = payload.skill_unlocked
    if payload.is_unlocked is not None:
        assessment.is_unlocked = payload.is_unlocked

    assessment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assessment)

    return serialize_assessment(assessment, db, current_user)


@router.put("/{assessment_id}/toggle-lock", response_model=AssessmentResponse, summary="Unlock / Lock Assessment Paper")
def toggle_assessment_lock(
    assessment_id: str,
    payload: AssessmentUnlockToggle,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment.is_unlocked = payload.is_unlocked
    assessment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assessment)

    # Notify students if unlocked
    if payload.is_unlocked:
        students = db.query(Student).filter(Student.batch_id == assessment.batch_id).all()
        for s in students:
            create_notification(
                db=db,
                user_id=s.user_id,
                title=f"Assessment Unlocked: {assessment.title}",
                message=f"The mentor has unlocked {assessment.title}. You may now download the question paper and submit your test answers.",
                notification_type="ASSESSMENT",
                link_url="/student/assessments",
            )


    return serialize_assessment(assessment, db, current_user)


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Assessment")
def delete_assessment(
    assessment_id: str,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    db.delete(assessment)
    db.commit()
    return None


@router.post("/{assessment_id}/submit", response_model=AssessmentSubmissionResponse, summary="Student Submit Assessment Link")
def submit_assessment(
    assessment_id: str,
    payload: AssessmentSubmissionCreate,
    current_user: User = Depends(require_role(["STUDENT"])),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if student.batch_id != assessment.batch_id:
        raise HTTPException(status_code=403, detail="You do not belong to this assessment's batch")

    # Strict Rule: Can give test ONLY when mentor unlocks the assessment!
    if not assessment.is_unlocked:
        raise HTTPException(
            status_code=400,
            detail="Assessment is currently locked by the mentor. You can only take the test and submit when the mentor unlocks it.",
        )

    # Check for existing submission
    existing_sub = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.assessment_id == assessment_id,
        AssessmentSubmission.student_id == student.id,
    ).first()

    if existing_sub:
        existing_sub.submission_link = payload.submission_link.strip()
        existing_sub.submission_notes = payload.submission_notes
        if payload.answer_file_url:
            existing_sub.answer_file_url = payload.answer_file_url
            existing_sub.answer_file_name = payload.answer_file_name
        existing_sub.submitted_at = datetime.utcnow()
        existing_sub.updated_at = datetime.utcnow()
        # If student re-submits before evaluation, keep SUBMITTED
        if existing_sub.status != "EVALUATED":
            existing_sub.status = "SUBMITTED"
        db.commit()
        db.refresh(existing_sub)
        return serialize_submission(existing_sub, db)

    new_sub = AssessmentSubmission(
        assessment_id=assessment_id,
        student_id=student.id,
        submission_link=payload.submission_link.strip(),
        submission_notes=payload.submission_notes,
        answer_file_url=payload.answer_file_url,
        answer_file_name=payload.answer_file_name,
        status="SUBMITTED",
        submitted_at=datetime.utcnow(),
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    # Notify Mentor if mentor assigned
    if assessment.mentor_id:
        create_notification(
            db=db,
            user_id=assessment.mentor_id,
            title=f"Assessment Answer Submitted: {assessment.title}",
            message=f"{current_user.full_name} ({student.roll_number}) submitted test answers for {assessment.title}.",
            notification_type="ASSESSMENT",
            link_url="/mentor/assessment-evaluation",
        )


    return serialize_submission(new_sub, db)


@router.get("/{assessment_id}/submissions", response_model=List[AssessmentSubmissionResponse], summary="List Submissions for Assessment")
def get_assessment_submissions(
    assessment_id: str,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    subs = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.assessment_id == assessment_id
    ).order_by(AssessmentSubmission.submitted_at.desc()).all()

    return [serialize_submission(s, db) for s in subs]


# -------------------------------------------------------------
# Assessment Evaluation & Score Sheet Endpoints
# -------------------------------------------------------------

@submission_router.get("", response_model=List[AssessmentSubmissionResponse], summary="List All Assessment Submissions")
def list_all_submissions(
    batch_id: Optional[str] = Query(None),
    assessment_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AssessmentSubmission)

    if current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            return []
        query = query.filter(AssessmentSubmission.student_id == student.id)
    else:
        if assessment_id:
            query = query.filter(AssessmentSubmission.assessment_id == assessment_id)
        if batch_id:
            query = query.join(Student, AssessmentSubmission.student_id == Student.id).filter(
                Student.batch_id == batch_id
            )

    if status:
        query = query.filter(AssessmentSubmission.status == status)

    subs = query.order_by(AssessmentSubmission.submitted_at.desc()).all()
    return [serialize_submission(s, db) for s in subs]


@submission_router.put("/{submission_id}/evaluate", response_model=AssessmentSubmissionResponse, summary="Evaluate and Grade Assessment")
def evaluate_submission(
    submission_id: str,
    payload: AssessmentEvaluationRequest,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    sub = db.query(AssessmentSubmission).filter(AssessmentSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    assessment = db.query(Assessment).filter(Assessment.id == sub.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Associated assessment not found")

    if payload.marks_obtained > assessment.total_marks:
        raise HTTPException(
            status_code=400,
            detail=f"Marks obtained ({payload.marks_obtained}) cannot exceed total marks ({assessment.total_marks})",
        )

    sub.marks_obtained = payload.marks_obtained
    sub.feedback = payload.feedback
    sub.status = "EVALUATED"
    sub.evaluated_by = current_user.id
    sub.evaluated_at = datetime.utcnow()
    sub.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(sub)

    # Notify student about their evaluation result
    student = db.query(Student).filter(Student.id == sub.student_id).first()
    if student:
        level_label = assessment.level.replace("_", " ").title()
        is_passed = payload.marks_obtained >= assessment.passing_marks
        pass_text = "Passed" if is_passed else "Needs Improvement"
        create_notification(
            db=db,
            user_id=student.user_id,
            title=f"Assessment Evaluated: {assessment.title}",
            message=f"Your {level_label} assessment was evaluated. Score: {payload.marks_obtained}/{assessment.total_marks} ({pass_text}).",
            notification_type="ASSESSMENT",
            link_url="/student/assessments",
        )


    return serialize_submission(sub, db)


@router.get("/score-sheet/matrix", response_model=List[StudentScoreSheetItem], summary="Get Complete Result Score Sheet")
def get_score_sheet_matrix(
    batch_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns score sheet matrix mapping Entry Level, Middle Level, and Exit Level
    assessments with marks obtained, percentage, and overall status for each student.
    """
    target_batch_id = batch_id
    if current_user.role == "STUDENT":
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or not student.batch_id:
            return []
        target_batch_id = student.batch_id

    student_query = db.query(Student)
    if target_batch_id:
        student_query = student_query.filter(Student.batch_id == target_batch_id)

    students = student_query.order_by(Student.roll_number.asc()).all()
    if not students:
        return []

    # Get all assessments for target batch (or batches)
    batch_ids = list(set([s.batch_id for s in students if s.batch_id]))
    assessments = db.query(Assessment).filter(Assessment.batch_id.in_(batch_ids)).all() if batch_ids else []

    # Key assessments by (batch_id, level)
    assessment_map = {}
    for a in assessments:
        assessment_map[(a.batch_id, a.level)] = a

    # Get all submissions for these students
    student_ids = [s.id for s in students]
    submissions = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.student_id.in_(student_ids)
    ).all() if student_ids else []

    # Key submissions by (student_id, assessment_id)
    sub_map = {}
    for s in submissions:
        sub_map[(s.student_id, s.assessment_id)] = s

    score_sheet: List[StudentScoreSheetItem] = []

    for s in students:
        s_user = s.user
        s_batch = s.batch
        batch_name = s_batch.name if s_batch else "Unassigned Batch"

        def build_entry(lvl: str) -> Optional[ScoreSheetEntry]:
            a = assessment_map.get((s.batch_id, lvl))
            if not a:
                return None
            sub = sub_map.get((s.id, a.id))
            marks_val = float(sub.marks_obtained) if (sub and sub.marks_obtained is not None) else None
            is_pass = (marks_val >= a.passing_marks) if marks_val is not None else None
            return ScoreSheetEntry(
                assessment_id=a.id,
                title=a.title,
                status=sub.status if sub else "NOT_SUBMITTED",
                marks_obtained=marks_val,
                total_marks=a.total_marks or 100,
                passing_marks=a.passing_marks or 40,
                is_passed=is_pass,
                feedback=sub.feedback if sub else None,
                submission_link=sub.submission_link if sub else None,
                scheduled_date=a.scheduled_date,
                submitted_at=sub.submitted_at if sub else None,
                evaluated_at=sub.evaluated_at if sub else None,
            )

        entry_level = build_entry("ENTRY_LEVEL")
        middle_level = build_entry("MIDDLE_LEVEL")
        exit_level = build_entry("EXIT_LEVEL")

        # Compute totals
        total_obtained = 0.0
        total_max = 0.0
        all_evaluated = True
        has_failed = False
        any_assessment_present = False

        for entry in [entry_level, middle_level, exit_level]:
            if entry:
                any_assessment_present = True
                total_max += entry.total_marks
                if entry.marks_obtained is not None:
                    total_obtained += entry.marks_obtained
                    if entry.is_passed is False:
                        has_failed = True
                else:
                    all_evaluated = False

        percentage = round((total_obtained / total_max * 100), 2) if total_max > 0 else 0.0

        if not any_assessment_present:
            final_status = "NOT_STARTED"
        elif all_evaluated:
            final_status = "FAILED" if has_failed else "PASSED"
        else:
            final_status = "IN_PROGRESS"

        approver = db.query(User).filter(User.id == s.certificate_approved_by).first() if s.certificate_approved_by else None

        score_sheet.append(
            StudentScoreSheetItem(
                student_id=s.id,
                student_name=s_user.full_name if s_user else "Unknown Student",
                roll_number=s.roll_number,
                batch_id=s.batch_id or "",
                batch_name=batch_name,
                project_url=s.project_url,
                certificate_approved_by_mentor=bool(s.certificate_approved_by_mentor),
                certificate_approved_at=s.certificate_approved_at,
                certificate_approved_by_name=approver.full_name if approver else None,
                entry_level=entry_level,
                middle_level=middle_level,
                exit_level=exit_level,
                total_obtained=round(total_obtained, 2),
                total_max=round(total_max, 2),
                percentage=percentage,
                final_status=final_status,
            )
        )

    return score_sheet


@router.put("/scoresheet/student/{student_id}", summary="Mentor Update Student Project URL & Certificate Release")
def update_scoresheet_student(
    student_id: str,
    payload: StudentScoresheetUpdate,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.project_url is not None:
        student.project_url = payload.project_url.strip()

    is_releasing_cert = False
    if payload.certificate_approved_by_mentor is not None:
        if payload.certificate_approved_by_mentor and not student.certificate_approved_by_mentor:
            is_releasing_cert = True
            student.certificate_approved_by_mentor = True
            student.certificate_approved_at = datetime.utcnow()
            student.certificate_approved_by = current_user.id
        elif not payload.certificate_approved_by_mentor:
            student.certificate_approved_by_mentor = False
            student.certificate_approved_at = None
            student.certificate_approved_by = None

    student.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(student)

    # If mentor approved certificate release, notify HR and Managers
    if is_releasing_cert:
        student_user = student.user
        s_name = student_user.full_name if student_user else student.roll_number
        batch = student.batch
        b_name = batch.name if batch else "Trainee Batch"

        create_notification(
            db=db,
            title=f"Certificate Release Approved: {s_name}",
            message=f"Mentor {current_user.full_name} has officially approved Certificate Release for {s_name} ({student.roll_number}) in {b_name}. HR may now create and issue the Certificate of Training Completion.",
            notification_type="CERTIFICATE",
            target_role="HR",
            link_url="/hr/certificates",
        )
        create_notification(
            db=db,
            title=f"Certificate Release Approved: {s_name}",
            message=f"Mentor {current_user.full_name} approved Certificate Release for {s_name} ({student.roll_number}).",
            notification_type="CERTIFICATE",
            target_role="SUPER_ADMIN",
            link_url="/hr/certificates",
        )
        if student.user_id:
            create_notification(
                db=db,
                user_id=student.user_id,
                title="Training Completion Certificate Approved!",
                message=f"Congratulations! Your mentor {current_user.full_name} has approved your Certificate Release for training completion. HR will issue your official certificate.",
                notification_type="CERTIFICATE",
                link_url="/student",
            )

    return {
        "status": "success",
        "student_id": student.id,
        "project_url": student.project_url,
        "certificate_approved_by_mentor": student.certificate_approved_by_mentor,
        "certificate_approved_at": student.certificate_approved_at,
    }


@router.put("/scoresheet/student/{student_id}/marks", summary="Mentor Directly Update Student Assessment Marks")
def update_scoresheet_student_marks(
    student_id: str,
    payload: AssessmentMarksDirectUpdate,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    assessment = db.query(Assessment).filter(Assessment.id == payload.assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if payload.marks_obtained > assessment.total_marks:
        raise HTTPException(
            status_code=400,
            detail=f"Marks obtained ({payload.marks_obtained}) cannot exceed total marks ({assessment.total_marks})",
        )

    # Find existing submission or create new evaluation record
    sub = db.query(AssessmentSubmission).filter(
        AssessmentSubmission.assessment_id == payload.assessment_id,
        AssessmentSubmission.student_id == student_id,
    ).first()

    if not sub:
        sub = AssessmentSubmission(
            assessment_id=payload.assessment_id,
            student_id=student_id,
            submission_link="https://mentor-assigned.internal",
            submission_notes="Evaluated directly by mentor via scoresheet",
            status="EVALUATED",
            marks_obtained=payload.marks_obtained,
            feedback=payload.feedback,
            evaluated_by=current_user.id,
            evaluated_at=datetime.utcnow(),
            submitted_at=datetime.utcnow(),
        )
        db.add(sub)
    else:
        sub.marks_obtained = payload.marks_obtained
        sub.feedback = payload.feedback
        sub.status = "EVALUATED"
        sub.evaluated_by = current_user.id
        sub.evaluated_at = datetime.utcnow()
        sub.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(sub)

    # Notify student
    if student.user_id:
        level_label = assessment.level.replace("_", " ").title()
        is_passed = payload.marks_obtained >= assessment.passing_marks
        pass_text = "Passed" if is_passed else "Needs Improvement"
        create_notification(
            db=db,
            user_id=student.user_id,
            title=f"Assessment Score Updated: {assessment.title}",
            message=f"Mentor updated your score for {level_label} assessment to {payload.marks_obtained}/{assessment.total_marks} ({pass_text}).",
            notification_type="ASSESSMENT",
            link_url="/student/assessments",
        )

    return serialize_submission(sub, db)


@router.post("/scoresheet/batch/{batch_id}/send-to-management", summary="Send Finalized Scoresheet to HR and Managers")
def send_scoresheet_to_management(
    batch_id: str,
    payload: BatchSendToManagementRequest,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db),
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    students = db.query(Student).filter(Student.batch_id == batch_id).all()
    total_students = len(students)
    certified_count = sum(1 for s in students if s.certificate_approved_by_mentor)

    msg = (
        f"Mentor {current_user.full_name} has dispatched the official Scoresheet for '{batch.name}' "
        f"({total_students} trainees, {certified_count} approved for certificate release). "
    )
    if payload.notes:
        msg += f"Mentor Note: {payload.notes}"

    # Notify HR
    create_notification(
        db=db,
        title=f"Official Scoresheet Submitted: {batch.name}",
        message=msg,
        notification_type="ASSESSMENT",
        target_role="HR",
        link_url="/hr/reports",
    )

    # Notify Managers / Super Admin
    create_notification(
        db=db,
        title=f"Official Scoresheet Submitted: {batch.name}",
        message=msg,
        notification_type="ASSESSMENT",
        target_role="SUPER_ADMIN",
        link_url="/hr/reports",
    )

    return {
        "status": "success",
        "batch_id": batch.id,
        "batch_name": batch.name,
        "total_students": total_students,
        "certified_count": certified_count,
        "message": "Scoresheet successfully dispatched to HR and Management.",
    }

