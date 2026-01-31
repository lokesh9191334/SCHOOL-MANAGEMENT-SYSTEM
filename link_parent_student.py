#!/usr/bin/env python3
"""
Link parent to student for testing parent portal
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student

app = create_app()

def link_parent_to_student():
    """Link a parent to a student"""
    with app.app_context():
        # Get first parent
        parent_user = User.query.filter_by(role='parent').first()
        if not parent_user:
            print("ERROR: No parent user found!")
            return False

        # Get parent profile
        parent_profile = Parent.query.filter_by(user_id=parent_user.id).first()
        if not parent_profile:
            print("ERROR: Parent profile not found!")
            return False

        # Get first student
        student = Student.query.first()
        if not student:
            print("ERROR: No student found!")
            return False

        # Link them
        parent_profile.student_id = student.id
        db.session.commit()

        print("SUCCESS: Parent linked to student!")
        print(f"Parent: {parent_user.name} ({parent_user.email})")
        print(f"Student: {student.name} ({student.email})")
        return True

if __name__ == "__main__":
    success = link_parent_to_student()
    if success:
        print("\nParent portal should now work properly!")
    else:
        print("\nFailed to link parent to student!")