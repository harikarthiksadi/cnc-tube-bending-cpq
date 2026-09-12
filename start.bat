@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo Starting CNC Tube Bending CPQ System
echo ==================================================

if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    echo Installing backend dependencies...
    .venv\Scripts\pip install --upgrade pip
    .venv\Scripts\pip install -r backend\requirements.txt
)

echo Starting backend server on http://localhost:8000...
cd backend
start "" ..\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000
cd ..

timeout /t 2 /nobreak >nul
start http://localhost:8000

echo CNC Tube CPQ is running at http://localhost:8000
echo ==================================================
