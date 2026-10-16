import urllib.request
import json

# 1. Login
login_data = json.dumps({'email': 'admin@netlink.org'}).encode()
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['access_token']

# 2. Get Students
req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/students?limit=50', headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req2) as resp:
    res = json.loads(resp.read().decode())
    items = res.get('items', [])
    print(f'Retrieved {len(items)} students from API:')
    for s in items:
        batch_name = s.get('batch', {}).get('name') if s.get('batch') else s.get('batch_id')
        user_name = s.get('user', {}).get('full_name') if s.get('user') else 'N/A'
        print(f"  • {s['roll_number']}: {user_name} -> {batch_name} [{s.get('batch_type')}]")
