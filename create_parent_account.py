#!/usr/bin/env python3
"""
Create a parent account with linked student
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student

app = create_app()

def create_parent_with_student():
    """Create parent account with linked student"""
    with app.app_context():
        print(f"\n👨‍👩‍👧‍👦 CREATING PARENT ACCOUNT")
        print("=" * 60)
        
        # Remove existing parent
        existing_parent = User.query.filter_by(email='parent@school.com').first()
        if existing_parent:
            db.session.delete(existing_parent)
            print("🗑️ Removed existing parent account")
        
        # Create parent user
        parent_user = User(
            name='Parent User',
            email='parent@school.com',
            role='parent',
            phone='9876543210',
            address='123 Parent Street, School City'
        )
        parent_user.set_password('parent123')
        db.session.add(parent_user)
        db.session.commit()
        
        # Create parent profile
        parent_profile = Parent(
            user_id=parent_user.id,
            name='Parent User',
            email='parent@school.com',
            phone='9876543210',
            address='123 Parent Street, School City',
            relation='Father'
        )
        db.session.add(parent_profile)
        db.session.commit()
        
        # Create student to link with parent
        existing_student = Student.query.filter_by(email='student@school.com').first()
        if not existing_student:
            student = Student(
                name='Test Student',
                email='student@school.com',
                roll_number='STU001',
                class_id=1,
                section='A',
                gender='Male',
                dob='2010-01-01',
                address='123 Student Street, School City',
                parent_id=parent_profile.id
            )
            db.session.add(student)
            db.session.commit()
            print("✅ Created linked student")
        
        print(f"\n✅ Parent account created successfully!")
        print(f"📧 Email: parent@school.com")
        print(f"🔑 Password: parent123")
        print(f"👥 Role: parent")
        print(f"👨‍👩‍👧‍👦 Linked Student: Test Student")
        print(f"\n🎯 Parent Features:")
        print(f"  - Student Details")
        print(f"  - Messages")
        print(f"  - Announcements")
        print(f"  - Documents")
        print(f"  - Attendance")
        print(f"  - Fee Status")

if __name__ == "__main__":
    create_parent_with_student()
