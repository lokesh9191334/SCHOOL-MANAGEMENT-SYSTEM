#!/usr/bin/env python3
"""
Test admin login functionality
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def test_admin_login():
    """Test admin login"""
    with app.app_context():
        # Find admin user
        admin_user = User.query.filter_by(email='admin@school.com').first()

        if not admin_user:
            print("ERROR: Admin user not found!")
            return False

        print(f"Admin user found: {admin_user.email}")
        print(f"Role: {admin_user.role}")

        # Test password
        test_password = 'admin123'
        if admin_user.check_password(test_password):
            print("SUCCESS: Password verification passed!")
            print("Admin login credentials:")
            print(f"Email: admin@school.com")
            print(f"Password: admin123")
            return True
        else:
            print("ERROR: Password verification failed!")
            return False

if __name__ == "__main__":
    success = test_admin_login()
    if success:
        print("\nAdmin login is working correctly!")
    else:
        print("\nAdmin login has issues!")