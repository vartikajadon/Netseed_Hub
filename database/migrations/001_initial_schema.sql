-- Migration 001: Initial Schema for Netlink Trainee Lifecycle Management Platform
-- Description: Creates foundational tables for Users, Programs, Batches, Geofences, Students, Devices, Consents, Face Templates, and Audit Logs.

-- Enable UUID extension if available (PostgreSQL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'MENTOR', 'HR', 'SUPER_ADMIN')),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. GEOFENCES TABLE
CREATE TABLE IF NOT EXISTS geofences (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_meters DECIMAL(6, 2) NOT NULL DEFAULT 100.00,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    duration_weeks INTEGER NOT NULL DEFAULT 12,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_programs_code ON programs(code);

-- 4. BATCHES TABLE
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(36) PRIMARY KEY,
    program_id VARCHAR(36) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    batch_type VARCHAR(50) NOT NULL DEFAULT 'TECH_MASTER' CHECK (batch_type IN ('TECH_MASTER', 'SIX_MONTHS')),
    training_duration_months INTEGER NOT NULL DEFAULT 6,
    internship_duration_months INTEGER NOT NULL DEFAULT 6,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    geofence_id VARCHAR(36) REFERENCES geofences(id) ON DELETE SET NULL,
    mentor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_program ON batches(program_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- 5. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    program_id VARCHAR(36) REFERENCES programs(id) ON DELETE SET NULL,
    batch_id VARCHAR(36) REFERENCES batches(id) ON DELETE SET NULL,
    mentor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    college_name VARCHAR(255),
    qualification VARCHAR(100),
    contact_number VARCHAR(20),
    age INTEGER,
    guardian_name VARCHAR(255),
    marital_status VARCHAR(50) DEFAULT 'Single',
    address TEXT,
    batch_type VARCHAR(50) DEFAULT 'TECH_MASTER',
    total_fees DECIMAL(10, 2),
    payment_mode VARCHAR(50) DEFAULT 'ONLINE',
    installment_type VARCHAR(50) DEFAULT 'ONE_TIME',
    start_date DATE,
    end_date DATE,
    enrollment_status VARCHAR(50) NOT NULL DEFAULT 'ENROLLED' CHECK (enrollment_status IN ('ENROLLED', 'ACTIVE', 'ON_LEAVE', 'GRADUATED', 'TERMINATED')),
    registered_device_id VARCHAR(36),
    face_enrollment_status VARCHAR(50) NOT NULL DEFAULT 'NOT_ENROLLED' CHECK (face_enrollment_status IN ('NOT_ENROLLED', 'PENDING', 'ENROLLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);

-- 6. DEVICES TABLE
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
    approved_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_device UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);

-- 7. CONSENTS TABLE
CREATE TABLE IF NOT EXISTS consents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL DEFAULT 'FACIAL_BIOMETRIC_ATTENDANCE',
    consent_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

-- 8. FACE TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS face_templates (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(36) REFERENCES students(id) ON DELETE CASCADE,
    embedding_reference TEXT NOT NULL,
    confidence_score DECIMAL(5, 4) NOT NULL DEFAULT 0.9500,
    quality_score DECIMAL(5, 4) NOT NULL DEFAULT 0.9500,
    enrolled_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consent_id VARCHAR(36) REFERENCES consents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_face_templates_user ON face_templates(user_id);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(36),
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
