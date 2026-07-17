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
# IMPORTANT: If you are seeing 500 errors on login, the database schema is likely outdated.
# Copy the updated content of backend/init_db.sql into Supabase SQL Editor and Run it.
# This will WIPE and RECREATE the tables with the correct schema.
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

## AI Copilot & Semantic Capabilities
The application integrates frontier generative AI to automate physical record discovery and metadata governance.

### 1. Model Architecture
* **Primary LLM:** Gemini 2.5 Pro (via Google AI Studio). The backend uses an automatic model cascade fallback (`gemini-2.5-pro` -> `gemini-1.5-pro` -> `gemini-2.5-flash` -> `gemini-1.5-flash`) to guarantee system liveness.
* **Semantic Search:** Uses `text-embedding-004` (768 dimensions) to rank records based on cosine distance similarity inside PostgreSQL using `pgvector`.
* **Tool Calling:** Powered by native Gemini Function Calling. The LLM executes structured DB queries, fetches context, and returns formatted responses.

### 2. High-Fidelity UI Interface
* **Inline Markdown Parser:** Custom React engine renders headers, bold font, lists, and code blocks directly inside chat bubbles without risk of XSS.
* **Structured Record Cards:** Real-time search matches are rendered as visual cards showing barcode copy buttons, hold/disposition badges, metadata summaries, and inline hold controls.
* **Audit History Cards:** Displays transaction logs with actor details and a green cryptographic verification lock (*SHA-256 Verified*).

### 3. Extreme Task Examples
* **Multi-Turn Joint Lookups:**
  * *Prompt:* "Find any active boxes for HR stored in Room 4."
  * *Action:* Copilot retrieves department and location IDs, searches inventory tables, and prints record cards.
* **Permission-Gated Write Actions:**
  * *Prompt:* "Place box BOX-SEM-1A2B on legal hold due to the 2025 financial audit."
  * *Action:* Copilot intercepts the write intent, structures a proposal payload, and displays a confirmation sheet with "Confirm" and "Cancel" buttons.
* **Forensic Verification:**
  * *Prompt:* "Show me the edit history for record FIL-SEM-C92A."
  * *Action:* Copilot scans PostgreSQL audit tables, verifies the cryptographic SHA-256 hash chains, and shows the verified history.

## Development Conventions
- **Path Aliases:** Use `@/` for absolute imports in the frontend.
- **Backend structure:** Follow the `app/models`, `app/schemas`, `app/services` pattern.
- **Audit Logging:** Every write action must use the `audit_service.py`.
- **Type Safety:** Use `frontend/src/types/supabase.ts` for database-aware typing.

## Initial Credentials
- **Email:** `admin@spidersmart.com`
- **Password:** `admin123`
