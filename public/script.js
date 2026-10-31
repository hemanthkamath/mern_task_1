/**
 * NEXUS.LEDGER - Next-Gen Smart Inventory Management System
 * Full REST API Integration with Node.js & Express
 */

// Global State
let rawItems = [];
let isEditing = false;
let pendingDeleteId = null;
let currentCategoryFilter = 'all';
let currentViewMode = 'table'; // 'table' or 'grid'

// DOM Elements - Form
const itemForm = document.getElementById('item-form');
const itemIdInput = document.getElementById('item-id');
const itemNameInput = document.getElementById('item-name');
const itemCategoryInput = document.getElementById('item-category');
const itemPriceInput = document.getElementById('item-price');
const itemStockInput = document.getElementById('item-stock');
const itemSkuInput = document.getElementById('item-sku');
const submitBtn = document.getElementById('submit-btn');
const submitBtnText = document.getElementById('submit-btn-text');
const cancelBtn = document.getElementById('cancel-btn');
const formHeading = document.getElementById('form-heading');
const formDesc = document.getElementById('form-desc');
const modeBadge = document.getElementById('mode-badge');
const btnGenerateSku = document.getElementById('btn-generate-sku');

// Live Preview Elements
const previewTitleText = document.getElementById('preview-title-text');
const previewCatText = document.getElementById('preview-cat-text');
const previewSkuText = document.getElementById('preview-sku-text');
const previewPriceText = document.getElementById('preview-price-text');
const previewStatusPill = document.getElementById('preview-status-pill');

// DOM Elements - Table & Views
const itemsTbody = document.getElementById('items-tbody');
const tableViewContainer = document.getElementById('table-view-container');
const gridViewContainer = document.getElementById('grid-view-container');
const viewTableBtn = document.getElementById('view-table-btn');
const viewGridBtn = document.getElementById('view-grid-btn');

// DOM Elements - Search & Filters
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const statusFilter = document.getElementById('status-filter');
const sortSelect = document.getElementById('sort-select');
const categoryChipsContainer = document.getElementById('category-chips-container');
const itemCountBadge = document.getElementById('item-count-badge');
const refreshBtn = document.getElementById('refresh-btn');
const tableStatusText = document.getElementById('table-status-text');

// KPI Metric Elements
const statTotalItems = document.getElementById('stat-total-items');
const statTotalUnits = document.getElementById('stat-total-units');
const statTotalValue = document.getElementById('stat-total-value');
const statAvgPrice = document.getElementById('stat-avg-price');
const statLowStock = document.getElementById('stat-low-stock');
const statAlertBadge = document.getElementById('stat-alert-badge');
const kpiCardAlerts = document.getElementById('kpi-card-alerts');

// Header Utilities
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const resetCatalogBtn = document.getElementById('reset-catalog-btn');
const themeToggle = document.getElementById('theme-toggle');

// Modal Elements
const deleteModal = document.getElementById('delete-modal');
const deleteItemTitle = document.getElementById('delete-item-title');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Toast Container
const toastContainer = document.getElementById('toast-container');

/* ============================================================
   1. THEME MANAGEMENT (Dark / Light Mode)
   ============================================================ */
function initTheme() {
  const savedTheme = localStorage.getItem('nexus-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('nexus-theme', newTheme);
  showToast(`Switched to ${newTheme} mode`, 'info');
});

/* ============================================================
   2. DATA FETCHING (GET /items)
   ============================================================ */
async function fetchItems() {
  try {
    tableStatusText.textContent = 'Syncing inventory ledger...';
    const response = await fetch('/items');
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    rawItems = await response.json();
    renderWorkspace();
    tableStatusText.textContent = `Live synchronized at ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error('Fetch error:', error);
    showToast('Failed to connect to backend server', 'error');
    tableStatusText.textContent = 'Sync failed. Server unreachable.';
    itemsTbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-state-icon">!</div>
          <div class="empty-state-title">Backend Server Unreachable</div>
          <div class="empty-state-desc">Make sure Node/Express server is active on port 3000.</div>
        </td>
      </tr>
    `;
  }
}

/* ============================================================
   3. RENDERING PIPELINE (SEARCH + FILTERS + METRICS + VIEWS)
   ============================================================ */
function renderWorkspace() {
  updateMetrics(rawItems);

  const query = searchInput.value.trim().toLowerCase();
  clearSearchBtn.style.display = query ? 'flex' : 'none';

  const selectedStatus = statusFilter.value;

  // Multi-tier filtering
  let filtered = rawItems.filter(item => {
    // 1. Search Query
    if (query) {
      const matchName = item.name.toLowerCase().includes(query);
      const matchSku = (item.sku || '').toLowerCase().includes(query);
      const matchCat = (item.category || '').toLowerCase().includes(query);
      const matchPrice = item.price.toString().includes(query);
      if (!matchName && !matchSku && !matchCat && !matchPrice) return false;
    }

    // 2. Category Filter
    if (currentCategoryFilter !== 'all') {
      const cat = (item.category || 'General').toLowerCase();
      if (cat !== currentCategoryFilter.toLowerCase()) return false;
    }

    // 3. Status Filter
    const stock = item.stock !== undefined ? item.stock : 10;
    if (selectedStatus === 'in-stock' && stock <= 5) return false;
    if (selectedStatus === 'low-stock' && (stock > 5 || stock <= 0)) return false;
    if (selectedStatus === 'out-of-stock' && stock > 0) return false;

    return true;
  });

  // Sorting
  const sortOption = sortSelect.value;
  filtered.sort((a, b) => {
    switch (sortOption) {
      case 'id-asc':
        return a.id - b.id;
      case 'id-desc':
        return b.id - a.id;
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'stock-desc':
        return (b.stock || 0) - (a.stock || 0);
      case 'stock-asc':
        return (a.stock || 0) - (b.stock || 0);
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Item count badge
  if (query || currentCategoryFilter !== 'all' || selectedStatus !== 'all') {
    itemCountBadge.textContent = `${filtered.length} of ${rawItems.length} matched`;
  } else {
    itemCountBadge.textContent = `${rawItems.length} items total`;
  }

  // Render Table & Cards
  renderTable(filtered);
  renderGridCards(filtered);
}

function updateMetrics(items) {
  const count = items.length;
  let totalUnits = 0;
  let totalValuation = 0;
  let lowStockCount = 0;

  items.forEach(item => {
    const stock = item.stock !== undefined ? item.stock : 10;
    totalUnits += stock;
    totalValuation += item.price * stock;
    if (stock <= 5) {
      lowStockCount++;
    }
  });

  const avgPrice = count > 0 ? (items.reduce((s, i) => s + (Number(i.price) || 0), 0) / count) : 0;

  statTotalItems.textContent = count.toLocaleString();
  statTotalUnits.textContent = `${totalUnits.toLocaleString()} total units`;
  statTotalValue.textContent = formatCurrency(totalValuation);
  statAvgPrice.textContent = formatCurrency(avgPrice);
  statLowStock.textContent = lowStockCount;

  if (lowStockCount > 0) {
    statAlertBadge.textContent = `${lowStockCount} Needs Restock`;
    statAlertBadge.className = 'kpi-alert-badge has-alerts';
  } else {
    statAlertBadge.textContent = 'All Good';
    statAlertBadge.className = 'kpi-alert-badge';
  }
}

function getStatusDetails(stock) {
  if (stock <= 0) {
    return { label: 'Out of Stock', class: 'out-of-stock' };
  } else if (stock <= 5) {
    return { label: 'Low Stock', class: 'low-stock' };
  }
  return { label: 'In Stock', class: 'in-stock' };
}

/* ============================================================
   4. RENDER TABLE ROWS
   ============================================================ */
function renderTable(items) {
  itemsTbody.innerHTML = '';

  if (items.length === 0) {
    itemsTbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <div class="empty-state-title">No Inventory Records Found</div>
          <div class="empty-state-desc">Try clearing filters or search terms, or add a new item using the panel on the left.</div>
        </td>
      </tr>
    `;
    return;
  }

  items.forEach(item => {
    const isCurrentEditing = isEditing && itemIdInput.value == item.id;
    const stock = item.stock !== undefined ? item.stock : 10;
    const status = getStatusDetails(stock);
    const sku = item.sku || `SKU-${String(item.id).padStart(4, '0')}`;
    const category = item.category || 'General';

    const row = document.createElement('tr');
    if (isCurrentEditing) {
      row.classList.add('row-editing');
    }

    row.innerHTML = `
      <td class="cell-seq">#${String(item.id).padStart(2, '0')}</td>
      <td class="cell-name">
        <div class="cell-name-box">
          <span class="cell-name-title">${escapeHtml(item.name)}</span>
          <span class="cell-name-sku">${escapeHtml(sku)}</span>
        </div>
      </td>
      <td class="cell-cat">
        <span class="cat-pill">${escapeHtml(category)}</span>
      </td>
      <td class="cell-price">${formatCurrency(item.price)}</td>
      <td class="cell-stock">
        <div class="stock-stepper">
          <button type="button" class="step-btn" title="Decrease stock" onclick="handleStockAdjust(${item.id}, -1)">−</button>
          <span class="stock-num">${stock}</span>
          <button type="button" class="step-btn" title="Increase stock" onclick="handleStockAdjust(${item.id}, 1)">+</button>
        </div>
      </td>
      <td class="cell-status">
        <span class="status-pill ${status.class}">
          <span class="status-dot-sm"></span>
          ${status.label}
        </span>
      </td>
      <td class="cell-actions">
        <div class="action-btns">
          <button 
            type="button" 
            class="btn-icon-sm edit-btn" 
            title="Edit item" 
            onclick="handleEdit(${item.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon-sm" 
            title="Duplicate item" 
            onclick="handleDuplicate(${item.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button 
            type="button" 
            class="btn-icon-sm delete-btn" 
            title="Delete item" 
            onclick="promptDelete(${item.id}, '${escapeQuotes(item.name)}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;

    itemsTbody.appendChild(row);
  });
}

/* ============================================================
   5. RENDER GRID CARDS VIEW
   ============================================================ */
function renderGridCards(items) {
  gridViewContainer.innerHTML = '';

  if (items.length === 0) {
    gridViewContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-title">No Inventory Records Found</div>
        <div class="empty-state-desc">Try clearing filters or search terms.</div>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    const stock = item.stock !== undefined ? item.stock : 10;
    const status = getStatusDetails(stock);
    const sku = item.sku || `SKU-${String(item.id).padStart(4, '0')}`;
    const category = item.category || 'General';

    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <div class="card-top">
        <span class="card-seq">#${String(item.id).padStart(2, '0')}</span>
        <span class="cat-pill">${escapeHtml(category)}</span>
      </div>
      <div>
        <h3 class="card-title">${escapeHtml(item.name)}</h3>
        <span class="card-sku">${escapeHtml(sku)}</span>
      </div>
      <div class="card-stock-row">
        <span class="status-pill ${status.class}">
          <span class="status-dot-sm"></span>
          ${status.label}
        </span>
        <div class="stock-stepper">
          <button type="button" class="step-btn" title="Decrease stock" onclick="handleStockAdjust(${item.id}, -1)">−</button>
          <span class="stock-num">${stock}</span>
          <button type="button" class="step-btn" title="Increase stock" onclick="handleStockAdjust(${item.id}, 1)">+</button>
        </div>
      </div>
      <div class="card-price-row">
        <span class="card-price-label">Unit Price</span>
        <span class="card-price-val">${formatCurrency(item.price)}</span>
      </div>
      <div class="card-actions-row">
        <button type="button" class="btn btn-secondary" onclick="handleEdit(${item.id})">Edit</button>
        <button type="button" class="btn btn-secondary delete-btn" onclick="promptDelete(${item.id}, '${escapeQuotes(item.name)}')">Delete</button>
      </div>
    `;

    gridViewContainer.appendChild(card);
  });
}

/* ============================================================
   6. VIEW SWITCHER
   ============================================================ */
viewTableBtn.addEventListener('click', () => {
  currentViewMode = 'table';
  viewTableBtn.classList.add('active');
  viewGridBtn.classList.remove('active');
  tableViewContainer.style.display = 'block';
  gridViewContainer.style.display = 'none';
});

viewGridBtn.addEventListener('click', () => {
  currentViewMode = 'grid';
  viewGridBtn.classList.add('active');
  viewTableBtn.classList.remove('active');
  tableViewContainer.style.display = 'none';
  gridViewContainer.style.display = 'grid';
});

/* ============================================================
   7. FORM SUBMISSION (CREATE or UPDATE)
   ============================================================ */
itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = itemNameInput.value.trim();
  const category = itemCategoryInput.value;
  const price = parseFloat(itemPriceInput.value);
  const stock = parseInt(itemStockInput.value, 10) || 0;
  const sku = itemSkuInput.value.trim() || generateSku(category);

  if (!name || isNaN(price) || price < 0) {
    showToast('Please provide a valid item name and non-negative price', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtnText.textContent = isEditing ? 'Saving...' : 'Adding...';

  try {
    if (isEditing) {
      // UPDATE: PUT /items/:id
      const id = itemIdInput.value;
      const res = await fetch(`/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price, stock, sku })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update item.');
      }

      showToast(`Updated "${name}" successfully`, 'success');
    } else {
      // CREATE: POST /items
      const res = await fetch('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price, stock, sku })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create item.');
      }

      showToast(`Added "${name}" to ledger`, 'success');
    }

    resetForm();
    await fetchItems();
  } catch (err) {
    console.error('Submission error:', err);
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = isEditing ? 'Update Record' : 'Add to Ledger';
  }
});

/* ============================================================
   8. EDIT & DUPLICATE MODE
   ============================================================ */
window.handleEdit = function(id) {
  const item = rawItems.find(i => i.id === id);
  if (!item) return;

  isEditing = true;
  itemIdInput.value = item.id;
  itemNameInput.value = item.name;
  itemCategoryInput.value = item.category || 'General';
  itemPriceInput.value = item.price;
  itemStockInput.value = item.stock !== undefined ? item.stock : 10;
  itemSkuInput.value = item.sku || '';

  formHeading.textContent = `Edit Record #${id}`;
  formDesc.textContent = `Modifying properties for "${item.name}".`;
  modeBadge.textContent = 'UPDATE';
  modeBadge.classList.add('editing');

  submitBtnText.textContent = 'Update Record';
  cancelBtn.style.display = 'inline-flex';

  updateLivePreview();
  itemNameInput.focus();
  renderWorkspace();

  // Scroll smoothly to form on mobile screens
  if (window.innerWidth < 900) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.handleDuplicate = function(id) {
  const item = rawItems.find(i => i.id === id);
  if (!item) return;

  resetForm();
  itemNameInput.value = `${item.name} (Copy)`;
  itemCategoryInput.value = item.category || 'General';
  itemPriceInput.value = item.price;
  itemStockInput.value = item.stock || 10;
  itemSkuInput.value = generateSku(item.category || 'General');

  updateLivePreview();
  itemNameInput.focus();
  showToast(`Duplicated "${item.name}" into form`, 'info');
};

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  itemForm.reset();
  itemIdInput.value = '';
  isEditing = false;

  formHeading.textContent = 'Create Entry';
  formDesc.textContent = 'Add a new item to the in-memory ledger database.';
  modeBadge.textContent = 'NEW';
  modeBadge.classList.remove('editing');

  submitBtnText.textContent = 'Add to Ledger';
  cancelBtn.style.display = 'none';

  itemStockInput.value = '10';
  itemCategoryInput.value = 'Computing';
  itemSkuInput.value = '';

  updateLivePreview();
  renderWorkspace();
}

/* ============================================================
   9. QUICK STOCK ADJUSTMENT (PATCH /items/:id/stock)
   ============================================================ */
window.handleStockAdjust = async function(id, delta) {
  try {
    const res = await fetch(`/items/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });

    if (!res.ok) {
      throw new Error('Failed to update stock');
    }

    const updated = await res.json();
    const itemIndex = rawItems.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
      rawItems[itemIndex] = updated;
      renderWorkspace();
    }
  } catch (err) {
    console.error('Stock adjust error:', err);
    showToast('Failed to adjust stock', 'error');
  }
};

/* ============================================================
   10. LIVE PREVIEW UPDATE & SKU GENERATOR
   ============================================================ */
function updateLivePreview() {
  const name = itemNameInput.value.trim() || 'Product Name Placeholder';
  const cat = itemCategoryInput.value || 'General';
  const price = parseFloat(itemPriceInput.value) || 0;
  const stock = parseInt(itemStockInput.value, 10) || 0;
  const sku = itemSkuInput.value.trim() || 'SKU-AUTO-GEN';

  previewTitleText.textContent = name;
  previewCatText.textContent = cat;
  previewSkuText.textContent = sku;
  previewPriceText.textContent = formatCurrency(price);

  const status = getStatusDetails(stock);
  previewStatusPill.textContent = status.label;
  previewStatusPill.className = `preview-status ${status.class}`;
}

[itemNameInput, itemCategoryInput, itemPriceInput, itemStockInput, itemSkuInput].forEach(el => {
  el.addEventListener('input', updateLivePreview);
  el.addEventListener('change', updateLivePreview);
});

function generateSku(category) {
  const prefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SKU-${prefix}-${rand}`;
}

btnGenerateSku.addEventListener('click', () => {
  const cat = itemCategoryInput.value;
  itemSkuInput.value = generateSku(cat);
  updateLivePreview();
  showToast('Generated unique SKU', 'info');
});

/* ============================================================
   11. DELETE MODAL & CONFIRMATION (DELETE /items/:id)
   ============================================================ */
window.promptDelete = function(id, name) {
  pendingDeleteId = id;
  deleteItemTitle.textContent = `"${name}" (#${String(id).padStart(2, '0')})`;
  deleteModal.style.display = 'flex';
};

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.style.display = 'none';
  pendingDeleteId = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`/items/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete record.');
    }

    showToast('Record deleted and ledger serial numbers re-indexed', 'success');

    if (isEditing && itemIdInput.value == id) {
      resetForm();
    }

    deleteModal.style.display = 'none';
    pendingDeleteId = null;
    await fetchItems();
  } catch (err) {
    console.error('Delete error:', err);
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Confirm Delete';
  }
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.style.display = 'none';
    pendingDeleteId = null;
  }
});

/* ============================================================
   12. SEARCH, CATEGORY CHIPS & FILTER LISTENERS
   ============================================================ */
searchInput.addEventListener('input', renderWorkspace);

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchInput.focus();
  renderWorkspace();
});

statusFilter.addEventListener('change', renderWorkspace);
sortSelect.addEventListener('change', renderWorkspace);

// Category Chips
categoryChipsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip-btn');
  if (!btn) return;

  categoryChipsContainer.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentCategoryFilter = btn.dataset.cat;
  renderWorkspace();
});

// Click Low Stock KPI card to auto-filter
kpiCardAlerts.addEventListener('click', () => {
  statusFilter.value = 'low-stock';
  renderWorkspace();
  showToast('Filtered by Low Stock items (≤5 left)', 'info');
});

refreshBtn.addEventListener('click', () => {
  fetchItems();
  showToast('Inventory re-synchronized', 'info');
});

/* ============================================================
   13. EXPORT & CATALOG RESET
   ============================================================ */
exportCsvBtn.addEventListener('click', () => {
  if (rawItems.length === 0) {
    showToast('No items available to export', 'error');
    return;
  }

  const headers = ['Serial_No', 'Item_Name', 'Category', 'Unit_Price', 'Stock_Qty', 'SKU', 'Status', 'Total_Valuation'];
  const rows = rawItems.map(item => {
    const stock = item.stock !== undefined ? item.stock : 10;
    const valuation = item.price * stock;
    return [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category || 'General'}"`,
      item.price,
      stock,
      `"${item.sku || ''}"`,
      `"${item.status || 'In Stock'}"`,
      valuation
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `nexus-inventory-ledger-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported inventory as CSV', 'success');
});

exportJsonBtn.addEventListener('click', () => {
  if (rawItems.length === 0) {
    showToast('No items available to export', 'error');
    return;
  }

  const jsonStr = JSON.stringify(rawItems, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nexus-inventory-ledger-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Exported inventory as JSON', 'success');
});

resetCatalogBtn.addEventListener('click', async () => {
  if (!confirm('Reset the inventory back to default sample hardware & devices?')) return;

  try {
    const res = await fetch('/items/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Reset failed');
    await fetchItems();
    showToast('Restored default tech inventory catalog', 'success');
  } catch (err) {
    console.error('Reset error:', err);
    showToast('Failed to reset catalog', 'error');
  }
});

/* ============================================================
   14. KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener('keydown', (e) => {
  // Press '/' to search
  if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    searchInput.focus();
  }

  // Press 'Escape'
  if (e.key === 'Escape') {
    if (deleteModal.style.display === 'flex') {
      deleteModal.style.display = 'none';
      pendingDeleteId = null;
    } else if (isEditing) {
      resetForm();
    } else if (document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
      renderWorkspace();
    }
  }
});

/* ============================================================
   15. UTILITIES & TOAST NOTIFICATIONS
   ============================================================ */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeQuotes(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 3200);
}

// Initial bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchItems();
  updateLivePreview();
});
