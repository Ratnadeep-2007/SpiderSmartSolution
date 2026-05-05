# Complete Cloning & Setup Guide (Fast Setup)

Welcome to the Spider Smart Solution Inventory Management System (IMS). This guide covers the quick setup process using the pre-configured `.env` file provided privately.

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
* **Git:** To clone the repository.
* **Node.js (v18+):** Required to run the frontend.
* **Python (v3.13):** Required to run the backend.

---

## Step 1: Clone the Repository

Open your terminal and run the following command:

```bash
git clone https://github.com/your-username/spider-internship.git
cd spider-internship
```

---

## Step 2: Configure Environment Variables

1. Obtain the **two** `.env` files provided privately (e.g., via WhatsApp):
   - **Backend `.env`**: Copy this into the `backend/` directory.
   - **Frontend `.env`**: Copy this into the `frontend/` directory (Rename it to `.env` if it was sent as `.env.production`).

   *Paths should be:*
   - `spider-internship/backend/.env`
   - `spider-internship/frontend/.env`

---

## Step 3: Backend Setup & Run

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   * **Windows:**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **Mac/Linux:**
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
4. Start the backend server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   *The backend is now running at `http://127.0.0.1:8000`*

---

## Step 4: Frontend Setup & Run

1. Open a **new terminal window** and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend server:
   ```bash
   npm run dev
   ```
   *The frontend is now running at `http://localhost:5173`*

---

## Step 5: Log In

Since you are using the shared database, the data is already initialized. Log in with the credentials provided to you:
- **Default Admin Email:** `admin@spidersmart.com`
- **Default Admin Password:** `admin123`

**Note:** You are connecting to a shared database. Any changes you make (creating, editing, or deleting records) will be reflected for all users connected to this database.
