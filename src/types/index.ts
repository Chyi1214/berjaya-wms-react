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

// Application Roles
export enum UserRole {
  LOGISTICS = 'logistics',
  PRODUCTION = 'production',
  MANAGER = 'manager'
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
  MANAGER = 'manager'
}

// Inventory Types (prepared for future use)
export interface InventoryItem {
  sku: string;
  name: string;
  total_amount: number;
  amount_logistics: number;
  [key: `amount_production_zone_${number}`]: number;
}

// Transaction Types (prepared for future use)
export interface Transaction {
  id: string;
  sku: string;
  amount: number;
  location: string; // 'logistics' or 'production_zone_N'
  counted_by: string;
  timestamp: Date;
  transaction_type: 'count' | 'transfer' | 'adjustment';
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