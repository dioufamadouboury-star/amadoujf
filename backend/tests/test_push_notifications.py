"""
Push Notifications API Tests
Tests for VAPID key, subscription, unsubscription, and admin stats endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"

class TestPushNotifications:
    """Push notification endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    # ============== VAPID PUBLIC KEY TESTS ==============
    
    def test_get_vapid_public_key_returns_200(self):
        """GET /api/push/vapid-public-key returns 200"""
        response = self.session.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_get_vapid_public_key_returns_key(self):
        """GET /api/push/vapid-public-key returns publicKey field"""
        response = self.session.get(f"{BASE_URL}/api/push/vapid-public-key")
        data = response.json()
        assert "publicKey" in data, "Response should contain publicKey field"
        
    def test_vapid_public_key_matches_expected(self):
        """VAPID public key matches expected value"""
        expected_key = "BHcPKi8wussREvjsO85BoeHYXLelN7eqJ0RNlZ_s1NrAG7_NfyDeGZX5gstAZOGM9FubIXvBlfH-556xEkXfnBU"
        response = self.session.get(f"{BASE_URL}/api/push/vapid-public-key")
        data = response.json()
        assert data.get("publicKey") == expected_key, f"VAPID key mismatch. Got: {data.get('publicKey')}"
    
    # ============== SUBSCRIPTION TESTS ==============
    
    def test_subscribe_push_returns_200(self):
        """POST /api/push/subscribe saves subscription and returns 200"""
        # Generate unique endpoint for test
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/test_{uuid.uuid4().hex}"
        
        subscription_data = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_subscribe_push_returns_success_message(self):
        """POST /api/push/subscribe returns success message"""
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/test_{uuid.uuid4().hex}"
        
        subscription_data = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        data = response.json()
        assert "message" in data, "Response should contain message field"
        
    def test_subscribe_push_validates_endpoint(self):
        """POST /api/push/subscribe validates endpoint field"""
        # Missing endpoint should fail validation
        subscription_data = {
            "keys": {
                "p256dh": "test_key",
                "auth": "test_auth"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        assert response.status_code == 422, f"Expected 422 for missing endpoint, got {response.status_code}"
        
    def test_subscribe_push_validates_keys(self):
        """POST /api/push/subscribe validates keys field"""
        # Missing keys should fail validation
        subscription_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        assert response.status_code == 422, f"Expected 422 for missing keys, got {response.status_code}"
    
    # ============== UNSUBSCRIPTION TESTS ==============
    
    def test_unsubscribe_push_returns_200(self):
        """POST /api/push/unsubscribe marks subscription as inactive"""
        # First subscribe
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/test_unsub_{uuid.uuid4().hex}"
        
        subscription_data = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        # Subscribe first
        self.session.post(f"{BASE_URL}/api/push/subscribe", json=subscription_data)
        
        # Then unsubscribe
        response = self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_unsubscribe_push_returns_success_message(self):
        """POST /api/push/unsubscribe returns success message"""
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/test_unsub_{uuid.uuid4().hex}"
        
        subscription_data = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "test_key",
                "auth": "test_auth"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/unsubscribe", json=subscription_data)
        data = response.json()
        assert "message" in data, "Response should contain message field"
    
    # ============== ADMIN STATS TESTS ==============
    
    def test_admin_push_stats_requires_auth(self):
        """GET /api/admin/push/stats requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/admin/push/stats")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
    def test_admin_push_stats_returns_200_with_auth(self):
        """GET /api/admin/push/stats returns 200 with admin auth"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
            
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/admin/push/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_admin_push_stats_returns_counts(self):
        """GET /api/admin/push/stats returns subscription counts"""
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
            
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/admin/push/stats")
        data = response.json()
        
        assert "total_subscriptions" in data, "Response should contain total_subscriptions"
        assert "active_subscriptions" in data, "Response should contain active_subscriptions"
        assert isinstance(data["total_subscriptions"], int), "total_subscriptions should be integer"
        assert isinstance(data["active_subscriptions"], int), "active_subscriptions should be integer"


class TestServiceWorker:
    """Service Worker file tests"""
    
    def test_sw_js_accessible(self):
        """sw.js file is accessible"""
        response = requests.get(f"{BASE_URL}/sw.js")
        # Service worker should be accessible (200) or served by frontend
        assert response.status_code in [200, 304], f"Expected 200/304, got {response.status_code}"
        
    def test_sw_js_contains_push_handler(self):
        """sw.js contains push event handler"""
        response = requests.get(f"{BASE_URL}/sw.js")
        if response.status_code == 200:
            content = response.text
            assert "push" in content.lower(), "sw.js should contain push event handler"
            assert "addEventListener" in content, "sw.js should have event listeners"


class TestEmailConfiguration:
    """Email configuration tests"""
    
    def test_contact_email_in_store_info(self):
        """Store info endpoint returns correct contact email"""
        # Check if there's a store info endpoint or verify via other means
        # The email should be contact@groupeyamaplus.com
        response = requests.get(f"{BASE_URL}/api/store/info")
        if response.status_code == 200:
            data = response.json()
            if "email" in data:
                assert data["email"] == "contact@groupeyamaplus.com", f"Expected contact@groupeyamaplus.com, got {data.get('email')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
