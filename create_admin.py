#!/usr/bin/env python3
"""
Remove smsad373@gmail.com and create admin account
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent

app = create_app()

def recreate_admin_account():
    """Remove existing and create admin account"""
    with app.app_context():
        print(f"\n🗑️ REMOVING EXISTING smsad373@gmail.com")
        print("=" * 60)
        
        # Remove existing user
        user = User.query.filter_by(email='smsad373@gmail.com').first()
        if user:
            print(f"🗑️ Removing user: {user.email} ({user.role})")
            db.session.delete(user)
        
        # Remove existing parent
        parent = Parent.query.filter_by(email='smsad373@gmail.com').first()
        if parent:
            print(f"🗑️ Removing parent: {parent.email}")
            db.session.delete(parent)
        
        try:
            db.session.commit()
            print(f"✅ Existing account removed!")
            
            # Create new admin account
            print(f"\n👨‍💼 CREATING ADMIN ACCOUNT")
            print("=" * 60)
            
            from werkzeug.security import generate_password_hash
            
            admin_user = User(
                name='Lokesh Kumar',
                email='smsad373@gmail.com',
                role='admin',
                phone='8168658102',
                password_hash=generate_password_hash('AdminPass123')
            )
            
            db.session.add(admin_user)
            db.session.commit()
            
            print(f"✅ Admin account created successfully!")
            print(f"📧 Email: smsad373@gmail.com")
            print(f"👤 Name: Lokesh Kumar")
            print(f"👥 Role: admin")
            print(f"📱 Phone: 8168658102")
            print(f"🔑 Password: AdminPass123")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    recreate_admin_account()
