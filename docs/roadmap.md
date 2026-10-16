# Product Development Roadmap & Implementation Strategy — Netlink Platform

This document outlines the phased implementation plan for the Netlink Platform, isolating the Minimum Viable Product (MVP) from future Phase 2 expansion and Phase 3 AI enhancements.

---

## Phase 1: MVP Core Architecture & Operations

The goal of Phase 1 is to establish a secure, production-grade foundation supporting core intern lifecycle workflows, biometric attendance verification, and performance tracking.

### Modules & Deliverables in MVP:
1. **Authentication & Authorization**:
   - Supabase Auth integration, JWT handling, role-based middleware (`STUDENT`, `MENTOR`, `HR`, `SUPER_ADMIN`).
2. **Student & User Management**:
   - Profile creation, roll number assignment, college details, status lifecycle (`ENROLLED` -> `ACTIVE` -> `GRADUATED`).
3. **Program & Batch Management**:
   - Program definitions, batch scheduling, mentor assignments, geofence binding.
4. **Consent & Device Registration**:
   - Explicit biometric privacy consent capture, single-device binding, HR device approval workflow.
5. **Biometric Face Enrollment & Verification**:
   - Baseline facial embedding vector generation (512-d floats), liveness checking, cosine match verification.
6. **Attendance & Geofencing Engine**:
   - Server-side Haversine distance validation (100m threshold), server UTC timestamping, multi-punch duration aggregation (5h+ = Present, 4h59m = Absent), regularization workflows.
7. **Task Management**:
   - Assignment creation by mentors, link/file submissions by students, grading and qualitative feedback.
8. **Skill Evaluation & Metrics**:
   - Skill taxonomy catalog, periodic mentor scoring (1-5 scale), student skill radar charts.
9. **Basic Career Path Tracking**:
   - Multi-stage career progression tracking per student.
10. **Dashboards & Operational Reports**:
    - Role-tailored dashboards for Students, Mentors, HR, and Admins; CSV exports for daily/monthly attendance.
11. **Security & Audit Logging**:
    - Centralized audit log tracking administrative changes, device approvals, and manual attendance overrides.

---

## Phase 2: Trainee Recruitment & Project Ecosystem

Phase 2 expands the platform upstream to manage applicant intake, assessments, capstone projects, and certification.

### Key Phase 2 Features:
- **Applicant Registration & Application Tracking System (ATS)**: Public portal for candidates to apply to open programs.
- **Online Entrance Assessments**: Multiple-choice and coding assessments for candidate filtering.
- **Capstone Projects & Presentations**: Multi-week group/individual project assignments with presentation scheduling and panel scoring.
- **Helpdesk & Support Ticketing**: Internal student support ticket module.
- **Automated Certificate Generation**: Digital completion and merit certificates with QR code verification.
- **Advanced Business Intelligence & Reports**: Predictive cohort performance analytics and drop-out risk metrics.

---

## Phase 3: AI-Assisted Mentorship & Intelligence (Groq + LangChain)

Phase 3 introduces artificial intelligence to assist mentors and HR, using Groq fast inference LPUs and LangChain orchestration pipelines.

### Key Phase 3 Features:
- **Personalized Skill & Learning Recommendations**: AI analyzes student task scores and skill matrices to generate custom study plans and resource suggestions.
- **Automated Draft Feedback Assistance**: AI generates draft qualitative feedback for mentors to review and edit before sending to students.
- **Cohort Progress Analysis**: AI generates natural-language summaries of batch performance trends for HR management.

### Critical Safety & Ethics Policy:
> [!IMPORTANT]
> **HUMAN-IN-THE-LOOP MANDATE**: AI modules operate STRICTLY in an advisory capacity. **AI MUST NEVER AUTOMATICALLY MAKE EMPLOYMENT, DISMISSAL, STAGE TRANSITION, OR FINAL GRADING DECISIONS.** All high-stakes decisions require explicit human authorization.
