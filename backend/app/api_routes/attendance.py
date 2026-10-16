import uuid
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, Student, Batch, AttendanceDailyRecord, AttendanceEvent, RegularizationRequest, AuditLog
from app.schemas.attendance_schemas import (
    FaceEnrollmentRequest, FaceEnrollmentResponse,
    LivenessChallengeResponse, AttendancePunchRequest,
    AttendanceEventResponse, AttendanceDailyRecordResponse,
    AttendanceRegularizePayload, StudentAttendanceSummaryResponse,
    RegularizationRequestCreate, RegularizationRequestReview, RegularizationRequestResponse
)
from app.services.attendance_service import AttendanceService, calculate_haversine_distance

router = APIRouter(prefix="/attendance", tags=["Attendance System"])


@router.post("/enroll-face", response_model=FaceEnrollmentResponse, summary="Student Face Biometric Enrollment")
def enroll_student_face(
    payload: FaceEnrollmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Endpoint to capture a student's facial baseline reference and explicit privacy consent.
    Restricted to HR and SUPER_ADMIN roles. Students cannot enroll or modify biometric data.
    """
    face_tmpl = AttendanceService.enroll_face_template(
        db=db,
        actor_id=current_user.id,
        student_id=payload.student_id,
        consent_granted=payload.consent_granted,
        consent_version=payload.consent_version,
        face_image_base64=payload.face_image_base64,
        face_samples=payload.face_samples,
        quality_score=payload.quality_score
    )

    return FaceEnrollmentResponse(
        student_id=payload.student_id,
        face_enrollment_status="ENROLLED",
        template_id=face_tmpl.id,
        confidence_score=float(face_tmpl.confidence_score),
        quality_score=float(face_tmpl.quality_score),
        enrolled_at=face_tmpl.enrolled_at
    )


@router.get("/liveness-challenge", response_model=LivenessChallengeResponse, summary="Generate Liveness Detection Challenge")
def get_liveness_challenge(
    current_user: User = Depends(get_current_user)
):
    """
    Generates a challenge token for anti-spoofing face recognition punching.
    """
    challenge_data = AttendanceService.generate_liveness_challenge()
    return LivenessChallengeResponse(**challenge_data)


@router.post("/punch", summary="Mark Attendance (Face Recognition + Liveness + Geofence)")
def punch_attendance(
    payload: AttendancePunchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Student attendance check-in (IN) / check-out (OUT) with face recognition,
    liveness verification, and server-side Haversine geofence calculation.
    """
    event, daily_record = AttendanceService.record_attendance_punch(
        db=db,
        user=current_user,
        event_type=payload.event_type,
        lat=payload.latitude,
        lon=payload.longitude,
        challenge_token=payload.challenge_token,
        liveness_proof_base64=payload.liveness_proof_base64,
        device_fingerprint=payload.device_fingerprint,
        gps_accuracy_meters=payload.gps_accuracy_meters
    )

    return {
        "message": f"Attendance Punch {event.event_type} recorded successfully!",
        "event": AttendanceEventResponse.model_validate(event),
        "daily_record": AttendanceDailyRecordResponse.model_validate(daily_record)
    }


@router.get("/my-summary", response_model=StudentAttendanceSummaryResponse, summary="Student Daily Attendance Summary")
def get_my_attendance_summary(
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the current student's daily attendance timeline, total working hours, and geofence status.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="No student profile record found.")

    query_date = target_date or datetime.utcnow().date()

    daily_record = AttendanceService.recalculate_daily_attendance(db, student.id, query_date)
    events = db.query(AttendanceEvent).filter(
        AttendanceEvent.student_id == student.id,
        AttendanceEvent.date == query_date
    ).order_by(AttendanceEvent.timestamp.asc()).all()

    center_lat, center_lon, radius, geo_name = AttendanceService.get_effective_geofence(db, student)

    last_event = events[-1] if events else None
    latest_distance = float(last_event.distance_from_geofence_meters) if last_event else 0.0

    return StudentAttendanceSummaryResponse(
        student_id=student.id,
        roll_number=student.roll_number,
        student_name=current_user.full_name,
        date=query_date,
        status=daily_record.status,
        total_working_hours=float(daily_record.total_working_hours),
        total_working_minutes=daily_record.total_working_minutes,
        first_punch_in=daily_record.first_punch_in,
        last_punch_out=daily_record.last_punch_out,
        punch_count=daily_record.punch_count,
        events=[AttendanceEventResponse.model_validate(e) for e in events],
        is_geofence_valid=True,
        geofence_name=geo_name,
        geofence_distance_meters=latest_distance
    )


@router.get("/my-records", response_model=List[AttendanceDailyRecordResponse], summary="Student Attendance History")
def get_my_attendance_history(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the historical daily attendance records for the logged-in student.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="No student profile record found.")

    query = db.query(AttendanceDailyRecord).filter(AttendanceDailyRecord.student_id == student.id)
    if start_date:
        query = query.filter(AttendanceDailyRecord.date >= start_date)
    if end_date:
        query = query.filter(AttendanceDailyRecord.date <= end_date)

    records = query.order_by(AttendanceDailyRecord.date.desc()).all()
    return [AttendanceDailyRecordResponse.model_validate(r) for r in records]


@router.get("/student/{student_id}/records", response_model=List[AttendanceDailyRecordResponse], summary="HR Specific Student Attendance History")
def get_student_attendance_history(
    student_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "MENTOR", "SUPER_ADMIN", "STUDENT"]))
):
    """
    Fetches the historical daily attendance records for a specific student for HR monthly calendar view.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    query = db.query(AttendanceDailyRecord).filter(AttendanceDailyRecord.student_id == student_id)
    if start_date:
        query = query.filter(AttendanceDailyRecord.date >= start_date)
    if end_date:
        query = query.filter(AttendanceDailyRecord.date <= end_date)

    records = query.order_by(AttendanceDailyRecord.date.asc()).all()
    return [AttendanceDailyRecordResponse.model_validate(r) for r in records]



@router.get("/daily-records", response_model=List[AttendanceDailyRecordResponse], summary="HR Roster Global Attendance")
def get_global_daily_attendance(
    target_date: Optional[date] = Query(None, description="Target date (defaults to today)"),
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "MENTOR", "SUPER_ADMIN"]))
):
    """
    HR/Mentor endpoint to monitor daily attendance records across all students.
    Auto-populates daily records for all active students if missing for today.
    """
    query_date = target_date or datetime.utcnow().date()

    # Ensure all active students have a daily record row created for query_date
    students_query = db.query(Student)
    if current_user.role == "MENTOR":
        mentor_batch_ids = [b[0] for b in db.query(Batch.id).filter(Batch.mentor_id == current_user.id).all()]
        if mentor_batch_ids:
            students_query = students_query.filter((Student.mentor_id == current_user.id) | (Student.batch_id.in_(mentor_batch_ids)))
        else:
            students_query = students_query.filter(Student.mentor_id == current_user.id)
    if program_id:
        students_query = students_query.filter(Student.program_id == program_id)
    if batch_id:
        students_query = students_query.filter(Student.batch_id == batch_id)

    students = students_query.all()
    for s in students:
        AttendanceService.recalculate_daily_attendance(db, s.id, query_date)
    db.commit()

    # Fetch daily records
    records_query = db.query(AttendanceDailyRecord).join(Student).filter(AttendanceDailyRecord.date == query_date)
    if current_user.role == "MENTOR":
        mentor_batch_ids = [b[0] for b in db.query(Batch.id).filter(Batch.mentor_id == current_user.id).all()]
        if mentor_batch_ids:
            records_query = records_query.filter((Student.mentor_id == current_user.id) | (Student.batch_id.in_(mentor_batch_ids)))
        else:
            records_query = records_query.filter(Student.mentor_id == current_user.id)
    if program_id:
        records_query = records_query.filter(Student.program_id == program_id)
    if batch_id:
        records_query = records_query.filter(Student.batch_id == batch_id)
    if status:
        records_query = records_query.filter(AttendanceDailyRecord.status == status.upper())

    records = records_query.order_by(Student.roll_number.asc()).all()
    return [AttendanceDailyRecordResponse.model_validate(r) for r in records]


@router.post("/regularize", response_model=AttendanceDailyRecordResponse, summary="HR Attendance Regularization Override")
def regularize_attendance_record(
    payload: AttendanceRegularizePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    HR endpoint to manually regularize/override a student's attendance record with mandatory audit logging.
    """
    record = AttendanceService.regularize_attendance(
        db=db,
        actor_id=current_user.id,
        attendance_record_id=payload.attendance_record_id,
        new_status=payload.status,
        override_working_hours=payload.override_working_hours,
        reason=payload.reason
    )
    return AttendanceDailyRecordResponse.model_validate(record)


@router.post("/regularization-requests", response_model=RegularizationRequestResponse, status_code=status.HTTP_201_CREATED, summary="Student Attendance Regularization Request")
def submit_regularization_request(
    payload: RegularizationRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Student submits an attendance regularization request with note sent to Prerna Verma (HR).
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Only enrolled students can submit attendance regularization requests.")

    today_utc = datetime.utcnow().date()
    if payload.date > today_utc:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance cannot be regularized for future dates ({payload.date}). Regularization is strictly permitted for past dates."
        )

    existing = db.query(RegularizationRequest).filter(
        RegularizationRequest.student_id == student.id,
        RegularizationRequest.date == payload.date,
        RegularizationRequest.status == "PENDING"
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A pending regularization request for {payload.date} is already awaiting review by Prerna Verma (HR)."
        )

    daily_rec = None
    if payload.attendance_record_id:
        daily_rec = db.query(AttendanceDailyRecord).filter(AttendanceDailyRecord.id == payload.attendance_record_id).first()
    if not daily_rec:
        daily_rec = db.query(AttendanceDailyRecord).filter(
            AttendanceDailyRecord.student_id == student.id,
            AttendanceDailyRecord.date == payload.date
        ).first()

    req = RegularizationRequest(
        id=str(uuid.uuid4()),
        student_id=student.id,
        attendance_record_id=daily_rec.id if daily_rec else None,
        date=payload.date,
        requested_by=current_user.id,
        reason=payload.reason.strip(),
        proposed_working_hours=payload.proposed_working_hours,
        status="PENDING",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return RegularizationRequestResponse(
        id=req.id,
        student_id=student.id,
        student_name=current_user.full_name,
        roll_number=student.roll_number,
        attendance_record_id=req.attendance_record_id,
        date=req.date,
        requested_by=req.requested_by,
        reason=req.reason,
        proposed_working_hours=float(req.proposed_working_hours),
        status=req.status,
        assigned_to_name="Prerna Verma (HR)",
        assigned_to_email="hr@netlink.org",
        reviewed_by=None,
        reviewed_by_name=None,
        reviewed_at=None,
        review_notes=None,
        created_at=req.created_at,
        updated_at=req.updated_at
    )


@router.get("/my-regularization-requests", response_model=List[RegularizationRequestResponse], summary="My Attendance Regularization Requests")
def get_my_regularization_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Student retrieves historical regularization requests sent to Prerna Verma (HR).
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Only enrolled students have regularization requests.")

    requests = db.query(RegularizationRequest).filter(
        RegularizationRequest.student_id == student.id
    ).order_by(RegularizationRequest.created_at.desc()).all()

    res = []
    for r in requests:
        rev_name = r.reviewer.full_name if r.reviewer else None
        res.append(RegularizationRequestResponse(
            id=r.id,
            student_id=student.id,
            student_name=current_user.full_name,
            roll_number=student.roll_number,
            attendance_record_id=r.attendance_record_id,
            date=r.date,
            requested_by=r.requested_by,
            reason=r.reason,
            proposed_working_hours=float(r.proposed_working_hours),
            status=r.status,
            assigned_to_name="Prerna Verma (HR)",
            assigned_to_email="hr@netlink.org",
            reviewed_by=r.reviewed_by,
            reviewed_by_name=rev_name,
            reviewed_at=r.reviewed_at,
            review_notes=r.review_notes,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return res


@router.get("/regularization-requests", response_model=List[RegularizationRequestResponse], summary="HR Roster of Regularization Requests")
def get_all_regularization_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN", "MENTOR"]))
):
    """
    HR/Admin retrieves student attendance regularization requests.
    """
    q = db.query(RegularizationRequest)
    if status_filter:
        q = q.filter(RegularizationRequest.status == status_filter.upper())
    requests = q.order_by(RegularizationRequest.created_at.desc()).all()

    res = []
    for r in requests:
        st_name = r.student.user.full_name if r.student and r.student.user else "Unknown Student"
        st_roll = r.student.roll_number if r.student else ""
        rev_name = r.reviewer.full_name if r.reviewer else None
        res.append(RegularizationRequestResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=st_name,
            roll_number=st_roll,
            attendance_record_id=r.attendance_record_id,
            date=r.date,
            requested_by=r.requested_by,
            reason=r.reason,
            proposed_working_hours=float(r.proposed_working_hours),
            status=r.status,
            assigned_to_name="Prerna Verma (HR)",
            assigned_to_email="hr@netlink.org",
            reviewed_by=r.reviewed_by,
            reviewed_by_name=rev_name,
            reviewed_at=r.reviewed_at,
            review_notes=r.review_notes,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return res


@router.post("/regularization-requests/{request_id}/review", response_model=RegularizationRequestResponse, summary="HR Review Regularization Request")
def review_regularization_request(
    request_id: str,
    payload: RegularizationRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    HR (Prerna Verma) or Admin reviews a student regularization request.
    If approved, overrides the student's daily attendance record and logs immutable compliance audit.
    """
    req = db.query(RegularizationRequest).filter(RegularizationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Regularization request not found.")

    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request has already been processed with status: {req.status}")

    action = payload.action.upper().strip()
    if action not in ("APPROVE", "REJECT"):
        raise HTTPException(status_code=400, detail="Action must be either APPROVE or REJECT.")

    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()
    req.review_notes = payload.review_notes.strip() if payload.review_notes else None
    req.updated_at = datetime.utcnow()

    if action == "APPROVE":
        req.status = "APPROVED"
        daily_record = None
        if req.attendance_record_id:
            daily_record = db.query(AttendanceDailyRecord).filter(AttendanceDailyRecord.id == req.attendance_record_id).first()
        if not daily_record:
            daily_record = db.query(AttendanceDailyRecord).filter(
                AttendanceDailyRecord.student_id == req.student_id,
                AttendanceDailyRecord.date == req.date
            ).first()
        if not daily_record:
            daily_record = AttendanceDailyRecord(
                id=str(uuid.uuid4()),
                student_id=req.student_id,
                date=req.date,
                created_at=datetime.utcnow()
            )
            db.add(daily_record)
            db.flush()
            req.attendance_record_id = daily_record.id

        hours = payload.override_working_hours if payload.override_working_hours is not None else float(req.proposed_working_hours)
        status_to_set = payload.status.upper() if payload.status else "REGULARIZED"

        daily_record.status = status_to_set
        daily_record.total_working_hours = hours
        daily_record.total_working_minutes = int(hours * 60)
        daily_record.is_regularized = True
        daily_record.regularized_by = current_user.id
        daily_record.regularized_at = datetime.utcnow()
        daily_record.regularization_reason = f"Regularization approved by {current_user.full_name} (HR). Note: {req.reason}"

        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=current_user.id,
            action="APPROVE_REGULARIZATION_REQUEST",
            entity="RegularizationRequest",
            entity_id=req.id,
            new_values=f"Approved regularization for student {req.student_id} on {req.date} by {current_user.full_name} (HR). Overridden to {hours} hrs.",
            timestamp=datetime.utcnow()
        )
        db.add(audit)
    else:
        req.status = "REJECTED"
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=current_user.id,
            action="REJECT_REGULARIZATION_REQUEST",
            entity="RegularizationRequest",
            entity_id=req.id,
            new_values=f"Rejected regularization for student {req.student_id} on {req.date} by {current_user.full_name} (HR).",
            timestamp=datetime.utcnow()
        )
        db.add(audit)

    db.commit()
    db.refresh(req)

    st_name = req.student.user.full_name if req.student and req.student.user else None
    st_roll = req.student.roll_number if req.student else None

    return RegularizationRequestResponse(
        id=req.id,
        student_id=req.student_id,
        student_name=st_name,
        roll_number=st_roll,
        attendance_record_id=req.attendance_record_id,
        date=req.date,
        requested_by=req.requested_by,
        reason=req.reason,
        proposed_working_hours=float(req.proposed_working_hours),
        status=req.status,
        assigned_to_name="Prerna Verma (HR)",
        assigned_to_email="hr@netlink.org",
        reviewed_by=req.reviewed_by,
        reviewed_by_name=current_user.full_name,
        reviewed_at=req.reviewed_at,
        review_notes=req.review_notes,
        created_at=req.created_at,
        updated_at=req.updated_at
    )

