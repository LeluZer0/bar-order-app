import urllib.request
import json
import os

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

def test_admin_flow():
    print("\n--- Inizio Test API Admin (Su Server Attivo) ---")
    
    # 1. Crea un nuovo tavolo
    status, table = make_request('/api/admin/tables', 'POST', {"name": "Tavolo Test 99"})
    assert status == 201, f"Atteso 201, ottenuto {status}"
    table_id = table['id']
    print(f"[OK] POST /api/admin/tables: Creato tavolo '{table['name']}' con ID {table_id}")
    
    # Verifica che sia presente nell'elenco generale
    status, tables = make_request('/api/tables')
    assert any(t['id'] == table_id for t in tables)
    print("[OK] Verifica tavolo presente nella mappa.")
    
    # 2. Cancella il tavolo di test
    status, res = make_request(f'/api/admin/tables/{table_id}', 'DELETE')
    assert status == 200, f"Atteso 200, ottenuto {status}"
    print(f"[OK] DELETE /api/admin/tables/{table_id}: Tavolo eliminato.")
    
    # Verifica che sia scomparso dall'elenco generale
    status, tables_after = make_request('/api/tables')
    assert not any(t['id'] == table_id for t in tables_after)
    print("[OK] Verifica tavolo rimosso con successo.")

    # 3. Crea una nuova categoria
    cat_payload = {
        "id": "test_cat",
        "name": "Categoria Test",
        "icon": "🧪"
    }
    status, cat = make_request('/api/admin/categories', 'POST', cat_payload)
    assert status == 201
    print(f"[OK] POST /api/admin/categories: Creata categoria '{cat['name']}'")
    
    # 4. Crea un prodotto sotto questa categoria
    prod_payload = {
        "name": "Prodotto Test",
        "category_id": "test_cat",
        "price_cents": 250,
        "customizations": {
            "variants": ["Var1"],
            "add_ons": [{"name": "Add1", "price_cents": 50}]
        }
    }
    status, prod = make_request('/api/admin/products', 'POST', prod_payload)
    assert status == 201
    prod_id = prod['id']
    print(f"[OK] POST /api/admin/products: Creato prodotto '{prod['name']}' con ID '{prod_id}'")
    
    # Verifica presenza nel menu
    status, menu = make_request('/api/menu')
    assert any(c['id'] == 'test_cat' for c in menu['categories'])
    assert any(p['id'] == prod_id for p in menu['products'])
    print("[OK] Verifica categoria e prodotto presenti nel menu.")
    
    # 5. Cancella la categoria A CASCATA
    status, res = make_request('/api/admin/categories/test_cat', 'DELETE')
    assert status == 200
    print("[OK] DELETE /api/admin/categories/test_cat: Cancellazione a cascata eseguita.")
    
    # Verifica che sia la categoria che il prodotto siano stati eliminati
    status, menu_after = make_request('/api/menu')
    assert not any(c['id'] == 'test_cat' for c in menu_after['categories'])
    assert not any(p['id'] == prod_id for p in menu_after['products'])
    print("[OK] Categoria e prodotto a cascata eliminati con successo.")
    
    print("\n--- Tutti i test delle API Admin sono passati con successo! ---")

if __name__ == '__main__':
    test_admin_flow()
