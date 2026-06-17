#!/bin/bash
set -e

# Build React frontend
echo "Building React frontend..."
cd /home/runner/workspace/frontend
npm run build
echo "Frontend build complete."

# Start FastAPI on port 5000 (serves API + React static files)
echo "Starting FastAPI on port 5000..."
cd /home/runner/workspace
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000
