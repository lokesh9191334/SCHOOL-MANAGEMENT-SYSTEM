#!/usr/bin/env python
"""Verify all features work with fresh password"""
import sys
sys.path.insert(0, '.')

from app import create_app, db
from models import User
import json

app = create_app()

print("="*60)
print("FEATURE VERIFICATION - All Tests")
print("="*60)

client = app.test_client(use_cookies=True)

# Test 1: Login
print("\n[TEST 1] LOGIN")
response = client.post('/auth/login', data={
    'email': 'smsad373@gmail.com',
    'password': 'AdminPass123',
    'account_type': 'admin'
})
print(f"   Status: {response.status_code} (expected 302 redirect)")
assert response.status_code == 302, "Login failed!"

# Test 2: Access profile page
print("\n✅ TEST 2: PROFILE PAGE ACCESS")
response = client.get('/profile')
print(f"   Status: {response.status_code} (expected 200)")
assert response.status_code == 200, "Profile page not accessible!"
html = response.get_data(as_text=True)
assert 'Edit Profile' in html, "Edit Profile button not found!"
assert 'Change Password' in html, "Change Password button not found!"
print("   ✓ Edit Profile button found")
print("   ✓ Change Password button found")

# Test 3: Update profile
print("\n✅ TEST 3: UPDATE PROFILE")
response = client.post('/profile/update', data={
    'fullName': 'Test Admin User',
    'email': 'smsad373@gmail.com',
    'phone': '+91-9999999999',
    'address': 'Test Address'
})
print(f"   Status: {response.status_code} (expected 200)")
data = response.get_json()
print(f"   Response: {data}")
assert response.status_code == 200, f"Profile update failed! {data}"

# Verify in database
with app.app_context():
    user = User.query.get(1)
    assert user.name == 'Test Admin User', "Name not updated!"
    assert user.phone == '+91-9999999999', "Phone not updated!"
    print("   ✓ Name updated in database")
    print("   ✓ Phone updated in database")

# Test 4: Change password
print("\n✅ TEST 4: CHANGE PASSWORD")
response = client.post('/settings/change-password', json={
    'old_password': 'AdminPass123',
    'new_password': 'NewPassword123',
    'confirm_password': 'NewPassword123'
})
print(f"   Status: {response.status_code} (expected 200)")
data = response.get_json()
print(f"   Response: {data}")
assert response.status_code == 200, f"Password change failed! {data}"

# Verify password changed
with app.app_context():
    user = User.query.get(1)
    old_pass_works = user.check_password('AdminPass123')
    new_pass_works = user.check_password('NewPassword123')
    print(f"   ✓ Old password works: {old_pass_works} (expected False)")
    print(f"   ✓ New password works: {new_pass_works} (expected True)")
    assert not old_pass_works, "Old password should not work!"
    assert new_pass_works, "New password should work!"

# Test 5: Login with new password
print("\n✅ TEST 5: LOGIN WITH NEW PASSWORD")
client2 = app.test_client(use_cookies=True)
response = client2.post('/auth/login', data={
    'email': 'smsad373@gmail.com',
    'password': 'NewPassword123',
    'account_type': 'admin'
})
print(f"   Status: {response.status_code} (expected 302)")
assert response.status_code == 302, "Login with new password failed!"

response = client2.get('/profile')
print(f"   Profile access: {response.status_code} (expected 200)")
assert response.status_code == 200, "Cannot access profile with new password!"

print("\n" + "="*60)
print("✅ ALL FEATURES WORKING PERFECTLY!")
print("="*60)
print("Summary:")
print("  1. ✅ Login works with correct password")
print("  2. ✅ Profile page accessible after login")
print("  3. ✅ Edit Profile button visible")
print("  4. ✅ Change Password button visible")
print("  5. ✅ Profile update works")
print("  6. ✅ Database changes persisted")
print("  7. ✅ Change password works")
print("  8. ✅ New password works for login")
print("\n👉 Ready to test with live server at http://127.0.0.1:5000")
print("="*60)
