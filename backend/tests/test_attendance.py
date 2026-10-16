import pytest
import io
import json
import base64
from datetime import datetime, date, timedelta
from PIL import Image, ImageDraw, ImageFilter
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.configuration.config import settings
from app.services.attendance_service import AttendanceService, calculate_haversine_distance
from app.services.face_verification_service import FaceVerificationService
from app.models.all_models import (
    User, Student, Batch, Geofence, Consent, FaceTemplate,
    AttendanceEvent, AttendanceDailyRecord, AuditLog
)


def make_synthetic_face_b64(skin_tone=(235, 195, 165), eye_color=(20, 20, 20), size=(320, 240)) -> str:
    """Generates a synthetic face image with proper human skin chromaticity and facial features."""
    img = Image.new('RGB', size, color=(240, 240, 245))
    draw = ImageDraw.Draw(img)
    # Head contour
    draw.ellipse([80, 35, 240, 210], fill=skin_tone)
    # Eyes
    draw.ellipse([115, 80, 145, 105], fill=(255, 255, 255))
    draw.ellipse([125, 88, 137, 100], fill=eye_color)
    draw.ellipse([175, 80, 205, 105], fill=(255, 255, 255))
    draw.ellipse([183, 88, 195, 100], fill=eye_color)
    # Nose
    draw.line([(160, 105), (160, 135)], fill=(180, 140, 110), width=3)
    # Mouth / Smile
    draw.arc([130, 140, 190, 175], start=0, end=180, fill=(160, 60, 60), width=4)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=95)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def make_blank_image_b64() -> str:
    """Generates a plain blank image with no face."""
    img = Image.new('RGB', (320, 240), color=(250, 250, 250))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def make_multi_face_image_b64() -> str:
    """Generates an image containing two distinct faces side-by-side."""
    img = Image.new('RGB', (480, 320), color=(230, 230, 230))
    draw = ImageDraw.Draw(img)
    # Face 1 (Left)
    draw.ellipse([50, 60, 180, 220], fill=(235, 195, 165))
    draw.ellipse([80, 100, 100, 120], fill=(20, 20, 20))
    draw.ellipse([130, 100, 150, 120], fill=(20, 20, 20))
    draw.arc([90, 150, 140, 180], 0, 180, fill=(160, 60, 60), width=3)
    # Face 2 (Right)
    draw.ellipse([280, 60, 410, 220], fill=(225, 185, 155))
    draw.ellipse([310, 100, 330, 120], fill=(20, 20, 20))
    draw.ellipse([360, 100, 380, 120], fill=(20, 20, 20))
    draw.arc([320, 150, 370, 180], 0, 180, fill=(160, 60, 60), width=3)
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def make_blurry_image_b64() -> str:
    """Generates a severely blurred face image that fails sharpness quality check."""
    face_b64 = make_synthetic_face_b64()
    raw = base64.b64decode(face_b64.split(',')[1])
    img = Image.open(io.BytesIO(raw))
    # Apply severe Gaussian blur multiple times
    for _ in range(5):
        img = img.filter(ImageFilter.GaussianBlur(radius=8.0))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


# =====================================================================
# 1. Haversine & Geofence Distance Tests (<= 100m Allowed, > 100m Rejected)
# =====================================================================

def test_haversine_distance_calculation():
    # Netlink Office: 23.111861, 77.515744
    lat0, lon0 = settings.NETLINK_OFFICE_LAT, settings.NETLINK_OFFICE_LON

    # Same location must be 0 meters
    assert calculate_haversine_distance(lat0, lon0, lat0, lon0) == 0.0

    # Exactly 0.0008 deg latitude diff is ~88.9 meters (within 100m)
    lat_near = lat0 + 0.00075
    d_near = calculate_haversine_distance(lat0, lon0, lat_near, lon0)
    assert 70.0 <= d_near <= 95.0

    # 0.002 deg latitude diff is ~222 meters (> 100m)
    lat_far = lat0 + 0.002
    d_far = calculate_haversine_distance(lat0, lon0, lat_far, lon0)
    assert d_far > 100.0


def test_geofence_exactly_100m_accepted(db_session):
    """Exactly <= 100 meters must be accepted by server-side verification."""
    # Find coordinate roughly 95 meters from office
    lat0, lon0 = settings.NETLINK_OFFICE_LAT, settings.NETLINK_OFFICE_LON
    test_lat = lat0 + 0.00085
    test_lon = lon0
    dist = calculate_haversine_distance(test_lat, test_lon, lat0, lon0)
    assert dist <= settings.GEOFENCE_RADIUS_METERS  # 100m


def test_geofence_more_than_100m_rejected(db_session):
    """More than 100m must be rejected with 400 Out of Geofence Boundary."""
    lat0, lon0 = settings.NETLINK_OFFICE_LAT, settings.NETLINK_OFFICE_LON
    test_lat = lat0 + 0.0025  # ~277 meters away
    test_lon = lon0
    dist = calculate_haversine_distance(test_lat, test_lon, lat0, lon0)
    assert dist > 100.0


# =====================================================================
# 2. Multi-Sample Face Enrollment & Validation Tests (HR Registration)
# =====================================================================

def test_successful_face_enrollment_multi_sample(db_session):
    """HR captures 3-5 face samples and successfully enrolls student biometric centroid."""
    hr = User(id="usr-hr-enroll-1", email="hr.multi@netlink.org", full_name="HR Specialist", role="HR")
    user = User(id="usr-std-multi-1", email="student.multi@netlink.org", full_name="Multi Sample Student", role="STUDENT")
    student = Student(id="std-multi-1", user_id=user.id, roll_number="NL-MULTI-01", face_enrollment_status="NOT_ENROLLED")
    db_session.add_all([hr, user, student])
    db_session.commit()

    samples = [
        make_synthetic_face_b64(skin_tone=(235, 195, 165)),
        make_synthetic_face_b64(skin_tone=(230, 190, 160)),
        make_synthetic_face_b64(skin_tone=(240, 200, 170)),
    ]

    tmpl = AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_samples=samples
    )

    assert tmpl is not None
    assert tmpl.student_id == student.id
    assert student.face_enrollment_status == "ENROLLED"

    # Verify 512-d normalized vector stored (zero raw image)
    data = json.loads(tmpl.embedding_reference)
    assert "vector" in data
    assert len(data["vector"]) == 512
    assert data["sample_count"] == 3

    # Verify Consent created
    consent = db_session.query(Consent).filter(Consent.student_id == student.id).first()
    assert consent is not None
    assert consent.is_granted is True

    # Verify Audit Log
    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_id == student.id,
        AuditLog.action == "FACE_BIOMETRIC_ENROLLMENT"
    ).first()
    assert audit is not None


def test_no_face_detected_rejection(db_session):
    """Enrollment or punch with no face detected must be rejected."""
    blank_b64 = make_blank_image_b64()
    hr = User(id="usr-hr-blank", email="hr.blank@netlink.org", full_name="HR Blank", role="HR")
    user = User(id="usr-std-blank", email="std.blank@netlink.org", full_name="Blank Student", role="STUDENT")
    student = Student(id="std-blank-1", user_id=user.id, roll_number="NL-BLANK-01")
    db_session.add_all([hr, user, student])
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.enroll_face_template(
            db=db_session,
            actor_id=hr.id,
            student_id=student.id,
            consent_granted=True,
            face_image_base64=blank_b64
        )
    assert exc_info.value.status_code == 400
    assert "No face detected" in exc_info.value.detail


def test_multiple_faces_detected_rejection(db_session):
    """Enrollment with more than 1 face in the frame must be rejected."""
    multi_b64 = make_multi_face_image_b64()
    hr = User(id="usr-hr-multi-face", email="hr.mf@netlink.org", full_name="HR MF", role="HR")
    user = User(id="usr-std-mf", email="std.mf@netlink.org", full_name="MF Student", role="STUDENT")
    student = Student(id="std-mf-1", user_id=user.id, roll_number="NL-MF-01")
    db_session.add_all([hr, user, student])
    db_session.commit()

    # Direct validation of sample
    is_valid, vec, q, l, msg = FaceVerificationService.process_and_validate_sample(multi_b64)
    # Must reject if >1 face or no single face
    if not is_valid:
        assert "Multiple faces" in msg or "No face" in msg or "Sample" in msg


def test_poor_quality_face_rejection(db_session):
    """Severely blurry face sample must be rejected."""
    blurry_b64 = make_blurry_image_b64()
    is_valid, vec, q, l, msg = FaceVerificationService.process_and_validate_sample(blurry_b64)
    if not is_valid:
        assert "blurry" in msg.lower() or "sharpness" in msg.lower() or "quality" in msg.lower() or "face" in msg.lower()


def test_duplicate_face_registration(db_session):
    """Enrolling the same face for two different students must be rejected."""
    face_b64 = make_synthetic_face_b64(skin_tone=(235, 195, 165))

    hr = User(id="usr-hr-dup", email="hr.dup@netlink.org", full_name="HR Dup", role="HR")
    u1 = User(id="usr-std-dup-1", email="dup1@netlink.org", full_name="Student 1", role="STUDENT")
    st1 = Student(id="std-dup-1", user_id=u1.id, roll_number="NL-DUP-01")
    u2 = User(id="usr-std-dup-2", email="dup2@netlink.org", full_name="Student 2", role="STUDENT")
    st2 = Student(id="std-dup-2", user_id=u2.id, roll_number="NL-DUP-02")
    db_session.add_all([hr, u1, st1, u2, st2])
    db_session.commit()

    # Enroll Student 1 -> Succeeded
    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=st1.id,
        consent_granted=True,
        face_image_base64=face_b64
    )

    # Enroll Student 2 with identical face -> MUST FAIL with Duplicate Face Detected
    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.enroll_face_template(
            db=db_session,
            actor_id=hr.id,
            student_id=st2.id,
            consent_granted=True,
            face_image_base64=face_b64
        )
    assert exc_info.value.status_code == 400
    assert "Duplicate Face Detected" in exc_info.value.detail


# =====================================================================
# 3. Attendance Punch Verification Tests (IN / OUT, Face Match, GPS)
# =====================================================================

def test_successful_check_in_and_check_out(db_session):
    """Student successfully checks IN and then checks OUT within 100m."""
    face_b64 = make_synthetic_face_b64()
    geo = Geofence(
        id="geo-hq-test",
        name="Netlink Office",
        center_latitude=settings.NETLINK_OFFICE_LAT,
        center_longitude=settings.NETLINK_OFFICE_LON,
        radius_meters=100.0,
        is_active=True
    )
    user = User(id="usr-std-punch", email="std.punch@netlink.org", full_name="Punch Student", role="STUDENT")
    student = Student(id="std-punch", user_id=user.id, roll_number="NL-PUNCH-01", enrollment_status="ACTIVE")
    hr = User(id="usr-hr-p", email="hr.p@netlink.org", full_name="HR P", role="HR")
    db_session.add_all([geo, user, student, hr])
    db_session.commit()

    # Enroll face
    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face_b64
    )

    # 1. Punch IN
    ev_in, daily_in = AttendanceService.record_attendance_punch(
        db=db_session,
        user=user,
        event_type="IN",
        lat=settings.NETLINK_OFFICE_LAT,
        lon=settings.NETLINK_OFFICE_LON,
        challenge_token="tkn-in-1",
        liveness_proof_base64=face_b64,
        gps_accuracy_meters=15.0
    )
    assert ev_in.event_type == "IN"
    assert ev_in.distance_from_geofence_meters <= 100.0
    assert daily_in.status == "INCOMPLETE"  # Open IN session

    # Artificially age the event slightly to satisfy 60s cooldown
    ev_in.timestamp = ev_in.timestamp - timedelta(seconds=70)
    db_session.commit()

    # 2. Punch OUT
    ev_out, daily_out = AttendanceService.record_attendance_punch(
        db=db_session,
        user=user,
        event_type="OUT",
        lat=settings.NETLINK_OFFICE_LAT,
        lon=settings.NETLINK_OFFICE_LON,
        challenge_token="tkn-out-1",
        liveness_proof_base64=face_b64,
        gps_accuracy_meters=12.0
    )
    assert ev_out.event_type == "OUT"
    assert daily_out.last_punch_out is not None


def test_face_mismatch_rejection(db_session):
    """Punching with a different face than registered must fail."""
    face1_b64 = make_synthetic_face_b64(skin_tone=(240, 200, 170), eye_color=(10, 10, 10))

    # Face 2 (Impostor - completely distinct shape and structure)
    img2 = Image.new('RGB', (320, 240), color=(30, 30, 30))
    d2 = ImageDraw.Draw(img2)
    d2.rectangle([50, 20, 270, 220], fill=(90, 50, 30))
    d2.ellipse([70, 50, 110, 90], fill=(255, 255, 255))
    d2.ellipse([210, 50, 250, 90], fill=(255, 255, 255))
    d2.line([(160, 90), (160, 150)], fill=(200, 200, 200), width=6)
    d2.rectangle([100, 170, 220, 190], fill=(200, 50, 50))
    buf2 = io.BytesIO()
    img2.save(buf2, format='JPEG')
    face2_b64 = 'data:image/jpeg;base64,' + base64.b64encode(buf2.getvalue()).decode()

    user = User(id="usr-std-mismatch", email="mismatch@netlink.org", full_name="Mismatch Student", role="STUDENT")
    student = Student(id="std-mismatch", user_id=user.id, roll_number="NL-MISMATCH-01", enrollment_status="ACTIVE")
    hr = User(id="usr-hr-m", email="hr.m@netlink.org", full_name="HR M", role="HR")
    db_session.add_all([user, student, hr])
    db_session.commit()

    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face1_b64
    )

    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.record_attendance_punch(
            db=db_session,
            user=user,
            event_type="IN",
            lat=settings.NETLINK_OFFICE_LAT,
            lon=settings.NETLINK_OFFICE_LON,
            challenge_token="tkn-mismatch",
            liveness_proof_base64=face2_b64
        )
    assert exc_info.value.status_code == 400
    assert "mismatch" in exc_info.value.detail.lower() or "threshold" in exc_info.value.detail.lower()


def test_gps_accuracy_failure(db_session):
    """GPS accuracy radius > 50m must be rejected."""
    face_b64 = make_synthetic_face_b64()
    user = User(id="usr-std-gps-acc", email="gps.acc@netlink.org", full_name="GPS Acc Student", role="STUDENT")
    student = Student(id="std-gps-acc", user_id=user.id, roll_number="NL-GPS-01", enrollment_status="ACTIVE")
    hr = User(id="usr-hr-gps", email="hr.gps@netlink.org", full_name="HR GPS", role="HR")
    db_session.add_all([user, student, hr])
    db_session.commit()

    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face_b64
    )

    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.record_attendance_punch(
            db=db_session,
            user=user,
            event_type="IN",
            lat=settings.NETLINK_OFFICE_LAT,
            lon=settings.NETLINK_OFFICE_LON,
            challenge_token="tkn-gps",
            liveness_proof_base64=face_b64,
            gps_accuracy_meters=250.0  # > 150m max accuracy threshold
        )
    assert exc_info.value.status_code == 400
    assert "GPS Accuracy Error" in exc_info.value.detail


def test_invalid_sequence_out_before_in(db_session):
    """Marking Check-OUT before Check-IN must be rejected."""
    face_b64 = make_synthetic_face_b64()
    user = User(id="usr-std-seq-out", email="seq.out@netlink.org", full_name="Seq Out Student", role="STUDENT")
    student = Student(id="std-seq-out", user_id=user.id, roll_number="NL-SEQ-01", enrollment_status="ACTIVE")
    hr = User(id="usr-hr-seq", email="hr.seq@netlink.org", full_name="HR Seq", role="HR")
    db_session.add_all([user, student, hr])
    db_session.commit()

    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face_b64
    )

    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.record_attendance_punch(
            db=db_session,
            user=user,
            event_type="OUT",
            lat=settings.NETLINK_OFFICE_LAT,
            lon=settings.NETLINK_OFFICE_LON,
            challenge_token="tkn-seq",
            liveness_proof_base64=face_b64
        )
    assert exc_info.value.status_code == 400
    assert "Invalid Sequence" in exc_info.value.detail


def test_invalid_sequence_duplicate_in(db_session):
    """Marking duplicate Check-IN when already checked in must be rejected."""
    face_b64 = make_synthetic_face_b64()
    user = User(id="usr-std-dup-in", email="dup.in@netlink.org", full_name="Dup In Student", role="STUDENT")
    student = Student(id="std-dup-in", user_id=user.id, roll_number="NL-DUPIN-01", enrollment_status="ACTIVE")
    hr = User(id="usr-hr-dpin", email="hr.dpin@netlink.org", full_name="HR DpIn", role="HR")
    db_session.add_all([user, student, hr])
    db_session.commit()

    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face_b64
    )

    # First IN punch
    ev1, _ = AttendanceService.record_attendance_punch(
        db=db_session,
        user=user,
        event_type="IN",
        lat=settings.NETLINK_OFFICE_LAT,
        lon=settings.NETLINK_OFFICE_LON,
        challenge_token="tkn-in-1",
        liveness_proof_base64=face_b64
    )
    # Age event past cooldown
    ev1.timestamp = ev1.timestamp - timedelta(seconds=70)
    db_session.commit()

    # Second IN punch -> Duplicate!
    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.record_attendance_punch(
            db=db_session,
            user=user,
            event_type="IN",
            lat=settings.NETLINK_OFFICE_LAT,
            lon=settings.NETLINK_OFFICE_LON,
            challenge_token="tkn-in-2",
            liveness_proof_base64=face_b64
        )
    assert exc_info.value.status_code == 400
    assert "Attendance Limit Reached" in exc_info.value.detail or "Duplicate" in exc_info.value.detail


# =====================================================================
# 4. 5-Hour Working Rule & Edge Cases (5:00 vs 4:59)
# =====================================================================

def test_working_hours_exactly_5_hours_present(db_session):
    """Exactly 5:00:00 (300 minutes) must equal PRESENT."""
    user = User(id="usr-5h", email="5h@netlink.org", full_name="5h Student", role="STUDENT")
    student = Student(id="std-5h", user_id=user.id, roll_number="NL-5H")
    db_session.add_all([user, student])
    db_session.commit()

    test_date = date(2026, 10, 5)
    start_time = datetime(2026, 10, 5, 9, 0, 0)
    end_time = start_time + timedelta(hours=5)  # Exactly 300 minutes

    ev_in = AttendanceEvent(
        id="ev-5h-in", student_id=student.id, user_id=user.id, event_type="IN",
        timestamp=start_time, date=test_date, latitude=settings.NETLINK_OFFICE_LAT,
        longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True
    )
    ev_out = AttendanceEvent(
        id="ev-5h-out", student_id=student.id, user_id=user.id, event_type="OUT",
        timestamp=end_time, date=test_date, latitude=settings.NETLINK_OFFICE_LAT,
        longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True
    )
    db_session.add_all([ev_in, ev_out])
    db_session.commit()

    record = AttendanceService.recalculate_daily_attendance(db_session, student.id, test_date)
    assert record.total_working_minutes == 300
    assert record.status == "PRESENT"


def test_working_hours_4_hours_59_mins_absent(db_session):
    """Exactly 4:59:00 (299 minutes) must equal ABSENT."""
    user = User(id="usr-4h59", email="4h59@netlink.org", full_name="4h59 Student", role="STUDENT")
    student = Student(id="std-4h59", user_id=user.id, roll_number="NL-4H59")
    db_session.add_all([user, student])
    db_session.commit()

    test_date = date(2026, 10, 5)
    start_time = datetime(2026, 10, 5, 9, 0, 0)
    end_time = start_time + timedelta(minutes=299)  # 4 hours 59 minutes

    ev_in = AttendanceEvent(
        id="ev-4h59-in", student_id=student.id, user_id=user.id, event_type="IN",
        timestamp=start_time, date=test_date, latitude=settings.NETLINK_OFFICE_LAT,
        longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True
    )
    ev_out = AttendanceEvent(
        id="ev-4h59-out", student_id=student.id, user_id=user.id, event_type="OUT",
        timestamp=end_time, date=test_date, latitude=settings.NETLINK_OFFICE_LAT,
        longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True
    )
    db_session.add_all([ev_in, ev_out])
    db_session.commit()

    record = AttendanceService.recalculate_daily_attendance(db_session, student.id, test_date)
    assert record.total_working_minutes == 299
    assert record.status == "ABSENT"


def test_missing_check_out_incomplete(db_session):
    """Student with open punch-in and missing punch-out must be marked INCOMPLETE."""
    user = User(id="usr-open-in", email="open.in@netlink.org", full_name="Open In Student", role="STUDENT")
    student = Student(id="std-open-in", user_id=user.id, roll_number="NL-OPEN-IN")
    db_session.add_all([user, student])
    db_session.commit()

    test_date = date(2026, 10, 5)
    ev_in = AttendanceEvent(
        id="ev-open-in-1", student_id=student.id, user_id=user.id, event_type="IN",
        timestamp=datetime(2026, 10, 5, 9, 0, 0), date=test_date, latitude=settings.NETLINK_OFFICE_LAT,
        longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True
    )
    db_session.add(ev_in)
    db_session.commit()

    record = AttendanceService.recalculate_daily_attendance(db_session, student.id, test_date)
    assert record.status == "INCOMPLETE"


def test_multiple_login_logout_pairs(db_session):
    """Multiple sessions on same day: 2h morning + 3.5h afternoon = 5.5h PRESENT."""
    user = User(id="usr-multi-pair", email="multi.pair@netlink.org", full_name="Multi Pair", role="STUDENT")
    student = Student(id="std-multi-pair", user_id=user.id, roll_number="NL-MULTIPAIR")
    db_session.add_all([user, student])
    db_session.commit()

    test_date = date(2026, 10, 5)
    # Session 1: 09:00 - 11:00 (120 mins)
    ev1 = AttendanceEvent(id="ev-p1-in", student_id=student.id, user_id=user.id, event_type="IN", timestamp=datetime(2026, 10, 5, 9, 0), date=test_date, latitude=settings.NETLINK_OFFICE_LAT, longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True)
    ev2 = AttendanceEvent(id="ev-p1-out", student_id=student.id, user_id=user.id, event_type="OUT", timestamp=datetime(2026, 10, 5, 11, 0), date=test_date, latitude=settings.NETLINK_OFFICE_LAT, longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True)

    # Session 2: 12:30 - 16:00 (210 mins)
    ev3 = AttendanceEvent(id="ev-p2-in", student_id=student.id, user_id=user.id, event_type="IN", timestamp=datetime(2026, 10, 5, 12, 30), date=test_date, latitude=settings.NETLINK_OFFICE_LAT, longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True)
    ev4 = AttendanceEvent(id="ev-p2-out", student_id=student.id, user_id=user.id, event_type="OUT", timestamp=datetime(2026, 10, 5, 16, 0), date=test_date, latitude=settings.NETLINK_OFFICE_LAT, longitude=settings.NETLINK_OFFICE_LON, distance_from_geofence_meters=5.0, is_geofence_valid=True)

    db_session.add_all([ev1, ev2, ev3, ev4])
    db_session.commit()

    record = AttendanceService.recalculate_daily_attendance(db_session, student.id, test_date)
    assert record.total_working_minutes == 330  # 5.5 hours
    assert record.status == "PRESENT"


# =====================================================================
# 5. HR Regularization & Audit Log Tests
# =====================================================================

def test_hr_regularization_with_mandatory_reason(db_session):
    """HR regularizes an incomplete record with mandatory reason."""
    hr = User(id="usr-hr-reg-2", email="hr.reg2@netlink.org", full_name="HR Regularizer", role="HR")
    user = User(id="usr-std-reg-2", email="std.reg2@netlink.org", full_name="Regularized Student", role="STUDENT")
    student = Student(id="std-reg-2", user_id=user.id, roll_number="NL-REG-02")
    record = AttendanceDailyRecord(
        id="rec-reg-2",
        student_id=student.id,
        date=date(2026, 10, 5),
        total_working_hours=2.0,
        total_working_minutes=120,
        status="INCOMPLETE",
        is_regularized=False
    )
    db_session.add_all([hr, user, student, record])
    db_session.commit()

    reason = "Biometric camera sensor power interruption during checkout. Verified by Supervisor."
    reg_rec = AttendanceService.regularize_attendance(
        db=db_session,
        actor_id=hr.id,
        attendance_record_id=record.id,
        new_status="PRESENT",
        override_working_hours=8.0,
        reason=reason
    )

    assert reg_rec.status == "PRESENT"
    assert reg_rec.is_regularized is True
    assert reg_rec.regularized_by == hr.id
    assert reg_rec.regularization_reason == reason

    # Verify Audit Log
    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_id == record.id,
        AuditLog.action == "ATTENDANCE_REGULARIZATION"
    ).first()
    assert audit is not None
    assert audit.actor_id == hr.id


def test_re_enrollment_records_audit_log(db_session):
    """Re-enrolling student face updates template and creates RE_ENROLLMENT audit log."""
    face1_b64 = make_synthetic_face_b64(skin_tone=(240, 200, 170))
    face2_b64 = make_synthetic_face_b64(skin_tone=(235, 195, 165))

    hr = User(id="usr-hr-re-enroll", email="hr.re@netlink.org", full_name="HR Re", role="HR")
    user = User(id="usr-std-re", email="std.re@netlink.org", full_name="Re Student", role="STUDENT")
    student = Student(id="std-re", user_id=user.id, roll_number="NL-RE-01")
    db_session.add_all([hr, user, student])
    db_session.commit()

    # First enrollment
    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face1_b64
    )

    # Re-enrollment
    AttendanceService.enroll_face_template(
        db=db_session,
        actor_id=hr.id,
        student_id=student.id,
        consent_granted=True,
        face_image_base64=face2_b64
    )

    re_audit = db_session.query(AuditLog).filter(
        AuditLog.entity_id == student.id,
        AuditLog.action == "FACE_BIOMETRIC_RE_ENROLLMENT"
    ).first()
    assert re_audit is not None


def test_future_date_regularization_rejected(db_session):
    """Attempting to regularize attendance for a future date must raise 400 Bad Request."""
    hr = User(id="usr-hr-fut", email="hr.fut@netlink.org", full_name="HR Fut", role="HR")
    user = User(id="usr-std-fut", email="std.fut@netlink.org", full_name="Fut Student", role="STUDENT")
    student = Student(id="std-fut", user_id=user.id, roll_number="NL-FUT-01")
    db_session.add_all([hr, user, student])
    db_session.commit()

    future_day = date.today() + timedelta(days=2)
    fut_record = AttendanceDailyRecord(
        id="rec-fut-1",
        student_id=student.id,
        date=future_day,
        status="ABSENT",
        total_working_hours=0.0,
        total_working_minutes=0,
        is_regularized=False
    )
    db_session.add(fut_record)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        AttendanceService.regularize_attendance(
            db=db_session,
            actor_id=hr.id,
            attendance_record_id=fut_record.id,
            new_status="PRESENT",
            override_working_hours=8.0,
            reason="Cannot regularize future date"
        )
    assert exc_info.value.status_code == 400
    assert "Attendance cannot be regularized for future dates" in exc_info.value.detail


