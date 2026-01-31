#!/usr/bin/env python3
from app import create_app
from flask_login import login_user
from models import User

app = create_app()

with app.app_context():
    # Get the admin user
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    
    if not user:
        print("Admin user not found!")
        exit(1)
    
    print(f"Found user: {user.name} ({user.email})")
    print(f"User role: {user.role}")
    print(f"Current password hash: {user.password_hash[:20]}...")
    
    # Test password check
    print(f"\nTesting password check...")
    if user.check_password('AdminPass123'):
        print("✅ Password check works for 'AdminPass123'")
    else:
        print("❌ Password check failed for 'AdminPass123'")
    
    # Test with test client and login_user
    print(f"\nTesting with proper session management...")
    
    with app.test_client() as client:
        # Get test request context
        with client:
            # Login and get session
            resp = client.post('/auth/login', data={
                'email': 'smsad373@gmail.com',
                'password': 'AdminPass123',
                'account_type': 'admin'
            }, follow_redirects=True)
            
            print(f"Login response status: {resp.status_code}")
            
            # Now test profile/update
            resp = client.post('/profile/update', data={
                'fullName': 'Test User',
                'email': 'smsad373@gmail.com',
                'phone': '9999999999',
                'address': 'Test Address'
            })
            
            print(f"Profile update status: {resp.status_code}")
            
            if resp.status_code == 200:
                result = resp.get_json()
                print(f"Result: {result}")
            else:
                print(f"Response: {resp.get_data(as_text=True)[:200]}")
            
            # Check if user was updated
            db_user = User.query.filter_by(email='smsad373@gmail.com').first()
            print(f"\nUser in database after update:")
            print(f"  Name: {db_user.name}")
            print(f"  Phone: {db_user.phone}")
            print(f"  Address: {db_user.address}")
