@echo off
setlocal EnableDelayedExpansion
title Renvo AI — Startup

echo.
echo  ================================================================
echo   RENVO AI — Intelligent Data Cleaning Platform
echo  ================================================================
echo.

:: ── Check Python ────────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found.
    echo  Please install Python 3.11 from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo  [OK] Python %PY_VER% found.

:: ── Check Node.js ───────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found.
    echo  Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found.

:: ── Ask for Groq API Key ────────────────────────────────────────────────────
echo.
if defined GROQ_API_KEY (
    echo  [OK] GROQ_API_KEY is already set in environment.
) else (
    echo  ----------------------------------------------------------------
    echo   Groq API Key Required
    echo   Get your free key at: https://console.groq.com/
    echo  ----------------------------------------------------------------
    set /p GROQ_API_KEY= Enter your Groq API key: 
    if "!GROQ_API_KEY!"=="" (
        echo.
        echo  [WARN] No API key entered. AI Assistant will not work,
        echo         but all other features will function normally.
        echo.
    ) else (
        echo  [OK] API key accepted.
    )
)

:: ── Create virtual environment ──────────────────────────────────────────────
echo.
if not exist "venv\Scripts\activate.bat" (
    echo  [SETUP] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  [OK] Virtual environment created.
) else (
    echo  [OK] Virtual environment already exists.
)

:: ── Activate virtual environment ────────────────────────────────────────────
call venv\Scripts\activate.bat

:: ── Install Python dependencies ─────────────────────────────────────────────
echo.
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo  [SETUP] Installing Python dependencies (first run, please wait)...
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo  [ERROR] Failed to install Python dependencies.
        echo  Try running manually: pip install -r requirements.txt
        pause
        exit /b 1
    )
    echo  [OK] Python dependencies installed.
) else (
    echo  [OK] Python dependencies already installed.
)

:: ── Install Node dependencies ───────────────────────────────────────────────
echo.
if not exist "frontend\node_modules" (
    echo  [SETUP] Installing Node.js dependencies (first run, please wait)...
    cd frontend
    call npm install --silent
    if errorlevel 1 (
        echo  [ERROR] Failed to install Node.js dependencies.
        pause
        exit /b 1
    )
    cd ..
    echo  [OK] Node.js dependencies installed.
) else (
    echo  [OK] Node.js dependencies already installed.
)

:: ── Build React frontend ────────────────────────────────────────────────────
echo.
if not exist "frontend\dist\index.html" (
    echo  [SETUP] Building React frontend (first run, please wait)...
    cd frontend
    call npm run build
    if errorlevel 1 (
        echo  [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
    cd ..
    echo  [OK] Frontend built successfully.
) else (
    echo  [OK] Frontend build already exists.
)

:: ── Start the application ───────────────────────────────────────────────────
echo.
echo  ================================================================
echo   Starting Renvo AI...
echo   Open your browser at: http://localhost:5000
echo   Press Ctrl+C to stop the server.
echo  ================================================================
echo.

python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000

pause
