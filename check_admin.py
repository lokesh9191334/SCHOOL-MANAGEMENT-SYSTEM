#!/usr/bin/env python3
"""
Check admin user in database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    admin_user = User.query.filter_by(email='admin@school.com').first()
    if admin_user:
        print(f"Admin user found: {admin_user.email}")
        print(f"Role: {admin_user.role}")
        print(f"Password hash exists: {admin_user.password_hash is not None}")
        if admin_user.password_hash:
            print(f"Password hash (first 50 chars): {admin_user.password_hash[:50]}...")
        else:
            print("Password hash is None!")
    else:
        print("Admin user not found!")
    
    # Check all users
    all_users = User.query.all()
    print(f"\nTotal users in database: {len(all_users)}")
    for user in all_users:
        print(f"- {user.email} ({user.role}) - Password hash: {user.password_hash is not None}")
