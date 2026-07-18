import json
import os

DB_FILE = 'db.json'

NEW_CATEGORIES = [
    {"id": "whisky", "name": "Whisky e Vini", "icon": "🥃"},
    {"id": "cocktail", "name": "Cocktail", "icon": "🍹"},
    {"id": "bibite", "name": "Bibite", "icon": "🥤"},
    {"id": "birre", "name": "Birre", "icon": "🍺"},
    {"id": "amari", "name": "Amari", "icon": "🥃"},
    {"id": "gelati", "name": "Gelati della Casa", "icon": "🍨"},
    {"id": "caffetteria", "name": "Caffetteria", "icon": "☕"},
    {"id": "patatine", "name": "Patatine", "icon": "🍿"}
]

NEW_PRODUCTS = [
    # Whisky & Vini (Cat 1)
    {
        "id": "jack_daniels",
        "category_id": "whisky",
        "name": "Jack Daniel's",
        "price_cents": 400,
        "customizations": {"variants": ["Liscio", "Con Ghiaccio"], "add_ons": []}
    },
    {
        "id": "grappa_903",
        "category_id": "whisky",
        "name": "Grappa 903",
        "price_cents": 250,
        "customizations": {"variants": ["Bianca", "Barrique"], "add_ons": []}
    },
    {
        "id": "grappa_segnana",
        "category_id": "whisky",
        "name": "Grappa Segnana",
        "price_cents": 300,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },
    {
        "id": "prosecco",
        "category_id": "whisky",
        "name": "Prosecco",
        "price_cents": 200,
        "customizations": {"variants": ["Calice", "Bottiglia"], "add_ons": []}
    },

    # Cocktail (Cat 2)
    {
        "id": "tris_vodka",
        "category_id": "cocktail",
        "name": "Tris Vodka",
        "price_cents": 400,
        "customizations": {"variants": ["Pesca", "Melone", "Fragola"], "add_ons": []}
    },
    {
        "id": "cuba_libre",
        "category_id": "cocktail",
        "name": "Cuba Libre",
        "price_cents": 400,
        "customizations": {"variants": ["Havana 7", "Havana 3"], "add_ons": [{"name": "Lime Extra", "price_cents": 20}]}
    },
    {
        "id": "gin_lemon",
        "category_id": "cocktail",
        "name": "Gin Lemon",
        "price_cents": 400,
        "customizations": {"variants": ["Bombay", "Base"], "add_ons": [{"name": "Fetta Limone", "price_cents": 0}]}
    },
    {
        "id": "gin_tonic",
        "category_id": "cocktail",
        "name": "Gin Tonic",
        "price_cents": 400,
        "customizations": {"variants": ["Bombay", "Base"], "add_ons": [{"name": "Fetta Limone", "price_cents": 0}]}
    },
    {
        "id": "negrone",
        "category_id": "cocktail",
        "name": "Negrone",
        "price_cents": 350,
        "customizations": {"variants": ["Classico", "Sbagliato"], "add_ons": []}
    },
    {
        "id": "whisky_coca",
        "category_id": "cocktail",
        "name": "Whisky e Coca",
        "price_cents": 400,
        "customizations": {"variants": ["Jack Daniel's", "Red Label"], "add_ons": []}
    },
    {
        "id": "spriz",
        "category_id": "cocktail",
        "name": "Spriz",
        "price_cents": 350,
        "customizations": {"variants": ["Aperol", "Campari", "Select"], "add_ons": []}
    },

    # Bibite (Cat 3)
    {
        "id": "campari_soda",
        "category_id": "bibite",
        "name": "Campari Soda",
        "price_cents": 250,
        "customizations": {"variants": ["Classico", "Con Ghiaccio"], "add_ons": []}
    },
    {
        "id": "campari_soda_corretto",
        "category_id": "bibite",
        "name": "Campari Soda Corretto",
        "price_cents": 300,
        "customizations": {"variants": ["Con Gin", "Con Vodka"], "add_ons": []}
    },
    {
        "id": "coca_cola",
        "category_id": "bibite",
        "name": "Coca Cola",
        "price_cents": 250,
        "customizations": {"variants": ["Classica", "Zero"], "add_ons": [{"name": "Limone e Ghiaccio", "price_cents": 0}]}
    },
    {
        "id": "aranciata",
        "category_id": "bibite",
        "name": "Aranciata",
        "price_cents": 250,
        "customizations": {"variants": ["Dolce", "Amara"], "add_ons": []}
    },
    {
        "id": "lemon_soda",
        "category_id": "bibite",
        "name": "Lemon Soda",
        "price_cents": 250,
        "customizations": {"variants": ["Classica", "Zero"], "add_ons": []}
    },
    {
        "id": "sweps",
        "category_id": "bibite",
        "name": "Sweps",
        "price_cents": 250,
        "customizations": {"variants": ["Tonica", "Limone"], "add_ons": []}
    },
    {
        "id": "aperitivo_analcolico",
        "category_id": "bibite",
        "name": "Aperitivo Analcolico",
        "price_cents": 250,
        "customizations": {"variants": ["Crodino", "Sanbitter Rosso", "Sanbitter Bianco"], "add_ons": []}
    },
    {
        "id": "cocktail_san_pellegrino",
        "category_id": "bibite",
        "name": "Cocktail San Pellegrino",
        "price_cents": 250,
        "customizations": {"variants": ["Classico"], "add_ons": []}
    },
    {
        "id": "schweppes_limone",
        "category_id": "bibite",
        "name": "Schweppes Limone",
        "price_cents": 250,
        "customizations": {"variants": ["Classica"], "add_ons": []}
    },
    {
        "id": "schweppes_tonica_arancia",
        "category_id": "bibite",
        "name": "Schweppes Tonica Arancia",
        "price_cents": 250,
        "customizations": {"variants": ["Classica"], "add_ons": []}
    },
    {
        "id": "tassoni",
        "category_id": "bibite",
        "name": "Tassoni",
        "price_cents": 250,
        "customizations": {"variants": ["Classica"], "add_ons": []}
    },
    {
        "id": "tassoni_corretto",
        "category_id": "bibite",
        "name": "Tassoni Corretto",
        "price_cents": 300,
        "customizations": {"variants": ["Con Gin", "Con Vodka"], "add_ons": []}
    },
    {
        "id": "yoga_pera",
        "category_id": "bibite",
        "name": "Yoga Pera",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_pesca",
        "category_id": "bibite",
        "name": "Yoga Pesca",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_arancia",
        "category_id": "bibite",
        "name": "Yoga Arancia",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_ananas",
        "category_id": "bibite",
        "name": "Yoga Ananas",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_pompelmo",
        "category_id": "bibite",
        "name": "Yoga Pompelmo",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_ace",
        "category_id": "bibite",
        "name": "Yoga Ace",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_mirtillo",
        "category_id": "bibite",
        "name": "Yoga Mirtillo",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "yoga_mela_verde",
        "category_id": "bibite",
        "name": "Yoga Mela Verde",
        "price_cents": 200,
        "customizations": {"variants": ["In Vetro"], "add_ons": []}
    },
    {
        "id": "the_latta",
        "category_id": "bibite",
        "name": "Thè Latta",
        "price_cents": 250,
        "customizations": {"variants": ["Limone", "Pesca"], "add_ons": []}
    },
    {
        "id": "the_piccolo",
        "category_id": "bibite",
        "name": "Thè Piccolo",
        "price_cents": 130,
        "customizations": {"variants": ["Limone", "Pesca"], "add_ons": []}
    },
    {
        "id": "the_150cl",
        "category_id": "bibite",
        "name": "Thè 150 cl",
        "price_cents": 300,
        "customizations": {"variants": ["Limone", "Pesca"], "add_ons": []}
    },
    {
        "id": "acqua_piccola",
        "category_id": "bibite",
        "name": "Acqua (Piccola)",
        "price_cents": 100,
        "customizations": {"variants": ["Naturale", "Frizzante"], "add_ons": [{"name": "Fredda", "price_cents": 0}, {"name": "Ambiente", "price_cents": 0}]}
    },
    {
        "id": "acqua_grande",
        "category_id": "bibite",
        "name": "Acqua Grande",
        "price_cents": 150,
        "customizations": {"variants": ["Naturale", "Frizzante"], "add_ons": [{"name": "Fredda", "price_cents": 0}, {"name": "Ambiente", "price_cents": 0}]}
    },
    {
        "id": "sa_pellegrino_r_o_b",
        "category_id": "bibite",
        "name": "Sa Pellegrino R o B",
        "price_cents": 250,
        "customizations": {"variants": ["Rossa", "Bianca"], "add_ons": []}
    },

    # Birre (Cat 4)
    {
        "id": "heineken_33",
        "category_id": "birre",
        "name": "Heineken 33 cl",
        "price_cents": 250,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "heineken_66",
        "category_id": "birre",
        "name": "Heineken 66 cl",
        "price_cents": 350,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "nastro_azzurro_33",
        "category_id": "birre",
        "name": "Nastro Azzurro 33 cl",
        "price_cents": 250,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "nastro_azzurro_66",
        "category_id": "birre",
        "name": "Nastro Azzurro 66 cl",
        "price_cents": 350,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "peroni_33",
        "category_id": "birre",
        "name": "Peroni 33 cl",
        "price_cents": 150,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "peroni_66",
        "category_id": "birre",
        "name": "Peroni 66 cl",
        "price_cents": 250,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "tennents_super_33",
        "category_id": "birre",
        "name": "Tennent's Super 33 cl",
        "price_cents": 300,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },
    {
        "id": "ceres_33",
        "category_id": "birre",
        "name": "Ceres 33 cl",
        "price_cents": 300,
        "customizations": {"variants": ["In Bottiglia", "Fredda"], "add_ons": []}
    },

    # Amari (Cat 5)
    {
        "id": "averna",
        "category_id": "amari",
        "name": "Averna",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Con Ghiaccio", "Con Limone"], "add_ons": []}
    },
    {
        "id": "del_capo",
        "category_id": "amari",
        "name": "Del Capo",
        "price_cents": 200,
        "customizations": {"variants": ["Da Freezer", "Liscio", "Con Ghiaccio"], "add_ons": []}
    },
    {
        "id": "fernet_branca",
        "category_id": "amari",
        "name": "Fernet Branca",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Con Ghiaccio"], "add_ons": []}
    },
    {
        "id": "jagermeister",
        "category_id": "amari",
        "name": "Jagermeister",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },
    {
        "id": "lucano",
        "category_id": "amari",
        "name": "Lucano",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },
    {
        "id": "montenegro",
        "category_id": "amari",
        "name": "Montenegro",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },
    {
        "id": "unicum",
        "category_id": "amari",
        "name": "Unicum",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },
    {
        "id": "bailes",
        "category_id": "amari",
        "name": "Bailes",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },
    {
        "id": "sambuca_martini",
        "category_id": "amari",
        "name": "Sambuca - Martini",
        "price_cents": 200,
        "customizations": {"variants": ["Sambuca", "Martini Bianco", "Martini Rosso"], "add_ons": []}
    },
    {
        "id": "underberg",
        "category_id": "amari",
        "name": "Underberg",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio"], "add_ons": []}
    },
    {
        "id": "limoncello",
        "category_id": "amari",
        "name": "Limoncello",
        "price_cents": 200,
        "customizations": {"variants": ["Da Freezer", "Liscio"], "add_ons": []}
    },
    {
        "id": "vodka",
        "category_id": "amari",
        "name": "Vodka",
        "price_cents": 200,
        "customizations": {"variants": ["Bianca", "Alla Pesca", "Melone", "Fragola"], "add_ons": []}
    },
    {
        "id": "strega",
        "category_id": "amari",
        "name": "Strega",
        "price_cents": 200,
        "customizations": {"variants": ["Liscio", "Ghiaccio"], "add_ons": []}
    },

    # Gelati (Cat 6)
    {
        "id": "secchiello_medio",
        "category_id": "gelati",
        "name": "secchiello Medio",
        "price_cents": 250,
        "customizations": {"variants": ["Cioccolato e Crema", "Misto Frutta"], "add_ons": [{"name": "Panna Extra", "price_cents": 50}]}
    },
    {
        "id": "secchiello_grande",
        "category_id": "gelati",
        "name": "secchiello grande",
        "price_cents": 300,
        "customizations": {"variants": ["Cioccolato e Crema", "Misto Frutta"], "add_ons": [{"name": "Panna Extra", "price_cents": 50}]}
    },
    {
        "id": "conogelato",
        "category_id": "gelati",
        "name": "conoGelato",
        "price_cents": 250,
        "customizations": {"variants": ["Panna e Cioccolato", "Frutta", "Creme"], "add_ons": []}
    },
    {
        "id": "spumone_briosco",
        "category_id": "gelati",
        "name": "spumone* Briosco con strega",
        "price_cents": 300,
        "customizations": {"variants": ["Classico"], "add_ons": []}
    },

    # Caffetteria (Cat 7)
    {
        "id": "espresso",
        "category_id": "caffetteria",
        "name": "Espresso",
        "price_cents": 120,
        "customizations": {
            "variants": ["Normale", "Ristretto", "Lungo", "Decaffeinato"],
            "add_ons": [
                {"name": "Schiumato", "price_cents": 0},
                {"name": "Corretto", "price_cents": 50},
                {"name": "Latte di Soia", "price_cents": 20}
            ]
        }
    },
    {
        "id": "croissant",
        "category_id": "caffetteria",
        "name": "Croissant",
        "price_cents": 150,
        "customizations": {
            "variants": ["Vuota", "Marmellata"],
            "add_ons": []
        }
    },
    {
        "id": "caffe",
        "category_id": "caffetteria",
        "name": "Caffè",
        "price_cents": 120,
        "customizations": {
            "variants": ["Espresso", "Macchiato Freddo", "Macchiato Caldo", "Schiumato", "Lungo", "Ristretto", "Decaffeinato"],
            "add_ons": [{"name": "Cacao", "price_cents": 0}]
        }
    },
    {
        "id": "orzo",
        "category_id": "caffetteria",
        "name": "Orzo",
        "price_cents": 180,
        "customizations": {"variants": ["Tazza Piccola", "Tazza Grande"], "add_ons": []}
    },
    {
        "id": "ginseng",
        "category_id": "caffetteria",
        "name": "Ginseng",
        "price_cents": 180,
        "customizations": {"variants": ["Tazza Piccola", "Tazza Grande"], "add_ons": []}
    },
    {
        "id": "caffe_corretto",
        "category_id": "caffetteria",
        "name": "Caffè Corretto",
        "price_cents": 120,
        "customizations": {"variants": ["Con Sambuca", "Con Grappa", "Con Brandi", "Con Baileys"], "add_ons": []}
    },
    {
        "id": "cappuccino",
        "category_id": "caffetteria",
        "name": "Cappuccino",
        "price_cents": 200,
        "customizations": {"variants": ["Classico", "Decaffeinato"], "add_ons": [{"name": "Cacao", "price_cents": 0}]}
    },
    {
        "id": "cioccolata",
        "category_id": "caffetteria",
        "name": "Cioccolata",
        "price_cents": 200,
        "customizations": {"variants": ["Classica", "Con Panna"], "add_ons": []}
    },
    {
        "id": "crema_di_caffe",
        "category_id": "caffetteria",
        "name": "Crema di caffè",
        "price_cents": 200,
        "customizations": {"variants": ["Classica"], "add_ons": []}
    },
    {
        "id": "granita_limone",
        "category_id": "caffetteria",
        "name": "Granita al Limone",
        "price_cents": 200,
        "customizations": {"variants": ["Classica"], "add_ons": []}
    },

    # Patatine & Snack (Cat 8)
    {
        "id": "sc_crostini",
        "category_id": "patatine",
        "name": "S.C Crostini",
        "price_cents": 150,
        "customizations": {"variants": ["Classici"], "add_ons": []}
    },
    {
        "id": "chipset_dore",
        "category_id": "patatine",
        "name": "chipset d'Ore",
        "price_cents": 250,
        "customizations": {"variants": ["Classiche"], "add_ons": []}
    },
    {
        "id": "patatine",
        "category_id": "patatine",
        "name": "patatine",
        "price_cents": 150,
        "customizations": {"variants": ["Sacchetto", "Ciotola"], "add_ons": []}
    },
    {
        "id": "fonsi",
        "category_id": "patatine",
        "name": "fonsi",
        "price_cents": 200,
        "customizations": {"variants": ["Sacchetto"], "add_ons": []}
    }
]

def seed():
    print("Avvio seeding del menu...")
    
    # Carichiamo il db esistente se presente
    db = {}
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                db = json.load(f)
        except Exception:
            pass

    # Aggiorniamo categorie e prodotti
    db['categories'] = NEW_CATEGORIES
    db['products'] = NEW_PRODUCTS
    
    # Assicuriamoci che ci siano i tavoli di default se mancanti
    if 'tables' not in db or not db['tables']:
        db['tables'] = [
            {"id": 1, "name": "Tavolo 1", "status": "libero", "current_order_id": None},
            {"id": 2, "name": "Tavolo 2", "status": "libero", "current_order_id": None},
            {"id": 3, "name": "Tavolo 3", "status": "libero", "current_order_id": None},
            {"id": 4, "name": "Tavolo 4", "status": "libero", "current_order_id": None},
            {"id": 5, "name": "Tavolo 5", "status": "libero", "current_order_id": None},
            {"id": 6, "name": "Tavolo 6", "status": "libero", "current_order_id": None},
            {"id": 7, "name": "Tavolo 7", "status": "libero", "current_order_id": None},
            {"id": 8, "name": "Tavolo 8", "status": "libero", "current_order_id": None}
        ]
        
    if 'orders' not in db:
        db['orders'] = {}
    if 'order_items' not in db:
        db['order_items'] = {}

    # Salviamo il db
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
        
    print(f"[OK] Seeding completato. {len(NEW_CATEGORIES)} categorie e {len(NEW_PRODUCTS)} prodotti scritti in {DB_FILE}.")

if __name__ == '__main__':
    seed()
