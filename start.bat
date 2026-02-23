@echo off
echo ===================================================
echo   Starting NeuroDigital Twin (NDT) Environment     
echo ===================================================

echo [1/2] Starting Backend (FastAPI)...
start "NDT Backend" cmd /k "cd backend && call ..\.venv\Scripts\activate && uvicorn app:app --reload --port 8000"

echo [2/2] Starting Frontend (React)...
start "NDT Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both services have been launched in separate windows.
echo - Backend API: http://localhost:8000 (Docs at http://localhost:8000/docs)
echo - Frontend UI: http://localhost:3000
echo.
echo You can close this window now.
pause
