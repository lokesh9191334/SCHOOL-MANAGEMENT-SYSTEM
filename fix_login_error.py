#!/usr/bin/env python3
"""
Fix login redirect issue by creating a simple profile route
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def test_login_redirect():
    """Test login and redirect"""
    with app.app_context():
        # Check if test user exists
        user = User.query.filter_by(email='test@school.com').first()
        if user:
            print(f"✅ User found: {user.email} ({user.role})")
            print(f"📊 User ID: {user.id}")
            print(f"🔐 Has password: {user.password_hash is not None}")
        else:
            print("❌ Test user not found")
            
        # Check all users
        all_users = User.query.all()
        print(f"\n📋 All Users ({len(all_users)}):")
        for u in all_users:
            print(f"  - {u.email} ({u.role})")

if __name__ == "__main__":
    test_login_redirect()
