import urllib.request
import json

URL_BASE = 'http://localhost:8080'

def make_request(path, method='GET', data=None):
    url = f"{URL_BASE}{path}"
    headers = {'Content-Type': 'application/json'}
    req_data = json.dumps(data).encode('utf-8') if data else None
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        print(f"HTTP Error {e.code}: {res_body}")
        return e.code, json.loads(res_body) if res_body else {}

def test_direct():
    print("Testing running server directly...")
    
    # Check tables
    status, tables = make_request('/api/tables')
    print(f"Tables status: {status}, count: {len(tables)}")
    
    # Try POST
    status, table = make_request('/api/admin/tables', 'POST', {"name": "Tavolo Test Direct"})
    print(f"POST /api/admin/tables status: {status}, response: {table}")

if __name__ == '__main__':
    test_direct()
