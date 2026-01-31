import requests
import time

BASE_URL = "http://127.0.0.1:5000"

session = requests.Session()

# Login
response = session.post(f"{BASE_URL}/auth/login", data={
    'email': 'smsad373@gmail.com',
    'password': 'AdminPass123'
})

# Get profile page
response = session.get(f"{BASE_URL}/profile")

# Save to file
with open('profile_response.html', 'w', encoding='utf-8') as f:
    f.write(response.text)

print(f"Profile page saved ({len(response.text)} chars)")
print(f"\nFirst 1000 chars:\n")
print(response.text[:1000])
print(f"\n...\n\nLast 500 chars:\n")
print(response.text[-500:])
