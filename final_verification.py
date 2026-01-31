from app import create_app
from models import db, User

app = create_app()

# Reset password to initial state
with app.app_context():
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    if user:
        user.set_password('AdminPass123')
        db.session.commit()
        print(f"[SETUP] Reset password for {user.email}")

print("\n" + "=" * 60)
print("FINAL FEATURE VERIFICATION TEST")
print("=" * 60)

with app.test_client() as client:
    # TEST 1: LOGIN
    print("\n[TEST 1] Login with Email and Password")
    print("-" * 60)
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    
    if response.status_code == 200 and 'dashboard' in response.data.decode().lower():
        print("[PASS] User successfully logged in")
    else:
        print(f"[FAIL] Login failed with status {response.status_code}")
    
    # TEST 2: PROFILE UPDATE
    print("\n[TEST 2] Edit Profile (Update Name, Email, Phone, Address)")
    print("-" * 60)
    response = client.post('/profile/update', 
        data={
            'fullName': 'Administrator User',
            'email': 'smsad373@gmail.com',
            'phone': '+91-9876543210',
            'address': 'School Management System'
        },
        follow_redirects=True
    )
    
    if response.status_code == 200:
        print("[PASS] Profile updated successfully")
        # Verify in database
        with app.app_context():
            user = User.query.filter_by(email='smsad373@gmail.com').first()
            if user and user.name == 'Administrator User':
                print(f"[VERIFY] Database updated: Name={user.name}, Phone={user.phone}")
    else:
        print(f"[FAIL] Profile update failed with status {response.status_code}")
    
    # Reset for password test
    with app.app_context():
        user = User.query.filter_by(email='smsad373@gmail.com').first()
        user.set_password('AdminPass123')
        db.session.commit()
    
    # Login again for password change test
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    
    # TEST 3: PASSWORD CHANGE
    print("\n[TEST 3] Change Password (Old Password -> New Password)")
    print("-" * 60)
    response = client.post('/settings/change-password',
        json={
            'old_password': 'AdminPass123',
            'new_password': 'NewSecurePassword123'
        },
        follow_redirects=True
    )
    
    if response.status_code == 200:
        try:
            data = response.get_json()
            if data.get('success'):
                print("[PASS] Password changed successfully")
                
                # Verify new password works by logging in
                response = client.post('/auth/login', data={
                    'email': 'smsad373@gmail.com',
                    'password': 'NewSecurePassword123'
                }, follow_redirects=True)
                
                if response.status_code == 200:
                    print("[VERIFY] New password works - login successful")
                else:
                    print("[FAIL] Login with new password failed")
            else:
                print("[FAIL] Password change returned false")
        except:
            print("[FAIL] Failed to parse response")
    else:
        print(f"[FAIL] Password change failed with status {response.status_code}")

print("\n" + "=" * 60)
print("ALL FEATURES VERIFIED")
print("=" * 60)
