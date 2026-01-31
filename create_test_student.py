#!/usr/bin/env python3
"""
Create a test student with all required fields for parent portal testing
"""
import sys
import os
from datetime import date
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import Student, Classroom, User, Parent

app = create_app()

def create_test_student():
    """Create a test student with complete data"""
    with app.app_context():
        # Create classroom if it doesn't exist
        classroom = Classroom.query.filter_by(name='Grade 5-A').first()
        if not classroom:
            classroom = Classroom(
                name='Grade 5-A',
                grade='5',
                stream='General',
                capacity=30,
                room='Room 101',
                academic_year='2024-2025',
                class_type='regular'
            )
            db.session.add(classroom)
            db.session.commit()

        # Get parent user for linking
        parent_user = User.query.filter_by(email='parent@example.com').first()
        parent_profile = None
        if parent_user:
            parent_profile = Parent.query.filter_by(user_id=parent_user.id).first()

        # Check if student already exists
        existing = Student.query.filter_by(email='test.student@example.com').first()
        if existing:
            print("Student already exists, updating...")
            student = existing
        else:
            student = Student()

        # Fill student data
        student.first_name = 'Rahul'
        student.last_name = 'Sharma'
        student.name = 'Rahul Sharma'
        student.roll_number = '001'
        student.email = 'test.student@example.com'
        student.date_of_birth = date(2010, 5, 15)
        student.gender = 'Male'
        student.class_id = classroom.id
        student.permanent_address = '123 Main Street, City, State 12345'
        student.correspondence_address = '123 Main Street, City, State 12345'
        student.phone = '9876543210'
        student.is_active = True
        student.father_name = 'Rajesh Sharma'
        student.mother_name = 'Priya Sharma'
        student.parent_phone = '9876543210'
        student.parent_email = parent_user.email if parent_user else 'parent@example.com'

        if not existing:
            db.session.add(student)

        db.session.commit()

        # Link parent to student
        if parent_profile:
            parent_profile.student_id = student.id
            db.session.commit()
            print("Parent linked to student!")

        print("SUCCESS: Test student created!")
        print(f"Name: {student.name}")
        print(f"Roll Number: {student.roll_number}")
        print(f"Class: {classroom.name}")
        print(f"Email: {student.email}")
        print(f"Father: {student.father_name}")
        print(f"Mother: {student.mother_name}")
        print(f"Parent Email: {student.parent_email}")

        return True

if __name__ == "__main__":
    success = create_test_student()
    if success:
        print("\nTest student created successfully!")
        print("Parent portal should now show student data!")
    else:
        print("\nFailed to create test student!")