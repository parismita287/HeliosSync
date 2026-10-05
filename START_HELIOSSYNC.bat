@echo off
setlocal

title HeliosSync - One Click Launcher

echo.
echo ============================================================
echo              HELIOSYNC - ONE CLICK STARTUP
echo ============================================================
echo.

REM ============================================================
REM PROJECT PATHS
REM ============================================================

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo Project Root:
echo %ROOT%
echo.

REM ============================================================
REM CHECK PROJECT FOLDERS
REM ============================================================

if not exist "%BACKEND%" (
    echo ERROR: Backend folder not found!
    echo Expected:
    echo %BACKEND%
    echo.
    pause
    exit /b 1
)

if not exist "%FRONTEND%" (
    echo ERROR: Frontend folder not found!
    echo Expected:
    echo %FRONTEND%
    echo.
    pause
    exit /b 1
)

echo Project folders found successfully.
echo.

REM ============================================================
REM 1. MONGODB
REM ============================================================

echo ============================================================
echo [1/5] CHECKING MONGODB
echo ============================================================
echo.

sc query MongoDB >nul 2>&1

if %errorlevel%==0 (
    echo MongoDB service found.
    echo Starting MongoDB if necessary...
    net start MongoDB >nul 2>&1
    echo MongoDB check completed.
) else (
    echo MongoDB Windows service was not found.
    echo Please make sure MongoDB is already running.
)

echo.

REM ============================================================
REM 2. REDIS / MEMURAI
REM ============================================================

echo ============================================================
echo [2/5] CHECKING REDIS / MEMURAI
echo ============================================================
echo.

sc query Memurai >nul 2>&1

if %errorlevel%==0 (
    echo Memurai service found.
    echo Starting Memurai if necessary...
    net start Memurai >nul 2>&1
    echo Memurai check completed.
) else (
    echo Memurai Windows service was not found.
    echo Please make sure Redis/Memurai is already running.
)

echo.

REM ============================================================
REM 3. BACKEND
REM ============================================================

echo ============================================================
echo [3/5] STARTING HELIOSYNC BACKEND
echo ============================================================
echo.

echo Backend location:
echo %BACKEND%
echo.

start "HeliosSync - Backend" cmd /k "cd /d ""%BACKEND%"" && npm run dev"

echo Backend terminal opened.
echo.
echo Waiting for backend to start...
timeout /t 6 /nobreak >nul

REM ============================================================
REM 4. SENSOR SIMULATOR
REM ============================================================

echo ============================================================
echo [4/5] STARTING SENSOR SIMULATOR
echo ============================================================
echo.

start "HeliosSync - Sensor Simulator" cmd /k "cd /d ""%BACKEND%"" && node src/sensorSimulator.js"

echo Sensor simulator terminal opened.
echo.

REM ============================================================
REM 5. FRONTEND
REM ============================================================

echo ============================================================
echo [5/5] STARTING HELIOSYNC FRONTEND
echo ============================================================
echo.

echo Frontend location:
echo %FRONTEND%
echo.

start "HeliosSync - Frontend" cmd /k "cd /d ""%FRONTEND%"" && npm run dev"

echo Frontend terminal opened.
echo.

REM ============================================================
REM WAIT FOR FRONTEND
REM ============================================================

echo ============================================================
echo HELIOSYNC SERVICES ARE STARTING
echo ============================================================
echo.

echo Backend:
echo http://localhost:5000

echo.
echo Frontend:
echo http://localhost:5173

echo.
echo Waiting for frontend...
timeout /t 8 /nobreak >nul

REM ============================================================
REM OPEN WEBSITE
REM ============================================================

echo Opening HeliosSync website...

start "" "http://localhost:5173"
echo.
echo ============================================================
echo              HELIOSYNC STARTUP COMPLETE
echo ============================================================
echo.
echo Your project should now be running.
echo.
echo Backend:
echo http://localhost:5000
echo.
echo Frontend:
echo http://localhost:5173
echo.
echo Keep the Backend, Sensor Simulator and Frontend
echo terminal windows running while using HeliosSync.
echo.
echo ============================================================

pause