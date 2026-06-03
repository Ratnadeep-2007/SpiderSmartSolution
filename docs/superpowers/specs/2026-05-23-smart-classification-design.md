# Design Spec: Smart Classification Workspace

**Date:** 2026-05-23
**Topic:** Automating record classification via pattern discovery, live simulation, and retroactive application.

## 1. Overview
The **Smart Classification Workspace** is an enhancement to the existing Admin Classification module. It reduces the manual effort required to organize large inventories by suggesting rules based on data patterns, providing a real-time "simulation" of rule impact, and allowing for retroactive cleanup of the entire database.

## 2. Core Features

### 2.1 Pattern Discovery Bar
- **Description:** A UI component that identifies frequently occurring keywords in unclassified records.
- **Logic:** The backend will provide an endpoint `/master/classification/discover` that performs a word-frequency count on the `description` field of records where `category_id` is null.
- **UI:** A horizontal list of "chips" (e.g., `Invoice (120)`, `Contract (85)`) at the top of the Classification page.
- **Action:** Clicking a chip initializes the "Rule Builder" with that keyword as the condition.

### 2.2 Rule Builder & Live Simulator
- **Description:** A dual-pane interface for creating rules with immediate visual feedback.
- **Left Pane:** A form to define Rule Name, Condition (Field, Operator, Value), and Action (Set Category, Add Tags).
- **Right Pane (Live Preview):** 
    - As the user types in the "Value" field, the UI debounces and calls `/master/classification/simulate`.
    - Returns the **total count** of records that would be affected and a **sample list** (top 5-10) of matching record descriptions.
- **Benefit:** Eliminates "guesswork" and prevents destructive or over-broad rules.

### 2.3 Retroactive Application Engine
- **Description:** A toggle on the "Save Rule" dialog to apply the new logic to existing data.
- **Options:**
    1. "Apply to new records only" (Standard behavior).
    2. "Apply to all existing matching records" (Retroactive).
- **Execution:** 
    - If "Retroactive" is chosen, the backend performs a bulk update on the `inventory_records` table.
    - A single high-level Audit Log entry is created: `BULK_CLASSIFY` with a count of modified records.

## 3. Technical Architecture

### 3.1 Backend (FastAPI)
- **New Endpoints:**
    - `GET /master/classification/discover`: Returns top 10 keywords from unclassified records.
    - `POST /master/classification/simulate`: Accepts condition params, returns count and sample records.
- **Modified Endpoints:**
    - `POST /master/classification-rules`: Add `apply_retroactive: bool` to payload. If true, triggers a background task to update existing records.

### 3.2 Frontend (React)
- **Component:** `AdminClassification.tsx` refactor.
- **State Management:** Use `useEffect` to fetch discovery data on load. Use a debounced state for simulation calls.
- **UI Components:** Use existing `shadcn/ui` components (Cards, Tables, Badges) to maintain consistency.

## 4. Success Criteria
1. Admin can see "top keywords" immediately upon opening the Classification page.
2. Admin can see exactly which records will be affected *while* they are drafting a rule.
3. Saving a rule with "Retroactive" enabled successfully updates categories/tags for 100+ existing records in one operation.
4. All changes are logged in the Audit Trail.

## 5. Security & Performance
- **Simulation Limits:** The simulation endpoint will `LIMIT` results to 10 for the preview to ensure low latency.
- **Bulk Update Safety:** Retroactive updates will only target records where the field being updated (e.g., `category_id`) is currently `NULL`, preventing accidental overrides of manual work.
- **Auth:** Only `SYSTEM_ADMIN` role can access the discovery and bulk update features.
