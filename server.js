const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON bodies
app.use(express.json());

// Serve static frontend files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Default sample inventory items (Modern Smart Devices & Hardware)
const INITIAL_ITEMS = [
  { id: 1, name: 'MacBook Pro 16" M3 Max', category: 'Computing', price: 249900, stock: 12, sku: 'TECH-MBP-16', status: 'In Stock' },
  { id: 2, name: 'Sony WH-1000XM5 Wireless Headphones', category: 'Audio', price: 29990, stock: 24, sku: 'AUD-SNY-XM5', status: 'In Stock' },
  { id: 3, name: 'Keychron Q1 Pro Mechanical Keyboard', category: 'Peripherals', price: 17499, stock: 18, sku: 'ACC-KEY-Q1P', status: 'In Stock' },
  { id: 4, name: 'Logitech MX Master 3S Mouse', category: 'Peripherals', price: 8995, stock: 35, sku: 'ACC-LOG-M3S', status: 'In Stock' },
  { id: 5, name: 'Dell UltraSharp 32" 4K USB-C Monitor', category: 'Displays', price: 74900, stock: 5, sku: 'DIS-DEL-U32', status: 'Low Stock' },
  { id: 6, name: 'Apple iPad Pro 11" M4 (256GB)', category: 'Tablets', price: 99900, stock: 15, sku: 'TAB-APL-P11', status: 'In Stock' },
  { id: 7, name: 'Samsung 990 PRO 2TB NVMe SSD', category: 'Storage', price: 16499, stock: 40, sku: 'STO-SAM-990', status: 'In Stock' },
  { id: 8, name: 'Anker Prime 20,000mAh Power Bank', category: 'Power', price: 11999, stock: 28, sku: 'PWR-ANK-20K', status: 'In Stock' },
  { id: 9, name: 'Elgato Stream Deck MK.2', category: 'Streaming', price: 13999, stock: 8, sku: 'STR-ELG-MK2', status: 'In Stock' },
  { id: 10, name: 'Herman Miller Aeron Ergonomic Chair', category: 'Furniture', price: 125000, stock: 3, sku: 'FUR-HMA-001', status: 'Low Stock' }
];

// In-memory data store with continuous sequential Serial Numbers (1, 2, ...)
let items = JSON.parse(JSON.stringify(INITIAL_ITEMS));

// Helper: Ensure all items in memory have consecutive sequential IDs (1, 2, 3...)
function reindexItems() {
  items.forEach((item, index) => {
    item.id = index + 1;
    if (item.stock !== undefined) {
      if (item.stock <= 0) item.status = 'Out of Stock';
      else if (item.stock <= 5) item.status = 'Low Stock';
      else item.status = 'In Stock';
    }
  });
}

// 1. GET /items - Retrieve all items
app.get('/items', (req, res) => {
  reindexItems();
  res.status(200).json(items);
});

// 2. POST /items - Create a new item (assigned next consecutive Serial No.)
app.post('/items', (req, res) => {
  const { name, price, category, stock, sku } = req.body;

  if (!name || price === undefined || price === null || isNaN(price)) {
    return res.status(400).json({ error: 'Valid name and price are required.' });
  }

  reindexItems();

  const stockQty = stock !== undefined && !isNaN(stock) ? Math.max(0, parseInt(stock, 10)) : 10;
  let computedStatus = 'In Stock';
  if (stockQty === 0) computedStatus = 'Out of Stock';
  else if (stockQty <= 5) computedStatus = 'Low Stock';

  const nextId = items.length + 1;
  const newItem = {
    id: nextId,
    name: name.trim(),
    price: Number(price),
    category: (category && category.trim()) || 'General',
    stock: stockQty,
    sku: (sku && sku.trim()) || `SKU-${String(nextId).padStart(4, '0')}`,
    status: computedStatus
  };

  items.push(newItem);
  res.status(201).json(newItem);
});

// 3. PUT /items/:id - Update an existing item
app.put('/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, price, category, stock, sku } = req.body;

  const itemIndex = items.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  if (!name || price === undefined || price === null || isNaN(price)) {
    return res.status(400).json({ error: 'Valid name and price are required.' });
  }

  items[itemIndex].name = name.trim();
  items[itemIndex].price = Number(price);

  if (category !== undefined) {
    items[itemIndex].category = category.trim() || 'General';
  }

  if (stock !== undefined && !isNaN(stock)) {
    const stockQty = Math.max(0, parseInt(stock, 10));
    items[itemIndex].stock = stockQty;
    if (stockQty === 0) items[itemIndex].status = 'Out of Stock';
    else if (stockQty <= 5) items[itemIndex].status = 'Low Stock';
    else items[itemIndex].status = 'In Stock';
  }

  if (sku !== undefined && sku.trim()) {
    items[itemIndex].sku = sku.trim();
  }

  res.status(200).json(items[itemIndex]);
});

// 4. PATCH /items/:id/stock - Quick adjust stock quantity
app.patch('/items/:id/stock', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { delta, stock } = req.body;

  const item = items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  if (stock !== undefined && !isNaN(stock)) {
    item.stock = Math.max(0, parseInt(stock, 10));
  } else if (delta !== undefined && !isNaN(delta)) {
    item.stock = Math.max(0, (item.stock || 0) + parseInt(delta, 10));
  }

  if (item.stock === 0) item.status = 'Out of Stock';
  else if (item.stock <= 5) item.status = 'Low Stock';
  else item.status = 'In Stock';

  res.status(200).json(item);
});

// 5. DELETE /items/:id - Remove an item and automatically re-sequence Serial Numbers
app.delete('/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const itemIndex = items.findIndex(item => item.id === id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  const deletedItem = items.splice(itemIndex, 1)[0];

  // Re-sequence so remaining items remain strictly in 1, 2, 3... order without gaps
  reindexItems();

  res.status(200).json({
    message: 'Item deleted successfully and serial numbers re-ordered.',
    item: deletedItem,
    items: items
  });
});

// 6. POST /items/reset - Reset to initial catalog
app.post('/items/reset', (req, res) => {
  items = JSON.parse(JSON.stringify(INITIAL_ITEMS));
  reindexItems();
  res.status(200).json({ message: 'Catalog reset to defaults', items });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
