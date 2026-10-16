# Development Guidelines & Rules for AI Agents and Developers

This repository contains the Netlink Intern/Trainee Lifecycle Management Platform. All AI agents, software engineers, and contributors must adhere to the following strict development guidelines.

## 1. Requirements & Scope Integrity
- **Follow the PRD as the Single Source of Truth**: Never invent or assume business requirements that are not documented in the PRD or approved architecture docs.
- **Strict Phase Separation**: Do not attempt to implement Phase 2 or Phase 3 features ahead of time unless explicitly authorized.
- **Inspect Before Modifying**: Always inspect existing code, schemas, and API contracts before modifying files. Do not rewrite working modules unnecessarily.

## 2. Architectural Boundaries & Security
- **Frontend/Backend Separation**: Maintain a strict decoupled architecture between the React TypeScript frontend and the FastAPI backend.
- **Backend Business Logic**: Keep all domain, validation, and business logic inside the FastAPI backend. Never place business validation solely in the client.
- **Server-Side RBAC Enforcement**: Authorization must be enforced at every FastAPI endpoint using dependency injection (`Depends(get_current_user)` and role checkers). Never rely on frontend route protection alone.
- **Zero Client Trust for Attendance**:
  - Never trust client timestamps for attendance events. Always capture and store the server-side UTC timestamp.
  - Never trust client-side geofence distance or boundary calculations. Always calculate distances on the backend using server-side Haversine formula against verified database coordinates.
- **Biometric & Privacy Security**:
  - Never store raw facial images if face embedding vector templates suffice.
  - Never expose face embedding vectors or sensitive biometric signatures over public or unencrypted APIs.
  - Require explicit user consent records prior to face template enrollment.
- **Audit & Compliance**: Log all sensitive administrative actions, manual attendance overrides, role changes, and device registrations in the immutable audit log table.

## 3. Secrets & Environment Management
- **Use Environment Variables**: Store all secrets, API keys, database URIs, JWT secrets, and third-party credentials in `.env` files.
- **Never Commit Secrets**: Never hardcode or commit secret keys, DB passwords, or API keys into git repositories.

## 4. Code Quality & Maintenance
- **Component Design**: Write clean, modular, reusable frontend components and backend services.
- **Small & Focused Functions**: Follow Single Responsibility Principles (SRP).
- **Validation**: Validate all incoming API request bodies using Pydantic schemas on the backend and Zod/TypeScript types on the frontend.
- **Error Handling**: Implement standardized error response formats (`HTTPException`, custom exception handlers) and return meaningful RFC-7807 compatible error responses.
- **Testing**:
  - Write unit tests for critical business logic (Haversine calculation, geofence threshold checks, attendance daily duration calculations, RBAC checks).
  - Always run tests (`pytest`, `npm test`) after modifying logic or implementing features.
- **Documentation**: Update the corresponding documentation under `docs/` whenever architectural, API, schema, or system workflows change.
