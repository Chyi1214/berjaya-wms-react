// Production, Car Tracking, and Quality Assurance Types for Berjaya WMS

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
  carType?: string;         // Optional: Computed car type for batch management (e.g., "TK1_Red_High")
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
  averageResetAt?: Date;         // When averages were last reset (v5.8)
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
  type: string;          // Will be set to default value automatically
  color: string;         // Will be set to default value automatically
  series: string;        // Will be set to default value automatically
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
  user: {
    uid: string;
    email: string;
    displayName: string | null;
  };
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