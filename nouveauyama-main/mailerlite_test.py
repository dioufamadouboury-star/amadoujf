#!/usr/bin/env python3
"""
Focused MailerLite Abandoned Cart Integration Test
"""

import requests
import json

def test_mailerlite_endpoints():
    base_url = "https://stable-prod.preview.emergentagent.com"
    
    # First, login as admin
    login_data = {
        "email": "admin@yama.sn",
        "password": "admin123"
    }
    
    print("🔐 Logging in as admin...")
    response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return
    
    token = response.json().get('token')
    print(f"✅ Login successful, token: {token[:20]}...")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test endpoints
    endpoints = [
        ("GET", "/api/admin/abandoned-carts/stats", "Get stats"),
        ("GET", "/api/admin/abandoned-carts", "List abandoned carts"),
        ("POST", "/api/admin/abandoned-carts/trigger", "Trigger detection"),
        ("GET", "/api/admin/abandoned-carts/emails", "List sent emails"),
    ]
    
    print("\n📧 Testing MailerLite Abandoned Cart Endpoints...")
    
    for method, endpoint, description in endpoints:
        print(f"\n{method} {endpoint} - {description}")
        
        if method == "GET":
            response = requests.get(f"{base_url}{endpoint}", headers=headers)
        elif method == "POST":
            response = requests.post(f"{base_url}{endpoint}", headers=headers)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if endpoint.endswith("/stats"):
                print(f"✅ Stats: {data.get('abandoned_carts', 0)} carts, {data.get('total_emails_sent', 0)} emails sent")
                print(f"   Automation: {data.get('automation_interval_hours', 0)}h interval, {data.get('cart_timeout_hours', 0)}h timeout")
            elif endpoint.endswith("/abandoned-carts"):
                print(f"✅ Found {len(data)} abandoned carts")
                if data:
                    cart = data[0]
                    print(f"   Sample cart: {cart.get('cart_id')} - {cart.get('user_email')} - {len(cart.get('items', []))} items")
            elif endpoint.endswith("/trigger"):
                print(f"✅ Trigger response: {data.get('message', 'No message')}")
            elif endpoint.endswith("/emails"):
                print(f"✅ Found {len(data)} sent emails")
                if data:
                    email = data[0]
                    print(f"   Sample email: {email.get('email')} - subscriber_id: {email.get('subscriber_id')}")
        else:
            print(f"❌ Error: {response.text}")
    
    # Test authentication requirement
    print("\n🔒 Testing authentication requirement...")
    
    for method, endpoint, description in endpoints:
        if method == "GET":
            response = requests.get(f"{base_url}{endpoint}")  # No auth headers
        elif method == "POST":
            response = requests.post(f"{base_url}{endpoint}")  # No auth headers
        
        if response.status_code == 401:
            print(f"✅ {endpoint} properly requires authentication")
        else:
            print(f"❌ {endpoint} does not require authentication (status: {response.status_code})")
    
    # Test manual send with non-existent cart
    print("\n🧪 Testing manual send with non-existent cart...")
    response = requests.post(f"{base_url}/api/admin/abandoned-carts/send/nonexistent_cart", headers=headers)
    if response.status_code == 404:
        print("✅ Properly returns 404 for non-existent cart")
    else:
        print(f"❌ Unexpected response: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_mailerlite_endpoints()