# Role-Based Access Control (RBAC) Specification — Netlink Platform

## 1. Overview & Architectural Principle

Authorization in the Netlink Platform follows strict **Defense-in-Depth**. While the React frontend provides conditional rendering and route guards to enhance user experience, **THE FRONTEND MUST NEVER BE TRUSTED AS A SECURITY BOUNDARY**.

Every protected API endpoint in the FastAPI backend MUST independently inspect the incoming Supabase JWT token, decode the caller's role claim, and verify permissions BEFORE executing business logic or querying the database.

---

## 2. Defined System Roles

1. `STUDENT`: Trainees participating in learning programs. Access is scoped exclusively to their own profile, assigned tasks, career progress, and attendance punches.
2. `MENTOR`: Technical leads and instructors. Access is scoped to assigned batches, student task submissions, skill evaluations, and attendance regularization reviews for their batch.
3. `HR` / `PROGRAM_MANAGER`: Administrative managers overseeing program operations, batch scheduling, student enrollments, device approvals, global regularizations, and analytics.
4. `SUPER_ADMIN`: System administrators with full read/write access across all system resources, user role assignments, platform configurations, and audit log inspection.

---

## 3. Server-Side Enforcement Architecture in FastAPI

Backend endpoints enforce permissions using FastAPI's dependency injection system (`Depends`).

```python
# Conceptual FastAPI Enforcement Pattern
from fastapi import Depends, HTTPException, status
from app.authentication.jwt import get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {self.allowed_roles}"
            )
        return current_user

require_student = RoleChecker(["STUDENT"])
require_mentor_or_hr = RoleChecker(["MENTOR", "HR", "SUPER_ADMIN"])
require_hr_or_admin = RoleChecker(["HR", "SUPER_ADMIN"])
require_super_admin = RoleChecker(["SUPER_ADMIN"])
```

---

## 4. Comprehensive Permission Matrix

| API Module / Action | Allowed Roles | Resource Ownership / Scope Constraint |
| :--- | :--- | :--- |
| **Auth & Profile** | | |
| GET `/auth/me` | All Authenticated | Self |
| PUT `/auth/profile` | All Authenticated | Self |
| **Students Management** | | |
| GET `/students/me` | STUDENT | Self |
| GET `/students/{id}` | Self, MENTOR, HR, SUPER_ADMIN | Students can only access own profile (`user_id == current_user.id`). Mentors restricted to assigned students (`student.user_id == mentor_id` or batch mentor). |
| GET `/students` | MENTOR, HR, SUPER_ADMIN | Mentors restricted to assigned students. Paginated & searchable. |
| POST `/students` | HR, SUPER_ADMIN | Global (Validates program/batch relation, mentor role, roll number uniqueness). |
| PUT / PATCH `/students/{id}` | HR, SUPER_ADMIN | Global |
| PATCH `/students/{id}/mentor` | HR, SUPER_ADMIN | Global (Validates target user has `MENTOR` role). |
| PATCH `/students/{id}/status` | HR, SUPER_ADMIN | Global (Generates Audit Log). |
| **Programs & Batches** | | |
| GET `/programs`, `/batches` | All Authenticated | Read-only for Students & Mentors |
| POST / PATCH `/programs`, `/batches` | HR, SUPER_ADMIN | Global (Enforces active parent program & valid date ranges) |
| **Attendance & Punching** | | |
| POST `/attendance/punch` | STUDENT | Self (Device & Geofence Verified) |
| GET `/attendance/me` | STUDENT | Self |
| GET `/attendance/batch/{batch_id}` | MENTOR, HR, SUPER_ADMIN | Batch restricted for Mentors |
| POST `/attendance/regularize` | STUDENT | Self |
| PUT `/attendance/regularize/{id}` | MENTOR, HR, SUPER_ADMIN | Batch restricted for Mentors |
| POST `/attendance/manual-override`| HR, SUPER_ADMIN | Requires reason text & generates AuditLog |
| **Devices & Biometrics** | | |
| POST `/devices/register` | STUDENT | Self |
| GET `/devices/pending` | HR, SUPER_ADMIN | Global |
| PUT `/devices/{id}/approve` | HR, SUPER_ADMIN | Global |
| POST `/face/enroll` | STUDENT, HR | Self or HR supervised enrollment |
| **Tasks & Skill Evaluations** | | |
| GET `/tasks` | All Authenticated | Students see batch tasks |
| POST/PUT `/tasks` | MENTOR, HR, SUPER_ADMIN | Assigned batch only |
| POST `/tasks/{id}/submit` | STUDENT | Self |
| PUT `/tasks/submissions/{id}/grade`| MENTOR, HR, SUPER_ADMIN | Assigned batch only |
| POST `/skills/evaluations` | MENTOR, HR, SUPER_ADMIN | Assigned batch only |
| **Career Pathways** | | |
| GET `/career/me` | STUDENT | Self |
| GET `/career/student/{id}` | MENTOR, HR, SUPER_ADMIN | Batch restricted for Mentors |
| PUT `/career/student/{id}/stage` | HR, SUPER_ADMIN | Global |
| **Audit Logs & Admin** | | |
| GET `/audit/logs` | SUPER_ADMIN | Global |
| PUT `/admin/user-role` | SUPER_ADMIN | Global |

---

## 5. Security Rules for Data Isolation
1. **Student Isolation**: A student must NEVER be able to query another student's attendance, face embeddings, task submissions, or personal records. Endpoint parameters like `/students/{student_id}` must check `if current_user.role == 'STUDENT' and current_user.student_id != student_id: raise HTTP 403`.
2. **Mentor Scope Isolation**: Mentors can access data only for students enrolled in batches where `batch.mentor_id == current_user.id`.
3. **Audit Log Traceability**: Any administrative override (e.g. approving a device change or overriding an absent status to present) must log the caller ID and exact timestamp.
