@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.18 or newer, then reopen this launcher.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Dependencies are missing. Run pnpm install --frozen-lockfile in this folder first.
  pause
  exit /b 1
)
echo Starting Pixel Clock at http://127.0.0.1:3000/
echo Leave this window open. Press Ctrl+C to stop the server.
call npm run dev
pause
