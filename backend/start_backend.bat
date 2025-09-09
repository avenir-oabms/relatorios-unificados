@echo off
cd /d E:\xampp\htdocs\relatorios-unificados\backend

set "PY=E:\xampp\htdocs\relatorios-unificados\backend\.venv\Scripts\python.exe"
set "LOGDIR=E:\xampp\htdocs\relatorios-unificados\backend\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo [%date% %time%] starting backend via scheduler >> "%LOGDIR%\scheduler_boot.log"
"%PY%" app.py >> "%LOGDIR%\backend_out.log" 2>> "%LOGDIR%\backend_err.log"
