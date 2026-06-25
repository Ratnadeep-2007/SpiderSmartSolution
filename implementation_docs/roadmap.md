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
  ALTER TABLE public.inventory_records ADD COLUMN embedding vector(768);
  ```

### 1.3 Implementation Checklist
- [x] **Step 1: Embedding Model Setup**
  `embedding_service.py` — Gemini `text-embedding-004` API wrapper (768-dim output) with `get_embedding()`, `update_record_embedding()`, `backfill_embeddings()`.
- [x] **Step 2: Sync Trigger / Worker**
  `scheduler.py` — `run_embedding_backfill` job runs every 30 minutes via APScheduler, catching new/updated records missing embeddings.
- [x] **Step 3: Search Endpoint Refactor**
  `search_service.py` — `semantic=True` query param triggers cosine distance ordering via pgvector `<=>` operator, falls back to FTS on embedding failure.
- [x] **Step 4: Frontend UI Integration**
  `Records.tsx` — "Enable AI Semantic Search" checkbox toggle wired to `?semantic=true` URL param.

---

## Phase 2: Dynamic Compliance & Compliance Agents

### 2.1 Digital Compliance Officer (DCO) Agent

#### Checklist
- [x] **Step 1: Scheduled Job Scheduler**
  `scheduler.py` — `run_dco_sweep` cron job runs nightly at 3:00 AM.
- [x] **Step 2: Retention Scanner**
  `dco_service.py` — `run_dco_agent()` scans `retention_due_date <= today`, `disposition_status=ACTIVE`, `legal_hold=False`. Groups records by department.
- [x] **Step 3: Manager Approval Flow**
  `dco_service.py` — `generate_approval_token()` creates HMAC-SHA256 signed tokens with 7-day expiry. `GET /api/v1/dco/approve?token=...` endpoint handles callbacks.
- [x] **Step 4: Disposal Execution**
  `dco_service.py` — `execute_bulk_disposal()` verifies token, sets `disposition_status=DISPOSED` + `is_active=false`, writes `BULK_DISPOSE` to cryptographic audit chain.

---

### 2.2 e-Discovery Case Investigator Agent

#### Checklist
- [x] **Step 1: Case Workspace API**
  `routers/ediscovery.py` — `POST /ediscovery/cases` initializes a named case with keywords, description, and status tracking.
- [x] **Step 2: Automated Query Scanning**
  `ediscovery_service.py` — `scan_and_apply_hold()` runs `ilike` keyword scan across description, entity, department fields. `POST /ediscovery/cases/{id}/scan-and-hold`.
- [x] **Step 3: Bulk Legal Hold Locks**
  Sets `legal_hold=True` + `disposition_status=LEGAL_HOLD` for all matched records. Writes `EDISCOVERY_BULK_HOLD` audit log.
- [x] **Step 4: Tamper-Evident Forensic Archive**
  `ediscovery_service.py` — `generate_ediscovery_zip()` produces: `inventory_metadata.csv`, per-record JSON files, `audit_chain.csv` (full history), `manifest.json` (SHA-256 hashes of every file + archive integrity hash). `POST /ediscovery/cases/{id}/export-zip`.

---

## Phase 3: Data Harmonization & Spatial Upgrades

### 3.1 Data Harmonization Agent

#### Checklist
- [x] **Step 1: Typo & Formatting Resolution**
  `harmonization_service.py` — LLM-powered (Gemini) harmonizer resolves entity/department name variations, fixes date formats, standardizes casing. Falls back to rule-based fuzzy matching if no API key.
- [x] **Step 2: Validation Sandbox UI**
  `Import.tsx` — 4-step wizard: Upload → Map Fields → **Harmonize** (AI diff review with per-field manual override) → Result. "Harmonize with AI" button triggers preview; user reviews corrections before committing.

---

### 3.2 Warehouse Spatial Routing

#### Checklist
- [x] **Step 1: Warehouse Models**
  `models/warehouse.py` — Full spatial hierarchy: `Warehouse → WarehouseZone → WarehouseAisle → WarehouseShelf → WarehouseBin`. Each bin optionally linked to an `inventory_record`.
- [x] **Step 2: Layout Optimization Algorithm**
  `warehouse_service.py` — `recommend_bin()` scores empty bins using Euclidean distance to entry point + department clustering proximity weight. Returns ranked recommendations. Frontend at `/warehouse` shows the interactive layout tree + recommendation widget.
