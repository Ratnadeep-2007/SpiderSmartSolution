# Tasjeel.ae DNS Configuration Guide

This guide explains how to point and configure your custom domain **`aquaverseuae.ae`** (registered with Tasjeel.ae) to various cloud hosting platforms (Vercel, Netlify, or Firebase).

---

## 🛠️ Accessing your DNS Zone Manager
Before configuring any records, you must access the DNS editor inside your Tasjeel account:
1. Log in to your **Tasjeel.ae Portal** (`https://my.tasjeel.ae`).
2. Go to **My Domains** and click **Manage Domain** next to **`aquaverseuae.ae`**.
3. In the sidebar or tabs, click on **DNS Zone Manager** (or **Manage DNS Zone / DNS Records**).
4. Remove any conflicting pre-existing `A` or `CNAME` records pointing `@` and `www` to older servers.

---

## 📋 DNS Record Configuration Tables

Choose the appropriate DNS settings depending on where your frontend is deployed:

### Option A: Pointing to Vercel
Use these settings if you deploy the frontend React app to Vercel:

| Host / Name | Record Type | Value / Destination | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| `@` *(or leave blank)* | **A** | `76.76.21.21` | `3600` | Vercel's global IP address |
| `www` | **CNAME** | `cname.vercel-dns.com` | `3600` | Vercel's canonical name |

> [!NOTE]
> Once records propagate, go to your Vercel Dashboard ➔ **Settings** ➔ **Domains**, add `aquaverseuae.ae`, and select **Redirect www.aquaverseuae.ae to aquaverseuae.ae**.

---

### Option B: Pointing to Netlify
Use these settings if you deploy the frontend React app to Netlify:

| Host / Name | Record Type | Value / Destination | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| `@` *(or leave blank)* | **A** | `75.2.60.5` | `3600` | Netlify's load balancer IP |
| `www` | **CNAME** | `your-netlify-subdomain.netlify.app` | `3600` | Replace with your actual Netlify URL |

> [!NOTE]
> Once records propagate, go to your Netlify Dashboard ➔ **Site configuration** ➔ **Domain management** ➔ **Custom domains** and add `aquaverseuae.ae`.

---

### Option C: Pointing to Firebase Hosting
Firebase requires a two-step validation process:

#### Step 1: Verification (Add Temporary TXT Record)
| Host / Name | Record Type | Value / Destination | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| `@` *(or leave blank)* | **TXT** | *[Verification string from Firebase]* | `3600` | Proves domain ownership |

#### Step 2: Point Traffic (Add Two A Records)
Delete any old A and CNAME records, then add both Firebase IPs:

| Host / Name | Record Type | Value / Destination | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| `@` | **A** | *[First IP from Firebase]* | `3600` | Firebase Hosting Server 1 |
| `@` | **A** | *[Second IP from Firebase]* | `3600` | Firebase Hosting Server 2 |

---

## 🔍 How to Verify DNS Propagation
You can check if your records have updated using command line tools:

* **Verify A Record:**
  ```bash
  nslookup aquaverseuae.ae
  ```
* **Verify CNAME Record:**
  ```bash
  nslookup -type=cname www.aquaverseuae.ae
  ```
* **Verify TXT Record:**
  ```bash
  nslookup -type=txt aquaverseuae.ae
  ```
