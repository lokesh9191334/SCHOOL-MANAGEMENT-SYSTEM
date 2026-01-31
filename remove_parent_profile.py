#!/usr/bin/env python3
"""
Remove existing parent profile
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import Parent

app = create_app()

def remove_parent_profile():
    """Remove existing parent profile"""
    with app.app_context():
        parent = Parent.query.filter_by(email='smsad373@gmail.com').first()
        if parent:
            db.session.delete(parent)
            db.session.commit()
            print('✅ Parent profile removed')
        else:
            print('❌ No parent profile found')

if __name__ == "__main__":
    remove_parent_profile()
