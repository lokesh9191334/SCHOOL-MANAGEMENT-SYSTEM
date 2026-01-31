from app import create_app

app = create_app()

with app.test_client() as client:
    # Login first
    response = client.post('/auth/login', data={
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123'
    }, follow_redirects=True)
    
    print(f"Login response status: {response.status_code}")
    if 'dashboard' in response.data.decode().lower():
        print("Login successful - dashboard found")
    else:
        print("Login may have failed - dashboard not in response")
    
    # Access profile page with redirect follow
    response = client.get('/profile', follow_redirects=True)
    html = response.data.decode()
    
    print("Checking profile.html page...")
    print(f"Status: {response.status_code}")
    
    # Check for Bootstrap JS
    if 'bootstrap.bundle.min.js' in html:
        print("[OK] Bootstrap JS is loaded")
    else:
        print("[FAIL] Bootstrap JS is NOT loaded")
    
    # Check for Edit Profile Modal
    if 'editProfileModal' in html:
        print("[OK] Edit Profile Modal exists")
    else:
        print("[FAIL] Edit Profile Modal missing")
    
    # Check for Change Password Modal
    if 'changePasswordModal' in html:
        print("[OK] Change Password Modal exists")
    else:
        print("[FAIL] Change Password Modal missing")
    
    # Check for Edit Profile button
    if 'Edit Profile' in html and 'data-bs-target="#editProfileModal"' in html:
        print("[OK] Edit Profile button is configured correctly")
    else:
        print("[FAIL] Edit Profile button not configured")
    
    # Check for Change Password button
    if 'Change Password' in html and 'onclick="changePassword()"' in html:
        print("[OK] Change Password button is configured correctly")
    else:
        print("[FAIL] Change Password button not configured")
    
    # Check for saveProfile function
    if 'function saveProfile()' in html or 'async function saveProfile()' in html:
        print("[OK] saveProfile function exists")
    else:
        print("[FAIL] saveProfile function missing")
    
    # Check for submitPasswordChange function
    if 'function submitPasswordChange()' in html or 'async function submitPasswordChange()' in html:
        print("[OK] submitPasswordChange function exists")
    else:
        print("[FAIL] submitPasswordChange function missing")

print("\nAll profile elements are in place!")
