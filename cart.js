import { ApiClient } from './api.js';

/**
 * Gestione dello Stato del Carrello per le Comande.
 */

// Stato interno del carrello
let cartItems = []; 

/**
 * Genera una chiave univoca per identificare un articolo nel carrello
 * in base al prodotto, alla variante selezionata, alle aggiunte e alle note.
 */
function generateCartItemId(productId, customizations, notes) {
  const variant = customizations.variant || '';
  const addOns = (customizations.add_ons || []).slice().sort().join(',');
  const itemNotes = notes || '';
  return `${productId}::${variant}::${addOns}::${itemNotes}`;
}

export const CartState = {
  /**
   * Restituisce la lista corrente degli articoli nel carrello.
   * @returns {Array}
   */
  getItems() {
    return cartItems;
  },

  /**
   * Aggiunge un prodotto al carrello con personalizzazioni specifiche.
   * Se l'articolo con la stessa identica configurazione esiste, ne incrementa la quantità.
   * @param {Object} product Il prodotto dal menu
   * @param {Object} customizations { variant: string, add_ons: Array<string> }
   * @param {string} notes Note specifiche per questo articolo
   * @param {number} quantity Quantità iniziale da aggiungere (default 1)
   */
  addItem(product, customizations = {}, notes = '', quantity = 1) {
    const id = generateCartItemId(product.id, customizations, notes);
    
    // Calcola il prezzo unitario includendo il costo extra delle aggiunte
    let unitPriceCents = product.price_cents;
    const selectedAddOns = customizations.add_ons || [];
    const availableAddOns = product.customizations.add_ons || [];
    
    for (const addOnName of selectedAddOns) {
      const addOnDef = availableAddOns.find(a => a.name === addOnName);
      if (addOnDef) {
        unitPriceCents += addOnDef.price_cents;
      }
    }

    const existingIndex = cartItems.findIndex(item => item.id === id);
    if (existingIndex > -1) {
      cartItems[existingIndex].quantity += quantity;
    } else {
      cartItems.push({
        id,
        product_id: product.id,
        name: product.name,
        quantity,
        unit_price_cents: unitPriceCents,
        customizations: {
          variant: customizations.variant || '',
          add_ons: selectedAddOns
        },
        notes
      });
    }

    // Emette un evento personalizzato per notificare i cambiamenti alla UI
    this._notifyChanges();
  },

  /**
   * Aggiorna la quantità di un articolo specifico nel carrello.
   * Rimuove l'articolo se la quantità scende a 0 o meno.
   * @param {string} cartItemId 
   * @param {number} quantity 
   */
  updateQuantity(cartItemId, quantity) {
    const index = cartItems.findIndex(item => item.id === cartItemId);
    if (index === -1) return;

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = quantity;
    }

    this._notifyChanges();
  },

  /**
   * Rimuove completamente un articolo dal carrello.
   * @param {string} cartItemId 
   */
  removeItem(cartItemId) {
    cartItems = cartItems.filter(item => item.id !== cartItemId);
    this._notifyChanges();
  },

  /**
   * Svuota completamente il carrello.
   */
  clear() {
    cartItems = [];
    this._notifyChanges();
  },

  /**
   * Calcola il totale in centesimi del carrello.
   * @returns {number}
   */
  getTotalCents() {
    return cartItems.reduce((sum, item) => sum + (item.unit_price_cents * item.quantity), 0);
  },

  /**
   * Invia l'ordine al backend e svuota il carrello in caso di successo.
   * @param {number} tableId 
   * @param {string} generalNotes Note generali sull'ordine
   * @returns {Promise<Object>} La comanda creata ritornata dalle API
   */
  async submitOrder(tableId, generalNotes = '') {
    if (cartItems.length === 0) {
      throw new Error('Il carrello è vuoto. Impossibile inviare l\'ordine.');
    }
    
    // Prepariamo gli articoli nel formato atteso dalle API
    const itemsPayload = cartItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      customizations: item.customizations,
      notes: item.notes
    }));

    try {
      const order = await ApiClient.createOrder(tableId, itemsPayload, generalNotes);
      this.clear();
      return order;
    } catch (error) {
      console.error('Errore durante l\'invio dell\'ordine:', error);
      throw error;
    }
  },

  /**
   * Metodo interno per emettere un evento personalizzato in modo che la UI sappia di doversi aggiornare.
   */
  _notifyChanges() {
    const event = new CustomEvent('cart-updated', {
      detail: {
        items: cartItems,
        totalCents: this.getTotalCents()
      }
    });
    window.dispatchEvent(event);
  }
};
