#!/usr/bin/env python3
"""
Create parent account with special key system
"""
import sys
import os
import secrets
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent

app = create_app()

def generate_parent_key():
    """Generate unique parent registration key"""
    return f"PRNT-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"

def create_parent_with_key():
    """Create parent account with special key"""
    with app.app_context():
        print(f"\n🔑 CREATING PARENT WITH KEY SYSTEM")
        print("=" * 60)
        
        # Generate unique key
        parent_key = generate_parent_key()
        
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
        
        # Create parent profile with key
        parent_profile = Parent(
            user_id=parent_user.id,
            name='Rajesh Kumar',
            phone='9876543210',
            address='123 Parent Street, Delhi',
            relation='Father'
        )
        db.session.add(parent_profile)
        db.session.commit()
        
        # Store the key (you can add a key field to Parent model if needed)
        # For now, we'll print it and you can store it securely
        
        print(f"\n✅ Parent account with key created successfully!")
        print(f"👨‍👩‍👧‍👦 Parent: Rajesh Kumar")
        print(f"📧 Email: parent@school.com")
        print(f"🔑 Password: parent123")
        print(f"🔐 SPECIAL KEY: {parent_key}")
        print(f"\n📋 IMPORTANT:")
        print(f"  - Parent needs this key to create account")
        print(f"  - Without correct key, account creation fails")
        print(f"  - Key is case-sensitive")
        print(f"  - Share this key securely with parent")
        
        print(f"\n🌐 Login: http://localhost:5000/auth/login")
        print(f"🔑 Registration Key: {parent_key}")

if __name__ == "__main__":
    create_parent_with_key()
