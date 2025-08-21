// Inventory and Transaction Types for Berjaya WMS

// Inventory Types
export interface InventoryItem {
  sku: string;
  name: string;
  total_amount: number;
  amount_logistics: number;
  [key: `amount_production_zone_${number}`]: number;
}

// Item Catalog (master list of all items) - DEPRECATED: Use ItemMaster instead
export interface CatalogItem {
  sku: string;
  name: string;
}

// Item Master List - Catalog of all available items
export interface ItemMaster {
  sku: string;           // Primary key, unique
  name: string;          // Item description
  category?: string;     // Optional: Item category
  unit?: string;         // Optional: Unit of measure (pcs, kg, etc)
  createdAt: Date;
  updatedAt: Date;
}

// BOM Component - Individual item in a BOM
export interface BOMComponent {
  sku: string;           // References ItemMaster.sku
  name: string;          // Cached from ItemMaster for display
  quantity: number;      // How many needed
  unit?: string;         // Unit of measure
}

// BOM (Bill of Materials) - Recipe/Assembly
export interface BOM {
  bomCode: string;       // Primary key, unique (e.g., "BOM001")
  name: string;          // BOM description (e.g., "Engine Assembly")
  description?: string;  // Optional detailed description
  components: BOMComponent[];  // List of components
  totalComponents: number;      // Sum of all quantities
  createdAt: Date;
  updatedAt: Date;
}

// Autocomplete Search Types
export interface SearchableItem {
  type: 'item' | 'bom';
  code: string;           // SKU for items, bomCode for BOMs
  name: string;
  description?: string;   // Additional context
  componentCount?: number; // For BOMs only
}

// Item Selection Result (what user actually selected)
export interface ItemSelection {
  type: 'item' | 'bom';
  code: string;
  name: string;
  selectedQuantity: number;
  // If BOM, this will be expanded to individual components
  expandedComponents?: Array<{
    sku: string;
    name: string;
    quantity: number;
  }>;
}

// Inventory Count Entry
export interface InventoryCountEntry {
  sku: string;
  itemName: string;
  amount: number;
  location: string;
  countedBy: string;
  timestamp: Date;
  notes?: string;
  bomOrigin?: {
    bomCode: string;
    bomName: string;
    bomQuantity: number;
    componentOriginalQty: number;
  };
}

// Simple count form data
export interface CountFormData {
  selectedSku: string;
  amount: number;
}

// Transaction Types - Enhanced for full transaction management
export enum TransactionType {
  COUNT = 'count',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out', 
  ADJUSTMENT = 'adjustment',
  INITIAL_STOCK = 'initial_stock'
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  CANCELLED = 'cancelled'
}

export interface Transaction {
  id: string;
  sku: string;
  itemName: string;
  amount: number;
  previousAmount: number; // For audit trail
  newAmount: number; // After transaction
  location: string; // 'logistics' or 'production_zone_N'
  fromLocation?: string; // For transfers
  toLocation?: string; // For transfers
  transactionType: TransactionType;
  status: TransactionStatus;
  performedBy: string;
  approvedBy?: string;
  timestamp: Date;
  notes?: string;
  reference?: string; // Purchase order, work order, etc.
}

// Transaction filtering and search
export interface TransactionFilter {
  sku?: string;
  location?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  performedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

// Transaction form data
export interface TransactionFormData {
  sku: string;
  amount: number;
  transactionType: TransactionType;
  location: string;
  fromLocation?: string;
  toLocation?: string;
  notes?: string;
  reference?: string;
}

// Scanner Types - v3.2.0 Barcode Integration
export interface ScanLookup {
  sku: string;           // Primary key - "A001", "B003", etc.
  targetZone: string;    // Zone identifier - supports numeric ("8", "15") or alphanumeric ("DF02", "Z001")
  itemName?: string;     // Optional item description
  expectedQuantity?: number;  // How many items should be in this zone
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;     // Email of user who last updated
}

export interface ScanResult {
  scannedCode: string;   // Raw barcode/QR content
  lookup?: ScanLookup;   // Primary lookup data (first match for compatibility)
  allLookups?: ScanLookup[]; // All zones for this SKU (multiple zones support)
  timestamp: Date;
  scannedBy: string;
}

export interface ScannerConfig {
  enableBeep: boolean;
  enableVibration: boolean;
  autoFocus: boolean;
  flashMode: 'auto' | 'on' | 'off';
}