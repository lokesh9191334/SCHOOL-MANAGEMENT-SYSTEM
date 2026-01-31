import requests
import time

# Give server time to start
time.sleep(2)

BASE_URL = "http://127.0.0.1:5000"

print("=" * 60)
print("TESTING PROFILE PAGE - BUTTONS VISIBILITY")
print("=" * 60)

session = requests.Session()

# Step 1: Login
print("\n[1] Logging in...")
response = session.post(f"{BASE_URL}/auth/login", data={
    'email': 'smsad373@gmail.com',
    'password': 'AdminPass123'
})
print(f"Login status: {response.status_code}")

# Step 2: Get profile page
print("[2] Fetching profile page...")
response = session.get(f"{BASE_URL}/profile")
html = response.text

print(f"Profile page status: {response.status_code}")

# Step 3: Check for buttons
print("\n[3] Checking for Edit Profile button...")
if 'Edit Profile' in html:
    print("[OK] 'Edit Profile' text found")
    if 'data-bs-toggle="modal"' in html and 'editProfileModal' in html:
        print("[OK] Edit Profile button has modal attributes")
    else:
        print("[FAIL] Edit Profile button missing modal attributes")
else:
    print("[FAIL] 'Edit Profile' text NOT found")

print("\n[4] Checking for Change Password button...")
if 'Change Password' in html:
    print("[OK] 'Change Password' text found")
    if 'onclick="changePassword()"' in html:
        print("[OK] Change Password button has onclick handler")
    else:
        print("[FAIL] Change Password button missing onclick handler")
else:
    print("[FAIL] 'Change Password' text NOT found")

# Check CSS
print("\n[5] Checking CSS files...")
css_response = session.get(f"{BASE_URL}/static/css/profile_premium.css")
css_text = css_response.text

if 'btn-premium-gold' in css_text:
    print("[OK] CSS file has btn-premium-gold")
else:
    print("[FAIL] CSS file missing btn-premium-gold")

if 'pointer-events: none' in css_text:
    print("[OK] CSS has pointer-events: none (overlay fix)")
else:
    print("[FAIL] CSS missing pointer-events fix")

if '.bg-gradient-premium {' in css_text:
    print("[OK] CSS has bg-gradient-premium style")
else:
    print("[FAIL] CSS missing bg-gradient-premium")

# Check JavaScript
print("\n[6] Checking JavaScript...")
if 'function saveProfile()' in html or 'async function saveProfile()' in html:
    print("[OK] saveProfile() function exists")
else:
    print("[FAIL] saveProfile() function missing")

if 'function changePassword()' in html:
    print("[OK] changePassword() function exists")
else:
    print("[FAIL] changePassword() function missing")

if 'bootstrap.bundle' in html.lower():
    print("[OK] Bootstrap JS is loaded")
else:
    print("[FAIL] Bootstrap JS NOT loaded")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
