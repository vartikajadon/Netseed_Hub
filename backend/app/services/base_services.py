import os
import uuid
from typing import List, Optional, Tuple
from datetime import datetime, date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.all_models import (
    User, Program, Batch, Geofence, Student, Device, Consent, AuditLog, CalendarEvent
)
from app.repositories.base_repositories import (
    UserRepository, ProgramRepository, BatchRepository, GeofenceRepository,
    StudentRepository, DeviceRepository, ConsentRepository, AuditLogRepository
)
from app.schemas.all_schemas import (
    UserCreate, UserUpdate, ProgramCreate, ProgramUpdate, BatchCreate, BatchUpdate,
    GeofenceCreate, GeofenceUpdate, StudentCreate, StudentUpdate, DeviceCreate,
    DeviceUpdate, ConsentCreate
)

class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_user(self, user_id: str) -> User:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.repo.get_all(skip=skip, limit=limit)

    def create_user(self, data: UserCreate, actor_id: Optional[str] = None) -> User:
        existing = self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
        user = User(
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            phone=data.phone,
            avatar_url=data.avatar_url,
            is_active=data.is_active
        )
        created = self.repo.create(user)
        
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="CREATE_USER",
            entity="User",
            entity_id=created.id,
            new_values=f"Created user {created.email} with role {created.role}"
        ))
        return created

    def update_user(self, user_id: str, data: UserUpdate, actor_id: Optional[str] = None) -> User:
        user = self.get_user(user_id)
        old_val = f"role={user.role}, active={user.is_active}"

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.role is not None:
            user.role = data.role

        updated = self.repo.update(user)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="UPDATE_USER",
            entity="User",
            entity_id=updated.id,
            old_values=old_val,
            new_values=f"role={updated.role}, active={updated.is_active}"
        ))
        return updated

    def get_audit_logs(self, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        return self.audit_repo.get_all(skip, limit)


class GeofenceService:
    def __init__(self, db: Session):
        self.repo = GeofenceRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_geofence(self, geofence_id: str) -> Geofence:
        geofence = self.repo.get_by_id(geofence_id)
        if not geofence:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geofence not found")
        return geofence

    def list_geofences(self, skip: int = 0, limit: int = 100) -> List[Geofence]:
        return self.repo.get_all(skip=skip, limit=limit)

    def create_geofence(self, data: GeofenceCreate, actor_id: Optional[str] = None) -> Geofence:
        geofence = Geofence(
            name=data.name,
            center_latitude=data.center_latitude,
            center_longitude=data.center_longitude,
            radius_meters=data.radius_meters,
            address=data.address,
            is_active=data.is_active
        )
        created = self.repo.create(geofence)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="CREATE_GEOFENCE",
            entity="Geofence",
            entity_id=created.id,
            new_values=f"Geofence {created.name}, radius={created.radius_meters}m"
        ))
        return created

    def update_geofence(self, geofence_id: str, data: GeofenceUpdate, actor_id: Optional[str] = None) -> Geofence:
        geofence = self.get_geofence(geofence_id)
        if data.name is not None:
            geofence.name = data.name
        if data.center_latitude is not None:
            geofence.center_latitude = data.center_latitude
        if data.center_longitude is not None:
            geofence.center_longitude = data.center_longitude
        if data.radius_meters is not None:
            geofence.radius_meters = data.radius_meters
        if data.address is not None:
            geofence.address = data.address
        if data.is_active is not None:
            geofence.is_active = data.is_active

        updated = self.repo.update(geofence)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="UPDATE_GEOFENCE",
            entity="Geofence",
            entity_id=updated.id,
            new_values=f"Updated geofence {updated.name}"
        ))
        return updated


class ProgramService:
    def __init__(self, db: Session):
        self.repo = ProgramRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_program(self, program_id: str) -> Program:
        program = self.repo.get_by_id(program_id)
        if not program:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Program not found")
        return program

    def list_programs(self, skip: int = 0, limit: int = 100) -> List[Program]:
        return self.repo.get_all(skip=skip, limit=limit)

    def create_program(self, data: ProgramCreate, actor_id: Optional[str] = None) -> Program:
        if not data.title or not data.title.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Program title cannot be empty.")
        
        code = data.code.strip().upper() if data.code and data.code.strip() else f"PROG-{os.urandom(2).hex().upper()}"

        existing = self.repo.get_by_code(code)
        if existing and data.code and data.code.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Program code '{code}' already exists.")
        elif existing:
            code = f"PROG-{os.urandom(2).hex().upper()}"

        skills_str = ", ".join(data.skills) if isinstance(data.skills, list) else data.skills

        program = Program(
            title=data.title.strip(),
            code=code,
            description=data.description,
            duration_weeks=data.duration_weeks or 12,
            is_active=data.is_active if data.is_active is not None else True,
            created_by=actor_id or data.created_by,
            mentor_id=data.mentor_id,
            max_students=data.max_students,
            start_date=data.start_date,
            end_date=data.end_date,
            program_type=data.program_type or "Tech Master",
            skills=skills_str
        )
        created = self.repo.create(program)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="CREATE_PROGRAM",
            entity="Program",
            entity_id=created.id,
            new_values=f"Created program '{created.title}' ({created.code})"
        ))
        return created

    def update_program(self, program_id: str, data: ProgramUpdate, actor_id: Optional[str] = None) -> Program:
        program = self.get_program(program_id)
        old_val = f"title={program.title}, code={program.code}, active={program.is_active}"

        if data.title is not None:
            if not data.title.strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Program title cannot be empty.")
            program.title = data.title.strip()

        if data.code is not None:
            new_code = data.code.strip().upper()
            if new_code != program.code:
                existing = self.repo.get_by_code(new_code)
                if existing:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Program code '{new_code}' already exists.")
                program.code = new_code

        if data.description is not None:
            program.description = data.description
        if data.duration_weeks is not None:
            program.duration_weeks = data.duration_weeks
        if data.is_active is not None:
            program.is_active = data.is_active
        if data.mentor_id is not None:
            program.mentor_id = data.mentor_id
        if data.max_students is not None:
            program.max_students = data.max_students
        if data.start_date is not None:
            program.start_date = data.start_date
        if data.end_date is not None:
            program.end_date = data.end_date
        if data.program_type is not None:
            program.program_type = data.program_type
        if data.skills is not None:
            program.skills = ", ".join(data.skills) if isinstance(data.skills, list) else data.skills

        updated = self.repo.update(program)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="UPDATE_PROGRAM",
            entity="Program",
            entity_id=updated.id,
            old_values=old_val,
            new_values=f"title={updated.title}, code={updated.code}, active={updated.is_active}"
        ))
        return updated

    def delete_program(self, program_id: str, actor_id: Optional[str] = None) -> dict:
        program = self.get_program(program_id)
        for student in program.students:
            student.program_id = None
        title = program.title
        code = program.code
        self.repo.delete(program)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="DELETE_PROGRAM",
            entity="Program",
            entity_id=program_id,
            old_values=f"Deleted program '{title}' ({code})"
        ))
        return {"message": f"Program '{title}' ({code}) has been deleted successfully."}
def normalize_batch_type(raw_type: Optional[str]) -> str:
    if not raw_type:
        return "TECH_MASTER"
    cleaned = raw_type.strip().upper()
    if cleaned in ["SHORT_DURATION", "SHORT DURATION", "SIX_MONTHS", "6 MONTHS", "6 MONTHS PROGRAM"]:
        return "SHORT_DURATION"
    if cleaned in ["INTERNSHIP"]:
        return "INTERNSHIP"
    return "TECH_MASTER"


class BatchService:
    def __init__(self, db: Session):
        self.repo = BatchRepository(db)
        self.program_repo = ProgramRepository(db)
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_batch(self, batch_id: str) -> Batch:
        batch = self.repo.get_by_id(batch_id)
        if not batch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
        return batch

    def list_batches(self, program_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Batch]:
        return self.repo.get_all(program_id=program_id, skip=skip, limit=limit)

    def create_batch(self, data: BatchCreate, actor_id: Optional[str] = None) -> Batch:
        # 1. Validate parent program exists & is active
        program = self.program_repo.get_by_id(data.program_id)
        if not program:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid program_id '{data.program_id}'. Program does not exist.")
        if not program.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot create batch against inactive program '{program.title}'.")

        b_type = normalize_batch_type(data.batch_type)

        if b_type == "SHORT_DURATION":
            t_months = 3
            i_months = 3
        elif b_type == "INTERNSHIP":
            t_months = 1
            i_months = 3
        else:
            t_months = 6
            i_months = 6

        # Auto-compute end_date from duration months if not supplied
        if not data.end_date:
            import calendar
            total_months = t_months + i_months
            m_idx = data.start_date.month - 1 + total_months
            y_add = m_idx // 12
            new_month = m_idx % 12 + 1
            day = min(data.start_date.day, calendar.monthrange(data.start_date.year + y_add, new_month)[1])
            final_end_date = date(data.start_date.year + y_add, new_month, day)
        else:
            final_end_date = data.end_date

        # 2. Validate dates
        if data.start_date >= final_end_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch start date must be strictly before end date.")

        # 3. Validate mentor if provided
        if data.mentor_id:
            mentor = self.user_repo.get_by_id(data.mentor_id)
            if not mentor or mentor.role != "MENTOR":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid mentor_id '{data.mentor_id}'. User does not exist or lacks MENTOR role.")

        # Smart batch name generation based on date, year, and course type
        year = data.start_date.year if data.start_date else datetime.utcnow().year
        batch_name = data.name.strip() if data.name else ""
        if not batch_name or batch_name.upper() in ["AUTO", "AUTO_GENERATE", "DEFAULT", "NEW BATCH"]:
            existing_batches = self.repo.get_all(limit=500)
            same_year_type = [b for b in existing_batches if b.start_date and b.start_date.year == year and b.batch_type == b_type]
            count = len(same_year_type)
            if b_type == "TECH_MASTER":
                code_suffix = "A" if count == 0 else f"A{count+1}"
                batch_name = f"Batch {year}-{code_suffix} (Tech Masters)"
            elif b_type == "SHORT_DURATION":
                code_suffix = f"B{count+1}"
                batch_name = f"Batch {year}-{code_suffix} (Short Duration Course)"
            elif b_type == "INTERNSHIP":
                code_suffix = "C" if count == 0 else f"C{count+1}"
                batch_name = f"Batch {year}-{code_suffix} (Internship)"
            else:
                batch_name = f"Batch {year}-{count+1}"

        batch = Batch(
            program_id=data.program_id,
            name=batch_name,
            batch_type=b_type,
            training_duration_months=t_months,
            internship_duration_months=i_months,
            start_date=data.start_date,
            end_date=final_end_date,
            geofence_id=data.geofence_id,
            mentor_id=data.mentor_id,
            status=data.status or "ACTIVE"
        )
        created = self.repo.create(batch)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="CREATE_BATCH",
            entity="Batch",
            entity_id=created.id,
            new_values=f"Created batch '{created.name}' ({b_type}) under program '{program.title}'"
        ))
        return created

    def update_batch(self, batch_id: str, data: BatchUpdate, actor_id: Optional[str] = None) -> Batch:
        batch = self.get_batch(batch_id)
        old_val = f"name={batch.name}, mentor_id={batch.mentor_id}, status={batch.status}"

        if data.name is not None:
            if not data.name.strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch name cannot be empty.")
            batch.name = data.name.strip()

        if data.batch_type is not None:
            b_type = normalize_batch_type(data.batch_type)
            batch.batch_type = b_type
            if b_type == "SHORT_DURATION":
                batch.training_duration_months = 3
                batch.internship_duration_months = 3
            elif b_type == "INTERNSHIP":
                batch.training_duration_months = 0
                batch.internship_duration_months = 6
            else:
                batch.training_duration_months = 6
                batch.internship_duration_months = 6

        start = data.start_date or batch.start_date
        end = data.end_date or batch.end_date
        if start >= end:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch start date must be strictly before end date.")

        batch.start_date = start
        batch.end_date = end

        if data.geofence_id is not None:
            batch.geofence_id = data.geofence_id

        if data.mentor_id is not None:
            if data.mentor_id:
                mentor = self.user_repo.get_by_id(data.mentor_id)
                if not mentor or mentor.role != "MENTOR":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid mentor_id '{data.mentor_id}'. User does not exist or lacks MENTOR role.")
            batch.mentor_id = data.mentor_id

        if data.status is not None:
            batch.status = data.status

        updated = self.repo.update(batch)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="UPDATE_BATCH",
            entity="Batch",
            entity_id=updated.id,
            old_values=old_val,
            new_values=f"name={updated.name}, mentor_id={updated.mentor_id}, status={updated.status}"
        ))
        return updated


def sync_student_birthday_event(db: Session, student: Student):
    """
    Automatically creates, updates or removes a student's birthday event in the Netlink calendar.
    """
    if not student:
        return
    existing_event = db.query(CalendarEvent).filter(
        (CalendarEvent.student_id == student.id) |
        (CalendarEvent.description.like(f"%({student.roll_number})%"))
    ).first()

    if student.dob:
        student_user = student.user or db.query(User).filter(User.id == student.user_id).first()
        person_name = student_user.full_name if student_user else "Student"
        # Determine event date for current calendar year (2026)
        year = 2026
        month = student.dob.month
        day = student.dob.day
        try:
            event_date = date(year, month, day)
        except ValueError:
            event_date = date(year, 2, 28)

        title = f"{person_name}'s Birthday 🎂"
        description = f"Happy Birthday to trainee {person_name} ({student.roll_number})! Best wishes from Netlink & netSEED team."

        if existing_event:
            existing_event.title = title
            existing_event.description = description
            existing_event.date = event_date
            existing_event.event_type = "BIRTHDAY"
            existing_event.is_off_day = False
            existing_event.person_name = person_name
            existing_event.student_id = student.id
            existing_event.updated_at = datetime.utcnow()
        else:
            new_event = CalendarEvent(
                id=str(uuid.uuid4()),
                title=title,
                description=description,
                date=event_date,
                event_type="BIRTHDAY",
                is_off_day=False,
                person_name=person_name,
                student_id=student.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_event)
        db.commit()
    else:
        if existing_event:
            db.delete(existing_event)
            db.commit()


class StudentService:
    def __init__(self, db: Session):
        self.repo = StudentRepository(db)
        self.user_repo = UserRepository(db)
        self.program_repo = ProgramRepository(db)
        self.batch_repo = BatchRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_student(self, student_id: str) -> Student:
        student = self.repo.get_by_id(student_id)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student record '{student_id}' not found.")
        return student

    def get_by_user_id(self, user_id: str) -> Optional[Student]:
        return self.repo.get_by_user_id(user_id)

    def list_students(
        self,
        search: Optional[str] = None,
        program_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        mentor_id: Optional[str] = None,
        status_filter: Optional[str] = None,
        batch_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Student], int]:
        return self.repo.get_all(
            search=search,
            program_id=program_id,
            batch_id=batch_id,
            mentor_id=mentor_id,
            status=status_filter,
            batch_type=batch_type,
            skip=skip,
            limit=limit
        )

    def create_student(self, data: StudentCreate, actor_id: Optional[str] = None) -> Student:
        # 1. Resolve or create User identity if user_id is omitted
        user_id = data.user_id
        if not user_id:
            if not data.email and not data.full_name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either user_id or Student Full Name & Email must be provided.")
            
            target_email = (data.email or f"{data.roll_number.lower()}@netlink.org").strip().lower()
            target_name = (data.full_name or "Student").strip()
            
            user = self.user_repo.get_by_email(target_email)
            if not user:
                user = self.user_repo.create(User(
                    email=target_email,
                    full_name=target_name,
                    phone=data.contact_number,
                    role="STUDENT",
                    is_active=True
                ))
            else:
                if target_name and user.full_name != target_name:
                    user.full_name = target_name
                if data.contact_number and user.phone != data.contact_number:
                    user.phone = data.contact_number
                self.user_repo.update(user)
            user_id = user.id
        else:
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")
            if data.full_name and user.full_name != data.full_name:
                user.full_name = data.full_name.strip()
            if data.email and user.email != data.email:
                user.email = data.email.strip().lower()
            if data.contact_number and user.phone != data.contact_number:
                user.phone = data.contact_number
            self.user_repo.update(user)

        if user.role != "STUDENT":
            user.role = "STUDENT"
            self.user_repo.update(user)

        # 2. Check if student profile already exists for this user
        existing_student = self.repo.get_by_user_id(user_id)
        if existing_student:
            if data.user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Student record already exists for user '{user.email}'.")

            if data.program_id:
                existing_student.program_id = data.program_id
            if data.batch_id:
                existing_student.batch_id = data.batch_id
            if data.mentor_id:
                existing_student.mentor_id = data.mentor_id
            if data.college_name:
                existing_student.college_name = data.college_name
            if data.qualification:
                existing_student.qualification = data.qualification
            if data.contact_number:
                existing_student.contact_number = data.contact_number
            if data.age:
                existing_student.age = data.age
            if data.guardian_name:
                existing_student.guardian_name = data.guardian_name
            if data.marital_status:
                existing_student.marital_status = data.marital_status
            if data.address:
                existing_student.address = data.address
            if data.domicile is not None:
                existing_student.domicile = data.domicile
            if data.batch_type:
                existing_student.batch_type = normalize_batch_type(data.batch_type)
            if data.total_fees is not None:
                existing_student.total_fees = data.total_fees
            if data.payment_mode:
                existing_student.payment_mode = data.payment_mode
            if data.installment_type:
                existing_student.installment_type = data.installment_type
            if data.start_date:
                existing_student.start_date = data.start_date
            if data.dob is not None:
                existing_student.dob = data.dob
            if data.enrollment_status:
                existing_student.enrollment_status = data.enrollment_status
            
            updated = self.repo.update(existing_student)
            sync_student_birthday_event(self.repo.db, updated)
            self.audit_repo.create(AuditLog(
                actor_id=actor_id,
                action="UPDATE_STUDENT",
                entity="Student",
                entity_id=updated.id,
                new_values=f"Updated existing student roll={updated.roll_number}, program={updated.program_id}, batch={updated.batch_id}"
            ))
            return updated

        # 3. Check for duplicate roll numbers
        existing_roll = self.repo.get_by_roll_number(data.roll_number)
        if existing_roll and existing_roll.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student with this roll number already exists.")

        # 4. Validate Program exists
        if data.program_id:
            program = self.program_repo.get_by_id(data.program_id)
            if not program:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid program_id '{data.program_id}'. Program does not exist.")

        # 5. Validate Batch exists & belongs to selected Program (CRITICAL INTEGRITY CHECK)
        if data.batch_id:
            batch = self.batch_repo.get_by_id(data.batch_id)
            if not batch:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid batch_id '{data.batch_id}'. Batch does not exist.")
            if data.program_id and batch.program_id != data.program_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch '{batch.name}' belongs to program '{batch.program_id}', which does not match selected program '{data.program_id}'."
                )

        # 6. Validate Mentor if specified
        if data.mentor_id:
            mentor = self.user_repo.get_by_id(data.mentor_id)
            if not mentor or mentor.role != "MENTOR":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid mentor_id '{data.mentor_id}'. User does not exist or lacks MENTOR role.")

        valid_statuses = ["ENROLLED", "ACTIVE", "ON_LEAVE", "COMPLETED", "DROPPED", "GRADUATED", "TERMINATED"]
        status_val = data.enrollment_status if data.enrollment_status in valid_statuses else "ENROLLED"

        norm_bt = normalize_batch_type(data.batch_type)

        student = Student(
            user_id=user_id,
            program_id=data.program_id,
            batch_id=data.batch_id,
            mentor_id=data.mentor_id,
            roll_number=data.roll_number.strip(),
            college_name=data.college_name,
            qualification=data.qualification,
            contact_number=data.contact_number,
            age=data.age,
            guardian_name=data.guardian_name,
            marital_status=data.marital_status or "Single",
            address=data.address,
            domicile=data.domicile,
            batch_type=norm_bt,
            total_fees=data.total_fees,
            payment_mode=data.payment_mode or "ONLINE",
            installment_type=data.installment_type or "ONE_TIME",
            start_date=data.start_date,
            end_date=data.end_date,
            dob=data.dob,
            enrollment_status=status_val,
            registered_device_id=data.registered_device_id,
            face_enrollment_status=data.face_enrollment_status
        )
        created = self.repo.create(student)
        sync_student_birthday_event(self.repo.db, created)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="CREATE_STUDENT",
            entity="Student",
            entity_id=created.id,
            new_values=f"Registered student roll={created.roll_number}, program={created.program_id}, batch={created.batch_id}"
        ))
        return created

    def update_student(self, student_id: str, data: StudentUpdate, actor_id: Optional[str] = None) -> Student:
        student = self.get_student(student_id)
        old_val = f"program={student.program_id}, batch={student.batch_id}, mentor={student.mentor_id}, status={student.enrollment_status}"

        # Sync user full_name, email, and avatar_url if updated
        if data.full_name or data.email or data.avatar_url is not None:
            user = self.user_repo.get_by_id(student.user_id)
            if user:
                if data.full_name:
                    user.full_name = data.full_name.strip()
                if data.email:
                    user.email = data.email.strip().lower()
                if data.avatar_url is not None:
                    user.avatar_url = data.avatar_url.strip() if data.avatar_url else None
                self.user_repo.update(user)

        target_program_id = data.program_id or student.program_id
        target_batch_id = data.batch_id or student.batch_id

        if data.batch_id:
            batch = self.batch_repo.get_by_id(data.batch_id)
            if not batch:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid batch_id '{data.batch_id}'. Batch does not exist.")
            if target_program_id and batch.program_id != target_program_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Batch '{batch.name}' belongs to program '{batch.program_id}', which does not match program '{target_program_id}'."
                )

        if data.mentor_id is not None:
            if data.mentor_id:
                mentor = self.user_repo.get_by_id(data.mentor_id)
                if not mentor or mentor.role != "MENTOR":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid mentor_id '{data.mentor_id}'. User does not exist or lacks MENTOR role.")
            student.mentor_id = data.mentor_id

        if data.program_id is not None:
            student.program_id = data.program_id
        if data.batch_id is not None:
            student.batch_id = data.batch_id
        if data.college_name is not None:
            student.college_name = data.college_name
        if data.qualification is not None:
            student.qualification = data.qualification
        if data.contact_number is not None:
            student.contact_number = data.contact_number
        if data.age is not None:
            student.age = data.age
        if data.guardian_name is not None:
            student.guardian_name = data.guardian_name
        if data.marital_status is not None:
            student.marital_status = data.marital_status
        if data.address is not None:
            student.address = data.address
        if data.domicile is not None:
            student.domicile = data.domicile
        if data.batch_type is not None:
            student.batch_type = normalize_batch_type(data.batch_type)
        if data.total_fees is not None:
            student.total_fees = data.total_fees
        if data.payment_mode is not None:
            student.payment_mode = data.payment_mode
        if data.installment_type is not None:
            student.installment_type = data.installment_type
        if data.start_date is not None:
            student.start_date = data.start_date
        if data.end_date is not None:
            student.end_date = data.end_date
        if data.dob is not None:
            student.dob = data.dob
        if data.enrollment_status is not None:
            student.enrollment_status = data.enrollment_status

        updated = self.repo.update(student)
        sync_student_birthday_event(self.repo.db, updated)
        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="UPDATE_STUDENT",
            entity="Student",
            entity_id=updated.id,
            old_values=old_val,
            new_values=f"program={updated.program_id}, batch={updated.batch_id}, mentor={updated.mentor_id}, status={updated.enrollment_status}"
        ))
        return updated

    def assign_mentor(self, student_id: str, mentor_id: str, actor_id: Optional[str] = None) -> Student:
        student = self.get_student(student_id)
        old_mentor = student.mentor_id

        mentor = self.user_repo.get_by_id(mentor_id)
        if not mentor or mentor.role != "MENTOR":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid mentor_id '{mentor_id}'. User does not exist or lacks MENTOR role.")

        student.mentor_id = mentor_id
        updated = self.repo.update(student)

        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="ASSIGN_MENTOR",
            entity="Student",
            entity_id=updated.id,
            old_values=f"mentor_id={old_mentor}",
            new_values=f"mentor_id={updated.mentor_id}"
        ))
        return updated

    def update_status(self, student_id: str, new_status: str, reason: Optional[str] = None, actor_id: Optional[str] = None) -> Student:
        student = self.get_student(student_id)
        old_status = student.enrollment_status

        normalized_status = (new_status or "").strip().upper()
        valid_statuses = ["ENROLLED", "ACTIVE", "ON_LEAVE", "COMPLETED", "DROPPED", "DROPOUT", "GRADUATED", "TERMINATED"]
        if normalized_status not in valid_statuses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status '{new_status}'. Allowed: {valid_statuses}")

        if normalized_status in ("DROPOUT", "DROPPED"):
            if not reason or not reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A valid reason is required when marking a student as DROPOUT (e.g. switched course mid-way, personal reasons)."
                )
            student.dropout_reason = reason.strip()
            student.dropout_date = datetime.utcnow().date()
            student.dropout_marked_by = actor_id
        elif old_status in ("DROPOUT", "DROPPED") and normalized_status not in ("DROPOUT", "DROPPED"):
            # If changing back to active/enrolled, reset dropout metadata
            student.dropout_reason = None
            student.dropout_date = None
            student.dropout_marked_by = None

        student.enrollment_status = normalized_status
        updated = self.repo.update(student)

        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="MARK_STUDENT_DROPOUT" if normalized_status in ("DROPOUT", "DROPPED") else "CHANGE_STUDENT_STATUS",
            entity="Student",
            entity_id=updated.id,
            old_values=f"status={old_status}",
            new_values=f"status={updated.enrollment_status}, reason={reason or ''}"
        ))
        return updated

    def delete_student(self, student_id: str, actor_id: Optional[str] = None) -> dict:
        student = self.get_student(student_id)
        roll = student.roll_number
        user = student.user
        student_name = user.full_name if user else roll

        self.repo.delete(student)

        # Also remove User record if role is STUDENT
        if user and user.role == "STUDENT":
            self.user_repo.db.delete(user)
            self.user_repo.db.commit()

        self.audit_repo.create(AuditLog(
            actor_id=actor_id,
            action="DELETE_STUDENT",
            entity="Student",
            entity_id=student_id,
            old_values=f"Deleted student roll={roll}, name={student_name}"
        ))
        return {"message": f"Student '{student_name}' (Roll: {roll}) has been deleted successfully."}


class DeviceService:
    def __init__(self, db: Session):
        self.repo = DeviceRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_device(self, device_id: str) -> Device:
        device = self.repo.get_by_id(device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        return device

    def list_devices(self, user_id: Optional[str] = None, status_filter: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Device]:
        return self.repo.get_all(user_id=user_id, status=status_filter, skip=skip, limit=limit)

    def register_device(self, data: DeviceCreate) -> Device:
        device = Device(
            user_id=data.user_id,
            student_id=data.student_id,
            device_fingerprint=data.device_fingerprint,
            device_model=data.device_model,
            os_version=data.os_version,
            status="PENDING"
        )
        created = self.repo.create(device)
        self.audit_repo.create(AuditLog(
            actor_id=data.user_id,
            action="REGISTER_DEVICE",
            entity="Device",
            entity_id=created.id,
            new_values=f"Registered device model={created.device_model}"
        ))
        return created

    def approve_device(self, device_id: str, approver_id: str) -> Device:
        device = self.get_device(device_id)
        old_status = device.status
        device.status = "APPROVED"
        device.approved_by = approver_id
        device.approved_at = datetime.utcnow()
        updated = self.repo.update(device)
        self.audit_repo.create(AuditLog(
            actor_id=approver_id,
            action="APPROVE_DEVICE",
            entity="Device",
            entity_id=updated.id,
            old_values=f"status={old_status}",
            new_values="status=APPROVED"
        ))
        return updated


class ConsentService:
    def __init__(self, db: Session):
        self.repo = ConsentRepository(db)
        self.audit_repo = AuditLogRepository(db)

    def get_user_consents(self, user_id: str) -> List[Consent]:
        return self.repo.get_all_by_user(user_id)

    def list_consents(self, user_id: Optional[str] = None) -> List[Consent]:
        if user_id:
            return self.repo.get_all_by_user(user_id)
        return self.repo.get_all()

    def record_consent(self, data: ConsentCreate) -> Consent:
        consent = Consent(
            user_id=data.user_id,
            student_id=data.student_id,
            consent_type=data.consent_type,
            consent_version=data.consent_version,
            is_granted=data.is_granted,
            ip_address=data.ip_address,
            granted_at=datetime.utcnow()
        )
        created = self.repo.create(consent)
        self.audit_repo.create(AuditLog(
            actor_id=data.user_id,
            action="RECORD_CONSENT",
            entity="Consent",
            entity_id=created.id,
            new_values=f"Granted consent type={created.consent_type}"
        ))
        return created
