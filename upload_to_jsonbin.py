import json
import os
import urllib.request

# Carica le chiavi dal file .env se presente
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split("=", 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip()
                    if val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    elif val.startswith("'") and val.endswith("'"):
                        val = val[1:-1]
                    os.environ[key] = val

api_key = os.environ.get("JSONBIN_API_KEY")
bin_id = os.environ.get("JSONBIN_BIN_ID")

if not api_key or not bin_id:
    print("❌ Errore: JSONBIN_API_KEY o JSONBIN_BIN_ID non configurati nel file .env!")
    print("Assicurati che il file .env esista e contenga le credenziali corrette.")
    exit(1)

if not os.path.exists("db.json"):
    print("❌ Errore: il file db.json locale non esiste!")
    exit(1)

print("🔄 Caricamento del database locale db.json su JSONBin.io in corso...")

try:
    with open("db.json", "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    print(f"❌ Errore nella lettura del file db.json: {e}")
    exit(1)

url = f"https://api.jsonbin.io/v3/b/{bin_id}"
req = urllib.request.Request(url, method='PUT')
req.add_header('X-Master-Key', api_key)
req.add_header('Content-Type', 'application/json')
req.add_header('X-Bin-Meta', 'false')

json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=json_data, timeout=10) as response:
        print("✅ Successo! Il database locale db.json è stato caricato su JSONBin.io ed è ora attivo in cloud.")
except Exception as e:
    print(f"❌ Errore durante l'invio a JSONBin.io: {e}")
