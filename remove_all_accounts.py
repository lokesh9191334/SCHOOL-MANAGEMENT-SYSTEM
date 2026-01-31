#!/usr/bin/env python3
"""
Remove ALL existing accounts for fresh start
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Student, Teacher

app = create_app()

def remove_all_accounts():
    """Remove all existing accounts completely"""
    with app.app_context():
        print(f"\n🗑️ REMOVING ALL EXISTING ACCOUNTS")
        print("=" * 80)
        
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
        
        # Remove all teachers
        all_teachers = Teacher.query.all()
        print(f"📊 Total teachers to remove: {len(all_teachers)}")
        
        for teacher in all_teachers:
            print(f"🗑️ Removing teacher: {teacher.name}")
            db.session.delete(teacher)
        
        # Remove all students
        all_students = Student.query.all()
        print(f"📊 Total students to remove: {len(all_students)}")
        
        for student in all_students:
            print(f"🗑️ Removing student: {student.name}")
            db.session.delete(student)
        
        try:
            db.session.commit()
            print("=" * 80)
            print(f"✅ All accounts removed successfully!")
            
            # Verify cleanup
            remaining_users = User.query.all()
            remaining_parents = Parent.query.all()
            remaining_students = Student.query.all()
            remaining_teachers = Teacher.query.all()
            
            print(f"\n📊 REMAINING DATA:")
            print(f"   Users: {len(remaining_users)}")
            print(f"   Parents: {len(remaining_parents)}")
            print(f"   Students: {len(remaining_students)}")
            print(f"   Teachers: {len(remaining_teachers)}")
            
            if len(remaining_users) == 0 and len(remaining_parents) == 0 and len(remaining_students) == 0 and len(remaining_teachers) == 0:
                print("🎉 Database is completely clean!")
                print("🚀 Ready for fresh registration!")
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
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    remove_all_accounts()
