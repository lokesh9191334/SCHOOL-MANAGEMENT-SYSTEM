#!/usr/bin/env python3
"""
Create complete parent system with registration key and students
"""
import sys
import os
import random
import string
from datetime import date
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Classroom

app = create_app()

def generate_6digit_key():
    """Generate 6-digit key with mixed characters"""
    chars = string.ascii_uppercase + string.digits + '!@#$%&*'
    key = ''.join(random.choice(chars) for _ in range(6))
    return key

def create_complete_parent_system():
    """Create complete parent system"""
    with app.app_context():
        print(f"\n🎯 CREATING COMPLETE PARENT SYSTEM")
        print("=" * 60)
        
        # Generate new registration key
        new_key = generate_6digit_key()
        
        # Create parent user
        parent_user = User(
            name='Rajesh Kumar',
            email='parent@school.com',
            role='parent',
            phone='9876543210',
            address='123 Parent Street, Delhi'
        )
        parent_user.set_password('parent123')
        db.session.add(parent_user)
        db.session.commit()
        
        # Create parent profile
        parent_profile = Parent(
            user_id=parent_user.id,
            name='Rajesh Kumar',
            phone='9876543210',
            address='123 Parent Street, Delhi',
            relation='Father'
        )
        db.session.add(parent_profile)
        db.session.commit()
        
        # Create classrooms
        classrooms = []
        for i in range(1, 6):
            classroom = Classroom(
                name=f'Class {i}-A',
                year=str(i)
            )
            db.session.add(classroom)
            classrooms.append(classroom)
        
        db.session.commit()
        print("✅ Created classrooms")
        
        # Create students
        students = [
            {
                'name': 'Priya Kumar',
                'email': 'priya.kumar@school.com',
                'roll_number': 'STU001',
                'class_id': 1,
                'gender': 'Female',
                'dob': '2008-05-15',
                'address': '123 Parent Street, Delhi',
                'father_name': 'Rajesh Kumar',
                'mother_name': 'Sunita Kumar'
            },
            {
                'name': 'Rahul Kumar',
                'email': 'rahul.kumar@school.com',
                'roll_number': 'STU002',
                'class_id': 2,
                'gender': 'Male',
                'dob': '2010-08-22',
                'address': '123 Parent Street, Delhi',
                'father_name': 'Rajesh Kumar',
                'mother_name': 'Sunita Kumar'
            },
            {
                'name': 'Anjali Kumar',
                'email': 'anjali.kumar@school.com',
                'roll_number': 'STU003',
                'class_id': 3,
                'gender': 'Female',
                'dob': '2012-03-10',
                'address': '123 Parent Street, Delhi',
                'father_name': 'Rajesh Kumar',
                'mother_name': 'Sunita Kumar'
            }
        ]
        
        for student_data in students:
            student = Student(
                name=student_data['name'],
                email=student_data['email'],
                roll_number=student_data['roll_number'],
                class_id=student_data['class_id'],
                gender=student_data['gender'],
                date_of_birth=date.fromisoformat(student_data['dob']),
                address=student_data['address'],
                father_name=student_data['father_name'],
                mother_name=student_data['mother_name'],
                parent_email=parent_user.email,
                parent_phone=parent_user.phone
            )
            db.session.add(student)
            print(f"✅ Created student: {student_data['name']}")
        
        db.session.commit()
        
        print(f"\n✅ Complete parent system created successfully!")
        print(f"🔐 REGISTRATION KEY: {new_key}")
        print(f"👨‍👩‍👧‍👦 Parent: Rajesh Kumar")
        print(f"📧 Email: parent@school.com")
        print(f"🔑 Password: parent123")
        print(f"👥 Children: {len(students)}")
        
        print(f"\n🎯 SYSTEM FEATURES:")
        print(f"  ✅ 6-digit registration key")
        print(f"  ✅ Parent account with profile")
        print(f"  ✅ 3 students with complete details")
        print(f"  ✅ Father/Mother names linked")
        print(f"  ✅ Classrooms created")
        print(f"  ✅ Parent-child relationships")
        
        print(f"\n📝 UPDATE YOUR ROUTE WITH:")
        print(f"valid_keys = ['{new_key}']")
        
        print(f"\n🌐 TEST INSTRUCTIONS:")
        print(f"1. Go to: http://localhost:5000/auth/parent-register")
        print(f"2. Use key: {new_key}")
        print(f"3. Register new parent account")
        print(f"4. Login and check student details")
        
        print(f"\n👧 STUDENT DETAILS:")
        for i, student in enumerate(students, 1):
            print(f"  {i}. {student['name']} - Class {student['class_id']}")
            print(f"     Father: {student['father_name']}")
            print(f"     Mother: {student['mother_name']}")
            print(f"     Email: {student['email']}")

if __name__ == "__main__":
    create_complete_parent_system()
