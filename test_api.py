import urllib.request
import json
import time
import subprocess
import os
import sys

URL_BASE = 'http://localhost:8080'
DB_FILE = 'test_db.json'

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

def test_flow():
    print("\n--- Inizio Test API ---")
    
    # 1. Recupera i Tavoli
    status, tables = make_request('/api/tables')
    assert status == 200, f"Atteso 200, ottenuto {status}"
    print(f"[OK] GET /api/tables: {len(tables)} tavoli recuperati.")
    table1 = next(t for t in tables if t['id'] == 1)
    assert table1['status'] == 'libero', "Tavolo 1 dovrebbe essere libero"
    
    # 2. Recupera il Menu
    status, menu = make_request('/api/menu')
    assert status == 200
    assert len(menu['categories']) > 0
    assert len(menu['products']) > 0
    print("[OK] GET /api/menu: Categorie e prodotti caricati correttamente.")

    # 3. Crea una comanda per il Tavolo 1
    order_payload = {
        "table_id": 1,
        "items": [
            {
                "product_id": "espresso",
                "quantity": 2,
                "customizations": {
                    "variant": "Normale",
                    "add_ons": ["Schiumato"]
                },
                "notes": "un espresso caldo"
            },
            {
                "product_id": "croissant",
                "quantity": 1,
                "customizations": {
                    "variant": "Marmellata"
                }
            }
        ],
        "notes": "Servire insieme al tavolo"
    }
    
    status, order = make_request('/api/orders', 'POST', order_payload)
    assert status == 201
    order_id = order['id']
    print(f"[OK] POST /api/orders: Creato ordine {order_id} per Tavolo 1. Totale: {order['total_amount_cents'] / 100} EUR")
    
    # Verifica che il tavolo sia occupato e collegato all'ordine
    status, tables_after = make_request('/api/tables')
    table1_after = next(t for t in tables_after if t['id'] == 1)
    assert table1_after['status'] == 'occupato'
    assert table1_after['current_order_id'] == order_id
    print("[OK] Stato Tavolo 1 aggiornato a 'occupato' e associato all'ordine.")

    # 4. Ottieni dettagli ordine
    status, order_details = make_request(f'/api/orders/{order_id}')
    assert status == 200
    assert len(order_details['items']) == 2
    print(f"[OK] GET /api/orders/{order_id}: Caricati dettagli ordine con {len(order_details['items'])} elementi.")

    # 4b. Elimina un articolo dall'ordine
    item_to_delete = order_details['items'][0]['id']
    status, delete_res = make_request(f'/api/order-items/{item_to_delete}', 'DELETE')
    assert status == 200
    print(f"[OK] DELETE /api/order-items/{item_to_delete}: Articolo eliminato con successo.")

    # Verifica dettagli ordine aggiornato
    status, order_details_after = make_request(f'/api/orders/{order_id}')
    assert status == 200
    assert len(order_details_after['items']) == 1
    print(f"[OK] GET /api/orders/{order_id} (dopo rimozione): Contiene 1 elemento.")

    # 5. Aggiorna stato ordine in 'completato'
    status, res = make_request(f'/api/orders/{order_id}/status', 'POST', {"status": "completato"})
    assert status == 200
    print("[OK] POST /api/orders/:id/status: Aggiornato a 'completato'.")

    # 6. Effettua checkout (chiusura comanda e liberazione tavolo)
    status, res = make_request(f'/api/orders/{order_id}/checkout', 'POST')
    assert status == 200
    print("[OK] POST /api/orders/:id/checkout: Comanda saldata.")

    # Verifica che il tavolo sia tornato libero
    status, tables_final = make_request('/api/tables')
    table1_final = next(t for t in tables_final if t['id'] == 1)
    assert table1_final['status'] == 'libero'
    assert table1_final['current_order_id'] is None
    print("[OK] Stato Tavolo 1 ripristinato a 'libero'.")
    
    print("\n--- Tutti i test delle API sono passati con successo! ---")

if __name__ == '__main__':
    # Rimuovi file db residuo se esiste
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)

    # Start the server as a subprocess to run tests
    env = os.environ.copy()
    env['DB_FILE_PATH'] = DB_FILE
    server_process = subprocess.Popen([sys.executable, 'server.py'], env=env)
    time.sleep(2)  # Wait for server to start
    
    try:
        test_flow()
    finally:
        server_process.terminate()
        server_process.wait()
        # Clean up db file created during test
        if os.path.exists(DB_FILE):
            os.remove(DB_FILE)
            print("[OK] Database di test rimosso.")
