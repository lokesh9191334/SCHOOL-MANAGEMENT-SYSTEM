from app import create_app
from models import db, User

app = create_app()

with app.test_client() as client:
    print("Testing with follow_redirects=True on each request...")
    
    # Login first
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    print(f"1. Login: {response.status_code}")
    
    # Try profile update with redirects
    response = client.post('/profile/update', 
        data={
            'fullName': 'Updated Admin User',
            'email': 'smsad373@gmail.com',
            'phone': '9876543210',
            'address': 'Test Address'
        },
        follow_redirects=True
    )
    print(f"2. Profile update: {response.status_code}")
    if response.status_code == 200:
        try:
            data = response.get_json()
            print(f"   Response: {data}")
        except:
            if 'success' in response.data.decode():
                print(f"   Got HTML response (likely success page)")
    
    # Reset password for next test
    app_ctx = app.app_context()
    app_ctx.push()
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    user.set_password('AdminPass123')
    db.session.commit()
    app_ctx.pop()
    
    print("\n3. Testing password change...")
    # Login again
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    print(f"   Re-login: {response.status_code}")
    
    # Try password change with redirects
    response = client.post('/settings/change-password',
        json={
            'old_password': 'AdminPass123',
            'new_password': 'NewPassword123'
        },
        follow_redirects=True
    )
    print(f"   Password change: {response.status_code}")
    try:
        data = response.get_json()
        print(f"   Response: {data}")
    except:
        print(f"   Got non-JSON response")
