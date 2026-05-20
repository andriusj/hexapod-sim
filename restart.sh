#!/bin/bash

echo "========================================="
echo "     Restarting Hexapod Simulator (Mac)"
echo "========================================="

echo ""
echo "Stopping existing instances on ports 8000 and 4200..."
# Find and kill any process using port 8000 (Backend)
lsof -ti:8000 | xargs kill -9 2>/dev/null
# Find and kill any process using port 4200 (Frontend)
lsof -ti:4200 | xargs kill -9 2>/dev/null

echo ""
echo "Starting Backend (FastAPI)..."
osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'/backend-sim\" && source venv/bin/activate && uvicorn main:app --reload"'

echo "Starting Frontend (Angular)..."
osascript -e 'tell app "Terminal" to do script "cd \"'"$(pwd)"'/frontend-3d\" && npm start"'

echo ""
echo "Both services have been started in new Terminal windows!"
echo "Backend is running at http://localhost:8000"
echo "Frontend is running at http://localhost:4200"
echo "========================================="
