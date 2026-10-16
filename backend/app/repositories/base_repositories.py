from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.all_models import (
    User, Program, Batch, Geofence, Student, Device, Consent, FaceTemplate, AuditLog
)

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        return self.db.query(User).offset(skip).limit(limit).all()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user


class GeofenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, geofence_id: str) -> Optional[Geofence]:
        return self.db.query(Geofence).filter(Geofence.id == geofence_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[Geofence]:
        return self.db.query(Geofence).offset(skip).limit(limit).all()

    def create(self, geofence: Geofence) -> Geofence:
        self.db.add(geofence)
        self.db.commit()
        self.db.refresh(geofence)
        return geofence

    def update(self, geofence: Geofence) -> Geofence:
        self.db.commit()
        self.db.refresh(geofence)
        return geofence


class ProgramRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, program_id: str) -> Optional[Program]:
        return self.db.query(Program).filter(Program.id == program_id).first()

    def get_by_code(self, code: str) -> Optional[Program]:
        return self.db.query(Program).filter(Program.code == code).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[Program]:
        return self.db.query(Program).offset(skip).limit(limit).all()

    def create(self, program: Program) -> Program:
        self.db.add(program)
        self.db.commit()
        self.db.refresh(program)
        return program

    def update(self, program: Program) -> Program:
        self.db.commit()
        self.db.refresh(program)
        return program

    def delete(self, program: Program) -> None:
        self.db.delete(program)
        self.db.commit()


class BatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, batch_id: str) -> Optional[Batch]:
        return self.db.query(Batch).filter(Batch.id == batch_id).first()

    def get_all(self, program_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Batch]:
        query = self.db.query(Batch)
        if program_id:
            query = query.filter(Batch.program_id == program_id)
        return query.offset(skip).limit(limit).all()

    def create(self, batch: Batch) -> Batch:
        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def update(self, batch: Batch) -> Batch:
        self.db.commit()
        self.db.refresh(batch)
        return batch


class StudentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, student_id: str) -> Optional[Student]:
        return self.db.query(Student).filter(Student.id == student_id).first()

    def get_by_user_id(self, user_id: str) -> Optional[Student]:
        return self.db.query(Student).filter(Student.user_id == user_id).first()

    def get_by_roll_number(self, roll_number: str) -> Optional[Student]:
        return self.db.query(Student).filter(Student.roll_number == roll_number).first()

    def get_all(
        self,
        search: Optional[str] = None,
        program_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        mentor_id: Optional[str] = None,
        status: Optional[str] = None,
        batch_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Student], int]:
        query = self.db.query(Student).join(User, Student.user_id == User.id)

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                (Student.roll_number.ilike(pattern)) |
                (Student.college_name.ilike(pattern)) |
                (Student.qualification.ilike(pattern)) |
                (Student.domicile.ilike(pattern)) |
                (User.full_name.ilike(pattern)) |
                (User.email.ilike(pattern))
            )

        if program_id:
            query = query.filter(Student.program_id == program_id)

        if batch_id:
            query = query.filter(Student.batch_id == batch_id)

        if mentor_id:
            batch_ids = [b[0] for b in self.db.query(Batch.id).filter(Batch.mentor_id == mentor_id).all()]
            if batch_ids:
                query = query.filter((Student.mentor_id == mentor_id) | (Student.batch_id.in_(batch_ids)))
            else:
                query = query.filter(Student.mentor_id == mentor_id)

        if status:
            query = query.filter(Student.enrollment_status == status)

        if batch_type:
            bt_upper = batch_type.strip().upper()
            if bt_upper in ["SHORT_DURATION", "SHORT DURATION", "SIX_MONTHS", "6 MONTHS", "6 MONTHS PROGRAM"]:
                query = query.filter(
                    (Student.batch_type == "SHORT_DURATION") |
                    (Student.batch_type == "SIX_MONTHS") |
                    (Student.batch_type == "6 Months Program")
                )
            elif bt_upper in ["TECH_MASTER", "TECH MASTER"]:
                query = query.filter(
                    (Student.batch_type == "TECH_MASTER") |
                    (Student.batch_type == "Tech Master") |
                    (Student.batch_type == "Full-Time")
                )
            else:
                query = query.filter(Student.batch_type == bt_upper)

        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def create(self, student: Student) -> Student:
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def update(self, student: Student) -> Student:
        self.db.commit()
        self.db.refresh(student)
        return student

    def delete(self, student: Student) -> None:
        self.db.delete(student)
        self.db.commit()


class DeviceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, device_id: str) -> Optional[Device]:
        return self.db.query(Device).filter(Device.id == device_id).first()

    def get_by_user_and_fingerprint(self, user_id: str, fingerprint: str) -> Optional[Device]:
        return self.db.query(Device).filter(
            Device.user_id == user_id,
            Device.device_fingerprint == fingerprint
        ).first()

    def get_all(self, user_id: Optional[str] = None, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Device]:
        query = self.db.query(Device)
        if user_id:
            query = query.filter(Device.user_id == user_id)
        if status:
            query = query.filter(Device.status == status)
        return query.offset(skip).limit(limit).all()

    def create(self, device: Device) -> Device:
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return device

    def update(self, device: Device) -> Device:
        self.db.commit()
        self.db.refresh(device)
        return device


class ConsentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, consent_id: str) -> Optional[Consent]:
        return self.db.query(Consent).filter(Consent.id == consent_id).first()

    def get_active_by_user(self, user_id: str, consent_type: str = "FACIAL_BIOMETRIC_ATTENDANCE") -> Optional[Consent]:
        return self.db.query(Consent).filter(
            Consent.user_id == user_id,
            Consent.consent_type == consent_type,
            Consent.is_granted == True,
            Consent.revoked_at == None
        ).first()

    def get_all_by_user(self, user_id: str) -> List[Consent]:
        return self.db.query(Consent).filter(Consent.user_id == user_id).all()

    def get_all(self) -> List[Consent]:
        return self.db.query(Consent).all()

    def create(self, consent: Consent) -> Consent:
        self.db.add(consent)
        self.db.commit()
        self.db.refresh(consent)
        return consent


class AuditLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, log: AuditLog) -> AuditLog:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_all(self, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        return self.db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
