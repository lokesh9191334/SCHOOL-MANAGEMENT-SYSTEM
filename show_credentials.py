#!/usr/bin/env python3
"""
Show all user credentials for testing
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    all_users = User.query.all()
    print(f"\n🔑 LOGIN CREDENTIALS FOR TESTING")
    print("=" * 60)
    
    for user in all_users:
        print(f"📧 Email: {user.email}")
        print(f"👤 Role: {user.role}")
        print(f"🔑 Password: admin123 (for admin), staff123 (for staff), parent123 (for parent)")
        print(f"📊 Account Type: {user.role}")
        print("-" * 60)
    
    print("=" * 60)
    print(f"\n📝 LOGIN COMBINATIONS:")
    print("1. ADMIN LOGIN:")
    print("   Email: admin@example.com")
    print("   Password: admin123")
    print("   Account Type: admin")
    print()
    print("2. STAFF LOGIN:")
    print("   Email: staff@example.com")
    print("   Password: staff123")
    print("   Account Type: staff")
    print()
    print("3. PARENT LOGIN:")
    print("   Email: schoolmanagementsystem091@gmail.com")
    print("   Password: parent123")
    print("   Account Type: parent")
    print()
    print("4. PARENT LOGIN 2:")
    print("   Email: smsad373@gmail.com")
    print("   Password: parent123")
    print("   Account Type: parent")
