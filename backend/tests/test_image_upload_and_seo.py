"""
Test image upload returning absolute URLs and SEO features (sitemap.xml)
Tests the bug fix for product images not displaying after creation.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImageUploadAbsoluteUrls:
    """Tests for image upload returning absolute URLs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@yama.sn",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_image_upload_returns_absolute_url(self, admin_token):
        """Test that image upload returns an absolute URL starting with https://"""
        # Create a minimal test image (1x1 JPEG)
        import base64
        minimal_jpeg = base64.b64decode(
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsK"
            "CwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAA"
            "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=="
        )
        
        files = {'file': ('test_upload.jpg', minimal_jpeg, 'image/jpeg')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files, headers=headers)
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data.get('success') == True, "Upload should return success=true"
        assert 'url' in data, "Response should contain 'url'"
        
        url = data['url']
        # URL should be absolute (starts with https://)
        assert url.startswith('https://'), f"URL should be absolute, got: {url}"
        assert '/api/uploads/' in url, f"URL should contain /api/uploads/, got: {url}"
        
        print(f"✓ Upload returned absolute URL: {url}")
    
    def test_uploaded_image_is_accessible(self, admin_token):
        """Test that uploaded image can be retrieved"""
        import base64
        minimal_jpeg = base64.b64decode(
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsK"
            "CwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAA"
            "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=="
        )
        
        # Upload first
        files = {'file': ('test_access.jpg', minimal_jpeg, 'image/jpeg')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        upload_resp = requests.post(f"{BASE_URL}/api/upload/image", files=files, headers=headers)
        assert upload_resp.status_code == 200
        url = upload_resp.json()['url']
        
        # Now try to GET the image
        get_resp = requests.get(url)
        assert get_resp.status_code == 200, f"Image should be accessible at {url}"
        assert get_resp.headers.get('content-type') == 'image/jpeg', "Content-type should be image/jpeg"
        
        print(f"✓ Image accessible at: {url}")
    
    def test_products_with_uploaded_images_show_absolute_urls(self):
        """Test that products with uploaded images have absolute URLs"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronique&limit=50")
        assert response.status_code == 200
        
        products = response.json()
        uploaded_images = []
        
        for product in products:
            for img in product.get('images', []):
                if '/api/uploads/' in img:
                    uploaded_images.append({
                        'product': product['name'],
                        'url': img
                    })
        
        # Should have at least some uploaded images
        assert len(uploaded_images) > 0, "Should find products with uploaded images"
        
        # All uploaded image URLs should be absolute
        for item in uploaded_images:
            assert item['url'].startswith('https://'), f"Product '{item['product']}' has relative URL: {item['url']}"
            print(f"✓ {item['product']}: {item['url'][:80]}...")
        
        print(f"\n✓ Found {len(uploaded_images)} products with absolute uploaded image URLs")


class TestSEOFeatures:
    """Tests for SEO features like sitemap.xml"""
    
    def test_sitemap_xml_accessible(self):
        """Test that sitemap.xml is accessible"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        assert response.status_code == 200, f"Sitemap should be accessible, got {response.status_code}"
        
        content = response.text
        assert '<?xml' in content, "Sitemap should be valid XML"
        assert 'urlset' in content, "Sitemap should contain urlset element"
        assert 'groupeyamaplus.com' in content, "Sitemap should contain groupeyamaplus.com URLs"
        
        print("✓ sitemap.xml is accessible and valid")
    
    def test_sitemap_contains_main_pages(self):
        """Test that sitemap contains main pages"""
        response = requests.get(f"{BASE_URL}/sitemap.xml")
        assert response.status_code == 200
        
        content = response.text
        
        # Check for main pages
        required_pages = [
            '/category/electronique',
            '/category/electromenager',
            '/category/decoration',
            '/a-propos',
            '/contact'
        ]
        
        for page in required_pages:
            assert page in content, f"Sitemap should contain {page}"
            print(f"✓ Found {page} in sitemap")
        
        print("\n✓ Sitemap contains all required pages")


class TestFooterSocialLinks:
    """Tests for footer social media links verification (via API products)"""
    
    def test_api_health_check(self):
        """Basic health check that API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_products_api_returns_data(self):
        """Test products API returns data with images"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0, "Should return at least one product"
        
        # Check products have required fields
        for product in products[:5]:
            assert 'product_id' in product
            assert 'name' in product
            assert 'price' in product
            assert 'images' in product
            
            # Images should be a list
            assert isinstance(product['images'], list)
            
            # If has images, they should be valid URLs
            for img in product.get('images', []):
                assert img.startswith('http'), f"Image URL should be absolute: {img}"
        
        print(f"✓ Products API returns {len(products)} products with valid image URLs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
