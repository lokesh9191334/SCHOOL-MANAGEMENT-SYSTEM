#!/usr/bin/env python3
"""
Check all registered email IDs in database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    all_users = User.query.all()
    print(f"\nTotal registered users: {len(all_users)}")
    print("\nRegistered Email IDs:")
    print("=" * 50)
    
    for user in all_users:
        print(f"📧 {user.email} ({user.role})")
        print(f"   Password hash: {'Set' if user.password_hash else 'Not Set'}")
        print(f"   Created: {user.created_at}")
        print("-" * 50)
    
    print("=" * 50)
    print(f"\nEmails to remove:")
    print("1. admin@example.com (if exists)")
    print("2. staff@example.com (if exists)") 
    print("3. lk5278127@gmail.com (admin - remove)")
    print("4. schoolmanagementsystem091@gmail.com (parent)")
    print("5. Add any other emails you want removed")
