/**
 * API Client per l'applicazione presa comande.
 * Gestisce la comunicazione con il backend Python.
 */

const API_BASE = '/api';

export const ApiClient = {
  /**
   * Recupera la lista di tutti i tavoli.
   */
  async getTables() {
    const res = await fetch(`${API_BASE}/tables`);
    if (!res.ok) throw new Error('Errore nel caricamento dei tavoli');
    return res.json();
  },

  /**
   * Aggiorna lo stato di un tavolo.
   */
  async updateTableStatus(tableId, status) {
    const res = await fetch(`${API_BASE}/tables/${tableId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Errore nel\'aggiornamento dello stato del tavolo');
    return res.json();
  },

  /**
   * Recupera il menu (categorie e prodotti).
   */
  async getMenu() {
    const res = await fetch(`${API_BASE}/menu`);
    if (!res.ok) throw new Error('Errore nel caricamento del menu');
    return res.json();
  },

  /**
   * Crea una nuova comanda per un tavolo.
   */
  async createOrder(tableId, items, notes = '') {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_id: tableId, items, notes })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Errore nella creazione dell\'ordine');
    }
    return res.json();
  },

  /**
   * Recupera i dettagli di una comanda.
   */
  async getOrder(orderId) {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!res.ok) throw new Error('Errore nel caricamento dei dettagli dell\'ordine');
    return res.json();
  },

  /**
   * Recupera la lista di tutte le comande.
   */
  async getOrders() {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error('Errore nel caricamento delle comande');
    return res.json();
  },

  /**
   * Aggiorna lo stato di una comanda.
   */
  async updateOrderStatus(orderId, status) {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Errore nel\'aggiornamento dello stato dell\'ordine');
    return res.json();
  },

  /**
   * Effettua il checkout di un ordine (saldato, tavolo liberato).
   */
  async checkoutOrder(orderId) {
    const res = await fetch(`${API_BASE}/orders/${orderId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Errore durante il pagamento dell\'ordine');
    return res.json();
  },

  /* ==========================================================================
     SEZIONE AMMINISTRAZIONE (CRUD)
     ========================================================================== */

  /**
   * Aggiunge un tavolo.
   */
  async addTable(name) {
    const res = await fetch(`${API_BASE}/admin/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nella creazione del tavolo');
    }
    return res.json();
  },

  /**
   * Aggiorna un tavolo.
   */
  async updateTable(tableId, name) {
    const res = await fetch(`${API_BASE}/admin/tables/${tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nell\'aggiornamento del tavolo');
    }
    return res.json();
  },

  /**
   * Elimina un tavolo.
   */
  async deleteTable(tableId) {
    const res = await fetch(`${API_BASE}/admin/tables/${tableId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nella cancellazione del tavolo');
    }
    return res.json();
  },

  /**
   * Aggiunge una categoria.
   */
  async addCategory(id, name, icon) {
    const res = await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, icon })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nella creazione della categoria');
    }
    return res.json();
  },

  /**
   * Aggiorna una categoria.
   */
  async updateCategory(categoryId, name, icon) {
    const res = await fetch(`${API_BASE}/admin/categories/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nell\'aggiornamento della categoria');
    }
    return res.json();
  },

  /**
   * Elimina una categoria.
   */
  async deleteCategory(categoryId) {
    const res = await fetch(`${API_BASE}/admin/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nella cancellazione della categoria');
    }
    return res.json();
  },

  /**
   * Aggiunge un prodotto.
   */
  async addProduct(productData) {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nella creazione del prodotto');
    }
    return res.json();
  },

  /**
   * Aggiorna un prodotto.
   */
  async updateProduct(productId, productData) {
    const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nell\'aggiornamento del prodotto');
    }
    return res.json();
  },

  /**
   * Elimina un prodotto.
   */
  async deleteProduct(productId) {
    const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Errore nella cancellazione del prodotto');
    }
    return res.json();
  }
};
