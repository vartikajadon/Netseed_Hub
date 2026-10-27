from typing import List, Optional
import io
import csv
import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, status, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_staff, require_hr, verify_student_access, require_role
from app.models.all_models import User, Student, Program, Batch, AuditLog
from app.schemas.all_schemas import (
    StudentResponse, StudentCreate, StudentUpdate, MentorAssignmentPayload,
    StudentStatusPayload, PaginatedStudentList, AdminResetPasswordRequest
)
from app.core.security import hash_password, DEFAULT_TEMPORARY_PASSWORD
from app.services.base_services import StudentService

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/me", response_model=StudentResponse)
def get_my_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the authenticated student's own profile record.
    """
    if current_user.role != "STUDENT" and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not a student identity."
        )

    service = StudentService(db)
    student = service.get_by_user_id(current_user.id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user."
        )
    return student

@router.get("", response_model=PaginatedStudentList)
def list_students(
    search: Optional[str] = Query(None, description="Search by roll number, name, email, college, qualification"),
    program_id: Optional[str] = Query(None, description="Filter by program_id"),
    batch_id: Optional[str] = Query(None, description="Filter by batch_id"),
    mentor_id: Optional[str] = Query(None, description="Filter by mentor_id"),
    status: Optional[str] = Query(None, description="Filter by enrollment_status"),
    batch_type: Optional[str] = Query(None, description="Filter by batch_type (TECH_MASTER, SHORT_DURATION, INTERNSHIP)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    List student roster with server-side search & filtering.
    Restricted to MENTOR, HR, and SUPER_ADMIN.
    Mentors are automatically restricted to their assigned students.
    """
    effective_mentor_id = mentor_id
    if current_user.role == "MENTOR":
        effective_mentor_id = current_user.id

    service = StudentService(db)
    items, total = service.list_students(
        search=search,
        program_id=program_id,
        batch_id=batch_id,
        mentor_id=effective_mentor_id,
        status_filter=status,
        batch_type=batch_type,
        skip=skip,
        limit=limit
    )

    return PaginatedStudentList(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed student profile with isolation checks:
    - STUDENT role can ONLY view their own record.
    - MENTOR role can ONLY view students assigned to their batch.
    """
    student = verify_student_access(current_user, student_id, db)
    return student

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Create/Register a new student enrollment record. HR and Super Admin only.
    Validates user, program, batch consistency, and mentor role.
    """
    service = StudentService(db)
    return service.create_student(data, actor_id=current_user.id)

@router.put("/{student_id}", response_model=StudentResponse)
@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    data: StudentUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Update student profile details. HR and Super Admin only.
    """
    service = StudentService(db)
    return service.update_student(student_id, data, actor_id=current_user.id)

@router.patch("/{student_id}/mentor", response_model=StudentResponse)
def assign_mentor(
    student_id: str,
    payload: MentorAssignmentPayload,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Assign or change mentor for a student. HR and Super Admin only.
    Validates mentor user exists and has MENTOR role.
    """
    service = StudentService(db)
    return service.assign_mentor(student_id, payload.mentor_id, actor_id=current_user.id)

@router.patch("/{student_id}/status", response_model=StudentResponse)
def update_status(
    student_id: str,
    payload: StudentStatusPayload,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Update student lifecycle enrollment status (e.g. ACTIVE, COMPLETED, DROPPED).
    HR and Super Admin only.
    """
    service = StudentService(db)
    return service.update_status(student_id, payload.status, reason=payload.reason, actor_id=current_user.id)

@router.delete("/{student_id}", status_code=status.HTTP_200_OK)
def delete_student(
    student_id: str,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Remove/delete a student from the system. Restricted to HR and SUPER_ADMIN.
    """
    service = StudentService(db)
    return service.delete_student(student_id, actor_id=current_user.id)


@router.post("/{student_id}/reset-password", summary="HR / Super Admin Reset Student Password")
def reset_student_password(
    student_id: str,
    payload: Optional[AdminResetPasswordRequest] = None,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    HR / Super Admin resets a student's password to a temporary password and flags must_change_password=True.
    When the student logs in next, they will be required to create their own new password.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    user = student.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account associated with student not found.")

    temp_pass = (payload.new_password if payload and payload.new_password else DEFAULT_TEMPORARY_PASSWORD).strip()
    if len(temp_pass) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Temporary password must be at least 6 characters.")

    user.password_hash = hash_password(temp_pass)
    user.must_change_password = True
    user.updated_at = datetime.utcnow()

    # Log audit trail
    audit = AuditLog(
        actor_id=current_user.id,
        action="RESET_STUDENT_PASSWORD",
        entity="Student",
        entity_id=student.id,
        new_values=json.dumps({"event": "HR_RESET_PASSWORD", "student_roll": student.roll_number, "email": user.email}),
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": f"Password reset successfully for student {user.full_name} ({student.roll_number}).",
        "temporary_password": temp_pass,
        "student_roll": student.roll_number,
        "email": user.email
    }



class CVUploadRequest(BaseModel):
    cv_url: str
    cv_file_name: Optional[str] = "Student_Resume.pdf"


@router.post("/me/cv", response_model=StudentResponse, summary="Student Upload or Update Resume/CV")
def upload_my_cv(
    payload: CVUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Student uploads or updates their CV document in their profile.
    Available to HR, Mentors, and Super Admins.
    """
    from datetime import datetime
    from app.api_routes.notifications import create_notification

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found."
        )

    student.cv_url = payload.cv_url.strip()
    student.cv_file_name = payload.cv_file_name.strip() if payload.cv_file_name else "Student_Resume.pdf"
    student.cv_updated_at = datetime.utcnow()
    student.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(student)

    # Notify Mentor and HR
    s_name = current_user.full_name
    mentor_id = student.mentor_id or (student.batch.mentor_id if student.batch else None)
    if mentor_id:
        create_notification(
            db=db,
            user_id=mentor_id,
            title=f"CV Uploaded: {s_name}",
            message=f"{s_name} ({student.roll_number}) uploaded their updated CV / Resume.",
            notification_type="SYSTEM",
            link_url="/mentor/students",
        )

    create_notification(
        db=db,
        title=f"Student CV Updated: {s_name}",
        message=f"{s_name} ({student.roll_number}) updated their Resume / CV document.",
        notification_type="SYSTEM",
        target_role="HR",
        link_url=f"/hr/students/{student.id}",
    )

    return student


class ReleaseCertificatePayload(BaseModel):
    approve: bool = True


@router.put("/{student_id}/release-certificate", response_model=StudentResponse, summary="Mentor Release/Lock Certificate Approval")
def release_student_certificate(
    student_id: str,
    payload: ReleaseCertificatePayload,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    """
    Mentor officially clicks 'Release Certificate' after training completion.
    This unlocks certificate creation in the HR management portal.
    """
    from datetime import datetime
    from app.services.notification_service import create_notification

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found."
        )

    student.certificate_approved_by_mentor = payload.approve
    student.certificate_approved_at = datetime.utcnow() if payload.approve else None
    student.certificate_approved_by = current_user.id if payload.approve else None
    student.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(student)

    if payload.approve:
        s_name = student.user.full_name if student.user else student.roll_number
        b_name = student.batch.name if student.batch else "Training Batch"
        create_notification(
            db=db,
            title=f"Certificate Release Approved: {s_name}",
            message=f"Mentor {current_user.full_name} has officially released certificate for {s_name} ({student.roll_number}) in {b_name}. HR can now issue the certificate.",
            notification_type="CERTIFICATE",
            target_role="HR",
            link_url="/hr/certificates",
        )
        if student.user_id:
            create_notification(
                db=db,
                user_id=student.user_id,
                title="Training Completion Certificate Released!",
                message=f"Congratulations! Your mentor {current_user.full_name} has released your certificate of completion.",
                notification_type="CERTIFICATE",
                link_url="/student",
            )

    return student


class StudentImportRow(BaseModel):
    model_config = ConfigDict(extra="ignore")
    roll_number: str
    full_name: str
    email: str
    contact_number: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    batch_type: Optional[str] = "TECH_MASTER"
    enrollment_status: Optional[str] = None
    total_fees: Optional[float] = None
    payment_mode: Optional[str] = "ONLINE"
    installment_type: Optional[str] = "ONE_TIME"
    college_name: Optional[str] = None
    qualification: Optional[str] = None
    domicile: Optional[str] = None
    dob: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    passout_year: Optional[int] = None
    guardian_name: Optional[str] = None
    address: Optional[str] = None


class BulkStudentImportPayload(BaseModel):
    students: List[StudentImportRow]
    default_enrollment_status: Optional[str] = None  # e.g. "ACTIVE" for current, "COMPLETED" for previous


class ImportStudentsResponse(BaseModel):
    success: bool
    message: str
    total_processed: int
    created_count: int
    updated_count: int
    errors: List[str] = []


def _parse_excel_date(val) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    val_str = str(val).strip()
    if not val_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass
    return None


def _normalize_batch_type(raw_val: Optional[str]) -> str:
    if not raw_val:
        return "TECH_MASTER"
    val = str(raw_val).strip().upper()
    if "SHORT" in val:
        return "SHORT_DURATION"
    if "INTERN" in val:
        return "INTERNSHIP"
    return "TECH_MASTER"


def _normalize_status(raw_val: Optional[str], default_status: Optional[str] = None) -> str:
    val = (raw_val or default_status or "ACTIVE").strip().upper()
    if val in ("CURRENT", "IN_PROGRESS", "ONGOING"):
        return "ACTIVE"
    if val in ("PREVIOUS", "ALUMNI", "PASSED", "COMPLETED", "PASS_OUT"):
        return "COMPLETED"
    if val in ("DROPPED", "DROPOUT"):
        return "DROPPED"
    if val in ("TERMINATED", "DISMISSED"):
        return "TERMINATED"
    if val in ("ON_LEAVE", "LEAVE"):
        return "ON_LEAVE"
    if val in ("ENROLLED", "REGISTERED"):
        return "ENROLLED"
    return "ACTIVE"


def _process_student_rows(
    rows: List[dict],
    default_status: Optional[str],
    actor_id: str,
    db: Session
) -> ImportStudentsResponse:
    created = 0
    updated = 0
    errors = []

    # Cache programs and batches for quick lookup
    all_programs = db.query(Program).all()
    all_batches = db.query(Batch).all()

    for idx, r in enumerate(rows, start=1):
        try:
            roll = str(r.get("roll_number") or "").strip()
            name = str(r.get("full_name") or "").strip()
            email = str(r.get("email") or "").strip().lower()

            if not roll or not name or not email:
                errors.append(f"Row #{idx}: Missing required fields (Roll Number, Full Name, or Email).")
                continue

            phone = str(r.get("contact_number") or "").strip() or None

            # 1. Resolve or create user
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    full_name=name,
                    phone=phone,
                    role="STUDENT",
                    is_active=True,
                )
                db.add(user)
                db.flush()
            else:
                if name and user.full_name != name:
                    user.full_name = name
                if phone and user.phone != phone:
                    user.phone = phone
                if user.role != "STUDENT":
                    user.role = "STUDENT"
                db.flush()

            # 2. Resolve Program
            program_id = None
            prog_term = str(r.get("program") or "").strip().lower()
            if prog_term:
                matched_p = next(
                    (p for p in all_programs if p.id == prog_term or p.code.lower() == prog_term or prog_term in p.title.lower()),
                    None
                )
                if matched_p:
                    program_id = matched_p.id

            # 3. Resolve Batch
            batch_id = None
            batch_term = str(r.get("batch") or "").strip().lower()
            if batch_term:
                matched_b = next(
                    (b for b in all_batches if b.id == batch_term or batch_term in b.name.lower()),
                    None
                )
                if matched_b:
                    batch_id = matched_b.id
                    if not program_id and matched_b.program_id:
                        program_id = matched_b.program_id

            # 4. Resolve Batch Type & Enrollment Status
            batch_type = _normalize_batch_type(r.get("batch_type"))
            enrollment_status = _normalize_status(r.get("enrollment_status"), default_status)

            # 5. Financial & Profile fields
            total_fees = None
            if r.get("total_fees") is not None and str(r.get("total_fees")).strip():
                try:
                    total_fees = float(str(r.get("total_fees")).replace(",", "").strip())
                except ValueError:
                    total_fees = None

            payment_mode = (str(r.get("payment_mode") or "ONLINE").strip().upper())
            installment_type = (str(r.get("installment_type") or "ONE_TIME").strip().upper())
            if installment_type not in ("ONE_TIME", "TWO_INSTALLMENTS"):
                installment_type = "ONE_TIME"

            college_name = str(r.get("college_name") or "").strip() or None
            qualification = str(r.get("qualification") or "").strip() or None
            domicile = str(r.get("domicile") or "").strip() or None
            guardian_name = str(r.get("guardian_name") or "").strip() or None
            address = str(r.get("address") or "").strip() or None

            passout_year = None
            if r.get("passout_year"):
                try:
                    passout_year = int(float(str(r.get("passout_year")).strip()))
                except ValueError:
                    passout_year = None

            dob = _parse_excel_date(r.get("dob"))
            start_date = _parse_excel_date(r.get("start_date"))
            end_date = _parse_excel_date(r.get("end_date"))

            # 6. Check existing student record by roll_number or user_id
            student = db.query(Student).filter(
                (Student.roll_number == roll) | (Student.user_id == user.id)
            ).first()

            if student:
                # Update existing student
                student.roll_number = roll
                student.user_id = user.id
                if program_id:
                    student.program_id = program_id
                if batch_id:
                    student.batch_id = batch_id
                student.batch_type = batch_type
                student.enrollment_status = enrollment_status
                if total_fees is not None:
                    student.total_fees = total_fees
                student.payment_mode = payment_mode
                student.installment_type = installment_type
                if college_name:
                    student.college_name = college_name
                if qualification:
                    student.qualification = qualification
                if domicile:
                    student.domicile = domicile
                if guardian_name:
                    student.guardian_name = guardian_name
                if address:
                    student.address = address
                if passout_year:
                    student.passout_year = passout_year
                if dob:
                    student.dob = dob
                if start_date:
                    student.start_date = start_date
                if end_date:
                    student.end_date = end_date
                student.updated_at = datetime.utcnow()
                updated += 1
            else:
                # Create brand new student
                new_student = Student(
                    user_id=user.id,
                    roll_number=roll,
                    program_id=program_id,
                    batch_id=batch_id,
                    batch_type=batch_type,
                    enrollment_status=enrollment_status,
                    total_fees=total_fees or 0.0,
                    payment_mode=payment_mode,
                    installment_type=installment_type,
                    college_name=college_name,
                    qualification=qualification,
                    domicile=domicile,
                    guardian_name=guardian_name,
                    address=address,
                    passout_year=passout_year,
                    dob=dob,
                    start_date=start_date or date.today(),
                    end_date=end_date,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(new_student)
                created += 1

        except Exception as ex:
            errors.append(f"Row #{idx}: {str(ex)}")

    db.add(AuditLog(
        actor_id=actor_id,
        action="BULK_STUDENT_IMPORT",
        entity="Student",
        entity_id=None,
        new_values=json.dumps({
            "total_processed": len(rows),
            "created": created,
            "updated": updated,
            "errors_count": len(errors)
        }),
        timestamp=datetime.utcnow()
    ))

    db.commit()

    return ImportStudentsResponse(
        success=True,
        message=f"Successfully imported {created + updated} student record(s) ({created} created, {updated} updated).",
        total_processed=len(rows),
        created_count=created,
        updated_count=updated,
        errors=errors
    )


@router.post("/import-bulk", response_model=ImportStudentsResponse, summary="Import multiple students via JSON payload")
def import_students_bulk(
    payload: BulkStudentImportPayload,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Bulk import student roster entries for either currently enrolled or previous alumni students.
    Validates and upserts user and student profiles. HR and SUPER_ADMIN only.
    """
    rows = [s.model_dump() for s in payload.students]
    return _process_student_rows(
        rows=rows,
        default_status=payload.default_enrollment_status,
        actor_id=current_user.id,
        db=db
    )


@router.post("/import-excel", response_model=ImportStudentsResponse, summary="Import students directly from Excel (.xlsx/.xls) or CSV")
async def import_students_excel(
    file: UploadFile = File(...),
    default_status: Optional[str] = Form(None),
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Upload and parse an Excel spreadsheet (.xlsx, .xls) or CSV file containing student records.
    Supports both currently enrolled (ACTIVE/ENROLLED) and previous (COMPLETED/ALUMNI/DROPPED) students.
    """
    filename = file.filename.lower()
    contents = await file.read()

    rows: List[dict] = []

    if filename.endswith(".csv"):
        text = contents.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            normalized_row = {
                k.strip().lower().replace(" ", "_"): v
                for k, v in row.items() if k
            }
            rows.append(normalized_row)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = wb.active
        headers = []
        for cell in sheet[1]:
            header_val = str(cell.value or "").strip().lower().replace(" ", "_")
            headers.append(header_val)

        for row_cells in sheet.iter_rows(min_row=2, values_only=True):
            if not any(row_cells):
                continue
            row_dict = {}
            for col_idx, cell_value in enumerate(row_cells):
                if col_idx < len(headers) and headers[col_idx]:
                    row_dict[headers[col_idx]] = cell_value
            rows.append(row_dict)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV file."
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded spreadsheet contains no data rows."
        )

    return _process_student_rows(
        rows=rows,
        default_status=default_status,
        actor_id=current_user.id,
        db=db
    )

