#!/bin/bash

echo "========================================="
echo "     Restarting Hexapod Simulator (Mac)"
echo "========================================="

echo ""
echo "Checking Backend dependencies..."
cd backend-sim
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating and installing dependencies..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
else
    echo "Backend dependencies found."
fi
cd ..

echo ""
echo "Checking Frontend dependencies..."
cd frontend-3d
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing dependencies..."
    npm install
else
    echo "Frontend dependencies found."
fi
cd ..

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
