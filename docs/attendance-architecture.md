# Attendance System Architecture & Verification Engine — Netlink Platform

Attendance verification is the most security-critical subsystem of the Netlink Platform. This document defines the exact step-by-step validation pipeline, mathematical geofencing models, duration aggregation rules, and fraud prevention mechanisms.

---

## 1. Step-by-Step Validation Sequence

Every punch attempt (`POST /api/v1/attendance/punch`) passes through an 11-step sequential pipeline executed synchronously inside the FastAPI backend. Failure at any single step immediately halts processing and returns a specific, structured HTTP error.

```
       [ PUNCH ATTEMPT INITIATED ]
                    │
                    ▼
     [ Step 1: JWT Authenticated User ] ────── (Invalid) ────► HTTP 401
                    │ (Valid)
                    ▼
     [ Step 2: Registered Device Check ] ───── (Unapproved) ──► HTTP 403
                    │ (Approved)
                    ▼
     [ Step 3: Biometric Consent Active ] ──── (Revoked/None) ─► HTTP 422
                    │ (Active)
                    ▼
     [ Step 4: Liveness Verification ] ─────── (Failed) ──────► HTTP 422
                    │ (Passed)
                    ▼
     [ Step 5: Face Vector Cosine Match ] ──── (Score < 0.82) ─► HTTP 422
                    │ (Matched)
                    ▼
     [ Step 6: GPS Authenticity / Mock Check ] (Mock Detected)► HTTP 400
                    │ (Genuine)
                    ▼
     [ Step 7: Haversine Distance Calc ] ───── (> 100.0m) ────► HTTP 422
                    │ (<= 100.0m)
                    ▼
     [ Step 8: Punch Sequence Order Check ] ── (Invalid Seq) ─► HTTP 400
                    │ (Valid)
                    ▼
     [ Step 9: Save AttendanceEvent ]
                    │
                    ▼
     [ Step 10: Calculate Daily Duration ]
                    │
                    ▼
     [ Step 11: Update AttendanceDay Status & Write Audit Log ]
                    │
                    ▼
           [ HTTP 200 SUCCESS ]
```

---

## 2. Detailed Validation Step Specifications

### Step 1: Authenticated User Validation
- Extract JWT token from `Authorization` header.
- Decode claims via Supabase Auth public key. Verify user has `STUDENT` role and is currently in `ACTIVE` status.

### Step 2: Registered Device Validation
- Extract request device hardware ID / `device_fingerprint`.
- Query `devices` table for `(user_id, device_fingerprint)`.
- If device record does not exist or `status != 'APPROVED'`, return HTTP 403 `UNREGISTERED_DEVICE`. New devices require explicit HR approval before punching is unlocked.

### Step 3: Biometric Consent Check
- Verify active consent record exists in `consents` table (`is_granted = true` and `revoked_at IS NULL`).
- If missing, return HTTP 422 `BIOMETRIC_CONSENT_REQUIRED`.

### Step 4 & 5: Liveness & Facial Vector Match
- Execute passive/active liveness check on incoming camera frame payload.
- Compute 512-dimensional facial embedding vector.
- Retrieve enrolled `FaceTemplate` vector for student.
- Compute Cosine Similarity Metric:
  $$\text{Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
- If similarity score $< 0.82$ (configurable threshold), reject with HTTP 422 `FACIAL_MATCH_FAILED`.

### Step 6: GPS Authenticity & Mock Location Detection
- Inspect Android/iOS device flags passed in request headers (`is_mock_location`, `accuracy`).
- Reject requests where `accuracy > 30.0` meters (indicates weak or spoofed GPS signal) or where mock location providers are detected.

### Step 7: Server-Side Haversine Distance Calculation
- Retrieve batch venue center coordinates ($\text{lat}_1, \text{lon}_1$) and allowed radius $R_\text{max}$ (Default: 100 meters).
- Obtain client GPS coordinates ($\text{lat}_2, \text{lon}_2$).
- Calculate distance using Haversine Formula on server:
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
  $$d = R \cdot c \quad \text{where } R = 6,371,000 \text{ meters}$$

#### Strict Geofence Threshold Rules:
- **Case A: Distance = 99.0m** $\le 100.0\text{m} \implies$ **ACCEPTED**.
- **Case B: Distance = 100.0m** $\le 100.0\text{m} \implies$ **ACCEPTED**.
- **Case C: Distance = 101.0m** $> 100.0\text{m} \implies$ **REJECTED** with HTTP 422 `OUT_OF_GEOFENCE_BOUNDS`.

### Step 8: Punch Sequence Validation
- Retrieve today's latest `AttendanceEvent` for student.
- Sequence Rules:
  - First punch of the day MUST be `PUNCH_IN`.
  - Next punch MUST be `PUNCH_OUT`.
  - Duplicate consecutive `PUNCH_IN` or `PUNCH_OUT` attempts without an intervening opposite event are rejected with HTTP 400 `INVALID_PUNCH_SEQUENCE`.

### Step 9: Save AttendanceEvent
- Capture server timestamp `datetime.now(timezone.utc)`. **Client-side timestamps are strictly ignored.**
- Persist `AttendanceEvent` record containing GPS coords, accuracy, calculated distance, face match score, liveness score, device ID, and server timestamp.

### Step 10 & 11: Daily Hours Aggregation & Status Update
- Query all paired `PUNCH_IN` and `PUNCH_OUT` events for the current `attendance_day`.
- Compute verified working duration:
  $$\text{Total Duration} = \sum_{i=1}^{n} \left( \text{Timestamp}_{\text{PUNCH\_OUT}, i} - \text{Timestamp}_{\text{PUNCH\_IN}, i} \right)$$

#### Daily Attendance Status Rules:
- **PRESENT**: Total verified duration $\ge 5 \text{ hours } (300 \text{ minutes})$.
- **ABSENT**: Total verified duration $< 5 \text{ hours } (300 \text{ minutes})$. (e.g. 4 hours 59 minutes = **ABSENT**).
- **INCOMPLETE**: Day contains an unpaired `PUNCH_IN` without a closing `PUNCH_OUT` by end-of-day cutoff. Status defaults to **INCOMPLETE / ABSENT** until regularized by HR/Mentor.

---

## 3. Regularization & Manual Overrides Workflow

1. **Student Request**: Student submits missing punch time and justification via `POST /api/v1/attendance/regularize`.
2. **Review**: Mentor or HR reviews request in dashboard.
3. **Approval Action**:
   - If Approved: Backend updates `attendance_days.status` to `REGULARIZED`, updates `total_duration_minutes`, sets `is_regularized = true`.
   - If Rejected: Status remains unchanged.
4. **Mandatory Audit Logging**: Any manual change to attendance status creates an immutable entry in `audit_logs` capturing:
   - `actor_id` (User who performed override)
   - `target_student_id`
   - `old_status` & `new_status`
   - `reason_text`
   - `server_timestamp`
