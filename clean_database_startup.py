#!/usr/bin/env python3
"""
Database Cleanup Script
This script permanently removes all existing users and data to ensure clean startup
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import User, Parent, Teacher, Student, School, db

def clean_database_permanently():
    """Permanently clean all existing data from database"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🧹 PERMANENT DATABASE CLEANUP STARTING...")
            print("=" * 60)
            
            # Get all users before deletion
            users = User.query.all()
            print(f"📊 Found {len(users)} users to delete:")
            
            for user in users:
                print(f"  ❌ {user.name} ({user.email}) - Role: {user.role}")
                db.session.delete(user)
            
            # Delete all related data
            parents = Parent.query.all()
            teachers = Teacher.query.all()
            students = Student.query.all()
            schools = School.query.all()
            
            print(f"\n📊 Deleting related data:")
            print(f"  ❌ Parents: {len(parents)}")
            print(f"  ❌ Teachers: {len(teachers)}")
            print(f"  ❌ Students: {len(students)}")
            print(f"  ❌ Schools: {len(schools)}")
            
            for parent in parents:
                db.session.delete(parent)
            for teacher in teachers:
                db.session.delete(teacher)
            for student in students:
                db.session.delete(student)
            for school in schools:
                db.session.delete(school)
            
            # Commit all deletions
            db.session.commit()
            
            print("\n✅ DATABASE CLEANUP COMPLETED!")
            print("=" * 60)
            
            # Final verification
            print("\n🔍 FINAL VERIFICATION:")
            print(f"  ✅ Users: {User.query.count()}")
            print(f"  ✅ Parents: {Parent.query.count()}")
            print(f"  ✅ Teachers: {Teacher.query.count()}")
            print(f"  ✅ Students: {Student.query.count()}")
            print(f"  ✅ Schools: {School.query.count()}")
            
            print("\n🎉 DATABASE IS PERMANENTLY CLEAN!")
            print("🎉 READY FOR FRESH REGISTRATION!")
            print("🎉 NO MORE EXISTING ACCOUNTS!")
            
            return True
            
        except Exception as e:
            print(f"❌ ERROR DURING CLEANUP: {e}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    print("🚀 STARTING PERMANENT DATABASE CLEANUP...")
    success = clean_database_permanently()
    
    if success:
        print("\n✅ CLEANUP SUCCESSFUL!")
        print("✅ You can now start the Flask server!")
        print("✅ Registration will work without conflicts!")
    else:
        print("\n❌ CLEANUP FAILED!")
        print("❌ Please check the error above!")
        sys.exit(1)
