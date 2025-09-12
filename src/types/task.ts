// Task Management System Types
// Highly configurable task system for production workflow management

export enum TaskType {
  NOTIFICATION = 'notification',           // Simple alert/message
  ACTION_ITEM = 'action_item',            // Requires worker action
  CHECKLIST = 'checklist',                // Multi-step checklist
  DATA_COLLECTION = 'data_collection',    // Collect data from worker
  APPROVAL_REQUEST = 'approval_request',   // Requires manager approval
  INSPECTION = 'inspection',              // Quality inspection task
  MAINTENANCE = 'maintenance',            // Equipment maintenance
  MATERIAL_REQUEST = 'material_request'   // Request materials/components
}

export enum TaskStatus {
  CREATED = 'created',           // Task created but not assigned
  ASSIGNED = 'assigned',         // Assigned to worker(s)
  ACKNOWLEDGED = 'acknowledged', // Worker has seen the task
  IN_PROGRESS = 'in_progress',  // Worker is working on it
  COMPLETED = 'completed',       // Task finished by worker
  APPROVED = 'approved',         // Manager approved completion
  REJECTED = 'rejected',         // Manager rejected completion
  CANCELLED = 'cancelled'        // Task cancelled by manager
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum TaskAssignmentType {
  BROADCAST = 'broadcast',       // All workers in zones
  ZONE_SPECIFIC = 'zone_specific', // Workers in specific zones
  USER_SPECIFIC = 'user_specific', // Specific worker(s)
  ROLE_SPECIFIC = 'role_specific'  // Workers with specific roles
}

// Flexible task configuration interface
export interface TaskConfig {
  // Basic task information
  type: TaskType;
  title: string;
  description: string;
  instructions?: string;
  
  // Assignment and targeting
  assignmentType: TaskAssignmentType;
  targetZones?: string[];      // For zone-specific tasks
  targetUsers?: string[];      // For user-specific tasks
  targetRoles?: string[];      // For role-specific tasks
  
  // Task behavior
  priority: TaskPriority;
  requiresConfirmation: boolean;  // Does worker need to confirm completion?
  requiresManagerApproval: boolean; // Does manager need to approve?
  autoComplete?: boolean;         // Auto-complete after acknowledgment?
  
  // Timing
  estimatedDurationMinutes?: number;
  dueDate?: Date;
  
  // Interactive elements (highly configurable)
  interactive?: {
    checklistItems?: TaskChecklistItem[];
    dataFields?: TaskDataField[];
    attachmentAllowed?: boolean;
    photoRequired?: boolean;
    signatureRequired?: boolean;
  };
  
  // References to related entities
  relatedEntities?: {
    carVIN?: string;
    zone?: string;
    sku?: string;
    transactionId?: string;
    batchId?: string;
  };
}

// Checklist item for checklist-type tasks
export interface TaskChecklistItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

// Data field for data collection tasks
export interface TaskDataField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'time';
  required: boolean;
  options?: string[];      // For select/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  value?: any;
  collectedBy?: string;
  collectedAt?: Date;
}

// Main Task interface
export interface Task {
  // Unique identifier
  id: string;
  
  // Configuration (immutable after creation)
  config: TaskConfig;
  
  // Current state
  status: TaskStatus;
  assignedAt?: Date;
  acknowledgedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  
  // People involved
  createdBy: string;        // Manager/system who created
  assignedTo: string[];     // Worker email(s) assigned
  acknowledgedBy?: string;  // Worker who acknowledged
  completedBy?: string;     // Worker who completed
  approvedBy?: string;      // Manager who approved
  
  // Progress tracking
  progressData?: {
    checklistProgress?: { [itemId: string]: boolean };
    collectedData?: { [fieldId: string]: any };
    attachments?: string[];  // File URLs
    notes?: string;
    timeSpentMinutes?: number;
  };
  
  // Audit trail
  createdAt: Date;
  updatedAt: Date;
  history: TaskHistoryEntry[];
}

// Task history for audit trail
export interface TaskHistoryEntry {
  id: string;
  timestamp: Date;
  action: string;           // 'created', 'assigned', 'acknowledged', etc.
  performedBy: string;      // User email
  details?: string;         // Optional details about the action
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
}

// Task statistics for manager dashboard
export interface TaskStats {
  totalTasks: number;
  byStatus: { [key in TaskStatus]: number };
  byPriority: { [key in TaskPriority]: number };
  byType: { [key in TaskType]: number };
  avgCompletionTimeMinutes: number;
  overdueCount: number;
}

// Task filter options for lists
export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  type?: TaskType[];
  assignedTo?: string;
  createdBy?: string;
  zone?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Task creation request (for programmatic task creation)
export interface CreateTaskRequest {
  config: TaskConfig;
  assignToCurrentZone?: boolean;    // Auto-assign to workers in current zone
  scheduleFor?: Date;               // Schedule task for future execution
  parentTaskId?: string;            // Link to parent task (for workflows)
}

// Task interaction result
export interface TaskInteractionResult {
  taskId: string;
  action: 'acknowledge' | 'start' | 'complete' | 'update_progress' | 'cancel';
  progressData?: Task['progressData'];
  notes?: string;
  timeSpentMinutes?: number;
}