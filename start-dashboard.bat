@echo off
title ClawOutreach Setup
cd /d "%~dp0nanoclaw"

if not exist "node_modules" (
  echo First-time setup -- installing dependencies...
  echo This takes a few minutes, please wait.
  echo.
  call npm install
  echo.
  echo Installing browser for LinkedIn crawling...
  call npx playwright install chromium
  echo.
  echo Setup complete!
  echo.
)

echo Starting ClawOutreach Dashboard...
start "ClawOutreach Dashboard" cmd /k "npx tsx .claude/skills/prospect/server.ts"
timeout /t 4 /nobreak >nul
start "" http://localhost:3100
