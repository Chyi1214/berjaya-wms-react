// Production, Car Tracking, and Quality Assurance Types for Berjaya WMS

// Version 5.0 Types - Takt Time Production System with Flying Car and Attribution

// Production System State - ON/OFF toggle for break times
export interface ProductionSystemState {
  isOn: boolean;
  lastToggledAt: Date;
  lastToggledBy: string;
  lastToggledByName: string;
  todayOnTime: number;      // Total minutes ON today
  todayOffTime: number;     // Total minutes OFF today
  onOffHistory: Array<{     // Event log
    timestamp: Date;
    action: 'turn_on' | 'turn_off';
    by: string;
    byName: string;
  }>;
}

// Zone Status - Work, Starve, or Block
export enum ZoneStatus {
  WORK = 'work',       // Zone has car being worked on
  STARVE = 'starve',   // Zone empty, previous zone has no flying car
  BLOCK = 'block',     // Zone empty, previous zone has flying car
  PAUSED = 'paused'    // System is OFF
}

// Car Status Enum
export enum CarStatus {
  IN_PRODUCTION = 'in_production',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  IN_MAINTENANCE = 'in_maintenance'  // Car in CP7/CP8 maintenance zone
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

  // QA Location tracking
  qaLocation?: string;          // Current QA bay/zone (e.g., "Bay-A1", "Zone-B2")
  qaLocationAssignedAt?: Date;  // When car was assigned to QA location
  qaLocationAssignedBy?: string; // User email who assigned location
  qaLocationAssignedByName?: string; // User display name who assigned location

  // Timeline tracking
  zoneHistory: ZoneEntry[];   // Complete journey through production line
  createdAt: Date;           // When car entered production system
  completedAt?: Date;        // When car completed all production steps
  
  // Metadata
  totalProductionTime?: number; // Total minutes in production
  estimatedCompletion?: Date;   // Based on historical data
}

// Work Station Status - Real-time zone information (v5.0 Takt Time System)
export interface WorkStation {
  zoneId: number;           // Zone 1-23 or 'maintenance' for CP7/CP8

  // Current cars in zone
  currentCar?: {            // Car currently being worked on
    vin: string;
    type: string;
    color: string;
    enteredAt: Date;
    timeElapsed: number;    // Minutes since car entered zone (excluding OFF time)
  };

  flyingCar?: {             // Car completed, waiting to be accepted by next zone
    vin: string;
    type: string;
    color: string;
    completedAt: Date;
    flyingTime: number;     // Minutes waiting (excluding OFF time)
  };

  // Worker information
  currentWorker?: {
    email: string;
    displayName: string;
    checkedInAt: Date;
    timeWorking: number;    // Minutes checked in
  };

  // Zone status
  status: ZoneStatus;       // work, starve, block, paused

  // Attribution tracking - time this zone caused line stoppage
  causedStopTime: {
    current: number;        // Current accumulation (resets when car completes)
    total: number;          // Historical total
    lastResetAt?: Date;     // When last reset
    starveTimeBlame: number;  // Time blamed for causing starve
    blockTimeBlame: number;   // Time blamed for causing block
  };

  // Time accumulation (stacked bar graph data)
  timeAccumulation: {
    workTime: number;       // Time spent working
    starveTime: number;     // Time spent starved
    blockTime: number;      // Time spent blocked
    lastCalculatedAt: Date; // When last calculated
  };

  // Zone statistics
  carsProcessedToday: number;
  averageProcessingTime: number; // Minutes per car
  averageResetAt?: Date;         // When averages were last reset
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
  movementType: 'scan_in' | 'complete' | 'transfer' | 'hold' | 'force_remove';
  
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

// QA Location Management Types - v7.39.0

// QA Location Configuration
export interface QALocation {
  id: string;                    // Unique location ID (auto-generated)
  name: string;                  // Location name (e.g., "Bay-A1", "Zone-B2")
  description?: string;          // Optional description
  isActive: boolean;             // Whether location is currently in use
  order: number;                 // Display order for sorting
  assignedUsers?: string[];      // User emails assigned to this location
  createdAt: Date;
  createdBy: string;             // User who created location
  updatedAt?: Date;
  updatedBy?: string;            // User who last updated location
}

// QA Location Assignment Log
export interface QALocationAssignment {
  id: string;                    // Unique assignment ID
  vin: string;                   // Car VIN
  locationId: string;            // QA Location ID
  locationName: string;          // Location name (cached for queries)
  assignedAt: Date;
  assignedBy: string;            // User email who assigned
  removedAt?: Date;              // When car left this location
  removedBy?: string;            // User who removed car
  notes?: string;
}