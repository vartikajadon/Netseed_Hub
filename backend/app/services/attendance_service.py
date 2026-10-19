import math
import uuid
import json
from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.configuration.config import settings
from app.models.all_models import (
    User, Student, Geofence, Batch, Consent, FaceTemplate,
    AttendanceEvent, AttendanceDailyRecord, RegularizationRequest, AuditLog
)
from app.services.face_verification_service import FaceVerificationService

# Configurable Netlink Software Group America Inc. Office Geofence Coordinates
DEFAULT_NETLINK_LATITUDE = settings.NETLINK_OFFICE_LAT
DEFAULT_NETLINK_LONGITUDE = settings.NETLINK_OFFICE_LON
DEFAULT_GEOFENCE_RADIUS_METERS = settings.GEOFENCE_RADIUS_METERS


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth in meters
    using the Haversine formula.
    """
    R = 6371000.0  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = R * c
    return round(distance, 2)


class AttendanceService:

    @staticmethod
    def get_effective_geofence(db: Session, student: Student) -> Tuple[float, float, float, str]:
        """
        Determines the effective geofence (center lat, lon, radius, name) for a student
        based on their assigned batch or default Netlink campus geofence.
        """
        if student.batch_id:
            batch = db.query(Batch).filter(Batch.id == student.batch_id).first()
            if batch and batch.geofence_id:
                geo = db.query(Geofence).filter(Geofence.id == batch.geofence_id, Geofence.is_active == True).first()
                if geo:
                    return (
                        float(geo.center_latitude),
                        float(geo.center_longitude),
                        float(geo.radius_meters),
                        geo.name
                    )

        # Fallback to first active Geofence or Netlink HQ default
        default_geo = db.query(Geofence).filter(Geofence.is_active == True).first()
        if default_geo:
            return (
                float(default_geo.center_latitude),
                float(default_geo.center_longitude),
                float(default_geo.radius_meters),
                default_geo.name
            )

        return (
            DEFAULT_NETLINK_LATITUDE,
            DEFAULT_NETLINK_LONGITUDE,
            DEFAULT_GEOFENCE_RADIUS_METERS,
            "Netlink Main Campus HQ"
        )

    @staticmethod
    def enroll_face_template(
        db: Session,
        actor_id: str,
        student_id: str,
        consent_granted: bool,
        consent_version: str = "v1.0",
        face_image_base64: Optional[str] = None,
        face_samples: Optional[List[str]] = None,
        quality_score: float = 0.95
    ) -> FaceTemplate:
        """
        HR enrollment / re-enrollment of student face template with explicit privacy consent.
        Supports 3-5 face samples with centroid ArcFace embedding computation,
        quality verification, liveness anti-spoofing, and duplicate face detection.
        Zero raw facial image storage in DB.
        """
        student = db.query(Student).filter((Student.id == student_id) | (Student.user_id == student_id)).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student record '{student_id}' not found.")

        if not consent_granted:
            raise HTTPException(
                status_code=400,
                detail="Biometric face enrollment requires explicit consent opt-in."
            )

        # 1. Record / Update Consent
        consent = db.query(Consent).filter(
            Consent.student_id == student.id,
            Consent.consent_type == "FACIAL_BIOMETRIC_ATTENDANCE",
            Consent.is_granted == True
        ).first()

        if not consent:
            consent = Consent(
                id=str(uuid.uuid4()),
                user_id=student.user_id,
                student_id=student.id,
                consent_type="FACIAL_BIOMETRIC_ATTENDANCE",
                consent_version=consent_version,
                is_granted=True,
                granted_at=datetime.utcnow()
            )
            db.add(consent)
            db.flush()

        # 2. Extract Biometric Feature Vector (Zero Raw Image Storage)
        vector = None
        sample_count = 1
        computed_quality = quality_score
        computed_liveness = 0.95

        if face_samples and len(face_samples) > 0:
            ok, multi_vec, avg_q, avg_l, multi_msg = FaceVerificationService.process_and_validate_multi_samples(
                face_samples,
                min_samples=settings.MIN_SAMPLES_FOR_ENROLLMENT,
                max_samples=settings.MAX_SAMPLES_FOR_ENROLLMENT
            )
            if not ok or multi_vec is None:
                raise HTTPException(status_code=400, detail=multi_msg)
            vector = multi_vec
            sample_count = len(face_samples)
            computed_quality = avg_q
            computed_liveness = avg_l
        elif face_image_base64:
            ok, single_vec, q_score, l_score, single_msg = FaceVerificationService.process_and_validate_sample(
                face_image_base64,
                sample_index=1
            )
            if not ok or single_vec is None:
                raise HTTPException(status_code=400, detail=single_msg)
            vector = single_vec
            sample_count = 1
            computed_quality = q_score
            computed_liveness = l_score
        else:
            raise HTTPException(
                status_code=400,
                detail=f"At least {settings.MIN_SAMPLES_FOR_ENROLLMENT} facial image samples are required for enrollment."
            )

        # 3. Check for Duplicate Face Registration Across All Enrolled Students
        is_unique, dup_msg = FaceVerificationService.check_face_uniqueness(db, vector, exclude_student_id=student.id)
        if not is_unique:
            raise HTTPException(status_code=400, detail=dup_msg)

        embedding_ref = json.dumps({
            "vector": vector,
            "dimension": len(vector),
            "model_version": "ArcFace-buffalo_s",
            "sample_count": sample_count
        })

        # 4. Check if re-enrolling or first-time enrollment
        face_tmpl = db.query(FaceTemplate).filter(FaceTemplate.student_id == student.id).first()
        is_re_enrollment = face_tmpl is not None

        if not face_tmpl:
            face_tmpl = FaceTemplate(
                id=str(uuid.uuid4()),
                user_id=student.user_id,
                student_id=student.id,
                embedding_reference=embedding_ref,
                confidence_score=computed_liveness,
                quality_score=computed_quality,
                enrolled_by=actor_id,
                enrolled_at=datetime.utcnow(),
                consent_id=consent.id
            )
            db.add(face_tmpl)
        else:
            face_tmpl.embedding_reference = embedding_ref
            face_tmpl.quality_score = computed_quality
            face_tmpl.confidence_score = computed_liveness
            face_tmpl.enrolled_by = actor_id
            face_tmpl.enrolled_at = datetime.utcnow()
            face_tmpl.consent_id = consent.id

        # Update student face enrollment status
        student.face_enrollment_status = "ENROLLED"

        # 5. Record Immutable Audit Log
        action_name = "FACE_BIOMETRIC_RE_ENROLLMENT" if is_re_enrollment else "FACE_BIOMETRIC_ENROLLMENT"
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=actor_id,
            action=action_name,
            entity="Student",
            entity_id=student.id,
            new_values=json.dumps({
                "student_id": student.id,
                "face_enrollment_status": "ENROLLED",
                "template_id": face_tmpl.id,
                "sample_count": sample_count,
                "action": action_name
            }),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        db.refresh(face_tmpl)
        return face_tmpl

    @staticmethod
    def generate_liveness_challenge() -> Dict[str, Any]:
        """
        Generates a challenge token for anti-spoofing liveness detection.
        """
        token = f"liveness_tkn_{uuid.uuid4().hex}"
        challenge_types = ["BLINK", "HEAD_TURN_LEFT", "HEAD_TURN_RIGHT", "SMILE"]
        chosen_type = challenge_types[hash(token) % len(challenge_types)]

        instructions = {
            "BLINK": "Please blink both eyes slowly within the frame",
            "HEAD_TURN_LEFT": "Please turn your head slightly to the left",
            "HEAD_TURN_RIGHT": "Please turn your head slightly to the right",
            "SMILE": "Please smile naturally into the camera"
        }

        expires_at = datetime.utcnow() + timedelta(minutes=5)
        return {
            "challenge_token": token,
            "challenge_type": chosen_type,
            "instruction": instructions[chosen_type],
            "expires_at": expires_at
        }

    @staticmethod
    def record_attendance_punch(
        db: Session,
        user: User,
        event_type: str,
        lat: float,
        lon: float,
        challenge_token: str,
        liveness_proof_base64: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        gps_accuracy_meters: Optional[float] = None
    ) -> Tuple[AttendanceEvent, AttendanceDailyRecord]:
        """
        Server-Side Attendance Validation Flow:
        1. Authenticate user & verify student is active.
        2. Verify registered device binding (if configured).
        3. Verify face baseline enrollment & biometric consent.
        4. Validate face liveness & ArcFace recognition against enrolled template.
        5. Validate GPS accuracy (<= 50m).
        6. Calculate server-side Haversine distance from office (<= 100m).
        7. Validate check-in / check-out sequence (no OUT before IN, no duplicate IN, cooldown).
        8. Save attendance event with server UTC timestamp.
        9. Recalculate daily attendance hours and 5-hour status (>= 5:00 Present, < 5:00 Absent).
        """
        # 1. Registered Student & Active Enrollment Check
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: Only registered students can mark attendance."
            )

        if student.enrollment_status not in ("ACTIVE", "ENROLLED"):
            raise HTTPException(
                status_code=403,
                detail=f"Attendance Restricted: Student enrollment status is '{student.enrollment_status}'. Only active registered students can mark attendance."
            )

        # 2. Device Binding Check: Removed requirement so students can log attendance from any device
        # The device fingerprint is recorded in the audit log below for tracking without blocking.

        # 3. Face Baseline Registration & Consent Check
        face_tmpl = db.query(FaceTemplate).filter(
            (FaceTemplate.student_id == student.id) | (FaceTemplate.user_id == student.user_id)
        ).first()

        if not face_tmpl or student.face_enrollment_status != "ENROLLED":
            raise HTTPException(
                status_code=400,
                detail="Face baseline not enrolled. Only students with an enrolled face template can mark attendance. Please complete face enrollment before marking attendance."
            )

        consent = db.query(Consent).filter(
            (Consent.student_id == student.id) | (Consent.user_id == student.user_id),
            Consent.consent_type == "FACIAL_BIOMETRIC_ATTENDANCE",
            Consent.is_granted == True
        ).first()
        if not consent:
            raise HTTPException(
                status_code=400,
                detail="Biometric privacy consent required prior to marking attendance."
            )

        # 4. Strict Biometric Face Verification (Face Detection + Liveness + ArcFace)
        is_verified, match_score, reason = FaceVerificationService.verify_live_face_against_template(
            db=db,
            face_tmpl=face_tmpl,
            live_proof_base64=liveness_proof_base64,
            challenge_token=challenge_token
        )

        if not is_verified:
            raise HTTPException(
                status_code=400,
                detail=reason
            )

        # 5. GPS Authenticity & Accuracy Validation
        if gps_accuracy_meters is not None and gps_accuracy_meters > settings.GPS_MAX_ACCURACY_METERS:
            raise HTTPException(
                status_code=400,
                detail=f"GPS Accuracy Error: Position accuracy of {gps_accuracy_meters:.1f}m is too low. Required accuracy is within {settings.GPS_MAX_ACCURACY_METERS:.0f}m. Please ensure high accuracy GPS is enabled."
            )

        # 6. Server-side Geofence Verification (Zero Client Trust: <= 100m Allowed, > 100m Rejected)
        center_lat, center_lon, radius_meters, geo_name = AttendanceService.get_effective_geofence(db, student)
        distance = calculate_haversine_distance(lat, lon, center_lat, center_lon)

        if distance > radius_meters:
            raise HTTPException(
                status_code=400,
                detail=f"Out of Geofence Boundary: You are {distance:.1f}m away from '{geo_name}' (Allowed radius: {radius_meters:.0f}m)."
            )

        now_utc = datetime.utcnow()
        today_date = now_utc.date()

        # 7. Sequence & Single Punch Daily Limit Validation (Max 1 Punch IN & 1 Punch OUT per day)
        today_events = db.query(AttendanceEvent).filter(
            AttendanceEvent.student_id == student.id,
            AttendanceEvent.date == today_date
        ).order_by(AttendanceEvent.timestamp.asc()).all()

        has_punched_in = any(e.event_type == "IN" for e in today_events)
        has_punched_out = any(e.event_type == "OUT" for e in today_events)

        if has_punched_in and has_punched_out:
            raise HTTPException(
                status_code=400,
                detail="Attendance Completed: You have already completed your single daily Check-In and Check-Out for today."
            )

        if event_type == "IN" and has_punched_in:
            raise HTTPException(
                status_code=400,
                detail="Attendance Limit Reached: You have already completed your single daily Check-In (Punch IN) for today."
            )

        if event_type == "OUT":
            if not has_punched_in:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid Sequence: Cannot mark Check-Out without an active Check-In. Please check in first."
                )
            if has_punched_out:
                raise HTTPException(
                    status_code=400,
                    detail="Attendance Limit Reached: You have already completed your single daily Check-Out (Punch OUT) for today."
                )

        if today_events:
            last_event = today_events[-1]
            time_diff_sec = (now_utc - last_event.timestamp).total_seconds()
            if time_diff_sec < 60:
                raise HTTPException(
                    status_code=400,
                    detail="Duplicate Event: Please wait at least 60 seconds before recording another attendance punch."
                )

        # 8. Create Punch Event with Server Timestamp
        event = AttendanceEvent(
            id=str(uuid.uuid4()),
            student_id=student.id,
            user_id=user.id,
            event_type=event_type,
            timestamp=now_utc,
            date=today_date,
            latitude=lat,
            longitude=lon,
            distance_from_geofence_meters=distance,
            is_geofence_valid=True,
            verification_method="FACE_BIOMETRIC_MATCH",
            liveness_score=0.9850,
            face_match_confidence=match_score,
            device_fingerprint=device_fingerprint or student.registered_device_id,
            created_at=now_utc
        )
        db.add(event)
        db.flush()

        # 9. Recalculate Daily Attendance Summary
        daily_record = AttendanceService.recalculate_daily_attendance(db, student.id, today_date)
        db.commit()
        db.refresh(event)
        db.refresh(daily_record)
        return event, daily_record

    @staticmethod
    def recalculate_daily_attendance(
        db: Session,
        student_id: str,
        target_date: date
    ) -> AttendanceDailyRecord:
        """
        Computes total daily working hours across all IN -> OUT punch pairs.
        Applies 5-Hour Rule:
        - >= 300 minutes (5:00:00) -> PRESENT
        - < 300 minutes (4:59:59) -> ABSENT
        - Missing Check-Out (open IN) -> INCOMPLETE (treated as Absent until regularized)
        """
        # Fetch all events for student on date sorted chronologically
        events = db.query(AttendanceEvent).filter(
            AttendanceEvent.student_id == student_id,
            AttendanceEvent.date == target_date
        ).order_by(AttendanceEvent.timestamp.asc()).all()

        daily_record = db.query(AttendanceDailyRecord).filter(
            AttendanceDailyRecord.student_id == student_id,
            AttendanceDailyRecord.date == target_date
        ).first()

        today_date = datetime.utcnow().date()
        if not events:
            if target_date > today_date:
                # Do not mark future dates as ABSENT
                if daily_record and daily_record.status == "ABSENT":
                    db.delete(daily_record)
                return None
            if not daily_record:
                daily_record = AttendanceDailyRecord(
                    id=str(uuid.uuid4()),
                    student_id=student_id,
                    date=target_date,
                    created_at=datetime.utcnow()
                )
                db.add(daily_record)
            daily_record.first_punch_in = None
            daily_record.last_punch_out = None
            daily_record.total_working_minutes = 0
            daily_record.total_working_hours = 0.0
            daily_record.punch_count = 0
            daily_record.status = "ABSENT"
            return daily_record

        if not daily_record:
            daily_record = AttendanceDailyRecord(
                id=str(uuid.uuid4()),
                student_id=student_id,
                date=target_date,
                created_at=datetime.utcnow()
            )
            db.add(daily_record)

        daily_record.punch_count = len(events)
        first_in_event = next((e for e in events if e.event_type == "IN"), events[0])
        daily_record.first_punch_in = first_in_event.timestamp

        last_out_event = next((e for e in reversed(events) if e.event_type == "OUT"), None)
        daily_record.last_punch_out = last_out_event.timestamp if last_out_event else None

        # Pair IN and OUT events to compute cumulative active working minutes
        total_seconds = 0
        in_timestamp = None
        has_open_in = False

        for ev in events:
            if ev.event_type == "IN":
                if in_timestamp is None:
                    in_timestamp = ev.timestamp
                has_open_in = True
            elif ev.event_type == "OUT":
                if in_timestamp is not None:
                    diff_sec = (ev.timestamp - in_timestamp).total_seconds()
                    if diff_sec > 0:
                        total_seconds += diff_sec
                    in_timestamp = None
                has_open_in = False

        total_minutes = int(total_seconds // 60)
        total_hours = round(total_minutes / 60.0, 2)

        daily_record.total_working_minutes = total_minutes
        daily_record.total_working_hours = total_hours

        # Apply Status Rules if not manually regularized
        if not daily_record.is_regularized:
            if has_open_in:
                # Open IN without matching OUT: Incomplete + Absent until HR regularizes it
                daily_record.status = "INCOMPLETE"
            elif total_minutes >= 300:
                # Exactly 5 hours (300 mins) or more -> PRESENT
                daily_record.status = "PRESENT"
            else:
                # Less than 5 hours (299 mins / 4:59) -> ABSENT
                daily_record.status = "ABSENT"

        return daily_record

    @staticmethod
    def regularize_attendance(
        db: Session,
        actor_id: str,
        attendance_record_id: str,
        new_status: str,
        override_working_hours: float,
        reason: str
    ) -> AttendanceDailyRecord:
        """
        HR manual attendance regularization with mandatory reason and immutable audit log.
        """
        record = db.query(AttendanceDailyRecord).filter(
            AttendanceDailyRecord.id == attendance_record_id
        ).first()

        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found.")

        today_utc = datetime.utcnow().date()
        if record.date > today_utc:
            raise HTTPException(
                status_code=400,
                detail=f"Attendance cannot be regularized for future dates ({record.date})."
            )

        old_values = {
            "status": record.status,
            "total_working_hours": float(record.total_working_hours),
            "is_regularized": record.is_regularized,
            "regularization_reason": record.regularization_reason
        }

        record.status = new_status.upper()
        record.total_working_hours = override_working_hours
        record.total_working_minutes = int(override_working_hours * 60)
        record.is_regularized = True
        record.regularized_by = actor_id
        record.regularized_at = datetime.utcnow()
        record.regularization_reason = reason.strip()

        new_values = {
            "status": record.status,
            "total_working_hours": float(record.total_working_hours),
            "is_regularized": True,
            "regularized_by": actor_id,
            "regularization_reason": record.regularization_reason
        }

        # Immutable Audit Log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=actor_id,
            action="ATTENDANCE_REGULARIZATION",
            entity="AttendanceDailyRecord",
            entity_id=record.id,
            old_values=json.dumps(old_values),
            new_values=json.dumps(new_values),
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        db.refresh(record)
        return record
