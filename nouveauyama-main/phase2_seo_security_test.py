#!/usr/bin/env python3
"""
YAMA+ Phase 2 SEO & Security Testing
Tests SEO optimizations and security improvements
"""

import requests
import sys
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.parse import urljoin

class Phase2SEOSecurityTester:
    def __init__(self, base_url="https://stable-prod.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            self.passed_tests.append(name)
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})

    def test_sitemap_xml(self):
        """Test /api/sitemap.xml endpoint returns valid XML sitemap"""
        try:
            response = requests.get(f"{self.api_base}/sitemap.xml", timeout=10)
            
            # Check status code
            if response.status_code != 200:
                self.log_test("Sitemap XML - Status Code", False, f"Expected 200, got {response.status_code}")
                return
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            if 'xml' not in content_type:
                self.log_test("Sitemap XML - Content Type", False, f"Expected XML content type, got {content_type}")
                return
            
            # Parse XML to validate structure
            try:
                root = ET.fromstring(response.text)
                
                # Check if it's a valid sitemap
                if root.tag != '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset':
                    self.log_test("Sitemap XML - Structure", False, "Invalid sitemap XML structure")
                    return
                
                # Check for URL entries
                urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                if len(urls) == 0:
                    self.log_test("Sitemap XML - URLs", False, "No URLs found in sitemap")
                    return
                
                # Validate URL structure
                for url in urls[:3]:  # Check first 3 URLs
                    loc = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is None or not loc.text:
                        self.log_test("Sitemap XML - URL Structure", False, "Invalid URL structure in sitemap")
                        return
                
                self.log_test("Sitemap XML - Valid Structure", True, f"Found {len(urls)} URLs")
                
            except ET.ParseError as e:
                self.log_test("Sitemap XML - Parse Error", False, f"XML parsing failed: {str(e)}")
                return
                
        except Exception as e:
            self.log_test("Sitemap XML - Request Error", False, f"Request failed: {str(e)}")

    def test_security_headers(self):
        """Test security headers are present"""
        try:
            response = requests.get(f"{self.api_base}/products", timeout=10)
            headers = response.headers
            
            # Required security headers
            security_headers = {
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff', 
                'X-XSS-Protection': '1; mode=block'
            }
            
            for header, expected_value in security_headers.items():
                actual_value = headers.get(header)
                if not actual_value:
                    self.log_test(f"Security Header - {header}", False, "Header missing")
                elif expected_value.lower() not in actual_value.lower():
                    self.log_test(f"Security Header - {header}", False, f"Expected '{expected_value}', got '{actual_value}'")
                else:
                    self.log_test(f"Security Header - {header}", True)
            
            # Check for additional security headers
            additional_headers = ['Referrer-Policy', 'Permissions-Policy']
            for header in additional_headers:
                if headers.get(header):
                    self.log_test(f"Additional Security Header - {header}", True)
                else:
                    self.log_test(f"Additional Security Header - {header}", False, "Header missing")
                    
        except Exception as e:
            self.log_test("Security Headers - Request Error", False, f"Request failed: {str(e)}")

    def test_rate_limiting_headers(self):
        """Test rate limiting headers are present"""
        try:
            response = requests.get(f"{self.api_base}/products", timeout=10)
            headers = response.headers
            
            # Required rate limiting headers
            rate_limit_headers = ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
            
            for header in rate_limit_headers:
                value = headers.get(header)
                if not value:
                    self.log_test(f"Rate Limit Header - {header}", False, "Header missing")
                else:
                    try:
                        int(value)  # Should be a number
                        self.log_test(f"Rate Limit Header - {header}", True, f"Value: {value}")
                    except ValueError:
                        self.log_test(f"Rate Limit Header - {header}", False, f"Invalid value: {value}")
                        
        except Exception as e:
            self.log_test("Rate Limiting Headers - Request Error", False, f"Request failed: {str(e)}")

    def test_robots_txt(self):
        """Test robots.txt is accessible"""
        try:
            response = requests.get(f"{self.base_url}/robots.txt", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Robots.txt - Accessibility", False, f"Status code: {response.status_code}")
                return
            
            content = response.text.lower()
            
            # Check for basic robots.txt content
            if 'user-agent:' not in content:
                self.log_test("Robots.txt - Content", False, "Missing User-agent directive")
                return
            
            # Check for sitemap reference
            if 'sitemap:' in content:
                self.log_test("Robots.txt - Sitemap Reference", True)
            else:
                self.log_test("Robots.txt - Sitemap Reference", False, "No sitemap reference found")
            
            # Check for disallow directives
            if 'disallow:' in content:
                self.log_test("Robots.txt - Disallow Directives", True)
            else:
                self.log_test("Robots.txt - Disallow Directives", False, "No disallow directives found")
                
            self.log_test("Robots.txt - Accessibility", True)
            
        except Exception as e:
            self.log_test("Robots.txt - Request Error", False, f"Request failed: {str(e)}")

    def test_manifest_json(self):
        """Test manifest.json is accessible"""
        try:
            response = requests.get(f"{self.base_url}/manifest.json", timeout=10)
            
            if response.status_code != 200:
                self.log_test("Manifest.json - Accessibility", False, f"Status code: {response.status_code}")
                return
            
            try:
                manifest = response.json()
                
                # Check required PWA manifest fields
                required_fields = ['name', 'short_name', 'start_url', 'display', 'icons']
                for field in required_fields:
                    if field not in manifest:
                        self.log_test(f"Manifest.json - {field}", False, "Required field missing")
                    else:
                        self.log_test(f"Manifest.json - {field}", True)
                
                # Check icons array
                if 'icons' in manifest and isinstance(manifest['icons'], list) and len(manifest['icons']) > 0:
                    icon = manifest['icons'][0]
                    if 'src' in icon and 'sizes' in icon:
                        self.log_test("Manifest.json - Icon Structure", True)
                    else:
                        self.log_test("Manifest.json - Icon Structure", False, "Invalid icon structure")
                
                self.log_test("Manifest.json - Valid JSON", True)
                
            except json.JSONDecodeError:
                self.log_test("Manifest.json - JSON Parse", False, "Invalid JSON format")
                
        except Exception as e:
            self.log_test("Manifest.json - Request Error", False, f"Request failed: {str(e)}")

    def test_homepage_seo_meta_tags(self):
        """Test homepage loads with SEO meta tags"""
        try:
            response = requests.get(self.base_url, timeout=10)
            
            if response.status_code != 200:
                self.log_test("Homepage - Accessibility", False, f"Status code: {response.status_code}")
                return
            
            html_content = response.text.lower()
            
            # Check for essential meta tags
            meta_tags = {
                'title': '<title>',
                'description': 'name="description"',
                'og:title': 'property="og:title"',
                'og:description': 'property="og:description"',
                'og:image': 'property="og:image"',
                'twitter:card': 'name="twitter:card"',
                'canonical': 'rel="canonical"'
            }
            
            for tag_name, tag_pattern in meta_tags.items():
                if tag_pattern in html_content:
                    self.log_test(f"Homepage SEO - {tag_name}", True)
                else:
                    self.log_test(f"Homepage SEO - {tag_name}", False, f"Missing {tag_pattern}")
            
            # Check for YAMA+ branding
            if 'yama' in html_content or 'groupe yama' in html_content:
                self.log_test("Homepage SEO - YAMA+ Branding", True)
            else:
                self.log_test("Homepage SEO - YAMA+ Branding", False, "YAMA+ branding not found")
                
            self.log_test("Homepage - Accessibility", True)
            
        except Exception as e:
            self.log_test("Homepage SEO - Request Error", False, f"Request failed: {str(e)}")

    def test_product_structured_data(self):
        """Test product pages have structured data JSON-LD"""
        try:
            # First get a product to test
            products_response = requests.get(f"{self.api_base}/products?limit=1", timeout=10)
            
            if products_response.status_code != 200:
                self.log_test("Product Structured Data - Get Products", False, "Failed to get products")
                return
            
            products = products_response.json()
            if not products or len(products) == 0:
                self.log_test("Product Structured Data - No Products", False, "No products found to test")
                return
            
            product = products[0]
            product_id = product.get('product_id')
            
            if not product_id:
                self.log_test("Product Structured Data - Product ID", False, "No product ID found")
                return
            
            # Test product page (assuming frontend route structure)
            product_url = f"{self.base_url}/product/{product_id}"
            response = requests.get(product_url, timeout=10)
            
            if response.status_code == 200:
                html_content = response.text.lower()
                
                # Check for JSON-LD structured data
                if 'application/ld+json' in html_content:
                    self.log_test("Product Structured Data - JSON-LD Present", True)
                    
                    # Check for product schema
                    if '"@type": "product"' in html_content or '"@type":"product"' in html_content:
                        self.log_test("Product Structured Data - Product Schema", True)
                    else:
                        self.log_test("Product Structured Data - Product Schema", False, "Product schema not found")
                        
                    # Check for organization schema
                    if '"@type": "organization"' in html_content or '"@type":"organization"' in html_content:
                        self.log_test("Product Structured Data - Organization Schema", True)
                    else:
                        self.log_test("Product Structured Data - Organization Schema", False, "Organization schema not found")
                        
                else:
                    self.log_test("Product Structured Data - JSON-LD Present", False, "No JSON-LD found")
                    
            else:
                # If direct product page doesn't work, test that the SEO component exists in backend
                self.log_test("Product Structured Data - Page Access", False, f"Product page returned {response.status_code}")
                
                # Check if SEO component exists by testing the API response includes necessary data
                if 'name' in product and 'description' in product and 'price' in product:
                    self.log_test("Product Structured Data - API Data Complete", True, "Product API has required fields for structured data")
                else:
                    self.log_test("Product Structured Data - API Data Complete", False, "Product API missing required fields")
                    
        except Exception as e:
            self.log_test("Product Structured Data - Request Error", False, f"Request failed: {str(e)}")

    def test_cache_control_headers(self):
        """Test cache control headers for API responses"""
        try:
            response = requests.get(f"{self.api_base}/products", timeout=10)
            headers = response.headers
            
            cache_control = headers.get('Cache-Control')
            if cache_control:
                if 'no-store' in cache_control.lower() or 'max-age=0' in cache_control.lower():
                    self.log_test("Cache Control - API Responses", True, f"Value: {cache_control}")
                else:
                    self.log_test("Cache Control - API Responses", False, f"Unexpected cache control: {cache_control}")
            else:
                self.log_test("Cache Control - API Responses", False, "Cache-Control header missing")
                
        except Exception as e:
            self.log_test("Cache Control - Request Error", False, f"Request failed: {str(e)}")

    def test_cors_headers(self):
        """Test CORS headers are properly configured"""
        try:
            # Test preflight request
            response = requests.options(f"{self.api_base}/products", timeout=10)
            
            # CORS headers might be present
            cors_headers = ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers']
            
            found_cors = False
            for header in cors_headers:
                if response.headers.get(header):
                    found_cors = True
                    self.log_test(f"CORS Header - {header}", True)
            
            if not found_cors:
                # Try a regular GET request
                get_response = requests.get(f"{self.api_base}/products", timeout=10)
                for header in cors_headers:
                    if get_response.headers.get(header):
                        found_cors = True
                        self.log_test(f"CORS Header - {header}", True)
            
            if not found_cors:
                self.log_test("CORS Headers - Configuration", False, "No CORS headers found")
            else:
                self.log_test("CORS Headers - Configuration", True)
                
        except Exception as e:
            self.log_test("CORS Headers - Request Error", False, f"Request failed: {str(e)}")

    def run_all_tests(self):
        """Run all Phase 2 SEO and Security tests"""
        print("🔍 Starting YAMA+ Phase 2 SEO & Security Testing...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # SEO Tests
        print("\n📈 SEO OPTIMIZATION TESTS")
        print("-" * 30)
        self.test_sitemap_xml()
        self.test_robots_txt()
        self.test_manifest_json()
        self.test_homepage_seo_meta_tags()
        self.test_product_structured_data()
        
        # Security Tests
        print("\n🔒 SECURITY TESTS")
        print("-" * 20)
        self.test_security_headers()
        self.test_rate_limiting_headers()
        self.test_cache_control_headers()
        self.test_cors_headers()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}/{self.tests_run}")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.failed_tests,
            "passed_test_names": self.passed_tests,
            "success_rate": success_rate
        }

def main():
    """Main test execution"""
    tester = Phase2SEOSecurityTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if len(results["failed_tests"]) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())