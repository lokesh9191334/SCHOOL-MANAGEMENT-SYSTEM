#!/usr/bin/env python3
"""
Force reset database for fresh start
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Teacher

app = create_app()

def force_reset_database():
    """Force reset database completely"""
    with app.app_context():
        print(f"\n🔄 FORCE RESETTING DATABASE")
        print("=" * 80)
        
        try:
            # Drop all tables
            db.drop_all()
            print("🗑️ All tables dropped")
            
            # Create all tables
            db.create_all()
            print("✅ All tables created")
            
            print("=" * 80)
            print("🎉 Database reset successfully!")
            print("🚀 Ready for fresh registration!")
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    force_reset_database()
