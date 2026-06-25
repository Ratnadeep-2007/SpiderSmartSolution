# SpiderSmart Inventory Management System (IMS) — Memory Ledger

This document tracks the current implementation progress, design decisions, architectural agreements, and operational settings for the SpiderSmart IMS project.

---

## 1. System Implementation Status Matrix

The following matrix lists all functional requirements, security mechanisms, compliance systems, and AI modules, outlining exactly what has been completed (**[DONE]**) and what is pending (**[REMAINING]**):

| Feature / Module | Type | Description | Status | Relevant Files |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | Core Security | JWT-based login (HS256) with roles: System Admin, Records Manager, Knowledge Worker, Auditor, and External Guest (with scoped filters). | **[DONE]** | `auth.py`, `dependencies/`, `Login.tsx` |
| **Master Data Management** | Core Function | Full CRUD operations for Entities, Departments, Locations, and Category Trees. | **[DONE]** | `master.py`, `AdminMaster.tsx`, `AdminClassification.tsx` |
| **Inventory Records Management** | Core Function | Schema-based inventory records CRUD, metadata inputs, and custom fields store. | **[DONE]** | `records.py`, `Records.tsx`, `RecordDetail.tsx` |
| **Audit Trails & Chaining** | Compliance | Cryptographically chained log history using SHA-256 (`tamper_hash`). Includes a forensic check validator. | **[DONE]** | `audit_service.py`, `verify_db.py`, `Audit.tsx` |
| **Point-in-Time Versioning** | Compliance | Version history logs on record updates. Allows point-in-time state restoration in UI. | **[DONE]** | `record_versions` model, `RecordDetail.tsx` |
| **Scheduled Reports & Builder** | Analytics | Dynamic custom report compiler. Background cron scheduler outputs Excel/PDF files. | **[DONE]** | `reports.py`, `scheduler.py`, `schedules.py`, `Reports.tsx` |
| **CSV Bulk Importer** | Analytics | Multi-step mapping interface, header validation, and bulk insert endpoint. | **[DONE]** | `import_records.py`, `Import.tsx` |
| **IMS Copilot Drawer UI** | AI Interface | Modern sliding chat drawer with context statistics navigation cards. | **[DONE]** | `Copilot.tsx` |
| **Dual-LLM Router** | AI Backend | NVIDIA NIM router with automated Google Gemini 1.5 Flash fallback. | **[DONE]** | `routers/copilot.py` |
| **Action Proposals Confirmation** | Safety | AI proposals interceptor prompting explicit confirmation before write operations. | **[DONE]** | `routers/copilot.py`, `Copilot.tsx` |
| **Offline Fallback Engine** | Resiliency | Regex command parser, stats QA, and SQL `ilike` fuzzy search when API keys are absent. | **[DONE]** | `routers/copilot.py` |
| **Auto-Classification Rules** | ML & Logic | Automated categorization and tagging based on description conditions. | **[DONE]** | `classification_service.py`, `AdminClassification.tsx` |
| **Rule Simulation Preview** | ML & Logic | Live debounced simulation preview showing match count and descriptions before saving. | **[DONE]** | `classification_service.py`, `AdminClassification.tsx` |
| **Retroactive Rule Applier** | ML & Logic | Manual toggle to apply rules retroactively to existing database records. | **[DONE]** | `classification_service.py` |
| **Semantic Search & NLQ** | AI Upgrade | Similarity search matching via `pgvector` embeddings. | **[DONE]** | `embedding_service.py`, `search_service.py`, `Records.tsx` |
| **Dynamic Compliance Advisor** | AI Upgrade | RAG-based legal compliance advisor checking federal/state retention schedules. | **[REMAINING]** | Tracked in [roadmap.md](file:///E:/Skills/Webstack/Spider_internship/implementation_docs/roadmap.md) |
| **Digital Compliance Officer Agent**| Agentic Workflow| Automated cron agent scanning database, sending JWT sign-off manifests, and deleting records. | **[DONE]** | `dco_service.py`, `routers/dco.py`, `scheduler.py` |
| **e-Discovery Case Investigator**| Agentic Workflow| Gathers litigation records, tags legal holds, and exports cryptographic ZIP package. | **[DONE]** | `ediscovery_service.py`, `routers/ediscovery.py`, `EDiscovery.tsx` |
| **Data Harmonization Agent** | Agentic Workflow| Cleans bulk uploads, corrects typos, flags schema anomalies, and suggests standard categories. | **[DONE]** | `harmonization_service.py`, `routers/harmonization.py`, `Import.tsx` |
| **Warehouse Layout Mapping** | Structural | Aisle, rack, and shelf structural layout mapping algorithms. | **[DONE]** | `models/warehouse.py`, `warehouse_service.py`, `routers/warehouse.py`, `Warehouse.tsx` |
| **Pre-Disposition Approvals** | Compliance | Multi-stage manager sign-off workflows before record destruction. | **[DONE]** | `dco_service.py` (HMAC-signed approval tokens + `/dco/approve` callback) |

---

## 2. Key Design Decisions & Architectural Patterns

* **Cached Metadata Strings:** `inventory_records` stores both ID references (e.g. `entity_id`) and cached text values (e.g. `entity = 'Spider Smart'`). This allows rapid search calculations without joining multiple master tables.
* **Generated TSVECTOR:** PostgreSQL generated columns dynamically compute search vectors from cached strings. A GIN index over `search_vector` ensures text search runs in sub-millisecond durations.
* **JWT Guest Restriction:** External guests receive limited JWTs carrying `scoped_filters` (e.g., entity limitations). FastAPI dependency injects these filters directly into SQLAlchemy query constructs.
* **Fail-Safe Assistant Routing:** Strict response timers (`12s` on Nvidia, `10s` on Gemini) trigger quick fallbacks. If both providers time out or return errors, the app defaults to the offline local regex engine.

---

## 3. Useful Operational Context

### Project Identifiers
* **Supabase Project Ref:** `emywxyvirwuygohpjxus`
* **Production Website URL:** `https://sspowertech.net/`
* **Production API Base URL:** `https://api.sspowertech.net/api/v1`

### Default Credentials
* **Developer Admin Login:**
  * **Email:** `admin@spidersmart.com`
  * **Password:** `admin123`

### Main Configuration Paths
* **Database URL Env:** `backend/.env` -> `DATABASE_URL` (requires Supabase transaction pooler link)
* **AI Provider Keys:** `backend/.env` -> `GEMINI_API_KEY`, `NVIDIA_API_KEY`
* **Custom Frontend Port:** Runs on default `localhost:5173` via Vite.
