from models import db, Student
from app import create_app

app = create_app()
with app.app_context():
    students = Student.query.all()
    print('Checking student photos...')
    for s in students[:5]:
        print(f'Student {s.id}: {s.full_name()}, Photo: {s.photo}')
