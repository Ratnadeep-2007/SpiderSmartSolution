# cPanel Deployment Guide: Spider Smart Solution - IMS (sspowertech.net)

This document describes the exact steps and configurations required to deploy the **Inventory Management System (IMS)** on your cPanel hosting environment for **https://sspowertech.net/**.

---

## Part 1: Summary of Required Changes (Completed in Codebase)

1. **Backend - `backend/passenger_wsgi.py` (Created):**
   * **Purpose:** Converts the FastAPI ASGI application into a WSGI application using the `a2wsgi` adapter so it can run on cPanel's **Phusion Passenger** server.
2. **Backend - `backend/requirements.txt` (Updated):**
   * **Purpose:** Includes `a2wsgi==1.10.8` to ensure compilation on cPanel.
3. **Frontend - `frontend/public/.htaccess` (Created):**
   * **Purpose:** Rewrites all incoming traffic to `index.html` to support React Router's single-page-application (SPA) client-side routing.

---

## Part 2: Step-by-Step Deployment Steps

### Phase A: Deploying the Backend API (FastAPI)

#### 1. Upload Backend Files
* Zip the [backend/](file:///E:/Skills/Webstack/Spider_internship/backend) folder on your local computer.
  > [!IMPORTANT]
  > Exclude the `venv/` folder from the ZIP to keep the file size small and prevent folder conflicts.
* In cPanel, open **File Manager**.
* Navigate to your home folder: `/home/<your-cpanel-username>/` (one level above `public_html`).
* Click **Upload**, select your backend zip file, and upload it.
* Select the uploaded zip file and click **Extract**. This will create the folder:
  `/home/<your-cpanel-username>/backend`

#### 2. Create the Python App in cPanel
* Search for **"Setup Python App"** in cPanel.
* Click **Create Application**.
* Configure the following exact settings:
  * **Python Version:** Select `3.10` or higher.
  * **Application root:** Enter `backend`
  * **Application URL:** Select `api.sspowertech.net` (or `sspowertech.net/api`).
  * **Application startup file:** `passenger_wsgi.py`
  * **Application Entry point:** `application`
  * **Passenger log file:** Enter `passenger.log`
* Click **Create**.

#### 3. Install Dependencies (GUI Method if Terminal is disabled)
* In the **Setup Python App** configuration panel, scroll down to the **Configuration files** (or **Requirements**) section.
* In the text input field, type exactly:
  ```text
  requirements.txt
  ```
* Click the **Add** button.
* Click the **Run Pip Install** button that appears.
* Wait 1–3 minutes for the dependency installation to complete successfully.

#### 4. Configure Environment Variables via `.env` file
Because cPanel's environment variable interface is often unreliable on shared hosting, configure the app using a local `.env` file instead:
* In cPanel **File Manager**, click **Settings** (top right corner).
* Check the box for **"Show Hidden Files (dotfiles)"** and click **Save**.
* Navigate into `/home/<your-cpanel-username>/backend/`.
* If a file named **`.env`** does not exist, click **+ File** (top left), name it `.env`, and create it.
* Select `.env` and click **Edit**. Paste these exact lines:
  ```env
  PROJECT_NAME="SpiderSmart IMS"
  API_V1_STR="/api/v1"
  SECRET_KEY="8f7b764c5fb5a0f1d07c08287e07a3c75d4090b8f2c3d115e4ef864817454e60"
  ALGORITHM="HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES=480
  DATABASE_URL="postgresql+asyncpg://postgres.emywxyvirwuygohpjxus:Deep%402007supabase@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
  ALLOWED_ORIGINS=["https://sspowertech.net", "https://www.sspowertech.net"]
  AUDIT_LOG_READ_EVENTS=false
  ```
* Click **Save Changes** and close the editor.

#### 5. Restart the Python App
* Go back to cPanel's **Setup Python App** interface and click **Restart** at the top of the page.
* Verify the backend is up by visiting `https://api.sspowertech.net/health` (or `https://sspowertech.net/api/health`). You should see:
  ```json
  {"status":"healthy"}
  ```

---

### Phase B: Deploying the Frontend (React / Vite)

#### 1. Configure the API Production Base URL
* Open [.env.production](file:///E:/Skills/Webstack/Spider_internship/frontend/.env.production) on your local computer.
* Update `VITE_API_BASE_URL` to point to your backend endpoint:
  ```env
  VITE_API_BASE_URL=https://api.sspowertech.net/api/v1
  ```

#### 2. Build the Frontend Locally
* Open your local terminal, navigate to the `frontend/` directory, and run:
  ```bash
  npm run build
  ```
* This outputs a `dist/` directory containing all your production static assets, including `dist/index.html` and `dist/.htaccess`.

#### 3. Upload to cPanel
* Zip the contents **inside** the `frontend/dist/` directory (select all files inside the folder, do not zip the `dist` folder itself).
* In cPanel **File Manager**, navigate to the document root of your site:
  * For `https://sspowertech.net/`, open the **`public_html`** folder.
* Click **Upload**, select the zipped frontend files, and upload them.
* Extract the zip folder. Make sure the files (`index.html`, `.htaccess`, and the `assets/` folder) are directly in the `public_html/` folder.

---

## Part 3: Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **500 Internal Server Error** | Passenger startup failure or Database connection timeout | Check `/home/<your-cpanel-username>/backend/passenger.log` for Python tracebacks. Make sure the `.env` file contains the correct `DATABASE_URL` and port `5432` or `6543` is whitelisted on your host. |
| **404 Not Found on Route Refresh** | `.htaccess` is missing in `public_html/` | Verify that `.htaccess` was uploaded to `public_html/`. Make sure hidden files are enabled in File Manager so you can see it. |
| **Network Error / CORS Issue** | Allowed origins are misconfigured | Check the `ALLOWED_ORIGINS` setting inside `/home/<your-cpanel-username>/backend/.env` and verify it contains your exact site URL including the protocol (`https://`). |
