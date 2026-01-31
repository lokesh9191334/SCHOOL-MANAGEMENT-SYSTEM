#!/usr/bin/env python3
"""
Remove ALL registered email IDs from database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def remove_all_users():
    """Remove all users from database"""
    with app.app_context():
        all_users = User.query.all()
        print(f"\n🗑️ REMOVING ALL REGISTERED USERS")
        print("=" * 60)
        
        print(f"📊 Total users to remove: {len(all_users)}")
        print("\n📧 Users being removed:")
        
        removed_count = 0
        for user in all_users:
            print(f"🗑️ Removing: {user.email} ({user.role})")
            db.session.delete(user)
            removed_count += 1
        
        try:
            db.session.commit()
            print("=" * 60)
            print(f"✅ Successfully removed {removed_count} users")
            
            # Verify removal
            remaining_users = User.query.all()
            print(f"📊 Remaining users: {len(remaining_users)}")
            
            if len(remaining_users) == 0:
                print("🎉 Database is now completely clean!")
            else:
                print("⚠️ Some users still exist:")
                for user in remaining_users:
                    print(f"📧 {user.email} ({user.role})")
            
        except Exception as e:
            print(f"❌ Error removing users: {e}")
            db.session.rollback()

if __name__ == "__main__":
    remove_all_users()
