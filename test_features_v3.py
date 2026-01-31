from app import create_app
from models import db, User

app = create_app()

with app.test_client() as client:
    print("=" * 50)
    print("TEST 1: LOGIN TEST")
    print("=" * 50)
    
    # First login
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    print(f"Login status: {response.status_code}")
    if response.status_code == 200:
        print("[OK] Login successful")
    else:
        print("[FAIL] Login failed")
        
    print("\n" + "=" * 50)
    print("TEST 2: PROFILE UPDATE TEST")
    print("=" * 50)
    
    # Use form data, not JSON
    response = client.post('/profile/update', 
        data={
            'fullName': 'Updated Admin User',
            'email': 'smsad373@gmail.com',
            'phone': '9876543210',
            'address': 'Test Address'
        })
    print(f"Profile update status: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"Response: {data}")
        if data and data.get('success'):
            print("[OK] Profile update successful")
        else:
            print(f"[FAIL] Profile update failed: {data}")
    else:
        print(f"[FAIL] Profile update error: {response.status_code}")
        print(f"Response: {response.data.decode()}")
        
    print("\n" + "=" * 50)
    print("TEST 3: PASSWORD CHANGE TEST")
    print("=" * 50)
    
    response = client.post('/settings/change-password',
        json={
            'old_password': 'AdminPass123',
            'new_password': 'NewPassword123'
        })
    print(f"Password change status: {response.status_code}")
    if response.status_code == 200:
        data = response.get_json()
        print(f"Response: {data}")
        if data and data.get('success'):
            print("[OK] Password change successful")
            # Verify new password works
            response2 = client.post('/auth/login', data={
                'email': 'smsad373@gmail.com',
                'password': 'NewPassword123'
            }, follow_redirects=True)
            if response2.status_code == 200:
                print("[OK] New password login successful")
            else:
                print("[FAIL] New password login failed")
        else:
            print(f"[FAIL] Password change failed: {data}")
    else:
        print(f"[FAIL] Password change error: {response.status_code}")
        print(f"Response: {response.data.decode()}")
