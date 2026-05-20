@echo off
echo =========================================
echo      Restarting Hexapod Simulator
echo =========================================

echo.
echo Stopping existing instances (if any)...
taskkill /F /IM uvicorn.exe /T >nul 2>&1
REM taskkill /F /IM node.exe /T >nul 2>&1  
REM (Uncomment the line above if you want to aggressively kill all Node apps to free port 4200)

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
