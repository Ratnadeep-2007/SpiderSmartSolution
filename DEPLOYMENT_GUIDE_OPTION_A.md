# 100% Complete Deployment Guide: React Frontend (Vercel/Netlify) & cPanel Backend

This guide contains the comprehensive, step-by-step instructions to deploy your React (Vite) frontend to **Vercel** or **Netlify** under the domain **`https://aquaverseuae.ae`** (registered with Tasjeel.ae) and connect it to your FastAPI backend hosted on cPanel under **`https://sspowertech.net`**.

---

## 📈 Deployment Status Tracker
* [x] **Prerequisites**: Done.
* [x] **Step 1: Save & Commit Local Configurations**: Completed.
* [x] **Step 2: Deploy Frontend on Vercel**: Completed! Vercel project created and deployed.
* [x] **Step 3: Point Domain in Tasjeel.ae (DNS Settings)**: Completed! Records configured in Tasjeel.
* [ ] **Step 4: Bind Custom Domain in Vercel**: **In Progress** 🚀 (Waiting for global DNS propagation & binding in Vercel dashboard).
* [x] **Step 5: Verify Backend & Environment Variables (cPanel)**: Completed! Backend is healthy and online at `https://sspowertech.net/health`.

---

## 📋 Table of Contents
1. [Prerequisites Checklist](#1-prerequisites-checklist)
2. [Step 1: Save & Commit Local Configurations](#2-step-1-save--commit-local-configurations)
3. [Step 2: Deploy Frontend on Vercel or Netlify](#3-step-2-deploy-frontend-on-vercel-or-netlify)
4. [Step 3: Point Domain in Tasjeel.ae (DNS Settings)](#4-step-3-point-domain-in-tasjeelae-dns-settings)
5. [Step 4: Bind Custom Domain in Vercel/Netlify](#5-step-4-bind-custom-domain-in-vercelnetlify)
6. [Step 5: Verify Backend Configuration (cPanel)](#6-step-5-verify-backend-configuration-cpanel)
7. [🔍 Troubleshooting & Common Issues](#-troubleshooting--common-issues)

---

## 1. Prerequisites Checklist
Before starting, ensure you have:
* [ ] Login credentials for your **Tasjeel.ae** account.
* [ ] A free account on **Vercel** (vercel.com) or **Netlify** (netlify.com).
* [ ] Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket) OR Node.js installed locally to run a manual command-line upload.
* [ ] The FastAPI backend running successfully on cPanel at `https://sspowertech.net/api/v1` (verify that accessing `https://sspowertech.net/api/v1/health` in a browser returns `{"status": "healthy"}`).

---

## 2. Step 1: Save & Commit Local Configurations

Ensure the following configuration files are set up in your local workspace:

### A. Environment Configuration
Open or create [frontend/.env.production](file:///E:/Skills/Webstack/Spider_internship/frontend/.env.production) and write:
```env
VITE_API_BASE_URL=https://sspowertech.net/api/v1
```

### B. Router Support Configuration
* **For Vercel**: Verify that the file [frontend/vercel.json](file:///E:/Skills/Webstack/Spider_internship/frontend/vercel.json) exists with:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
* **For Netlify**: Verify that the file [frontend/public/_redirects](file:///E:/Skills/Webstack/Spider_internship/frontend/public/_redirects) exists with:
  ```text
  /*    /index.html   200
  ```

### C. Commit and Push Changes
Open your terminal/command prompt and run these commands to push the configurations to your Git repository:
```bash
# Navigate to the project root directory
cd E:\Skills\Webstack\Spider_internship

# Add the new configurations
git add frontend/.env.production
git add frontend/vercel.json
git add frontend/public/_redirects

# Commit the files
git commit -m "Configure production env and SPA routing for Vercel/Netlify deployment"

# Push to your remote repository (replace 'main' with your branch name if different)
git push origin main
```

---

## 3. Step 2: Deploy Frontend on Vercel or Netlify

Choose **either** Vercel or Netlify to host your frontend:

### Option 2A: Deploying on Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com/) and log in.
2. Click the **Add New...** dropdown button in the top right and select **Project**.
3. Under **Import Git Repository**, find your repository and click **Import**.
4. Configure the Project Settings:
   * **Framework Preset**: Select `Vite` (Vercel usually autodetects this).
   * **Root Directory**: Click *Edit* and select the `frontend` folder, then click *Continue*.
   * **Build and Output Settings**: Keep default settings (`npm run build` and `dist` output).
   * **Environment Variables**: Expand this section and add:
     * **Key**: `VITE_API_BASE_URL`
     * **Value**: `https://sspowertech.net/api/v1`
5. Click **Deploy**.
6. Wait 1–2 minutes. Once finished, you will receive a preview domain (e.g., `https://spider-ims.vercel.app`).

---

### Option 2B: Deploying on Netlify
1. Go to [app.netlify.com](https://app.netlify.com/) and log in.
2. Click **Add new site** > **Import an existing project**.
3. Choose your Git provider (GitHub/GitLab) and authorize Netlify.
4. Select your repository.
5. Configure Build settings:
   * **Branch to deploy**: `main` (or your production branch name).
   * **Base directory**: `frontend`
   * **Build command**: `npm run build`
   * **Publish directory**: `frontend/dist`
6. Click **Add environment variables**:
   * **Key**: `VITE_API_BASE_URL`
   * **Value**: `https://sspowertech.net/api/v1`
7. Click **Deploy site**. Once built, copy your Netlify subdomain (e.g., `https://example-site.netlify.app`).

---

## 4. Step 3: Point Domain in Tasjeel.ae (DNS Settings)

You must configure the DNS settings on Tasjeel.ae so the domain redirects request traffic to your frontend host's servers.

1. Log in to your **Tasjeel.ae Portal** (`https://my.tasjeel.ae`).
2. Go to **My Domains** and click **Manage Domain** next to **`aquaverseuae.ae`**.
3. On the sidebar/tabs, look for **DNS Zone Manager** (or **Manage DNS Zone / DNS Records**).
4. Update or add the following records:

### ⚠️ IMPORTANT: Choose the Records Based on Your Hosting Platform

#### If you deployed on Vercel:
1. **Root A Record**:
   * **Name/Host**: `@` *(or leave blank / use your domain)*
   * **Type**: `A`
   * **Value/Destination**: `76.76.21.21` (This is Vercel's global IP address)
   * **TTL**: `3600` (or default)
2. **WWW CNAME Record**:
   * **Name/Host**: `www`
   * **Type**: `CNAME`
   * **Value/Destination**: `cname.vercel-dns.com`
   * **TTL**: `3600`

#### If you deployed on Netlify:
1. **Root A Record**:
   * **Name/Host**: `@` *(or leave blank)*
   * **Type**: `A`
   * **Value/Destination**: `75.2.60.5` (This is Netlify's load balancer IP)
   * **TTL**: `3600`
2. **WWW CNAME Record**:
   * **Name/Host**: `www`
   * **Type**: `CNAME`
   * **Value/Destination**: `your-netlify-subdomain.netlify.app` (replace with your actual netlify URL)
   * **TTL**: `3600`

5. Save the DNS changes. 

> [!NOTE]
> DNS propagation can take anywhere from **5 minutes to 2 hours** to update worldwide.

---

## 5. Step 4: Bind Custom Domain in Vercel/Netlify

Once you pointed the DNS records, you need to tell your hosting dashboard to listen for the custom domain.

### On Vercel:
1. Open your project on Vercel, go to **Settings** (top tab) > **Domains** (left menu).
2. Enter `aquaverseuae.ae` and click **Add**.
3. Vercel will ask if you want to add the `www` redirect as well. Select the **Redirect www.aquaverseuae.ae to aquaverseuae.ae** (recommended) or add both.
4. Vercel will show `Valid Configuration` once the DNS records propagate. It will automatically generate a free Let's Encrypt SSL security certificate.

### On Netlify:
1. Go to your site dashboard > **Site configuration** > **Domain management** > **Custom domains**.
2. Click **Add custom domain**.
3. Type `aquaverseuae.ae` and click **Verify** > **Add domain**.
4. Scroll down to the **HTTPS** section and click **Verify DNS** / **Provision Certificate** to trigger Let's Encrypt SSL configuration.

---

## 6. Step 5: Verify Backend Configuration & Environment Variables (cPanel)

Your backend is currently hosted on `https://sspowertech.net`. Since the frontend will now run on `https://aquaverseuae.ae`, the browser will make Cross-Origin requests.

### A. CORS Configuration
Your backend's API configuration handles cross-origin requests automatically. The middleware in [backend/app/main.py](file:///E:/Skills/Webstack/Spider_internship/backend/app/main.py) uses:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Accepts requests from any frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Because `allow_origins=["*"]` is active, the cPanel backend will successfully respond to requests coming from `https://aquaverseuae.ae`. You do not need to make changes to CORS.

### B. Environment Variables (.env) Setup on cPanel
When deploying a Python FastAPI app on cPanel (which uses Phusion Passenger), uploading a `.env` file directly to the backend folder is **supported but can sometimes fail** because Passenger runs processes with a different working directory. 

To ensure your environment variables are loaded 100% of the time, follow these instructions:

#### Method 1: The Automated Way (Updated `passenger_wsgi.py` - Recommended)
We updated the startup script [backend/passenger_wsgi.py](file:///E:/Skills/Webstack/Spider_internship/backend/passenger_wsgi.py) to explicitly load your `.env` file using its absolute path at startup.
1. Upload the updated `passenger_wsgi.py` file to your backend directory on cPanel (replacing the old one).
2. Upload your `.env` file in the same backend directory.
3. Restart your Python application from the cPanel interface. Passenger will now successfully read your `.env` file regardless of the starting working directory!

#### Method 2: The GUI Way (cPanel Python App Settings - Safest Fallback)
If you prefer not to rely on the `.env` file being read from the filesystem, you can define the variables directly in cPanel:
1. Log in to cPanel and open the **Setup Python App** interface.
2. Click the **Edit** icon (pencil) next to your running backend application.
3. Scroll down to the **Environment variables** section.
4. Click **Add Variable** and input the keys and values from your `.env` file (e.g. `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`).
5. Click **Save** and then click the **Restart** button at the top of the Setup Python App page.

---

## 🔍 Troubleshooting & Common Issues

### 1. "Mixed Content" Errors (HTTPS vs HTTP)
* **Problem**: When loading `https://aquaverseuae.ae`, you get a blank page or login fails, and the browser console says: `Mixed Content: The page at 'https://aquaverseuae.ae' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint...`
* **Fix**: Ensure your `VITE_API_BASE_URL` in `.env.production` starts with `https://` and **NOT** `http://`. All requests must be securely routed.

### 2. "404 Not Found" when Reloading Pages
* **Problem**: The login page works, but if you navigate to `/records` and click refresh (or type the URL directly), you get a Vercel/Netlify 404 error page.
* **Fix**: Ensure that either `vercel.json` (for Vercel) or `_redirects` (for Netlify) was uploaded correctly to the root of your published files. If using Git, verify these files exist at the top level of the built output.

### 3. DNS Configuration Showing "Invalid Configuration" in Hosting Dashboard
* **Problem**: Vercel/Netlify displays a warning that DNS records are not pointed correctly.
* **Fix**:
  1. DNS changes can take up to 2 hours. Wait a few minutes and click "Refresh" in the dashboard.
  2. Check Tasjeel.ae to ensure no conflicting `A` or `CNAME` records exist. Delete any pre-existing parking records or other IP pointers pointing to older servers for the `@` and `www` hostnames.
