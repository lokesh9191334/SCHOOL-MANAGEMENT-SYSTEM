#!/usr/bin/env python3
"""
Create student registration system for parents
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Classroom

app = create_app()

def create_student_registration():
    """Create student registration system"""
    with app.app_context():
        print(f"\n👨‍👩‍👧‍👦 CREATING STUDENT REGISTRATION SYSTEM")
        print("=" * 60)
        
        # Check if parent exists
        parent_user = User.query.filter_by(email='parent@school.com').first()
        if not parent_user:
            print("❌ Parent user not found. Please register parent first.")
            return
        
        parent_profile = Parent.query.filter_by(user_id=parent_user.id).first()
        if not parent_profile:
            print("❌ Parent profile not found.")
            return
        
        print(f"✅ Found parent: {parent_profile.name}")
        
        # Create sample classrooms if not exist
        classrooms = [
            {'name': 'Class 1-A', 'year': '1'},
            {'name': 'Class 2-B', 'year': '2'},
            {'name': 'Class 3-C', 'year': '3'},
            {'name': 'Class 4-A', 'year': '4'},
            {'name': 'Class 5-B', 'year': '5'}
        ]
        
        for classroom_data in classrooms:
            existing = Classroom.query.filter_by(name=classroom_data['name']).first()
            if not existing:
                classroom = Classroom(
                    name=classroom_data['name'],
                    year=classroom_data['year']
                )
                db.session.add(classroom)
        
        db.session.commit()
        print("✅ Created sample classrooms")
        
        # Create sample students
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
        
        from datetime import date
        for student_data in students:
            existing = Student.query.filter_by(email=student_data['email']).first()
            if not existing:
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
        
        print(f"\n✅ Student registration system created successfully!")
        print(f"👨‍👩‍👧‍👦 Parent: {parent_profile.name}")
        print(f"📧 Email: {parent_user.email}")
        print(f"👥 Students: {len(students)}")
        
        print(f"\n🎯 STUDENT DETAILS:")
        for i, student in enumerate(students, 1):
            print(f"  {i}. {student['name']} - Class {student['class_id']} - {student['gender']}")
            print(f"     Father: {student['father_name']}")
            print(f"     Mother: {student['mother_name']}")
            print(f"     Email: {student['email']}")
        
        print(f"\n🌐 Parent can now see their children!")
        print(f"🔑 Registration Key: 1B8U8K")

if __name__ == "__main__":
    create_student_registration()
