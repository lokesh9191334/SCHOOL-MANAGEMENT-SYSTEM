#!/usr/bin/env python3
"""
Direct login test script
"""
import requests

def test_login():
    """Test login directly"""
    url = "http://localhost:5000/auth/login"
    
    # Test data
    data = {
        'email': 'smsad373@gmail.com',
        'password': 'AdminPass123',
        'account_type': 'admin'
    }
    
    print("🔍 TESTING LOGIN DIRECTLY")
    print("=" * 50)
    print(f"URL: {url}")
    print(f"Data: {data}")
    print("-" * 50)
    
    try:
        # Send POST request
        response = requests.post(url, data=data, allow_redirects=False)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 302:
            location = response.headers.get('Location', 'No Location')
            print(f"✅ SUCCESS! Redirecting to: {location}")
            
            if location == '/':
                print("✅ CORRECT! Redirecting to Admin Dashboard")
            else:
                print(f"⚠️ UNEXPECTED! Redirecting to: {location}")
        else:
            print(f"❌ FAILED! Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_login()
