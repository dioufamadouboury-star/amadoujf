"""
Test suite for YAMA+ authentication and profile features
Tests: Password reset, Profile update, Login/Register phone field, MailerLite groups
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")


class TestPasswordResetFlow:
    """Test password reset functionality"""
    
    def test_forgot_password_existing_email(self):
        """Test forgot password with existing admin email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "admin@yama.sn"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return success message (doesn't reveal if email exists)
        print(f"✓ Forgot password response: {data}")
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password with non-existent email (should still return 200)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        # Should return 200 to prevent email enumeration
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password (non-existent) response: {data}")
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Reset password invalid token response: {data}")


class TestLoginReturnsPhone:
    """Test that login API returns phone field"""
    
    def test_login_returns_phone_field(self):
        """Test login with admin credentials returns phone field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data
        assert "token" in data
        # Phone field should be present (even if null)
        assert "phone" in data
        
        print(f"✓ Login response contains phone field: phone={data.get('phone')}")
        print(f"  Full response keys: {list(data.keys())}")
        return data.get("token")


class TestRegisterReturnsPhone:
    """Test that register API returns phone field"""
    
    def test_register_returns_phone_field(self):
        """Test registration returns phone field"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Test User",
            "password": "testpass123",
            "phone": "+221771234567"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data
        assert "token" in data
        # Phone field should be present and match what was sent
        assert "phone" in data
        assert data["phone"] == "+221771234567"
        
        print(f"✓ Register response contains phone field: phone={data.get('phone')}")
        print(f"  Full response keys: {list(data.keys())}")
    
    def test_register_without_phone(self):
        """Test registration without phone still returns phone field (as null)"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Test User No Phone",
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Phone field should be present (even if null)
        assert "phone" in data
        print(f"✓ Register without phone - phone field present: phone={data.get('phone')}")


class TestProfileAPI:
    """Test profile update and retrieval"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_me_returns_phone(self, auth_token):
        """Test GET /api/auth/me returns phone field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data
        # Phone field should be present
        assert "phone" in data
        
        print(f"✓ GET /api/auth/me returns phone: phone={data.get('phone')}")
        print(f"  Full response: {data}")
    
    def test_update_profile_name(self, auth_token):
        """Test updating profile name"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update name
        response = requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=headers,
            json={"name": "Admin Updated"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user" in data
        assert data["user"]["name"] == "Admin Updated"
        
        print(f"✓ Profile name updated: {data}")
        
        # Restore original name
        requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=headers,
            json={"name": "Admin YAMA+"}
        )
    
    def test_update_profile_phone(self, auth_token):
        """Test updating profile phone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update phone
        response = requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=headers,
            json={"phone": "+221783827575"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "user" in data
        assert data["user"]["phone"] == "+221783827575"
        
        print(f"✓ Profile phone updated: {data}")
    
    def test_update_profile_both_fields(self, auth_token):
        """Test updating both name and phone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=headers,
            json={
                "name": "Admin Test",
                "phone": "+221771112233"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["name"] == "Admin Test"
        assert data["user"]["phone"] == "+221771112233"
        
        print(f"✓ Profile both fields updated: {data}")
        
        # Restore
        requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=headers,
            json={"name": "Admin YAMA+", "phone": None}
        )
    
    def test_update_profile_empty_data(self, auth_token):
        """Test updating profile with empty data returns error"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(f"{BASE_URL}/api/auth/profile", 
            headers=headers,
            json={}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Empty profile update rejected: {data}")
    
    def test_update_profile_unauthorized(self):
        """Test updating profile without auth returns 401"""
        response = requests.put(f"{BASE_URL}/api/auth/profile", 
            json={"name": "Test"}
        )
        
        assert response.status_code == 401
        print(f"✓ Unauthorized profile update rejected")


class TestMailerLiteGroups:
    """Test MailerLite groups API"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_mailerlite_groups(self, admin_token):
        """Test GET /api/admin/mailerlite/groups returns groups"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/mailerlite/groups", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have groups key
        assert "groups" in data
        
        # If MailerLite is configured, groups should be a list
        if "error" not in data:
            assert isinstance(data["groups"], list)
            print(f"✓ MailerLite groups retrieved: {len(data['groups'])} groups")
            for group in data["groups"][:5]:  # Print first 5
                print(f"  - {group.get('name', 'Unknown')}: {group.get('active_count', 0)} subscribers")
        else:
            print(f"✓ MailerLite response (may not be configured): {data}")
    
    def test_mailerlite_groups_unauthorized(self):
        """Test MailerLite groups without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/mailerlite/groups")
        assert response.status_code == 401
        print(f"✓ Unauthorized MailerLite access rejected")
    
    def test_mailerlite_groups_non_admin(self):
        """Test MailerLite groups with non-admin user returns 403"""
        # First register a regular user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Regular User",
            "password": "testpass123"
        })
        
        if reg_response.status_code == 200:
            token = reg_response.json().get("token")
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(f"{BASE_URL}/api/admin/mailerlite/groups", headers=headers)
            assert response.status_code == 403
            print(f"✓ Non-admin MailerLite access rejected with 403")


class TestCartFlow:
    """Test cart functionality with localStorage-based session"""
    
    def test_add_to_cart(self):
        """Test adding product to cart"""
        # Generate a cart session ID (simulating localStorage)
        cart_session = f"cart_{uuid.uuid4().hex[:16]}"
        headers = {"X-Cart-Session": cart_session}
        
        # First get a product
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if products:
            product_id = products[0]["product_id"]
            
            # Add to cart
            response = requests.post(f"{BASE_URL}/api/cart/add", 
                headers=headers,
                json={
                    "product_id": product_id,
                    "quantity": 1
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print(f"✓ Add to cart: {data}")
            
            # Get cart to verify
            cart_response = requests.get(f"{BASE_URL}/api/cart", headers=headers)
            assert cart_response.status_code == 200
            cart_data = cart_response.json()
            assert "items" in cart_data
            print(f"✓ Cart retrieved: {len(cart_data['items'])} items")
        else:
            pytest.skip("No products available for cart test")


class TestProductsAPI:
    """Test products API"""
    
    def test_get_products(self):
        """Test GET /api/products returns products"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Products retrieved: {len(data)} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
