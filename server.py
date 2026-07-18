import json
import os
import uuid
import urllib.request
import urllib.error
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

def load_db():
    if JSONBIN_API_KEY and JSONBIN_BIN_ID:
        url = f"https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}"
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')
        req.add_header('X-Master-Key', JSONBIN_API_KEY)
        req.add_header('X-Bin-Meta', 'false')
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"Errore caricamento da JSONBin: {e}. Uso fallback locale.")
            
    if not os.path.exists(DB_FILE):
        save_db(DEFAULT_DB)
        return DEFAULT_DB
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_DB

def save_db(data):
    if JSONBIN_API_KEY and JSONBIN_BIN_ID:
        url = f"https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}"
        req = urllib.request.Request(url, method='PUT')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')
        req.add_header('X-Master-Key', JSONBIN_API_KEY)
        req.add_header('Content-Type', 'application/json')
        req.add_header('X-Bin-Meta', 'false')
        
        json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')
        try:
            with urllib.request.urlopen(req, data=json_data, timeout=10) as response:
                return
        except Exception as e:
            print(f"Errore salvataggio su JSONBin: {e}. Salvo localmente.")
            
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

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

        # 2. Create Order: POST /api/orders
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
                "created_at": datetime.utcnow().isoformat() + "Z"
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
        
        # DELETE /api/admin/tables/:id
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
