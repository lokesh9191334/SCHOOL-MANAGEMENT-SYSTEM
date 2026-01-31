#!/usr/bin/env python3
"""
Create parent features and routes
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Announcement, ParentNotification

app = create_app()

def create_parent_features():
    """Create parent features and sample data"""
    with app.app_context():
        print(f"\n🎯 CREATING PARENT FEATURES")
        print("=" * 60)
        
        # Get parent user
        parent_user = User.query.filter_by(email='parent@school.com').first()
        if not parent_user:
            print("❌ Parent user not found. Please run create_simple_parent.py first")
            return
        
        # Create parent profile if not exists
        parent_profile = Parent.query.filter_by(user_id=parent_user.id).first()
        if not parent_profile:
            parent_profile = Parent(
                user_id=parent_user.id,
                name=parent_user.name,
                email=parent_user.email,
                phone=parent_user.phone,
                address=parent_user.address,
                relation='Father'
            )
            db.session.add(parent_profile)
            db.session.commit()
            print("✅ Created parent profile")
        
        # Create sample student if not exists
        student = Student.query.filter_by(email='student@school.com').first()
        if not student:
            from datetime import date
            student = Student(
                name='Test Student',
                email='student@school.com',
                roll_number='STU001',
                class_id=1,
                gender='Male',
                date_of_birth=date(2010, 1, 1),
                address='123 Student Street'
            )
            db.session.add(student)
            db.session.commit()
            print("✅ Created sample student")
        
        # Create sample announcements
        announcements = [
            {
                'title': 'School Holiday Notice',
                'content': 'School will be closed next Monday for maintenance.',
                'audience': 'all'
            },
            {
                'title': 'Parent-Teacher Meeting',
                'content': 'Parent-teacher meeting scheduled for next Friday at 3 PM.',
                'audience': 'parents'
            },
            {
                'title': 'Exam Schedule Released',
                'content': 'Final exam schedule has been released. Please check the portal.',
                'audience': 'students'
            }
        ]
        
        for ann_data in announcements:
            existing = Announcement.query.filter_by(title=ann_data['title']).first()
            if not existing:
                announcement = Announcement(
                    title=ann_data['title'],
                    content=ann_data['content'],
                    audience=ann_data['audience'],
                    created_by=1  # Admin user
                )
                db.session.add(announcement)
        
        db.session.commit()
        print("✅ Created sample announcements")
        
        # Create parent notifications
        notifications = [
            {
                'title': 'Welcome to Parent Portal',
                'message': 'You can now track your child\'s progress online.',
                'type': 'welcome'
            },
            {
                'title': 'Monthly Report Available',
                'message': 'Your child\'s monthly report card is ready for download.',
                'type': 'report'
            }
        ]
        
        for notif_data in notifications:
            notification = ParentNotification(
                parent_id=parent_profile.id,
                title=notif_data['title'],
                message=notif_data['message'],
                type=notif_data['type']
            )
            db.session.add(notification)
        
        db.session.commit()
        print("✅ Created parent notifications")
        
        print(f"\n🎉 Parent Features Created Successfully!")
        print(f"📧 Parent Login: parent@school.com / parent123")
        print(f"👨‍👩‍👧‍👦 Features Available:")
        print(f"  ✅ Dashboard with stats")
        print(f"  ✅ Student details and progress")
        print(f"  ✅ Messages to teachers")
        print(f"  ✅ School announcements")
        print(f"  ✅ Document downloads")
        print(f"  ✅ Fee status tracking")
        print(f"  ✅ Attendance monitoring")
        print(f"  ✅ Parent notifications")
        print(f"\n🌐 Login: http://localhost:5000/auth/login")

if __name__ == "__main__":
    create_parent_features()
