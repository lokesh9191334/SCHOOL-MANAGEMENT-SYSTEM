#!/usr/bin/env python
"""Reset admin password properly"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from models import User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    if not user:
        print("❌ User not found")
        sys.exit(1)
    
    # Delete old password
    user.password_hash = None
    db.session.commit()
    print("✅ Cleared password_hash")
    
    # Set new password
    user.set_password('AdminPass123')
    db.session.commit()
    print("✅ Set new password")
    
    # Verify immediately
    is_correct = user.check_password('AdminPass123')
    print(f"✅ Password verification: {'CORRECT' if is_correct else 'INCORRECT'}")
    
    if is_correct:
        print("\n✅ Password reset successful!")
        print(f"   Email: {user.email}")
        print(f"   Password: AdminPass123")
    else:
        print("\n❌ Password verification failed!")
