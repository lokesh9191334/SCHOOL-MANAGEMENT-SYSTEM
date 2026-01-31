#!/usr/bin/env python3
from app import create_app
from models import User
from werkzeug.security import check_password_hash, generate_password_hash

app = create_app()

with app.app_context():
    # Get the admin user
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    
    if not user:
        print("Admin user not found!")
        exit(1)
    
    print(f"User: {user.name}")
    print(f"Password Hash: {user.password_hash}")
    print(f"Hash length: {len(user.password_hash) if user.password_hash else 0}")
    
    # Test the password directly
    test_password = 'AdminPass123'
    print(f"\nTesting password: {test_password}")
    
    # Test using werkzeug directly
    if user.password_hash:
        result = check_password_hash(user.password_hash, test_password)
        print(f"Direct werkzeug check_password_hash: {result}")
    else:
        print("No password hash found!")
    
    # Test the user method
    result = user.check_password(test_password)
    print(f"User.check_password(): {result}")
    
    # Try to set a new password and test
    print(f"\nSetting new password...")
    user.set_password('TestPass456')
    print(f"New hash: {user.password_hash}")
    
    test_result = user.check_password('TestPass456')
    print(f"Test new password: {test_result}")
