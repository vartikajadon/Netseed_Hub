# Technical Architecture Document — Netlink Intern/Trainee Platform

## 1. Executive Summary & High-Level System Design

The Netlink Intern/Trainee Lifecycle Management Platform uses a decoupled 3-tier architecture with specialized service layers for biometric processing and AI analytics.

### High-Level Architectural Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                  React + TypeScript + Tailwind CSS                      |   |
|   |                         (Hosted on Vercel)                              |   |
|   +-------------------------------------------------------------------------+   |
+----------------------------------------|----------------------------------------+
                                         | REST / HTTPS
                                         v
+---------------------------------------------------------------------------------+
|                                 BACKEND API LAYER                               |
|                                                                                 |
|   +-------------------------------------------------------------------------+   |
|   |                          FastAPI Engine (Python)                        |   |
|   |  - Router & Middleware (JWT Verification & RBAC)                        |   |
|   |  - Validation Schemas (Pydantic)                                        |   |
|   |  - Core Business Logic & Orchestration                                  |   |
|   +-------------------|-----------------------------------|-----------------+   |
+-----------------------|-----------------------------------|---------------------+
                        |                                   |
           Internal Call|                                   |Internal Call
                        v                                   v
+-----------------------------------+   +-----------------------------------------+
|     BIOMETRIC SERVICE LAYER       |   |            AI SERVICE LAYER             |
|  - Face Vector Comparison         |   |  - Groq API Integration (LLM Engine)    |
|  - Active/Passive Liveness Verification| |  - LangChain Orchestration & Chains    |
|  - Registered Device Match        |   |  - Advisory & Learning Analytics        |
+-----------------------------------+   +-----------------------------------------+
                        |                                   |
                        +-----------------|-----------------+
                                          | SQL / Client SDK
                                          v
+---------------------------------------------------------------------------------+
|                              PERSISTENCE LAYER                                  |
|                                                                                 |
|   +----------------------------------+   +----------------------------------+   |
|   |      Supabase Auth & PostgreSQL  |   |         Supabase Storage         |   |
|   |   - User Identity & Credentials  |   |   - Document Submissions         |   |
|   |   - Relational Tables & RLS      |   |   - Student Avatars              |   |
|   |   - PostGIS / Spatial Indexes    |   |   - Audit Log Artifacts          |   |
|   +----------------------------------+   +----------------------------------+   |
+---------------------------------------------------------------------------------+
```

---

## 2. Tech Stack Specification

| Component | Technology | Purpose / Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18+ with TypeScript | Component-based UI with compile-time type safety. |
| **Frontend Styling** | Tailwind CSS | Utility-first CSS for fast, responsive, and cohesive design system. |
| **Frontend Hosting** | Vercel | Global CDN, automated git preview deployments, optimized static asset delivery. |
| **Backend Framework** | Python 3.11+ / FastAPI | High performance, async support, native OpenAPI documentation, automatic Pydantic validation. |
| **Database & ORM** | PostgreSQL via Supabase / SQLAlchemy | Relational DB with spatial support (PostGIS), JSON extensions, and strong transactional guarantees. |
| **Authentication** | Supabase Auth + FastAPI Security | OAuth2 / Bearer JWT tokens issued by Supabase Auth and verified by FastAPI middleware. |
| **Object Storage** | Supabase Storage | S3-compatible cloud storage for submitted files, avatars, and assets. |
| **Biometric Engine** | OpenCV / InsightFace (Isolated Service) | High-accuracy facial feature vector extraction (512-d embeddings) and cosine similarity comparison. |
| **AI Framework (Phase 3)**| Groq + LangChain | High-speed inference using Groq LPU models combined with LangChain prompt management and output parsing. |
| **Backend Deployment**| Cloud Container (Docker on AWS/Render/GCP) | Scalable backend hosting with environment variable isolation. |

---

## 3. Communication Patterns & Service Boundaries

### 3.1 Client to FastAPI Backend
- **Protocol**: HTTPS / RESTful APIs.
- **Authentication**: `Authorization: Bearer <SUPABASE_JWT_TOKEN>` attached to every request.
- **Data Exchange**: JSON payloads validated by FastAPI Pydantic models.

### 3.2 FastAPI Backend to Supabase / PostgreSQL
- **Database Connection**: Direct PostgreSQL connection pool managed by SQLAlchemy / AsyncPG.
- **Auth Verification**: FastAPI inspects JWT public keys or uses Supabase SDK to validate caller identity.
- **Storage API**: FastAPI generates pre-signed upload URLs or proxies file uploads directly to Supabase Storage buckets.

### 3.3 Isolation of Biometric Service Layer
- The biometric processing engine (face recognition & liveness detection) operates as a dedicated module/service isolated from standard CRUD logic.
- **Flow**:
  1. Frontend submits live camera frame payload + GPS + Device Fingerprint to FastAPI `/attendance/punch`.
  2. FastAPI delegates face embedding extraction and comparison to the Biometric Service layer.
  3. Biometric Service compares live vector against enrolled `FaceTemplate` vector stored in DB.
  4. Returns match score + liveness pass/fail status back to the main FastAPI Attendance Engine.

### 3.4 Isolation of AI Service Layer (Phase 3)
- The AI layer uses Groq + LangChain for non-blocking asynchronous analysis.
- **Flow**:
  1. User/Mentor requests AI feedback or progress summary.
  2. FastAPI triggers an async worker / background task using LangChain pipelines directed to Groq API endpoints.
  3. Structured response is returned to client as advisory content.
  4. AI output is strictly isolated from core authorization, attendance, or grading triggers.

---

## 4. End-to-End Attendance Request Architecture Flow

```
[Student Device]
       │
       │ 1. POST /attendance/punch
       │    Payload: { lat, lng, device_id, camera_frame_base64 }
       ▼
[FastAPI Server Gateway]
       │
       │ 2. Validate Supabase JWT Bearer Token
       ├──────────────────────────────────┐
       │ (Invalid)                        │ (Valid)
       ▼                                  ▼
[HTTP 401 Unauthorized]            [RBAC & Student Verification]
                                          │
                                          │ 3. Query DB: Get active device_id & enrollment
                                          ▼
                                   [Device Check]
                                          │
                                          ├── (Device Mismatch) ──► [HTTP 403 Forbidden: Unregistered Device]
                                          │
                                          ▼ (Device Match)
                                   [Biometric Service]
                                          │
                                          ├── 4. Verify Active Consent
                                          ├── 5. Liveness Check (Pass/Fail)
                                          └── 6. Compare Face Vector vs DB Template
                                          │
                                          ├── (Face Score < Threshold) ──► [HTTP 422: Biometric Validation Failed]
                                          │
                                          ▼ (Biometric Verified)
                                   [Server GPS Engine]
                                          │
                                          ├── 7. Server-side Haversine Distance Calc vs Batch Center
                                          ├── 8. Check distance <= batch.allowed_radius_meters
                                          │
                                          ├── (Distance > 100.0m) ──► [HTTP 422: Geofence Validation Failed]
                                          │
                                          ▼ (Distance <= 100.0m)
                                   [Attendance Event Writer]
                                          │
                                          ├── 9. Capture datetime.now(timezone.utc)
                                          ├── 10. Write AttendanceEvent record
                                          ├── 11. Recalculate AttendanceDay cumulative hours
                                          └── 12. Write AuditLog entry
                                          │
                                          ▼
                                   [HTTP 200 OK: Attendance Recorded]
```

---

## 5. Security & Infrastructure Architecture

1. **Zero Client Trust Architecture**:
   - Geofence distances are never computed on client devices.
   - Timestamps are generated strictly on the FastAPI server using UTC.
   - Device fingerprints must match approved records in the database.
2. **Biometric Data Protection**:
   - Biometric vectors are encrypted at rest using AES-256.
   - Raw facial camera frames captured during punch-in are processed in-memory and immediately discarded.
3. **Environment Isolation & Secrets**:
   - API keys (Groq, Supabase Service Role, JWT secret keys) are injected at runtime via environment variables.
   - CORS policies strictly restrict frontend origins allowed to call FastAPI.
