#!/usr/bin/env python3
"""
Complete troubleshooting guide for login issue
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def troubleshoot_login():
    """Complete troubleshooting for login issue"""
    with app.app_context():
        print(f"\n🔍 COMPLETE LOGIN TROUBLESHOOTING")
        print("=" * 80)
        
        # Show all users
        all_users = User.query.all()
        print(f"\n📊 ALL USERS IN DATABASE:")
        print("-" * 60)
        
        for user in all_users:
            print(f"📧 Email: {user.email}")
            print(f"👤 Name: {user.name}")
            print(f"👥 Role: {user.role}")
            print(f"📱 Phone: {user.phone}")
            print(f"🔑 Password: {'Set' if user.password_hash else 'Not Set'}")
            print(f"📅 Created: {user.created_at}")
            print("-" * 60)
        
        print(f"\n🎯 WORKING CREDENTIALS:")
        print("=" * 60)
        
        for user in all_users:
            if user.role == 'admin':
                print(f"👨‍💼 ADMIN LOGIN:")
                print(f"   Email: {user.email}")
                print(f"   Password: AdminPass123")
                print(f"   Account Type: admin")
                print(f"   Should redirect to: Dashboard (/)")
                print("-" * 60)
            elif user.role == 'parent':
                print(f"👨‍👩‍👧‍👦 PARENT LOGIN:")
                print(f"   Email: {user.email}")
                print(f"   Password: ParentPass123")
                print(f"   Account Type: parent")
                print(f"   Should redirect to: Parents Portal (/parents/)")
                print("-" * 60)
        
        print(f"\n🔧 TROUBLESHOOTING STEPS:")
        print("=" * 60)
        print("1. ❌ CLOSE ALL BROWSER WINDOWS")
        print("2. 🔄 OPEN NEW BROWSER (Chrome/Firefox)")
        print("3. 🔍 GO TO: http://localhost:5000/auth/login")
        print("4. 📧 USE EXACT EMAIL (copy-paste)")
        print("5. 🔑 USE EXACT PASSWORD (case-sensitive)")
        print("6. 👥 SELECT CORRECT ACCOUNT TYPE")
        print("7. 🖱️ CLICK LOGIN BUTTON")
        print("8. ⏳ WAIT FOR REDIRECT")
        print("9. 📱 CHECK ROLE IN SIDEBAR")
        
        print(f"\n⚠️ COMMON MISTAKES:")
        print("=" * 60)
        print("❌ Wrong email spelling")
        print("❌ Wrong password case")
        print("❌ Wrong account type selected")
        print("❌ Browser cache issue")
        print("❌ Multiple tabs open")
        print("❌ Session conflict")
        
        print(f"\n✅ IF STILL SHOWING PARENT:")
        print("=" * 60)
        print("1. 🧹 Clear browser cache: Ctrl + Shift + Del")
        print("2. 🔒 Use incognito/private window")
        print("3. 📱 Try different browser")
        print("4. 🔄 Restart browser completely")
        print("5. 📝 Copy-paste credentials exactly")
        
        print(f"\n🎯 EXPECTED RESULTS:")
        print("=" * 60)
        print("✅ Admin login → Dashboard with 'Admin' role")
        print("✅ Parent login → Parents Portal with 'Parent' role")
        print("✅ Flash message shows correct role")
        print("✅ Sidebar shows correct role")

if __name__ == "__main__":
    troubleshoot_login()
