# NEXUS.LEDGER — Next-Gen Smart Inventory & Asset Tracking System

A sleek, high-performance item management and inventory tracking web application built with **Node.js**, **Express**, and modern Vanilla JavaScript. Features continuous serial re-indexing, real-time omni-search, category filtering, low-stock alerts, dark/light theme switching, table & grid card views, stock steppers, and instant CSV/JSON exports.

---

## ✨ What's New & Upgraded

### 1. 📦 Re-imagined Inventory Catalog
Upgraded from basic default placeholders to a comprehensive modern high-end tech & device catalog:
- **MacBook Pro 16" M3 Max** (Computing, ₹2,49,900)
- **Sony WH-1000XM5 Wireless Headphones** (Audio, ₹29,990)
- **Keychron Q1 Pro Mechanical Keyboard** (Peripherals, ₹17,499)
- **Logitech MX Master 3S Mouse** (Peripherals, ₹8,995)
- **Dell UltraSharp 32" 4K USB-C Monitor** (Displays, ₹74,900)
- **Apple iPad Pro 11" M4** (Tablets, ₹99,900)
- **Samsung 990 PRO 2TB NVMe SSD** (Storage, ₹16,499)
- **Anker Prime 20,000mAh Power Bank** (Power, ₹11,999)
- **Elgato Stream Deck MK.2** (Streaming, ₹13,999)
- **Herman Miller Aeron Ergonomic Chair** (Furniture, ₹1,25,000)

### 2. 🎨 Re-designed Modern Dashboard UI
- **Dark & Light Mode Switcher**: Seamless toggle between sleek dark mode and crisp slate light mode with persistent settings.
- **Dual View Modes**: Switch on the fly between **High-Density Table View** and **Visual Product Grid Cards**.
- **Interactive Stock Stepper**: Increment or decrement stock quantity directly from any table row or product card (`+` / `−`) without entering edit mode.
- **Dynamic KPI Analytics Dashboard**:
  - **Total SKUs** & total unit inventory count.
  - **Total Inventory Valuation** (cumulative asset worth calculated from stock × unit price).
  - **Average Unit Price** across the catalog.
  - **Low Stock Alerts**: Interactive alert card highlighting critical items (≤ 5 units remaining); clicking it automatically filters low stock items.
- **Multi-dimensional Filtering & Search**:
  - Instant omni-search for item name, SKU, price threshold, or category (press `/` to focus).
  - Horizontal category quick-filter chips (**Computing**, **Audio**, **Peripherals**, **Displays**, **Tablets**, **Storage**, **Power**, **Streaming**, **Furniture**).
  - Stock status selector (**In Stock**, **Low Stock**, **Out of Stock**).
  - Sorting by Serial No, Unit Price, Stock Count, or Name.
- **Enhanced Product Creation / Edit Form**:
  - Live interactive preview card displaying product appearance in real-time as you type.
  - One-click auto SKU generator button.
  - Quick duplicate button on each row to clone items rapidly.
- **Data Export & Reset Tools**:
  - **Export as CSV**: Generates formatted spreadsheet with valuation breakdown.
  - **Export as JSON**: Direct full-payload backup.
  - **Reset Catalog**: One-click restore to demo items.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express 5 |
| **Frontend** | Modern Vanilla JavaScript (ES6+), Semantic HTML5, CSS3 Custom Properties |
| **Styling & Icons** | Glassmorphism, CSS Grid & Flexbox, SVG micro-icons |
| **Typography** | Inter & JetBrains Mono |
| **Data Format** | RESTful JSON API |

---

## 📡 REST API Reference

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/items` | Retrieve all items with sequential S/N | None | `200 OK` (Array of items) |
| `POST` | `/items` | Create a new item | `{ "name": string, "price": number, "category"?: string, "stock"?: number, "sku"?: string }` | `201 Created` (New item) |
| `PUT` | `/items/:id` | Update an existing item | `{ "name": string, "price": number, "category"?: string, "stock"?: number, "sku"?: string }` | `200 OK` (Updated item) |
| `PATCH` | `/items/:id/stock`| Quick increment/decrement stock | `{ "delta": number }` | `200 OK` (Updated item) |
| `DELETE` | `/items/:id` | Delete item & re-sequence IDs | None | `200 OK` (Status message & re-sequenced items) |
| `POST` | `/items/reset` | Reset catalog back to sample items | None | `200 OK` (Default items) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (Node Package Manager)

### Quick Start

1. **Navigate to the repository folder:**
   ```bash
   cd C:\Users\Lenovo\.gemini\antigravity\scratch\smart-inventory-ledger
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start the application server:**
   ```bash
   node server.js
   ```

4. **Launch the web application:**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
smart-inventory-ledger/
├── public/
│   ├── index.html        # Modern dashboard layout with dark/light mode & KPI cards
│   ├── script.js         # REST client, omni-search, category filters, CSV/JSON export, live preview
│   └── style.css         # SaaS design system, responsive grid, status badges & themes
├── server.js             # Express REST API, sequential ID auto-reindexing & stock controller
├── package.json          # Project metadata and Express dependency
└── README.md             # Project documentation & feature guide
```

---

## 📄 License
Open-source under the [ISC License](LICENSE).
