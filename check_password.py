#!/usr/bin/env python3
"""
Check user password and test login
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User
from werkzeug.security import check_password_hash

app = create_app()

def check_user_password():
    """Check user password and test login"""
    with app.app_context():
        user = User.query.filter_by(email='smsad373@gmail.com').first()
        if user:
            print(f"📧 Email: {user.email}")
            print(f"👤 Name: {user.name}")
            print(f"👥 Role: {user.role}")
            print(f"🔑 Password Hash: {user.password_hash[:50]}...")
            print(f"📅 Created: {user.created_at}")
            
            # Test password
            test_password = "AdminPass123"
            if user.check_password(test_password):
                print(f"✅ Password '{test_password}' is CORRECT!")
            else:
                print(f"❌ Password '{test_password}' is INCORRECT!")
                
                # Try other common passwords
                passwords = ["AdminPass123", "admin", "password", "123456"]
                for pwd in passwords:
                    if user.check_password(pwd):
                        print(f"✅ Actual password is: {pwd}")
                        break
        else:
            print("❌ User not found")

if __name__ == "__main__":
    check_user_password()
