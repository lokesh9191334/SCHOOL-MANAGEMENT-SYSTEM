#!/usr/bin/env python3
"""
Remove smsparent765@gmail.com account
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent

app = create_app()

def remove_smsparent_account():
    """Remove smsparent765@gmail.com account"""
    with app.app_context():
        print(f"\n🗑️ REMOVING smsparent765@gmail.com ACCOUNT")
        print("=" * 60)
        
        # Remove user
        user = User.query.filter_by(email='smsparent765@gmail.com').first()
        if user:
            print(f"🗑️ Removing user: {user.email} ({user.role})")
            db.session.delete(user)
        
        # Remove parent
        parent = Parent.query.filter_by(email='smsparent765@gmail.com').first()
        if parent:
            print(f"🗑️ Removing parent: {parent.email}")
            db.session.delete(parent)
        
        try:
            db.session.commit()
            print("=" * 60)
            print(f"✅ smsparent765@gmail.com removed successfully!")
            
            # Show remaining users
            remaining_users = User.query.all()
            print(f"\n📊 Remaining users: {len(remaining_users)}")
            for user in remaining_users:
                print(f"📧 {user.email} ({user.role})")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    remove_smsparent_account()
