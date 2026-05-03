# Supabase MCP Operation Guide — SpiderSmart IMS

This document provides instructions for using the Supabase MCP extension to manage the database and backend services for the SpiderSmart Inventory Management System.

## 1. Project Context
- **Project Name:** SpiderSmart IMS
- **Supabase Project Ref:** `emywxyvirwuygohpjxus`
- **Database:** PostgreSQL 15 (Managed via Supabase)
- **Primary Schema:** `public`
- **Virtual Environment:** Use `backend/venv/` for all backend tasks.

## 2. Initial Setup Workflow
If the database tables are not yet created, follow these steps:

### Step 1: Authentication
The Supabase MCP requires explicit user authentication for write operations. 
- **Action:** If you receive an "Unauthorized" or "Access token not provided" error, ask the user to authenticate their MCP server via the browser.

### Step 2: Schema Creation
The initial schema is defined in `backend/init_db.sql`.
- **Action:** Once authenticated, use the `execute_sql` tool to run the contents of `backend/init_db.sql`. 
- **Alternative:** If MCP auth persists as an issue, the user can manually run this script in the Supabase Dashboard SQL Editor.

## 3. Mandatory Workflow: Schema Changes
All future schema modifications (CREATE, ALTER, DROP) MUST follow this tracked migration workflow:

1.  **Inspection:** Use `list_tables` to check existing relations.
2.  **Apply Migration:** Use `apply_migration` to execute tracked SQL changes (always prefix with `public.`).
3.  **Audit:** Run `get_advisors` to identify RLS gaps or missing indexes.
4.  **Local Sync:** Run `npx supabase migration fetch --yes` in the project root.
5.  **Type Gen:** Run `npx supabase gen types --linked > src/types/supabase.ts` in the `frontend` folder.

## 4. Data Operations
Use `execute_sql` for:
- **SELECT:** Debugging and research.
- **INSERT:** Seeding data (e.g., initial Admin user).

## 5. Security Guardrails
- **RLS:** Mandatory for all tables in `public`.
- **Soft Deletes:** Records must use `is_active = false` instead of `DELETE` where possible.
- **Audit Logs:** Never manually modify the `audit_logs` table.

## 6. Troubleshooting Known Issues
- **Backend 500 Errors:** Usually caused by missing dependencies in the `venv` or missing `__init__.py` files. I have fixed these, but always ensure you are running within the `backend/venv`.
- **Relation not found:** Ensure `public.` prefix is used.
- **CORS:** Check `backend/app/config.py` if frontend requests are blocked.
