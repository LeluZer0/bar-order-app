import { ApiClient } from './api.js';
import { CartState } from './cart.js';

// --- CONFIGURAZIONE E STATO APPLICAZIONE ---
let currentScreen = 'tables'; // 'tables' | 'order' | 'admin'
let activeTable = null; // Oggetto Tavolo attivo
let menuData = null; // { categories: [...], products: [...] }
let selectedCategory = null; // Categoria menu selezionata
let currentOrderDetails = null; // Ordine attivo del tavolo correntemente visualizzato
let currentAdminTab = 'tables'; // 'tables' | 'categories' | 'products'

// Stati di modifica sezione Amministrazione
let editingTableId = null;
let editingCategoryId = null;
let editingProductId = null;

// Stato per la personalizzazione del prodotto nel Modale
let modalProduct = null;
let modalCustoms = { variant: '', add_ons: [] };
let modalQty = 1;

// --- ELEMENTI DEL DOM ---
const screenTables = document.getElementById('screen-tables');
const screenOrder = document.getElementById('screen-order');
const screenAdmin = document.getElementById('screen-admin');
const navTables = document.getElementById('nav-tables');
const navOrder = document.getElementById('nav-order');
const navAdmin = document.getElementById('nav-admin');

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

// Elementi DOM Sezione Gestione (Admin)
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

// Bottoni Annulla Modifica
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
  screenOrder.classList.remove('active');
  screenAdmin.classList.remove('active');
  navTables.classList.remove('active');
  navOrder.classList.remove('active');
  navAdmin.classList.remove('active');
  
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
  } else if (screenId === 'admin') {
    screenAdmin.classList.add('active');
    navAdmin.classList.add('active');
    cartSidebar.classList.remove('active');
    resetAllAdminForms();
    refreshAdminData();
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
  const nameInput = document.getElementById('new-table-name');
  nameInput.value = '';
  editingTableId = null;
  
  document.querySelector('#admin-view-tables .admin-form-box h4').textContent = 'Aggiungi Nuovo Tavolo';
  document.getElementById('btn-submit-table').textContent = 'Aggiungi Tavolo';
  btnCancelTableEdit.style.display = 'none';
}

function resetCategoryForm() {
  const idInput = document.getElementById('new-cat-id');
  const nameInput = document.getElementById('new-cat-name');
  const iconInput = document.getElementById('new-cat-icon');
  
  idInput.value = '';
  idInput.readOnly = false;
  nameInput.value = '';
  iconInput.value = '';
  editingCategoryId = null;
  
  document.querySelector('#admin-view-categories .admin-form-box h4').textContent = 'Aggiungi Categoria';
  document.getElementById('btn-submit-category').textContent = 'Aggiungi Categoria';
  btnCancelCatEdit.style.display = 'none';
}

function resetProductForm() {
  const nameInput = document.getElementById('new-prod-name');
  const priceInput = document.getElementById('new-prod-price');
  const variantsInput = document.getElementById('new-prod-variants');
  const addonsInput = document.getElementById('new-prod-addons');
  
  nameInput.value = '';
  priceInput.value = '';
  variantsInput.value = '';
  addonsInput.value = '';
  editingProductId = null;
  
  document.querySelector('#admin-view-products .admin-form-box h4').textContent = 'Aggiungi Prodotto';
  document.getElementById('btn-submit-product').textContent = 'Aggiungi Prodotto';
  btnCancelProdEdit.style.display = 'none';
}

function resetAllAdminForms() {
  resetTableForm();
  resetCategoryForm();
  resetProductForm();
}

// --- LOGICA DI CARICAMENTO DATI ---

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
    populateAdminCategorySelect();
    
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
    
    card.innerHTML = `
      <div class="table-num">${table.name}</div>
      <span class="table-status-badge">${statusText}</span>
      <div class="table-amount" id="table-amount-${table.id}">-- €</div>
    `;
    
    if (table.current_order_id) {
      ApiClient.getOrder(table.current_order_id)
        .then(order => {
          const amountDiv = document.getElementById(`table-amount-${table.id}`);
          if (amountDiv) {
            amountDiv.textContent = `${(order.total_amount_cents / 100).toFixed(2)} €`;
          }
        })
        .catch(err => console.error(err));
    } else {
      const amountDiv = card.querySelector('.table-amount');
      amountDiv.style.opacity = '0.3';
      amountDiv.textContent = '0.00 €';
    }
    
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

// --- LOGICA DI RENDERING SEZIONE ADMIN ---

async function refreshAdminData() {
  if (currentAdminTab === 'tables') {
    try {
      const tables = await ApiClient.getTables();
      renderAdminTables(tables);
    } catch (err) {
      showToast('Errore caricamento tavoli admin', 'error');
    }
  } else if (currentAdminTab === 'categories') {
    try {
      renderAdminCategories(menuData.categories);
    } catch (err) {
      showToast('Errore caricamento categorie admin', 'error');
    }
  } else if (currentAdminTab === 'products') {
    try {
      renderAdminProducts(menuData.products);
    } catch (err) {
      showToast('Errore caricamento prodotti admin', 'error');
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

// Renderizzazione Lista Tavoli Gestione (con Modifica ed Eliminazione)
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
    
    // Click su Modifica (⚙️)
    li.querySelector('.btn-edit-table').addEventListener('click', () => {
      editingTableId = table.id;
      document.getElementById('new-table-name').value = table.name;
      
      document.querySelector('#admin-view-tables .admin-form-box h4').textContent = `Modifica: ${table.name}`;
      document.getElementById('btn-submit-table').textContent = 'Salva Modifiche';
      btnCancelTableEdit.style.display = 'block';
      
      document.getElementById('new-table-name').focus();
    });

    // Click su Elimina (X)
    li.querySelector('.btn-del-table').addEventListener('click', async () => {
      if (table.status !== 'libero') {
        showToast('Impossibile eliminare un tavolo occupato o in chiusura!', 'error');
        return;
      }
      if (confirm(`Sei sicuro di voler eliminare il "${table.name}"?`)) {
        try {
          await ApiClient.deleteTable(table.id);
          showToast('Tavolo eliminato con successo', 'success');
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

// Renderizzazione Lista Categorie Gestione (con Modifica ed Eliminazione)
function renderAdminCategories(categories) {
  adminCategoriesList.innerHTML = '';
  
  if (categories.length === 0) {
    adminCategoriesList.innerHTML = '<li class="text-muted" style="padding: 1rem;">Nessuna categoria configurata</li>';
    return;
  }

  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'admin-data-item';
    
    const prodCount = menuData.products.filter(p => p.category_id === cat.id).length;
    
    li.innerHTML = `
      <div>
        <div class="admin-item-title">${cat.icon} ${cat.name}</div>
        <div class="admin-item-subtitle">ID Categoria: ${cat.id} | Prodotti associati: ${prodCount}</div>
      </div>
      <div class="admin-item-actions">
        <button class="btn-edit-touch btn-edit-cat">⚙️</button>
        <button class="btn-delete-touch btn-del-cat">&times;</button>
      </div>
    `;
    
    // Click su Modifica (⚙️)
    li.querySelector('.btn-edit-cat').addEventListener('click', () => {
      editingCategoryId = cat.id;
      
      const idInput = document.getElementById('new-cat-id');
      idInput.value = cat.id;
      idInput.readOnly = true; // Impedisci modifica ID per integrità database
      
      document.getElementById('new-cat-name').value = cat.name;
      document.getElementById('new-cat-icon').value = cat.icon;
      
      document.querySelector('#admin-view-categories .admin-form-box h4').textContent = `Modifica: ${cat.name}`;
      document.getElementById('btn-submit-category').textContent = 'Salva Modifiche';
      btnCancelCatEdit.style.display = 'block';
      
      document.getElementById('new-cat-name').focus();
    });

    // Click su Elimina (X)
    li.querySelector('.btn-del-cat').addEventListener('click', async () => {
      const msg = prodCount > 0 
        ? `⚠️ ATTENZIONE: La categoria contiene ${prodCount} prodotti. La cancellazione eliminerà A CASCATA sia la categoria che tutti questi prodotti. Vuoi procedere?`
        : `Sei sicuro di voler eliminare la categoria "${cat.name}"?`;
      
      if (confirm(msg)) {
        try {
          await ApiClient.deleteCategory(cat.id);
          showToast('Categoria (e prodotti) rimossi correttamente', 'success');
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

// Renderizzazione Lista Prodotti Gestione (con Modifica ed Eliminazione)
function renderAdminProducts(products) {
  adminProductsList.innerHTML = '';
  
  if (products.length === 0) {
    adminProductsList.innerHTML = '<li class="text-muted" style="padding: 1rem;">Nessun prodotto configurato</li>';
    return;
  }

  const categories = menuData.categories || [];
  
  // Renderizza i prodotti per ciascuna categoria
  categories.forEach(cat => {
    const catProducts = products.filter(p => p.category_id === cat.id);
    
    // Mostriamo l'intestazione della categoria
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
      emptyLi.style.justifyContent = 'center';
      emptyLi.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">Nessun prodotto in questa categoria</span>';
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
        
        // Click su Modifica (⚙️)
        li.querySelector('.btn-edit-prod').addEventListener('click', () => {
          editingProductId = prod.id;
          
          document.getElementById('new-prod-name').value = prod.name;
          document.getElementById('new-prod-cat').value = prod.category_id;
          document.getElementById('new-prod-price').value = (prod.price_cents / 100).toFixed(2);
          
          // Carica varianti
          document.getElementById('new-prod-variants').value = prod.customizations.variants 
            ? prod.customizations.variants.join(', ') 
            : '';
            
          // Carica aggiunte extra formatandole in Nome:Prezzo
          const addons = prod.customizations.add_ons || [];
          document.getElementById('new-prod-addons').value = addons
            .map(a => `${a.name}:${a.price_cents}`)
            .join(', ');
          
          document.querySelector('#admin-view-products .admin-form-box h4').textContent = `Modifica: ${prod.name}`;
          document.getElementById('btn-submit-product').textContent = 'Salva Modifiche';
          btnCancelProdEdit.style.display = 'block';
          
          document.getElementById('new-prod-name').focus();
        });

        // Click su Elimina (X)
        li.querySelector('.btn-del-prod').addEventListener('click', async () => {
          if (confirm(`Sei sicuro di voler eliminare il prodotto "${prod.name}" dal menu?`)) {
            try {
              await ApiClient.deleteProduct(prod.id);
              showToast('Prodotto rimosso dal menu', 'success');
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

  // Prodotti senza categoria o con categoria non trovata
  const uncategorizedProducts = products.filter(p => !categories.some(c => c.id === p.category_id));
  if (uncategorizedProducts.length > 0) {
    const headerLi = document.createElement('li');
    headerLi.className = 'admin-category-group-header';
    headerLi.innerHTML = `
      <span class="category-group-icon">📦</span>
      <span class="category-group-name">Nessuna Categoria / Altro</span>
      <span class="category-group-count">(${uncategorizedProducts.length})</span>
    `;
    adminProductsList.appendChild(headerLi);
    
    uncategorizedProducts.forEach(prod => {
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
      
      // Click su Modifica (⚙️)
      li.querySelector('.btn-edit-prod').addEventListener('click', () => {
        editingProductId = prod.id;
        
        document.getElementById('new-prod-name').value = prod.name;
        document.getElementById('new-prod-cat').value = prod.category_id;
        document.getElementById('new-prod-price').value = (prod.price_cents / 100).toFixed(2);
        
        // Carica varianti
        document.getElementById('new-prod-variants').value = prod.customizations.variants 
          ? prod.customizations.variants.join(', ') 
          : '';
          
        // Carica aggiunte extra formatandole in Nome:Prezzo
        const addons = prod.customizations.add_ons || [];
        document.getElementById('new-prod-addons').value = addons
          .map(a => `${a.name}:${a.price_cents}`)
          .join(', ');
        
        document.querySelector('#admin-view-products .admin-form-box h4').textContent = `Modifica: ${prod.name}`;
        document.getElementById('btn-submit-product').textContent = 'Salva Modifiche';
        btnCancelProdEdit.style.display = 'block';
        
        document.getElementById('new-prod-name').focus();
      });

      // Click su Elimina (X)
      li.querySelector('.btn-del-prod').addEventListener('click', async () => {
        if (confirm(`Sei sicuro di voler eliminare il prodotto "${prod.name}" dal menu?`)) {
          try {
            await ApiClient.deleteProduct(prod.id);
            showToast('Prodotto rimosso dal menu', 'success');
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
  
  modalCustoms.variant = product.customizations.variants && product.customizations.variants.length > 0 
    ? product.customizations.variants[0] 
    : '';
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
        modalCustoms.variant = v;
        variantsOptions.querySelectorAll('.pill-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
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
  navAdmin.addEventListener('click', () => showScreen('admin'));
  
  // Admin Sotto-Tab
  adminTabTables.addEventListener('click', () => showAdminTab('tables'));
  adminTabCategories.addEventListener('click', () => showAdminTab('categories'));
  adminTabProducts.addEventListener('click', () => showAdminTab('products'));
  
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
    
    CartState.addItem(modalProduct, modalCustoms, itemCustomNotes.value.trim(), modalQty);
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
    
    if (confirm(`Confermi il saldo di ${(currentOrderDetails.total_amount_cents / 100).toFixed(2)} € e la liberazione del tavolo?`)) {
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

  // --- Pulsanti Annulla Modifica ---
  btnCancelTableEdit.addEventListener('click', resetTableForm);
  btnCancelCatEdit.addEventListener('click', resetCategoryForm);
  btnCancelProdEdit.addEventListener('click', resetProductForm);

  // --- SUBMISSIONS DEI FORM DI AMMINISTRAZIONE ---

  // 1. Form Aggiungi/Modifica Tavolo
  formAddTable.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-table-name');
    const name = input.value.trim();
    if (!name) return;

    try {
      if (editingTableId !== null) {
        // Modalità Modifica (PUT)
        await ApiClient.updateTable(editingTableId, name);
        showToast(`Tavolo aggiornato in "${name}"!`, 'success');
        resetTableForm();
      } else {
        // Modalità Aggiunta (POST)
        await ApiClient.addTable(name);
        showToast(`Tavolo "${name}" creato!`, 'success');
        input.value = '';
      }
      refreshAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 2. Form Aggiungi/Modifica Categoria
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
        // Modalità Modifica (PUT)
        await ApiClient.updateCategory(editingCategoryId, name, icon);
        showToast(`Categoria aggiornata in "${name}"!`, 'success');
        resetCategoryForm();
      } else {
        // Modalità Aggiunta (POST)
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

  // 3. Form Aggiungi/Modifica Prodotto
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
        customizations: {
          variants,
          add_ons
        }
      };

      if (editingProductId !== null) {
        // Modalità Modifica (PUT)
        await ApiClient.updateProduct(editingProductId, productPayload);
        showToast(`Prodotto "${name}" aggiornato!`, 'success');
        resetProductForm();
      } else {
        // Modalità Aggiunta (POST)
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
}

// --- AVVIO DELL'APPLICAZIONE ---
document.addEventListener('DOMContentLoaded', initApp);
