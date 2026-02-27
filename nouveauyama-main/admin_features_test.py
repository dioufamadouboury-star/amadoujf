#!/usr/bin/env python3
"""
YAMA+ Admin Features Test Suite
Tests Flash Sales and Email Campaigns admin functionality
"""

import requests
import sys
import json
from datetime import datetime

class AdminFeaturesTest:
    def __init__(self, base_url="https://stable-prod.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Admin credentials from review request
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

    def make_request(self, method: str, endpoint: str, data=None, headers=None, expected_status: int = 200):
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

    def test_admin_login(self):
        """Test admin authentication"""
        print("\n🔐 Testing Admin Authentication...")
        
        login_data = {
            "email": self.admin_email,
            "password": self.admin_password
        }
        
        success, data = self.make_request('POST', '/auth/login', login_data)
        if success:
            self.admin_token = data.get('token')
            role = data.get('role')
            self.log_test("Admin login", True, f"Role: {role}, Token received: {bool(self.admin_token)}")
            return True
        else:
            self.log_test("Admin login", False, f"Error: {data}")
            return False

    def test_flash_sales_apis(self):
        """Test Flash Sales API endpoints"""
        print("\n⚡ Testing Flash Sales APIs...")
        
        if not self.admin_token:
            self.log_test("Flash Sales APIs", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # 1. Get active flash sales
        success, data = self.make_request('GET', '/flash-sales')
        self.log_test("GET /api/flash-sales", success,
                     f"Found {len(data)} flash sale products" if success and isinstance(data, list) else f"Error: {data}")
        
        # 2. Get products to use for flash sale test
        success, products = self.make_request('GET', '/products?limit=5')
        if not success or not products:
            self.log_test("Flash Sales - Get test product", False, "No products available for testing")
            return
        
        test_product_id = products[0]['product_id']
        
        # 3. Create flash sale
        flash_sale_data = {
            "flash_sale_price": 50000,
            "flash_sale_end": "2025-12-31T23:59:59Z"
        }
        success, data = self.make_request('POST', f'/admin/flash-sales/{test_product_id}', 
                                        flash_sale_data, headers=headers)
        self.log_test("POST /api/admin/flash-sales/{product_id}", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
        
        # 4. Verify flash sale was created
        success, data = self.make_request('GET', '/flash-sales')
        flash_sale_created = False
        if success and isinstance(data, list):
            for product in data:
                if product.get('product_id') == test_product_id and product.get('is_flash_sale'):
                    flash_sale_created = True
                    break
        
        self.log_test("Verify flash sale creation", flash_sale_created,
                     f"Flash sale found for product {test_product_id}" if flash_sale_created else "Flash sale not found")
        
        # 5. Remove flash sale
        success, data = self.make_request('DELETE', f'/admin/flash-sales/{test_product_id}', 
                                        headers=headers)
        self.log_test("DELETE /api/admin/flash-sales/{product_id}", success,
                     f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_email_campaigns_apis(self):
        """Test Email Campaigns API endpoints"""
        print("\n📧 Testing Email Campaigns APIs...")
        
        if not self.admin_token:
            self.log_test("Email Campaigns APIs", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # 1. Get email statistics
        success, data = self.make_request('GET', '/admin/email/stats', headers=headers)
        self.log_test("GET /api/admin/email/stats", success,
                     f"Stats: {data.get('total_campaigns', 0)} campaigns, {data.get('newsletter_subscribers', 0)} subscribers" if success else f"Error: {data}")
        
        # 2. Get campaigns list
        success, data = self.make_request('GET', '/admin/campaigns', headers=headers)
        self.log_test("GET /api/admin/campaigns", success,
                     f"Found {len(data)} campaigns" if success and isinstance(data, list) else f"Error: {data}")
        
        # 3. Create new campaign
        campaign_data = {
            "name": f"Test Campaign {datetime.now().strftime('%H%M%S')}",
            "subject": "Test Email Subject",
            "content": "<h2>Test Email Content</h2><p>This is a test email campaign.</p>",
            "target_audience": "all"
        }
        success, data = self.make_request('POST', '/admin/campaigns', campaign_data, headers=headers)
        campaign_id = None
        if success:
            campaign_id = data.get('campaign_id')
        
        self.log_test("POST /api/admin/campaigns", success,
                     f"Campaign created: {campaign_id}" if success else f"Error: {data}")
        
        # 4. Get specific campaign
        if campaign_id:
            success, data = self.make_request('GET', f'/admin/campaigns/{campaign_id}', headers=headers)
            self.log_test("GET /api/admin/campaigns/{campaign_id}", success,
                         f"Campaign: {data.get('name', 'Unknown')}" if success else f"Error: {data}")
            
            # 5. Send test email
            test_email_data = {"email": "test@example.com"}
            success, data = self.make_request('POST', f'/admin/campaigns/{campaign_id}/test', 
                                            test_email_data, headers=headers)
            self.log_test("POST /api/admin/campaigns/{campaign_id}/test", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
            
            # 6. Update campaign
            update_data = {
                "name": f"Updated Test Campaign {datetime.now().strftime('%H%M%S')}",
                "subject": "Updated Test Subject",
                "content": "<h2>Updated Content</h2>",
                "target_audience": "newsletter"
            }
            success, data = self.make_request('PUT', f'/admin/campaigns/{campaign_id}', 
                                            update_data, headers=headers)
            self.log_test("PUT /api/admin/campaigns/{campaign_id}", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")
            
            # 7. Delete campaign
            success, data = self.make_request('DELETE', f'/admin/campaigns/{campaign_id}', headers=headers)
            self.log_test("DELETE /api/admin/campaigns/{campaign_id}", success,
                         f"Message: {data.get('message', 'No message')}" if success else f"Error: {data}")

    def test_single_email_send(self):
        """Test single email sending"""
        print("\n📤 Testing Single Email Send...")
        
        if not self.admin_token:
            self.log_test("Single Email Send", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        email_data = {
            "to": "test@example.com",
            "subject": "Test Single Email",
            "html_content": "<h2>Test Email</h2><p>This is a test email from YAMA+ admin.</p>"
        }
        
        success, data = self.make_request('POST', '/admin/email/send', email_data, headers=headers)
        self.log_test("POST /api/admin/email/send", success,
                     f"Email ID: {data.get('email_id', 'No ID')}" if success else f"Error: {data}")

    def run_all_tests(self):
        """Run all admin feature tests"""
        print("🚀 Starting YAMA+ Admin Features Tests")
        print("=" * 60)
        
        # Login first
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        # Run feature tests
        self.test_flash_sales_apis()
        self.test_email_campaigns_apis()
        self.test_single_email_send()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 ADMIN FEATURES TEST SUMMARY")
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
    tester = AdminFeaturesTest()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())