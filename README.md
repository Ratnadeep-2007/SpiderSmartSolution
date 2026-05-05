# Spider Smart Solution — Inventory Management System (IMS)

## Project Overview
A comprehensive web-based Inventory Management System designed to create, classify, search, retain, and audit metadata records for physical assets across multiple entities, departments, and locations.

### Key Features
- **Authentication:** JWT-based login and session persistence.
- **Dashboard:** KPIs and activity feed.
- **Records Management:** Detailed metadata tracking and list views.
- **Compliance:** Immutable audit logs and tamper-evident hashing.
- **Versioning:** Automated snapshotting of record changes.

## Key Technologies
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** FastAPI (Python 3.13), SQLAlchemy 2.0 (async), Pydantic v2.
- **Database:** Supabase (PostgreSQL 15).
- **Security:** JWT Auth (HS256) with role-based access control (RBAC).

## Directory Structure
- `backend/`: FastAPI application, models, schemas, and services.
- `frontend/`: React single-page application.
- `docs/`: Project documentation and PRD.
- `supabase/`: Local Supabase configurations and migrations.

## Getting Started

> **Note for Contributors:** For a faster, step-by-step setup guide using shared credentials, please refer to [SETUP_GUIDE.md](./SETUP_GUIDE.md).

### 1. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
4. **Configure Environment Variables:**
   Update `backend/.env` with your Supabase database URL. Ensure the password is correctly placed and brackets are removed.
5. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Initial Credentials
Use these default administrator credentials to log in:
- **Email:** `admin@spidersmart.com`
- **Password:** `admin123`

## Development Conventions
- **Path Aliases:** Use `@/` for absolute imports in the frontend.
- **Audit Logging:** Every write action must be recorded through the `audit_service.py`.
- **Type Safety:** Refer to `frontend/src/types/supabase.ts` for database schemas.
