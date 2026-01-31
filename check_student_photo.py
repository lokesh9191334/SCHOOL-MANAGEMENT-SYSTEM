from models import db, Student
from app import create_app

app = create_app()
with app.app_context():
    # Get the first student
    student = Student.query.first()
    if student:
        print(f"Student ID: {student.id}")
        print(f"Student Name: {student.full_name()}")
        print(f"Photo Path: {student.photo}")
        print(f"Student Aadhaar Photo: {student.student_aadhaar_photo}")
        print(f"Father Aadhaar Photo: {student.father_aadhaar_photo}")
        print(f"Mother Aadhaar Photo: {student.mother_aadhaar_photo}")
    else:
        print("No students found in database.")
