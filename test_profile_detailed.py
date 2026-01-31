#!/usr/bin/env python3
from app import create_app

app = create_app()

with app.test_client() as client:
    # Login
    resp = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123',
        'account_type': 'admin'
    })
    
    print('=' * 60)
    print('TESTING EDIT PROFILE')
    print('=' * 60)
    
    # Test update profile
    resp = client.post('/profile/update', data={
        'fullName': 'Updated Admin',
        'email': 'smsad373@gmail.com',
        'phone': '9876543210',
        'address': 'New Address'
    })
    
    print(f'Status Code: {resp.status_code}')
    result = resp.get_json()
    print(f'Response: {result}')
    
    if resp.status_code == 200:
        print('✅ Update Profile Works!')
    else:
        print(f'❌ Update Profile Failed: {result}')
    
    print('\n' + '=' * 60)
    print('TESTING CHANGE PASSWORD')
    print('=' * 60)
    
    # Test change password
    resp = client.post('/settings/change-password', 
        json={'old_password': 'AdminPass123', 'new_password': 'TestPass123'})
    
    print(f'Status Code: {resp.status_code}')
    result = resp.get_json()
    print(f'Response: {result}')
    
    if resp.status_code == 200 and result.get('success'):
        print('✅ Change Password Works!')
        
        # Try logging in with new password
        print('\nTrying to login with new password...')
        resp2 = client.post('/auth/login', data={
            'email': 'smsad373@gmail.com',
            'password': 'TestPass123',
            'account_type': 'admin'
        })
        print(f'Login with new password: {resp2.status_code}')
    else:
        print(f'❌ Change Password Failed: {result}')
    
    print('\n' + '=' * 60)
    print('CHECKING PROFILE PAGE HTML')
    print('=' * 60)
    
    # Get fresh login with original password for next tests
    client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123',
        'account_type': 'admin'
    })
    
    resp = client.get('/profile')
    html = resp.get_data(as_text=True)
    
    checks = {
        'editProfileModal found': 'editProfileModal' in html,
        'saveProfile function found': 'function saveProfile' in html,
        'changePasswordModal found': 'changePasswordModal' in html,
        'submitPasswordChange found': 'submitPasswordChange' in html,
        'form action correct': 'method="POST"' in html or '/profile/update' in html,
    }
    
    for check, result in checks.items():
        status = '✅' if result else '❌'
        print(f'{status} {check}')
    
    # Look for any JavaScript errors
    if 'Uncaught' in html or 'SyntaxError' in html or 'TypeError' in html:
        print('⚠️  Possible JavaScript errors found in HTML')
    
    print('\n' + '=' * 60)
    print('CHECKING SETTINGS PAGE HTML')
    print('=' * 60)
    
    resp = client.get('/settings')
    html = resp.get_data(as_text=True)
    
    checks = {
        'changePasswordModal found': 'changePasswordModal' in html,
        'submitSettingsPasswordChange found': 'submitSettingsPasswordChange' in html,
        'changePassword button found': 'onclick="changePassword()"' in html,
    }
    
    for check, result in checks.items():
        status = '✅' if result else '❌'
        print(f'{status} {check}')
