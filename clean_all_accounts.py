#!/usr/bin/env python3
"""
Remove ALL registered accounts completely
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Teacher

app = create_app()

def clean_all_accounts():
    """Remove all accounts completely"""
    with app.app_context():
        print(f"\n🗑️ REMOVING ALL REGISTERED ACCOUNTS")
        print("=" * 60)
        
        # Remove all users
        all_users = User.query.all()
        print(f"📊 Total users to remove: {len(all_users)}")
        
        for user in all_users:
            print(f"🗑️ Removing: {user.email} ({user.role})")
            db.session.delete(user)
        
        # Remove all parents
        all_parents = Parent.query.all()
        print(f"📊 Total parents to remove: {len(all_parents)}")
        
        for parent in all_parents:
            print(f"🗑️ Removing parent: {parent.email}")
            db.session.delete(parent)
        
        # Remove all students
        all_students = Student.query.all()
        print(f"📊 Total students to remove: {len(all_students)}")
        
        for student in all_students:
            print(f"🗑️ Removing student: {student.name}")
            db.session.delete(student)
        
        # Remove all teachers
        all_teachers = Teacher.query.all()
        print(f"📊 Total teachers to remove: {len(all_teachers)}")
        
        for teacher in all_teachers:
            print(f"🗑️ Removing teacher: {teacher.name}")
            db.session.delete(teacher)
        
        try:
            db.session.commit()
            print("=" * 60)
            print(f"✅ All accounts removed successfully!")
            
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
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    clean_all_accounts()
