# API Design Specification — Netlink Platform

This document outlines the REST API endpoints provided by the FastAPI backend engine. All endpoints are prefixed with `/api/v1` and require Bearer JWT Authentication unless marked public.

---

## 1. Authentication Module (`/api/v1/auth`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/auth/login` | POST | Public | Authenticate user credentials via Supabase Auth and return JWT tokens. |
| `/auth/refresh` | POST | Public | Refresh access token using valid refresh token. |
| `/auth/me` | GET | Authenticated | Fetch current user profile details and role claims. |
| `/auth/logout` | POST | Authenticated | Revoke user session. |

---

## 2. Students Module (`/api/v1/students`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/students` | GET | MENTOR, HR, SUPER_ADMIN | List students with server-side pagination (`page`, `size`) and filters (`search`, `program_id`, `batch_id`, `mentor_id`, `status`). Mentors restricted to assigned students. |
| `/students/me` | GET | STUDENT | Fetch logged-in student's own complete profile and enrollment status. |
| `/students/{id}` | GET | Self, MENTOR, HR, SUPER_ADMIN | Get detailed student profile including program, batch, mentor, device state, and face enrollment compliance. |
| `/students` | POST | HR, SUPER_ADMIN | Register/create a new student profile linked to user, program, batch, and mentor. Validates data integrity and roll number uniqueness. |
| `/students/{id}` | PUT / PATCH | HR, SUPER_ADMIN | Update student details, program, or batch binding. |
| `/students/{id}/mentor` | PATCH | HR, SUPER_ADMIN | Reassign/change lead mentor for student (validates target user has `MENTOR` role). |
| `/students/{id}/status` | PATCH | HR, SUPER_ADMIN | Change student lifecycle status (`ACTIVE`, `COMPLETED`, `DROPPED`, `ON_LEAVE`). Emits audit log. |

---

## 3. Programs Module (`/api/v1/programs`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/programs` | GET | All Authenticated | List training programs (optional filter `status`). |
| `/programs/{id}` | GET | All Authenticated | Get program details and associated batches. |
| `/programs` | POST | HR, SUPER_ADMIN | Create a new training program. |
| `/programs/{id}` | PUT / PATCH | HR, SUPER_ADMIN | Update program title, code, description, duration, or status. |

---

## 4. Batches Module (`/api/v1/batches`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/batches` | GET | All Authenticated | List batches (filtered by `program_id`, `mentor_id`, or `status`). |
| `/batches/{id}` | GET | All Authenticated | Get batch details, assigned program, lead mentor, and enrolled student roster. |
| `/batches` | POST | HR, SUPER_ADMIN | Create a new batch under an active program (`start_date < end_date`). |
| `/batches/{id}` | PUT / PATCH | HR, SUPER_ADMIN | Update batch schedule, program association, or mentor binding. |

---

## 5. Device Management Module (`/api/v1/devices`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/devices/register` | POST | STUDENT | Submit device fingerprint and metadata for approval. |
| `/devices/me` | GET | STUDENT | List registered devices for current student. |
| `/devices/pending` | GET | HR, ADMIN | List all pending device approval requests. |
| `/devices/{id}/approve` | PUT | HR, ADMIN | Approve pending registered device. |
| `/devices/{id}/reject` | PUT | HR, ADMIN | Reject or revoke registered device. |

---

## 6. Biometric Face Module (`/api/v1/face`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/face/consent` | POST | STUDENT | Record explicit biometric privacy consent opt-in. |
| `/face/consent/status`| GET | STUDENT | Check user's current biometric consent status. |
| `/face/enroll` | POST | STUDENT, HR | Submit baseline face enrollment sample & generate vector embedding. |
| `/face/verify` | POST | System / Internal| Compare incoming frame against DB embedding template. |

---

## 7. Attendance Engine Module (`/api/v1/attendance`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/attendance/punch` | POST | STUDENT | Core punch-in/out endpoint. Validates device, liveness, face, GPS, and geofence. |
| `/attendance/me` | GET | STUDENT | Get current student's daily attendance records & logs. |
| `/attendance/batch/{batch_id}` | GET | MENTOR, HR, ADMIN | Get real-time daily attendance grid for a batch. |
| `/attendance/regularize` | POST | STUDENT | Submit an attendance regularization request for missing/faulty punches. |
| `/attendance/regularize` | GET | MENTOR, HR, ADMIN | List pending regularization requests for approval. |
| `/attendance/regularize/{id}` | PUT | MENTOR, HR, ADMIN | Approve or reject regularization request. |
| `/attendance/manual-override` | POST | HR, ADMIN | Force update student attendance status (requires reason, generates audit log). |

---

## 8. Tasks & Assignments Module (`/api/v1/tasks`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/tasks` | GET | All Authenticated | List tasks assigned to student's batch or created by mentor. |
| `/tasks/{id}` | GET | All Authenticated | Get task details and attached materials. |
| `/tasks` | POST | MENTOR, HR, ADMIN | Create a new task assignment for a batch. |
| `/tasks/{id}/submit` | POST | STUDENT | Submit code link or document for task evaluation. |
| `/tasks/{id}/submissions` | GET | MENTOR, HR, ADMIN | List all student submissions for a task. |
| `/tasks/submissions/{id}/grade`| PUT | MENTOR, HR, ADMIN | Grade submission and provide qualitative feedback. |

---

## 9. Skill Evaluation Module (`/api/v1/skills`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/skills` | GET | All Authenticated | List overall skill taxonomy catalog. |
| `/skills/evaluations/student/{id}`| GET | Self, MENTOR, HR, ADMIN | Fetch historical skill scores and spider-chart radar metrics for a student. |
| `/skills/evaluations` | POST | MENTOR, HR, ADMIN | Submit periodic skill score evaluation (1–5 scale) for a student. |

---

## 10. Career Pathways Module (`/api/v1/career`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/career/paths` | GET | All Authenticated | List available career paths and sequential stages. |
| `/career/student/{id}` | GET | Self, MENTOR, HR, ADMIN | Get current career stage and milestone progress for a student. |
| `/career/student/{id}/stage` | PUT | HR, ADMIN | Transition student to next career stage. |

---

## 11. Feedback & Helpdesk Module (`/api/v1/feedback`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/feedback` | POST | All Authenticated | Submit qualitative feedback or support ticket. |
| `/feedback/student/{id}` | GET | Self, MENTOR, HR, ADMIN | List feedback entries for a student. |

---

## 12. Reports Module (`/api/v1/reports`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/reports/attendance/daily` | GET | HR, ADMIN | Export daily attendance report (CSV/PDF). |
| `/reports/attendance/monthly`| GET | HR, ADMIN | Export monthly aggregated summary report. |
| `/reports/tasks/performance` | GET | HR, ADMIN | Batch task completion rate and grade distributions. |
| `/reports/skills/matrix` | GET | HR, ADMIN | Batch skill growth matrix analytics. |

---

## 13. Admin & Audit Modules (`/api/v1/admin` & `/api/v1/audit`)

| Endpoint | Method | Role | Purpose |
| :--- | :--- | :--- | :--- |
| `/admin/users/roles` | PUT | SUPER_ADMIN | Change user system role. |
| `/admin/geofences` | POST/PUT | HR, SUPER_ADMIN | Manage venue geofence locations and radii. |
| `/audit/logs` | GET | SUPER_ADMIN | Query immutable system audit logs with filters (actor, action, timeframe). |
