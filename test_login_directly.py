from app import create_app
from models import db, User
from flask_login import login_user

app = create_app()

with app.test_client() as client:
    # Login
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    
    print(f"Login response status: {response.status_code}")
    print(f"Redirected to dashboard: {'dashboard' in response.data.decode().lower()}")
    
    # Check if we can access profile
    response = client.get('/profile', follow_redirects=False)
    print(f"\nProfile access (no redirect): {response.status_code}")
    if response.status_code == 302:
        print(f"Redirect location: {response.headers.get('Location')}")
    
    # With redirects
    response = client.get('/profile', follow_redirects=True)
    print(f"\nProfile access (with redirects): {response.status_code}")
    if 'Edit Profile' in response.data.decode():
        print("SUCCESS: Profile page loaded with Edit Profile button!")
    else:
        print("FAIL: Still on login page or buttons missing")
        # Show first 500 chars
        print("\nPage content (first 500 chars):")
        print(response.data.decode()[:500])
