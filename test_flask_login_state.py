#!/usr/bin/env python
"""Test Flask-Login internal state during login"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from models import User
from flask import session

app = create_app()

with app.app_context():
    # Check database
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    if not user:
        print("❌ Admin user not found!")
        sys.exit(1)
    
    print(f"✅ User found: {user.name} (ID: {user.id})")
    print(f"   Email: {user.email}")
    print(f"   Role: {user.role}")
    print(f"   Password hash exists: {user.password_hash is not None}")
    
    # Check password verification
    password_correct = user.check_password('AdminPass123')
    print(f"   Password check: {'✅ CORRECT' if password_correct else '❌ INCORRECT'}")

# Now test with test client
print("\n" + "="*60)
print("Testing with Flask test_client:")
print("="*60)

client = app.test_client()

# Step 1: Login
print("\n1. Attempting login...")
response = client.post('/auth/login', data={
    'email': 'smsad373@gmail.com',
    'password': 'AdminPass123',
    'account_type': 'admin'
})
print(f"   Login response status: {response.status_code}")
print(f"   Redirect location: {response.location if response.status_code in [301, 302] else 'N/A'}")

# Step 2: Check session after login
print("\n2. Checking cookies...")
print(f"   Set-Cookie headers: {response.headers.getlist('Set-Cookie')}")

# Step 3: Try to access profile with the same client (cookies should be preserved)
print("\n3. Accessing /profile with same client instance...")
response = client.get('/profile')
print(f"   Profile response status: {response.status_code}")
print(f"   Response contains 'Edit Profile': {'✅ YES' if 'Edit Profile' in response.get_data(as_text=True) else '❌ NO'}")
print(f"   Response contains 'Login': {'❌ YES' if 'Login' in response.get_data(as_text=True) else '✅ NO'}")

# Step 4: Try with use_cookies=True explicitly
print("\n4. Testing with use_cookies=True...")
client2 = app.test_client(use_cookies=True)
response = client2.post('/auth/login', data={
    'email': 'smsad373@gmail.com',
    'password': 'AdminPass123',
    'account_type': 'admin'
})
print(f"   Login status: {response.status_code}")

response = client2.get('/profile')
print(f"   Profile status: {response.status_code}")
print(f"   Response contains 'Edit Profile': {'✅ YES' if 'Edit Profile' in response.get_data(as_text=True) else '❌ NO'}")

# Step 5: Check if current_user works inside request context
print("\n5. Testing current_user inside request context...")
from flask_login import current_user

with app.test_request_context():
    print(f"   current_user.is_authenticated (no session): {current_user.is_authenticated}")

# Step 6: Simulate a session
print("\n6. Testing with simulated session...")
with app.test_client(use_cookies=True) as c:
    # Login
    c.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123',
        'account_type': 'admin'
    })
    
    # Try profile
    with c:
        response = c.get('/profile')
        print(f"   Profile response status: {response.status_code}")
        print(f"   Profile has Edit Profile: {'✅ YES' if 'Edit Profile' in response.get_data(as_text=True) else '❌ NO'}")

print("\n" + "="*60)
print("SUMMARY:")
print("="*60)
print("If profile status is 200 and contains 'Edit Profile': Flask-Login works correctly")
print("If profile status is 302 or doesn't contain 'Edit Profile': Session not persisting")
