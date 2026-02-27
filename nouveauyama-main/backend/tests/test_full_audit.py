"""
YAMA+ Full Audit Test Suite
Comprehensive testing of all backend APIs: auth, products, orders, cart, appointments, push, email
"""
import pytest
import requests
import os
import uuid
import time

# Get BASE_URL from environment or frontend .env file
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '')
if not BASE_URL:
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip()
                    break
    except:
        pass
if not BASE_URL:
    BASE_URL = 'https://stable-prod.preview.emergentagent.com'
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"

class TestHealthAndSecurity:
    """Health check and security headers tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        print(f"✓ Health check passed: {data}")
    
    def test_security_headers(self):
        """Test security headers are present"""
        response = requests.get(f"{BASE_URL}/api/health")
        headers = response.headers
        # Check security headers
        assert "X-Content-Type-Options" in headers
        assert "X-Frame-Options" in headers
        assert "X-XSS-Protection" in headers
        print(f"✓ Security headers present")
    
    def test_rate_limit_headers(self):
        """Test rate limit headers are present"""
        response = requests.get(f"{BASE_URL}/api/health")
        headers = response.headers
        assert "X-RateLimit-Limit" in headers
        assert "X-RateLimit-Remaining" in headers
        print(f"✓ Rate limit headers present: Limit={headers.get('X-RateLimit-Limit')}, Remaining={headers.get('X-RateLimit-Remaining')}")


class TestAuthAPI:
    """Authentication API tests"""
    
    def test_login_with_valid_credentials(self):
        """Test login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Admin login successful: {data['email']}")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Test User",
            "password": "testpass123",
            "phone": "+221771234567"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == unique_email
        assert data.get("phone") == "+221771234567"
        print(f"✓ User registration successful: {unique_email}")
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,
            "name": "Duplicate User",
            "password": "testpass123"
        })
        assert response.status_code == 400
        print("✓ Duplicate email registration correctly rejected")
    
    def test_get_me_requires_auth(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /auth/me correctly requires authentication")
    
    def test_get_me_with_token(self):
        """Test /auth/me returns user data with valid token"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ /auth/me returns user data: {data['email']}")
    
    def test_forgot_password_endpoint(self):
        """Test forgot password endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Forgot password endpoint works")
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        print("✓ Reset password with invalid token correctly rejected")


class TestProductsAPI:
    """Products API tests"""
    
    def test_get_products_list(self):
        """Test getting products list"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Products list returned {len(data)} products")
    
    def test_get_products_by_category(self):
        """Test filtering products by category"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronique")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for product in data:
            assert product["category"] == "electronique"
        print(f"✓ Category filter works: {len(data)} electronique products")
    
    def test_get_featured_products(self):
        """Test getting featured products"""
        response = requests.get(f"{BASE_URL}/api/products?featured=true")
        assert response.status_code == 200
        data = response.json()
        for product in data:
            assert product["featured"] == True
        print(f"✓ Featured filter works: {len(data)} featured products")
    
    def test_get_new_products(self):
        """Test getting new products"""
        response = requests.get(f"{BASE_URL}/api/products?is_new=true")
        assert response.status_code == 200
        data = response.json()
        for product in data:
            assert product["is_new"] == True
        print(f"✓ New products filter works: {len(data)} new products")
    
    def test_get_promo_products(self):
        """Test getting promo products"""
        response = requests.get(f"{BASE_URL}/api/products?is_promo=true")
        assert response.status_code == 200
        data = response.json()
        for product in data:
            assert product["is_promo"] == True
        print(f"✓ Promo filter works: {len(data)} promo products")
    
    def test_get_single_product(self):
        """Test getting a single product"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["product_id"] == product_id
            print(f"✓ Single product retrieved: {data['name']}")
    
    def test_get_nonexistent_product(self):
        """Test getting non-existent product returns 404"""
        response = requests.get(f"{BASE_URL}/api/products/nonexistent_id")
        assert response.status_code == 404
        print("✓ Non-existent product correctly returns 404")
    
    def test_get_similar_products(self):
        """Test getting similar products"""
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/similar")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Similar products returned: {len(data)} products")
    
    def test_get_product_reviews(self):
        """Test getting product reviews"""
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/reviews")
            assert response.status_code == 200
            data = response.json()
            assert "reviews" in data
            assert "average_rating" in data
            assert "distribution" in data
            print(f"✓ Product reviews returned: {data['total_reviews']} reviews, avg rating: {data['average_rating']}")
    
    def test_search_products(self):
        """Test product search"""
        response = requests.get(f"{BASE_URL}/api/products?search=iPhone")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Product search works: {len(data)} results for 'iPhone'")


class TestFlashSalesAPI:
    """Flash sales API tests"""
    
    def test_get_flash_sales(self):
        """Test getting flash sales"""
        response = requests.get(f"{BASE_URL}/api/flash-sales")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Flash sales returned: {len(data)} active sales")


class TestCartAPI:
    """Cart API tests"""
    
    def test_get_cart(self):
        """Test getting cart"""
        session_id = f"test_cart_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/cart", headers={
            "X-Cart-Session": session_id
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✓ Cart retrieved: {len(data['items'])} items")
    
    def test_add_to_cart(self):
        """Test adding item to cart"""
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            session_id = f"test_cart_{uuid.uuid4().hex[:8]}"
            
            response = requests.post(f"{BASE_URL}/api/cart/add", 
                json={"product_id": product_id, "quantity": 1},
                headers={"X-Cart-Session": session_id}
            )
            assert response.status_code == 200
            print(f"✓ Item added to cart: {product_id}")
    
    def test_update_cart_quantity(self):
        """Test updating cart item quantity"""
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            session_id = f"test_cart_{uuid.uuid4().hex[:8]}"
            
            # Add item first
            requests.post(f"{BASE_URL}/api/cart/add", 
                json={"product_id": product_id, "quantity": 1},
                headers={"X-Cart-Session": session_id}
            )
            
            # Update quantity
            response = requests.put(f"{BASE_URL}/api/cart/update",
                json={"product_id": product_id, "quantity": 3},
                headers={"X-Cart-Session": session_id}
            )
            assert response.status_code == 200
            print(f"✓ Cart quantity updated")
    
    def test_remove_from_cart(self):
        """Test removing item from cart"""
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            session_id = f"test_cart_{uuid.uuid4().hex[:8]}"
            
            # Add item first
            requests.post(f"{BASE_URL}/api/cart/add", 
                json={"product_id": product_id, "quantity": 1},
                headers={"X-Cart-Session": session_id}
            )
            
            # Remove item
            response = requests.delete(f"{BASE_URL}/api/cart/remove/{product_id}",
                headers={"X-Cart-Session": session_id}
            )
            assert response.status_code == 200
            print(f"✓ Item removed from cart")


class TestOrdersAPI:
    """Orders API tests"""
    
    def test_get_orders_requires_auth(self):
        """Test getting orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 401
        print("✓ Orders endpoint correctly requires authentication")
    
    def test_track_order(self):
        """Test order tracking endpoint"""
        response = requests.get(f"{BASE_URL}/api/orders/track?order_id=test123&email=test@test.com")
        # Should return 404 for non-existent order
        assert response.status_code in [200, 404]
        print("✓ Order tracking endpoint works")
    
    def test_shipping_cost_calculation(self):
        """Test shipping cost calculation"""
        response = requests.get(f"{BASE_URL}/api/shipping/calculate?city=Dakar&address=Fass")
        assert response.status_code == 200
        data = response.json()
        assert "shipping_cost" in data
        assert "zone" in data
        print(f"✓ Shipping cost calculated: {data['shipping_cost']} FCFA for {data['zone_label']}")


class TestBlogAPI:
    """Blog API tests"""
    
    def test_get_blog_posts(self):
        """Test getting blog posts"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Blog posts returned: {len(data)} posts")
    
    def test_get_single_blog_post(self):
        """Test getting a single blog post"""
        # First get a post slug
        posts_response = requests.get(f"{BASE_URL}/api/blog?limit=1")
        posts = posts_response.json()
        if posts:
            slug = posts[0]["slug"]
            response = requests.get(f"{BASE_URL}/api/blog/{slug}")
            assert response.status_code == 200
            data = response.json()
            assert data["slug"] == slug
            print(f"✓ Single blog post retrieved: {data['title']}")
    
    def test_get_nonexistent_blog_post(self):
        """Test getting non-existent blog post returns 404"""
        response = requests.get(f"{BASE_URL}/api/blog/nonexistent-slug")
        assert response.status_code == 404
        print("✓ Non-existent blog post correctly returns 404")


class TestNewsletterAPI:
    """Newsletter API tests"""
    
    def test_subscribe_newsletter(self):
        """Test newsletter subscription"""
        unique_email = f"newsletter_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/newsletter/subscribe", json={
            "email": unique_email,
            "name": "Test Subscriber"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Newsletter subscription successful: {unique_email}")


class TestContactAPI:
    """Contact API tests"""
    
    def test_send_contact_message(self):
        """Test sending contact message"""
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "Test User",
            "email": "test@test.com",
            "phone": "+221771234567",
            "subject": "Test Subject",
            "message": "This is a test message"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Contact message sent successfully")


class TestAppointmentsAPI:
    """Appointments API tests"""
    
    def test_create_appointment(self):
        """Test creating an appointment"""
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "customer": {
                "name": "Test Customer",
                "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
                "phone": "+221771234567"
            },
            "product_name": "Test Product",
            "category": "electronique",
            "preferred_date": "2026-02-15",
            "preferred_time": "10:00",
            "contact_method": "whatsapp",
            "notes": "Test appointment"
        })
        assert response.status_code == 200
        data = response.json()
        assert "appointment_id" in data
        print(f"✓ Appointment created: {data['appointment_id']}")


class TestPromoCodesAPI:
    """Promo codes API tests"""
    
    def test_validate_invalid_promo_code(self):
        """Test validating invalid promo code"""
        response = requests.post(f"{BASE_URL}/api/promo-codes/validate", json={
            "code": "INVALID_CODE",
            "cart_total": 50000
        })
        assert response.status_code == 404
        print("✓ Invalid promo code correctly rejected")


class TestPushNotificationsAPI:
    """Push notifications API tests"""
    
    def test_get_vapid_public_key(self):
        """Test getting VAPID public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "public_key" in data
        assert len(data["public_key"]) > 0
        print(f"✓ VAPID public key retrieved")
    
    def test_subscribe_push(self):
        """Test push subscription"""
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": f"https://test.push.service/{uuid.uuid4().hex}",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Push subscription successful")
    
    def test_unsubscribe_push(self):
        """Test push unsubscription"""
        endpoint = f"https://test.push.service/{uuid.uuid4().hex}"
        # Subscribe first
        requests.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": endpoint,
            "keys": {"p256dh": "test_key", "auth": "test_auth"}
        })
        
        # Unsubscribe
        response = requests.post(f"{BASE_URL}/api/push/unsubscribe", json={
            "endpoint": endpoint
        })
        assert response.status_code == 200
        print(f"✓ Push unsubscription successful")


class TestAdminAPI:
    """Admin API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_orders" in data
        assert "total_products" in data
        assert "total_users" in data
        assert "total_revenue" in data
        print(f"✓ Admin stats: {data['total_orders']} orders, {data['total_products']} products, {data['total_users']} users")
    
    def test_admin_orders_list(self, admin_token):
        """Test admin orders list"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        # Handle both array and object response formats
        orders = data if isinstance(data, list) else data.get("orders", [])
        print(f"✓ Admin orders list: {len(orders)} orders")
    
    def test_admin_users_list(self, admin_token):
        """Test admin users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        users = data if isinstance(data, list) else data.get("users", [])
        print(f"✓ Admin users list: {len(users)} users")
    
    def test_admin_appointments_list(self, admin_token):
        """Test admin appointments list"""
        response = requests.get(f"{BASE_URL}/api/admin/appointments", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        appointments = data if isinstance(data, list) else []
        print(f"✓ Admin appointments list: {len(appointments)} appointments")
    
    def test_admin_appointments_stats(self, admin_token):
        """Test admin appointments stats"""
        response = requests.get(f"{BASE_URL}/api/admin/appointments/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "confirmed" in data
        print(f"✓ Admin appointments stats: {data['total']} total, {data['pending']} pending")
    
    def test_admin_push_stats(self, admin_token):
        """Test admin push notification stats"""
        response = requests.get(f"{BASE_URL}/api/admin/push/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_subscriptions" in data
        assert "active_subscriptions" in data
        print(f"✓ Admin push stats: {data['total_subscriptions']} total, {data['active_subscriptions']} active")
    
    def test_admin_requires_auth(self):
        """Test admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401
        print("✓ Admin endpoints correctly require authentication")
    
    def test_admin_requires_admin_role(self):
        """Test admin endpoints require admin role"""
        # Register a regular user
        unique_email = f"regular_{uuid.uuid4().hex[:8]}@test.com"
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Regular User",
            "password": "testpass123"
        })
        token = register_response.json()["token"]
        
        # Try to access admin endpoint
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 403
        print("✓ Admin endpoints correctly require admin role")


class TestStockNotifications:
    """Stock notification API tests"""
    
    def test_subscribe_stock_notification(self):
        """Test subscribing to stock notification"""
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            unique_email = f"stock_{uuid.uuid4().hex[:8]}@test.com"
            
            response = requests.post(f"{BASE_URL}/api/products/{product_id}/notify-stock", json={
                "email": unique_email,
                "product_id": product_id
            })
            assert response.status_code == 200
            print(f"✓ Stock notification subscription successful")


class TestPriceAlerts:
    """Price alert API tests"""
    
    def test_subscribe_price_alert(self):
        """Test subscribing to price alert"""
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        if products:
            product_id = products[0]["product_id"]
            current_price = products[0]["price"]
            target_price = int(current_price * 0.8)  # 20% lower
            unique_email = f"price_{uuid.uuid4().hex[:8]}@test.com"
            
            response = requests.post(f"{BASE_URL}/api/products/{product_id}/price-alert", json={
                "email": unique_email,
                "product_id": product_id,
                "target_price": target_price
            })
            assert response.status_code == 200
            print(f"✓ Price alert subscription successful")


class TestDeliveryZones:
    """Delivery zones API tests"""
    
    def test_get_delivery_zones(self):
        """Test getting delivery zones"""
        response = requests.get(f"{BASE_URL}/api/delivery-zones")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Delivery zones retrieved: {len(data)} zones")
    
    def test_shipping_cost_dakar_centre(self):
        """Test shipping cost for Dakar Centre"""
        response = requests.get(f"{BASE_URL}/api/shipping/calculate?city=Dakar&address=Médina")
        assert response.status_code == 200
        data = response.json()
        assert data["shipping_cost"] == 1500
        print(f"✓ Dakar Centre shipping: {data['shipping_cost']} FCFA")
    
    def test_shipping_cost_banlieue(self):
        """Test shipping cost for Banlieue"""
        response = requests.get(f"{BASE_URL}/api/shipping/calculate?city=Guédiawaye")
        assert response.status_code == 200
        data = response.json()
        assert data["shipping_cost"] == 3000
        print(f"✓ Banlieue shipping: {data['shipping_cost']} FCFA")


class TestPerformance:
    """Performance tests"""
    
    def test_products_response_time(self):
        """Test products endpoint response time < 500ms"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/products?limit=20")
        elapsed = (time.time() - start) * 1000
        assert response.status_code == 200
        assert elapsed < 500, f"Response time {elapsed:.0f}ms exceeds 500ms"
        print(f"✓ Products response time: {elapsed:.0f}ms")
    
    def test_health_response_time(self):
        """Test health endpoint response time < 200ms"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/health")
        elapsed = (time.time() - start) * 1000
        assert response.status_code == 200
        assert elapsed < 200, f"Response time {elapsed:.0f}ms exceeds 200ms"
        print(f"✓ Health response time: {elapsed:.0f}ms")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
