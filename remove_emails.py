#!/usr/bin/env python3
"""
Remove specific email IDs from database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def remove_user_by_email(email):
    """Remove user by email"""
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"🗑️ Removing user: {user.email} ({user.role})")
        db.session.delete(user)
        db.session.commit()
        print(f"✅ Successfully removed: {user.email}")
        return True
    else:
        print(f"❌ User not found: {email}")
        return False

with app.app_context():
    # Remove specific emails as requested
    emails_to_remove = [
        'lk5278127@gmail.com',  # Admin user to remove
        # Add any other emails here if needed
    ]
    
    print("🔧 REMOVING EMAIL IDS FROM DATABASE")
    print("=" * 60)
    
    removed_count = 0
    for email in emails_to_remove:
        if remove_user_by_email(email):
            removed_count += 1
    
    print("=" * 60)
    print(f"\n✅ Total users removed: {removed_count}")
    
    # Show remaining users
    remaining_users = User.query.all()
    print(f"\n📊 Remaining users: {len(remaining_users)}")
    for user in remaining_users:
        print(f"📧 {user.email} ({user.role})")
