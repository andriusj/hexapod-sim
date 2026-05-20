@echo off
echo =========================================
echo      Restarting Hexapod Simulator
echo =========================================

echo.
echo Checking Backend dependencies...
cd backend-sim
if not exist "venv\" (
    echo Virtual environment not found. Creating and installing dependencies...
    python -m venv venv
    call .\venv\Scripts\activate.bat
    pip install -r requirements.txt
    call .\venv\Scripts\deactivate.bat
) else (
    echo Backend dependencies found.
)
cd ..

echo.
echo Checking Frontend dependencies...
cd frontend-3d
if not exist "node_modules\" (
    echo node_modules not found. Installing dependencies...
    call npm install
) else (
    echo Frontend dependencies found.
)
cd ..

echo.
echo Stopping existing instances (if any)...
taskkill /F /IM uvicorn.exe /T >nul 2>&1
REM taskkill /F /IM node.exe /T >nul 2>&1  

echo.
echo Starting Backend (FastAPI)...
start "Hexapod Backend" cmd /k "cd backend-sim && .\venv\Scripts\uvicorn.exe main:app --reload"

echo Starting Frontend (Angular)...
start "Hexapod Frontend" cmd /k "cd frontend-3d && npm start"

echo.
echo Both services have been started in new windows!
echo Backend is running at http://localhost:8000
echo Frontend is running at http://localhost:4200
echo =========================================
pause
