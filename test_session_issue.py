import requests
import time

BASE_URL = "http://127.0.0.1:5000"

session = requests.Session()

print("Step 1: Login")
response = session.post(f"{BASE_URL}/auth/login", data={
    'email': 'smsad373@gmail.com',
    'password': 'AdminPass123'
}, allow_redirects=True)

print(f"Login response status: {response.status_code}")
print(f"Cookies after login: {session.cookies}")
print(f"Cookie domain: {list(session.cookies)}")

print("\n\nStep 2: Check if logged in by visiting profile")
response = session.get(f"{BASE_URL}/profile", allow_redirects=False)
print(f"Profile request status: {response.status_code}")
if response.status_code == 302:
    print(f"Redirected to: {response.headers.get('Location')}")
    
print(f"Cookies when accessing profile: {session.cookies}")

# Try with follow_redirects
print("\n\nStep 3: Following redirects")
response = session.get(f"{BASE_URL}/profile", allow_redirects=True)
print(f"Profile (with redirects) status: {response.status_code}")
if 'login' in response.text.lower():
    print("Still on login page!")
else:
    print("Got profile page!")
