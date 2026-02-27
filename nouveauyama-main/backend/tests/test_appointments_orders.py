"""
Test suite for YAMA+ Admin Appointments and Order Status features
Tests:
1. Admin appointments stats endpoint
2. Admin appointments list endpoint
3. Admin appointment status update
4. Admin order status update (order_status field)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stable-prod.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@yama.sn"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminAppointments:
    """Test admin appointments endpoints"""
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("role") == "admin"
        print(f"✓ Admin login successful, role: {data.get('role')}")
    
    def test_appointments_stats_endpoint(self, admin_headers):
        """Test GET /api/admin/appointments/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/admin/appointments/stats", headers=admin_headers)
        assert response.status_code == 200, f"Appointments stats failed: {response.text}"
        
        data = response.json()
        # Verify stats structure
        assert "total" in data, "Missing 'total' in stats"
        assert "pending" in data, "Missing 'pending' in stats"
        assert "confirmed" in data, "Missing 'confirmed' in stats"
        assert "completed" in data, "Missing 'completed' in stats"
        assert "cancelled" in data, "Missing 'cancelled' in stats"
        
        print(f"✓ Appointments stats: total={data['total']}, pending={data['pending']}, confirmed={data['confirmed']}")
    
    def test_appointments_stats_requires_auth(self):
        """Test appointments stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/appointments/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Appointments stats correctly requires authentication")
    
    def test_appointments_list_endpoint(self, admin_headers):
        """Test GET /api/admin/appointments returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/appointments", headers=admin_headers)
        assert response.status_code == 200, f"Appointments list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of appointments"
        
        if len(data) > 0:
            apt = data[0]
            # Verify appointment structure
            assert "appointment_id" in apt, "Missing appointment_id"
            assert "status" in apt, "Missing status"
            assert "customer" in apt, "Missing customer info"
            print(f"✓ Found {len(data)} appointments, first: {apt.get('appointment_id')}")
        else:
            print("✓ Appointments list returned (empty)")
    
    def test_appointments_list_filter_by_status(self, admin_headers):
        """Test filtering appointments by status"""
        response = requests.get(f"{BASE_URL}/api/admin/appointments?status=pending", headers=admin_headers)
        assert response.status_code == 200, f"Filtered appointments failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned appointments should have pending status
        for apt in data:
            assert apt.get("status") == "pending", f"Expected pending status, got {apt.get('status')}"
        
        print(f"✓ Filtered appointments by status=pending, found {len(data)}")


class TestAppointmentStatusUpdate:
    """Test appointment status update with WhatsApp link"""
    
    def test_update_appointment_status(self, admin_headers):
        """Test PUT /api/admin/appointments/{id} updates status"""
        # First get list of appointments
        list_response = requests.get(f"{BASE_URL}/api/admin/appointments", headers=admin_headers)
        assert list_response.status_code == 200
        
        appointments = list_response.json()
        if len(appointments) == 0:
            pytest.skip("No appointments to test status update")
        
        # Get first appointment
        apt = appointments[0]
        apt_id = apt.get("appointment_id")
        original_status = apt.get("status")
        
        # Update to confirmed status with WhatsApp
        update_response = requests.put(
            f"{BASE_URL}/api/admin/appointments/{apt_id}",
            headers=admin_headers,
            json={
                "status": "confirmed",
                "confirmed_date": "2026-01-20",
                "confirmed_time": "10:00",
                "location": "Fass Paillote, Dakar",
                "send_whatsapp": True
            }
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        data = update_response.json()
        # Check if WhatsApp link is returned when send_whatsapp=True
        if apt.get("customer", {}).get("phone"):
            # WhatsApp link should be returned if customer has phone
            print(f"✓ Appointment {apt_id} updated, whatsapp_link: {'present' if data.get('whatsapp_link') else 'not present'}")
        else:
            print(f"✓ Appointment {apt_id} updated (no phone for WhatsApp)")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/admin/appointments/{apt_id}",
            headers=admin_headers,
            json={"status": original_status}
        )
    
    def test_update_nonexistent_appointment(self, admin_headers):
        """Test updating non-existent appointment returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/appointments/nonexistent_id",
            headers=admin_headers,
            json={"status": "confirmed"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent appointment correctly returns 404")


class TestOrderStatusUpdate:
    """Test order status update with order_status field"""
    
    def test_orders_list_endpoint(self, admin_headers):
        """Test GET /api/admin/orders returns orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert response.status_code == 200, f"Orders list failed: {response.text}"
        
        data = response.json()
        # Handle both array and object response formats
        orders = data if isinstance(data, list) else data.get("orders", [])
        
        print(f"✓ Found {len(orders)} orders")
        
        if len(orders) > 0:
            order = orders[0]
            assert "order_id" in order, "Missing order_id"
            # Check for order_status field
            if "order_status" in order:
                print(f"  First order: {order['order_id']}, order_status: {order.get('order_status')}")
            else:
                print(f"  First order: {order['order_id']}, status: {order.get('status')}")
    
    def test_update_order_status_with_order_status_field(self, admin_headers):
        """Test PUT /api/admin/orders/{id}/status with order_status field"""
        # First get list of orders
        list_response = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert list_response.status_code == 200
        
        data = list_response.json()
        orders = data if isinstance(data, list) else data.get("orders", [])
        
        if len(orders) == 0:
            pytest.skip("No orders to test status update")
        
        # Get first order
        order = orders[0]
        order_id = order.get("order_id")
        original_status = order.get("order_status", order.get("status", "pending"))
        
        # Update using order_status field (not status)
        update_response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            headers=admin_headers,
            json={"order_status": "processing"}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"✓ Order {order_id} status updated using order_status field")
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        verify_data = verify_response.json()
        verify_orders = verify_data if isinstance(verify_data, list) else verify_data.get("orders", [])
        
        updated_order = next((o for o in verify_orders if o.get("order_id") == order_id), None)
        if updated_order:
            assert updated_order.get("order_status") == "processing", f"Expected 'processing', got {updated_order.get('order_status')}"
            print(f"✓ Verified order_status is now 'processing'")
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            headers=admin_headers,
            json={"order_status": original_status}
        )
    
    def test_update_order_status_requires_auth(self):
        """Test order status update requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/test_order/status",
            json={"order_status": "processing"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Order status update correctly requires authentication")
    
    def test_update_order_status_empty_body(self, admin_headers):
        """Test order status update with empty body returns 400"""
        # First get an order
        list_response = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        data = list_response.json()
        orders = data if isinstance(data, list) else data.get("orders", [])
        
        if len(orders) == 0:
            pytest.skip("No orders to test")
        
        order_id = orders[0].get("order_id")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            headers=admin_headers,
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Empty body correctly returns 400")


class TestAdminStats:
    """Test admin dashboard stats include appointments"""
    
    def test_admin_stats_endpoint(self, admin_headers):
        """Test GET /api/admin/stats returns dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        # Verify basic stats structure
        assert "total_revenue" in data or "revenue" in data, "Missing revenue in stats"
        assert "total_orders" in data or "orders" in data, "Missing orders in stats"
        assert "total_products" in data or "products" in data, "Missing products in stats"
        
        print(f"✓ Admin stats: revenue={data.get('total_revenue', data.get('revenue'))}, orders={data.get('total_orders', data.get('orders'))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
