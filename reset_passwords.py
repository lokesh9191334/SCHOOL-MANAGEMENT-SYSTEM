#!/usr/bin/env python3
"""
Reset admin password to known value
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Reset admin@example.com password
    admin_user = User.query.filter_by(email='admin@example.com').first()
    if admin_user:
        admin_user.password_hash = generate_password_hash('admin123')
        db.session.commit()
        print(f"✅ Reset password for: {admin_user.email}")
        print(f"🔑 New password: admin123")
    else:
        print("❌ Admin user not found!")
    
    # Also reset staff@example.com password
    staff_user = User.query.filter_by(email='staff@example.com').first()
    if staff_user:
        staff_user.password_hash = generate_password_hash('staff123')
        db.session.commit()
        print(f"✅ Reset password for: {staff_user.email}")
        print(f"🔑 New password: staff123")
    else:
        print("❌ Staff user not found!")
    
    # Reset parent passwords
    parent_users = User.query.filter_by(role='parent').all()
    for parent in parent_users:
        parent.password_hash = generate_password_hash('parent123')
        db.session.commit()
        print(f"✅ Reset password for: {parent.email}")
    
    print(f"🔑 Parent passwords: parent123")
