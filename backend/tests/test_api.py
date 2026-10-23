import pytest

ADMIN_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-admin-001"}
HR_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-hr-001"}
STUDENT_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-001"}

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_unauthenticated_request_rejected(client):
    response = client.get("/api/v1/users")
    assert response.status_code == 401
    assert "Authentication token missing" in response.json()["detail"]

def test_unauthorized_role_rejected(client):
    # Student trying to access Super Admin audit logs -> 403 Forbidden
    response = client.get("/api/v1/users/audit-logs", headers=STUDENT_HEADERS)
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

def test_create_and_list_users(client):
    user_payload = {
        "email": "testuser@netlink.org",
        "full_name": "Test User",
        "role": "STUDENT",
        "phone": "+15551234567"
    }
    response = client.post("/api/v1/users", json=user_payload, headers=HR_HEADERS)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "testuser@netlink.org"

    list_resp = client.get("/api/v1/users", headers=ADMIN_HEADERS)
    assert list_resp.status_code == 200
    users = list_resp.json()
    assert len(users) >= 1

def test_create_geofence(client):
    geo_payload = {
        "name": "Headquarters Office",
        "center_latitude": 12.971598,
        "center_longitude": 77.594562,
        "radius_meters": 100.0,
        "address": "Tech Park, Building A"
    }
    response = client.post("/api/v1/geofences", json=geo_payload, headers=HR_HEADERS)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "Headquarters Office"

def test_create_program_and_batch(client):
    prog_payload = {
        "title": "Data Science Traineeship",
        "code": "DS-2026",
        "description": "12-week intensive program",
        "duration_weeks": 12
    }
    p_resp = client.post("/api/v1/programs", json=prog_payload, headers=HR_HEADERS)
    assert p_resp.status_code == 201, p_resp.text
    prog_id = p_resp.json()["id"]

    batch_payload = {
        "program_id": prog_id,
        "name": "Batch DS-1",
        "start_date": "2026-02-01",
        "end_date": "2026-05-01",
        "status": "UPCOMING"
    }
    b_resp = client.post("/api/v1/batches", json=batch_payload, headers=HR_HEADERS)
    assert b_resp.status_code == 201, b_resp.text
    assert b_resp.json()["name"] == "Batch DS-1"

def test_device_registration_and_approval(client):
    dev_payload = {
        "user_id": "usr-student-001",
        "device_fingerprint": "fingerprint-xyz-999",
        "device_model": "iPhone 15 Pro",
        "os_version": "iOS 17.4"
    }
    d_resp = client.post("/api/v1/devices", json=dev_payload, headers=STUDENT_HEADERS)
    assert d_resp.status_code == 201, d_resp.text
    device_id = d_resp.json()["id"]

    appr_resp = client.put(f"/api/v1/devices/{device_id}/approve", json={"approver_id": "usr-hr-001"}, headers=HR_HEADERS)
    assert appr_resp.status_code == 200, appr_resp.text
    assert appr_resp.json()["status"] == "APPROVED"


def test_login_and_logout_capture_location(client):
    # 1. Test Login with location
    login_payload = {
        "email": "student1@netlink.org",
        "password": "default_password",
        "latitude": 23.259933,
        "longitude": 77.412615,
        "accuracy": 12.5
    }
    login_resp = client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200, login_resp.text
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["user"]["last_login_latitude"] == 23.259933
    assert login_data["user"]["last_login_longitude"] == 77.412615
    token = login_data["access_token"]
    user_id = login_data["user"]["id"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Logout with location
    logout_payload = {
        "latitude": 23.260100,
        "longitude": 77.413200,
        "accuracy": 8.0
    }
    logout_resp = client.post("/api/v1/auth/logout", json=logout_payload, headers=headers)
    assert logout_resp.status_code == 200, logout_resp.text
    logout_data = logout_resp.json()
    assert logout_data["captured_location"]["latitude"] == 23.260100
    assert logout_data["captured_location"]["longitude"] == 77.413200

    # 3. Query location logs
    logs_resp = client.get("/api/v1/auth/location-logs", headers=headers)
    assert logs_resp.status_code == 200, logs_resp.text
    logs = logs_resp.json()
    assert len(logs) >= 2
    event_types = [l["event_type"] for l in logs]
    assert "LOGIN" in event_types
    assert "LOGOUT" in event_types
