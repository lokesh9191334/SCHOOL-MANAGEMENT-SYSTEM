#!/usr/bin/env python3
"""
Remove ALL registered accounts and clean database completely
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Teacher

app = create_app()

def clean_database():
    """Remove all users and related data"""
    with app.app_context():
        print(f"\n🗑️ CLEANING DATABASE COMPLETELY")
        print("=" * 60)
        
        # Remove all users
        all_users = User.query.all()
        print(f"📊 Total users to remove: {len(all_users)}")
        
        for user in all_users:
            print(f"🗑️ Removing user: {user.email} ({user.role})")
            db.session.delete(user)
        
        # Remove all parents
        all_parents = Parent.query.all()
        print(f"📊 Total parents to remove: {len(all_parents)}")
        
        for parent in all_parents:
            print(f"🗑️ Removing parent: {parent.email}")
            db.session.delete(parent)
        
        try:
            db.session.commit()
            print("=" * 60)
            print(f"✅ Database cleaned successfully!")
            
            # Verify cleanup
            remaining_users = User.query.all()
            remaining_parents = Parent.query.all()
            remaining_students = Student.query.all()
            remaining_teachers = Teacher.query.all()
            
            print(f"📊 Remaining data:")
            print(f"   Users: {len(remaining_users)}")
            print(f"   Parents: {len(remaining_parents)}")
            print(f"   Students: {len(remaining_students)}")
            print(f"   Teachers: {len(remaining_teachers)}")
            
            if len(remaining_users) == 0 and len(remaining_parents) == 0:
                print("🎉 Database is completely clean!")
            else:
                print("⚠️ Some data still exists:")
                
                for user in remaining_users:
                    print(f"📧 User: {user.email} ({user.role})")
                
                for parent in remaining_parents:
                    print(f"👨‍👩‍👧‍👦 Parent: {parent.email}")
                
                for student in remaining_students:
                    print(f"👨‍🎓 Student: {student.name}")
                
                for teacher in remaining_teachers:
                    print(f"👨‍🏫 Teacher: {teacher.name}")
            
        except Exception as e:
            print(f"❌ Error cleaning database: {e}")
            db.session.rollback()

if __name__ == "__main__":
    clean_database()
