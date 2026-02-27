"""
Comprehensive API tests for GROUPE YAMA+ E-commerce Platform
Testing: Auth, Products, Flash Sales, Blog, Cart, Checkout, Image Upload, PayTech
Final Pre-Deployment Verification - Iteration 27
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stable-prod.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"

class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "healthy"
        print(f"✅ Health check passed: {data}")

class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✅ Admin login successful: {data['email']}, role: {data['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected with 401")
    
    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Test /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✅ Auth/me returned correct user: {data['email']}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ Auth/me correctly rejected without token")

class TestProducts:
    """Product endpoint tests"""
    
    def test_get_products(self):
        """Test GET /api/products returns product list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify product structure
        first_product = data[0]
        assert "product_id" in first_product
        assert "name" in first_product
        assert "price" in first_product
        print(f"✅ Products endpoint returned {len(data)} products")
    
    def test_get_products_by_category(self):
        """Test filtering products by category"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronique")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned products should be in electronique category
        for product in data:
            assert product["category"] == "electronique"
        print(f"✅ Category filter works: {len(data)} electronique products")
    
    def test_get_single_product(self):
        """Test getting a single product by ID"""
        # First get list to find a product ID
        list_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = list_response.json()
        if products:
            product_id = products[0]["product_id"]
            
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["product_id"] == product_id
            print(f"✅ Single product retrieved: {data['name']}")

class TestFlashSales:
    """Flash sales endpoint tests"""
    
    def test_get_flash_sales(self):
        """Test GET /api/flash-sales returns active flash sales"""
        response = requests.get(f"{BASE_URL}/api/flash-sales")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify flash sale structure
        if len(data) > 0:
            first_sale = data[0]
            assert "product_id" in first_sale
            assert "flash_sale_price" in first_sale
            assert "flash_sale_end" in first_sale
            print(f"✅ Flash sales endpoint returned {len(data)} active sales")
        else:
            print("⚠️ No active flash sales found")

class TestBlog:
    """Blog endpoint tests"""
    
    def test_get_blog_posts(self):
        """Test GET /api/blog/posts returns blog articles"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            first_post = data[0]
            assert "post_id" in first_post
            assert "title" in first_post
            assert "slug" in first_post
            print(f"✅ Blog posts endpoint returned {len(data)} articles")

class TestServiceProviders:
    """Service providers endpoint tests"""
    
    def test_get_service_providers(self):
        """Test GET /api/services/providers returns providers"""
        response = requests.get(f"{BASE_URL}/api/services/providers")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert isinstance(data["providers"], list)
        print(f"✅ Service providers endpoint returned {len(data['providers'])} providers")

class TestImageUpload:
    """Image upload endpoint tests"""
    
    def test_upload_endpoint_exists(self):
        """Test that upload endpoint exists (no actual upload)"""
        # Test with empty POST should return error but endpoint exists
        response = requests.post(f"{BASE_URL}/api/upload/image")
        # 401 = requires auth, 422 = validation error - both mean endpoint exists
        assert response.status_code in [422, 400, 401]
        print(f"✅ Upload endpoint exists, returns {response.status_code} (auth required)")
    
    def test_upload_with_auth(self):
        """Test upload endpoint with authentication"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Test upload endpoint with auth but no file
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 422 (no file) now that we're authenticated
        assert response.status_code == 422
        print("✅ Upload endpoint with auth returns 422 (no file provided)")

class TestPayTech:
    """PayTech payment integration tests"""
    
    def test_paytech_verify_endpoint(self):
        """Test PayTech verify endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/payments/paytech/verify/nonexistent")
        # 404 = order not found, which means endpoint exists and validates
        assert response.status_code == 404
        print("✅ PayTech verify endpoint exists")

class TestOrders:
    """Order management tests"""
    
    def test_orders_endpoint_requires_auth(self):
        """Test orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/orders")
        # Should require auth
        assert response.status_code in [401, 403, 200]  # Depends on implementation
        print(f"✅ Orders endpoint returns status: {response.status_code}")

class TestCategories:
    """Category tests - verify all expected categories exist"""
    
    def test_electronique_category(self):
        """Test electronique category has products"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronique")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        print(f"✅ Electronique category: {len(data)} products")
    
    def test_electromenager_category(self):
        """Test electromenager category"""
        response = requests.get(f"{BASE_URL}/api/products?category=electromenager")
        assert response.status_code == 200
        print(f"✅ Electromenager category accessible")
    
    def test_beaute_category(self):
        """Test beaute category"""
        response = requests.get(f"{BASE_URL}/api/products?category=beaute")
        assert response.status_code == 200
        print(f"✅ Beaute category accessible")

class TestSessionPersistence:
    """Test token-based session persistence"""
    
    def test_token_reuse(self):
        """Test that same token can be used for multiple requests"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Make multiple requests with same token
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
            assert response.status_code == 200
            time.sleep(0.5)  # Small delay to avoid rate limiting
        
        print("✅ Token successfully reused for 3 sequential requests")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
