from app import create_app
from models import Classroom, Student, db

app = create_app()
with app.app_context():
    student = Student.query.filter_by(id=1).first()
    if student:
        print(f"Student: {student.name}")
        print(f"Current Class ID: {student.class_id}")
        print(f"Current Class Name: {Classroom.query.get(student.class_id).name if student.class_id else 'NONE'}")
        
        # Update to Class 12-A (ID 29)
        student.class_id = 29
        
        # Update enrollment to match
        if student.enrollments:
            student.enrollments[0].classroom_id = 29
        
        db.session.commit()
        
        print("\nUpdated!")
        print(f"New Class ID: {student.class_id}")
        print(f"New Class Name: {Classroom.query.get(student.class_id).name}")
        print(f"New Enrollment Classroom: {student.enrollments[0].classroom.name if student.enrollments else 'NONE'}")
