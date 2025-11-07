// User Management Service - v3.2.0 Scanner Integration
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from './costTracking/firestoreWrapper';
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
      // Check Firestore first (all users including DevAdmin)
      const userDoc = await getDoc(doc(this.usersCollection, email));

      if (userDoc.exists()) {
        const data = userDoc.data() as UserRecord;
        return {
          ...data,
          // Always use current permission template for the role (ensures latest permissions)
          permissions: this.getPermissionTemplate(data.role),
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
          lastLogin: data.lastLogin ? (data.lastLogin instanceof Date ? data.lastLogin : new Date(data.lastLogin)) : undefined
        };
      }

      // DevAdmin fallback (if no document in Firestore yet)
      if (this.isDevAdmin(email)) {
        return {
          email: email,
          role: UserRole.DEV_ADMIN,
          permissions: this.getDevAdminPermissions(),
          createdAt: new Date('2025-08-19'),
          updatedAt: new Date(),
          isActive: true
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

  // Clean up duplicate user entries (keep most recent)
  async cleanupDuplicates(): Promise<{ removed: number; errors: string[] }> {
    try {
      console.log('🧹 Starting duplicate cleanup...');

      const querySnapshot = await getDocs(this.usersCollection);
      const usersByEmail = new Map<string, { id: string; data: UserRecord; updatedAt: Date }[]>();

      // Group documents by email
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserRecord;
        const email = doc.id;
        const updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt || 0);

        if (!usersByEmail.has(email)) {
          usersByEmail.set(email, []);
        }
        usersByEmail.get(email)!.push({ id: doc.id, data, updatedAt });
      });

      // Find and remove duplicates
      let removed = 0;
      const errors: string[] = [];

      for (const [email, docs] of usersByEmail.entries()) {
        if (docs.length > 1) {
          console.log(`🔍 Found ${docs.length} duplicates for ${email}`);

          // Sort by updatedAt (most recent first)
          docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

          // Keep the first (most recent), delete the rest
          const toKeep = docs[0];
          const toDelete = docs.slice(1);

          console.log(`✅ Keeping document updated at ${toKeep.updatedAt.toISOString()}`);

          for (const duplicate of toDelete) {
            try {
              console.log(`🗑️ Deleting duplicate updated at ${duplicate.updatedAt.toISOString()}`);
              await deleteDoc(doc(this.usersCollection, duplicate.id));
              removed++;
            } catch (error) {
              const errorMsg = `Failed to delete duplicate for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              console.error('❌', errorMsg);
            }
          }
        }
      }

      console.log(`✅ Cleanup complete: ${removed} duplicate(s) removed`);
      return { removed, errors };
    } catch (error) {
      console.error('❌ Failed to cleanup duplicates:', error);
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

      // Check if DevAdmin document exists in Firestore
      const devAdminDoc = await getDoc(doc(this.usersCollection, DEV_ADMIN_EMAIL));

      if (devAdminDoc.exists()) {
        // Use DevAdmin document from Firestore (has display name if set)
        const data = devAdminDoc.data() as UserRecord;
        users.push({
          email: DEV_ADMIN_EMAIL,
          role: UserRole.DEV_ADMIN,
          permissions: this.getDevAdminPermissions(),
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt || '2025-08-19'),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
          isActive: true,
          displayName: data.displayName,
          useDisplayName: data.useDisplayName,
          lastLogin: data.lastLogin ? (data.lastLogin instanceof Date ? data.lastLogin : new Date(data.lastLogin)) : undefined
        });
      } else {
        // Fallback to hardcoded DevAdmin (no document in Firestore yet)
        users.push({
          email: DEV_ADMIN_EMAIL,
          role: UserRole.DEV_ADMIN,
          permissions: this.getDevAdminPermissions(),
          createdAt: new Date('2025-08-19'),
          updatedAt: new Date(),
          isActive: true
        });
      }

      // Add all other users (skip DevAdmin to avoid duplicates)
      querySnapshot.forEach((doc) => {
        if (doc.id === DEV_ADMIN_EMAIL) {
          return; // Skip DevAdmin, already added above
        }

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
          scanner: { use: true, admin: true, bulkScan: true },
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

  // Refresh user permissions to match their role template
  async refreshUserPermissions(email: string): Promise<void> {
    try {
      if (this.isDevAdmin(email)) {
        throw new Error('DevAdmin permissions cannot be refreshed');
      }

      // Get current user record
      const userDoc = await getDoc(doc(this.usersCollection, email));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data() as UserRecord;

      // Get fresh permissions for their role
      const freshPermissions = this.getPermissionTemplate(userData.role);

      // Update with fresh permissions
      await updateDoc(doc(this.usersCollection, email), {
        permissions: freshPermissions,
        updatedAt: new Date()
      });

      console.log(`✅ Refreshed permissions for ${email} (${userData.role})`);
    } catch (error) {
      console.error('Failed to refresh user permissions:', error);
      throw error;
    }
  }

  // Bulk refresh permissions for multiple users or all users
  async bulkRefreshPermissions(options?: { role?: UserRole }): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      console.log('🔄 Starting bulk permission refresh...');

      const allUsers = await this.getAllUsers();

      // Filter users based on options
      let usersToRefresh = allUsers.filter(user => user.role !== UserRole.DEV_ADMIN);

      if (options?.role) {
        usersToRefresh = usersToRefresh.filter(user => user.role === options.role);
      }

      console.log(`📋 Found ${usersToRefresh.length} users to refresh`);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Refresh each user
      for (const user of usersToRefresh) {
        try {
          await this.refreshUserPermissions(user.email);
          success++;
        } catch (error) {
          failed++;
          const errorMsg = `${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ Failed to refresh ${user.email}:`, error);
        }
      }

      console.log(`✅ Bulk refresh complete: ${success} succeeded, ${failed} failed`);

      return { success, failed, errors };
    } catch (error) {
      console.error('Failed to bulk refresh permissions:', error);
      throw error;
    }
  }

  // v5.6 Personal Settings - Display Name Support
  async updateUserDisplayName(
    email: string,
    displaySettings: { displayName: string; useDisplayName: boolean }
  ): Promise<void> {
    try {
      console.log('🔧 updateUserDisplayName called:', { email, displaySettings });

      // DevAdmin special handling (create virtual record)
      if (this.isDevAdmin(email)) {
        console.log('👑 DevAdmin detected, using setDoc');
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
        console.log('✅ DevAdmin record updated');
        return;
      }

      // Regular user update
      console.log('👤 Regular user, using updateDoc');
      const userRef = doc(this.usersCollection, email);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error('❌ User record not found:', email);
        throw new Error('User record not found. Contact administrator to create your account.');
      }

      console.log('📝 Updating user document:', {
        displayName: displaySettings.displayName,
        useDisplayName: displaySettings.useDisplayName
      });

      await updateDoc(userRef, {
        displayName: displaySettings.displayName,
        useDisplayName: displaySettings.useDisplayName,
        updatedAt: new Date()
      });

      console.log('✅ User document updated successfully');
    } catch (error) {
      console.error('❌ Failed to update user display name:', error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();