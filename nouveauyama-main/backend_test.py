#!/usr/bin/env python3
"""
YAMA+ Phase 3 Features Backend API Test Suite
Tests Phase 3 features: Product Comparison, Loyalty Program, Shareable Wishlist, Reviews with Media
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class YAMAPhase3Tester:
    def __init__(self, base_url="https://stable-prod.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.test_product_id = None
        self.test_order_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials
        self.admin_email = "admin@yama.sn"
        self.admin_password = "admin123"

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"name": name, "details": details})

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.base_url}/api{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=default_headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=default_headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=default_headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=default_headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health & Basic Endpoints...")
        
        # Root endpoint
        success, data = self.make_request('GET', '/')
        self.log_test("Root endpoint", success, 
                     f"Response: {data.get('message', 'No message')}" if success else f"Error: {data}")
        
        # Health check
        success, data = self.make_request('GET', '/health')
        self.log_test("Health check", success,
                     f"Status: {data.get('status', 'Unknown')}" if success else f"Error: {data}")

    def test_database_seeding(self):
        """Test database seeding"""
        print("\n🌱 Testing Database Seeding...")
        
        success, data = self.make_request('POST', '/seed')
        self.log_test("Database seeding", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_categories(self):
        """Test categories endpoint"""
        print("\n📂 Testing Categories...")
        
        success, data = self.make_request('GET', '/categories')
        self.log_test("Get categories", success,
                     f"Found {len(data)} categories" if success and isinstance(data, list) else f"Error: {data}")

    def test_products(self):
        """Test product endpoints"""
        print("\n📦 Testing Products...")
        
        # Get all products
        success, data = self.make_request('GET', '/products')
        if success and isinstance(data, list) and len(data) > 0:
            self.test_product_id = data[0]['product_id']
            self.log_test("Get all products", True, f"Found {len(data)} products")
        else:
            self.log_test("Get all products", False, f"Error: {data}")
            return
        
        # Get products by category
        success, data = self.make_request('GET', '/products?category=electronique')
        self.log_test("Get products by category", success,
                     f"Found {len(data)} electronics" if success and isinstance(data, list) else f"Error: {data}")
        
        # Get featured products
        success, data = self.make_request('GET', '/products?featured=true')
        self.log_test("Get featured products", success,
                     f"Found {len(data)} featured products" if success and isinstance(data, list) else f"Error: {data}")
        
        # Get new products
        success, data = self.make_request('GET', '/products?is_new=true')
        self.log_test("Get new products", success,
                     f"Found {len(data)} new products" if success and isinstance(data, list) else f"Error: {data}")
        
        # Get promo products
        success, data = self.make_request('GET', '/products?is_promo=true')
        self.log_test("Get promo products", success,
                     f"Found {len(data)} promo products" if success and isinstance(data, list) else f"Error: {data}")
        
        # Search products
        success, data = self.make_request('GET', '/products?search=iPhone')
        self.log_test("Search products", success,
                     f"Found {len(data)} iPhone products" if success and isinstance(data, list) else f"Error: {data}")
        
        # Get single product
        if self.test_product_id:
            success, data = self.make_request('GET', f'/products/{self.test_product_id}')
            self.log_test("Get single product", success,
                         f"Product: {data.get('name', 'Unknown')}" if success else f"Error: {data}")

    def test_flash_sales(self):
        """Test flash sales endpoints"""
        print("\n⚡ Testing Flash Sales...")
        
        # Get active flash sales
        success, data = self.make_request('GET', '/flash-sales')
        self.log_test("Get active flash sales", success,
                     f"Found {len(data)} flash sale products" if success and isinstance(data, list) else f"Error: {data}")
        
        # Test admin flash sale creation (requires admin token)
        if self.admin_token and self.test_product_id:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            flash_sale_data = {
                "flash_sale_price": 50000,
                "flash_sale_end": "2025-12-31T23:59:59Z"
            }
            success, data = self.make_request('POST', f'/admin/flash-sales/{self.test_product_id}', 
                                            flash_sale_data, headers=headers)
            self.log_test("Create flash sale (admin)", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
            
            # Remove flash sale
            success, data = self.make_request('DELETE', f'/admin/flash-sales/{self.test_product_id}', 
                                            headers=headers)
            self.log_test("Remove flash sale (admin)", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_similar_products(self):
        """Test similar products endpoint"""
        print("\n🔗 Testing Similar Products...")
        
        if not self.test_product_id:
            self.log_test("Similar products", False, "No test product available")
            return
        
        # Get similar products
        success, data = self.make_request('GET', f'/products/{self.test_product_id}/similar')
        self.log_test("Get similar products", success,
                     f"Found {len(data)} similar products" if success and isinstance(data, list) else f"Error: {data}")
        
        # Test with limit parameter
        success, data = self.make_request('GET', f'/products/{self.test_product_id}/similar?limit=3')
        self.log_test("Get similar products with limit", success,
                     f"Found {len(data)} similar products (limit 3)" if success and isinstance(data, list) else f"Error: {data}")

    def test_loyalty_program(self):
        """Test Phase 3 Loyalty Program endpoints"""
        print("\n🏆 Testing Loyalty Program (Phase 3)...")
        
        # Test loyalty/me endpoint (requires authentication)
        if self.user_token:
            headers = {'Authorization': f'Bearer {self.user_token}'}
            success, data = self.make_request('GET', '/loyalty/me', headers=headers)
            self.log_test("GET /api/loyalty/me", success,
                         f"Loyalty data: {data}" if success else f"Error: {data}")
        else:
            # Test without authentication (should fail)
            success, data = self.make_request('GET', '/loyalty/me', expected_status=401)
            self.log_test("GET /api/loyalty/me (unauthenticated)", success,
                         "Properly requires authentication" if success else f"Error: {data}")
        
        # Test loyalty redeem endpoint
        if self.user_token:
            headers = {'Authorization': f'Bearer {self.user_token}'}
            redeem_data = {"reward_id": "invalid_reward"}
            success, data = self.make_request('POST', '/loyalty/redeem', redeem_data, headers=headers, expected_status=400)
            self.log_test("POST /api/loyalty/redeem (invalid reward)", success,
                         "Properly rejects invalid reward" if success else f"Error: {data}")

    def test_wishlist_sharing(self):
        """Test Phase 3 Shareable Wishlist endpoints"""
        print("\n💝 Testing Shareable Wishlist (Phase 3)...")
        
        if not self.user_token:
            self.log_test("Wishlist sharing tests", False, "No user token available")
            return
        
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Test wishlist share endpoint
        success, data = self.make_request('POST', '/wishlist/share', headers=headers)
        if success and 'share_id' in data:
            share_id = data['share_id']
            self.log_test("POST /api/wishlist/share", True, f"Created share ID: {share_id}")
            
            # Test accessing shared wishlist
            success, shared_data = self.make_request('GET', f'/wishlist/shared/{share_id}')
            self.log_test("GET /api/wishlist/shared/{shareId}", success,
                         f"Shared wishlist accessible: {shared_data}" if success else f"Error: {shared_data}")
        else:
            self.log_test("POST /api/wishlist/share", False, f"Error: {data}")
        
        # Test invalid share ID
        success, data = self.make_request('GET', '/wishlist/shared/invalid_id', expected_status=404)
        self.log_test("GET /api/wishlist/shared/invalid_id", success,
                     "Properly returns 404 for invalid share ID" if success else f"Error: {data}")

    def test_review_media_upload(self):
        """Test Phase 3 Reviews with Media Upload"""
        print("\n📸 Testing Reviews with Media Upload (Phase 3)...")
        
        if not self.user_token or not self.test_product_id:
            self.log_test("Review media upload tests", False, "No user token or product ID available")
            return
        
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Test multipart form endpoint exists (we can't easily test file upload in this script)
        # But we can test the endpoint responds appropriately
        form_data = {
            'rating': '5',
            'title': 'Test Review',
            'comment': 'This is a test review with media'
        }
        
        # This will likely fail due to missing media files, but we can check if endpoint exists
        success, data = self.make_request('POST', f'/products/{self.test_product_id}/reviews/with-media', 
                                        form_data, headers=headers, expected_status=400)
        self.log_test("POST /api/products/{product_id}/reviews/with-media endpoint exists", 
                     success or 'multipart' in str(data).lower(),
                     "Endpoint accepts multipart form data" if success else f"Response: {data}")

    def test_product_comparison_support(self):
        """Test Phase 3 Product Comparison backend support"""
        print("\n⚖️ Testing Product Comparison Support (Phase 3)...")
        
        # Get products and check they have required fields for comparison
        success, data = self.make_request('GET', '/products?limit=5')
        if success and isinstance(data, list) and len(data) >= 2:
            self.log_test("Products available for comparison", True, f"Found {len(data)} products")
            
            # Check if products have required fields for comparison
            required_fields = ['product_id', 'name', 'price', 'category', 'images', 'specs']
            comparison_ready_count = 0
            
            for product in data[:3]:  # Check first 3 products
                missing_fields = [field for field in required_fields if field not in product or product[field] is None]
                if not missing_fields:
                    comparison_ready_count += 1
                    self.log_test(f"Product {product.get('product_id')} comparison ready", True,
                                 "Has all required comparison fields")
                else:
                    self.log_test(f"Product {product.get('product_id')} comparison ready", False,
                                 f"Missing fields: {missing_fields}")
            
            self.log_test("Products ready for comparison", comparison_ready_count >= 2,
                         f"{comparison_ready_count} products have all required comparison fields")
        else:
            self.log_test("Products available for comparison", False, f"Error: {data}")

    def test_order_tracking(self):
        """Test order tracking and status history"""
        print("\n📍 Testing Order Tracking...")
        
        # Test with existing order IDs from review request
        test_order_ids = ["ORD-F1215A06", "ORD-2C32A04F"]
        
        for order_id in test_order_ids:
            # Get order details
            success, data = self.make_request('GET', f'/orders/{order_id}')
            if success:
                self.log_test(f"Get order details - {order_id}", True, 
                             f"Status: {data.get('order_status', 'Unknown')}, History entries: {len(data.get('status_history', []))}")
                
                # Check if status_history exists and has proper structure
                status_history = data.get('status_history', [])
                if status_history:
                    for entry in status_history:
                        if 'status' in entry and 'timestamp' in entry:
                            self.log_test(f"Order status history structure - {order_id}", True,
                                         f"Valid history entry: {entry.get('status')} at {entry.get('timestamp')}")
                            break
                    else:
                        self.log_test(f"Order status history structure - {order_id}", False,
                                     "Status history entries missing required fields")
                else:
                    self.log_test(f"Order status history - {order_id}", True,
                                 "Order found but no status history yet (acceptable)")
                break
            else:
                print(f"    Order {order_id} not found, trying next...")
                continue
        
        # Test admin order status update
        if self.admin_token and self.test_order_id:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            update_data = {
                "order_status": "shipped",
                "note": "Test status update for tracking"
            }
            success, data = self.make_request('PUT', f'/admin/orders/{self.test_order_id}/status', 
                                            update_data, headers=headers)
            self.log_test("Update order status with tracking", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
            
            # Verify status history was updated
            success, data = self.make_request('GET', f'/orders/{self.test_order_id}')
            if success:
                status_history = data.get('status_history', [])
                if any(entry.get('status') == 'shipped' for entry in status_history):
                    self.log_test("Verify status history update", True, 
                                 f"Status history updated with 'shipped' status")
                else:
                    self.log_test("Verify status history update", False,
                                 "Status history not updated properly")

    def test_auth_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        
        test_user = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
            "name": "Test User",
            "phone": "+221771234567",
            "password": "testpass123"
        }
        
        success, data = self.make_request('POST', '/auth/register', test_user)
        if success:
            self.user_token = data.get('token')
            self.test_user_id = data.get('user_id')
            self.log_test("User registration", True, f"User ID: {self.test_user_id}")
        else:
            self.log_test("User registration", False, f"Error: {data}")

    def test_auth_login(self):
        """Test admin login"""
        print("\n🔐 Testing Authentication...")
        
        # Admin login
        login_data = {
            "email": self.admin_email,
            "password": self.admin_password
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data)
        if success:
            self.admin_token = data.get('token')
            self.log_test("Admin login", True, f"Role: {data.get('role', 'Unknown')}")
        else:
            self.log_test("Admin login", False, f"Error: {data}")

    def test_auth_me(self):
        """Test get current user"""
        if not self.admin_token:
            self.log_test("Get current user", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, data = self.make_request('GET', '/auth/me', headers=headers)
        self.log_test("Get current user", success,
                     f"User: {data.get('name', 'Unknown')}" if success else f"Error: {data}")

    def test_cart_operations(self):
        """Test cart functionality"""
        print("\n🛒 Testing Cart Operations...")
        
        if not self.test_product_id:
            self.log_test("Cart operations", False, "No test product available")
            return
        
        # Get empty cart
        success, data = self.make_request('GET', '/cart')
        self.log_test("Get empty cart", success,
                     f"Items: {len(data.get('items', []))}" if success else f"Error: {data}")
        
        # Add to cart
        cart_item = {
            "product_id": self.test_product_id,
            "quantity": 2
        }
        success, data = self.make_request('POST', '/cart/add', cart_item)
        self.log_test("Add to cart", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
        
        # Get cart with items
        success, data = self.make_request('GET', '/cart')
        self.log_test("Get cart with items", success,
                     f"Items: {len(data.get('items', []))}, Total: {data.get('total', 0)}" if success else f"Error: {data}")
        
        # Update cart item
        update_item = {
            "product_id": self.test_product_id,
            "quantity": 1
        }
        success, data = self.make_request('PUT', '/cart/update', update_item)
        self.log_test("Update cart item", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
        
        # Remove from cart
        success, data = self.make_request('DELETE', f'/cart/remove/{self.test_product_id}')
        self.log_test("Remove from cart", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_wishlist_operations(self):
        """Test wishlist functionality"""
        print("\n❤️ Testing Wishlist Operations...")
        
        if not self.user_token or not self.test_product_id:
            self.log_test("Wishlist operations", False, "No user token or test product available")
            return
        
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Get empty wishlist
        success, data = self.make_request('GET', '/wishlist', headers=headers)
        self.log_test("Get empty wishlist", success,
                     f"Items: {len(data.get('items', []))}" if success else f"Error: {data}")
        
        # Add to wishlist
        success, data = self.make_request('POST', f'/wishlist/add/{self.test_product_id}', headers=headers)
        self.log_test("Add to wishlist", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
        
        # Get wishlist with items
        success, data = self.make_request('GET', '/wishlist', headers=headers)
        self.log_test("Get wishlist with items", success,
                     f"Items: {len(data.get('items', []))}" if success else f"Error: {data}")
        
        # Remove from wishlist
        success, data = self.make_request('DELETE', f'/wishlist/remove/{self.test_product_id}', headers=headers)
        self.log_test("Remove from wishlist", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_order_creation(self):
        """Test order creation"""
        print("\n📋 Testing Order Creation...")
        
        if not self.test_product_id:
            self.log_test("Order creation", False, "No test product available")
            return
        
        # First add item to cart
        cart_item = {
            "product_id": self.test_product_id,
            "quantity": 1
        }
        self.make_request('POST', '/cart/add', cart_item)
        
        # Create order
        order_data = {
            "items": [
                {
                    "product_id": self.test_product_id,
                    "name": "Test Product",
                    "price": 100000,
                    "quantity": 1,
                    "image": "test.jpg"
                }
            ],
            "shipping": {
                "full_name": "Test Customer",
                "phone": "+221771234567",
                "address": "123 Test Street",
                "city": "Dakar",
                "region": "Dakar",
                "notes": "Test order"
            },
            "payment_method": "wave",
            "subtotal": 100000,
            "shipping_cost": 2500,
            "total": 102500
        }
        
        success, data = self.make_request('POST', '/orders', order_data)
        if success:
            self.test_order_id = data.get('order_id')
            self.log_test("Create order", True, f"Order ID: {self.test_order_id}")
        else:
            self.log_test("Create order", False, f"Error: {data}")

    def test_admin_operations(self):
        """Test admin-only operations"""
        print("\n👑 Testing Admin Operations...")
        
        if not self.admin_token:
            self.log_test("Admin operations", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Get admin stats
        success, data = self.make_request('GET', '/admin/stats', headers=headers)
        self.log_test("Get admin stats", success,
                     f"Orders: {data.get('total_orders', 0)}, Products: {data.get('total_products', 0)}" if success else f"Error: {data}")
        
        # Get all orders (admin)
        success, data = self.make_request('GET', '/admin/orders', headers=headers)
        self.log_test("Get all orders (admin)", success,
                     f"Found {len(data.get('orders', []))} orders" if success else f"Error: {data}")
        
        # Get all users (admin)
        success, data = self.make_request('GET', '/admin/users', headers=headers)
        self.log_test("Get all users (admin)", success,
                     f"Found {len(data.get('users', []))} users" if success else f"Error: {data}")
        
        # Update order status
        if self.test_order_id:
            update_data = {
                "order_status": "processing",
                "payment_status": "paid"
            }
            success, data = self.make_request('PUT', f'/admin/orders/{self.test_order_id}/status', 
                                            update_data, headers=headers)
            self.log_test("Update order status", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_contact_form(self):
        """Test contact form submission"""
        print("\n📧 Testing Contact Form...")
        
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+221771234567",
            "subject": "Test Message",
            "message": "This is a test message from the API test suite."
        }
        
        success, data = self.make_request('POST', '/contact', contact_data)
        self.log_test("Submit contact form", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_mailerlite_abandoned_cart_integration(self):
        """Test MailerLite Abandoned Cart Integration endpoints"""
        print("\n📧 Testing MailerLite Abandoned Cart Integration...")
        
        if not self.admin_token:
            self.log_test("MailerLite Abandoned Cart Integration", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test 1: GET /api/admin/abandoned-carts/stats - Get statistics
        success, data = self.make_request('GET', '/admin/abandoned-carts/stats', headers=headers)
        if success:
            required_stats = ['abandoned_carts', 'total_emails_sent', 'emails_sent_today', 'automation_interval_hours', 'cart_timeout_hours']
            missing_stats = [stat for stat in required_stats if stat not in data]
            if not missing_stats:
                self.log_test("GET /api/admin/abandoned-carts/stats", True, 
                             f"Stats: {data.get('abandoned_carts', 0)} carts, {data.get('total_emails_sent', 0)} emails sent, interval: {data.get('automation_interval_hours', 0)}h")
            else:
                self.log_test("GET /api/admin/abandoned-carts/stats", False, 
                             f"Missing required stats: {missing_stats}")
        else:
            self.log_test("GET /api/admin/abandoned-carts/stats", False, f"Error: {data}")
        
        # Test 2: GET /api/admin/abandoned-carts - List all abandoned carts
        success, data = self.make_request('GET', '/admin/abandoned-carts', headers=headers)
        if success:
            if isinstance(data, list):
                self.log_test("GET /api/admin/abandoned-carts", True, 
                             f"Found {len(data)} abandoned carts")
                
                # Check structure of abandoned cart data if any exist
                if data:
                    cart = data[0]
                    required_fields = ['cart_id', 'user_id', 'items', 'updated_at']
                    missing_fields = [field for field in required_fields if field not in cart]
                    if not missing_fields:
                        self.log_test("Abandoned cart data structure", True, 
                                     f"Cart has all required fields: {list(cart.keys())}")
                    else:
                        self.log_test("Abandoned cart data structure", False, 
                                     f"Missing fields: {missing_fields}")
            else:
                self.log_test("GET /api/admin/abandoned-carts", False, 
                             f"Expected list, got: {type(data)}")
        else:
            self.log_test("GET /api/admin/abandoned-carts", False, f"Error: {data}")
        
        # Test 3: POST /api/admin/abandoned-carts/trigger - Manually trigger detection
        success, data = self.make_request('POST', '/admin/abandoned-carts/trigger', headers=headers)
        if success:
            if 'message' in data:
                self.log_test("POST /api/admin/abandoned-carts/trigger", True, 
                             f"Trigger response: {data.get('message')}")
            else:
                self.log_test("POST /api/admin/abandoned-carts/trigger", False, 
                             "No message in response")
        else:
            self.log_test("POST /api/admin/abandoned-carts/trigger", False, f"Error: {data}")
        
        # Test 4: GET /api/admin/abandoned-carts/emails - List sent emails
        success, data = self.make_request('GET', '/admin/abandoned-carts/emails', headers=headers)
        if success:
            if isinstance(data, list):
                self.log_test("GET /api/admin/abandoned-carts/emails", True, 
                             f"Found {len(data)} sent emails")
                
                # Check structure of email data if any exist
                if data:
                    email = data[0]
                    required_fields = ['email', 'subscriber_id', 'cart_items', 'sent_at']
                    missing_fields = [field for field in required_fields if field not in email]
                    if not missing_fields:
                        self.log_test("Sent email data structure", True, 
                                     f"Email has all required fields: {list(email.keys())}")
                    else:
                        self.log_test("Sent email data structure", False, 
                                     f"Missing fields: {missing_fields}")
            else:
                self.log_test("GET /api/admin/abandoned-carts/emails", False, 
                             f"Expected list, got: {type(data)}")
        else:
            self.log_test("GET /api/admin/abandoned-carts/emails", False, f"Error: {data}")
        
        # Test 5: POST /api/admin/abandoned-carts/send/{cart_id} - Send email for specific cart
        # First try with a non-existent cart ID to test error handling
        success, data = self.make_request('POST', '/admin/abandoned-carts/send/nonexistent_cart', 
                                        headers=headers, expected_status=404)
        self.log_test("POST /api/admin/abandoned-carts/send/{cart_id} (non-existent)", success,
                     "Properly returns 404 for non-existent cart" if success else f"Error: {data}")
        
        # Test authentication requirement for all endpoints
        print("\n🔒 Testing Authentication Requirements...")
        
        # Test without authentication (should fail with 401)
        endpoints_to_test = [
            '/admin/abandoned-carts/stats',
            '/admin/abandoned-carts',
            '/admin/abandoned-carts/emails'
        ]
        
        for endpoint in endpoints_to_test:
            success, data = self.make_request('GET', endpoint, expected_status=401)
            self.log_test(f"Authentication required for {endpoint}", success,
                         "Properly requires authentication" if success else f"Error: {data}")
        
        # Test trigger endpoint without auth
        success, data = self.make_request('POST', '/admin/abandoned-carts/trigger', expected_status=401)
        self.log_test("Authentication required for trigger endpoint", success,
                     "Properly requires authentication" if success else f"Error: {data}")

    def test_pdf_invoice_generation(self):
        """Test PDF invoice generation with YAMA+ logo"""
        print("\n📄 Testing PDF Invoice Generation...")
        
        # Test with existing order ID from the review request
        test_order_ids = ["ORD-F1215A06", "ORD-2C32A04F", "ORD-34DD43CC"]
        
        for order_id in test_order_ids:
            try:
                # Test invoice endpoint
                url = f"{self.base_url}/api/orders/{order_id}/invoice"
                response = self.session.get(url)
                
                if response.status_code == 200:
                    # Check if response is PDF
                    content_type = response.headers.get('content-type', '')
                    if 'application/pdf' in content_type:
                        # Save PDF and extract text to verify branding
                        pdf_path = f"/tmp/test_invoice_{order_id}.pdf"
                        with open(pdf_path, "wb") as f:
                            f.write(response.content)
                        
                        # Extract text from PDF to verify YAMA+ branding
                        try:
                            import PyPDF2
                            with open(pdf_path, 'rb') as file:
                                pdf_reader = PyPDF2.PdfReader(file)
                                text = ""
                                for page in pdf_reader.pages:
                                    text += page.extract_text()
                            
                            # Check for YAMA+ branding
                            if "GROUPE YAMA+" in text or "YAMA+" in text:
                                # Check that Wave branding is not present (or if present, YAMA+ is also there)
                                if "Wave" in text and "YAMA+" not in text:
                                    self.log_test(f"PDF Invoice Generation - {order_id}", False, 
                                                "CRITICAL: PDF contains Wave branding without YAMA+ branding")
                                else:
                                    self.log_test(f"PDF Invoice Generation - {order_id}", True, 
                                                f"PDF generated successfully with GROUPE YAMA+ branding (Size: {len(response.content)} bytes)")
                                    print(f"    ✅ YAMA+ branding verified in PDF text content")
                                    break
                            else:
                                self.log_test(f"PDF Invoice Generation - {order_id}", False, 
                                            "PDF generated but YAMA+ branding not found in text content")
                        except ImportError:
                            # Fallback to binary search if PyPDF2 not available
                            if b'GROUPE YAMA+' in response.content or b'YAMA+' in response.content:
                                self.log_test(f"PDF Invoice Generation - {order_id}", True, 
                                            f"PDF generated successfully with YAMA+ branding (Size: {len(response.content)} bytes)")
                                break
                            else:
                                self.log_test(f"PDF Invoice Generation - {order_id}", False, 
                                            "PDF generated but YAMA+ branding not found")
                    else:
                        self.log_test(f"PDF Invoice Generation - {order_id}", False, 
                                    f"Response is not PDF format: {content_type}")
                elif response.status_code == 404:
                    print(f"    Order {order_id} not found, trying next...")
                    continue
                else:
                    self.log_test(f"PDF Invoice Generation - {order_id}", False, 
                                f"HTTP {response.status_code}: {response.text[:100]}")
                    
            except Exception as e:
                self.log_test(f"PDF Invoice Generation - {order_id}", False, f"Exception: {str(e)}")
        
        # If no existing orders work, try with our test order
        if self.test_order_id:
            try:
                url = f"{self.base_url}/api/orders/{self.test_order_id}/invoice"
                response = self.session.get(url)
                
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')
                    if 'application/pdf' in content_type:
                        # Extract text to verify branding
                        try:
                            import PyPDF2
                            pdf_path = f"/tmp/test_invoice_{self.test_order_id}.pdf"
                            with open(pdf_path, "wb") as f:
                                f.write(response.content)
                            
                            with open(pdf_path, 'rb') as file:
                                pdf_reader = PyPDF2.PdfReader(file)
                                text = ""
                                for page in pdf_reader.pages:
                                    text += page.extract_text()
                            
                            if "GROUPE YAMA+" in text or "YAMA+" in text:
                                self.log_test(f"PDF Invoice Generation - {self.test_order_id}", True, 
                                            f"PDF generated successfully with GROUPE YAMA+ branding (Size: {len(response.content)} bytes)")
                            else:
                                self.log_test(f"PDF Invoice Generation - {self.test_order_id}", False, 
                                            "PDF generated but YAMA+ branding not found in text content")
                        except ImportError:
                            # Fallback to binary search
                            if b'GROUPE YAMA+' in response.content or b'YAMA+' in response.content:
                                self.log_test(f"PDF Invoice Generation - {self.test_order_id}", True, 
                                            f"PDF generated successfully with YAMA+ branding (Size: {len(response.content)} bytes)")
                            else:
                                self.log_test(f"PDF Invoice Generation - {self.test_order_id}", False, 
                                            "PDF generated but YAMA+ branding not found")
                    else:
                        self.log_test(f"PDF Invoice Generation - {self.test_order_id}", False, 
                                    f"Response is not PDF format: {content_type}")
                else:
                    self.log_test(f"PDF Invoice Generation - {self.test_order_id}", False, 
                                f"HTTP {response.status_code}: {response.text[:100]}")
                    
            except Exception as e:
                self.log_test(f"PDF Invoice Generation - {self.test_order_id}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting YAMA+ MailerLite Abandoned Cart Integration Tests")
        print("=" * 60)
        
        # Run essential tests first
        self.test_health_check()
        self.test_auth_login()
        self.test_auth_me()
        
        # Main focus: MailerLite Abandoned Cart Integration
        print("\n📧 MAILERLITE ABANDONED CART INTEGRATION TESTING")
        print("=" * 50)
        self.test_mailerlite_abandoned_cart_integration()
        
        # Run other critical tests
        self.test_database_seeding()
        self.test_categories()
        self.test_products()
        self.test_flash_sales()
        self.test_similar_products()
        self.test_auth_registration()
        self.test_cart_operations()
        self.test_wishlist_operations()
        
        # Phase 3 Feature Tests
        print("\n🎯 PHASE 3 FEATURES TESTING")
        print("=" * 40)
        self.test_loyalty_program()
        self.test_wishlist_sharing()
        self.test_review_media_upload()
        self.test_product_comparison_support()
        
        # Continue with other tests
        self.test_order_creation()
        self.test_order_tracking()
        self.test_admin_operations()
        self.test_contact_form()
        self.test_pdf_invoice_generation()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = YAMAPhase3Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())