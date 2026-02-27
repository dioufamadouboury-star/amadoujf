"""
Test suite for GROUPE YAMA+ Migration - Final Validation
Testing all core features work without Emergent dependencies
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductsAPI:
    """Tests for Products API"""
    
    def test_get_products_list(self):
        """Test products list endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0
        print(f"PASS: GET /api/products - {len(products)} products returned")
    
    def test_get_products_by_category_electronique(self):
        """Test filtering products by category - Électronique"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronique")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        for p in products:
            assert p.get('category') == 'electronique'
        print(f"PASS: Products filtered by category=electronique - {len(products)} products")
    
    def test_get_products_by_category_electromenager(self):
        """Test filtering products by category - Électroménager"""
        response = requests.get(f"{BASE_URL}/api/products?category=electromenager")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Products filtered by category=electromenager - {len(products)} products")
    
    def test_get_products_by_category_decoration(self):
        """Test filtering products by category - Décoration"""
        response = requests.get(f"{BASE_URL}/api/products?category=decoration")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Products filtered by category=decoration - {len(products)} products")
    
    def test_get_products_by_category_beaute(self):
        """Test filtering products by category - Beauté"""
        response = requests.get(f"{BASE_URL}/api/products?category=beaute")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Products filtered by category=beaute - {len(products)} products")
    
    def test_get_products_by_category_automobile(self):
        """Test filtering products by category - Automobile"""
        response = requests.get(f"{BASE_URL}/api/products?category=automobile")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Products filtered by category=automobile - {len(products)} products")
    
    def test_get_featured_products(self):
        """Test featured products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products?featured=true&limit=4")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Featured products - {len(products)} products")
    
    def test_get_new_products(self):
        """Test new products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products?is_new=true&limit=4")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: New products - {len(products)} products")
    
    def test_get_promo_products(self):
        """Test promo products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products?is_promo=true&limit=4")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Promo products - {len(products)} products")


class TestAuthAPI:
    """Tests for Authentication API"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@yama.sn", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert 'user_id' in data
        assert data['email'] == 'admin@yama.sn'
        assert data['role'] == 'admin'
        print(f"PASS: Admin login successful - role={data['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("PASS: Invalid credentials correctly rejected with 401")
    
    def test_auth_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@yama.sn", "password": "admin123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()['token']
        
        # Test /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['email'] == 'admin@yama.sn'
        assert data['role'] == 'admin'
        print(f"PASS: /auth/me returns user data correctly")
    
    def test_auth_me_without_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("PASS: /auth/me without token returns 401")


class TestAdminAccess:
    """Tests for Admin Dashboard Access"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@yama.sn", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Admin login failed")
    
    def test_admin_products_access(self, admin_token):
        """Test admin can access products management"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("PASS: Admin can access products list")
    
    def test_admin_orders_access(self, admin_token):
        """Test admin can access orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("PASS: Admin can access orders list")
    
    def test_admin_stats_access(self, admin_token):
        """Test admin can access stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'total_products' in data or 'totalProducts' in data
        print("PASS: Admin can access dashboard stats")


class TestCommercialManagement:
    """Tests for Gestion Commerciale (Commercial Management)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@yama.sn", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Admin login failed")
    
    def test_commercial_partners_access(self, admin_token):
        """Test access to commercial partners"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/partners",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"partners": [...], "total": N}
        partners = data.get('partners', data) if isinstance(data, dict) else data
        assert isinstance(partners, list)
        print(f"PASS: Commercial partners endpoint - {len(partners)} partners")
    
    def test_commercial_contracts_access(self, admin_token):
        """Test access to commercial contracts"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"contracts": [...], "stats": {...}}
        contracts = data.get('contracts', data) if isinstance(data, dict) else data
        assert isinstance(contracts, list)
        print(f"PASS: Commercial contracts endpoint - {len(contracts)} contracts")
    
    def test_commercial_invoices_access(self, admin_token):
        """Test access to commercial invoices"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"invoices": [...], "stats": {...}}
        invoices = data.get('invoices', data) if isinstance(data, dict) else data
        assert isinstance(invoices, list)
        print(f"PASS: Commercial invoices endpoint - {len(invoices)} invoices")


class TestCoreEndpoints:
    """Tests for other core endpoints"""
    
    def test_flash_sales(self):
        """Test flash sales endpoint"""
        response = requests.get(f"{BASE_URL}/api/flash-sales")
        assert response.status_code == 200
        print("PASS: Flash sales endpoint working")
    
    def test_reviews_stats(self):
        """Test reviews stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/reviews/stats")
        assert response.status_code == 200
        print("PASS: Reviews stats endpoint working")
    
    def test_cart_anonymous(self):
        """Test cart endpoint for anonymous users"""
        response = requests.get(f"{BASE_URL}/api/cart")
        # Should work even without auth (session-based cart)
        assert response.status_code == 200
        print("PASS: Cart endpoint working for anonymous users")
    
    def test_seed_endpoint(self):
        """Test database seed endpoint"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        print("PASS: Seed endpoint working")
    
    def test_game_config(self):
        """Test game config endpoint"""
        response = requests.get(f"{BASE_URL}/api/game/config")
        assert response.status_code == 200
        print("PASS: Game config endpoint working")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_reachable(self):
        """Test API is reachable"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        print("PASS: API is reachable")
    
    def test_product_search(self):
        """Test product search functionality"""
        response = requests.get(f"{BASE_URL}/api/products?search=iPhone")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"PASS: Product search working - {len(products)} results for 'iPhone'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
