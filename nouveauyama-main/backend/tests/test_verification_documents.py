"""
Test suite for verification documents API endpoint
Tests POST /api/services/providers/{provider_id}/verification-documents
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@yama.sn",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")

@pytest.fixture(scope="module")
def test_provider_id():
    """Provider ID for testing"""
    return "PRV-FAB5D4AD"

class TestVerificationDocumentsAPI:
    """Test verification documents upload and retrieval"""
    
    def test_upload_verification_document_success(self, auth_token, test_provider_id):
        """Test uploading a verification document as admin"""
        response = requests.post(
            f"{BASE_URL}/api/services/providers/{test_provider_id}/verification-documents",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "document_type": "photo",
                "document_url": "https://example.com/test-photo.jpg",
                "description": "Test photo for verification"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "document" in data
        assert data["document"]["document_type"] == "photo"
        assert data["document"]["status"] == "pending"
        assert "doc_id" in data["document"]
    
    def test_get_verification_documents(self, auth_token, test_provider_id):
        """Test getting verification documents for a provider"""
        response = requests.get(
            f"{BASE_URL}/api/services/providers/{test_provider_id}/verification-documents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "verification_status" in data
        assert isinstance(data["documents"], list)
    
    def test_upload_verification_document_no_auth(self, test_provider_id):
        """Test that uploading without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/services/providers/{test_provider_id}/verification-documents",
            json={
                "document_type": "cni_front",
                "document_url": "https://example.com/test-cni.jpg",
                "description": "Test CNI"
            }
        )
        
        assert response.status_code == 401
    
    def test_upload_verification_document_invalid_provider(self, auth_token):
        """Test uploading to non-existent provider returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/services/providers/NONEXISTENT-PROVIDER/verification-documents",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "document_type": "cni_front",
                "document_url": "https://example.com/test-cni.jpg",
                "description": "Test CNI"
            }
        )
        
        assert response.status_code == 404


class TestCommercialDocumentsAPIs:
    """Test commercial documents APIs (PDF download, email, WhatsApp share)"""
    
    def test_quotes_list(self, auth_token):
        """Test getting quotes list"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/quotes",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "quotes" in data
    
    def test_invoices_list(self, auth_token):
        """Test getting invoices list"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/invoices",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
    
    def test_contracts_list(self, auth_token):
        """Test getting contracts list"""
        response = requests.get(
            f"{BASE_URL}/api/commercial/contracts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "contracts" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
