#!/usr/bin/env python3
"""
Check Parent table for existing emails
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import Parent

app = create_app()

with app.app_context():
    all_parents = Parent.query.all()
    print(f"\n🔍 CHECKING PARENT TABLE")
    print("=" * 60)
    
    if len(all_parents) == 0:
        print("❌ No parents found in database")
    else:
        print(f"📊 Total parents found: {len(all_parents)}")
        for parent in all_parents:
            print(f"📧 Email: {parent.email}")
            print(f"👤 Name: {parent.name}")
            print(f"📱 Phone: {parent.phone}")
            print(f"👥 User ID: {parent.user_id}")
            print(f"👨‍👩‍👧‍👦 Student ID: {parent.student_id}")
            print("-" * 60)
