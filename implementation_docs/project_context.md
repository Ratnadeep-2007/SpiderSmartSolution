# SpiderSmart Inventory Management System (IMS) — Project Context

This document provides a comprehensive technical overview, architectural details, feature specs, and directory layouts of the SpiderSmart IMS project. It serves as the primary context documentation for developer agents and AI systems to fully understand and build upon this application.

---

## 1. Project Overview & Business Goals
The **SpiderSmart Inventory Management System (IMS)** is a secure, web-based metadata repository and tracking engine for physical assets (boxes, individual files, digital media, etc.) across multiple corporate entities, departments, and locations. 

The primary business goals are:
* **Asset Tracking & Metadata Management:** Create, structure, search, classify, and retain metadata records for physical assets.
* **Compliance & Data Integrity:** Provide an immutable, cryptographically chained audit trail (SHA-256) of all data modifications to prevent silent tamper attempts.
* **Legal Holds & Retention Scheduling:** Automated or manual legal holds to freeze record retention schedules and prevent accidental or malicious destruction of records.
* **AI-Assisted Operations (IMS Copilot):** Enable knowledge workers and administrators to query, create, tag, or hold assets using natural language with built-in human-in-the-loop approvals.
* **Master Data Synchronization & Rules:** Automate metadata classification via rule engines, simulations, and retroactive cleaners.

---

## 2. Technology Stack & Key Dependencies

### Frontend (React Single Page Application)
* **Framework & Tooling:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (fully accessible component library based on Radix UI) + [Lucide React](https://lucide.dev/) (icons)
* **State Management:** [Zustand](https://docs.pmnd.rs/zustand) (lightweight, reactive global store)
* **Forms & Validation:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) for compile-time and runtime validation.
* **Analytics/Charts:** [Recharts](https://recharts.org/) for KPI reports and analytics visualizations.
* **HTTP Client:** [Axios](https://axios-http.com/) with configured interceptors for token attachment and routing.
* **Notifications:** [Sonner](https://github.com/emilkowalski/sonner) (Toast notifications).

### Backend (FastAPI Python Application)
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (running on Python 3.13)
* **Server:** [Uvicorn](https://www.uvicorn.org/) (ASGI server)
* **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async Engine with `asyncpg`)
* **Migrations:** [Alembic](https://alembic.sqlalchemy.org/) for database schema migrations.
* **Authentication:** Stateless JWT Authentication (`HS256` hashing signature) using [PyJWT](https://pyjwt.readthedocs.io/).
* **Hashing & Security:** [Passlib](https://passlib.readthedocs.io/) with `bcrypt` for secure user password storage.
* **Report Generation:** [WeasyPrint](https://weasyprint.org/) (converting HTML templates to compliant PDF documents).

### Database & Storage
* **Provider:** [Supabase](https://supabase.com/)
* **Engine:** [PostgreSQL 15](https://www.postgresql.org/)
* **Key PostgreSQL Features:**
  * **Full-Text Search:** Computed column `search_vector tsvector` (english syntax) indexed via `GIN (search_vector)` for sub-millisecond keyword matches.
  * **pgvector:** Extends database for semantic search embeddings (`embedding vector(3072)` column on records).
  * **Relational Integrity:** Foreign keys referencing master tables with cascade/set null rules.

---

## 3. Comprehensive Feature Set

### 3.1 Authentication & RBAC (Role-Based Access Control)
State-of-the-art JWT authentication with authorization levels:
1. **`SYSTEM_ADMIN`:** Full read/write access to user records, master schemas, classification rules, inventory entries, and retention policies.
2. **`RECORDS_MANAGER`:** Full records CRUD, category configurations, CSV import/export, and retention modifications.
3. **`KNOWLEDGE_WORKER`:** Standard CRUD for records (creation, editing, tags, category changes). Restrained from legal holds, disposal changes, and administrator panels.
4. **`AUDITOR`:** Read-only access. Full audit logging trail inspection and forensic exports.
5. **`EXTERNAL_GUEST`:** Ephemeral access with automatically enforced scopes (e.g. only seeing files belonging to a specific entity or department) and token expiry.

### 3.2 Master Data Management (MDM)
A relational framework structuring record attributes:
* **Entities:** Companies/divisions owning the assets (e.g., `Spider Smart` (code `11`), `Exprivia.IT` (code `EXP`)).
* **Departments:** Sub-groups linked to specific entities (e.g., `Finance`, `R&D`, `IT Support`).
* **Locations:** Physical warehouse storage points (e.g., `Aisle A4 / Shelf 3`).
* **Record Types:** Structural schemas defining physical boxes, files, or magnetic media with dynamic custom field definitions (fields store data in JSON format).

### 3.3 Dynamic Form Engine & Taxonomy
* **Schema-Based Records:** Different record types (like "Physical Box" vs "Digital Media") render dynamic input components configured in `record_type_fields` (validation patterns, dropdown enums, default values).
* **Taxonomy & Tags:** Multi-tier nested category trees (`categories` table supporting `parent_id` structures) and flat color-coded tagging arrays.

### 3.4 Auto-Classification Rules Engine
A background and manual automation suite:
* **Condition Evaluator:** Matches metadata attributes (such as description `contains`, `equals`, or `starts_with`) to automatically categorize records or append tags.
* **Keyword Pattern Discovery:** Scans untagged/uncategorized records and extracts the top 10 most recurring terms using frequency extraction algorithms.
* **Simulation Sandbox:** Let's administrators pre-run rules over the database to preview match count and sample record descriptions before deployment.
* **Retroactive Rules Applier:** Deploys rules instantly to all existing uncategorized records in PostgreSQL.

### 3.5 Analytics, Scheduled Reports & CSV Imports
* **Dashboard KPIs:** Dynamic counts of active records, legal holds, items due for disposition, and latest logs.
* **Custom Report Builder:** Dynamic filters for Record Date, Record Type, Entities, and Departments with Excel and PDF outputs.
* **Scheduled Exports:** Cron-like schedules that generate csv/pdf files in the background and write executions to `schedule_logs`.
* **CSV Bulk Import:** Mapping tool with step-by-step headers parsing, validation, and database ingestion.

### 3.6 Compliance & Cryptographic Audit Trails
* **Chained Audit Logs:** Every database modification inserts a log entry into `audit_logs` containing the changed fields, performing user, timestamp, and IP.
* **Tamper-Evident SHA-256 Chaining:** Each record's `tamper_hash` is computed as:
  $$\text{tamper\_hash} = \text{SHA256}(\text{record\_id} + \text{action} + \text{changes\_json} + \text{previous\_hash})$$
  This forms a cryptographic blockchain. If any previous log is modified or deleted, the hash chain breaks, immediately exposing tamper attempts during audits.
* **Legal Holds:** Activating a legal hold on a record flags it as frozen (`legal_hold = True`). This suppresses all retention calculations and denies any attempts to update or delete the record.
* **Versioning:** The system takes JSON snapshots of records upon modification. Users can review history in the UI and execute point-in-time restorations.

### 3.7 AI Copilot Assistant & Fallbacks
A dual-provider LLM interface integrated as a drawer:
* **Nemotron/Gemini Router:** Connects to NVIDIA NIM (`nemotron-3-ultra`) or falls back to Google Gemini (`gemini-1.5-flash`) based on credential availability and speed.
* **Safe Write Proposals:** When the user requests a database modification (like tagging or holding records), the LLM generates a structured JSON block proposal. The backend parses and intercept it, returning a pending proposal. The frontend prompts the user to explicitly confirm or deny the action before execution.
* **Offline Fallback Engine:** If no LLM keys are supplied, the Copilot handles natural language commands using regex queries, fuzzy database filters (`ilike`), and direct shorthand inputs (e.g. `hold [barcode] [reason]`).

---

## 4. Repository & Directory Structure
```
SpiderSmartSolution/
├── backend/                       # FastAPI Server Application
│   ├── app/
│   │   ├── dependencies/          # Security dependencies, role checks, database scopes
│   │   ├── models/                # SQLAlchemy database models
│   │   ├── routers/               # Endpoint routers (Auth, Copilot, Audit, Master, Records, etc.)
│   │   ├── schemas/               # Pydantic validation schemas
│   │   ├── services/              # Core business services (Audit, Classification, Search, Reports)
│   │   ├── config.py              # Application settings and environment variables loader
│   │   ├── database.py            # Async engine and session local configuration
│   │   ├── main.py                # FastAPI app lifecycle initializer and CORS middlewares
│   │   └── scheduler.py           # Scheduled reports cron manager
│   ├── migrations/                # Alembic database migration files
│   ├── init_db.sql                # Complete schema DDL and seeding scripts for Supabase
│   ├── requirements.txt           # Python application dependencies list
│   └── passenger_wsgi.py          # Production deployment script (e.g., CPanel integration)
├── frontend/                      # React Single Page Application (Vite + TS)
│   ├── src/
│   │   ├── assets/                # Images and static assets
│   │   ├── components/            # UI components, Copilot drawer, protected routes, layout
│   │   ├── hooks/                 # Custom React hooks (theme, context)
│   │   ├── lib/                   # Shared utility modules (Axios API wrappers, helpers)
│   │   ├── pages/                 # Full Page components (Dashboard, Records, Audit, Admin Panels)
│   │   ├── store/                 # Zustand global stores (auth, settings)
│   │   ├── types/                 # TypeScript typings (Supabase database mappings)
│   │   ├── App.tsx                # Client routes and context wrappers configuration
│   │   └── main.tsx               # DOM entry point
│   ├── package.json               # Frontend dependencies and npm script bindings
│   └── vite.config.ts             # Vite server and path alias configs
├── implementation_docs/           # Consolidated project documentation
│   ├── project_context.md         # Current technical context and layouts
│   ├── memory.md                  # State matrix, milestones, and credentials ledger
│   └── roadmap.md                 # Technical checklists for upcoming features
└── docs/                          # Specifications and design plans
    └── superpowers/
        ├── plans/                 # Detailed implementation execution plans
        └── specs/                 # Architecture design specs
```

---

## 5. Database Schema & Relations

### Users Table (`users`)
* Primary identification table storing authentication credentials, scope restrictions, and activity flags.
* `scoped_filters` (JSONB) defines guest limitations, e.g., restricting queries to `{"entity": "Spider Smart"}`.

### Master Data Tables
* **`entities`**: Linked to `entity_types` (foreign key `entity_type_id`). Holds unique entity codes.
* **`departments`**: Child of `entities` (foreign key `entity_id` cascading delete).
* **`locations`**: Storage zones.
* **`retention_policies`**: Maps retention durations (years).

### Inventory Records (`inventory_records`)
* Core data entity. Contains foreign keys to `record_types`, `entities`, `departments`, `entity_types`, `categories`, and `retention_policies`.
* Caches string details of `entity`, `department`, `location`, `entity_type`, and `entity_code` directly for rapid full-text search matching without complex joins.
* **Barcodes:** `box_barcode` and `file_barcode` are unique, indexed strings.
* **FTS search vector:** Generated computed column matching:
  ```sql
  to_tsvector('english', description || entity || department || location || box_barcode || file_barcode)
  ```
* **pgvector Embeddings:** `embedding vector(3072)` for natural language semantic query calculations.

### Supporting Audit & Audit Chaining
* **`record_versions`**: Stores JSON snapshots of records (`snapshot`) on updates, referencing user changes.
* **`audit_logs`**: Logs actions. Stores current changes (JSONB) along with `tamper_hash` and `previous_hash` for blockchain validation.

---

## 6. Deployment & Environments

The application is configured to deploy both on local development servers and custom shared-hosting environments like cPanel:

### 6.1 Backend cPanel WSGI Adaptation
* **WSGI Wrapper:** Since FastAPI is an ASGI application and cPanel Phusion Passenger primarily expects WSGI entrypoints, the project includes [passenger_wsgi.py](file:///E:/Skills/Webstack/Spider_internship/backend/passenger_wsgi.py) which adapts the FastAPI app using `a2wsgi.ASGIMiddleware` (`a2wsgi==1.10.8`).
* **cPanel Configuration:** Set "Application startup file" to `passenger_wsgi.py`, "Application Entry point" to `application`, and "Python version" to `3.10` or higher.
* **Production database URL:** Configured in `backend/.env` with `DATABASE_URL` targeting Supabase transaction poolers on AWS over port 5432.

### 6.2 Frontend SPA Routing Rewrite
* **URL Rewrite (.htaccess):** React Router relies on client-side routing. To prevent `404 Not Found` errors when refreshing routes on Apache-based hosting like cPanel, a custom `frontend/public/.htaccess` rewrites all non-file/non-directory hits back to `/index.html`:
  ```apacheconf
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  ```

---

## 7. Conventions, Security Guardrails & Guidelines
* **Row-Level Security (RLS):** All tables in the Supabase public schema MUST have RLS policies enabled and verified. Audit trails are immutable and must not be altered manually.
* **Soft Deletes:** Deletion requests should favor soft deletes (`is_active = false`) over hard SQL `DELETE` operations where audit records depend on relational entities.
* **Absolute Imports:** Use path alias `@/` for imports inside `frontend/src/` to prevent relative import path clutter.
* **Async Backend:** Every FastAPI endpoint and database service query **must** use asynchronous operations (`async def`, `await db.execute`).
* **Audit Enforcement:** Every backend write or delete transaction must execute audit creation via the `audit_service.py` functions to secure database integrity.
* **Shared DB Precaution:** When working with the development database, respect that changes affect other developers connected to the same AWS Supabase pool (`emywxyvirwuygohpjxus`).
* **Roadmap References:** For checklists of upcoming feature implementations (Semantic Search, Compliance Agents, Warehouse Mapping), see [roadmap.md](file:///E:/Skills/Webstack/Spider_internship/implementation_docs/roadmap.md).
