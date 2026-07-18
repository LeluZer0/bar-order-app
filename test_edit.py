import urllib.request
import json
import time

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

def test_edit_flow():
    print("\n--- Inizio Test API Edit (PUT) ---")
    
    # 1. Modifica nome Tavolo 2
    status, res = make_request('/api/admin/tables/2', 'PUT', {"name": "Tavolo 2 Modificato"})
    assert status == 200, f"Atteso 200, ottenuto {status}"
    assert res['name'] == "Tavolo 2 Modificato"
    print("[OK] PUT /api/admin/tables/2: Nome aggiornato con successo.")
    
    # Verifica ripristinando il nome
    status, res = make_request('/api/admin/tables/2', 'PUT', {"name": "Tavolo 2"})
    assert status == 200
    print("[OK] Ripristinato nome Tavolo 2.")
    
    # 2. Modifica Categoria 'caffetteria'
    status, res = make_request('/api/admin/categories/caffetteria', 'PUT', {"name": "Caffè & Bar", "icon": "☕"})
    assert status == 200
    assert res['name'] == "Caffè & Bar"
    print("[OK] PUT /api/admin/categories/caffetteria: Categoria aggiornata.")
    
    # Ripristina
    status, res = make_request('/api/admin/categories/caffetteria', 'PUT', {"name": "Caffetteria", "icon": "☕"})
    assert status == 200
    print("[OK] Ripristinato nome categoria.")

    # 3. Modifica Prodotto 'espresso'
    prod_payload = {
        "category_id": "caffetteria",
        "name": "Espresso",
        "price_cents": 130, # modica da 120 a 130
        "customizations": {
            "variants": ["Normale", "Ristretto", "Lungo", "Decaffeinato"],
            "add_ons": [
                {"name": "Schiumato", "price_cents": 0},
                {"name": "Corretto", "price_cents": 50},
                {"name": "Latte di Soia", "price_cents": 20}
            ]
        }
    }
    status, res = make_request('/api/admin/products/espresso', 'PUT', prod_payload)
    assert status == 200
    assert res['price_cents'] == 130
    print("[OK] PUT /api/admin/products/espresso: Prezzo prodotto aggiornato a 130 centesimi.")
    
    # Ripristina
    prod_payload["price_cents"] = 120
    status, res = make_request('/api/admin/products/espresso', 'PUT', prod_payload)
    assert status == 200
    print("[OK] Ripristinato prezzo prodotto a 120 centesimi.")
    
    print("\n--- Tutti i test delle API Edit (PUT) passati con successo! ---")

if __name__ == '__main__':
    test_edit_flow()
