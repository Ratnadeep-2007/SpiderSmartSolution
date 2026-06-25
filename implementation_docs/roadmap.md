# SpiderSmart Inventory Management System (IMS) — Future Roadmap

This document outlines the detailed backlog, technical requirements, database schemas, and implementation checklists for upcoming features of the SpiderSmart IMS.

---

## Phase 1: Semantic Search & Natural Language Query (NLQ)

### 1.1 Objective
Allow users to run query searches like "financial reports" and receive records containing "invoice statements" or "tax filings" using vector embedding similarities.

### 1.2 DB & Schema Requirements
* Enable `pgvector` extension in Supabase:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
* Ensure `inventory_records` contains the embedding column:
  ```sql
  ALTER TABLE public.inventory_records ADD COLUMN embedding vector(3072);
  ```

### 1.3 Implementation Checklist
- [ ] **Step 1: Embedding Model Setup**
  Configure API wrappers (Gemini Embeddings or OpenAI `text-embedding-3-small` / `text-embedding-3-large`) inside `backend/app/config.py`.
- [ ] **Step 2: Sync Trigger / Worker**
  Build a database function and trigger in PostgreSQL, or configure a background Celery/SQLAlchemy event listener to compute and update `embedding` vectors when a record's `description` is inserted or updated.
- [ ] **Step 3: Search Endpoint Refactor**
  Modify `backend/app/routers/search.py` to support combined search matching:
  - If query is normal text, fetch vector similarities using cosine distance (`<=>` operator in pgvector) and merge results with computed keyword FTS matches.
- [ ] **Step 4: Frontend UI Integration**
  Update `Records.tsx` search filters with a "Semantic Search" checkbox toggle.

---

## Phase 2: Dynamic Compliance & Compliance Agents

### 2.1 Digital Compliance Officer (DCO) Agent
An automated cron-scheduled agent that manages the physical retention schedules and disposals of physical records.

#### Checklist
- [ ] **Step 1: Scheduled Job Scheduler**
  Configure a background job inside `backend/app/scheduler.py` running daily.
- [ ] **Step 2: Retention Scanner**
  Scan `inventory_records` where `retention_due_date <= CURRENT_DATE` and `disposition_status = 'ACTIVE'` and `legal_hold = False`. Group due records by department.
- [ ] **Step 3: Manager Approval Flow**
  Draft disposal manifests and generate secure approval links (carrying signed JWTs). Email links to department managers.
- [ ] **Step 4: Disposal Execution**
  Upon receiving a valid signed manager approval callback, set `disposition_status = 'DISPOSED'` and `is_active = false`. Record a `BULK_DISPOSE` action in the cryptographically chained audit trail.

---

### 2.2 e-Discovery Case Investigator Agent
An agent designed to execute bulk legal holds and audit packaging when a legal inquiry is launched.

#### Checklist
- [ ] **Step 1: Case Workspace API**
  Create an endpoint `POST /ediscovery/cases` to initialize a legal hold case.
- [ ] **Step 2: Automated Query Scanning**
  Run semantic queries based on the case file guidelines to locate all matching inventory records.
- [ ] **Step 3: Bulk Legal Hold Locks**
  Set `legal_hold = True` and update `disposition_status = 'LEGAL_HOLD'` for all matched records.
- [ ] **Step 4: Tamper-Evident Forensic Archive**
  Generate a zip package containing:
  - All matched records data (CSV).
  - All historical audit chain logs relating to the records.
  - A cryptographic manifest signing the archive hashes.

---

## Phase 3: Data Harmonization & Spatial Upgrades

### 3.1 Data Harmonization Agent
Cleans and standardizes messy bulk imports dynamically using LLM classification matching.

#### Checklist
- [ ] **Step 1: Typo & Formatting Resolution**
  Parse uploaded CSV datasets and clean headers. Resolve common variations (e.g. standardizing `Fin`, `FINANCE`, `Finances` to the master department `Finance`).
- [ ] **Step 2: Validation Sandbox UI**
  Create a wizard UI inside `frontend/src/pages/Import.tsx` displaying matches, spelling discrepancies, date conflicts, and allowing manual edits before executing database insertions.

---

### 3.2 Warehouse Spatial Routing
Enables administrative layout mapping of box coordinates inside physical storage vaults.

#### Checklist
- [ ] **Step 1: Warehouse Models**
  Create schemas for layouts mapping warehouse zones, aisles, shelves, and bins.
- [ ] **Step 2: Layout Optimization Algorithm**
  Integrate pathing algorithms to recommend box storage locations that minimize retrieval travel times.
