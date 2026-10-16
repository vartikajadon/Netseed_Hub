# Requirements Specification — Netlink Intern/Trainee Lifecycle Management Platform

## 1. Business Objective
The **Netlink Intern/Trainee Lifecycle Management Platform** is designed to streamline, secure, and automate the end-to-end management of interns and trainees across various programs and batches. The system tracks attendance, task performance, skill development, career progression, and performance evaluations while guaranteeing strict security, biometric consent, geofence accuracy, and comprehensive auditability.

---

## 2. User Roles & System Permissions

| Role | Core Responsibilities & Access Scope |
| :--- | :--- |
| **STUDENT / TRAINEE** | View assigned program/batch details, execute face enrollment (with consent), punch attendance (GPS + Device + Face Match + Liveness), view personal attendance history, submit tasks, view skill evaluations, view assigned career stages/pathways, raise regularization requests. |
| **MENTOR** | Manage assigned batches, create/assign tasks, review and grade task submissions, conduct periodic skill evaluations for assigned students, provide qualitative feedback, approve/reject student regularization requests for their batch. |
| **HR / PROGRAM MANAGER** | Create/manage Programs and Batches, enroll/manage Students, assign Mentors to Batches, manage device registration requests & approvals, configure geofences, view program-wide reports, approve/override attendance regularizations, monitor career stage progressions. |
| **SUPER_ADMIN** | Full administrative rights over system configuration, user provisioning, role assignments, global geofence settings, viewing security audit logs, monitoring system health, managing API keys & integrations. |

---

## 3. Core Modules

1. **Authentication & RBAC**: JWT-based session management integrated with Supabase Auth and backend role verification.
2. **Student Lifecycle Management**: Profiles, batch mapping, status tracking, program transitions.
3. **Program & Batch Management**: Program definitions, batch scheduling, mentor assignments, capacity tracking.
4. **Biometrics & Device Security**: Consent logging, facial template enrollment, device registration & approval workflow, liveness check.
5. **Attendance & Geofencing**: GPS validation, server-side Haversine calculation against active geofence, multi-punch duration calculation, daily attendance status calculation.
6. **Task & Assignment Management**: Task creation, deadlining, file/link submission, evaluation scoring.
7. **Skill Evaluation & Tracking**: Skill taxonomy, periodic mentor scoring, spider/radar chart progression metrics.
8. **Career Pathway Tracking**: Multi-stage career progression milestones, stage criteria, student transition logs.
9. **Feedback & Regularization**: Attendance correction requests, qualitative feedback, review workflows.
10. **Reports & Dashboards**: Operational metrics for Students, Mentors, HR, and Admins.
11. **Audit Logging**: Immutable tracking of security, enrollment, attendance overrides, and administrative actions.

---

## 4. Functional Requirements

### 4.1 Authentication & User Management
- Secure sign-in via email/password using Supabase Auth.
- Role-Based Access Control (RBAC) enforced on FastAPI endpoints.
- User profile management with role-specific profile fields.

### 4.2 Device Registration & Face Enrollment
- Mandatory user consent record before face enrollment.
- Facial template generation (feature vectors/embeddings, never storing raw face images unencrypted).
- Single primary device binding per student.
- Device change request workflow requiring HR approval.

### 4.3 Attendance Verification & Processing
- GPS coordinate capture with accuracy metadata.
- Server-side Haversine distance verification against active program/batch geofence center point.
- Verification chain: Authenticated Token -> Registered Device -> Active Consent -> Passive/Active Liveness -> Face Match (Cosine Similarity) -> Mock Location Check -> Haversine Geofence Check -> Sequence Order Check.
- Support multiple Punch-In / Punch-Out pairs per day.
- Daily aggregation of cumulative verified working duration.

### 4.4 Task Management & Skill Evaluations
- Mentors create tasks with titles, descriptions, deadlines, and skill tag mappings.
- Students submit deliverables (code links, document uploads).
- Mentors grade submissions and score skill proficiency (e.g., 1–5 scale).
- Aggregate skill scores generate student skill growth graphs over time.

### 4.5 Career Pathway & Stage Progression
- Configurable Career Paths (e.g., Full Stack Engineer, Cloud Specialist) with sequential stages (e.g., Onboarding -> Foundation -> Practical Tasks -> Live Project -> Assessment).
- Progression rules based on task completion rates, skill thresholds, and mentor sign-offs.

---

## 5. Non-Functional Requirements

- **Security**: Mandatory HTTPS, AES-256 encrypted biometric vectors, JWT token expiration, CORS restrictions, strict server-side authorization.
- **Performance**: Haversine calculation and geofence evaluation < 100ms; biometric face matching response < 1.5s total roundtrip.
- **Scalability**: Support concurrent attendance punch spikes (e.g., 500+ trainees punching within a 15-minute morning window).
- **Auditability**: Complete traceability of every attendance event (GPS, device ID, confidence score, server timestamp, result) and manual HR override.
- **Data Privacy**: Biometric data stored separately from PII, strict GDPR/DPDP alignment with explicit opt-in consent logs.

---

## 6. Attendance Business Rules

1. **Geofence Radius Threshold**: Default radius = 100 meters.
   - Distance calculation = **99.0m** with valid face match -> **ACCEPTED**.
   - Distance calculation = **101.0m** -> **REJECTED** (Out of geofence bounds).
2. **Server Timestamp Standard**: Client clock/timestamp is completely ignored. The FastAPI server `datetime.now(timezone.utc)` is the sole timestamp for event recording.
3. **Punch Pair Logic**:
   - Multiple Punch-In / Punch-Out events per calendar day are supported.
   - Verified durations for matching In-Out pairs within the same day are summed.
4. **Daily Status Thresholds**:
   - Total verified duration **>= 5 hours (300 mins)** -> Status: **PRESENT**.
   - Total verified duration **< 5 hours (e.g. 4 hours 59 minutes)** -> Status: **ABSENT**.
   - Unmatched Punch-In (missing Punch-Out by end-of-day process) -> Status: **INCOMPLETE** and defaults to **ABSENT** until regularized.
5. **Regularization & Manual Overrides**:
   - Students can submit regularization requests specifying the date, reason, and missing punch time.
   - Requires explicit approval from assigned Mentor or HR.
   - Any manual status alteration must record `approver_id`, `reason_text`, and produce an immutable `AuditLog` entry.
6. **Device & Location Authenticity**:
   - Punch allowed ONLY from the user's approved registered `device_fingerprint` / `hardware_id`.
   - Mock GPS location flags from client SDK/browser must trigger immediate rejection and audit flag.

---

## 7. Security Requirements

- **Server-Side RBAC Enforcement**: Authorization logic MUST run inside FastAPI middleware/dependencies. API routes verify caller role before processing.
- **Biometric Isolation**: Raw facial images must never be saved on disk or DB. Only vector embeddings (512-d float vectors) are stored. Biometric API endpoints must reject requests lacking active user consent.
- **Zero Client Trust**: All distance metrics, timestamps, and liveness scoring validation occur server-side.
- **Secrets Management**: Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `JWT_SECRET`) loaded strictly via server environment variables.

---

## 8. AI Requirements (Phase 3 Scope)

- **Technology Stack**: Groq, LangChain, Python.
- **Scope**: AI serves exclusively as an advisory assistant (e.g., summarizing student progress reports, identifying skill gaps, suggesting tailored learning resources, helping mentors draft feedback).
- **Strict Constraint**: **AI MUST NEVER AUTOMATICALLY MAKE EMPLOYMENT, DISMISSAL, GRADUATION, OR FINAL GRADING DECISIONS.** All high-stakes decisions remain human-in-the-loop (HR/Mentor).

---

## 9. Reports & Dashboards

- **Daily Attendance Report**: Filterable by program, batch, date, status (Present, Absent, Incomplete, Late).
- **Monthly Attendance Summary**: Aggregate present days, total hours logged, regularization counts per student.
- **Task Completion & Performance Matrix**: Submission timeliness, average grades per batch.
- **Skill Growth Matrix**: Radar chart of initial vs current skill scores per student.
- **Career Progression Tracker**: Count of trainees in each stage of a career path.
- **Security Audit Log Report**: Filterable log of device changes, manual attendance edits, failed facial verification spams.

---

## 10. Development Phases

```
+-------------------------------------------------------------------------+
| MVP (Phase 1)                                                           |
| • Auth & RBAC | Student & Batch Mgmt | Consent & Face Enrollment       |
| • Attendance Engine (GPS + Haversine + Device + Face) | Tasks & Skills   |
| • Career Stages | Dashboards & Reports                                  |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Phase 2                                                                 |
| • Applicant Portal & Application Tracking                               |
| • Online Assessments | Projects & Presentations | Certificates          |
| • Helpdesk / Support Ticketing | Advanced Analytics                     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Phase 3                                                                 |
| • AI Learning Recommendations (Groq + LangChain)                         |
| • Automated Task Feedback Suggestions | Cohort Performance Predictor    |
+-------------------------------------------------------------------------+
```

---

## 11. Acceptance Criteria

1. **Architecture & Security**: 100% of protected API routes reject requests without a valid JWT token and required role claim.
2. **Geofence Precision**: API rejects punch attempts at 100.1 meters and accepts valid attempts at 99.9 meters.
3. **Duration Calculation**: Trainees with 4h 59m verified hours are marked `ABSENT`; trainees with 5h 00m are marked `PRESENT`.
4. **Device Locking**: A punch attempt from an unapproved device is rejected with HTTP 403 `UNREGISTERED_DEVICE`.
5. **Auditability**: Every manual attendance override generates a trace in `audit_logs` containing `actor_id`, `target_id`, `old_status`, `new_status`, `reason`.

---

## 12. Open Questions & Assumptions

### Assumptions
1. Mobile devices/web browsers supply reliable high-accuracy GPS coordinates (`geolocation.getCurrentPosition` with `enableHighAccuracy: true`).
2. Program managers define static center-point latitude/longitude coordinates and allowed radius for each batch venue.
3. Standard working week is Monday–Friday, with weekend/holiday exceptions defined in batch schedules.

### Questions Needing Management Confirmation
1. What is the grace period policy for late arrivals (e.g. punch-in after 09:15 AM)?
2. What is the maximum number of registered device changes allowed per student per program cycle?
3. Are face embedding vectors generated on the backend (FastAPI + OpenCV/InsightFace) or via a client-side WebAssembly library prior to server posting?
