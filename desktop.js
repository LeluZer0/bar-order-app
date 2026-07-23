import { ApiClient } from './api.js';

// --- CONFIGURAZIONE E STATO APPLICAZIONE ---
let currentScreen = 'tables'; // 'tables' | 'kitchen' | 'admin' | 'orders'
let activeTable = null; // Oggetto Tavolo correntemente selezionato per checkout
let currentAdminTab = 'tables'; // 'tables' | 'categories' | 'products'
let menuData = null; // { categories: [...], products: [...] }
let activeOrders = []; // Comande attive
let currentOrderDetails = null; // Dettagli dell'ordine caricato nel pannello checkout
let pollingInterval = null;
let tablesList = []; // Lista globale dei tavoli per mappatura nomi

// Stati di modifica sezione Amministrazione
let editingTableId = null;
let editingCategoryId = null;
let editingProductId = null;

// --- ELEMENTI DEL DOM ---
const screenTables = document.getElementById('screen-tables');
const screenAdmin = document.getElementById('screen-admin');
const screenOrders = document.getElementById('screen-orders');
const screenSondaggio = document.getElementById('screen-sondaggio');

const btnNavTables = document.getElementById('btn-nav-tables');
const btnNavAdmin = document.getElementById('btn-nav-admin');
const btnNavOrders = document.getElementById('btn-nav-orders');
const btnNavSondaggio = document.getElementById('btn-nav-sondaggio');

const screenTitle = document.getElementById('screen-title');
const btnRefresh = document.getElementById('btn-refresh');

const tablesGrid = document.getElementById('tables-grid');
const checkoutPanelContent = document.getElementById('checkout-panel-content');

// DOM Amministrazione
const adminTabTables = document.getElementById('admin-tab-tables');
const adminTabCategories = document.getElementById('admin-tab-categories');
const adminTabProducts = document.getElementById('admin-tab-products');
const adminViewTables = document.getElementById('admin-view-tables');
const adminViewCategories = document.getElementById('admin-view-categories');
const adminViewProducts = document.getElementById('admin-view-products');

const adminTablesList = document.getElementById('admin-tables-list');
const adminCategoriesList = document.getElementById('admin-categories-list');
const adminProductsList = document.getElementById('admin-products-list');

const formAddTable = document.getElementById('form-add-table');
const formAddCategory = document.getElementById('form-add-category');
const formAddProduct = document.getElementById('form-add-product');
const newProdCatSelect = document.getElementById('new-prod-cat');

const btnCancelTableEdit = document.getElementById('btn-cancel-table-edit');
const btnCancelCatEdit = document.getElementById('btn-cancel-cat-edit');
const btnCancelProdEdit = document.getElementById('btn-cancel-prod-edit');

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
  screenAdmin.classList.remove('active');
  screenOrders.classList.remove('active');
  screenSondaggio.classList.remove('active');
  
  btnNavTables.classList.remove('active');
  btnNavAdmin.classList.remove('active');
  btnNavOrders.classList.remove('active');
  btnNavSondaggio.classList.remove('active');
  
  if (screenId === 'tables') {
    screenTables.classList.add('active');
    btnNavTables.classList.add('active');
    screenTitle.textContent = 'Monitor Tavoli';
    loadTables();
  } else if (screenId === 'admin') {
    screenAdmin.classList.add('active');
    btnNavAdmin.classList.add('active');
    screenTitle.textContent = 'Amministrazione';
    resetAllAdminForms();
    refreshAdminData();
  } else if (screenId === 'orders') {
    screenOrders.classList.add('active');
    btnNavOrders.classList.add('active');
    screenTitle.textContent = 'Riepilogo Ordini Chiusi';
    loadOrdersSummary();
  } else if (screenId === 'sondaggio') {
    screenSondaggio.classList.add('active');
    btnNavSondaggio.classList.add('active');
    screenTitle.textContent = 'Sondaggio Vendite';
    loadSondaggio();
  }
}

function showAdminTab(tabName) {
  currentAdminTab = tabName;
  
  adminTabTables.classList.toggle('active', tabName === 'tables');
  adminTabCategories.classList.toggle('active', tabName === 'categories');
  adminTabProducts.classList.toggle('active', tabName === 'products');
  
  adminViewTables.classList.toggle('active', tabName === 'tables');
  adminViewCategories.classList.toggle('active', tabName === 'categories');
  adminViewProducts.classList.toggle('active', tabName === 'products');
  
  resetAllAdminForms();
  refreshAdminData();
}

// --- LOGICHE RESET FORM AMMINISTRAZIONE ---
function resetTableForm() {
  document.getElementById('new-table-name').value = '';
  editingTableId = null;
  document.getElementById('table-form-title').textContent = 'Aggiungi Nuovo Tavolo';
  document.getElementById('btn-submit-table').textContent = 'Aggiungi Tavolo';
  btnCancelTableEdit.style.display = 'none';
}

function resetCategoryForm() {
  const idInput = document.getElementById('new-cat-id');
  idInput.value = '';
  idInput.readOnly = false;
  document.getElementById('new-cat-name').value = '';
  document.getElementById('new-cat-icon').value = '';
  editingCategoryId = null;
  document.getElementById('category-form-title').textContent = 'Aggiungi Categoria';
  document.getElementById('btn-submit-category').textContent = 'Aggiungi Categoria';
  btnCancelCatEdit.style.display = 'none';
}

function resetProductForm() {
  document.getElementById('new-prod-name').value = '';
  document.getElementById('new-prod-price').value = '';
  document.getElementById('new-prod-variants').value = '';
  document.getElementById('new-prod-addons').value = '';
  editingProductId = null;
  document.getElementById('product-form-title').textContent = 'Aggiungi Prodotto';
  document.getElementById('btn-submit-product').textContent = 'Aggiungi Prodotto';
  btnCancelProdEdit.style.display = 'none';
}

function resetAllAdminForms() {
  resetTableForm();
  resetCategoryForm();
  resetProductForm();
}

// --- SYNC / CARICAMENTO DATI ---
async function loadTables() {
  try {
    const tables = await ApiClient.getTables();
    tablesList = tables;
    renderTables(tables);
    // Se c'è un tavolo attivo selezionato per checkout, rinfreschiamo il pannello cassa
    if (activeTable) {
      const updatedTable = tables.find(t => t.id === activeTable.id);
      if (updatedTable) {
        activeTable = updatedTable;
        loadCheckoutPanel(updatedTable);
      }
    }
  } catch (error) {
    console.error('Errore nel caricamento dei tavoli:', error);
  }
}

// --- SONDAGGIO VENDITE LOGICA ---
function initSondaggioFilters() {
  const fromInput = document.getElementById('sondaggio-date-from');
  const toInput = document.getElementById('sondaggio-date-to');
  
  if (!fromInput.value && !toInput.value) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    fromInput.value = formatDateTimeLocal(todayStart);
    toInput.value = formatDateTimeLocal(todayEnd);
  }
}

function setSondaggioFilterRange(from, to) {
  document.getElementById('sondaggio-date-from').value = formatDateTimeLocal(from);
  document.getElementById('sondaggio-date-to').value = formatDateTimeLocal(to);
}

async function loadSondaggio() {
  initSondaggioFilters();
  
  const fromInput = document.getElementById('sondaggio-date-from').value;
  const toInput = document.getElementById('sondaggio-date-to').value;
  
  const fromDate = fromInput ? new Date(fromInput) : null;
  const toDate = toInput ? new Date(toInput) : null;
  
  try {
    const allOrders = await ApiClient.getOrders();
    const closedOrders = allOrders.filter(o => o.status === 'pagato');
    
    const filteredOrders = closedOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });
    
    renderSondaggio(filteredOrders);
  } catch (err) {
    console.error('Errore nel caricamento del sondaggio:', err);
    showToast('Impossibile caricare il sondaggio vendite', 'error');
  }
}

function renderSondaggio(orders) {
  const container = document.getElementById('sondaggio-results');
  container.innerHTML = '';
  
  if (orders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">
        Nessun prodotto venduto nel periodo selezionato.
      </div>
    `;
    return;
  }
  
  // Aggreghiamo le vendite per prodotto
  const productSales = {};
  
  orders.forEach(order => {
    order.items.forEach(item => {
      const pid = item.product_id;
      if (!productSales[pid]) {
        productSales[pid] = {
          productId: pid,
          name: item.name,
          quantity: 0,
          variants: {},
          addOns: {},
          categoryId: null
        };
      }
      
      productSales[pid].quantity += item.quantity;
      
      // Mappatura categoryId
      if (menuData && menuData.products) {
        const menuProd = menuData.products.find(p => p.id === pid);
        if (menuProd) {
          productSales[pid].categoryId = menuProd.category_id;
        }
      }
      
      const customs = item.customizations || {};
      
      // Varianti
      if (customs.variant) {
        const v = customs.variant;
        productSales[pid].variants[v] = (productSales[pid].variants[v] || 0) + item.quantity;
      }
      
      // Aggiunte
      if (customs.add_ons && customs.add_ons.length > 0) {
        customs.add_ons.forEach(a => {
          productSales[pid].addOns[a] = (productSales[pid].addOns[a] || 0) + item.quantity;
        });
      }
    });
  });
  
  // Raggruppiamo i prodotti per categoria
  const categoriesGroup = {};
  
  Object.values(productSales).forEach(salesInfo => {
    let catId = salesInfo.categoryId || 'altro';
    if (!categoriesGroup[catId]) {
      categoriesGroup[catId] = [];
    }
    categoriesGroup[catId].push(salesInfo);
  });
  
  // Per ciascuna categoria in menuData (più 'altro' se presente)
  const categoriesList = [...menuData.categories];
  if (categoriesGroup['altro']) {
    categoriesList.push({ id: 'altro', name: 'Altro / Non Assegnato', icon: '❓' });
  }
  
  categoriesList.forEach(cat => {
    const productsInCat = categoriesGroup[cat.id];
    if (!productsInCat || productsInCat.length === 0) return;
    
    // Ordina i prodotti per quantità decrescente
    productsInCat.sort((a, b) => b.quantity - a.quantity);
    
    // Calcoliamo la quantità totale venduta nella categoria
    const catTotalQty = productsInCat.reduce((sum, p) => sum + p.quantity, 0);
    
    const catCard = document.createElement('div');
    catCard.className = 'sondaggio-cat-card';
    
    let prodItemsHtml = '';
    
    productsInCat.forEach(prod => {
      const percent = catTotalQty > 0 ? Math.round((prod.quantity / catTotalQty) * 100) : 0;
      
      // Costruisci sottotitolo varianti e aggiunte
      const subtitleParts = [];
      
      const varParts = Object.entries(prod.variants)
        .map(([vName, vCount]) => `${vName} (${vCount})`);
      if (varParts.length > 0) {
        subtitleParts.push(`Varianti: ${varParts.join(', ')}`);
      }
      
      const addOnParts = Object.entries(prod.addOns)
        .map(([aName, aCount]) => `${aName} (${aCount})`);
      if (addOnParts.length > 0) {
        subtitleParts.push(`Aggiunte: ${addOnParts.join(', ')}`);
      }
      
      const subtitleText = subtitleParts.length > 0 
        ? subtitleParts.join(' • ') 
        : 'Nessuna variante o aggiunta selezionata';
        
      prodItemsHtml += `
        <div class="sondaggio-prod-item">
          <div class="sondaggio-prod-info">
            <span class="sondaggio-prod-name">${prod.name}</span>
            <span class="sondaggio-prod-qty">${prod.quantity} venduti</span>
          </div>
          <div class="sondaggio-progress-bar-bg">
            <div class="sondaggio-progress-bar-fg" style="width: ${percent}%;"></div>
          </div>
          <div class="sondaggio-prod-sub">${subtitleText}</div>
        </div>
      `;
    });
    
    catCard.innerHTML = `
      <div class="sondaggio-cat-header">
        <div class="sondaggio-cat-title">
          <span>${cat.icon}</span> ${cat.name}
        </div>
        <span class="sondaggio-cat-total">${catTotalQty} Totali</span>
      </div>
      <div class="sondaggio-prod-list">
        ${prodItemsHtml}
      </div>
    `;
    
    container.appendChild(catCard);
  });
}

// --- RIEPILOGO ORDINI LOGICA ---
function formatDateTimeLocal(date) {
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function setFilterRange(from, to) {
  document.getElementById('filter-date-from').value = formatDateTimeLocal(from);
  document.getElementById('filter-date-to').value = formatDateTimeLocal(to);
}

function initOrdersSummaryFilters() {
  const fromInput = document.getElementById('filter-date-from');
  const toInput = document.getElementById('filter-date-to');
  
  if (!fromInput.value && !toInput.value) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    fromInput.value = formatDateTimeLocal(todayStart);
    toInput.value = formatDateTimeLocal(todayEnd);
  }
}

async function loadOrdersSummary() {
  initOrdersSummaryFilters();
  
  const fromInput = document.getElementById('filter-date-from').value;
  const toInput = document.getElementById('filter-date-to').value;
  
  const fromDate = fromInput ? new Date(fromInput) : null;
  const toDate = toInput ? new Date(toInput) : null;
  
  try {
    const allOrders = await ApiClient.getOrders();
    const closedOrders = allOrders.filter(o => o.status === 'pagato');
    
    const filteredOrders = closedOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });
    
    // Ordina dal più recente
    filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    renderOrdersSummary(filteredOrders);
  } catch (err) {
    console.error('Errore nel caricamento del riepilogo ordini:', err);
    showToast('Impossibile caricare il riepilogo ordini', 'error');
  }
}

function renderOrdersSummary(orders) {
  const tableBody = document.getElementById('orders-summary-table-body');
  tableBody.innerHTML = '';
  
  // Calcolo statistiche
  const totalCents = orders.reduce((sum, o) => sum + o.total_amount_cents, 0);
  const count = orders.length;
  const averageCents = count > 0 ? Math.round(totalCents / count) : 0;
  
  // Aggiorna card statistiche
  document.getElementById('stat-total-revenue').textContent = `${(totalCents / 100).toFixed(2)} €`;
  document.getElementById('stat-orders-count').textContent = count;
  document.getElementById('stat-average-ticket').textContent = `${(averageCents / 100).toFixed(2)} €`;
  
  if (orders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-muted" style="text-align: center; padding: 2rem;">
          Nessuna transazione trovata per il periodo selezionato.
        </td>
      </tr>
    `;
    return;
  }
  
  orders.forEach(order => {
    const d = new Date(order.created_at);
    const dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
                    ' ' + 
                    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                    
    const tableName = tablesList.find(t => t.id === order.table_id)?.name || `Tavolo ${order.table_id}`;
    
    const itemsHtml = order.items.map(item => {
      let customsText = '';
      const customs = item.customizations || {};
      const parts = [];
      if (customs.variant) parts.push(customs.variant);
      if (customs.add_ons && customs.add_ons.length > 0) parts.push(customs.add_ons.join(', '));
      if (parts.length > 0) customsText = ` (${parts.join(' - ')})`;
      
      return `
        <span class="order-item-inline">
          <span class="order-item-inline-qty">${item.quantity}x</span> ${item.name}${customsText}
        </span>
      `;
    }).join('');
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="order-id-badge" title="${order.id}">${order.id.substring(4, 12)}...</span></td>
      <td><span class="order-table-badge">${tableName}</span></td>
      <td>${dateStr}</td>
      <td><div class="order-items-list">${itemsHtml}</div></td>
      <td class="order-amount-cell text-right">${(order.total_amount_cents / 100).toFixed(2)} €</td>
    `;
    
    tableBody.appendChild(tr);
  });
}

async function refreshMenu() {
  try {
    menuData = await ApiClient.getMenu();
    populateAdminCategorySelect();
  } catch (err) {
    console.error('Errore nel caricamento del menu:', err);
  }
}



// --- RENDERING MONITOR TAVOLI (CASSA) ---
function renderTables(tables) {
  tablesGrid.innerHTML = '';
  tables.forEach(table => {
    const card = document.createElement('div');
    card.className = `table-card ${table.status}`;
    if (activeTable && activeTable.id === table.id) {
      card.classList.add('selected-active'); // Evidenzia tavolo selezionato
    }
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
    
    card.addEventListener('click', () => {
      // Rimuovi selezione grafica precedente
      document.querySelectorAll('.desktop-tables-grid .table-card').forEach(c => c.classList.remove('selected-active'));
      card.classList.add('selected-active');
      activeTable = table;
      loadCheckoutPanel(table);
    });
    
    tablesGrid.appendChild(card);
  });
}

async function loadCheckoutPanel(table) {
  if (table.status === 'libero') {
    checkoutPanelContent.innerHTML = `
      <div class="checkout-details-box">
        <h4>${table.name}</h4>
        <span class="table-status-badge libero" style="align-self: flex-start; margin-bottom: 1.5rem;">Libero</span>
        <div class="select-table-prompt">
          <span>🍽️</span>
          <p>Il tavolo è attualmente vuoto. I camerieri possono prendere ordinazioni da smartphone per aprirlo.</p>
        </div>
      </div>
    `;
    return;
  }
  
  checkoutPanelContent.innerHTML = '<div class="skeleton-loader">Caricamento ordine...</div>';
  
  try {
    const order = await ApiClient.getOrder(table.current_order_id);
    currentOrderDetails = order;
    
    let itemsHtml = '';
    order.items.forEach(item => {
      let customsText = '';
      const customs = item.customizations || {};
      const parts = [];
      if (customs.variant) parts.push(customs.variant);
      if (customs.add_ons && customs.add_ons.length > 0) parts.push(customs.add_ons.join(', '));
      if (parts.length > 0) customsText = `(${parts.join(' - ')})`;
      
      itemsHtml += `
        <div class="checkout-item-row" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="checkout-item-info">
            <span class="checkout-item-qty">${item.quantity}x</span>
            <div>
              <span class="checkout-item-name">${item.name}</span>
              ${customsText ? `<div class="checkout-item-customs">${customsText}</div>` : ''}
              ${item.notes ? `<div class="checkout-item-customs" style="color: var(--color-occupato); font-style: italic;">Nota: ${item.notes}</div>` : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.8rem;">
            <span class="checkout-item-price">${((item.unit_price_cents * item.quantity) / 100).toFixed(2)} €</span>
            <button class="btn-remove-desktop-item" data-item-id="${item.id}" style="background: none; border: none; color: #ff4d4f; cursor: pointer; font-size: 1.1rem; padding: 4px;" title="Rimuovi elemento">🗑️</button>
          </div>
        </div>
      `;
    });
    
    checkoutPanelContent.innerHTML = `
      <div class="checkout-details-box">
        <h4 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.2rem;">${table.name}</h4>
        <div class="checkout-meta">
          <span>Stato: <strong>${order.status.replace('_', ' ').toUpperCase()}</strong></span>
          <span>ID: ${order.id}</span>
        </div>
        
        <div class="checkout-items-list">
          ${itemsHtml}
        </div>
        
        ${order.notes ? `<div class="kds-card-notes" style="margin-bottom: 1.5rem;">Note: "${order.notes}"</div>` : ''}
        
        <div class="checkout-summary-box">
          <div class="checkout-total-row">
            <span>Totale da Pagare:</span>
            <span class="checkout-total-val">${(order.total_amount_cents / 100).toFixed(2)} €</span>
          </div>
          
          <div class="checkout-actions-row">
            <!-- Pulsante Cambio Stato -->
            <button id="btn-desktop-toggle-status" class="btn btn-secondary">
              ${table.status === 'occupato' ? '🔔 In Chiusura' : '👤 Occupato'}
            </button>
            <button id="btn-desktop-checkout" class="btn btn-success">
              💳 Chiudi e Salda
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Event listeners del pannello checkout
    document.getElementById('btn-desktop-toggle-status').addEventListener('click', async () => {
      const nextStatus = table.status === 'occupato' ? 'in_chiusura' : 'occupato';
      try {
        await ApiClient.updateTableStatus(table.id, nextStatus);
        showToast(`Stato tavolo aggiornato!`, 'success');
        loadTables();
      } catch (err) {
        showToast('Impossibile aggiornare lo stato del tavolo', 'error');
      }
    });
    
    document.getElementById('btn-desktop-checkout').addEventListener('click', async () => {
      const totalAmount = order.total_amount_cents / 100;
      const cashStr = prompt(`Totale conto tavolo ${table.name}: ${totalAmount.toFixed(2)} €\nQuanto contante ha dato il cliente?\n(Lascia vuoto se importo esatto)`);
      if (cashStr === null) return;
      
      let cashReceived = totalAmount;
      if (cashStr.trim() !== "") {
          cashReceived = parseFloat(cashStr.replace(',', '.'));
          if (isNaN(cashReceived) || cashReceived < totalAmount) {
              alert("Attenzione: importo non valido o insufficiente!");
              return;
          }
      }
      
      const change = cashReceived - totalAmount;
      let confirmMsg = `Confermi la chiusura per il tavolo ${table.name}?`;
      if (cashStr.trim() !== "") {
          confirmMsg = `Contante: ${cashReceived.toFixed(2)} €\nResto da restituire: ${change.toFixed(2)} €\n\nConfermi la chiusura?`;
      }

      if (confirm(confirmMsg)) {
        try {
          await ApiClient.checkoutOrder(order.id);
          showToast('Tavolo saldato e liberato con successo!', 'success');
          activeTable = null;
          loadTables();
        } catch (err) {
          showToast('Errore durante la chiusura del conto', 'error');
        }
      }
    });

    // Event listener per rimozione articolo
    const removeButtons = checkoutPanelContent.querySelectorAll('.btn-remove-desktop-item');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-item-id');
        if (confirm('Sei sicuro di voler rimuovere questo prodotto dall\'ordine?')) {
          try {
            btn.disabled = true;
            btn.style.opacity = 0.5;
            await ApiClient.deleteOrderItem(itemId);
            showToast("Prodotto rimosso con successo", "success");
            
            // Ricarica i tavoli (che ricaricherà anche questo pannello checkout)
            const tables = await ApiClient.getTables();
            const updatedTable = tables.find(t => t.id === table.id);
            if (updatedTable) {
              if (updatedTable.status === 'libero') {
                activeTable = null;
              } else {
                activeTable = updatedTable;
              }
            }
            loadTables();
          } catch (err) {
            showToast("Errore: " + err.message, "error");
            btn.disabled = false;
            btn.style.opacity = 1;
          }
        }
      });
    });
    
  } catch (error) {
    checkoutPanelContent.innerHTML = `<p class="error-msg">Errore caricamento conto: ${error.message}</p>`;
  }
}


// --- AMMINISTRAZIONE ---
async function refreshAdminData() {
  if (currentAdminTab === 'tables') {
    try {
      const tables = await ApiClient.getTables();
      renderAdminTables(tables);
    } catch (err) {
      showToast('Errore caricamento tavoli', 'error');
    }
  } else if (currentAdminTab === 'categories') {
    try {
      renderAdminCategories(menuData.categories);
    } catch (err) {
      showToast('Errore caricamento categorie', 'error');
    }
  } else if (currentAdminTab === 'products') {
    try {
      renderAdminProducts(menuData.products);
    } catch (err) {
      showToast('Errore caricamento prodotti', 'error');
    }
  }
}

function populateAdminCategorySelect() {
  newProdCatSelect.innerHTML = '';
  menuData.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.name}`;
    newProdCatSelect.appendChild(opt);
  });
}

function renderAdminTables(tables) {
  adminTablesList.innerHTML = '';
  
  if (tables.length === 0) {
    adminTablesList.innerHTML = '<li class="text-muted" style="padding: 1rem;">Nessun tavolo configurato</li>';
    return;
  }

  tables.forEach(table => {
    const li = document.createElement('li');
    li.className = 'admin-data-item';
    li.innerHTML = `
      <div>
        <div class="admin-item-title">${table.name}</div>
        <div class="admin-item-subtitle">Stato: ${table.status.toUpperCase()} | ID: ${table.id}</div>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit-touch btn-edit-table">⚙️</button>
        <button class="btn-delete-touch btn-del-table">&times;</button>
      </div>
    `;
    
    li.querySelector('.btn-edit-table').addEventListener('click', () => {
      editingTableId = table.id;
      document.getElementById('new-table-name').value = table.name;
      document.getElementById('table-form-title').textContent = `Modifica: ${table.name}`;
      document.getElementById('btn-submit-table').textContent = 'Salva Modifiche';
      btnCancelTableEdit.style.display = 'block';
      document.getElementById('new-table-name').focus();
    });

    li.querySelector('.btn-del-table').addEventListener('click', async () => {
      if (table.status !== 'libero') {
        showToast('Impossibile eliminare un tavolo occupato o in chiusura!', 'error');
        return;
      }
      if (confirm(`Sei sicuro di voler eliminare il "${table.name}"?`)) {
        try {
          await ApiClient.deleteTable(table.id);
          showToast('Tavolo eliminato', 'success');
          if (editingTableId === table.id) resetTableForm();
          refreshAdminData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
    
    adminTablesList.appendChild(li);
  });
}

function renderAdminCategories(categories) {
  adminCategoriesList.innerHTML = '';
  if (categories.length === 0) {
    adminCategoriesList.innerHTML = '<li class="text-muted" style="padding: 1rem;">Nessuna categoria</li>';
    return;
  }

  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'admin-data-item';
    const prodCount = menuData.products.filter(p => p.category_id === cat.id).length;
    
    li.innerHTML = `
      <div>
        <div class="admin-item-title">${cat.icon} ${cat.name}</div>
        <div class="admin-item-subtitle">ID: ${cat.id} | Prodotti: ${prodCount}</div>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit-touch btn-edit-cat">⚙️</button>
        <button class="btn-delete-touch btn-del-cat">&times;</button>
      </div>
    `;
    
    li.querySelector('.btn-edit-cat').addEventListener('click', () => {
      editingCategoryId = cat.id;
      const idInput = document.getElementById('new-cat-id');
      idInput.value = cat.id;
      idInput.readOnly = true;
      document.getElementById('new-cat-name').value = cat.name;
      document.getElementById('new-cat-icon').value = cat.icon;
      document.getElementById('category-form-title').textContent = `Modifica: ${cat.name}`;
      document.getElementById('btn-submit-category').textContent = 'Salva Modifiche';
      btnCancelCatEdit.style.display = 'block';
      document.getElementById('new-cat-name').focus();
    });

    li.querySelector('.btn-del-cat').addEventListener('click', async () => {
      const msg = prodCount > 0 
        ? `⚠️ Attenzione! Rimuovendo questa categoria eliminerai anche tutti i ${prodCount} prodotti ad essa associati. Vuoi procedere?`
        : `Eliminare la categoria "${cat.name}"?`;
      if (confirm(msg)) {
        try {
          await ApiClient.deleteCategory(cat.id);
          showToast('Categoria rimossa', 'success');
          if (editingCategoryId === cat.id) resetCategoryForm();
          await refreshMenu();
          refreshAdminData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
    
    adminCategoriesList.appendChild(li);
  });
}

function renderAdminProducts(products) {
  adminProductsList.innerHTML = '';
  if (products.length === 0) {
    adminProductsList.innerHTML = '<li class="text-muted" style="padding: 1rem;">Nessun prodotto</li>';
    return;
  }

  const categories = menuData.categories || [];
  
  categories.forEach(cat => {
    const catProducts = products.filter(p => p.category_id === cat.id);
    
    const headerLi = document.createElement('li');
    headerLi.className = 'admin-category-group-header';
    headerLi.innerHTML = `
      <span class="category-group-icon">${cat.icon}</span>
      <span class="category-group-name">${cat.name}</span>
      <span class="category-group-count">(${catProducts.length})</span>
    `;
    adminProductsList.appendChild(headerLi);
    
    if (catProducts.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'admin-data-item admin-data-item-empty';
      emptyLi.style.opacity = '0.5';
      emptyLi.innerHTML = '<span class="text-muted" style="font-size: 0.8rem; margin: auto;">Nessun prodotto</span>';
      adminProductsList.appendChild(emptyLi);
    } else {
      catProducts.forEach(prod => {
        const li = document.createElement('li');
        li.className = 'admin-data-item';
        
        const variantsCount = prod.customizations.variants ? prod.customizations.variants.length : 0;
        const addonsCount = prod.customizations.add_ons ? prod.customizations.add_ons.length : 0;
        
        li.innerHTML = `
          <div>
            <div class="admin-item-title">${prod.name}</div>
            <div class="admin-item-subtitle">
              Prezzo: ${(prod.price_cents / 100).toFixed(2)} € <br>
              Varianti: ${variantsCount} | Aggiunte: ${addonsCount} | ID: ${prod.id}
            </div>
          </div>
          <div class="admin-item-actions">
            <button class="btn-edit-touch btn-edit-prod">⚙️</button>
            <button class="btn-delete-touch btn-del-prod">&times;</button>
          </div>
        `;
        
        li.querySelector('.btn-edit-prod').addEventListener('click', () => {
          editingProductId = prod.id;
          document.getElementById('new-prod-name').value = prod.name;
          document.getElementById('new-prod-cat').value = prod.category_id;
          document.getElementById('new-prod-price').value = (prod.price_cents / 100).toFixed(2);
          document.getElementById('new-prod-variants').value = prod.customizations.variants 
            ? prod.customizations.variants.join(', ') 
            : '';
          const addons = prod.customizations.add_ons || [];
          document.getElementById('new-prod-addons').value = addons
            .map(a => `${a.name}:${a.price_cents}`)
            .join(', ');
          
          document.getElementById('product-form-title').textContent = `Modifica: ${prod.name}`;
          document.getElementById('btn-submit-product').textContent = 'Salva Modifiche';
          btnCancelProdEdit.style.display = 'block';
          document.getElementById('new-prod-name').focus();
        });

        li.querySelector('.btn-del-prod').addEventListener('click', async () => {
          if (confirm(`Eliminare il prodotto "${prod.name}" dal menu?`)) {
            try {
              await ApiClient.deleteProduct(prod.id);
              showToast('Prodotto eliminato', 'success');
              if (editingProductId === prod.id) resetProductForm();
              await refreshMenu();
              refreshAdminData();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
        adminProductsList.appendChild(li);
      });
    }
  });
}

// --- SETUP LISTENERS EVENTI ---
function setupEventListeners() {
  // Sidebar Nav
  btnNavTables.addEventListener('click', () => showScreen('tables'));
  btnNavAdmin.addEventListener('click', () => showScreen('admin'));
  btnNavSondaggio.addEventListener('click', () => showScreen('sondaggio'));
  
  // Refresh Manuale
  btnRefresh.addEventListener('click', () => {
    showToast('Aggiornamento in corso...', 'info');
    loadTables();
    if (currentScreen === 'orders') {
      loadOrdersSummary();
    } else if (currentScreen === 'sondaggio') {
      loadSondaggio();
    }
  });
  
  // Admin Sotto-Tab
  adminTabTables.addEventListener('click', () => showAdminTab('tables'));
  adminTabCategories.addEventListener('click', () => showAdminTab('categories'));
  adminTabProducts.addEventListener('click', () => showAdminTab('products'));
  
  // Pulsanti Annulla Modifica Admin
  btnCancelTableEdit.addEventListener('click', resetTableForm);
  btnCancelCatEdit.addEventListener('click', resetCategoryForm);
  btnCancelProdEdit.addEventListener('click', resetProductForm);
  
  // Submissions dei form di amministrazione
  formAddTable.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-table-name');
    const name = input.value.trim();
    if (!name) return;
    try {
      if (editingTableId !== null) {
        await ApiClient.updateTable(editingTableId, name);
        showToast(`Tavolo aggiornato!`, 'success');
        resetTableForm();
      } else {
        await ApiClient.addTable(name);
        showToast(`Tavolo "${name}" creato!`, 'success');
        input.value = '';
      }
      refreshAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  formAddCategory.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idInput = document.getElementById('new-cat-id');
    const nameInput = document.getElementById('new-cat-name');
    const iconInput = document.getElementById('new-cat-icon');
    const id = idInput.value.trim().toLowerCase();
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim();
    if (!name || !icon) return;
    try {
      if (editingCategoryId !== null) {
        await ApiClient.updateCategory(editingCategoryId, name, icon);
        showToast(`Categoria aggiornata!`, 'success');
        resetCategoryForm();
      } else {
        if (!id) return;
        await ApiClient.addCategory(id, name, icon);
        showToast(`Categoria "${name}" creata!`, 'success');
        idInput.value = '';
        nameInput.value = '';
        iconInput.value = '';
      }
      await refreshMenu();
      refreshAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  formAddProduct.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-prod-name');
    const catSelect = document.getElementById('new-prod-cat');
    const priceInput = document.getElementById('new-prod-price');
    const variantsInput = document.getElementById('new-prod-variants');
    const addonsInput = document.getElementById('new-prod-addons');

    const name = nameInput.value.trim();
    const category_id = catSelect.value;
    const priceVal = parseFloat(priceInput.value);
    
    if (!name || !category_id || isNaN(priceVal)) return;

    const price_cents = Math.round(priceVal * 100);
    const variantsText = variantsInput.value.trim();
    const variants = variantsText 
      ? variantsText.split(',').map(v => v.trim()).filter(v => v !== '') 
      : [];

    const addonsText = addonsInput.value.trim();
    const add_ons = [];
    if (addonsText) {
      const parts = addonsText.split(',');
      for (const part of parts) {
        const subparts = part.split(':');
        if (subparts.length >= 1) {
          const addOnName = subparts[0].trim();
          let addOnPrice = 0;
          if (subparts.length >= 2) {
            addOnPrice = parseInt(subparts[1].trim()) || 0;
          }
          if (addOnName) {
            add_ons.push({ name: addOnName, price_cents: addOnPrice });
          }
        }
      }
    }

    try {
      const productPayload = {
        name,
        category_id,
        price_cents,
        customizations: { variants, add_ons }
      };

      if (editingProductId !== null) {
        await ApiClient.updateProduct(editingProductId, productPayload);
        showToast(`Prodotto "${name}" aggiornato!`, 'success');
        resetProductForm();
      } else {
        await ApiClient.addProduct(productPayload);
        showToast(`Prodotto "${name}" aggiunto!`, 'success');
        nameInput.value = '';
        priceInput.value = '';
        variantsInput.value = '';
        addonsInput.value = '';
      }
      await refreshMenu();
      refreshAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Riepilogo Ordini Nav & Filtri
  btnNavOrders.addEventListener('click', () => showScreen('orders'));
  
  document.getElementById('btn-filter-apply').addEventListener('click', () => {
    showToast('Aggiornamento riepilogo...', 'info');
    loadOrdersSummary();
  });
  
  document.getElementById('btn-filter-today').addEventListener('click', () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    setFilterRange(todayStart, todayEnd);
    showToast('Filtro impostato su Oggi', 'success');
    loadOrdersSummary();
  });

  document.getElementById('btn-filter-yesterday').addEventListener('click', () => {
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    setFilterRange(yesterdayStart, yesterdayEnd);
    showToast('Filtro impostato su Ieri', 'success');
    loadOrdersSummary();
  });

  document.getElementById('btn-filter-all').addEventListener('click', () => {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    showToast('Filtro temporale rimosso', 'success');
    loadOrdersSummary();
  });

  // Sondaggio Nav & Filtri
  document.getElementById('btn-sondaggio-apply').addEventListener('click', () => {
    showToast('Aggiornamento statistiche...', 'info');
    loadSondaggio();
  });
  
  document.getElementById('btn-sondaggio-today').addEventListener('click', () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    setSondaggioFilterRange(todayStart, todayEnd);
    showToast('Filtro Sondaggio impostato su Oggi', 'success');
    loadSondaggio();
  });

  document.getElementById('btn-sondaggio-yesterday').addEventListener('click', () => {
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    setSondaggioFilterRange(yesterdayStart, yesterdayEnd);
    showToast('Filtro Sondaggio impostato su Ieri', 'success');
    loadSondaggio();
  });

  document.getElementById('btn-sondaggio-all').addEventListener('click', () => {
    document.getElementById('sondaggio-date-from').value = '';
    document.getElementById('sondaggio-date-to').value = '';
    showToast('Filtro temporale Sondaggio rimosso', 'success');
    loadSondaggio();
  });
}

// --- AVVIO DASHBOARD ---
async function initDashboard() {
  await refreshMenu();
  setupEventListeners();
  loadTables();
}

document.addEventListener('DOMContentLoaded', initDashboard);
