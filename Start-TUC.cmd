@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Die Projektabhaengigkeiten fehlen. Bitte zuerst die Schritte in README.md ausfuehren.
  pause
  exit /b 1
)
echo TUC startet unter http://127.0.0.1:5173/
echo Dieses Fenster offen lassen. Strg+C beendet den Server.
node "node_modules\vite\bin\vite.js" --host 127.0.0.1 --open
if errorlevel 1 pause
