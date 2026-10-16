# Netlink Intern/Trainee Lifecycle Management Platform

A web platform for managing intern/trainee lifecycles at Netlink, including recruitment/enrollment, attendance verification, mentoring, task assignments, skill evaluations, and career progression.

---

## Architecture Overview

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, React Router DOM
- **Backend**: Python 3.14 / 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic V2, PyJWT
- **Database**: PostgreSQL / Supabase (with SQLite fallback for fast local dev)
- **Security & Privacy**: Zero client trust for attendance, server-side Haversine distance, encrypted biometric face vector template references, immutable audit logging.

---

## Project Structure

```text
Netseed_applicaation/
├── backend/
│   ├── app/
│   │   ├── api_routes/      # FastAPI REST route endpoints (/users, /programs, /batches, etc.)
│   │   ├── authentication/  # JWT & Auth utilities
│   │   ├── configuration/   # Pydantic environment configuration (config.py)
│   │   ├── database/        # SQLAlchemy session & Base engine (session.py)
│   │   ├── models/          # SQLAlchemy ORM entities (all_models.py)
│   │   ├── repositories/    # Data access layer repositories (base_repositories.py)
│   │   ├── schemas/         # Pydantic request/response schemas (all_schemas.py)
│   │   ├── services/        # Business logic services (base_services.py)
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Pytest suite (test_api.py)
│   ├── seed_data.py         # Seed development data script
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template for backend
│   └── .env                 # Local environment file (git-ignored)
├── database/
│   ├── migrations/          # SQL migration files (001_initial_schema.sql)
│   └── run_migrations.py    # Python runner script to execute migrations
├── frontend/
│   ├── src/
│   │   ├── api/             # API client & fetch wrapper (client.ts)
│   │   ├── components/      # Reusable UI components (Button, Input, Modal, Table, Card, etc.)
│   │   ├── context/         # AuthContext & role state management
│   │   ├── pages/           # Dashboard views (/login, /student, /mentor, /hr, /admin)
│   │   ├── types/           # TypeScript domain definitions (index.ts)
│   │   ├── App.tsx          # Router configuration
│   │   └── main.tsx         # React app entry point
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.ts       # Vite build & API proxy setup
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── .env.example         # Environment template for frontend
│   └── .env                 # Local environment file (git-ignored)
└── docs/                    # Architecture, API, & Database documentation
```

---

## Step-by-Step Setup & Execution

### 1. Prerequisites

- **Python**: 3.10+ (Tested on Python 3.14)
- **Node.js**: v18+ (Tested on Node.js v24)
- **npm**: v9+ (Tested on npm 11)

---

### 2. Installing Dependencies

#### Backend Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

#### Frontend Dependencies
```bash
cd frontend
npm install
```

---

### 3. Configuring Environment Variables

Copy `.env.example` files to `.env` in both `backend/` and `frontend/`:

```bash
# Backend Environment Setup
cp backend/.env.example backend/.env

# Frontend Environment Setup
cp frontend/.env.example frontend/.env
```

#### `backend/.env` contents:
```env
APP_NAME="Netlink Trainee Platform API"
ENVIRONMENT=development
PORT=8000
DEBUG=True

# Database connection string (SQLite for local dev, PostgreSQL/Supabase for production)
DATABASE_URL=sqlite:///./netlink_dev.db

# Supabase Credentials (from Supabase Dashboard Project Settings)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Authentication Secrets
JWT_SECRET=super-secret-dev-jwt-key-netlink-2026
JWT_ALGORITHM=HS256
```

#### `frontend/.env` contents:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

### 4. Applying Database Migrations

Run the database migration runner to create the schema:

```bash
python database/run_migrations.py
```

This applies `database/migrations/001_initial_schema.sql` against the database target specified in `backend/.env`.

---

### 5. Seeding Development Data

Seed standard initial development data (1 Super Admin, 1 HR Manager, 1 Mentor, 2 Students, 1 Program, 1 Batch, 1 Geofence):

```bash
python backend/seed_data.py
```

**Seed Test Accounts:**
- **Student 1**: `student1@netlink.org`
- **Student 2**: `student2@netlink.org`
- **Mentor**: `mentor@netlink.org`
- **HR Manager**: `hr@netlink.org`
- **Super Admin**: `admin@netlink.org`

---

### 6. Running the Backend API

Start the FastAPI application server:

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 7. Running the Frontend Application

Start the React Vite development server:

```bash
cd frontend
npm run dev
```

- App runs locally at: [http://localhost:3000](http://localhost:3000)

To build the frontend for production:

```bash
cd frontend
npm run build
```

---

### 8. Running Automated Tests

Run the backend Pytest suite:

```bash
cd backend
python -m pytest
```

---

## Implemented Modules & API Endpoints

### 1. Authentication & Role-Based Access Control (RBAC)
- **`POST /api/v1/auth/login`**: Authenticate via Supabase Auth & JWT.
- **`GET /api/v1/auth/me`**: Get current user identity & role claim (`STUDENT`, `MENTOR`, `HR`, `SUPER_ADMIN`).
- **`POST /api/v1/auth/logout`**: Revoke user session.

### 2. Student Management Module (Phase 1 Complete)
- **Program Management**:
  - `GET /api/v1/programs` & `POST /api/v1/programs` & `PATCH /api/v1/programs/{id}`
  - Define internship programs, descriptions, duration, and active/inactive status.
- **Batch Management**:
  - `GET /api/v1/batches` & `POST /api/v1/batches` & `PATCH /api/v1/batches/{id}`
  - Cohort scheduling bound to active programs with date range validations (`start_date < end_date`).
- **Student Enrollment & Lifecycle**:
  - `GET /api/v1/students` (Server-side search, filtering by program/batch/mentor/status, pagination).
  - `GET /api/v1/students/me` (Student self-service profile view).
  - `GET /api/v1/students/{id}` (Comprehensive detail page including hardware device approval, facial biometric consent & enrollment state).
  - `POST /api/v1/students` (HR student registration with strict DB integrity validation: batch belongs to program, mentor role check, unique roll number).
  - `PATCH /api/v1/students/{id}/mentor` (Reassign lead mentor with validation & audit logging).
  - `PATCH /api/v1/students/{id}/status` (Update lifecycle status: `ACTIVE`, `COMPLETED`, `DROPPED`, `ON_LEAVE` with audit logging).
- **Mentor Scope Security**:
  - Mentors can view assigned trainees via `GET /api/v1/students`. Unassigned student profile requests yield `403 Forbidden`.
- **Audit Logging**:
  - Sensitive operations (`CREATE_PROGRAM`, `CREATE_BATCH`, `CREATE_STUDENT`, `ASSIGN_MENTOR`, `CHANGE_STUDENT_STATUS`) generate immutable audit log entries.
