// Types for QA Gate Configuration

export interface QAGate {
  gateId: string;         // Firestore document ID
  gateIndex: number;      // Our internal index (1, 2, 3, ...) for ordering and future access control
  gateName: string;       // Custom name (CP8, CP7, Z001, etc.)
  description?: string;   // Optional description
  isActive: boolean;      // Can disable without deleting
  assignedUsers?: string[]; // User emails assigned to this gate
  isPreVinGate?: boolean; // True if this gate inspects body codes before VIN assignment
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateGateInput {
  gateName: string;
  description?: string;
  isActive?: boolean;
  isPreVinGate?: boolean;
}

export interface UpdateGateInput {
  gateName?: string;
  description?: string;
  isActive?: boolean;
  assignedUsers?: string[];
  isPreVinGate?: boolean;
}
