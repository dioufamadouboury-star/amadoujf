#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class YAMAPlusAPITester:
    def __init__(self, base_url="https://6f04627b-67bb-42e2-8523-edac9d6ed4f2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        # Set timeout for all requests
        self.session.timeout = 30

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=default_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    if response_data and isinstance(response_data, dict):
                        # Show limited response for readability
                        if 'message' in response_data:
                            print(f"   Message: {response_data['message']}")
                        elif len(str(response_data)) > 200:
                            print(f"   Response: {str(response_data)[:200]}...")
                        else:
                            print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_content = response.text[:500]
                    print(f"   Error: {error_content}")
                except:
                    pass

            return success, response.json() if response.content and success else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self, email="admin@yamaplus.com", password="Admin123!"):
        """Test admin login and get token"""
        print("\n" + "="*50)
        print("TESTING ADMIN LOGIN")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   ✅ Admin token obtained")
            print(f"   Admin role: {response.get('role')}")
            return True
        else:
            print(f"   ❌ Failed to get admin token")
            return False

    def test_auth_endpoints(self):
        """Test authentication related endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTH ENDPOINTS")
        print("="*50)
        
        # Test /auth/me with valid token
        if self.token:
            self.run_test(
                "Auth Me (with token)",
                "GET",
                "api/auth/me",
                200
            )
        
        # Test Google OAuth callback endpoint exists (should return 400 with missing code)
        self.run_test(
            "Google OAuth Callback Endpoint",
            "POST",
            "api/auth/google/callback",
            400,  # Expected 400 because we're not sending required data
            data={}
        )

    def test_products_endpoints(self):
        """Test product related endpoints"""
        print("\n" + "="*50)
        print("TESTING PRODUCTS ENDPOINTS")
        print("="*50)
        
        # Get all products
        success, products = self.run_test(
            "Get Products",
            "GET",
            "api/products",
            200
        )
        
        if success and isinstance(products, list):
            print(f"   Found {len(products)} products")
            if len(products) > 0:
                # Test individual product
                first_product = products[0]
                product_id = first_product.get('product_id')
                if product_id:
                    self.run_test(
                        f"Get Product Details ({product_id})",
                        "GET",
                        f"api/products/{product_id}",
                        200
                    )
                    
                    # Test similar products
                    self.run_test(
                        f"Get Similar Products ({product_id})",
                        "GET",
                        f"api/products/{product_id}/similar",
                        200
                    )
        
        # Test featured products
        self.run_test(
            "Get Featured Products",
            "GET",
            "api/products?featured=true",
            200
        )
        
        # Test product search
        self.run_test(
            "Search Products",
            "GET",
            "api/products?search=test",
            200
        )

    def test_flash_sales(self):
        """Test flash sales endpoint"""
        print("\n" + "="*50)
        print("TESTING FLASH SALES")
        print("="*50)
        
        self.run_test(
            "Get Flash Sales",
            "GET",
            "api/flash-sales",
            200
        )

    def test_cart_endpoints(self):
        """Test cart functionality"""
        print("\n" + "="*50)
        print("TESTING CART ENDPOINTS")  
        print("="*50)
        
        if not self.token:
            print("⏭️  Skipping cart tests - no auth token")
            return
            
        # Get user cart
        self.run_test(
            "Get User Cart",
            "GET",
            "api/cart",
            200
        )

    def test_categories_endpoint(self):
        """Test categories endpoint"""
        print("\n" + "="*50)
        print("TESTING CATEGORIES")
        print("="*50)
        
        self.run_test(
            "Get Categories",
            "GET",
            "api/categories",
            200
        )

    def test_game_endpoints(self):
        """Test game related endpoints"""
        print("\n" + "="*50)
        print("TESTING GAME ENDPOINTS")
        print("="*50)
        
        # Test game config endpoint
        self.run_test(
            "Get Game Config",
            "GET",
            "api/game/config",
            200
        )

    def test_health_endpoints(self):
        """Test basic health/status endpoints"""
        print("\n" + "="*50)
        print("TESTING HEALTH ENDPOINTS")
        print("="*50)
        
        # Test root endpoint (might redirect or return info)
        self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200,
        )

def main():
    print("🧪 YAMA+ Backend API Testing")
    print("=" * 60)
    
    tester = YAMAPlusAPITester()
    
    # Test admin login first
    login_success = tester.test_admin_login()
    
    # Run all API tests
    tester.test_auth_endpoints()
    tester.test_products_endpoints()
    tester.test_flash_sales()
    tester.test_cart_endpoints()
    tester.test_categories_endpoint()
    tester.test_game_endpoints()
    tester.test_health_endpoints()
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
    print("="*60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if not login_success:
        print("\n⚠️  CRITICAL: Admin login failed - this will affect frontend functionality")
        
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())