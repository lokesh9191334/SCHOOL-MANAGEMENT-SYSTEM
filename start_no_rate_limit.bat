@echo off
echo Starting School Management System WITHOUT RATE LIMITING...
set FLASK_ENV=development
set FLASK_DEBUG=true
set DISABLE_RATE_LIMITING=true
echo Rate limiting is DISABLED
python app.py
pause
