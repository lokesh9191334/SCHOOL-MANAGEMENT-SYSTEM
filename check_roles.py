#!/usr/bin/env python3
"""
Check user roles in database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    all_users = User.query.all()
    print(f"\n🔍 CHECKING USER ROLES IN DATABASE")
    print("=" * 60)
    
    for user in all_users:
        print(f"📧 Email: {user.email}")
        print(f"👤 Role: {user.role}")
        print(f"🔑 Password: {'Set' if user.password_hash else 'Not Set'}")
        print(f"📅 Created: {user.created_at}")
        print("-" * 60)
    
    print("=" * 60)
    print(f"\n📊 Total users: {len(all_users)}")
    
    # Check role distribution
    admin_count = User.query.filter_by(role='admin').count()
    teacher_count = User.query.filter_by(role='teacher').count()
    parent_count = User.query.filter_by(role='parent').count()
    staff_count = User.query.filter_by(role='staff').count()
    
    print(f"\n👥 Role Distribution:")
    print(f"👨‍💼 Admin: {admin_count}")
    print(f"👨‍🏫 Teacher: {teacher_count}")
    print(f"👨‍👩‍👧‍👦 Parent: {parent_count}")
    print(f"👨‍💼 Staff: {staff_count}")
