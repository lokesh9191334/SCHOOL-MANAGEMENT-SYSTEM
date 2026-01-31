#!/usr/bin/env python
import requests
import re

s = requests.Session()

# Get login page first
print("Getting login page...")
r = s.get('http://127.0.0.1:5000/auth/login')
print(f"Status: {r.status_code}")

# Try to POST
print("\nPOSTing login form...")
r = s.post('http://127.0.0.1:5000/auth/login', data={
    'email': 'smsad373@gmail.com',
    'password': 'NewPassword123',
    'account_type': 'admin'
})

print(f"Response status: {r.status_code}")
print(f"Response length: {len(r.text)} chars")

if 'PASSWORD CORRECT' in r.text:
    print("SUCCESS: Found password check logs!")
elif 'LOGIN ATTEMPT' in r.text:
    print("Attempt logged but something went wrong")
elif 'form' in r.text:
    print("Got a form back (login page)")
    if 'method=' in r.text:
        match = re.search(r'<form[^>]*method=["\']([^"\']*)["\']', r.text)
        if match:
            print(f"Form method: {match.group(1)}")
else:
    print("Unexpected response")

print("\nChecking session...")
print(f"Cookies: {s.cookies.get_dict()}")
