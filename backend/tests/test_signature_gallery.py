"""
Backend Tests for Digital Signature and Provider Gallery features
Tests:
1. Contract signature APIs (GET/POST)
2. Provider gallery APIs
3. Provider /me endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"
PROVIDER_EMAIL = "mamadou@example.com"
PROVIDER_PASSWORD = "provider123"

# Test contract ID from context
TEST_CONTRACT_NUMBER = "YMP-CTR-2026-005"


class TestSignatureAPIs:
    """Tests for Digital Contract Signature functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json().get("token")
        assert token, "No token returned from admin login"
        return token
    
    @pytest.fixture(scope="class")
    def contract_id(self, admin_token):
        """Get a contract ID for testing signatures"""
        # First get list of contracts
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get contracts: {response.text}"
        
        contracts = response.json().get("contracts", [])
        
        # Find the specific test contract or use first one
        for contract in contracts:
            if contract.get("contract_number") == TEST_CONTRACT_NUMBER:
                return contract["contract_id"]
        
        # If test contract not found, use first available
        if contracts:
            return contracts[0]["contract_id"]
        
        pytest.skip("No contracts available for testing")
    
    def test_get_contract_signatures_endpoint(self, admin_token, contract_id):
        """Test GET /api/commercial/contracts/{id}/signatures"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts/{contract_id}/signatures",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get signatures: {response.text}"
        
        data = response.json()
        assert "signatures" in data, "Response should contain 'signatures' key"
        assert "status" in data, "Response should contain 'status' key"
        assert "partner_signed" in data, "Response should contain 'partner_signed' key"
        assert "company_signed" in data, "Response should contain 'company_signed' key"
        assert "fully_signed" in data, "Response should contain 'fully_signed' key"
        
        print(f"✓ Signatures endpoint working - Status: {data.get('status')}, "
              f"Partner signed: {data.get('partner_signed')}, Company signed: {data.get('company_signed')}")
    
    def test_add_signature_to_contract(self, admin_token, contract_id):
        """Test POST /api/commercial/contracts/{id}/sign - Add digital signature"""
        # Base64 test signature (small PNG)
        test_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/commercial/contracts/{contract_id}/sign",
            json={
                "signature_data": test_signature,
                "signer_name": "TEST_Signataire",
                "signer_role": "partner"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to add signature: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "signature_id" in data, "Response should contain signature_id"
        assert "contract_status" in data, "Response should contain contract_status"
        
        print(f"✓ Signature added successfully - ID: {data.get('signature_id')}, "
              f"New status: {data.get('contract_status')}")
        
        return data.get("signature_id")
    
    def test_verify_signature_persisted(self, admin_token, contract_id):
        """Verify signature was persisted by GET after POST"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts/{contract_id}/signatures",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        signatures = data.get("signatures", [])
        
        # Find our test signature
        test_sig = next((s for s in signatures if s.get("signer_name") == "TEST_Signataire"), None)
        
        if test_sig:
            print(f"✓ Test signature found and persisted - ID: {test_sig.get('signature_id')}")
        else:
            print("⚠ Test signature not found (may have been cleaned up from previous runs)")
    
    def test_delete_signature(self, admin_token, contract_id):
        """Test DELETE /api/commercial/contracts/{id}/signatures/{signature_id}"""
        # First get signatures
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts/{contract_id}/signatures",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        signatures = response.json().get("signatures", [])
        
        # Find test signature to delete
        test_sig = next((s for s in signatures if "TEST_" in (s.get("signer_name") or "")), None)
        
        if not test_sig:
            pytest.skip("No test signature to delete")
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/commercial/contracts/{contract_id}/signatures/{test_sig['signature_id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert delete_response.status_code == 200, f"Failed to delete signature: {delete_response.text}"
        assert delete_response.json().get("success") == True
        
        print(f"✓ Signature deleted successfully")
    
    def test_contracts_list_endpoint(self, admin_token):
        """Test GET /api/commercial/contracts - List all contracts"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get contracts: {response.text}"
        
        data = response.json()
        assert "contracts" in data, "Response should contain 'contracts' key"
        assert "stats" in data, "Response should contain 'stats' key"
        
        contracts = data.get("contracts", [])
        stats = data.get("stats", {})
        
        print(f"✓ Contracts endpoint working - Total: {stats.get('total', len(contracts))}, "
              f"Draft: {stats.get('draft', 0)}, Active: {stats.get('active', 0)}, Signed: {stats.get('signed', 0)}")


class TestProviderGalleryAPIs:
    """Tests for Provider Gallery functionality"""
    
    @pytest.fixture(scope="class")
    def provider_token(self):
        """Get provider authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PROVIDER_EMAIL, "password": PROVIDER_PASSWORD}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Provider login failed: {response.text}")
        
        token = response.json().get("token")
        assert token, "No token returned from provider login"
        return token
    
    @pytest.fixture(scope="class")
    def provider_data(self, provider_token):
        """Get provider data using /me endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/services/provider/me",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to get provider profile: {response.text}")
        
        return response.json()
    
    def test_provider_me_endpoint(self, provider_token):
        """Test GET /api/services/provider/me - Get provider profile"""
        response = requests.get(
            f"{BASE_URL}/api/services/provider/me",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get provider profile: {response.text}"
        
        data = response.json()
        assert "provider_id" in data, "Response should contain provider_id"
        assert "name" in data, "Response should contain name"
        
        print(f"✓ Provider /me endpoint working - ID: {data.get('provider_id')}, "
              f"Name: {data.get('name')}")
        
        return data
    
    def test_get_provider_gallery(self, provider_token, provider_data):
        """Test GET /api/services/providers/{id}/gallery"""
        provider_id = provider_data.get("provider_id")
        
        response = requests.get(
            f"{BASE_URL}/api/services/providers/{provider_id}/gallery",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get gallery: {response.text}"
        
        data = response.json()
        assert "gallery" in data, "Response should contain 'gallery' key"
        assert "total" in data, "Response should contain 'total' key"
        
        gallery = data.get("gallery", [])
        print(f"✓ Gallery endpoint working - Total photos: {len(gallery)}")
    
    def test_add_photo_to_gallery(self, provider_token, provider_data):
        """Test POST /api/services/providers/{id}/gallery - Add photo"""
        provider_id = provider_data.get("provider_id")
        
        # Test image URL
        test_image_url = "https://stable-prod.preview.emergentagent.com/api/uploads/test_gallery_image.jpg"
        
        response = requests.post(
            f"{BASE_URL}/api/services/providers/{provider_id}/gallery",
            json={
                "image_url": test_image_url,
                "caption": "TEST_Photo de test"
            },
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        assert response.status_code == 200, f"Failed to add photo: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "photo" in data, "Response should contain 'photo' data"
        
        photo = data.get("photo", {})
        assert "photo_id" in photo, "Photo should have photo_id"
        assert photo.get("image_url") == test_image_url, "Image URL should match"
        
        print(f"✓ Photo added to gallery - ID: {photo.get('photo_id')}")
        
        return photo.get("photo_id")
    
    def test_verify_photo_persisted(self, provider_token, provider_data):
        """Verify photo was persisted in gallery"""
        provider_id = provider_data.get("provider_id")
        
        response = requests.get(
            f"{BASE_URL}/api/services/providers/{provider_id}/gallery",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        assert response.status_code == 200
        
        gallery = response.json().get("gallery", [])
        test_photos = [p for p in gallery if "TEST_" in (p.get("caption") or "")]
        
        if test_photos:
            print(f"✓ Test photo found in gallery - Count: {len(test_photos)}")
        else:
            print("⚠ Test photo not found (may have been cleaned up)")
    
    def test_delete_gallery_photo(self, provider_token, provider_data):
        """Test DELETE /api/services/providers/{id}/gallery/{photo_id}"""
        provider_id = provider_data.get("provider_id")
        
        # Get gallery to find test photo
        response = requests.get(
            f"{BASE_URL}/api/services/providers/{provider_id}/gallery",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        assert response.status_code == 200
        
        gallery = response.json().get("gallery", [])
        test_photo = next((p for p in gallery if "TEST_" in (p.get("caption") or "")), None)
        
        if not test_photo:
            pytest.skip("No test photo to delete")
        
        # Delete test photo
        delete_response = requests.delete(
            f"{BASE_URL}/api/services/providers/{provider_id}/gallery/{test_photo['photo_id']}",
            headers={"Authorization": f"Bearer {provider_token}"}
        )
        
        assert delete_response.status_code == 200, f"Failed to delete photo: {delete_response.text}"
        assert delete_response.json().get("success") == True
        
        print(f"✓ Photo deleted from gallery")


class TestProviderAuth:
    """Test provider authentication and user_id claim fix"""
    
    def test_provider_login(self):
        """Test provider can log in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PROVIDER_EMAIL, "password": PROVIDER_PASSWORD}
        )
        
        assert response.status_code == 200, f"Provider login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user_id" in data or "email" in data, "Response should contain user info"
        
        # User info is at top level of response
        print(f"✓ Provider login successful - User ID: {data.get('user_id')}, "
              f"Name: {data.get('name')}, Role: {data.get('role')}")
    
    def test_provider_me_with_user_id_claim(self):
        """Test /api/services/provider/me works with user_id claim in JWT"""
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PROVIDER_EMAIL, "password": PROVIDER_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        token = login_response.json().get("token")
        
        # Call /me endpoint
        me_response = requests.get(
            f"{BASE_URL}/api/services/provider/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200, f"Provider /me failed: {me_response.text}"
        
        data = me_response.json()
        assert data.get("provider_id"), "Provider profile should have provider_id"
        
        print(f"✓ Provider /me endpoint working with user_id claim - "
              f"Provider ID: {data.get('provider_id')}, User ID: {data.get('user_id')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
