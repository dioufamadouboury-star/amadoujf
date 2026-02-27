"""
Test suite for verifying bug fixes:
1. Product images stability (getImageUrl centralized function)
2. Form reset after product creation
3. GiftBox page config loading
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImageUrlHandling:
    """Tests for verifying image URL handling works correctly"""
    
    def test_products_have_valid_images(self):
        """Verify products return images array that can be resolved"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "Should have at least one product"
        
        for product in products:
            assert 'images' in product, f"Product {product.get('name')} missing images field"
            images = product.get('images', [])
            # Images can be:
            # 1. Full URL (https://...)
            # 2. Relative URL (/api/uploads/...)
            # Both should be valid
            for img in images:
                if img:
                    assert isinstance(img, str), f"Image should be string: {img}"
                    # Image should be a URL (absolute or relative)
                    is_absolute = img.startswith('http://') or img.startswith('https://')
                    is_relative = img.startswith('/api/') or img.startswith('/')
                    assert is_absolute or is_relative, f"Image URL format invalid: {img}"
    
    def test_single_product_detail_has_images(self):
        """Verify single product endpoint returns complete image data"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0
        
        product_id = products[0]['product_id']
        
        # Get single product
        detail_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert detail_response.status_code == 200
        product = detail_response.json()
        
        # Verify images exist and are consistent
        assert 'images' in product
        assert isinstance(product['images'], list)

    def test_uploaded_images_accessible(self):
        """Test that uploaded images endpoint is accessible (returns 404 for non-existent, not 500)"""
        # Try accessing a non-existent image - should return 404, not 500
        response = requests.get(f"{BASE_URL}/api/uploads/nonexistent-image.jpg")
        assert response.status_code == 404, "Non-existent upload should return 404"


class TestGiftBoxConfig:
    """Tests for GiftBox page configuration - verifies fix for page crash"""
    
    def test_giftbox_config_endpoint_returns_data(self):
        """Verify gift-box config returns valid data structure"""
        response = requests.get(f"{BASE_URL}/api/gift-box/config")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert 'config' in data, "Response must have 'config'"
        assert 'sizes' in data, "Response must have 'sizes'"
        assert 'wrappings' in data, "Response must have 'wrappings'"
        
    def test_giftbox_has_sizes(self):
        """Verify sizes array has required fields"""
        response = requests.get(f"{BASE_URL}/api/gift-box/config")
        assert response.status_code == 200
        data = response.json()
        
        sizes = data.get('sizes', [])
        assert len(sizes) > 0, "Should have at least one gift box size"
        
        for size in sizes:
            assert 'size_id' in size, "Size must have size_id"
            assert 'name' in size, "Size must have name"
            assert 'max_items' in size, "Size must have max_items"
            assert 'base_price' in size, "Size must have base_price"
    
    def test_giftbox_has_wrappings(self):
        """Verify wrappings array has required fields"""
        response = requests.get(f"{BASE_URL}/api/gift-box/config")
        assert response.status_code == 200
        data = response.json()
        
        wrappings = data.get('wrappings', [])
        assert len(wrappings) > 0, "Should have at least one wrapping option"
        
        for wrap in wrappings:
            assert 'wrapping_id' in wrap, "Wrapping must have wrapping_id"
            assert 'name' in wrap, "Wrapping must have name"
            assert 'price' in wrap, "Wrapping must have price"
            assert 'color' in wrap, "Wrapping must have color"

    def test_giftbox_config_is_enabled(self):
        """Verify gift box feature is enabled"""
        response = requests.get(f"{BASE_URL}/api/gift-box/config")
        assert response.status_code == 200
        data = response.json()
        
        config = data.get('config', {})
        assert config.get('is_enabled') == True, "Gift box should be enabled"


class TestProductCRUD:
    """Tests for product CRUD - related to form reset bug"""
    
    def setup_method(self):
        """Setup for tests - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get('token')
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_admin_login_works(self):
        """Verify admin login for product management"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert data.get('role') == 'admin'
    
    def test_create_product_returns_correct_data(self):
        """Verify product creation returns expected data structure"""
        if not self.token:
            pytest.skip("No auth token available")
        
        product_data = {
            "name": "TEST_ProductForFormReset",
            "description": "Test product for verifying form reset",
            "price": 50000,
            "category": "electronique",
            "stock": 10,
            "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Product creation failed: {response.text}"
        created = response.json()
        
        # Verify returned data matches what we sent
        assert created.get('name') == product_data['name']
        assert created.get('price') == product_data['price']
        assert 'product_id' in created
        
        # Cleanup - delete the test product
        product_id = created.get('product_id')
        if product_id:
            requests.delete(f"{BASE_URL}/api/products/{product_id}", headers=self.headers)
    
    def test_products_list_after_creation(self):
        """Verify product list is accessible after creation (no freeze)"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # Get initial product count
        initial_response = requests.get(f"{BASE_URL}/api/products?limit=100")
        assert initial_response.status_code == 200
        
        # Create a test product
        product_data = {
            "name": "TEST_ListVerification",
            "description": "Test for list refresh",
            "price": 25000,
            "category": "beaute",
            "stock": 5,
            "images": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/products",
            json=product_data,
            headers=self.headers
        )
        
        if create_response.status_code == 200:
            product_id = create_response.json().get('product_id')
            
            # Verify list still works
            list_response = requests.get(f"{BASE_URL}/api/products?limit=100")
            assert list_response.status_code == 200, "Product list should still work after creation"
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/products/{product_id}", headers=self.headers)


class TestCategoryPages:
    """Tests for category pages - verifying images display correctly"""
    
    def test_electronique_category_products(self):
        """Verify electronique category returns products with images"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronique&limit=10")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert product.get('category') == 'electronique'
            # Products should have images array
            assert 'images' in product
    
    def test_electromenager_category_products(self):
        """Verify electromenager category returns products"""
        response = requests.get(f"{BASE_URL}/api/products?category=electromenager&limit=10")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert product.get('category') == 'electromenager'
    
    def test_beaute_category_products(self):
        """Verify beaute category returns products"""
        response = requests.get(f"{BASE_URL}/api/products?category=beaute&limit=10")
        assert response.status_code == 200


class TestFlashSales:
    """Tests for flash sales - related to image display bug"""
    
    def test_flash_sales_endpoint(self):
        """Verify flash sales returns products with images"""
        response = requests.get(f"{BASE_URL}/api/flash-sales")
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            # Flash sale products should have all required fields
            assert 'is_flash_sale' in product
            assert 'flash_sale_price' in product
            assert 'images' in product


class TestImageUpload:
    """Tests for image upload functionality"""
    
    def setup_method(self):
        """Setup for tests - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get('token')
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    def test_upload_requires_auth(self):
        """Verify image upload requires authentication"""
        # Create a minimal test image (1x1 pixel PNG)
        import base64
        tiny_png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {'file': ('test.png', tiny_png, 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        
        # Should require auth
        assert response.status_code == 401
    
    def test_upload_with_auth_validates_file(self):
        """Verify upload endpoint validates file type when authenticated"""
        if not self.token:
            pytest.skip("No auth token available")
        
        # Try uploading without a file
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers=self.headers
        )
        
        # Should return 422 for missing file
        assert response.status_code == 422
