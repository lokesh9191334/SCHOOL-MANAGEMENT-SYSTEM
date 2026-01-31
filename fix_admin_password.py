#!/usr/bin/env python3
"""
Create admin user with password
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Update existing admin user with password
    admin_user = User.query.filter_by(email='lk5278127@gmail.com').first()
    if admin_user:
        admin_user.password_hash = generate_password_hash('admin123')
        db.session.commit()
        print(f"Updated admin user: {admin_user.email} with password hash")
    else:
        print("Admin user not found!")
