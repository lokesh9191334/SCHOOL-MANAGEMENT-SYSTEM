#!/usr/bin/env python3
"""
Create a test user for profile testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def create_test_user():
    """Create a test user"""
    with app.app_context():
        # Remove existing test user
        existing = User.query.filter_by(email='test@school.com').first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print("✅ Removed existing test user")
        
        # Create new test user
        test_user = User(
            name='Test User',
            email='test@school.com',
            role='admin',
            phone='9876543210',
            address='Test Address'
        )
        
        test_user.set_password('test123')
        
        db.session.add(test_user)
        db.session.commit()
        
        print("✅ Test user created!")
        print(f"📧 Email: test@school.com")
        print(f"🔑 Password: test123")
        print(f"👥 Role: admin")
        
        # Verify user
        user = User.query.filter_by(email='test@school.com').first()
        if user and user.check_password('test123'):
            print("✅ Test user verified successfully!")
        else:
            print("❌ Test user verification failed!")

if __name__ == "__main__":
    create_test_user()
