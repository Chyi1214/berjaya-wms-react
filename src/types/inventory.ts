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

// Multi-item transaction support - v7.6.0
export interface TransactionItem {
  sku: string;
  itemName: string;
  amount: number;
  previousAmount: number;
  newAmount: number;
}

export interface Transaction {
  id: string;
  // Legacy single-item fields (kept for backward compatibility)
  sku: string;
  itemName: string;
  amount: number;
  previousAmount: number; // For audit trail
  newAmount: number; // After transaction
  // Multi-item support (v7.6.0+)
  items?: TransactionItem[]; // Multiple items in one transaction
  location: string; // 'logistics' or 'production_zone_N'
  fromLocation?: string; // For transfers
  toLocation?: string; // For transfers
  transactionType: TransactionType;
  status: TransactionStatus;
  performedBy: string;
  approvedBy?: string;
  timestamp: Date;
  concludedAt?: Date; // When this transaction was included in period conclusion
  notes?: string;
  reference?: string; // Purchase order, work order, etc.
  batchId?: string; // Batch tracking for v6.5+ batch allocation system
  parentTransactionId?: string; // For cancellation/rectification tracking
  isRectification?: boolean; // True if this transaction reverses another
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
  batchId?: string; // Filter by batch
  includeRectifications?: boolean; // Show/hide rectification transactions
  showCrossBatchOnly?: boolean; // Show only cross-batch transfer transactions
}

// Transaction form data
export interface TransactionFormData {
  // Legacy single-item fields (kept for backward compatibility)
  sku: string;
  amount: number;
  // Multi-item support (v7.6.0+)
  items?: Array<{ sku: string; itemName: string; amount: number }>;
  transactionType: TransactionType;
  location: string;
  fromLocation?: string;
  toLocation?: string;
  notes?: string;
  reference?: string;
  batchId?: string;
}

// Scanner Types - v3.2.0 Barcode Integration
export interface ScanLookup {
  sku: string;           // Primary key - "A001", "B003", etc.
  carType: string;       // Car model (e.g., "TK1", "X70", "X50") - v7.19.0
  targetZone: string;    // Zone identifier - supports numeric ("8", "15") or alphanumeric ("DF02", "Z001")
  itemName?: string;     // Optional item description
  expectedQuantity?: number;  // How many items should be in this zone
  perCarQuantity?: number;    // Optional: Quantity needed per car - v7.19.0
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

// Batch Management Types - Section 5.3 Implementation
export interface CarType {
  carCode: string;          // Primary key (e.g., "TK1_Red_High", "T9_Blue_Low")
  name: string;             // Display name
  description?: string;     // Optional details
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchItem {
  sku: string;              // Component SKU
  quantity: number;         // Required quantity for this batch
  name: string;             // Component name (cached for display)
}

export interface Batch {
  batchId: string;          // Primary key (e.g., "603", "604") 
  name?: string;            // Optional batch description
  items: BatchItem[];       // All components in this batch
  carVins: string[];        // VIN numbers of cars in this batch
  carType: string;          // References CarType.carCode
  totalCars: number;        // Number of cars this batch should produce
  status: 'planning' | 'in_progress' | 'completed' | 'problematic';
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneBOMMapping {
  zoneId: string;           // Zone identifier (1-23, DF02, Z001, etc.)
  carCode: string;          // References CarType.carCode
  bomCode: string;          // References BOM.bomCode
  consumeOnCompletion: boolean;  // Whether to consume BOM when car marked complete
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchHealthCheck {
  batchId: string;          // References Batch.batchId
  healthStatus: 'healthy' | 'warning' | 'critical';
  availableComponents: number;  // How many cars can be completed with current inventory
  missingComponents: Array<{
    sku: string;
    name: string;
    needed: number;
    available: number;
    shortfall: number;
  }>;
  excessComponents: Array<{
    sku: string; 
    name: string;
    excess: number;
  }>;
  checkedAt: Date;
  checkedBy: string;
}

// Batch Planning Types - VIN plan and packing receipts (CSV-driven)
export interface VinPlan {
  batchId: string;      // Batch this VIN belongs to
  vin: string;          // Vehicle VIN
  carType: string;      // Variant code (e.g., TK1_Red_High)
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchReceiptLine {
  batchId: string;      // Batch reference
  sku: string;          // Component SKU
  quantity: number;     // Quantity received in this line
  location?: string;    // Optional location/area
  boxId?: string;       // Optional box identifier
  notes?: string;       // Optional notes
  uploadedAt: Date;
  uploadedBy: string;   // Email of uploader
}

export interface VinHealthResult {
  vin: string;
  carType: string;
  status: 'ready' | 'blocked';
  missing?: Array<{ sku: string; required: number; available: number; shortfall: number }>;
}

export interface BatchVinHealthSummary {
  batchId: string;
  totalVins: number;
  readyVins: number;
  blockedVins: number;
  topShortages: Array<{ sku: string; totalShortfall: number }>;
  checkedAt: Date;
}

export interface BatchVinHealthReport {
  summary: BatchVinHealthSummary;
  results: VinHealthResult[];
}

// Smart Batch Health Tracking - Efficient approach
export interface BatchRequirement {
  batchId: string;
  sku: string;
  name: string;
  totalNeeded: number;      // Original requirement from packing list
  consumed: number;         // How much has been used
  remaining: number;        // totalNeeded - consumed
  carsCompleted: number;    // How many cars have been finished
  totalCars: number;        // Total cars in batch
  updatedAt: Date;
  createdAt: Date;
}

export interface BatchHealthStatus {
  batchId: string;
  status: 'healthy' | 'warning' | 'critical';
  carsRemaining: number;
  totalCars: number;
  canProduceCars: number;      // How many more cars can be made
  blockedComponents: Array<{
    sku: string;
    name: string;
    needed: number;
    available: number;
    shortfall: number;
  }>;
  excessComponents: Array<{
    sku: string;
    name: string;
    excess: number;
  }>;
  checkedAt: Date;
}

// Batch Allocation System - Parallel Tracking (v6.5.0)

// Batch allocation tracking - parallel to core inventory
export interface BatchAllocation {
  sku: string;
  location: string;
  allocations: Record<string, number>; // { "807": 50, "808": 30, "DEFAULT": 100 }
  totalAllocated: number;
  lastUpdated: Date;
  createdAt: Date;
}

// Manager batch configuration
export interface BatchConfig {
  activeBatch: string;            // Current default batch (e.g., "808")
  availableBatches: string[];     // List of active batches ["807", "808", "809"]
  updatedBy: string;              // Manager who made the change
  updatedAt: Date;
  createdAt: Date;
}

// Batch progress summary
export interface BatchProgress {
  batchId: string;
  totalExpected: number;      // From BatchRequirement
  totalAllocated: number;     // From BatchAllocation
  completionPercentage: number;
  lastUpdated: Date;
}
