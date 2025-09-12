// User Management Service - v3.2.0 Scanner Integration
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { UserRecord, UserRole, UserPermissions, PermissionTemplate } from '../types';

// DevAdmin email - hardcoded for security
const DEV_ADMIN_EMAIL = 'luckyxstar1214@gmail.com';

class UserManagementService {
  private usersCollection = collection(db, 'users');

  // Check if user is DevAdmin (hardcoded bypass)
  isDevAdmin(email: string): boolean {
    return email === DEV_ADMIN_EMAIL;
  }

  // Get user record from database
  async getUserRecord(email: string): Promise<UserRecord | null> {
    try {
      // DevAdmin always exists (virtual record)
      if (this.isDevAdmin(email)) {
        return {
          email: email,
          role: UserRole.DEV_ADMIN,
          permissions: this.getDevAdminPermissions(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };
      }

      const userDoc = await getDoc(doc(this.usersCollection, email));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserRecord;
        return {
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
          lastLogin: data.lastLogin ? (data.lastLogin instanceof Date ? data.lastLogin : new Date(data.lastLogin)) : undefined
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get user record:', error);
      return null;
    }
  }

  // Create new user
  async createUser(email: string, role: UserRole, zone?: number): Promise<void> {
    try {
      if (this.isDevAdmin(email)) {
        throw new Error('Cannot modify DevAdmin user');
      }

      const permissions = this.getPermissionTemplate(role);
      const userRecord: UserRecord = {
        email,
        role,
        zone,
        permissions,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      // Clean data - remove undefined fields for Firestore
      const cleanData = Object.fromEntries(
        Object.entries(userRecord).filter(([_, value]) => value !== undefined)
      );

      await setDoc(doc(this.usersCollection, email), cleanData);
      console.log('✅ User created:', email, role);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  // Update user role and permissions
  async updateUser(email: string, updates: Partial<UserRecord>): Promise<void> {
    try {
      if (this.isDevAdmin(email)) {
        throw new Error('Cannot modify DevAdmin user');
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // Clean data - remove undefined fields for Firestore
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      await updateDoc(doc(this.usersCollection, email), cleanData);
      console.log('✅ User updated:', email);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(email: string): Promise<void> {
    try {
      if (this.isDevAdmin(email)) {
        throw new Error('Cannot delete DevAdmin user');
      }

      await deleteDoc(doc(this.usersCollection, email));
      console.log('✅ User deleted:', email);
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  // Get all users
  async getAllUsers(): Promise<UserRecord[]> {
    try {
      const querySnapshot = await getDocs(
        query(this.usersCollection, orderBy('createdAt', 'desc'))
      );
      
      const users: UserRecord[] = [];
      
      // Add DevAdmin as first user
      users.push({
        email: DEV_ADMIN_EMAIL,
        role: UserRole.DEV_ADMIN,
        permissions: this.getDevAdminPermissions(),
        createdAt: new Date('2025-08-19'),
        updatedAt: new Date(),
        isActive: true
      });

      // Add database users
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserRecord;
        users.push({
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
          lastLogin: data.lastLogin ? (data.lastLogin instanceof Date ? data.lastLogin : new Date(data.lastLogin)) : undefined
        });
      });

      return users;
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  }

  // Update last login time
  async updateLastLogin(email: string): Promise<void> {
    try {
      if (this.isDevAdmin(email)) {
        return; // Don't track DevAdmin login
      }

      await updateDoc(doc(this.usersCollection, email), {
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  // Permission Templates
  getPermissionTemplate(role: UserRole): UserPermissions {
    switch (role) {
      case UserRole.DEV_ADMIN:
        return this.getDevAdminPermissions();
      
      case UserRole.MANAGER:
        return {
          inventory: { view: true, count: true, edit: true, delete: false },
          transactions: { view: true, create: true, approve: true, cancel: true },
          itemMaster: { view: true, add: true, edit: true, delete: false },
          bom: { view: true, create: true, edit: true, delete: false },
          csv: { export: true, import: true },
          scanner: { use: false, admin: true, bulkScan: false },
          qa: { view: true, performChecks: false, manageChecklists: true, viewReports: true },
          system: { userManagement: true, settings: false, auditLogs: true }
        };
      
      case UserRole.SUPERVISOR:
        return {
          inventory: { view: true, count: true, edit: true, delete: false },
          transactions: { view: true, create: true, approve: true, cancel: false },
          itemMaster: { view: true, add: false, edit: false, delete: false },
          bom: { view: true, create: false, edit: false, delete: false },
          csv: { export: true, import: false },
          scanner: { use: false, admin: false, bulkScan: false },
          qa: { view: true, performChecks: false, manageChecklists: false, viewReports: true },
          system: { userManagement: false, settings: false, auditLogs: false }
        };
      
      case UserRole.LOGISTICS:
        return {
          inventory: { view: true, count: true, edit: false, delete: false },
          transactions: { view: true, create: true, approve: false, cancel: false },
          itemMaster: { view: true, add: false, edit: false, delete: false },
          bom: { view: true, create: false, edit: false, delete: false },
          csv: { export: false, import: false },
          scanner: { use: true, admin: false, bulkScan: false },
          qa: { view: false, performChecks: false, manageChecklists: false, viewReports: false },
          system: { userManagement: false, settings: false, auditLogs: false }
        };
      
      case UserRole.PRODUCTION:
        return {
          inventory: { view: true, count: true, edit: false, delete: false },
          transactions: { view: true, create: false, approve: true, cancel: false },
          itemMaster: { view: true, add: false, edit: false, delete: false },
          bom: { view: true, create: false, edit: false, delete: false },
          csv: { export: false, import: false },
          scanner: { use: false, admin: false, bulkScan: false },
          qa: { view: false, performChecks: false, manageChecklists: false, viewReports: false },
          system: { userManagement: false, settings: false, auditLogs: false }
        };
      
      case UserRole.QA:
        return {
          inventory: { view: true, count: false, edit: false, delete: false },
          transactions: { view: true, create: false, approve: false, cancel: false },
          itemMaster: { view: true, add: false, edit: false, delete: false },
          bom: { view: true, create: false, edit: false, delete: false },
          csv: { export: true, import: false },
          scanner: { use: false, admin: false, bulkScan: false },
          qa: { view: true, performChecks: true, manageChecklists: false, viewReports: true },
          system: { userManagement: false, settings: false, auditLogs: false }
        };
      
      case UserRole.VIEWER:
        return {
          inventory: { view: true, count: false, edit: false, delete: false },
          transactions: { view: true, create: false, approve: false, cancel: false },
          itemMaster: { view: true, add: false, edit: false, delete: false },
          bom: { view: true, create: false, edit: false, delete: false },
          csv: { export: true, import: false },
          scanner: { use: false, admin: false, bulkScan: false },
          qa: { view: true, performChecks: false, manageChecklists: false, viewReports: true },
          system: { userManagement: false, settings: false, auditLogs: false }
        };
      
      default:
        return this.getViewerPermissions();
    }
  }

  // DevAdmin has all permissions
  private getDevAdminPermissions(): UserPermissions {
    return {
      inventory: { view: true, count: true, edit: true, delete: true },
      transactions: { view: true, create: true, approve: true, cancel: true },
      itemMaster: { view: true, add: true, edit: true, delete: true },
      bom: { view: true, create: true, edit: true, delete: true },
      csv: { export: true, import: true },
      scanner: { use: true, admin: true, bulkScan: true },
      qa: { view: true, performChecks: true, manageChecklists: true, viewReports: true },
      system: { userManagement: true, settings: true, auditLogs: true }
    };
  }

  // Fallback viewer permissions
  private getViewerPermissions(): UserPermissions {
    return {
      inventory: { view: true, count: false, edit: false, delete: false },
      transactions: { view: true, create: false, approve: false, cancel: false },
      itemMaster: { view: true, add: false, edit: false, delete: false },
      bom: { view: true, create: false, edit: false, delete: false },
      csv: { export: false, import: false },
      scanner: { use: false, admin: false, bulkScan: false },
      qa: { view: false, performChecks: false, manageChecklists: false, viewReports: false },
      system: { userManagement: false, settings: false, auditLogs: false }
    };
  }

  // Get available permission templates
  getPermissionTemplates(): PermissionTemplate[] {
    return [
      {
        name: 'Manager',
        description: 'Full inventory and transaction management',
        permissions: this.getPermissionTemplate(UserRole.MANAGER)
      },
      {
        name: 'Supervisor', 
        description: 'Can approve transactions and edit inventory',
        permissions: this.getPermissionTemplate(UserRole.SUPERVISOR)
      },
      {
        name: 'Logistics Worker',
        description: 'Can count inventory, create transactions, and use scanner',
        permissions: this.getPermissionTemplate(UserRole.LOGISTICS)
      },
      {
        name: 'Production Worker',
        description: 'Can count inventory and approve incoming transactions',
        permissions: this.getPermissionTemplate(UserRole.PRODUCTION)
      },
      {
        name: 'Quality Assurance',
        description: 'Can perform quality checks on cars and view QA reports',
        permissions: this.getPermissionTemplate(UserRole.QA)
      },
      {
        name: 'Viewer',
        description: 'Read-only access to all data',
        permissions: this.getPermissionTemplate(UserRole.VIEWER)
      }
    ];
  }

  // Check if user has specific permission
  hasPermission(userRecord: UserRecord | null, permission: string): boolean {
    if (!userRecord || !userRecord.isActive) {
      return false;
    }

    // DevAdmin always has permission
    if (userRecord.role === UserRole.DEV_ADMIN) {
      return true;
    }

    // Parse nested permission (e.g., "inventory.edit")
    const parts = permission.split('.');
    if (parts.length !== 2) {
      return false;
    }

    const [category, action] = parts;
    const permissions = userRecord.permissions;

    // Check permission
    switch (category) {
      case 'inventory':
        return permissions.inventory[action as keyof typeof permissions.inventory] || false;
      case 'transactions':
        return permissions.transactions[action as keyof typeof permissions.transactions] || false;
      case 'itemMaster':
        return permissions.itemMaster[action as keyof typeof permissions.itemMaster] || false;
      case 'bom':
        return permissions.bom[action as keyof typeof permissions.bom] || false;
      case 'csv':
        return permissions.csv[action as keyof typeof permissions.csv] || false;
      case 'scanner':
        return permissions.scanner[action as keyof typeof permissions.scanner] || false;
      case 'qa':
        return permissions.qa[action as keyof typeof permissions.qa] || false;
      case 'system':
        return permissions.system[action as keyof typeof permissions.system] || false;
      default:
        return false;
    }
  }

  // v5.6 Personal Settings - Display Name Support
  async updateUserDisplayName(
    email: string, 
    displaySettings: { displayName: string; useDisplayName: boolean }
  ): Promise<void> {
    try {
      // DevAdmin special handling (create virtual record)
      if (this.isDevAdmin(email)) {
        const devAdminRef = doc(this.usersCollection, email);
        await setDoc(devAdminRef, {
          email: email,
          role: UserRole.DEV_ADMIN,
          permissions: this.getDevAdminPermissions(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          displayName: displaySettings.displayName,
          useDisplayName: displaySettings.useDisplayName
        });
        return;
      }

      // Regular user update
      const userRef = doc(this.usersCollection, email);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('User record not found. Contact administrator to create your account.');
      }

      await updateDoc(userRef, {
        displayName: displaySettings.displayName,
        useDisplayName: displaySettings.useDisplayName,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update user display name:', error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();