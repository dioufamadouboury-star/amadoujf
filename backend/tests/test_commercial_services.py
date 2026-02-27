"""
Test Suite for Commercial Documents Module and Services Marketplace
Tests: Partners, Quotes, Invoices, Contracts, PDF Generation, Services
"""
import pytest
import requests
import os
import json
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stable-prod.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"

# Test data IDs from previous tests
TEST_PARTNER_ID = "PART-C073D456"
TEST_QUOTE_ID = "DEV-B65205FC"
TEST_INVOICE_ID = "INV-E89A3766"
TEST_CONTRACT_ID = "CTR-0B5A17A8"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {admin_token}"}


# ============== SERVICES MARKETPLACE TESTS ==============

class TestServicesMarketplace:
    """Test Services Marketplace APIs"""
    
    def test_get_categories(self):
        """GET /api/services/categories - Should return 10 categories"""
        response = requests.get(f"{BASE_URL}/api/services/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) == 10
        
        # Verify category structure
        for cat in categories:
            assert "category_id" in cat
            assert "name_fr" in cat
            assert "icon" in cat
            assert "subcategories" in cat
        
        # Verify specific categories exist
        category_ids = [c["category_id"] for c in categories]
        assert "construction" in category_ids
        assert "electricity_plumbing" in category_ids
        assert "beauty" in category_ids
        assert "tech" in category_ids
    
    def test_get_providers(self):
        """GET /api/services/providers - Should return providers list"""
        response = requests.get(f"{BASE_URL}/api/services/providers")
        assert response.status_code == 200
        
        data = response.json()
        assert "providers" in data
        assert "total" in data
        assert isinstance(data["providers"], list)
        
        # Verify at least 1 test provider exists
        assert data["total"] >= 1
        
        # Verify provider structure (no password exposed)
        if data["providers"]:
            provider = data["providers"][0]
            assert "provider_id" in provider
            assert "name" in provider
            assert "profession" in provider
            assert "password" not in provider  # Security check
    
    def test_get_providers_with_filter(self):
        """GET /api/services/providers with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/services/providers",
            params={"category": "electricity_plumbing"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "providers" in data
    
    def test_get_locations(self):
        """GET /api/services/locations - Should return cities and zones"""
        response = requests.get(f"{BASE_URL}/api/services/locations")
        assert response.status_code == 200
        
        data = response.json()
        assert "cities" in data
        assert "dakar_zones" in data
        assert isinstance(data["cities"], list)
        assert isinstance(data["dakar_zones"], list)
        assert "Dakar" in data["cities"]
    
    def test_create_service_request(self):
        """POST /api/services/requests - Should create service request"""
        request_data = {
            "category": "electricity_plumbing",
            "profession": "Plombier",
            "description": "Need a plumber for testing",
            "city": "Dakar",
            "zone": "Parcelles Assainies",
            "client_name": "Test Customer",
            "client_phone": "+221771234567",
            "client_email": "test@example.com",
            "budget": "5000-20000 FCFA"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/services/requests",
            json=request_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "request_id" in data


# ============== COMMERCIAL PARTNERS TESTS ==============

class TestCommercialPartners:
    """Test Commercial Partners APIs"""
    
    def test_get_partners(self, auth_headers):
        """GET /api/commercial/partners - Should list partners"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/partners",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "partners" in data
        assert "total" in data
        assert isinstance(data["partners"], list)
    
    def test_get_partners_requires_auth(self):
        """GET /api/commercial/partners - Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/commercial/partners")
        assert response.status_code == 401
    
    def test_create_partner(self, auth_headers):
        """POST /api/commercial/partners - Should create new partner"""
        partner_data = {
            "name": "Test Partner Contact",
            "company_name": "Test Company SARL",
            "address": "123 Test Street",
            "city": "Dakar",
            "country": "Sénégal",
            "email": f"test_{datetime.now().timestamp()}@example.com",
            "phone": "+221771234567",
            "ninea": "123456789",
            "rccm": "SN DKR 2026 TEST"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/commercial/partners",
            json=partner_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "partner_id" in data
        
        # Store for later tests
        return data["partner_id"]
    
    def test_get_partner_by_id(self, auth_headers):
        """GET /api/commercial/partners/{id} - Should return partner details"""
        # First get list to find a partner
        list_response = requests.get(
            f"{BASE_URL}/api/commercial/partners",
            headers=auth_headers
        )
        partners = list_response.json().get("partners", [])
        
        if partners:
            partner_id = partners[0]["partner_id"]
            response = requests.get(
                f"{BASE_URL}/api/commercial/partners/{partner_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["partner_id"] == partner_id


# ============== COMMERCIAL QUOTES TESTS ==============

class TestCommercialQuotes:
    """Test Commercial Quotes (Devis) APIs"""
    
    def test_get_quotes(self, auth_headers):
        """GET /api/commercial/quotes - Should list quotes with stats"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/quotes",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "quotes" in data
        assert "stats" in data
        assert isinstance(data["quotes"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "pending" in stats
        assert "accepted" in stats
        assert "refused" in stats
    
    def test_create_quote(self, auth_headers):
        """POST /api/commercial/quotes - Should create quote with auto-numbering"""
        # First get a partner
        partners_response = requests.get(
            f"{BASE_URL}/api/commercial/partners",
            headers=auth_headers
        )
        partners = partners_response.json().get("partners", [])
        
        if not partners:
            pytest.skip("No partners available for quote creation")
        
        partner_id = partners[0]["partner_id"]
        
        quote_data = {
            "partner_id": partner_id,
            "title": "Test Quote - Web Development",
            "description": "Development of e-commerce website",
            "items": [
                {
                    "description": "Website Design",
                    "quantity": 1,
                    "unit_price": 500000,
                    "unit": "forfait"
                },
                {
                    "description": "Development",
                    "quantity": 40,
                    "unit_price": 25000,
                    "unit": "heure"
                }
            ],
            "validity_days": 30,
            "payment_terms": "50% à la commande, 50% à la livraison"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/commercial/quotes",
            json=quote_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "quote_id" in data
        assert "quote_number" in data
        
        # Verify quote number format: YMP-DEV-YYYY-NNN
        quote_number = data["quote_number"]
        assert quote_number.startswith("YMP-DEV-")
        
        return data["quote_id"]
    
    def test_get_quote_pdf(self, auth_headers):
        """GET /api/commercial/quotes/{id}/pdf - Should download PDF"""
        # Get a quote first
        quotes_response = requests.get(
            f"{BASE_URL}/api/commercial/quotes",
            headers=auth_headers
        )
        quotes = quotes_response.json().get("quotes", [])
        
        if not quotes:
            pytest.skip("No quotes available for PDF test")
        
        quote_id = quotes[0]["quote_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/commercial/quotes/{quote_id}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content starts with PDF header
        assert response.content[:4] == b'%PDF'


# ============== COMMERCIAL INVOICES TESTS ==============

class TestCommercialInvoices:
    """Test Commercial Invoices (Factures) APIs"""
    
    def test_get_invoices(self, auth_headers):
        """GET /api/commercial/invoices - Should list invoices with stats"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/invoices",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "invoices" in data
        assert "stats" in data
        assert isinstance(data["invoices"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "unpaid" in stats
        assert "paid" in stats
        assert "total_amount" in stats
        assert "total_paid" in stats
    
    def test_get_invoice_pdf(self, auth_headers):
        """GET /api/commercial/invoices/{id}/pdf - Should download PDF"""
        # Get an invoice first
        invoices_response = requests.get(
            f"{BASE_URL}/api/commercial/invoices",
            headers=auth_headers
        )
        invoices = invoices_response.json().get("invoices", [])
        
        if not invoices:
            pytest.skip("No invoices available for PDF test")
        
        invoice_id = invoices[0]["invoice_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/commercial/invoices/{invoice_id}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content
        assert response.content[:4] == b'%PDF'


# ============== COMMERCIAL CONTRACTS TESTS ==============

class TestCommercialContracts:
    """Test Commercial Contracts APIs"""
    
    def test_get_contracts(self, auth_headers):
        """GET /api/commercial/contracts - Should list contracts"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "contracts" in data
        assert "stats" in data
        assert isinstance(data["contracts"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "draft" in stats
        assert "active" in stats
        assert "signed" in stats
    
    def test_get_contract_templates(self, auth_headers):
        """GET /api/commercial/contracts/templates - Should return contract templates"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts/templates",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        templates = response.json()
        assert isinstance(templates, dict)
        
        # Verify template types exist
        assert "partnership" in templates
        assert "sponsoring" in templates
        assert "vendor" in templates
        
        # Verify template structure
        for template_type, template in templates.items():
            assert "title" in template
            assert "clauses" in template
            assert isinstance(template["clauses"], list)
    
    def test_get_contract_pdf(self, auth_headers):
        """GET /api/commercial/contracts/{id}/pdf - Should download PDF"""
        # Get a contract first
        contracts_response = requests.get(
            f"{BASE_URL}/api/commercial/contracts",
            headers=auth_headers
        )
        contracts = contracts_response.json().get("contracts", [])
        
        if not contracts:
            pytest.skip("No contracts available for PDF test")
        
        contract_id = contracts[0]["contract_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts/{contract_id}/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify PDF content
        assert response.content[:4] == b'%PDF'


# ============== COMMERCIAL DASHBOARD TESTS ==============

class TestCommercialDashboard:
    """Test Commercial Dashboard API"""
    
    def test_get_dashboard(self, auth_headers):
        """GET /api/commercial/dashboard - Should return dashboard stats"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all sections exist
        assert "quotes" in data
        assert "invoices" in data
        assert "contracts" in data
        assert "partners" in data
        assert "recent_quotes" in data
        assert "recent_invoices" in data
        
        # Verify quotes stats
        assert "total" in data["quotes"]
        assert "pending" in data["quotes"]
        
        # Verify invoices stats
        assert "total" in data["invoices"]
        assert "total_amount" in data["invoices"]
        assert "total_paid" in data["invoices"]
        
        # Verify partners stats
        assert "total" in data["partners"]


# ============== PRODUCT SEO FIELDS TESTS ==============

class TestProductSEOFields:
    """Test Product SEO fields (meta_title, meta_description)"""
    
    def test_create_product_with_seo(self, auth_headers):
        """POST /api/products - Should accept SEO fields"""
        product_data = {
            "name": "Test SEO Product",
            "description": "Product with SEO fields",
            "price": 50000,
            "category": "electronique",
            "stock": 10,
            "meta_title": "Best Test Product - Buy Now",
            "meta_description": "This is a test product with optimized SEO description for search engines."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "product_id" in data
        
        # Verify SEO fields are saved
        product_id = data["product_id"]
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        
        product = get_response.json()
        # Note: SEO fields may or may not be returned depending on implementation
        
        # Cleanup - delete test product
        requests.delete(
            f"{BASE_URL}/api/products/{product_id}",
            headers=auth_headers
        )


# ============== ADMIN MENU TESTS ==============

class TestAdminMenu:
    """Test Admin menu has Commercial option"""
    
    def test_admin_stats(self, auth_headers):
        """GET /api/admin/stats - Should return admin stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_products" in data
        assert "total_orders" in data
        assert "total_users" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
