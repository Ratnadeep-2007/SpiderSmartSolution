@echo off
title SpiderSmart IMS - Startup Manager
color 0B
cls

echo =======================================================================
echo          SPIDERSMART INVENTORY MANAGEMENT SYSTEM (IMS)
echo                        STARTUP MANAGER
echo =======================================================================
echo.

:: Check for backend virtual environment
if not exist "backend\venv\Scripts\activate.bat" (
    color 0C
    echo [ERROR] Python virtual environment not found in backend\venv.
    echo Please set up the backend virtual environment first by running:
    echo   cd backend
    echo   python -m venv venv
    echo   .\venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: Check for frontend node_modules
if not exist "frontend\node_modules\" (
    color 0E
    echo [WARNING] node_modules not found in frontend\.
    echo Attempting to install frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

echo [INFO] Starting Backend Services...
start "SpiderSmart IMS - Backend API" cmd /k "cd backend && call .\venv\Scripts\activate && echo [BACKEND] Starting FastAPI server on http://localhost:8000... && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [INFO] Starting Frontend Dev Server...
start "SpiderSmart IMS - React Frontend" cmd /k "cd frontend && echo [FRONTEND] Starting Vite Dev Server... && npm run dev"

echo.
echo [INFO] Waiting for services to initialize...
timeout /t 4 /nobreak > nul

echo [INFO] Opening SpiderSmart IMS in default browser...
start http://localhost:5173

echo.
echo =======================================================================
echo  Services started successfully in separate windows!
echo  - Backend API:    http://localhost:8000/docs (Swagger UI)
echo  - React Frontend: http://localhost:5173
echo.
echo  Keep this window open or close it. The service windows will remain active.
echo =======================================================================
echo.
pause
