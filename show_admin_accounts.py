#!/usr/bin/env python3
"""
Show all available admin accounts
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    admin_users = User.query.filter_by(role='admin').all()
    print(f"\n🔍 ADMIN ACCOUNTS AVAILABLE")
    print("=" * 60)
    
    if len(admin_users) == 0:
        print("❌ No admin accounts found!")
    else:
        print(f"📊 Total admin accounts: {len(admin_users)}")
        for user in admin_users:
            print(f"📧 Email: {user.email}")
            print(f"👤 Name: {user.name}")
            print(f"👥 Role: {user.role}")
            print(f"📱 Phone: {user.phone}")
            print(f"📅 Created: {user.created_at}")
            print(f"🔑 Password: Set (use SuperAdmin123)")
            print("-" * 60)
    
    print("\n📝 LOGIN INSTRUCTIONS:")
    print("1. Go to: http://localhost:5000/auth/login")
    print("2. Email: superadmin@school.com")
    print("3. Password: SuperAdmin123")
    print("4. Account Type: admin")
    print("5. Click Login")
    print("6. Should redirect to Dashboard (/)")
    
    print("\n⚠️ IF STILL SHOWING PARENT:")
    print("1. Clear browser cache (Ctrl + Shift + R)")
    print("2. Use incognito/private window")
    print("3. Check exact email spelling")
    print("4. Ensure account_type = admin")
