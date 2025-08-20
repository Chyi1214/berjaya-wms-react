// TypeScript interfaces for the Berjaya WMS application

// User and Authentication Types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Application Roles - Enhanced for v4.1.0 Quality Assurance
export enum UserRole {
  DEV_ADMIN = 'devAdmin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  LOGISTICS = 'logistics',
  PRODUCTION = 'production',
  QA = 'qa',
  VIEWER = 'viewer'
}

// User Database Record (Firestore collection)
export interface UserRecord {
  email: string;
  role: UserRole;
  zone?: number;                    // For production workers
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// Granular Permissions System
export interface UserPermissions {
  // Inventory permissions
  inventory: {
    view: boolean;
    count: boolean;
    edit: boolean;
    delete: boolean;
  };
  
  // Transaction permissions
  transactions: {
    view: boolean;
    create: boolean;
    approve: boolean;
    cancel: boolean;
  };
  
  // Item Master permissions
  itemMaster: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  
  // BOM permissions
  bom: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  
  // CSV operations
  csv: {
    export: boolean;
    import: boolean;
  };
  
  // Scanner permissions (v3.2)
  scanner: {
    use: boolean;
    admin: boolean;
    bulkScan: boolean;
  };
  
  // Quality Assurance permissions (v4.1)
  qa: {
    view: boolean;
    performChecks: boolean;
    manageChecklists: boolean;
    viewReports: boolean;
  };
  
  // System permissions
  system: {
    userManagement: boolean;
    settings: boolean;
    auditLogs: boolean;
  };
}

// Permission Templates
export interface PermissionTemplate {
  name: string;
  description: string;
  permissions: UserPermissions;
}

// Enhanced User with Database Role
export interface AuthenticatedUser extends User {
  userRecord?: UserRecord | null;
  isDevAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

// Role Information
export interface RoleInfo {
  id: UserRole;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Navigation Types
export interface NavigationState {
  currentRole: UserRole | null;
  selectedZone: number | null;
  currentSection: string;
}

// Application Sections
export enum AppSection {
  LOGIN = 'login',
  ROLE_SELECTION = 'role_selection',
  LOGISTICS = 'logistics',
  PRODUCTION = 'production',
  MANAGER = 'manager',
  QA = 'qa'
}

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

// Component Props Types
export interface LoginProps {
  onLoginSuccess?: (user: User) => void;
  onLoginError?: (error: string) => void;
}

export interface RoleSelectionProps {
  user: User;
  onRoleSelect: (role: UserRole) => void;
  onLogout: () => void;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Firebase Error Types
export interface FirebaseError {
  code: string;
  message: string;
}

// Scanner Types - v3.2.0 Barcode Integration
export interface ScanLookup {
  sku: string;           // Primary key - "A001", "B003", etc.
  targetZone: number;    // Zone number 1-30
  itemName?: string;     // Optional item description
  expectedQuantity?: number;  // How many items should be in this zone
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;     // Email of user who last updated
}

export interface ScanResult {
  scannedCode: string;   // Raw barcode/QR content
  lookup?: ScanLookup;   // Found lookup data
  timestamp: Date;
  scannedBy: string;
}

export interface ScannerConfig {
  enableBeep: boolean;
  enableVibration: boolean;
  autoFocus: boolean;
  flashMode: 'auto' | 'on' | 'off';
}

// Version 4.0 Types - Car Tracking and Production Line Management

// Car Status Enum
export enum CarStatus {
  IN_PRODUCTION = 'in_production',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}

// Zone History Entry - tracks car movement through zones
export interface ZoneEntry {
  zoneId: number;           // Zone 1-23
  enteredAt: Date;
  exitedAt?: Date;          // null if still in zone
  enteredBy: string;        // User email who scanned car into zone
  completedBy?: string;     // User email who completed work
  timeSpent?: number;       // Minutes spent in zone (calculated)
  notes?: string;
}

// Car - Primary entity for production tracking
export interface Car {
  vin: string;              // Primary key - Standard 17-character VIN
  type: string;             // e.g., "Basic", "Premium", "Series3"
  color: string;            // e.g., "Red", "Blue", "Silver"
  series: string;           // Product series/model
  status: CarStatus;
  currentZone: number | null; // Current zone (1-23) or null if not in production
  
  // Timeline tracking
  zoneHistory: ZoneEntry[];   // Complete journey through production line
  createdAt: Date;           // When car entered production system
  completedAt?: Date;        // When car completed all production steps
  
  // Metadata
  totalProductionTime?: number; // Total minutes in production
  estimatedCompletion?: Date;   // Based on historical data
}

// Work Station Status - Real-time zone information
export interface WorkStation {
  zoneId: number;           // Zone 1-23
  currentCar?: {            // Car currently being worked on
    vin: string;
    type: string;
    color: string;
    enteredAt: Date;
    timeElapsed: number;    // Minutes since car entered zone
  };
  
  // Worker information
  currentWorker?: {
    email: string;
    displayName: string;
    checkedInAt: Date;
    timeWorking: number;    // Minutes checked in
  };
  
  // Zone statistics
  carsProcessedToday: number;
  averageProcessingTime: number; // Minutes per car
  lastUpdated: Date;
}

// Worker Activity - Clock in/out tracking
export interface WorkerActivity {
  id: string;               // Unique activity record ID
  workerEmail: string;      // Worker identifier
  workerName: string;       // Display name
  zoneId: number;          // Zone where activity occurred
  
  // Time tracking
  checkedInAt: Date;
  checkedOutAt?: Date;      // null if still checked in
  totalMinutes?: number;    // Calculated when checked out
  
  // Car association
  workedOnCar?: {
    vin: string;
    carType: string;
    workCompleted: boolean; // Did they complete work on this car?
  };
  
  // Activity metadata
  createdAt: Date;
  notes?: string;
}

// Car Movement Log - Audit trail for all car movements
export interface CarMovement {
  id: string;               // Unique movement ID
  vin: string;             // Car identifier
  
  // Movement details
  fromZone: number | null;  // Previous zone (null if entering production)
  toZone: number | null;    // Next zone (null if completing production)
  movedAt: Date;
  movedBy: string;          // User email who performed scan/action
  
  // Movement type
  movementType: 'scan_in' | 'complete' | 'transfer' | 'hold';
  
  // Metadata
  timeInPreviousZone?: number; // Minutes spent in previous zone
  notes?: string;
}

// Production Statistics - For manager dashboard
export interface ProductionStats {
  date: string;             // YYYY-MM-DD format
  
  // Daily totals
  carsStarted: number;      // Cars that entered production
  carsCompleted: number;    // Cars that finished production
  carsInProgress: number;   // Cars currently in zones
  
  // Time metrics
  averageProductionTime: number;    // Minutes per completed car
  totalProductionMinutes: number;   // All time spent on cars
  
  // Zone breakdown
  zoneStats: Array<{
    zoneId: number;
    carsProcessed: number;
    averageTimePerCar: number;
    currentlyOccupied: boolean;
  }>;
  
  // Worker metrics  
  workerStats: Array<{
    email: string;
    displayName: string;
    hoursWorked: number;
    carsWorkedOn: number;
  }>;
  
  lastCalculated: Date;
}

// Form Data Types for V4.0
export interface CarScanFormData {
  vin: string;
  type: string;
  color: string; 
  series: string;
  status: CarStatus;
  currentZone: number | null;
}

export interface WorkerCheckInData {
  zoneId: number;
  workerEmail: string;
  workerName: string;
  checkInTime: Date;
}

// Component Props for V4.0
export interface CarScanViewProps {
  zoneId: number;
  onCarScanned: (car: Car) => void;
  onBack: () => void;
}

export interface ZoneStatusProps {
  workStation: WorkStation;
  onRefresh: () => void;
}

export interface ProductionLineTabProps {
  cars: Car[];
  productionStats: ProductionStats;
  onCarSelect: (vin: string) => void;
  onRefresh: () => void;
}

// Quality Assurance Types - v4.1.0

// QA Check Item Status
export enum QACheckStatus {
  NOT_CHECKED = 'not_checked',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

// Individual QA Check Item
export interface QACheckItem {
  id: string;                   // Unique check item ID
  name: string;                 // Check description (e.g., "Engine properly mounted")
  category: string;             // Group checks (e.g., "Engine", "Body", "Electrical")
  isRequired: boolean;          // Must pass to complete QA
  instructions?: string;        // Detailed check instructions
  order: number;               // Display order
}

// QA Checklist Template
export interface QAChecklist {
  id: string;                   // Template ID (e.g., "checklist_basic_car")
  name: string;                 // Template name (e.g., "Basic Car Quality Checklist")
  description?: string;         // Template description
  carTypes: string[];           // Which car types use this checklist
  version: number;              // Template version for tracking changes
  items: QACheckItem[];         // All check items in this template
  totalItems: number;           // Count of items
  requiredItems: number;        // Count of required items
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;            // User who created template
}

// Individual Check Result
export interface QACheckResult {
  itemId: string;               // References QACheckItem.id
  status: QACheckStatus;        // Check result
  notes?: string;               // Optional notes from inspector
  checkedAt: Date;              // When this item was checked
  checkedBy: string;            // User who performed check
}

// Complete QA Inspection Record
export interface QAInspection {
  id: string;                   // Unique inspection ID
  vin: string;                  // Car being inspected
  checklistId: string;          // Template used
  checklistName: string;        // Template name (cached for display)
  
  // Inspection status
  status: 'in_progress' | 'completed' | 'failed';
  overallResult: 'pass' | 'fail' | 'pending';
  
  // Progress tracking
  totalItems: number;           // Total items in checklist
  checkedItems: number;         // Items completed
  passedItems: number;          // Items that passed
  failedItems: number;          // Items that failed
  requiredItemsPassed: number;  // Required items that passed
  
  // Check results
  results: QACheckResult[];     // Individual check results
  
  // Metadata
  startedAt: Date;              // When inspection started
  completedAt?: Date;           // When inspection finished
  inspectorEmail: string;       // QA inspector
  inspectorName: string;        // Display name
  
  // Car context (cached for display)
  carType: string;
  carColor: string;
  carSeries: string;
  currentZone?: number;         // Where car was when inspected
}

// QA Statistics for Manager Dashboard
export interface QAStats {
  date: string;                 // YYYY-MM-DD
  
  // Daily totals
  inspectionsStarted: number;
  inspectionsCompleted: number;
  inspectionsPassed: number;
  inspectionsFailed: number;
  
  // Quality metrics
  overallPassRate: number;      // Percentage of cars passing QA
  averageInspectionTime: number; // Minutes per inspection
  
  // Check item analysis
  mostFailedChecks: Array<{
    itemName: string;
    failureCount: number;
    failureRate: number;
  }>;
  
  // Inspector performance
  inspectorStats: Array<{
    email: string;
    name: string;
    inspectionsCompleted: number;
    averageTime: number;
  }>;
  
  lastCalculated: Date;
}

// QA Dashboard Props
export interface QAViewProps {
  onBack: () => void;
}

export interface QACarListProps {
  cars: Car[];
  onCarSelect: (vin: string) => void;
  onRefresh: () => void;
}

export interface QAInspectionProps {
  car: Car;
  checklist: QAChecklist;
  onComplete: (inspection: QAInspection) => void;
  onBack: () => void;
}