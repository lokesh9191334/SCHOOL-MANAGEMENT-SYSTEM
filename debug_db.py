from app import create_app
from sqlalchemy import text
from models import db

app = create_app()
with app.app_context():
    # Check user table to see teacher users
    users = db.session.execute(text('SELECT id, name, email, role FROM user WHERE role = "teacher"')).fetchall()
    print('Teacher users:')
    for user in users:
        print(f'  User ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, Role: {user[3]}')
    
    # Check teacher table
    teachers = db.session.execute(text('SELECT id, name, user_id FROM teacher')).fetchall()
    print('\nTeacher records:')
    for teacher in teachers:
        print(f'  Teacher ID: {teacher[0]}, Name: {teacher[1]}, User ID: {teacher[2]}')
    
    # Check which leaves belong to which teachers
    leaves = db.session.execute(text('SELECT id, teacher_id, leave_type, status FROM teacher_leave')).fetchall()
    print('\nLeave records by teacher:')
    for leave in leaves:
        print(f'  Leave ID: {leave[0]}, Teacher ID: {leave[1]}, Type: {leave[2]}, Status: {leave[3]}')
