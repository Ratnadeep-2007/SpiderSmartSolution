# Spider Smart Solution — Inventory Management System (IMS)

## Project Overview
A comprehensive web-based Inventory Management System designed to create, classify, search, retain, and audit metadata records for physical assets across multiple entities, departments, and locations.

### Key Technologies
- **Frontend:** React 19 + Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Hook Form + Zod, Recharts.
- **Backend:** FastAPI (Python 3.13), SQLAlchemy 2.0 (async), Pydantic v2.
- **Database:** Supabase (PostgreSQL 15).
- **Security:** JWT Auth (HS256) with role-based access control (RBAC).

## Directory Structure
- `frontend/`: React single-page application.
- `backend/`: FastAPI application with async database integration.
- `docs/`: Project documentation and PRD.

## Building and Running

### 1. Backend Setup
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
python -m pip install -r requirements.txt

# Run migrations/initialize DB
# Copy content of backend/init_db.sql into Supabase SQL Editor and Run.

# Start the server
python -m uvicorn app.main:app --reload
```
**Important:** Update `backend/.env` with your Supabase password. Remove the `[]` brackets entirely.
`DATABASE_URL="postgresql+asyncpg://postgres.emywxyvirwuygohpjxus:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Implemented Features (100% PRD Compliance)
- **Authentication:** JWT-based login with RBAC (Admin, Auditor, User).
- **Master Data Management:** Full CRUD for Entities, Departments, Locations, and Hierarchical Categories.
- **Records Management:**
    - **Dynamic Form Engine:** Schema-based record types with custom fields, validation, and defaults.
    - **Taxonomy:** Hierarchical categories and multi-tag support.
    - **Auto-Classification:** Rules-based engine to automate record categorization.
    - **Import/Export:** Multi-step CSV import with mapping and Excel/PDF export.
- **Analytics & Reporting:**
    - **Custom Report Builder:** Dynamic grouping and date filtering for inventory insights.
    - **Scheduled Exports:** Automated background generation of reports via cron-based schedules.
- **Compliance & Security:** 
    - **Audit Trail:** Immutable, tamper-evident logs with SHA-256 cryptographic chaining.
    - **Audit Export:** Specialized CSV export for forensic audit analysis.
    - **Legal Holds:** One-click hold mechanism to suspend retention and block deletion.
    - **Versioning:** Full history of changes with point-in-time restoration.

## Development Conventions
- **Path Aliases:** Use `@/` for absolute imports in the frontend.
- **Backend structure:** Follow the `app/models`, `app/schemas`, `app/services` pattern.
- **Audit Logging:** Every write action must use the `audit_service.py`.
- **Type Safety:** Use `frontend/src/types/supabase.ts` for database-aware typing.

## Initial Credentials
- **Email:** `admin@spidersmart.com`
- **Password:** `admin123`
