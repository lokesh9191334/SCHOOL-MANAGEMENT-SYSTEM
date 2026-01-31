from app import create_app
from models import db

app = create_app()

with app.app_context():
    # Create the table if it doesn't exist
    db.create_all()
    print("TeacherDocument table created successfully.")
