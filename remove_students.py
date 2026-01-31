#!/usr/bin/env python3
"""
Remove remaining student data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import Student

app = create_app()

def remove_students():
    """Remove all students"""
    with app.app_context():
        print(f"\n🗑️ REMOVING REMAINING STUDENTS")
        print("=" * 60)
        
        all_students = Student.query.all()
        print(f"📊 Total students to remove: {len(all_students)}")
        
        for student in all_students:
            print(f"🗑️ Removing student: {student.name}")
            db.session.delete(student)
        
        try:
            db.session.commit()
            print("=" * 60)
            print(f"✅ All students removed successfully!")
            
            # Verify cleanup
            remaining_students = Student.query.all()
            print(f"📊 Remaining students: {len(remaining_students)}")
            
            if len(remaining_students) == 0:
                print("🎉 Database is now completely clean!")
            else:
                print("⚠️ Some students still exist:")
                for student in remaining_students:
                    print(f"👨‍🎓 Student: {student.name}")
            
        except Exception as e:
            print(f"❌ Error removing students: {e}")
            db.session.rollback()

if __name__ == "__main__":
    remove_students()
