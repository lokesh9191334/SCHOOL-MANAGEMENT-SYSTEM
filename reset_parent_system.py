#!/usr/bin/env python3
"""
Remove existing parent account and create fresh system
"""
import sys
import os
import random
import string
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student

app = create_app()

def generate_6digit_key():
    """Generate 6-digit key with mixed characters"""
    chars = string.ascii_uppercase + string.digits + '!@#$%&*'
    key = ''.join(random.choice(chars) for _ in range(6))
    return key

def reset_parent_system():
    """Remove existing parent and create fresh system"""
    with app.app_context():
        print(f"\n🗑️ RESETTING PARENT SYSTEM")
        print("=" * 60)
        
        # Remove all existing parent users
        parent_users = User.query.filter_by(role='parent').all()
        print(f"📊 Found {len(parent_users)} parent users to remove:")
        
        for user in parent_users:
            print(f"  🗑️ Removing: {user.email}")
            db.session.delete(user)
        
        # Remove all parent profiles
        parent_profiles = Parent.query.all()
        print(f"\n📊 Found {len(parent_profiles)} parent profiles to remove:")
        
        for profile in parent_profiles:
            print(f"  🗑️ Removing: {profile.name}")
            db.session.delete(profile)
        
        # Remove all students linked to parents
        students = Student.query.all()
        print(f"\n📊 Found {len(students)} students to remove:")
        
        for student in students:
            print(f"  🗑️ Removing: {student.name}")
            db.session.delete(student)
        
        try:
            db.session.commit()
            print(f"\n✅ All existing parent data removed successfully!")
            
            # Generate new registration key
            new_key = generate_6digit_key()
            
            print(f"\n🔑 FRESH SYSTEM CREATED")
            print("=" * 60)
            print(f"🔐 NEW REGISTRATION KEY: {new_key}")
            print(f"📋 System is now ready for fresh parent registration")
            print(f"\n📝 UPDATE YOUR ROUTE WITH:")
            print(f"valid_keys = ['{new_key}']")
            
            print(f"\n🎯 NEXT STEPS:")
            print(f"1. Update auth.py with new key")
            print(f"2. Go to /auth/parent-register")
            print(f"3. Use key: {new_key}")
            print(f"4. Create new parent account")
            print(f"5. Register students under parent")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    reset_parent_system()
