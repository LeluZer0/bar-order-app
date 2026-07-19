import { ApiClient } from './api.js';
import { CartState } from './cart.js';

// --- CONFIGURAZIONE E STATO APPLICAZIONE ---
let currentScreen = 'tables'; // 'tables' | 'order'
let activeTable = null; // Oggetto Tavolo attivo
let menuData = null; // { categories: [...], products: [...] }
let selectedCategory = null; // Categoria menu selezionata
let currentOrderDetails = null; // Ordine attivo del tavolo correntemente visualizzato

// Stato per la personalizzazione del prodotto nel Modale
let modalProduct = null;
let modalCustoms = { variants: [], add_ons: [] };
let modalQty = 1;

// --- ELEMENTI DEL DOM ---
const screenTables = document.getElementById('screen-tables');
const screenOrder = document.getElementById('screen-order');
const navTables = document.getElementById('nav-tables');
const navOrder = document.getElementById('nav-order');

const tablesGrid = document.getElementById('tables-grid');
const categoryTabs = document.getElementById('category-tabs');
const productsGrid = document.getElementById('products-grid');

const cartSidebar = document.getElementById('cart-sidebar');
const cartTableLabel = document.getElementById('cart-table-label');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalValue = document.getElementById('cart-total-value');
const orderGeneralNotes = document.getElementById('order-general-notes');
const submitOrderBtn = document.getElementById('submit-order-btn');
const cancelOrderBtn = document.getElementById('cancel-order-btn');
const closeCartBtn = document.getElementById('close-cart-btn');

// Mobile toggle elements
const mobileCartToggle = document.getElementById('mobile-cart-toggle');
const mobileCartCount = document.getElementById('mobile-cart-count');

// Modale Dettagli Tavolo (Checkout)
const tableDetailsModal = document.getElementById('table-details-modal');
const detailsModalTitle = document.getElementById('details-modal-title');
const tableActiveOrderDetails = document.getElementById('table-active-order-details');
const btnSetOccupato = document.getElementById('btn-set-occupato');
const btnSetChiusura = document.getElementById('btn-set-chiusura');
const btnAddItems = document.getElementById('btn-add-items');
const btnCompleteCheckout = document.getElementById('btn-complete-checkout');

// Modale Personalizzazione Prodotto
const customizationModal = document.getElementById('customization-modal');
const customModalTitle = document.getElementById('custom-modal-title');
const variantsOptions = document.getElementById('variants-options');
const addonsOptions = document.getElementById('addons-options');
const itemCustomNotes = document.getElementById('item-custom-notes');
const modalQtyValue = document.getElementById('modal-qty-value');
const modalQtyMinus = document.getElementById('modal-qty-minus');
const modalQtyPlus = document.getElementById('modal-qty-plus');
const modalPricePreview = document.getElementById('modal-price-preview');
const confirmAddToCartBtn = document.getElementById('confirm-add-to-cart');

// --- SISTEMA DI TOAST NOTIFICATION ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// --- FUNZIONE DI CAMBIO SCHERMATA ---
function showScreen(screenId) {
  currentScreen = screenId;
  
  screenTables.classList.remove('active');
  screenOrder.classList.remove('active');
  navTables.classList.remove('active');
  navOrder.classList.remove('active');
  
  if (screenId === 'tables') {
    screenTables.classList.add('active');
    navTables.classList.add('active');
    if (!activeTable) navOrder.disabled = true;
    cartSidebar.classList.remove('active');
    loadTables();
  } else if (screenId === 'order') {
    if (!activeTable) {
      showToast('Seleziona prima un tavolo dalla mappa', 'error');
      showScreen('tables');
      return;
    }
    screenOrder.classList.add('active');
    navOrder.classList.add('active');
    navOrder.disabled = false;
    cartTableLabel.textContent = activeTable.name;
  }
}

async function loadTables() {
  try {
    const tables = await ApiClient.getTables();
    renderTables(tables);
  } catch (error) {
    showToast('Impossibile caricare i tavoli', 'error');
    console.error(error);
  }
}

async function refreshMenu() {
  try {
    menuData = await ApiClient.getMenu();
    renderCategoryTabs();
    
    if (selectedCategory) {
      selectCategory(selectedCategory);
    } else if (menuData.categories.length > 0) {
      selectCategory(menuData.categories[0].id);
    }
  } catch (err) {
    console.error('Errore nel caricamento del menu:', err);
  }
}

async function initApp() {
  try {
    await refreshMenu();
    await loadTables();
    setupEventListeners();
    showToast('Sistema sincronizzato', 'success');
  } catch (error) {
    showToast('Errore di inizializzazione dell\'applicazione', 'error');
    console.error(error);
  }
}

// --- LOGICA DI RENDERING SCHERMATE OPERATIVE ---

// 1. Mappa Tavoli
function renderTables(tables) {
  tablesGrid.innerHTML = '';
  
  tables.forEach(table => {
    const card = document.createElement('div');
    card.className = `table-card ${table.status}`;
    card.dataset.id = table.id;
    
    let statusText = 'Libero';
    if (table.status === 'occupato') statusText = 'Occupato';
    if (table.status === 'in_chiusura') statusText = 'In Chiusura';
    
    const amount = table.current_order_amount_cents 
      ? `${(table.current_order_amount_cents / 100).toFixed(2)} €` 
      : '0.00 €';

    card.innerHTML = `
      <div class="table-num">${table.name}</div>
      <span class="table-status-badge">${statusText}</span>
      <div class="table-amount" id="table-amount-${table.id}" style="${table.current_order_amount_cents ? '' : 'opacity: 0.3'}">${amount}</div>
    `;
    
    card.addEventListener('click', () => handleTableClick(table));
    tablesGrid.appendChild(card);
  });
}

// 2. Categorie Menu (Tab Ordini)
function renderCategoryTabs() {
  categoryTabs.innerHTML = '';
  
  menuData.categories.forEach(category => {
    const tab = document.createElement('button');
    tab.className = 'category-tab';
    tab.dataset.id = category.id;
    tab.innerHTML = `<span class="category-icon">${category.icon}</span> ${category.name}`;
    
    tab.addEventListener('click', () => selectCategory(category.id));
    categoryTabs.appendChild(tab);
  });
}

function selectCategory(categoryId) {
  selectedCategory = categoryId;
  
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.id === categoryId);
  });
  
  renderProducts();
}

// 3. Prodotti (Tab Ordini)
function renderProducts() {
  productsGrid.innerHTML = '';
  
  const filteredProducts = menuData.products.filter(p => p.category_id === selectedCategory);
  
  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const hasCustoms = (product.customizations.variants && product.customizations.variants.length > 0) || 
                       (product.customizations.add_ons && product.customizations.add_ons.length > 0);
    
    const customSummary = hasCustoms ? 'Personalizzabile' : 'Standard';
    
    card.innerHTML = `
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-customization-summary">${customSummary}</div>
      </div>
      <div class="product-footer">
        <div class="product-price">${(product.price_cents / 100).toFixed(2)} €</div>
        <div class="product-add-badge">+</div>
      </div>
    `;
    
    card.addEventListener('click', () => handleProductClick(product));
    productsGrid.appendChild(card);
  });
}



// --- FUNZIONALITÀ INTERACTION / EVENT HANDLERS ---

// Click su Tavolo (Operativo)
async function handleTableClick(table) {
  activeTable = table;
  
  if (table.status === 'libero') {
    CartState.clear();
    orderGeneralNotes.value = '';
    showScreen('order');
  } else {
    openTableDetailsModal(table);
  }
}

// Click su Prodotto (Operativo)
function handleProductClick(product) {
  const hasVariants = product.customizations.variants && product.customizations.variants.length > 0;
  const hasAddOns = product.customizations.add_ons && product.customizations.add_ons.length > 0;
  
  if (hasVariants || hasAddOns) {
    openCustomizationModal(product);
  } else {
    CartState.addItem(product, {}, '', 1);
    showToast(`${product.name} aggiunto`, 'success');
  }
}

// --- GESTIONE MODALE DETTAGLI TAVOLO (CHECKOUT) ---

async function openTableDetailsModal(table) {
  detailsModalTitle.textContent = `${table.name} - Gestione Comanda`;
  tableActiveOrderDetails.innerHTML = '<div class="skeleton-loader">Caricamento comanda attiva...</div>';
  
  btnSetOccupato.className = 'btn-status occupato' + (table.status === 'occupato' ? ' active' : '');
  btnSetChiusura.className = 'btn-status chiusura' + (table.status === 'in_chiusura' ? ' active' : '');
  
  tableDetailsModal.classList.add('active');
  
  try {
    if (!table.current_order_id) {
      throw new Error('Nessun ordine associato a questo tavolo');
    }
    
    const order = await ApiClient.getOrder(table.current_order_id);
    currentOrderDetails = order;
    renderOrderDetails(order);
  } catch (error) {
    tableActiveOrderDetails.innerHTML = `<p class="error-msg">Errore: ${error.message}</p>`;
  }
}

function renderOrderDetails(order) {
  let itemsHtml = '';
  
  order.items.forEach(item => {
    let customsText = '';
    const customs = item.customizations || {};
    const parts = [];
    if (customs.variant) parts.push(customs.variant);
    if (customs.add_ons && customs.add_ons.length > 0) parts.push(customs.add_ons.join(', '));
    if (parts.length > 0) customsText = `(${parts.join(' - ')})`;
    
    itemsHtml += `
      <div class="details-item">
        <div class="details-item-qty-name">
          <span class="details-item-qty">${item.quantity}x</span>
          <div>
            <div><strong>${item.name}</strong> <span class="details-item-customs">${customsText}</span></div>
            ${item.notes ? `<div class="details-item-notes">Nota: ${item.notes}</div>` : ''}
          </div>
        </div>
        <div class="details-item-price">${((item.unit_price_cents * item.quantity) / 100).toFixed(2)} €</div>
      </div>
    `;
  });

  tableActiveOrderDetails.innerHTML = `
    <div class="details-summary">
      <div class="details-meta-row">
        <span>Stato Ordine: <strong>${order.status.replace('_', ' ').toUpperCase()}</strong></span>
        <span>ID: <span class="details-order-id">${order.id}</span></span>
      </div>
      
      <div class="details-item-list">
        ${itemsHtml}
      </div>
      
      ${order.notes ? `<div class="cart-item-notes">Note Generali: "${order.notes}"</div>` : ''}

      <div class="details-total-box">
        <span>Totale da Pagare:</span>
        <span class="details-total-price">${(order.total_amount_cents / 100).toFixed(2)} €</span>
      </div>
    </div>
  `;
}

// --- GESTIONE MODALE PERSONALIZZAZIONE PRODOTTO ---

function openCustomizationModal(product) {
  modalProduct = product;
  modalQty = 1;
  modalQtyValue.textContent = modalQty;
  
  customModalTitle.textContent = `Personalizza ${product.name}`;
  itemCustomNotes.value = '';
  
  modalCustoms.variants = product.customizations.variants && product.customizations.variants.length > 0 
    ? [product.customizations.variants[0]] 
    : [];
  modalCustoms.add_ons = [];
  
  // Render Varianti
  variantsOptions.innerHTML = '';
  const variants = product.customizations.variants || [];
  if (variants.length > 0) {
    document.getElementById('variants-section').style.display = 'block';
      variants.forEach((v, index) => {
        const btn = document.createElement('button');
        btn.className = `pill-option ${index === 0 ? 'selected' : ''}`;
        btn.textContent = v;
        btn.addEventListener('click', () => {
          const isSelected = modalCustoms.variants.includes(v);
          if (isSelected) {
            if (modalCustoms.variants.length > 1) {
              modalCustoms.variants = modalCustoms.variants.filter(val => val !== v);
              btn.classList.remove('selected');
            } else {
              showToast("Seleziona almeno una variante", "info");
            }
          } else {
            modalCustoms.variants.push(v);
            btn.classList.add('selected');
          }
          updateModalPricePreview();
        });
        variantsOptions.appendChild(btn);
      });
  } else {
    document.getElementById('variants-section').style.display = 'none';
  }
  
  // Render Aggiunte
  addonsOptions.innerHTML = '';
  const addons = product.customizations.add_ons || [];
  if (addons.length > 0) {
    document.getElementById('addons-section').style.display = 'block';
    addons.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'pill-option';
      
      const priceText = a.price_cents > 0 ? `+${(a.price_cents / 100).toFixed(2)} €` : 'Gratis';
      btn.innerHTML = `
        <span>${a.name}</span>
        <span class="pill-addon-price">${priceText}</span>
      `;
      
      btn.addEventListener('click', () => {
        const isSelected = modalCustoms.add_ons.includes(a.name);
        if (isSelected) {
          modalCustoms.add_ons = modalCustoms.add_ons.filter(name => name !== a.name);
          btn.classList.remove('selected');
        } else {
          modalCustoms.add_ons.push(a.name);
          btn.classList.add('selected');
        }
        updateModalPricePreview();
      });
      addonsOptions.appendChild(btn);
    });
  } else {
    document.getElementById('addons-section').style.display = 'none';
  }
  
  updateModalPricePreview();
  customizationModal.classList.add('active');
}

function updateModalPricePreview() {
  if (!modalProduct) return;
  
  let unitPriceCents = modalProduct.price_cents;
  const availableAddOns = modalProduct.customizations.add_ons || [];
  
  modalCustoms.add_ons.forEach(addOnName => {
    const addOnDef = availableAddOns.find(a => a.name === addOnName);
    if (addOnDef) {
      unitPriceCents += addOnDef.price_cents;
    }
  });
  
  const totalPrice = (unitPriceCents * modalQty) / 100;
  modalPricePreview.textContent = `${totalPrice.toFixed(2)} €`;
}

// --- AGGIORNAMENTO CARRELLO IN TEMPO REALE ---

window.addEventListener('cart-updated', (e) => {
  const { items, totalCents } = e.detail;
  
  cartTotalValue.textContent = `${(totalCents / 100).toFixed(2)} €`;
  
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  mobileCartCount.textContent = count;
  mobileCartToggle.classList.toggle('has-items', count > 0);
  
  if (items.length === 0) {
    cartItemsList.innerHTML = `
      <div class="cart-empty-state">
        <span class="empty-icon">🛒</span>
        <p>Nessun prodotto selezionato</p>
      </div>
    `;
    submitOrderBtn.disabled = true;
    return;
  }
  
  submitOrderBtn.disabled = false;
  cartItemsList.innerHTML = '';
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'cart-item';
    
    let customsHtml = '';
    const customs = [];
    if (item.customizations.variant) customs.push(item.customizations.variant);
    if (item.customizations.add_ons && item.customizations.add_ons.length > 0) {
      customs.push(...item.customizations.add_ons);
    }
    
    if (customs.length > 0) {
      customsHtml = `<div class="cart-item-customizations">${customs.join(', ')}</div>`;
    }
    
    card.innerHTML = `
      <div class="cart-item-header">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${((item.unit_price_cents * item.quantity) / 100).toFixed(2)} €</div>
      </div>
      ${customsHtml}
      ${item.notes ? `<div class="cart-item-notes">Nota: ${item.notes}</div>` : ''}
      <div class="cart-item-footer">
        <span class="text-muted" style="font-size: 0.8rem;">${(item.unit_price_cents / 100).toFixed(2)} €/cad</span>
        <div class="qty-selector">
          <button class="qty-btn minus-btn" data-id="${item.id}">-</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn plus-btn" data-id="${item.id}">+</button>
        </div>
      </div>
    `;
    
    card.querySelector('.minus-btn').addEventListener('click', () => {
      CartState.updateQuantity(item.id, item.quantity - 1);
    });
    
    card.querySelector('.plus-btn').addEventListener('click', () => {
      CartState.updateQuantity(item.id, item.quantity + 1);
    });
    
    cartItemsList.appendChild(card);
  });
});

// --- IMPOSTAZIONE LISTENER EVENTI ---

function setupEventListeners() {
  
  // Nav Tabs principali
  navTables.addEventListener('click', () => showScreen('tables'));
  navOrder.addEventListener('click', () => showScreen('order'));
  
  // Close Modals buttons
  document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    });
  });
  
  // Chiudi modale cliccando fuori
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
    }
  });

  // --- Modale Personalizzazione Prodotto: Pulsanti Quantità ---
  modalQtyMinus.addEventListener('click', () => {
    if (modalQty > 1) {
      modalQty--;
      modalQtyValue.textContent = modalQty;
      updateModalPricePreview();
    }
  });

  modalQtyPlus.addEventListener('click', () => {
    modalQty++;
    modalQtyValue.textContent = modalQty;
    updateModalPricePreview();
  });

  // Conferma aggiunta al carrello
  confirmAddToCartBtn.addEventListener('click', () => {
    if (!modalProduct) return;
    
    const variantStr = modalCustoms.variants ? modalCustoms.variants.join(', ') : '';
    CartState.addItem(modalProduct, { variant: variantStr, add_ons: modalCustoms.add_ons }, itemCustomNotes.value.trim(), modalQty);
    customizationModal.classList.remove('active');
    showToast(`${modalProduct.name} aggiunto al carrello`, 'success');
  });

  // --- Carrello Azioni ---
  
  cancelOrderBtn.addEventListener('click', () => {
    if (confirm('Sei sicuro di voler annullare l\'ordine corrente?')) {
      CartState.clear();
      orderGeneralNotes.value = '';
      showScreen('tables');
    }
  });

  submitOrderBtn.addEventListener('click', async () => {
    if (!activeTable) return;
    
    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = 'Invio...';
    
    try {
      await CartState.submitOrder(activeTable.id, orderGeneralNotes.value.trim());
      showToast('Comanda inviata in cucina!', 'success');
      orderGeneralNotes.value = '';
      showScreen('tables');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      submitOrderBtn.textContent = 'Invia Ordine';
      submitOrderBtn.disabled = false;
    }
  });

  // --- Modale Dettaglio Tavolo (Checkout/Gestione) ---

  btnSetOccupato.addEventListener('click', async () => {
    if (!activeTable) return;
    try {
      await ApiClient.updateTableStatus(activeTable.id, 'occupato');
      btnSetOccupato.classList.add('active');
      btnSetChiusura.classList.remove('active');
      showToast('Stato aggiornato a "Occupato"', 'success');
      loadTables();
    } catch (err) {
      showToast('Impossibile aggiornare lo stato', 'error');
    }
  });

  btnSetChiusura.addEventListener('click', async () => {
    if (!activeTable) return;
    try {
      await ApiClient.updateTableStatus(activeTable.id, 'in_chiusura');
      btnSetChiusura.classList.add('active');
      btnSetOccupato.classList.remove('active');
      showToast('Stato aggiornato a "In Chiusura"', 'success');
      loadTables();
    } catch (err) {
      showToast('Impossibile aggiornare lo stato', 'error');
    }
  });

  btnAddItems.addEventListener('click', () => {
    tableDetailsModal.classList.remove('active');
    CartState.clear();
    orderGeneralNotes.value = '';
    showScreen('order');
  });

  btnCompleteCheckout.addEventListener('click', async () => {
    if (!activeTable || !currentOrderDetails) return;
    
    const totalAmount = currentOrderDetails.total_amount_cents / 100;
    const cashStr = prompt(`Totale conto: ${totalAmount.toFixed(2)} €\nQuanto contante ti è stato consegnato dal cliente?`);
    if (cashStr === null) return; 

    const cashReceived = parseFloat(cashStr.replace(',', '.'));
    if (isNaN(cashReceived) || cashReceived < totalAmount) {
        alert("Attenzione: l'importo inserito non è valido o è inferiore al totale.");
        return;
    }
    
    const change = cashReceived - totalAmount;
    if (confirm(`Contante ricevuto: ${cashReceived.toFixed(2)} €\nDa dare di resto: ${change.toFixed(2)} €\n\nConfermi la chiusura definitiva del conto?`)) {
      btnCompleteCheckout.disabled = true;
      try {
        await ApiClient.checkoutOrder(currentOrderDetails.id);
        showToast('Ordine Saldato. Tavolo liberato!', 'success');
        tableDetailsModal.classList.remove('active');
        loadTables();
      } catch (err) {
        showToast('Errore durante il pagamento', 'error');
      } finally {
        btnCompleteCheckout.disabled = false;
      }
    }
  });

  // --- MOBILE CART DRAWER TOGGLE ---
  mobileCartToggle.addEventListener('click', () => {
    cartSidebar.classList.toggle('active');
  });

  closeCartBtn.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
  });
}

// --- AVVIO DELL'APPLICAZIONE ---
document.addEventListener('DOMContentLoaded', initApp);
