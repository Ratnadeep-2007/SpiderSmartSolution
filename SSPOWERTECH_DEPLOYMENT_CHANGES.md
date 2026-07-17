# Configuration and Code Changes Log — sspowertech.net Deployment

This document logs all structural code modifications, configuration adjustments, and database seeding actions required to deploy and run the Inventory Management System backend on the cPanel server under the domain `https://sspowertech.net`.

---

## 📁 1. Modified Files and Code Changes

### A. [backend/passenger_wsgi.py](file:///E:/Skills/Webstack/Spider_internship/backend/passenger_wsgi.py)
* **Changes Made:**
  1. **Realpath Resolution:** Resolved infinite Passenger process execution loops on CloudLinux wrappers using `os.path.realpath` to dynamically identify Python and interpreter binaries, protected by a `_PASSENGER_REEXEC` environment flag.
  2. **Lazy Post-Fork Middleware Initialization:** Moved `a2wsgi.ASGIMiddleware` instantiation from the module level to dynamically inside the `application` callable. This ensures the ASGI loop background runner thread is created *after* Passenger forks child worker processes, preventing thread death deadlocks.
  3. **WSGI Request Body Memory Buffering:** Added raw buffering of the WSGI input stream (`wsgi.input`) into an in-memory `io.BytesIO` stream for `/login` and `/auth` routes to prevent `a2wsgi` body-reading hangs under LiteSpeed.
  4. **Dynamic Path Prefix Reconstruction:** Merged `SCRIPT_NAME` (e.g. `/api/v1`) prefix back into `PATH_INFO` and cleared `SCRIPT_NAME` at the WSGI entrypoint to align incoming paths with FastAPI router prefixes, resolving immediate 404 routing errors.
  5. **Reduced Wait Timeout:** Set `wait_time=3.0` inside `ASGIMiddleware` to force Python-level timeouts before LiteSpeed web server kills hanging processes.
  6. **Generator Error Handling Wrapper:** Created a custom `LoggingGenerator` wrapper to catch and log tracebacks of async iteration errors in `passenger_debug.log`.
  7. **Direct WSGI Health Check & DB Handshake Bypasses:** Configured direct WSGI intercept routes for `/health` and `/db-test` (running on fresh synchronous event loops) to bypass ASGI and database connection pooling to isolate errors.

### B. [backend/app/database.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/database.py)
* **Changes Made:**
  1. Imported `NullPool` from `sqlalchemy.pool`.
  2. Modified `create_async_engine` parameters to configure `poolclass=NullPool`. This prevents standard SQLAlchemy connection pooling (`QueuePool`) from retaining open database connections bound to dead request event loops under Phusion Passenger's recycled process context.

### C. [backend/app/main.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/main.py)
* **Changes Made:**
  1. Imported `Request` from `fastapi` and `JSONResponse` from `fastapi.responses`.
  2. Added a global `@app.exception_handler(Exception)` that catches all unhandled requests exceptions, formats the traceback, logs it to `passenger_debug.log`, and returns it directly in the JSON response payload.
  3. Relocated the definition of the `log_api_call` diagnostic helper function to the top of the file to resolve namespace scopes during initialization.

### D. [backend/app/schemas/master.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/schemas/master.py)
* **Changes Made:**
  1. Updated `EntityBase`'s validation rule for `entity_code` from `Field(..., pattern=r'^\d{2}$')` (strictly 2 numeric digits) to `Field(..., min_length=2, max_length=10)`.
  2. This aligns Pydantic serialization schemas with database seed values like `'EXP'` (Exprivia.IT) and `'GOO'` (Google), resolving `ResponseValidationError` crashes on `/master/entities` fetches.

### E. [backend/app/routers/auth.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/routers/auth.py)
* **Changes Made:**
  1. Added `log_auth` helper method pointing to the root `passenger_debug.log`.
  2. Injected step-by-step debug checkpoints (`Executing database query...`, `User search outcome...`, etc.) inside the `login_access_token` route function to trace hanging points.

---

## 🗄️ 2. Database Initialization and Seeding
To resolve schema outdates and authentication mismatches, the Supabase database was initialized and seeded:
* **Execution Script:** Run using a temporary script locally connecting to `aws-1-ap-southeast-2.pooler.supabase.com:5432`.
* **SQL Script applied:** [backend/init_db.sql](file:///E:/Skills/Webstack/Spider_internship/backend/init_db.sql) which:
  1. Wiped and re-created tables for `entity_types`, `entities`, `departments`, `locations`, `categories`, `users`, `records`, `audit_trail`, and `legal_holds`.
  2. Set up immutable cryptographically-chained triggers for audit trails.
  3. Seeded initial entities (`Spider Smart` -> `11`, `Exprivia.IT` -> `EXP`, `Google` -> `GOO`), departments, locations, and hierarchical categories.
  4. Seeded the primary administrator account: `admin@spidersmart.com` with `admin123` (hashed using `bcrypt`).

---

## ⚙️ 3. Environment Variables Settings

### A. Environment Configuration in cPanel Setup Python App
* **`DATABASE_URL`** ➔ `postgresql+asyncpg://postgres.emywxyvirwuygohpjxus:Deep%402007supabase@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres`
  * *Note:* The `@` symbol in the password (`Deep@2007supabase`) is URL-encoded as `%40` to prevent url parsing blocks where the host would resolve incorrectly as `2007supabase`.
* **`SECRET_KEY`** ➔ `development_secret_key_change_me_in_production`
* **`GEMINI_API_KEY`** ➔ `[Your Gemini API Key]`
* **`RUN_SCHEDULER`** ➔ `false`
  * *Note:* Explicitly set to `false` because background thread libraries (like APScheduler) block transient request loops under Phusion Passenger, triggering application termination.

---

## 🌐 4. Web Server Routing Configuration (`.htaccess`)
Configured directly inside the **`public_html/`** directory to force secure traffic and rewrite frontend requests:
```apacheconf
RewriteEngine On

# Force HTTPS redirect
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Redirect all requests to index.html unless it is a real file, directory, or API route
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api [NC]
RewriteRule ^(.*)$ /index.html [L]
```

---

## 🚀 5. Deployment Verification
The deployment is fully verified and confirmed functional:
* **Endpoint /api/v1/health (Direct WSGI Health Check):** Responding instantly.
* **Endpoint /api/v1/db-test (Direct WSGI Database handshake):** Responding instantly with `{"status": "db_test_ok", "result": 1}`.
* **Endpoint /api/v1/auth/login (POST Login):** Operates instantly with credentials verification and bearer token generation.
* **Dashboard Data Fetching (/api/v1/master/...):** All master details (departments, entity-types, record-types, categories, and entities) are successfully fetched and rendered in the React dashboard.
