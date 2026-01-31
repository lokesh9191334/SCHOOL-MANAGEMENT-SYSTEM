#!/usr/bin/env python3
"""
Remove all existing users and create fresh admin account
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User, Parent, Teacher, Student

app = create_app()

def clear_all_users():
    """Remove all existing users and create fresh admin"""
    with app.app_context():
        print(f"\n🗑️ CLEARING ALL EXISTING USERS")
        print("=" * 60)
        
        # Remove all users
        users = User.query.all()
        print(f"📊 Found {len(users)} users to remove:")
        
        for user in users:
            print(f"  🗑️ Removing: {user.email} ({user.role})")
            db.session.delete(user)
        
        # Remove all parents
        parents = Parent.query.all()
        print(f"\n📊 Found {len(parents)} parents to remove:")
        for parent in parents:
            print(f"  🗑️ Removing: {parent.email}")
            db.session.delete(parent)
        
        # Remove all teachers
        teachers = Teacher.query.all()
        print(f"\n📊 Found {len(teachers)} teachers to remove:")
        for teacher in teachers:
            print(f"  🗑️ Removing: {teacher.email}")
            db.session.delete(teacher)
        
        # Remove all students
        students = Student.query.all()
        print(f"\n📊 Found {len(students)} students to remove:")
        for student in students:
            print(f"  🗑️ Removing: {student.name}")
            db.session.delete(student)
        
        try:
            db.session.commit()
            print(f"\n✅ All existing users removed successfully!")
            
            # Create fresh admin account
            print(f"\n👨‍💼 CREATING FRESH ADMIN ACCOUNT")
            print("=" * 60)
            
            from werkzeug.security import generate_password_hash
            
            admin_user = User(
                name='Admin User',
                email='admin@school.com',
                role='admin',
                phone='9999999999',
                address='School Address',
                password_hash=generate_password_hash('admin123')
            )
            
            db.session.add(admin_user)
            db.session.commit()
            
            print(f"✅ Fresh admin account created successfully!")
            print(f"📧 Email: admin@school.com")
            print(f"👤 Name: Admin User")
            print(f"👥 Role: admin")
            print(f"📱 Phone: 9999999999")
            print(f"🔑 Password: admin123")
            print(f"\n🎉 Now you can register with new account types!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    clear_all_users()
