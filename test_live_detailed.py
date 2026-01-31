#!/usr/bin/env python
import requests
from pprint import pprint

URL = 'http://127.0.0.1:5000'

session = requests.Session()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': URL + '/auth/login',
    'Origin': URL,
}

print('GET login page...')
r = session.get(URL + '/auth/login', headers=headers)
print('GET login status:', r.status_code)

# Post login with browser-like headers and follow redirects
print('\nPOST login (follow redirects)')
post = session.post(URL + '/auth/login', headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded'}, data={
    'email': 'smsad373@gmail.com',
    'password': 'TestPass123',
    'account_type': 'admin'
}, allow_redirects=True)

print('POST status:', post.status_code)
print('Final URL:', post.url)
print('Response length:', len(post.text))
print('\nCookies after POST:')
print(session.cookies.get_dict())

print('\nResponse history (statuses):', [r.status_code for r in post.history])

print('\nCheck for Edit Profile in final response:')
print('Edit Profile present:', 'Edit Profile' in post.text)

# Now request /profile explicitly
print('\nGET /profile')
profile = session.get(URL + '/profile', headers=headers, allow_redirects=True)
print('Profile status:', profile.status_code)
print('Profile final URL:', profile.url)
print('Profile cookies:', session.cookies.get_dict())
print('Edit Profile on /profile:', 'Edit Profile' in profile.text)

# Print Set-Cookie from immediate POST response (if any)
print('\nImmediate POST Set-Cookie headers:')
for k, v in post.headers.items():
    if k.lower() == 'set-cookie':
        print(v)

print('\nDone')
