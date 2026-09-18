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
echo Starting Pixel Clock - your browser will open automatically.
echo If it does not open, use the Local URL printed below.
echo Leave this window open. Press Ctrl+C to stop the server.
set "PIXEL_CLOCK_OPEN_BROWSER=1"
rem Filter the known Vite 8 / Node 26 compatibility notice only.
set "NODE_OPTIONS=%NODE_OPTIONS% --disable-warning=DEP0205"
call npm run dev
pause
