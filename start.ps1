# PowerShell helper to create venv, install deps, init DB and run app
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python db_init.py
python app.py
