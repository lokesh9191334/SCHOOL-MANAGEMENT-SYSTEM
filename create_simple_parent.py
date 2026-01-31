#!/usr/bin/env python3
"""
Create a simple parent account
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent

app = create_app()

def create_simple_parent():
    """Create simple parent account"""
    with app.app_context():
        print(f"\n👨‍👩‍👧‍👦 CREATING SIMPLE PARENT ACCOUNT")
        print("=" * 60)
        
        # Remove existing parent
        existing_parent = User.query.filter_by(email='parent@school.com').first()
        if existing_parent:
            db.session.delete(existing_parent)
            db.session.commit()
            print("🗑️ Removed existing parent account")
        
        # Create parent user
        parent_user = User(
            name='Parent User',
            email='parent@school.com',
            role='parent',
            phone='9876543210',
            address='123 Parent Street'
        )
        parent_user.set_password('parent123')
        db.session.add(parent_user)
        db.session.commit()
        
        print(f"\n✅ Parent account created successfully!")
        print(f"📧 Email: parent@school.com")
        print(f"🔑 Password: parent123")
        print(f"👥 Role: parent")
        print(f"\n🎯 Parent Features:")
        print(f"  - Student Details")
        print(f"  - Messages")
        print(f"  - Announcements")
        print(f"  - Documents")
        print(f"  - Attendance")
        print(f"  - Fee Status")
        print(f"\n🌐 Login: http://localhost:5000/auth/login")
        print(f"📱 Use: parent@school.com / parent123")

if __name__ == "__main__":
    create_simple_parent()
