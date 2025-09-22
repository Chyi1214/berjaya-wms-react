// Tool Check Task System Types
// Flexible tool inventory checking with configurable items and extra fields

export interface ToolCheckItem {
  id: string;
  name: string;                    // "Screwdriver", "Hammer", "Dial Caliper"
  expectedCount: number;           // Expected quantity
  extraField?: {                   // Optional extra field like "dial reading"
    name: string;                  // "Dial Reading", "Serial Number", etc.
    type: 'text' | 'number';       // Input type
    placeholder?: string;          // "0.01mm", "Enter serial", etc.
  };
}

export interface ToolCheckConfig {
  id: string;
  name: string;                    // "Daily Tool Check", "Morning Prep", etc.
  description: string;
  items: ToolCheckItem[];          // List of tools to check
  
  // Broadcasting settings
  targetZones: number[];           // [1, 2, 3] for zones
  isActive: boolean;               // On/Off toggle
  
  // Scheduling settings
  schedule?: {
    enabled: boolean;
    time: string;                  // "08:00" format
    frequency: 'daily' | 'weekly' | 'custom';
    weekdays?: number[];           // [1,2,3,4,5] for Mon-Fri
  };
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolCheckSubmission {
  id: string;
  taskId: string;                  // Reference to the task instance
  configId: string;                // Reference to the tool check config
  workerEmail: string;
  zone: number;
  
  // Submitted data
  items: ToolCheckItemResult[];
  submittedAt: Date;
  
  // Status
  isComplete: boolean;
}

export interface ToolCheckItemResult {
  itemId: string;                  // References ToolCheckItem.id
  actualCount: number;             // What worker counted
  extraFieldValue?: string;        // Optional extra field data
  status: 'ok' | 'low' | 'high' | 'missing';  // vs expected count
}

// Manager dashboard aggregated view
export interface ToolCheckDashboardData {
  configId: string;
  taskId: string;
  items: ToolCheckItem[];
  zones: number[];
  submissions: ToolCheckSubmission[];
  
  // Aggregated statistics
  completionStatus: {
    [zoneId: number]: {
      completed: boolean;
      workerEmail?: string;
      submittedAt?: Date;
    };
  };
  
  // Excel-like data structure
  summaryGrid: {
    [itemId: string]: {
      [zoneId: number]: {
        actualCount: number;
        expectedCount: number;
        status: 'ok' | 'low' | 'high' | 'missing' | 'pending';
        extraFieldValue?: string;
      };
    };
  };
}

// Task creation request for tool check
export interface CreateToolCheckTaskRequest {
  configId: string;               // Which tool check config to use
  triggerType: 'manual' | 'scheduled';
  targetZones?: number[];         // Override zones if manual
  note?: string;                  // Optional message to workers
}