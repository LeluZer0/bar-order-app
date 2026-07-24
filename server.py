import json
import os
import uuid
import urllib.request
import urllib.error
import ssl
import copy
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, HTTPServer

# Prova a caricare da .env locale se esiste
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

PORT = int(os.environ.get('PORT', 8080))
DB_FILE = os.environ.get('DB_FILE_PATH', 'db.json')
JSONBIN_API_KEY = os.environ.get('JSONBIN_API_KEY')
JSONBIN_BIN_ID = os.environ.get('JSONBIN_BIN_ID')

try:
    from seed_menu import NEW_CATEGORIES, NEW_PRODUCTS
except ImportError:
    NEW_CATEGORIES = []
    NEW_PRODUCTS = []

DEFAULT_DB = {
    "tables": [
        {"id": 1, "name": "Tavolo 1", "status": "libero", "current_order_id": None},
        {"id": 2, "name": "Tavolo 2", "status": "libero", "current_order_id": None},
        {"id": 3, "name": "Tavolo 3", "status": "libero", "current_order_id": None},
        {"id": 4, "name": "Tavolo 4", "status": "libero", "current_order_id": None},
        {"id": 5, "name": "Tavolo 5", "status": "libero", "current_order_id": None},
        {"id": 6, "name": "Tavolo 6", "status": "libero", "current_order_id": None},
        {"id": 7, "name": "Tavolo 7", "status": "libero", "current_order_id": None},
        {"id": 8, "name": "Tavolo 8", "status": "libero", "current_order_id": None}
    ],
    "categories": NEW_CATEGORIES,
    "products": NEW_PRODUCTS,
    "orders": {},
    "order_items": {}
}

CACHED_DB = None

def merge_databases(local_db, cloud_db):
    """
    Esegue il merge intelligente di due database (locale e cloud).
    In caso di conflitto, preferisce gli stati ordine più avanzati e unisce le liste ordini.
    """
    if not local_db:
        return copy.deepcopy(cloud_db) if cloud_db else copy.deepcopy(DEFAULT_DB)
    if not cloud_db:
        return copy.deepcopy(local_db)

    # Inizializziamo il database risultante con una copia profonda di quello cloud (struttura di base)
    merged = copy.deepcopy(cloud_db)
    
    # 1. Unione delle categorie (unione per ID)
    cat_map = {c['id']: c for c in merged.get('categories', [])}
    for c in local_db.get('categories', []):
        if c['id'] not in cat_map:
            merged.setdefault('categories', []).append(c)
            
    # 2. Unione dei prodotti (unione per ID)
    prod_map = {p['id']: p for p in merged.get('products', [])}
    for p in local_db.get('products', []):
        if p['id'] not in prod_map:
            merged.setdefault('products', []).append(p)
            
    # 3. Unione e risoluzione conflitti degli ordini
    local_orders = local_db.get('orders', {})
    cloud_orders = cloud_db.get('orders', {})
    all_order_ids = set(local_orders.keys()) | set(cloud_orders.keys())
    
    merged_orders = {}
    for oid in all_order_ids:
        in_local = oid in local_orders
        in_cloud = oid in cloud_orders
        
        if in_local and not in_cloud:
            merged_orders[oid] = copy.deepcopy(local_orders[oid])
        elif in_cloud and not in_local:
            merged_orders[oid] = copy.deepcopy(cloud_orders[oid])
        else:
            # Presente in entrambi. Risolviamo il conflitto
            o_local = local_orders[oid]
            o_cloud = cloud_orders[oid]
            
            # Priorità per stato avanzato: 'pagato' > 'completato' > 'in_preparazione'
            status_priority = {'pagato': 3, 'completato': 2, 'in_preparazione': 1}
            p_local = status_priority.get(o_local.get('status'), 0)
            p_cloud = status_priority.get(o_cloud.get('status'), 0)
            
            # Timestamp di aggiornamento
            up_local = o_local.get('updated_at', o_local.get('created_at', ''))
            up_cloud = o_cloud.get('updated_at', o_cloud.get('created_at', ''))
            
            if p_local > p_cloud:
                merged_orders[oid] = copy.deepcopy(o_local)
            elif p_cloud > p_local:
                merged_orders[oid] = copy.deepcopy(o_cloud)
            elif up_local > up_cloud:
                merged_orders[oid] = copy.deepcopy(o_local)
            else:
                merged_orders[oid] = copy.deepcopy(o_cloud)
                
    merged['orders'] = merged_orders

    # 4. Unione degli elementi dell'ordine (order_items)
    local_items = local_db.get('order_items', {})
    cloud_items = cloud_db.get('order_items', {})
    all_item_ids = set(local_items.keys()) | set(cloud_items.keys())
    
    merged_items = {}
    for iid in all_item_ids:
        item = local_items.get(iid) or cloud_items.get(iid)
        order_id = item.get('order_id')
        if order_id in merged_orders:
            # Se presente in entrambi, preferiamo quello locale se l'ordine finale corrisponde a quello locale
            if order_id in local_orders and merged_orders[order_id] == local_orders[order_id] and iid in local_items:
                merged_items[iid] = copy.deepcopy(local_items[iid])
            else:
                merged_items[iid] = copy.deepcopy(cloud_items.get(iid) or local_items.get(iid))
                
    merged['order_items'] = merged_items
    
    # 5. Unione dei tavoli
    tables_map = {t['id']: t for t in cloud_db.get('tables', [])}
    for t in local_db.get('tables', []):
        if t['id'] not in tables_map:
            tables_map[t['id']] = copy.deepcopy(t)
            
    # Sincronizzazione degli stati dei tavoli in base agli ordini attivi reali (non pagati)
    active_orders = {oid: o for oid, o in merged_orders.items() if o.get('status') != 'pagato'}
    table_to_active_order = {o.get('table_id'): oid for oid, o in active_orders.items()}
    
    tables = list(tables_map.values())
    for t in tables:
        tid = t['id']
        if tid in table_to_active_order:
            t['status'] = 'occupato'
            t['current_order_id'] = table_to_active_order[tid]
        else:
            t['status'] = 'libero'
            t['current_order_id'] = None
            
    merged['tables'] = tables
    return merged

def make_jsonbin_request(url, req_method='GET', data=None):
    """
    Esegue una richiesta HTTP a JSONBin.io con gestione degli errori HTTP e SSL.
    Se si verifica un errore CERTIFICATE_VERIFY_FAILED, tenta il fallback senza verifica SSL.
    """
    req = urllib.request.Request(url, method=req_method)
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')
    req.add_header('X-Master-Key', JSONBIN_API_KEY)
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-Bin-Meta', 'false')
    if req_method == 'PUT':
        req.add_header('X-Bin-Versioning', 'true')

    json_data = json.dumps(data, ensure_ascii=False).encode('utf-8') if data is not None else None

    try:
        with urllib.request.urlopen(req, data=json_data, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as he:
        body = he.read().decode('utf-8')
        print(f"[JSONBin] Errore HTTP {he.code}: {he.reason}\nDettagli risposta: {body}")
        raise he
    except urllib.error.URLError as ue:
        # Controlliamo se l'errore è dovuto alla verifica del certificato SSL
        if hasattr(ue, 'reason') and 'CERTIFICATE_VERIFY_FAILED' in str(ue.reason):
            print("[JSONBin] Rilevato errore SSL (CERTIFICATE_VERIFY_FAILED). Tento fallback senza verifica SSL...")
            try:
                ctx = ssl._create_unverified_context()
                with urllib.request.urlopen(req, data=json_data, timeout=10, context=ctx) as response:
                    return json.loads(response.read().decode('utf-8'))
            except Exception as ex:
                print(f"[JSONBin] Fallback SSL fallito: {ex}")
                raise ex
        else:
            print(f"[JSONBin] Errore di connessione: {ue}")
            raise ue
    except Exception as e:
        print(f"[JSONBin] Errore generico: {e}")
        raise e

def load_db():
    global CACHED_DB
    if CACHED_DB is not None:
        return CACHED_DB

    # 1. Carica da cloud (se configurato)
    cloud_db = None
    if JSONBIN_API_KEY and JSONBIN_BIN_ID:
        url = f"https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}"
        try:
            cloud_db = make_jsonbin_request(url, 'GET')
            print("[JSONBin] Database caricato da JSONBin.io con successo.")
        except Exception as e:
            print(f"[JSONBin] Errore caricamento da JSONBin. Uso fallback locale. Dettaglio: {e}")
            
    # 2. Carica da locale
    local_db = None
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                local_db = json.load(f)
                print("[Local] Database locale caricato con successo.")
        except Exception as e:
            print(f"[Local] Errore lettura db.json locale: {e}.")

    # 3. Esegui il merge e salva il risultato
    if cloud_db and local_db:
        print("[System] Avvio merge intelligente tra database locale e cloud...")
        merged_db = merge_databases(local_db, cloud_db)
        # Sincronizziamo subito sia in locale che in cloud per riallinearli
        CACHED_DB = merged_db
        save_db(merged_db)
        return CACHED_DB
    elif cloud_db:
        CACHED_DB = cloud_db
        save_db_local_only(cloud_db)
        return CACHED_DB
    elif local_db:
        CACHED_DB = local_db
        save_db_cloud_only(local_db)
        return CACHED_DB
    else:
        CACHED_DB = DEFAULT_DB
        save_db(DEFAULT_DB)
        return DEFAULT_DB

def save_db(data):
    global CACHED_DB
    CACHED_DB = data  # Aggiorna sempre la cache in memoria prima di tutto
    save_db_local_only(data)
    if JSONBIN_API_KEY and JSONBIN_BIN_ID:
        save_db_cloud_only(data)

def save_db_local_only(data):
    try:
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            print("[Local] Modifiche salvate localmente su db.json.")
    except Exception as e:
        print(f"[Local] Errore salvataggio locale: {e}")

def save_db_cloud_only(data):
    url = f"https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}"
    try:
        make_jsonbin_request(url, 'PUT', data)
        print("[JSONBin] Modifiche persistite su JSONBin.io (nuova versione creata).")
    except Exception as e:
        print(f"[JSONBin] Errore salvataggio su JSONBin: {e}.")


class BarRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_get()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.handle_api_post()
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self.handle_api_delete()
        else:
            self.send_error(404, "Not Found")

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self.handle_api_put()
        else:
            self.send_error(404, "Not Found")

    def handle_api_get(self):
        db = load_db()
        
        if self.path == '/api/tables':
            tables = db.get('tables', [])
            orders = db.get('orders', {})
            result = []
            for table in tables:
                table_copy = table.copy()
                order_id = table.get('current_order_id')
                if order_id and order_id in orders:
                    table_copy['current_order_amount_cents'] = orders[order_id].get('total_amount_cents', 0)
                else:
                    table_copy['current_order_amount_cents'] = 0
                result.append(table_copy)
            self.send_json_response(200, result)
            
        elif self.path == '/api/debug-db':
            self.handle_api_debug_db()

        elif self.path == '/api/menu':
            menu_data = {
                "categories": db['categories'],
                "products": db['products']
            }
            self.send_json_response(200, menu_data)
            
        elif self.path == '/api/orders':
            orders = db.get('orders', {})
            order_items = db.get('order_items', {})
            result = []
            for order_id, order in orders.items():
                items = [item for item in order_items.values() if item.get('order_id') == order_id]
                order_copy = order.copy()
                order_copy['items'] = items
                result.append(order_copy)
            result.sort(key=lambda x: x.get('created_at', ''))
            self.send_json_response(200, result)

        elif self.path.startswith('/api/orders/'):
            order_id = self.path.split('/')[-1]
            orders = db.get('orders', {})
            if order_id in orders:
                order = orders[order_id].copy()
                order_items = db.get('order_items', {})
                items = [item for item in order_items.values() if item.get('order_id') == order_id]
                order['items'] = items
                self.send_json_response(200, order)
            else:
                self.send_json_response(404, {"error": "Ordine non trovato"})
        else:
            self.send_json_response(404, {"error": "Endpoint non trovato"})

    def handle_api_debug_db(self):
        info = {
            "JSONBIN_API_KEY_present": JSONBIN_API_KEY is not None,
            "JSONBIN_API_KEY_length": len(JSONBIN_API_KEY) if JSONBIN_API_KEY else 0,
            "JSONBIN_BIN_ID_present": JSONBIN_BIN_ID is not None,
            "JSONBIN_BIN_ID_length": len(JSONBIN_BIN_ID) if JSONBIN_BIN_ID else 0,
            "test_connection": None
        }
        
        if JSONBIN_API_KEY and JSONBIN_BIN_ID:
            url = f"https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}"
            try:
                res = make_jsonbin_request(url, 'GET')
                info["test_connection"] = {
                    "status": "success",
                    "data_keys": list(res.keys()) if isinstance(res, dict) else type(res).__name__
                }
            except Exception as e:
                import traceback
                info["test_connection"] = {
                    "status": "error",
                    "error_class": type(e).__name__,
                    "error_message": str(e),
                    "traceback": traceback.format_exc()
                }
        else:
            info["test_connection"] = {
                "status": "skipped",
                "reason": "Missing env variables (check JSONBIN_API_KEY and JSONBIN_BIN_ID)"
            }
            
        self.send_json_response(200, info)

    def handle_api_post(self):
        db = load_db()
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            self.send_json_response(400, {"error": "Payload JSON non valido"})
            return

        # 1. Update Table Status: POST /api/tables/:id/status
        if self.path.startswith('/api/tables/') and self.path.endswith('/status'):
            parts = self.path.split('/')
            try:
                table_id = int(parts[3])
            except ValueError:
                self.send_json_response(400, {"error": "ID Tavolo non valido"})
                return

            status = payload.get('status')
            if status not in ['libero', 'occupato', 'in_chiusura']:
                self.send_json_response(400, {"error": "Stato non valido. Usa 'libero', 'occupato' o 'in_chiusura'"})
                return

            table_found = False
            for table in db['tables']:
                if table['id'] == table_id:
                    table['status'] = status
                    if status == 'libero':
                        table['current_order_id'] = None
                    table_found = True
                    break

            if table_found:
                save_db(db)
                self.send_json_response(200, {"success": True, "message": f"Stato tavolo {table_id} aggiornato a '{status}'"})
            else:
                self.send_json_response(404, {"error": "Tavolo non trovato"})

        # 2. Create or Append Order: POST /api/orders
        elif self.path == '/api/orders':
            table_id = payload.get('table_id')
            items = payload.get('items', [])
            notes = payload.get('notes', '')

            # Validate table
            table_ref = None
            for table in db['tables']:
                if table['id'] == table_id:
                    table_ref = table
                    break

            if not table_ref:
                self.send_json_response(404, {"error": "Tavolo non trovato"})
                return

            if not items:
                self.send_json_response(400, {"error": "L'ordine deve contenere almeno un articolo"})
                return

            existing_order_id = table_ref.get('current_order_id')
            existing_order = db.get('orders', {}).get(existing_order_id) if existing_order_id else None

            if existing_order and existing_order['status'] != 'pagato':
                # Appendi i prodotti all'ordine esistente del tavolo occupato
                order_id = existing_order['id']
                total_cents = 0
                processed_items = []
                
                # Conta gli articoli esistenti per generare ID univoci e non conflittuali
                existing_items_count = sum(1 for item in db.get('order_items', {}).values() if item.get('order_id') == order_id)

                for index, item in enumerate(items):
                    prod_id = item.get('product_id')
                    quantity = item.get('quantity', 1)
                    item_notes = item.get('notes', '')
                    chosen_customs = item.get('customizations', {})

                    product = next((p for p in db['products'] if p['id'] == prod_id), None)
                    if not product:
                        self.send_json_response(404, {"error": f"Prodotto '{prod_id}' non trovato"})
                        return

                    unit_price = product['price_cents']
                    add_ons = chosen_customs.get('add_ons', [])
                    for add_on_name in add_ons:
                        add_on_def = next((a for a in product['customizations'].get('add_ons', []) if a['name'] == add_on_name), None)
                        if add_on_def:
                            unit_price += add_on_def['price_cents']

                    item_total = unit_price * quantity
                    total_cents += item_total

                    item_id = f"item_{order_id}_{existing_items_count + index}_{uuid.uuid4().hex[:4]}"
                    order_item = {
                        "id": item_id,
                        "order_id": order_id,
                        "product_id": prod_id,
                        "name": product['name'],
                        "quantity": quantity,
                        "unit_price_cents": unit_price,
                        "customizations": chosen_customs,
                        "notes": item_notes
                    }
                    processed_items.append(order_item)

                for oi in processed_items:
                    db['order_items'][oi['id']] = oi

                existing_order['total_amount_cents'] += total_cents
                
                if notes:
                    if existing_order.get('notes'):
                        existing_order['notes'] += f" | {notes}"
                    else:
                        existing_order['notes'] = notes
                
                # Rimetti lo stato in 'in_preparazione' per far vedere l'ordine aggiornato
                existing_order['status'] = 'in_preparazione'
                existing_order['updated_at'] = datetime.utcnow().isoformat() + "Z"
                
                # Forza lo stato tavolo a occupato
                table_ref['status'] = 'occupato'

                save_db(db)

                response_data = existing_order.copy()
                all_items = [item for item in db.get('order_items', {}).values() if item.get('order_id') == order_id]
                response_data['items'] = all_items
                self.send_json_response(200, response_data)
                return

            total_cents = 0
            order_id = f"ord_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:4]}"
            processed_items = []

            for index, item in enumerate(items):
                prod_id = item.get('product_id')
                quantity = item.get('quantity', 1)
                item_notes = item.get('notes', '')
                chosen_customs = item.get('customizations', {})

                product = next((p for p in db['products'] if p['id'] == prod_id), None)
                if not product:
                    self.send_json_response(404, {"error": f"Prodotto '{prod_id}' non trovato"})
                    return

                unit_price = product['price_cents']
                add_ons = chosen_customs.get('add_ons', [])
                for add_on_name in add_ons:
                    add_on_def = next((a for a in product['customizations'].get('add_ons', []) if a['name'] == add_on_name), None)
                    if add_on_def:
                        unit_price += add_on_def['price_cents']

                item_total = unit_price * quantity
                total_cents += item_total

                item_id = f"item_{order_id}_{index}"
                order_item = {
                    "id": item_id,
                    "order_id": order_id,
                    "product_id": prod_id,
                    "name": product['name'],
                    "quantity": quantity,
                    "unit_price_cents": unit_price,
                    "customizations": chosen_customs,
                    "notes": item_notes
                }
                processed_items.append(order_item)

            for oi in processed_items:
                db['order_items'][oi['id']] = oi

            new_order = {
                "id": order_id,
                "table_id": table_id,
                "status": "in_preparazione",
                "total_amount_cents": total_cents,
                "notes": notes,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
            db['orders'][order_id] = new_order

            table_ref['status'] = 'occupato'
            table_ref['current_order_id'] = order_id

            save_db(db)
            
            response_data = new_order.copy()
            response_data['items'] = processed_items
            self.send_json_response(201, response_data)

        # 3. Update Order Status: POST /api/orders/:id/status
        elif self.path.startswith('/api/orders/') and self.path.endswith('/status'):
            parts = self.path.split('/')
            order_id = parts[3]
            orders = db.get('orders', {})

            if order_id not in orders:
                self.send_json_response(404, {"error": "Ordine non trovato"})
                return

            status = payload.get('status')
            if status not in ['in_preparazione', 'completato', 'pagato']:
                self.send_json_response(400, {"error": "Stato ordine non valido"})
                return

            orders[order_id]['status'] = status
            orders[order_id]['updated_at'] = datetime.utcnow().isoformat() + "Z"
            save_db(db)
            self.send_json_response(200, {"success": True, "message": f"Stato ordine {order_id} aggiornato a '{status}'"})

        # 4. Checkout / Close Order: POST /api/orders/:id/checkout
        elif self.path.startswith('/api/orders/') and self.path.endswith('/checkout'):
            parts = self.path.split('/')
            order_id = parts[3]
            orders = db.get('orders', {})

            if order_id not in orders:
                self.send_json_response(404, {"error": "Ordine non trovato"})
                return

            order = orders[order_id]
            order['status'] = 'pagato'
            order['updated_at'] = datetime.utcnow().isoformat() + "Z"

            table_id = order['table_id']
            for table in db['tables']:
                if table['id'] == table_id:
                    table['status'] = 'libero'
                    table['current_order_id'] = None
                    break

            save_db(db)
            self.send_json_response(200, {"success": True, "message": f"Ordine {order_id} saldato. Tavolo {table_id} liberato."})

        # 5. Admin: POST /api/admin/tables
        elif self.path == '/api/admin/tables':
            name = payload.get('name')
            if not name:
                self.send_json_response(400, {"error": "Nome tavolo mancante"})
                return
            
            next_id = max([t['id'] for t in db['tables']]) + 1 if db['tables'] else 1
            new_table = {"id": next_id, "name": name, "status": "libero", "current_order_id": None}
            db['tables'].append(new_table)
            save_db(db)
            self.send_json_response(201, new_table)

        # 6. Admin: POST /api/admin/categories
        elif self.path == '/api/admin/categories':
            cat_id = payload.get('id')
            name = payload.get('name')
            icon = payload.get('icon', '📁')

            if not cat_id or not name:
                self.send_json_response(400, {"error": "ID e Nome categoria richiesti"})
                return

            if any(c['id'] == cat_id for c in db['categories']):
                self.send_json_response(400, {"error": f"L'ID Categoria '{cat_id}' esiste già"})
                return

            new_cat = {"id": cat_id, "name": name, "icon": icon}
            db['categories'].append(new_cat)
            save_db(db)
            self.send_json_response(201, new_cat)

        # 7. Admin: POST /api/admin/products
        elif self.path == '/api/admin/products':
            prod_id = payload.get('id')
            category_id = payload.get('category_id')
            name = payload.get('name')
            price_cents = payload.get('price_cents')
            customizations = payload.get('customizations', {"variants": [], "add_ons": []})

            if not category_id or not name or price_cents is None:
                self.send_json_response(400, {"error": "Categoria, Nome e Prezzo richiesti"})
                return

            if not any(c['id'] == category_id for c in db['categories']):
                self.send_json_response(400, {"error": f"La categoria '{category_id}' non esiste"})
                return

            if not prod_id:
                prod_id = name.lower().replace(" ", "_")
                if any(p['id'] == prod_id for p in db['products']):
                    prod_id = f"{prod_id}_{uuid.uuid4().hex[:4]}"
            else:
                if any(p['id'] == prod_id for p in db['products']):
                    self.send_json_response(400, {"error": f"L'ID Prodotto '{prod_id}' esiste già"})
                    return

            new_prod = {
                "id": prod_id,
                "category_id": category_id,
                "name": name,
                "price_cents": int(price_cents),
                "customizations": customizations
            }
            db['products'].append(new_prod)
            save_db(db)
            self.send_json_response(201, new_prod)

        else:
            self.send_json_response(404, {"error": "Endpoint non trovato"})

    def handle_api_delete(self):
        db = load_db()
        
        # DELETE /api/order-items/:id
        if self.path.startswith('/api/order-items/'):
            parts = self.path.split('/')
            try:
                item_id = parts[3]
            except IndexError:
                self.send_json_response(400, {"error": "ID elemento non valido"})
                return

            order_items = db.get('order_items', {})
            if item_id not in order_items:
                self.send_json_response(404, {"error": "Elemento ordine non trovato"})
                return

            item = order_items[item_id]
            order_id = item['order_id']
            orders = db.get('orders', {})
            
            # Calcola il decremento
            item_total = item.get('unit_price_cents', 0) * item.get('quantity', 1)

            # Rimuovi l'elemento
            del order_items[item_id]

            if order_id in orders:
                order = orders[order_id]
                order['total_amount_cents'] = max(0, order['total_amount_cents'] - item_total)
                order['updated_at'] = datetime.utcnow().isoformat() + "Z"
                
                # Controlla se l'ordine ha ancora elementi
                remaining_items = [oi for oi in order_items.values() if oi.get('order_id') == order_id]
                if not remaining_items:
                    # Se non ci sono più elementi, cancella l'ordine ed esegui il checkout/libera il tavolo
                    table_id = order.get('table_id')
                    for table in db['tables']:
                        if table['id'] == table_id:
                            table['status'] = 'libero'
                            table['current_order_id'] = None
                            break
                    del db['orders'][order_id]
                    message = "L'ordine è vuoto ed è stato eliminato. Il tavolo è stato liberato."
                else:
                    message = f"Elemento rimosso dall'ordine. Nuovo totale: {order['total_amount_cents'] / 100} €"
            else:
                message = "Elemento rimosso."

            save_db(db)
            self.send_json_response(200, {"success": True, "message": message})

        # DELETE /api/admin/tables/:id
        elif self.path.startswith('/api/admin/tables/'):
            parts = self.path.split('/')
            try:
                table_id = int(parts[4])
            except (ValueError, IndexError):
                self.send_json_response(400, {"error": "ID Tavolo non valido"})
                return

            table = next((t for t in db['tables'] if t['id'] == table_id), None)
            if not table:
                self.send_json_response(404, {"error": "Tavolo non trovato"})
                return

            if table['status'] != 'libero':
                self.send_json_response(400, {"error": "Impossibile eliminare un tavolo occupato o in chiusura"})
                return

            db['tables'] = [t for t in db['tables'] if t['id'] != table_id]
            save_db(db)
            self.send_json_response(200, {"success": True, "message": f"Tavolo {table_id} eliminato"})

        # DELETE /api/admin/categories/:id
        elif self.path.startswith('/api/admin/categories/'):
            parts = self.path.split('/')
            try:
                cat_id = parts[4]
            except IndexError:
                self.send_json_response(400, {"error": "ID Categoria non valido"})
                return
            
            category = next((c for c in db['categories'] if c['id'] == cat_id), None)
            if not category:
                self.send_json_response(404, {"error": "Categoria non trovata"})
                return

            # Cascade: delete category and products
            db['categories'] = [c for c in db['categories'] if c['id'] != cat_id]
            db['products'] = [p for p in db['products'] if p['category_id'] != cat_id]
            save_db(db)
            self.send_json_response(200, {"success": True, "message": f"Categoria '{cat_id}' e i suoi prodotti eliminati"})

        # DELETE /api/admin/products/:id
        elif self.path.startswith('/api/admin/products/'):
            parts = self.path.split('/')
            try:
                prod_id = parts[4]
            except IndexError:
                self.send_json_response(400, {"error": "ID Prodotto non valido"})
                return

            product = next((p for p in db['products'] if p['id'] == prod_id), None)
            if not product:
                self.send_json_response(404, {"error": "Prodotto non trovato"})
                return

            db['products'] = [p for p in db['products'] if p['id'] != prod_id]
            save_db(db)
            self.send_json_response(200, {"success": True, "message": f"Prodotto '{prod_id}' eliminato"})

        else:
            self.send_json_response(404, {"error": "Endpoint non trovato"})

    def handle_api_put(self):
        db = load_db()
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            payload = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            self.send_json_response(400, {"error": "Payload JSON non valido"})
            return

        # PUT /api/admin/tables/:id
        if self.path.startswith('/api/admin/tables/'):
            parts = self.path.split('/')
            try:
                table_id = int(parts[4])
            except (ValueError, IndexError):
                self.send_json_response(400, {"error": "ID Tavolo non valido"})
                return

            table = next((t for t in db['tables'] if t['id'] == table_id), None)
            if not table:
                self.send_json_response(404, {"error": "Tavolo non trovato"})
                return

            name = payload.get('name')
            if not name:
                self.send_json_response(400, {"error": "Nome tavolo mancante"})
                return

            table['name'] = name
            save_db(db)
            self.send_json_response(200, table)

        # PUT /api/admin/categories/:id
        elif self.path.startswith('/api/admin/categories/'):
            parts = self.path.split('/')
            try:
                cat_id = parts[4]
            except IndexError:
                self.send_json_response(400, {"error": "ID Categoria non valido"})
                return

            category = next((c for c in db['categories'] if c['id'] == cat_id), None)
            if not category:
                self.send_json_response(404, {"error": "Categoria non trovata"})
                return

            name = payload.get('name')
            icon = payload.get('icon')

            if not name or not icon:
                self.send_json_response(400, {"error": "Nome e Icona richiesti"})
                return

            category['name'] = name
            category['icon'] = icon
            save_db(db)
            self.send_json_response(200, category)

        # PUT /api/admin/products/:id
        elif self.path.startswith('/api/admin/products/'):
            parts = self.path.split('/')
            try:
                prod_id = parts[4]
            except IndexError:
                self.send_json_response(400, {"error": "ID Prodotto non valido"})
                return

            product = next((p for p in db['products'] if p['id'] == prod_id), None)
            if not product:
                self.send_json_response(404, {"error": "Prodotto non trovato"})
                return

            category_id = payload.get('category_id')
            name = payload.get('name')
            price_cents = payload.get('price_cents')
            customizations = payload.get('customizations', {"variants": [], "add_ons": []})

            if not category_id or not name or price_cents is None:
                self.send_json_response(400, {"error": "Categoria, Nome e Prezzo richiesti"})
                return

            if not any(c['id'] == category_id for c in db['categories']):
                self.send_json_response(400, {"error": f"La categoria '{category_id}' non esiste"})
                return

            product['category_id'] = category_id
            product['name'] = name
            product['price_cents'] = int(price_cents)
            product['customizations'] = customizations
            
            save_db(db)
            self.send_json_response(200, product)

        else:
            self.send_json_response(404, {"error": "Endpoint non trovato"})

    def send_json_response(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

if __name__ == '__main__':
    load_db()
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, BarRequestHandler)
    print(f"Server per la presa comande avviato su http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nArresto del server...")
