import urllib.request
import urllib.error

JSONBIN_BIN_ID = "6a5b3e53da38895dfe6e5028"
JSONBIN_API_KEY = "$2a$10$J31szBBEHC39Ka2lFXYCbu2O3e793uaWSZjiaNL30jSyy/yxKEN.."

url = f"https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}"
req = urllib.request.Request(url)
req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')
req.add_header('X-Master-Key', JSONBIN_API_KEY)
req.add_header('X-Bin-Meta', 'false')

try:
    print("Testing connection to JSONBin.io...")
    with urllib.request.urlopen(req, timeout=10) as response:
        print("Success! Response Code:", response.getcode())
        print("Data preview:")
        print(response.read().decode('utf-8')[:300])
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Connection error:", e)
