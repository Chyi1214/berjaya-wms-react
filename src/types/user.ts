// User and Authentication Types for Berjaya WMS

// Core User interface
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
  zone?: number;                    // For production workers - numeric zones (1-30)
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  // v5.6 Personal Settings
  displayName?: string;             // User's preferred display name
  useDisplayName?: boolean;         // Whether to show display name instead of email
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
  description?: string;
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