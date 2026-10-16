-- Seed Data Migration: 001_seed_dev_data.sql
-- Description: Seeds initial development users, program, batch, geofence, students, devices, consent, and face templates using safe fake mock data.

-- 1. SEED GEOFENCE
INSERT INTO geofences (id, name, center_latitude, center_longitude, radius_meters, address, is_active)
VALUES (
    'geo-hq-001',
    'Netlink Main Campus HQ',
    12.97159870,
    77.59456270,
    100.00,
    'Tech Park Campus, Innovation Way, Building 4',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. SEED USERS
-- Super Admin
INSERT INTO users (id, email, full_name, role, phone, is_active)
VALUES ('usr-admin-001', 'admin@netlink.local', 'Abhishek Verma', 'SUPER_ADMIN', '+15550000001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- HR / Program Manager
INSERT INTO users (id, email, full_name, role, phone, is_active)
VALUES ('usr-hr-001', 'hr@netlink.local', 'Prerna Verma', 'HR', '+15550000002', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Mentor
INSERT INTO users (id, email, full_name, role, phone, is_active)
VALUES ('usr-mentor-001', 'mentor@netlink.local', 'Alex Rivera (Lead Mentor)', 'MENTOR', '+15550000003', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Student 1
INSERT INTO users (id, email, full_name, role, phone, is_active)
VALUES ('usr-student-001', 'student1@netlink.local', 'John Doe', 'STUDENT', '+15550000004', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Student 2
INSERT INTO users (id, email, full_name, role, phone, is_active)
VALUES ('usr-student-002', 'student2@netlink.local', 'Jane Smith', 'STUDENT', '+15550000005', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED PROGRAM
INSERT INTO programs (id, title, code, description, duration_weeks, is_active, created_by)
VALUES (
    'prog-fse-001',
    'Full Stack Engineering Traineeship',
    'FSE-2026',
    'Comprehensive 12-week trainee program covering React, TypeScript, Python FastAPI, and PostgreSQL.',
    12,
    TRUE,
    'usr-hr-001'
) ON CONFLICT (id) DO NOTHING;

-- 4. SEED BATCH
INSERT INTO batches (id, program_id, name, start_date, end_date, geofence_id, mentor_id, status)
VALUES (
    'batch-2026-a',
    'prog-fse-001',
    'Batch 2026-A',
    '2026-01-15',
    '2026-04-15',
    'geo-hq-001',
    'usr-mentor-001',
    'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- 5. SEED STUDENTS
INSERT INTO students (id, user_id, program_id, batch_id, mentor_id, roll_number, college_name, qualification, start_date, end_date, enrollment_status, registered_device_id, face_enrollment_status)
VALUES (
    'std-001',
    'usr-student-001',
    'prog-fse-001',
    'batch-2026-a',
    'usr-mentor-001',
    'NL-2026-001',
    'Institute of Technology',
    'B.Tech Computer Science',
    '2026-01-15',
    '2026-04-15',
    'ACTIVE',
    'dev-std-001',
    'ENROLLED'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, user_id, program_id, batch_id, mentor_id, roll_number, college_name, qualification, start_date, end_date, enrollment_status, registered_device_id, face_enrollment_status)
VALUES (
    'std-002',
    'usr-student-002',
    'prog-fse-001',
    'batch-2026-a',
    'usr-mentor-001',
    'NL-2026-002',
    'State University of Engineering',
    'B.E. Information Technology',
    '2026-01-15',
    '2026-04-15',
    'ACTIVE',
    'dev-std-002',
    'NOT_ENROLLED'
) ON CONFLICT (id) DO NOTHING;

-- 6. SEED DEVICES
INSERT INTO devices (id, user_id, student_id, device_fingerprint, device_model, os_version, status, approved_by, approved_at)
VALUES (
    'dev-std-001',
    'usr-student-001',
    'std-001',
    'fp-macbook-pro-m2-john-doe',
    'MacBook Pro 14 (2023)',
    'macOS 14.4',
    'APPROVED',
    'usr-hr-001',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, user_id, student_id, device_fingerprint, device_model, os_version, status, approved_by, approved_at)
VALUES (
    'dev-std-002',
    'usr-student-002',
    'std-002',
    'fp-dell-xps15-jane-smith',
    'Dell XPS 15 9530',
    'Windows 11 23H2',
    'PENDING',
    NULL,
    NULL
) ON CONFLICT (id) DO NOTHING;

-- 7. SEED CONSENT
INSERT INTO consents (id, user_id, student_id, consent_type, consent_version, is_granted, ip_address, granted_at)
VALUES (
    'cns-std-001',
    'usr-student-001',
    'std-001',
    'FACIAL_BIOMETRIC_ATTENDANCE',
    'v1.0',
    TRUE,
    '192.168.1.50',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- 8. SEED FACE TEMPLATE
INSERT INTO face_templates (id, user_id, student_id, embedding_reference, confidence_score, quality_score, enrolled_by, consent_id)
VALUES (
    'fct-std-001',
    'usr-student-001',
    'std-001',
    'enc_vector_ref_mock_512d_hash_john_doe_99812',
    0.9850,
    0.9600,
    'usr-hr-001',
    'cns-std-001'
) ON CONFLICT (id) DO NOTHING;

-- 9. SEED AUDIT LOG
INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, old_values, new_values, ip_address)
VALUES (
    'aud-001',
    'usr-admin-001',
    'INITIAL_SYSTEM_SEED',
    'SYSTEM',
    'sys-001',
    NULL,
    '{"status": "Initialized seed development environment"}',
    '127.0.0.1'
) ON CONFLICT (id) DO NOTHING;
