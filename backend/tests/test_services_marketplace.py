"""
Services Marketplace API Tests for YAMA+
Tests for the professional services marketplace feature
"""
import pytest
import requests
import os
import secrets

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestServiceCategories:
    """Test service categories endpoint"""
    
    def test_get_categories_returns_10_categories(self):
        """GET /api/services/categories should return 10 service categories"""
        response = requests.get(f"{BASE_URL}/api/services/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) == 10
        
        # Verify category structure
        for cat in categories:
            assert "category_id" in cat
            assert "name" in cat
            assert "name_fr" in cat
            assert "icon" in cat
            assert "description" in cat
            assert "subcategories" in cat
    
    def test_categories_include_expected_types(self):
        """Categories should include construction, plumbing, auto, beauty, tech, etc."""
        response = requests.get(f"{BASE_URL}/api/services/categories")
        categories = response.json()
        
        category_ids = [c["category_id"] for c in categories]
        expected_ids = ["construction", "electricity_plumbing", "auto", "beauty", "tech", 
                       "cleaning", "transport", "events", "education", "other"]
        
        for expected in expected_ids:
            assert expected in category_ids, f"Missing category: {expected}"


class TestServiceLocations:
    """Test service locations endpoint"""
    
    def test_get_locations_returns_cities_and_zones(self):
        """GET /api/services/locations should return Senegal cities and Dakar zones"""
        response = requests.get(f"{BASE_URL}/api/services/locations")
        assert response.status_code == 200
        
        data = response.json()
        assert "cities" in data
        assert "dakar_zones" in data
        
        # Verify cities include major Senegalese cities
        cities = data["cities"]
        assert "Dakar" in cities
        assert "Thiès" in cities
        assert "Saint-Louis" in cities
        
        # Verify Dakar zones
        zones = data["dakar_zones"]
        assert len(zones) > 10
        assert "Plateau" in zones
        assert "Almadies" in zones


class TestServiceProviders:
    """Test service providers endpoints"""
    
    def test_get_providers_list(self):
        """GET /api/services/providers should return providers list"""
        response = requests.get(f"{BASE_URL}/api/services/providers")
        assert response.status_code == 200
        
        data = response.json()
        assert "providers" in data
        assert "total" in data
        assert isinstance(data["providers"], list)
    
    def test_get_provider_by_id(self):
        """GET /api/services/providers/{id} should return provider details"""
        # Use the test provider ID
        provider_id = "PRV-FAB5D4AD"
        response = requests.get(f"{BASE_URL}/api/services/providers/{provider_id}")
        assert response.status_code == 200
        
        provider = response.json()
        assert provider["provider_id"] == provider_id
        assert "name" in provider
        assert "profession" in provider
        assert "city" in provider
        assert "phone" in provider
        assert "reviews" in provider
    
    def test_provider_response_excludes_password(self):
        """Provider API should NOT expose passwords - SECURITY CHECK"""
        provider_id = "PRV-FAB5D4AD"
        response = requests.get(f"{BASE_URL}/api/services/providers/{provider_id}")
        assert response.status_code == 200
        
        provider = response.json()
        assert "password" not in provider, "SECURITY ISSUE: Password exposed in API response!"
    
    def test_providers_list_excludes_passwords(self):
        """Providers list should NOT expose passwords - SECURITY CHECK"""
        response = requests.get(f"{BASE_URL}/api/services/providers")
        assert response.status_code == 200
        
        data = response.json()
        for provider in data["providers"]:
            assert "password" not in provider, "SECURITY ISSUE: Password exposed in providers list!"
    
    def test_filter_providers_by_category(self):
        """Should filter providers by category"""
        response = requests.get(f"{BASE_URL}/api/services/providers?category=electricity_plumbing")
        assert response.status_code == 200
        
        data = response.json()
        for provider in data["providers"]:
            assert provider["category"] == "electricity_plumbing"
    
    def test_filter_providers_by_city(self):
        """Should filter providers by city"""
        response = requests.get(f"{BASE_URL}/api/services/providers?city=Dakar")
        assert response.status_code == 200
        
        data = response.json()
        for provider in data["providers"]:
            assert provider["city"] == "Dakar"


class TestServiceRequests:
    """Test service requests endpoints"""
    
    def test_create_service_request(self):
        """POST /api/services/requests should create a service request"""
        request_data = {
            "category": "construction",
            "profession": "Peintre",
            "city": "Dakar",
            "zone": "Plateau",
            "description": f"Test request {secrets.token_hex(4)}",
            "client_name": "Test Client",
            "client_phone": "+221770000001"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/services/requests",
            json=request_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "request_id" in data
        assert data["request_id"].startswith("SR-")
    
    def test_get_service_request_by_id(self):
        """GET /api/services/requests/{id} should return request details"""
        request_id = "SR-3944A8AE"
        response = requests.get(f"{BASE_URL}/api/services/requests/{request_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["request_id"] == request_id
        assert "category" in data
        assert "profession" in data
        assert "client_name" in data
        assert "status" in data


class TestProviderRegistration:
    """Test provider registration endpoint"""
    
    def test_register_provider_with_valid_code(self):
        """POST /api/provider/register should register with valid invitation code"""
        unique_phone = f"+22177{secrets.token_hex(3)[:6]}"
        
        provider_data = {
            "name": "Test Provider",
            "profession": "Électricien",
            "category": "electricity_plumbing",
            "description": "Test provider registration",
            "city": "Dakar",
            "zone": "Plateau",
            "phone": unique_phone,
            "password": "testpass123",
            "invitation_code": "YAMAPLUS2025"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/register",
            json=provider_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "provider_id" in data
        assert data["provider_id"].startswith("PRV-")
    
    def test_register_provider_with_invalid_code(self):
        """Should reject registration with invalid invitation code"""
        provider_data = {
            "name": "Test Provider",
            "profession": "Électricien",
            "category": "electricity_plumbing",
            "description": "Test provider",
            "city": "Dakar",
            "phone": "+221770000002",
            "password": "testpass123",
            "invitation_code": "INVALID_CODE"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/register",
            json=provider_data
        )
        assert response.status_code == 403


class TestAdminServiceProviders:
    """Test admin endpoints for service providers"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@yama.sn", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_admin_get_providers(self, admin_token):
        """Admin: GET /api/admin/service-providers should list all providers with stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-providers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "providers" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "pending" in stats
        assert "active" in stats
        assert "verified" in stats
    
    def test_admin_providers_exclude_passwords(self, admin_token):
        """Admin endpoint should also exclude passwords - SECURITY CHECK"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-providers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for provider in data["providers"]:
            assert "password" not in provider, "SECURITY ISSUE: Password exposed in admin endpoint!"
    
    def test_admin_update_provider_status(self, admin_token):
        """Admin: PUT /api/admin/service-providers/{id} should update provider status"""
        provider_id = "PRV-FAB5D4AD"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/service-providers/{provider_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_verified": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
    
    def test_admin_requires_auth(self):
        """Admin endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/service-providers")
        assert response.status_code == 401


class TestAdminServiceRequests:
    """Test admin endpoints for service requests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@yama.sn", "password": "admin123"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_admin_get_service_requests(self, admin_token):
        """Admin: GET /api/admin/service-requests should list all requests with stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "requests" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "new" in stats
        assert "in_progress" in stats
        assert "completed" in stats
    
    def test_admin_update_service_request(self, admin_token):
        """Admin: PUT /api/admin/service-requests/{id} should update request"""
        request_id = "SR-3944A8AE"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/service-requests/{request_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"admin_notes": "Test note from automated test"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
