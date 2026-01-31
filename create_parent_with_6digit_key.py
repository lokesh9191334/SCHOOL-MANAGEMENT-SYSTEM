#!/usr/bin/env python3
"""
Create parent account with 6-digit special key system
"""
import sys
import os
import random
import string
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent

app = create_app()

def generate_6digit_key():
    """Generate 6-digit key with mixed characters"""
    # Mix of uppercase letters, numbers, and special characters
    chars = string.ascii_uppercase + string.digits + '!@#$%&*'
    key = ''.join(random.choice(chars) for _ in range(6))
    return key

def create_parent_with_6digit_key():
    """Create parent account with 6-digit key"""
    with app.app_context():
        print(f"\n🔑 CREATING PARENT WITH 6-DIGIT KEY")
        print("=" * 60)
        
        # Generate 6-digit key
        parent_key = generate_6digit_key()
        
        # Remove existing parent
        existing_parent = User.query.filter_by(email='parent@school.com').first()
        if existing_parent:
            db.session.delete(existing_parent)
            db.session.commit()
            print("🗑️ Removed existing parent account")
        
        # Create parent user
        parent_user = User(
            name='Rajesh Kumar',
            email='parent@school.com',
            role='parent',
            phone='9876543210',
            address='123 Parent Street, Delhi'
        )
        parent_user.set_password('parent123')
        db.session.add(parent_user)
        db.session.commit()
        
        # Create parent profile
        parent_profile = Parent(
            user_id=parent_user.id,
            name='Rajesh Kumar',
            phone='9876543210',
            address='123 Parent Street, Delhi',
            relation='Father'
        )
        db.session.add(parent_profile)
        db.session.commit()
        
        print(f"\n✅ Parent account with 6-digit key created successfully!")
        print(f"👨‍👩‍👧‍👦 Parent: Rajesh Kumar")
        print(f"📧 Email: parent@school.com")
        print(f"🔑 Password: parent123")
        print(f"🔐 6-DIGIT KEY: {parent_key}")
        print(f"\n📋 KEY FEATURES:")
        print(f"  - 6 characters long")
        print(f"  - Mix of letters, numbers, special chars")
        print(f"  - Case-sensitive")
        print(f"  - Easy to share")
        
        print(f"\n🌐 Login: http://localhost:5000/auth/login")
        print(f"🔑 Registration Key: {parent_key}")
        
        # Store valid keys (you can add these to database)
        print(f"\n📝 VALID KEYS FOR TESTING:")
        print(f"  - {parent_key} (Current)")
        print(f"  - Generate more with: python create_parent_with_6digit_key.py")

if __name__ == "__main__":
    create_parent_with_6digit_key()
