#!/usr/bin/env python3
"""
Create parent with multiple children (students)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student

app = create_app()

def create_parent_with_children():
    """Create parent with multiple children"""
    with app.app_context():
        print(f"\n👨‍👩‍👧‍👦 CREATING PARENT WITH CHILDREN")
        print("=" * 60)
        
        # Remove existing parent
        existing_parent = User.query.filter_by(email='parent@school.com').first()
        if existing_parent:
            db.session.delete(existing_parent)
            db.session.commit()
            print("🗑️ Removed existing parent account")
        
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
        
        # Create children (students)
        children = [
            {
                'name': 'Priya Kumar',
                'email': 'priya.kumar@school.com',
                'roll_number': 'STU001',
                'class_id': 1,
                'gender': 'Female',
                'dob': '2008-05-15',
                'address': '123 Parent Street, Delhi'
            },
            {
                'name': 'Rahul Kumar',
                'email': 'rahul.kumar@school.com',
                'roll_number': 'STU002',
                'class_id': 2,
                'gender': 'Male',
                'dob': '2010-08-22',
                'address': '123 Parent Street, Delhi'
            },
            {
                'name': 'Anjali Kumar',
                'email': 'anjali.kumar@school.com',
                'roll_number': 'STU003',
                'class_id': 3,
                'gender': 'Female',
                'dob': '2012-03-10',
                'address': '123 Parent Street, Delhi'
            }
        ]
        
        from datetime import date
        for child_data in children:
            # Check if student already exists
            existing_student = Student.query.filter_by(email=child_data['email']).first()
            if not existing_student:
                student = Student(
                    name=child_data['name'],
                    email=child_data['email'],
                    roll_number=child_data['roll_number'],
                    class_id=child_data['class_id'],
                    gender=child_data['gender'],
                    date_of_birth=date.fromisoformat(child_data['dob']),
                    address=child_data['address'],
                    father_name='Rajesh Kumar',
                    mother_name='Sunita Kumar',
                    parent_email='parent@school.com',
                    parent_phone='9876543210'
                )
                db.session.add(student)
                db.session.commit()
                print(f"✅ Created child: {child_data['name']}")
        
        print(f"\n✅ Parent account with children created successfully!")
        print(f"👨‍👩‍👧‍👦 Parent: Rajesh Kumar")
        print(f"📧 Email: parent@school.com")
        print(f"🔑 Password: parent123")
        print(f"👥 Children: {len(children)}")
        print(f"\n👧 Children Details:")
        for i, child in enumerate(children, 1):
            print(f"  {i}. {child['name']} - Class {child['class_id']} - {child['gender']}")
        
        print(f"\n🎯 Now parent will see only their children!")
        print(f"🌐 Login: http://localhost:5000/auth/login")

if __name__ == "__main__":
    create_parent_with_children()
