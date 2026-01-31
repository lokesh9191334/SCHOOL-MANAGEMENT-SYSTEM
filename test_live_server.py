#!/usr/bin/env python
"""Test server with live HTTP requests"""
import requests
import sys
from http.cookiejar import CookieJar

session = requests.Session()

print("="*60)
print("LIVE SERVER TEST")
print("="*60)

# Test 1: Login
print("\n[1] Testing login at http://127.0.0.1:5000...")
try:
    response = session.post('http://127.0.0.1:5000/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'NewPassword123',
        'account_type': 'admin'
    }, allow_redirects=False)
    print(f"   Login status: {response.status_code}")
    print(f"   Redirect to: {response.headers.get('Location', 'N/A')}")
    print(f"   Cookies: {session.cookies.get_dict()}")
    
    if response.status_code not in [200, 302]:
        print(f"   ERROR: Unexpected status!")
        sys.exit(1)
except Exception as e:
    print(f"   ERROR: {e}")
    sys.exit(1)

# Test 2: Profile page
print("\n[2] Testing profile page access...")
try:
    response = session.get('http://127.0.0.1:5000/profile', allow_redirects=False)
    print(f"   Profile status: {response.status_code}")
    
    if response.status_code == 302:
        print(f"   ERROR: Redirected to {response.headers.get('Location')}")
        print("   Session not working!")
        sys.exit(1)
    elif response.status_code == 200:
        if 'Edit Profile' in response.text:
            print("   SUCCESS: Profile page loaded with Edit Profile button!")
        else:
            print("   ERROR: Profile page loaded but Edit Profile button missing!")
            sys.exit(1)
    else:
        print(f"   ERROR: Status {response.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"   ERROR: {e}")
    sys.exit(1)

print("\n" + "="*60)
print("[OK] Live server is working!")
print("="*60)
print("You can now access:")
print("  - Login: http://127.0.0.1:5000/auth/login")
print("  - Profile: http://127.0.0.1:5000/profile")
print("  - Email: smsad373@gmail.com")
print("  - Password: NewPassword123")
print("="*60)
