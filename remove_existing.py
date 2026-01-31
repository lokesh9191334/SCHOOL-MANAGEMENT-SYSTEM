#!/usr/bin/env python3
"""
Remove existing user and create new admin
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def remove_existing_user():
    """Remove existing user"""
    with app.app_context():
        user = User.query.filter_by(email='smsad373@gmail.com').first()
        if user:
            db.session.delete(user)
            db.session.commit()
            print('✅ Existing user removed')
        else:
            print('❌ No existing user found')

if __name__ == "__main__":
    remove_existing_user()
