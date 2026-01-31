#!/usr/bin/env python3
"""
Clean reset parent system - remove all parent data safely
"""
import sys
import os
import random
import string
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student
from sqlalchemy import text

app = create_app()

def generate_6digit_key():
    """Generate 6-digit key with mixed characters"""
    chars = string.ascii_uppercase + string.digits + '!@#$%&*'
    key = ''.join(random.choice(chars) for _ in range(6))
    return key

def clean_reset_parent():
    """Clean reset parent system"""
    with app.app_context():
        print(f"\n🗑️ CLEAN RESETTING PARENT SYSTEM")
        print("=" * 60)
        
        try:
            # Disable foreign key checks temporarily
            db.session.execute(text('PRAGMA foreign_keys = OFF'))
            
            # Remove parent notifications first
            db.session.execute(text('DELETE FROM parent_notification'))
            print("🗑️ Removed parent notifications")
            
            # Remove parent profiles
            db.session.execute(text('DELETE FROM parent'))
            print("🗑️ Removed parent profiles")
            
            # Remove parent users
            db.session.execute(text('DELETE FROM user WHERE role = "parent"'))
            print("🗑️ Removed parent users")
            
            # Remove all students
            db.session.execute(text('DELETE FROM student'))
            print("🗑️ Removed students")
            
            # Re-enable foreign key checks
            db.session.execute(text('PRAGMA foreign_keys = ON'))
            
            db.session.commit()
            print(f"\n✅ All parent data cleaned successfully!")
            
            # Generate new registration key
            new_key = generate_6digit_key()
            
            print(f"\n🔑 FRESH SYSTEM CREATED")
            print("=" * 60)
            print(f"🔐 NEW REGISTRATION KEY: {new_key}")
            print(f"📋 System is now ready for fresh parent registration")
            
            print(f"\n📝 UPDATE YOUR ROUTE WITH:")
            print(f"valid_keys = ['{new_key}']")
            
            print(f"\n🎯 NEXT STEPS:")
            print(f"1. Update auth.py with new key: {new_key}")
            print(f"2. Go to /auth/parent-register")
            print(f"3. Use key: {new_key}")
            print(f"4. Create new parent account")
            print(f"5. Register students under parent")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    clean_reset_parent()
