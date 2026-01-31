#!/usr/bin/env python3
"""
Complete database cleanup - remove everything
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Teacher, Student

app = create_app()

def clean_everything():
    """Remove all data from database"""
    with app.app_context():
        print("🧹 CLEANING DATABASE COMPLETELY")
        print("=" * 50)
        
        # Check current data
        users = User.query.all()
        parents = Parent.query.all()
        teachers = Teacher.query.all()
        students = Student.query.all()
        
        print(f"📊 Current Data:")
        print(f"   Users: {len(users)}")
        print(f"   Parents: {len(parents)}")
        print(f"   Teachers: {len(teachers)}")
        print(f"   Students: {len(students)}")
        
        if users:
            print(f"\n📧 Users to remove:")
            for user in users:
                print(f"   - {user.email} ({user.role})")
        
        print(f"\n🗑️ REMOVING ALL DATA...")
        
        # Remove all data
        try:
            # Remove in correct order (due to foreign keys)
            Student.query.delete()
            Teacher.query.delete()
            Parent.query.delete()
            User.query.delete()
            
            db.session.commit()
            
            print(f"✅ ALL DATA REMOVED SUCCESSFULLY!")
            
            # Verify cleanup
            users_count = User.query.count()
            parents_count = Parent.query.count()
            teachers_count = Teacher.query.count()
            students_count = Student.query.count()
            
            print(f"\n📊 After Cleanup:")
            print(f"   Users: {users_count}")
            print(f"   Parents: {parents_count}")
            print(f"   Teachers: {teachers_count}")
            print(f"   Students: {students_count}")
            
            if users_count == 0 and parents_count == 0 and teachers_count == 0 and students_count == 0:
                print(f"\n🎉 DATABASE COMPLETELY CLEAN!")
            else:
                print(f"\n⚠️ Some data still exists!")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
            db.session.rollback()

if __name__ == "__main__":
    clean_everything()
