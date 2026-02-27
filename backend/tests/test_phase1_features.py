"""
Test Phase 1 Features:
1. Advanced filters on CategoryPage (price, color, brand, availability)
2. Order tracking page (/suivi-commande) and endpoint (/api/orders/track)
3. Product reviews section
4. Footer link for order tracking
5. Legal pages (/cgv, /confidentialite, /retours, /livraison)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderTracking:
    """Test order tracking endpoint"""
    
    def test_track_order_missing_params(self):
        """Test tracking without required parameters"""
        response = requests.get(f"{BASE_URL}/api/orders/track")
        # Should return 404 or 422 for missing required params
        assert response.status_code in [404, 422], f"Expected 404 or 422, got {response.status_code}"
        print(f"✓ Missing params returns {response.status_code}")
    
    def test_track_order_not_found(self):
        """Test tracking with non-existent order"""
        response = requests.get(
            f"{BASE_URL}/api/orders/track",
            params={"order_id": "ORD-NONEXISTENT123", "email": "test@example.com"}
        )
        # Should return 404 for non-existent order
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Non-existent order returns 404: {data['detail']}")
    
    def test_track_order_invalid_email(self):
        """Test tracking with wrong email for existing order"""
        # First, we need to find an existing order
        # This test assumes there might be orders in the system
        response = requests.get(
            f"{BASE_URL}/api/orders/track",
            params={"order_id": "ORD-TEST123", "email": "wrong@email.com"}
        )
        # Should return 404 (order not found or email mismatch)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Wrong email returns 404")


class TestProductsWithFilters:
    """Test products endpoint with filter capabilities"""
    
    def test_get_products_basic(self):
        """Test basic products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Products should be a list"
        print(f"✓ Products endpoint returns {len(data)} products")
        return data
    
    def test_get_products_by_category(self):
        """Test products filtered by category"""
        response = requests.get(f"{BASE_URL}/api/products", params={"category": "electronique"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Products should be a list"
        # Verify all products are in the correct category
        for product in data:
            assert product.get("category") == "electronique", f"Product {product.get('name')} has wrong category"
        print(f"✓ Category filter returns {len(data)} products in 'electronique'")
    
    def test_products_have_filter_fields(self):
        """Test that products have brand, colors, sizes fields for filtering"""
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 20})
        assert response.status_code == 200
        data = response.json()
        
        products_with_brand = sum(1 for p in data if p.get("brand"))
        products_with_colors = sum(1 for p in data if p.get("colors"))
        products_with_sizes = sum(1 for p in data if p.get("sizes"))
        
        print(f"✓ Products with brand: {products_with_brand}/{len(data)}")
        print(f"✓ Products with colors: {products_with_colors}/{len(data)}")
        print(f"✓ Products with sizes: {products_with_sizes}/{len(data)}")
        
        # At least some products should have these fields for filters to work
        assert products_with_brand > 0 or len(data) == 0, "No products have brand field"
    
    def test_products_have_stock_field(self):
        """Test that products have stock field for availability filter"""
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        
        for product in data:
            assert "stock" in product, f"Product {product.get('name')} missing stock field"
        print(f"✓ All {len(data)} products have stock field")


class TestProductReviews:
    """Test product reviews endpoints"""
    
    def test_get_product_reviews(self):
        """Test getting reviews for a product"""
        # First get a product
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        assert products_response.status_code == 200
        products = products_response.json()
        
        if not products:
            pytest.skip("No products available to test reviews")
        
        product_id = products[0]["product_id"]
        
        # Get reviews for this product
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "reviews" in data, "Response should have 'reviews' field"
        assert "total_reviews" in data, "Response should have 'total_reviews' field"
        assert "average_rating" in data, "Response should have 'average_rating' field"
        assert "distribution" in data, "Response should have 'distribution' field"
        
        print(f"✓ Reviews endpoint works for product {product_id}")
        print(f"  - Total reviews: {data['total_reviews']}")
        print(f"  - Average rating: {data['average_rating']}")
    
    def test_reviews_distribution_structure(self):
        """Test that reviews distribution has correct structure"""
        products_response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        products = products_response.json()
        
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["product_id"]
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/reviews")
        data = response.json()
        
        distribution = data.get("distribution", {})
        # Distribution should have keys 1-5
        for rating in [1, 2, 3, 4, 5]:
            assert rating in distribution or str(rating) in distribution, f"Missing rating {rating} in distribution"
        
        print("✓ Reviews distribution has correct structure (1-5 ratings)")


class TestLegalPages:
    """Test that legal page routes are accessible"""
    
    def test_cgv_page_accessible(self):
        """Test CGV (Terms) page is accessible"""
        response = requests.get(f"{BASE_URL}/cgv", allow_redirects=True)
        # Frontend routes should return 200 (served by React)
        # Note: This tests the frontend route, not an API
        print(f"CGV page status: {response.status_code}")
        # The frontend serves all routes, so we just check it doesn't error
        assert response.status_code in [200, 304], f"CGV page returned {response.status_code}"
        print("✓ /cgv route accessible")
    
    def test_confidentialite_page_accessible(self):
        """Test Privacy Policy page is accessible"""
        response = requests.get(f"{BASE_URL}/confidentialite", allow_redirects=True)
        assert response.status_code in [200, 304], f"Privacy page returned {response.status_code}"
        print("✓ /confidentialite route accessible")
    
    def test_retours_page_accessible(self):
        """Test Returns Policy page is accessible"""
        response = requests.get(f"{BASE_URL}/retours", allow_redirects=True)
        assert response.status_code in [200, 304], f"Returns page returned {response.status_code}"
        print("✓ /retours route accessible")
    
    def test_livraison_page_accessible(self):
        """Test Delivery Policy page is accessible"""
        response = requests.get(f"{BASE_URL}/livraison", allow_redirects=True)
        assert response.status_code in [200, 304], f"Delivery page returned {response.status_code}"
        print("✓ /livraison route accessible")
    
    def test_suivi_commande_page_accessible(self):
        """Test Order Tracking page is accessible"""
        response = requests.get(f"{BASE_URL}/suivi-commande", allow_redirects=True)
        assert response.status_code in [200, 304], f"Order tracking page returned {response.status_code}"
        print("✓ /suivi-commande route accessible")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ API health check passed")
    
    def test_flash_sales_endpoint(self):
        """Test flash sales endpoint"""
        response = requests.get(f"{BASE_URL}/api/flash-sales")
        assert response.status_code == 200, f"Flash sales failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Flash sales should return a list"
        print(f"✓ Flash sales endpoint returns {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
