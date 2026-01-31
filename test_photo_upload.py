from app import create_app
from models import db, Student
import os

app = create_app()

with app.app_context():
    # Get the first student
    student = Student.query.first()
    if student:
        print(f"Current student: {student.full_name()}")
        print(f"Current photo path: {student.photo}")
        
        # Create a test photo file path
        test_photo_path = "uploads/students/test_photo.jpg"
        full_test_path = os.path.join(app.root_path, 'static', test_photo_path)
        
        # Create the directories if they don't exist
        os.makedirs(os.path.dirname(full_test_path), exist_ok=True)
        
        # Create a simple test image file
        from PIL import Image
        img = Image.new('RGB', (100, 100), color = (73, 109, 137))
        img.save(full_test_path)
        print(f"Created test photo at: {full_test_path}")
        
        # Update the student's photo path
        student.photo = test_photo_path
        db.session.commit()
        print(f"Updated student photo path to: {student.photo}")
        
        # Verify the update
        db.session.refresh(student)
        print(f"Verified photo path: {student.photo}")
        
        # Check if the file exists
        if os.path.exists(full_test_path):
            print(f"✓ Test photo file exists at: {full_test_path}")
        else:
            print(f"✗ Test photo file does NOT exist at: {full_test_path}")
    else:
        print("No students found.")
