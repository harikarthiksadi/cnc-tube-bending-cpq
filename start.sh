#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo "🚀 Starting CNC Tube Bending CPQ System"
echo "=================================================="

# 1. Check or set up Python virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
    echo "Installing backend dependencies..."
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r backend/requirements.txt
fi

# 2. Check if frontend distribution exists, build if missing
if [ ! -f "frontend/dist/index.html" ]; then
    if command -v npm &> /dev/null; then
        echo "Building frontend production bundle..."
        (cd frontend && npm install && npm run build)
    else
        echo "⚠️ Node/npm not found. Frontend dist bundle must be present."
    fi
fi

# 3. Check if server is already running on port 8000
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Server is already running on port 8000!"
else
    echo "Starting FastAPI backend on http://localhost:8000..."
    # Run uvicorn using project virtual environment
    cd backend
    ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    UVICORN_PID=$!
    cd ..
    
    # Wait for server to become responsive
    echo "Waiting for server to initialize..."
    for i in {1..15}; do
        if curl -s http://localhost:8000 >/dev/null; then
            break
        fi
        sleep 0.5
    done
fi

echo "=================================================="
echo "🌐 CNC Tube CPQ is LIVE at: http://localhost:8000"
echo "=================================================="

# 4. Open default browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:8000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8000"
    fi
fi

echo "Press Ctrl+C to stop the server."

# Keep alive if we spawned uvicorn
if [ ! -z "$UVICORN_PID" ]; then
    trap "kill $UVICORN_PID 2>/dev/null || true; exit 0" INT TERM
    wait $UVICORN_PID
fi
