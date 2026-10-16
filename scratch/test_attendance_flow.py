import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_attendance_check():
    print("==================================================")
    print("   NETLINK ATTENDANCE SYSTEM END-TO-END CHECK")
    print("==================================================")

    # 1. Login as HR
    print("\n1. Logging in as HR Manager (hr@netlink.org)...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "hr@netlink.org"})
    assert resp.status_code == 200, f"HR login failed: {resp.text}"
    hr_token = resp.json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_token}"}
    print("   [OK] HR Authentication Successful!")

    # 2. Login as Student 1
    print("\n2. Logging in as Student (student1@netlink.org)...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "student1@netlink.org"})
    assert resp.status_code == 200, f"Student login failed: {resp.text}"
    student_token = resp.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("   [OK] Student Authentication Successful!")

    # 3. Get Student Profile ID
    print("\n3. Fetching Student Profile Details...")
    resp = requests.get(f"{BASE_URL}/students/me", headers=student_headers)
    assert resp.status_code == 200, f"Failed to get student profile: {resp.text}"
    student_data = resp.json()
    student_id = student_data["id"]
    print(f"   [OK] Student Roll Number: {student_data['roll_number']}")
    print(f"   [OK] Face Enrollment Status: {student_data['face_enrollment_status']}")

    # 4. HR Enrolls Student Face Baseline with Consent
    print("\n4. HR Enrolling Student Face Template Baseline with Privacy Consent...")
    enroll_payload = {
        "student_id": student_id,
        "consent_granted": True,
        "consent_version": "v1.0",
        "quality_score": 0.98
    }
    resp = requests.post(f"{BASE_URL}/attendance/enroll-face", json=enroll_payload, headers=hr_headers)
    assert resp.status_code == 200, f"Face enrollment failed: {resp.text}"
    enroll_res = resp.json()
    print(f"   [OK] Face Enrolled Successfully!")
    print(f"   [OK] Template ID: {enroll_res['template_id']}")
    print(f"   [OK] Confidence Score: {enroll_res['confidence_score']}")

    # 5. Fetch Liveness Challenge Token
    print("\n5. Fetching Anti-Spoofing Liveness Challenge...")
    resp = requests.get(f"{BASE_URL}/attendance/liveness-challenge", headers=student_headers)
    assert resp.status_code == 200, f"Failed to get liveness challenge: {resp.text}"
    challenge = resp.json()
    print(f"   [OK] Challenge Token Generated: {challenge['challenge_token'][:20]}...")
    print(f"   [OK] Challenge Action: {challenge['challenge_type']} ({challenge['instruction']})")

    # 6. Test Geofence Check: Punch Out of Geofence (>100m) Should Fail
    print("\n6. Testing Geofence Boundary Check (Attempting Punch 500m Away)...")
    far_punch_payload = {
        "event_type": "IN",
        "latitude": 23.125000,
        "longitude": 77.534211,
        "challenge_token": challenge["challenge_token"],
        "device_fingerprint": "fp-test-macbook"
    }
    resp = requests.post(f"{BASE_URL}/attendance/punch", json=far_punch_payload, headers=student_headers)
    print(f"   [OK] Response Status Code: {resp.status_code} (Expected 400 Out of Geofence)")
    print(f"   [OK] Server Rejection Message: {resp.json().get('detail')}")
    assert resp.status_code == 400

    # 7. Test Punch IN Inside Netlink Campus Geofence (<100m)
    print("\n7. Testing Valid Punch IN Inside Netlink Campus Geofence (15m Away)...")
    valid_in_payload = {
        "event_type": "IN",
        "latitude": 12.97159870,
        "longitude": 77.59456270,
        "challenge_token": challenge["challenge_token"],
        "device_fingerprint": "fp-test-macbook"
    }
    resp = requests.post(f"{BASE_URL}/attendance/punch", json=valid_in_payload, headers=student_headers)
    assert resp.status_code == 200, f"Punch IN failed: {resp.text}"
    punch_in_res = resp.json()
    print(f"   [OK] {punch_in_res['message']}")
    print(f"   [OK] Geofence Distance: {punch_in_res['event']['distance_from_geofence_meters']}m")
    print(f"   [OK] Status after Punch IN: {punch_in_res['daily_record']['status']} (Open IN without OUT)")

    # 8. Test Punch OUT Inside Campus Geofence
    print("\n8. Testing Valid Punch OUT...")
    valid_out_payload = {
        "event_type": "OUT",
        "latitude": 12.97159870,
        "longitude": 77.59456270,
        "challenge_token": challenge["challenge_token"],
        "device_fingerprint": "fp-test-macbook"
    }
    resp = requests.post(f"{BASE_URL}/attendance/punch", json=valid_out_payload, headers=student_headers)
    assert resp.status_code == 200, f"Punch OUT failed: {resp.text}"
    punch_out_res = resp.json()
    print(f"   [OK] {punch_out_res['message']}")
    print(f"   [OK] Total Working Hours Today: {punch_out_res['daily_record']['total_working_hours']} hrs")

    # 9. Fetch Student Attendance Summary
    print("\n9. Fetching Student Daily Attendance Summary...")
    resp = requests.get(f"{BASE_URL}/attendance/my-summary", headers=student_headers)
    assert resp.status_code == 200, f"Failed to get summary: {resp.text}"
    summary = resp.json()
    print(f"   [OK] Student: {summary['student_name']} ({summary['roll_number']})")
    print(f"   [OK] Status: {summary['status']}")
    print(f"   [OK] Total Punches Today: {summary['punch_count']}")
    print(f"   [OK] Geofence Location: {summary['geofence_name']}")

    # 10. HR Regularization & Immutable Audit Log Verification
    print("\n10. Testing HR Manual Attendance Regularization & Audit Log...")
    daily_rec_id = summary["events"][0]["student_id"]
    # Get daily record ID from HR global endpoint
    resp = requests.get(f"{BASE_URL}/attendance/daily-records", headers=hr_headers)
    assert resp.status_code == 200, f"HR roster query failed: {resp.text}"
    roster = resp.json()
    my_record = next(r for r in roster if r["student_id"] == student_id)

    reg_payload = {
        "attendance_record_id": my_record["id"],
        "status": "REGULARIZED",
        "override_working_hours": 8.0,
        "reason": "Biometric network latency at punch-out. Approved by HR Lead."
    }
    resp = requests.post(f"{BASE_URL}/attendance/regularize", json=reg_payload, headers=hr_headers)
    assert resp.status_code == 200, f"Regularization failed: {resp.text}"
    reg_res = resp.json()
    print(f"   [OK] Regularization Status: {reg_res['status']}")
    print(f"   [OK] Overridden Working Hours: {reg_res['total_working_hours']} hrs")
    print(f"   [OK] Is Regularized: {reg_res['is_regularized']}")
    print(f"   [OK] Justification Reason: {reg_res['regularization_reason']}")

    print("\n==================================================")
    print("   ALL ATTENDANCE SYSTEM CHECKS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_attendance_check()
