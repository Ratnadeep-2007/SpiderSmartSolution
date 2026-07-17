# Complete Deployment Guide: Hosting on sspowertech.net (cPanel)

This guide provides step-by-step instructions to configure, build, and deploy your React (Vite) frontend and FastAPI backend entirely on your cPanel account under the domain **`https://sspowertech.net`**.

---

## 📈 Deployment Status Tracker
This section tracks the live status of the deployment:

* [x] **Frontend env configuration:** Done.
* [x] **Build React App locally:** Done.
* [x] **Upload Frontend to cPanel:** Done (static files extracted directly inside `public_html/`).
* [x] **Create client-side routing (`.htaccess`):** Done (successfully verified on cPanel).
* [x] **Upload Backend source code:** Done (uploaded to `/home/sspowertechnet/backend/`).
* [x] **Create `.env` file on cPanel:** Done.
* [x] **Setup Python App in cPanel:** Done (mapped to `/api/v1`).
* [x] **Install Python Dependencies (`pip install`):** Done.
* [x] **Supabase Database Seeding:** Done (Supabase was wiped and re-seeded using `init_db.sql`).
* [x] **Resolve Phusion Passenger infinite re-exec loops:** Done (fixed in `passenger_wsgi.py` via `os.path.realpath` resolution).
* [x] **Resolve Event Loop connection pool deadlocks:** Done (configured SQLAlchemy with `NullPool` in `database.py`).
* [x] **Resolve Database DNS lookup failures:** Done (removed space character in the `DATABASE_URL` environment variable).
* [x] **Resolve LiteSpeed WSGI request body hangs:** Done (implemented raw body memory buffering of `wsgi.input` in `passenger_wsgi.py`).
* [x] **Resolve Phusion Passenger routing mismatches (404s):** Done (merged `SCRIPT_NAME` prefix into `PATH_INFO` dynamically inside `passenger_wsgi.py`).
* [x] **Resolve Pydantic response validation errors (500s on /entities):** Done (relaxed validation on `entity_code` in `app/schemas/master.py` to allow alphanumeric codes `'EXP'` and `'GOO'`).
* [x] **Capture Async/ASGI generator exceptions:** Done (reduced `wait_time` to `3.0` seconds in `ASGIMiddleware` and wrapped response iterable with a custom `LoggingGenerator` in `passenger_wsgi.py`).
* [x] **Verify Database & API Performance:** Done (Direct WSGI connection test and all API routes successfully verified and operational!).
* [x] **Application Verification:** **100% COMPLETE & VERIFIED.** The application is fully live, login is operational, and all dashboard database queries are fetching data successfully!

---

## 🏗️ Architectural Overview
By hosting both layers on your cPanel server, you eliminate CORS complexity and run both components on the same domain:

* **Frontend Location:** Placed directly in `public_html/` (the root web directory). Served by Apache/LiteSpeed web server.
* **Backend Location:** Managed via **cPanel Setup Python App** (using Phusion Passenger + `a2wsgi` wrapper). Mapped to `/api/v1`.
* **Database Connection:** Backend connects directly to your remote Supabase PostgreSQL database.

---

## 🛠️ Step-by-Step Deployment Process

### Step 1: Configure Frontend Environment Variables
1. Open or create [frontend/.env.production](file:///E:/Skills/Webstack/Spider_internship/frontend/.env.production) in your local editor.
2. Ensure the base URL points to the backend API hosted on `sspowertech.net`:
   ```env
   VITE_API_BASE_URL=https://sspowertech.net/api/v1
   ```

### Step 2: Build the React Application Locally
1. Open your terminal, navigate to the `frontend` folder, and compile the production build:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

### Step 3: Compress and Upload Frontend to cPanel
1. Compress the contents of the `frontend/dist/` folder into a ZIP archive (e.g., `dist.zip`).
2. Log in to your **cPanel Dashboard** and open the **File Manager**.
3. Navigate to **`public_html`**.
4. Upload and extract `dist.zip` directly in `public_html/`.

### Step 4: Setup Client Routing with `.htaccess`
To support React Router (client-side routing) so that hitting refresh on subpages like `/login` does not throw a cPanel `404 Not Found` error:
1. In the `public_html/` directory, open or create **`.htaccess`**.
2. Add the following rewrite configuration:
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

## ⚙️ Backend Verification & Debugging History

Your backend API is configured to run under cPanel using **Phusion Passenger**. During deployment, several major infrastructure limitations were encountered and solved:

### 1. Phusion Passenger Infinite Loop Bug
* **Symptom:** The server would hang indefinitely during startup, printing thousands of lines of "Passenger Startup Initiated" in `passenger_debug.log`.
* **Cause:** cPanel wrapper intercepts `sys.executable` and resolves it dynamically. Standard `os.execl` loop checks got stuck in an infinite chain.
* **Fix:** Rewrote [passenger_wsgi.py](file:///E:/Skills/Webstack/Spider_internship/backend/passenger_wsgi.py) to resolve the real path of the Python interpreter using `os.path.realpath` and protected it with a startup environment flag guard (`_PASSENGER_REEXEC`).

### 2. Asyncpg / SQLAlchemy Event Loop Deadlock
* **Symptom:** Hitting `/health` or `/login` would hang, eventually timing out.
* **Cause:** standard SQLAlchemy connection pooling (`QueuePool`) retains open connections tied to the request-specific event loop of whichever request first triggered database access. Subsequent requests running on different event loops would hang or raise a loop mismatch error.
* **Fix:** Updated [app/database.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/database.py) to use `NullPool`, forcing connections to open and close cleanly within every request lifecycle.

### 3. Database DNS Resolution Failure (Space Typo)
* **Symptom:** App loaded but returned `500 Internal Server Error` on database queries.
* **Cause:** The `DATABASE_URL` environment variable inside cPanel contained an accidental space typo: `'aws-1-ap-southeast-2.pooler.supabase. com'`.
* **Fix:** Dynamically parsed the hostname inside `passenger_wsgi.py` on startup to trigger a TCP handshake test, immediately logging the typo and guiding its removal.

### 4. LiteSpeed WSGI Request Body Hangs
* **Symptom:** `POST` requests to `/auth/login` hung indefinitely (LiteSpeed Request Timeout), while `GET` requests to `/health` responded instantly.
* **Cause:** Under LiteSpeed Web Server, the WSGI input stream (`wsgi.input`) behaves blocking/differently than standard WSGI servers, causing `a2wsgi`'s background reader loop to hang waiting for an EOF when parsing request bodies.
* **Fix:** Implemented an intercept inside `passenger_wsgi.py` that reads the request body at the raw WSGI level, buffers it inside a memory-backed `io.BytesIO` stream, and replaces the `environ['wsgi.input']` before passing the request to `a2wsgi` and FastAPI.

### 5. Phusion Passenger Routing Mismatches (404s)
* **Symptom:** The `/api/v1/auth/login` endpoint returned `404 Not Found` instantly, even though it was declared correctly.
* **Cause:** cPanel strips the mapped application URL prefix (`/api/v1`) from the path and places it in `SCRIPT_NAME`, leaving only the subpath (`/auth/login`) in `PATH_INFO`. Because FastAPI expects the full prefix inside the request path, the route matching failed.
* **Fix:** Merged `SCRIPT_NAME` prefix back into `PATH_INFO` dynamically inside the WSGI callable in `passenger_wsgi.py`.

### 6. Pydantic Response Validation Errors (500s)
* **Symptom:** Visiting the dashboard after a successful login failed on `GET /api/v1/master/entities` with a Pydantic Validation Error.
* **Cause:** The schema for `Entity` expected a strictly 2-digit `entity_code` (`pattern=r'^\d{2}$'`), but database seed values were 3-letter alphanumeric codes (`'EXP'` and `'GOO'`).
* **Fix:** Relaxed the validation pattern constraint in [app/schemas/master.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/schemas/master.py) to allow alphanumeric strings from 2 to 10 characters.

---

## 🔍 Troubleshooting & Verification Checklist

To test and confirm that the deployment is fully operational:

### 1. Direct WSGI Health Check
* **URL:** `https://sspowertech.net/api/v1/health`
* **Expected Response:** `{"status": "healthy_direct_wsgi"}`
* **Verification:** Confirms the Python process is alive and responding within milliseconds.

### 2. Direct WSGI Database connection test
* **URL:** `https://sspowertech.net/api/v1/db-test`
* **Expected Response:** `{"status": "db_test_ok", "result": 1}`
* **Verification:** Confirms that the backend can connect to Supabase, authenticate, and successfully execute SQL queries on the remote server.

### 3. Application Auth Routing
* **URL:** `https://sspowertech.net/api/v1/auth/login` (POST)
* **Expected Response:** JSON web token (`Bearer`) on success.
* **Verification:** Confirms that form body parsing, database query routing, and password hashing (`bcrypt`) work successfully in the event loop.
