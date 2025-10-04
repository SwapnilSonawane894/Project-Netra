#!/usr/bin/env python3
import requests
import json

# Test authentication endpoint
url = "https://ominous-cod-66p7w57pjpvf47wr-8000.app.github.dev/api/auth/login"

data = {
    "username": "principal",
    "password": "admin123"
}

try:
    response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        print("✅ Authentication successful!")
        result = response.json()
        print(f"Token: {result.get('access_token', 'No token')}")
        print(f"User: {result.get('user', 'No user data')}")
    else:
        print("❌ Authentication failed!")
        
except requests.exceptions.RequestException as e:
    print(f"❌ Request failed: {e}")