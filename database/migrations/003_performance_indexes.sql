-- ========================================================================
-- NETLINK LIFECYCLE MANAGEMENT PLATFORM - SUPABASE / POSTGRESQL OPTIMIZATION
-- Migration: 003_performance_indexes.sql
-- Description: Creates high-performance indexes on foreign keys, filters, 
--              and sorting columns heavily used in attendance, dashboards, 
--              and student rosters.
-- Note: Designed to run smoothly inside the Supabase SQL Editor transaction block.
-- ========================================================================

-- 1. Students Indexes (Foreign keys & roster search filters)
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_status ON students(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_students_face_status ON students(face_enrollment_status);

-- 2. Users Indexes (Authentication & role lookups)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 3. Attendance Daily Records Indexes (Daily summaries & aggregations)
CREATE INDEX IF NOT EXISTS idx_attendance_daily_student_id ON attendance_daily_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_date ON attendance_daily_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_status ON attendance_daily_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_daily_student_date ON attendance_daily_records(student_id, date);

-- 4. Attendance Events Indexes (Punch in/out audits, geofence & security checks)
CREATE INDEX IF NOT EXISTS idx_attendance_events_student_id ON attendance_events(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_user_id ON attendance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_timestamp ON attendance_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_events_fingerprint ON attendance_events(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_attendance_events_geofence_valid ON attendance_events(is_geofence_valid);

-- 5. Devices Indexes (Device registration & binding checks)
CREATE INDEX IF NOT EXISTS idx_devices_student_id ON devices(student_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- 6. Batches & Programs Indexes (Cohort lookups)
CREATE INDEX IF NOT EXISTS idx_batches_program_id ON batches(program_id);
CREATE INDEX IF NOT EXISTS idx_batches_mentor_id ON batches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_programs_is_active ON programs(is_active);

-- 7. Face Templates Indexes (1:1 biometric matching)
CREATE INDEX IF NOT EXISTS idx_face_templates_student_id ON face_templates(student_id);
CREATE INDEX IF NOT EXISTS idx_face_templates_user_id ON face_templates(user_id);

-- 8. Regularization Requests Indexes (Attendance approvals)
CREATE INDEX IF NOT EXISTS idx_regularization_student_id ON regularization_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_regularization_status ON regularization_requests(status);
CREATE INDEX IF NOT EXISTS idx_regularization_date ON regularization_requests(date);

-- 9. Audit Logs Indexes (Security compliance & immutable trail)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity, entity_id);

-- 10. Geofences & Consents
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);
CREATE INDEX IF NOT EXISTS idx_consents_student_type ON consents(student_id, consent_type);
