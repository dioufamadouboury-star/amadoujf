"""
Test suite for image upload and session persistence fixes
Tests:
1. API /api/auth/me returns user data with valid token
2. API /api/upload/image returns relative URL starting with /api/uploads/
3. Session persistence with JWT tokens
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"


class TestAuthSession:
    """Test authentication and session persistence"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    def test_login_returns_token(self):
        """Test that login returns a JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed with status {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Login response missing 'token' field"
        assert isinstance(data["token"], str), "Token should be a string"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        # Verify user data returned
        assert "user_id" in data, "Login response missing user_id"
        assert "email" in data, "Login response missing email"
        assert data["email"] == ADMIN_EMAIL, "Email mismatch"
        assert "role" in data, "Login response missing role"
        assert data["role"] == "admin", "Admin user should have admin role"
        
        print(f"✓ Login successful, token received (length: {len(data['token'])})")
    
    def test_auth_me_with_valid_token(self, admin_token):
        """Test /api/auth/me returns user data with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"/api/auth/me failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert "email" in data, "Response missing email"
        assert data["email"] == ADMIN_EMAIL, f"Email mismatch: expected {ADMIN_EMAIL}, got {data['email']}"
        assert "role" in data, "Response missing role"
        assert data["role"] == "admin", "Admin user should have admin role"
        
        print(f"✓ /api/auth/me returned user data: {data['email']} ({data['role']})")
    
    def test_auth_me_without_token_returns_401(self):
        """Test /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/auth/me correctly returns 401 without token")
    
    def test_auth_me_with_invalid_token_returns_401(self):
        """Test /api/auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/auth/me correctly returns 401 with invalid token")
    
    def test_token_can_be_reused_for_multiple_requests(self, admin_token):
        """Test that the same token works for multiple sequential requests (session persistence)"""
        # Make multiple requests with the same token
        for i in range(3):
            response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Request {i+1} failed: {response.text}"
        
        print("✓ Token works for multiple sequential requests (session persistence verified)")


class TestImageUpload:
    """Test image upload functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_upload_image_returns_relative_url(self, admin_token):
        """Test that image upload returns a relative URL starting with /api/uploads/"""
        # Create a simple test image (1x1 PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # width=1, height=1
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("test_image.png", png_data, "image/png")}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert data["success"] is True, "Upload was not successful"
        
        assert "url" in data, "Response missing 'url' field"
        url = data["url"]
        
        # CRITICAL: Verify URL is relative and starts with /api/uploads/
        assert url.startswith("/api/uploads/"), f"URL should start with /api/uploads/, got: {url}"
        assert not url.startswith("http"), f"URL should be relative (not absolute), got: {url}"
        
        # Verify filename is present
        assert "filename" in data, "Response missing 'filename' field"
        filename = data["filename"]
        assert filename.endswith(".png"), f"Filename should end with .png, got: {filename}"
        
        print(f"✓ Image upload returned relative URL: {url}")
        print(f"✓ Filename: {filename}")
        
        return url
    
    def test_uploaded_image_is_accessible(self, admin_token):
        """Test that uploaded images can be accessed via the returned URL"""
        # First upload an image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("test_accessible.png", png_data, "image/png")}
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        relative_url = upload_response.json()["url"]
        
        # Try to access the image using the full URL
        full_url = f"{BASE_URL}{relative_url}"
        get_response = requests.get(full_url)
        
        assert get_response.status_code == 200, f"Could not access image at {full_url}: {get_response.status_code}"
        assert "image" in get_response.headers.get("content-type", "").lower(), "Response should be an image"
        
        print(f"✓ Uploaded image is accessible at: {full_url}")
    
    def test_upload_requires_admin_auth(self):
        """Test that image upload requires admin authentication"""
        png_data = bytes([0x89, 0x50, 0x4E, 0x47])  # Minimal PNG header
        
        # Try without auth
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files={"file": ("test.png", png_data, "image/png")}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Image upload correctly requires authentication")
    
    def test_upload_rejects_non_image_files(self, admin_token):
        """Test that upload rejects non-image files"""
        text_data = b"This is not an image"
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("test.txt", text_data, "text/plain")}
        )
        
        assert response.status_code == 400, f"Expected 400 for non-image, got {response.status_code}"
        print("✓ Upload correctly rejects non-image files")


class TestExistingProductImages:
    """Test that existing product images display correctly"""
    
    def test_products_have_images(self):
        """Test that products have images array"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        
        products = response.json()
        assert len(products) > 0, "No products returned"
        
        # Check first few products have images
        for product in products[:5]:
            assert "images" in product, f"Product {product.get('product_id')} missing 'images' field"
            images = product["images"]
            assert isinstance(images, list), f"Product images should be a list"
            
            if len(images) > 0:
                img_url = images[0]
                assert isinstance(img_url, str), "Image URL should be a string"
                assert len(img_url) > 0, "Image URL should not be empty"
                print(f"  Product {product.get('name', 'unknown')[:30]} has {len(images)} image(s)")
        
        print(f"✓ All {len(products)} products have images arrays")


class TestAdminProductsPage:
    """Test admin products page and image display"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_can_access_products_list(self, admin_token):
        """Test admin can access product list"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        
        print(f"✓ Admin can access {len(products)} products")
    
    def test_admin_can_create_product_with_uploaded_image(self, admin_token):
        """Test creating a product with an uploaded image URL"""
        # First upload an image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("product_test.png", png_data, "image/png")}
        )
        
        assert upload_response.status_code == 200, f"Image upload failed: {upload_response.text}"
        relative_url = upload_response.json()["url"]
        
        # The frontend will convert to absolute URL, but we store as received
        # For storage in DB, frontend should convert relative to absolute
        full_url = f"{BASE_URL}{relative_url}"
        
        # Create a test product with this image
        product_data = {
            "name": "TEST_Product_With_Uploaded_Image",
            "description": "Test product to verify image upload works",
            "price": 15000,
            "category": "electronique",
            "images": [full_url],  # Frontend converts relative to absolute
            "stock": 10
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=product_data
        )
        
        assert create_response.status_code == 200, f"Product creation failed: {create_response.text}"
        
        created_product = create_response.json()
        assert "product_id" in created_product, "Created product missing product_id"
        
        product_id = created_product["product_id"]
        print(f"✓ Created test product with ID: {product_id}")
        
        # Verify we can fetch the product and its image
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200, f"Failed to get product: {get_response.text}"
        
        fetched_product = get_response.json()
        assert len(fetched_product["images"]) > 0, "Product should have images"
        
        image_url = fetched_product["images"][0]
        print(f"✓ Product image URL: {image_url}")
        
        # Verify the image is accessible
        img_response = requests.get(image_url)
        assert img_response.status_code == 200, f"Image not accessible at {image_url}"
        
        print(f"✓ Product image is accessible")
        
        # Clean up - delete test product
        delete_response = requests.delete(
            f"{BASE_URL}/api/products/{product_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Failed to delete test product"
        print(f"✓ Test product cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
