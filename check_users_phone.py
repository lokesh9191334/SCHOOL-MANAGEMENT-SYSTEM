#!/usr/bin/env python3
"""
Check if user was created successfully with phone field
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    all_users = User.query.all()
    print(f"\n🔍 CHECKING CREATED USERS")
    print("=" * 60)
    
    if len(all_users) == 0:
        print("❌ No users found in database")
    else:
        print(f"📊 Total users found: {len(all_users)}")
        for user in all_users:
            print(f"📧 Email: {user.email}")
            print(f"👤 Name: {user.name}")
            print(f"👥 Role: {user.role}")
            print(f"📱 Phone: {user.phone}")
            print(f"🔑 Password: {'Set' if user.password_hash else 'Not Set'}")
            print(f"📅 Created: {user.created_at}")
            print("-" * 60)
