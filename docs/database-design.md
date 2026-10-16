# Database Schema Design — Netlink Intern/Trainee Platform

This document outlines the complete relational database design for the Netlink Platform. The design is structured for PostgreSQL on Supabase, enforcing foreign key integrity, indexes, unique constraints, and status enums.

---

## 1. Entity Relationship Summary

```
                      +-------------------+
                      |       users       |
                      +---------+---------+
                                |
       +------------------------+------------------------+
       | 1:1                    | 1:N                    | 1:N
       v                        v                        v
+--------------+        +---------------+        +---------------+
|   students   |        |    devices    |        |   consents    |
+------+-------+        +---------------+        +---------------+
       |
       | 1:N
       +------------------------+------------------------+
       |                        |                        |
       v                        v                        v
+--------------+        +---------------+        +---------------+
|face_templates|        |attendance_days|        |  task_subm.   |
+--------------+        +-------+-------+        +---------------+
                                | 1:N
                                v
                        +---------------+
                        |attend._events |
                        +---------------+
```

---

## 2. MVP Database Entities (Phase 1)

### 2.1 `users`
Stores identity metadata synced with Supabase Auth (`auth.users`).
- **Primary Key**: `id` (UUID, references `auth.users.id`)
- **Columns**:
  - `id`: UUID PRIMARY KEY
  - `email`: VARCHAR(255) UNIQUE NOT NULL
  - `full_name`: VARCHAR(255) NOT NULL
  - `role`: VARCHAR(50) NOT NULL CHECK (role IN ('STUDENT', 'MENTOR', 'HR', 'SUPER_ADMIN'))
  - `phone`: VARCHAR(20)
  - `avatar_url`: TEXT
  - `is_active`: BOOLEAN DEFAULT true
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_users_email`, `idx_users_role`

---

### 2.2 `programs`
Represents an internship or training program (e.g. "Full Stack Software Engineering 2026").
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `title` / `name`: VARCHAR(255) NOT NULL
  - `code`: VARCHAR(50) UNIQUE NOT NULL
  - `description`: TEXT
  - `duration_weeks`: INTEGER DEFAULT 12
  - `status`: VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED'))
  - `is_active`: BOOLEAN DEFAULT true
  - `created_by`: UUID REFERENCES `users(id)`
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_programs_code`, `idx_programs_status`

---

### 2.3 `batches`
Represents a specific cohort within a program.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `program_id`: UUID NOT NULL REFERENCES `programs(id)` ON DELETE CASCADE
  - `name`: VARCHAR(100) NOT NULL
  - `start_date`: DATE NOT NULL
  - `end_date`: DATE NOT NULL
  - `geofence_id`: UUID REFERENCES `geofences(id)`
  - `mentor_id`: UUID REFERENCES `users(id)`
  - `status`: VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED', 'INACTIVE', 'ARCHIVED'))
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()
- **Foreign Keys**: `program_id`, `geofence_id`, `mentor_id`
- **Validation Constraints**: `batch.program_id` must match selected program; `start_date < end_date`.
- **Indexes**: `idx_batches_program`, `idx_batches_status`

---

### 2.4 `geofences`
Stores latitude/longitude center points and allowed radii for physical venues.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `name`: VARCHAR(150) NOT NULL
  - `center_latitude`: NUMERIC(10, 8) NOT NULL
  - `center_longitude`: NUMERIC(11, 8) NOT NULL
  - `radius_meters`: NUMERIC(6, 2) DEFAULT 100.00 NOT NULL
  - `address`: TEXT
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_geofence_coords`

---

### 2.5 `students`
Extended profile for users with role `STUDENT`.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id`: UUID UNIQUE NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `batch_id`: UUID REFERENCES `batches(id)`
  - `roll_number`: VARCHAR(50) UNIQUE NOT NULL
  - `college_name`: VARCHAR(255)
  - `qualification`: VARCHAR(100)
  - `enrollment_status`: VARCHAR(50) DEFAULT 'ACTIVE' CHECK (enrollment_status IN ('ENROLLED', 'ACTIVE', 'COMPLETED', 'DROPPED', 'ON_LEAVE', 'GRADUATED', 'TERMINATED'))
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()
- **Foreign Keys**: `user_id`, `batch_id`
- **Integrity Validation**: `batch.program_id` must equal selected program.
- **Indexes**: `idx_students_user`, `idx_students_batch`, `idx_students_roll`, `idx_students_status`

---

### 2.6 `consents`
Tracks explicit opt-in privacy consent for face recognition.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id`: UUID NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `consent_type`: VARCHAR(100) NOT NULL DEFAULT 'FACIAL_BIOMETRIC_ATTENDANCE'
  - `is_granted`: BOOLEAN NOT NULL
  - `ip_address`: VARCHAR(45)
  - `granted_at`: TIMESTAMPTZ DEFAULT NOW()
  - `revoked_at`: TIMESTAMPTZ
- **Indexes**: `idx_consents_user_type`

---

### 2.7 `devices`
Tracks registered physical devices bound to students for attendance verification.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id`: UUID NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `device_fingerprint`: VARCHAR(255) NOT NULL
  - `device_model`: VARCHAR(100)
  - `os_version`: VARCHAR(50)
  - `status`: VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED'))
  - `approved_by`: UUID REFERENCES `users(id)`
  - `approved_at`: TIMESTAMPTZ
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **Unique Constraint**: Unique `(user_id, device_fingerprint)`
- **Indexes**: `idx_devices_user_fingerprint`, `idx_devices_status`

---

### 2.8 `face_templates`
Stores encrypted facial feature vector embeddings (512-dimensional floats).
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id`: UUID UNIQUE NOT NULL REFERENCES `users(id)` ON DELETE CASCADE
  - `embedding_vector`: BYTEA NOT NULL  -- Encrypted 512-d float array
  - `confidence_score`: NUMERIC(5, 4) NOT NULL
  - `quality_score`: NUMERIC(5, 4) NOT NULL
  - `enrolled_at`: TIMESTAMPTZ DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_face_templates_user`

---

### 2.9 `attendance_days`
Daily aggregated summary record per student.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `student_id`: UUID NOT NULL REFERENCES `students(id)` ON DELETE CASCADE
  - `date`: DATE NOT NULL
  - `total_duration_minutes`: INTEGER DEFAULT 0
  - `status`: VARCHAR(50) DEFAULT 'ABSENT' CHECK (status IN ('PRESENT', 'ABSENT', 'INCOMPLETE', 'REGULARIZED', 'ON_LEAVE'))
  - `is_regularized`: BOOLEAN DEFAULT false
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - `updated_at`: TIMESTAMPTZ DEFAULT NOW()
- **Unique Constraint**: Unique `(student_id, date)`
- **Indexes**: `idx_attendance_days_student_date`, `idx_attendance_days_status`

---

### 2.10 `attendance_events`
Raw granular Punch-In and Punch-Out records.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `attendance_day_id`: UUID NOT NULL REFERENCES `attendance_days(id)` ON DELETE CASCADE
  - `student_id`: UUID NOT NULL REFERENCES `students(id)` ON DELETE CASCADE
  - `event_type`: VARCHAR(20) NOT NULL CHECK (event_type IN ('PUNCH_IN', 'PUNCH_OUT'))
  - `server_timestamp`: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `latitude`: NUMERIC(10, 8) NOT NULL
  - `longitude`: NUMERIC(11, 8) NOT NULL
  - `gps_accuracy_meters`: NUMERIC(6, 2)
  - `calculated_distance_meters`: NUMERIC(8, 2) NOT NULL
  - `is_geofence_valid`: BOOLEAN NOT NULL
  - `face_match_confidence`: NUMERIC(5, 4) NOT NULL
  - `liveness_score`: NUMERIC(5, 4) NOT NULL
  - `device_id`: UUID REFERENCES `devices(id)`
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_attendance_events_day`, `idx_attendance_events_student_time`

---

### 2.11 `regularizations`
Student attendance correction requests.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `attendance_day_id`: UUID NOT NULL REFERENCES `attendance_days(id)` ON DELETE CASCADE
  - `student_id`: UUID NOT NULL REFERENCES `students(id)` ON DELETE CASCADE
  - `reason`: TEXT NOT NULL
  - `requested_hours_minutes`: INTEGER NOT NULL
  - `status`: VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
  - `reviewed_by`: UUID REFERENCES `users(id)`
  - `reviewer_notes`: TEXT
  - `reviewed_at`: TIMESTAMPTZ
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_regularizations_status`, `idx_regularizations_student`

---

### 2.12 `tasks`
Assignments created by mentors.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `batch_id`: UUID NOT NULL REFERENCES `batches(id)` ON DELETE CASCADE
  - `created_by`: UUID NOT NULL REFERENCES `users(id)`
  - `title`: VARCHAR(255) NOT NULL
  - `description`: TEXT NOT NULL
  - `due_date`: TIMESTAMPTZ NOT NULL
  - `max_score`: NUMERIC(5, 2) DEFAULT 100.00
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_tasks_batch`, `idx_tasks_due_date`

---

### 2.13 `submissions`
Student submissions for assigned tasks.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `task_id`: UUID NOT NULL REFERENCES `tasks(id)` ON DELETE CASCADE
  - `student_id`: UUID NOT NULL REFERENCES `students(id)` ON DELETE CASCADE
  - `submission_link`: TEXT
  - `attachment_path`: TEXT
  - `notes`: TEXT
  - `score`: NUMERIC(5, 2)
  - `feedback`: TEXT
  - `graded_by`: UUID REFERENCES `users(id)`
  - `graded_at`: TIMESTAMPTZ
  - `status`: VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'GRADED', 'LATE_SUBMITTED'))
  - `submitted_at`: TIMESTAMPTZ DEFAULT NOW()
- **Unique Constraint**: Unique `(task_id, student_id)`
- **Indexes**: `idx_submissions_task_student`

---

### 2.14 `skills`
Skill catalog (e.g. Python, FastAPI, React, SQL, Git).
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `name`: VARCHAR(100) UNIQUE NOT NULL
  - `category`: VARCHAR(100) NOT NULL  -- e.g. Frontend, Backend, DevOps
  - `description`: TEXT
- **Indexes**: `idx_skills_category`

---

### 2.15 `skill_evaluations`
Mentor periodic scoring of student skills.
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `student_id`: UUID NOT NULL REFERENCES `students(id)` ON DELETE CASCADE
  - `skill_id`: UUID NOT NULL REFERENCES `skills(id)` ON DELETE CASCADE
  - `mentor_id`: UUID NOT NULL REFERENCES `users(id)`
  - `score`: NUMERIC(3, 2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0)
  - `evaluation_date`: DATE NOT NULL DEFAULT CURRENT_DATE
  - `remarks`: TEXT
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
- **Indexes**: `idx_skill_evaluations_student_skill`

---

### 2.16 `career_paths` & `career_stages`
Hierarchical career progression frameworks.
- **`career_paths`**: `id`, `title`, `description`, `is_active`, `created_at`
- **`career_stages`**: `id`, `career_path_id` (FK), `stage_order` (INT), `title`, `description`, `required_skill_summary`

---

### 2.17 `student_stages`
Current career stage tracking per student.
- **Columns**: `id`, `student_id` (FK), `career_stage_id` (FK), `status` ('IN_PROGRESS', 'COMPLETED'), `assigned_at`, `completed_at`

---

### 2.18 `feedback`, `notifications`, `audit_logs`
- **`feedback`**: `id`, `student_id` (FK), `author_id` (FK), `rating` (1-5), `comments`, `created_at`
- **`notifications`**: `id`, `user_id` (FK), `title`, `message`, `is_read`, `created_at`
- **`audit_logs`**: `id`, `actor_id` (FK), `action`: VARCHAR(100), `target_entity`: VARCHAR(100), `target_id`: UUID, `old_values`: JSONB, `new_values`: JSONB, `ip_address`: VARCHAR(45), `timestamp`: TIMESTAMPTZ DEFAULT NOW()

---

## 3. Future Entities (Phase 2 & Phase 3)

### Phase 2 Entities:
1. `applicants`: Public applicant submissions.
2. `applications`: Map applicant to target program/batch.
3. `assessments`: Online entry quiz definitions.
4. `assessment_submissions`: Applicant quiz attempts & scores.
5. `projects`: Capstone project definitions.
6. `presentations`: Trainee project presentation schedules & scores.
7. `certificates`: Issued completion/merit certificates with QR validation codes.
8. `helpdesk_tickets`: Student support requests & responses.

### Phase 3 Entities:
1. `ai_recommendations`: Stores AI-generated skill gap & learning recommendations.
2. `ai_insights_cache`: Cached prompt/response summaries to optimize LLM call costs.
