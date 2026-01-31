#!/usr/bin/env python3
"""
Create a completely new admin user with different password
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User
from werkzeug.security import generate_password_hash

app = create_app()

def create_simple_admin():
    """Create a simple admin user"""
    with app.app_context():
        # Remove existing user
        existing = User.query.filter_by(email='admin@school.com').first()
        if existing:
            db.session.delete(existing)
            db.session.commit()
            print("✅ Removed existing user")
        
        # Create new admin user
        admin_user = User(
            name='Admin User',
            email='admin@school.com',
            role='admin',
            phone='9999999999',
            address='School Address'
        )
        
        # Set simple password
        admin_user.set_password('admin123')
        
        db.session.add(admin_user)
        db.session.commit()
        
        print("✅ New admin user created!")
        print(f"📧 Email: admin@school.com")
        print(f"🔑 Password: admin123")
        print(f"👥 Role: admin")
        
        # Verify user
        user = User.query.filter_by(email='admin@school.com').first()
        if user and user.check_password('admin123'):
            print("✅ User verified successfully!")
        else:
            print("❌ User verification failed!")

if __name__ == "__main__":
    create_simple_admin()
