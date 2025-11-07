// User Management Tab - Modular user management with decomposed components
import { useState, useEffect } from 'react';
import { UserRecord, UserRole } from '../types';
import { userManagementService } from '../services/userManagement';
import { useAuth } from '../contexts/AuthContext';
import {
  UserFormModal,
  UserStatsCards,
  UserFilters,
  UserListTable
} from './user-management';

interface UserManagementTabProps {
  onRefresh?: () => void;
}

export function UserManagementTab({ onRefresh }: UserManagementTabProps) {
  const { isDevAdmin, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [showBulkRefreshModal, setShowBulkRefreshModal] = useState(false);
  const [bulkRefreshRole, setBulkRefreshRole] = useState<UserRole | 'all'>('all');

  // Check if user has permission to manage users
  const canManageUsers = isDevAdmin || hasPermission('system.userManagement');

  // Load users
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const userList = await userManagementService.getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // Load users on component mount
  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers]);

  // Handle user deletion
  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    
    setIsLoading(true);
    try {
      await userManagementService.deleteUser(email);
      await loadUsers();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user deactivation
  const handleToggleUserStatus = async (user: UserRecord) => {
    setIsLoading(true);
    try {
      await userManagementService.updateUser(user.email, {
        isActive: !user.isActive
      });
      await loadUsers();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      alert('Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh permissions
  const handleRefreshPermissions = async (user: UserRecord) => {
    if (!confirm(
      `Refresh permissions for "${user.email}"?\n\n` +
      `This will update their permissions to match the ${user.role} template.\n\n` +
      `Any custom permissions will be overwritten.`
    )) return;

    setIsLoading(true);
    try {
      await userManagementService.refreshUserPermissions(user.email);
      await loadUsers();
      onRefresh?.();
      alert(`✅ Permissions refreshed for ${user.email}!\n\nThey should refresh/reload their browser to see the changes.`);
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
      alert(`Failed to refresh permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cleanup duplicates
  const handleCleanupDuplicates = async () => {
    if (!confirm(
      `Clean up duplicate user entries?\n\n` +
      `This will remove duplicate entries for the same email address,\n` +
      `keeping only the most recent version.\n\n` +
      `Continue?`
    )) return;

    setIsLoading(true);
    try {
      const result = await userManagementService.cleanupDuplicates();
      await loadUsers();
      onRefresh?.();

      let message = `✅ Cleanup Complete!\n\n`;
      message += `🗑️ Removed: ${result.removed} duplicate(s)\n`;
      if (result.errors.length > 0) {
        message += `\n❌ Errors:\n${result.errors.join('\n')}`;
      }

      alert(message);
    } catch (error) {
      console.error('Failed to cleanup duplicates:', error);
      alert(`Failed to cleanup duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk refresh permissions
  const handleBulkRefresh = async () => {
    const roleText = bulkRefreshRole === 'all' ? 'ALL users' : `all ${bulkRefreshRole} users`;
    const count = bulkRefreshRole === 'all'
      ? users.filter(u => u.role !== UserRole.DEV_ADMIN).length
      : users.filter(u => u.role === bulkRefreshRole).length;

    if (!confirm(
      `Bulk Refresh Permissions for ${roleText}?\n\n` +
      `This will update permissions for ${count} user${count !== 1 ? 's' : ''} to match their role templates.\n\n` +
      `Any custom permissions will be overwritten.\n\n` +
      `This may take a few seconds. Continue?`
    )) return;

    setIsLoading(true);
    setShowBulkRefreshModal(false);

    try {
      const result = await userManagementService.bulkRefreshPermissions(
        bulkRefreshRole === 'all' ? undefined : { role: bulkRefreshRole }
      );

      await loadUsers();
      onRefresh?.();

      let message = `✅ Bulk Refresh Complete!\n\n`;
      message += `✅ Success: ${result.success} user${result.success !== 1 ? 's' : ''}\n`;
      if (result.failed > 0) {
        message += `❌ Failed: ${result.failed} user${result.failed !== 1 ? 's' : ''}\n\n`;
        message += `Errors:\n${result.errors.slice(0, 5).join('\n')}`;
        if (result.errors.length > 5) {
          message += `\n... and ${result.errors.length - 5} more`;
        }
      }
      message += `\n\nAffected users should refresh/reload their browsers.`;

      alert(message);
    } catch (error) {
      console.error('Failed to bulk refresh permissions:', error);
      alert(`Failed to bulk refresh: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };


  if (!canManageUsers) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">👥 User Management</h2>
          <p className="text-sm text-gray-500">Manage user accounts, roles, and permissions</p>
        </div>
        {canManageUsers && (
          <div className="flex gap-2">
            <button
              onClick={handleCleanupDuplicates}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              title="Remove duplicate user entries"
            >
              🧹 Clean Duplicates
            </button>
            <button
              onClick={() => setShowBulkRefreshModal(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              title="Refresh permissions for multiple users"
            >
              🔄 Bulk Refresh
            </button>
            <button
              onClick={() => setShowAddUser(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              ➕ Add User
            </button>
          </div>
        )}
      </div>

      <UserFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
      />

      <UserStatsCards users={users} />

      {/* Show filtered results or handle no matches */}
      {filteredUsers.length === 0 && users.length > 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-6">👤</div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users match your search</h3>
            <p className="text-gray-500">Try adjusting your search terms or filters</p>
          </div>
        </div>
      ) : (
        <UserListTable
          users={filteredUsers}
          isLoading={isLoading}
          canManageUsers={canManageUsers}
          onEditUser={setEditingUser}
          onToggleUserStatus={handleToggleUserStatus}
          onDeleteUser={handleDeleteUser}
          onRefreshPermissions={handleRefreshPermissions}
          onAddUser={() => setShowAddUser(true)}
        />
      )}

      <UserFormModal
        user={editingUser}
        isOpen={showAddUser || !!editingUser}
        onClose={() => {
          setShowAddUser(false);
          setEditingUser(null);
        }}
        onSave={async (userData) => {
          setIsLoading(true);
          try {
            if (editingUser) {
              await userManagementService.updateUser(editingUser.email, userData);
            } else {
              await userManagementService.createUser(userData.email, userData.role, userData.zone);
            }
            await loadUsers();
            onRefresh?.();
            setShowAddUser(false);
            setEditingUser(null);
          } catch (error) {
            console.error('Failed to save user:', error);
            let errorMessage = 'Failed to save user';
            if (error instanceof Error) {
              if (error.message.includes('permission-denied')) {
                errorMessage = 'Permission denied. Only DevAdmin can create users.';
              } else if (error.message.includes('already-exists')) {
                errorMessage = 'User already exists in the system.';
              } else {
                errorMessage = `Failed to save user: ${error.message}`;
              }
            }
            alert(errorMessage);
          } finally {
            setIsLoading(false);
          }
        }}
      />

      {/* Bulk Refresh Modal */}
      {showBulkRefreshModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                🔄 Bulk Refresh Permissions
              </h3>
              <button
                onClick={() => setShowBulkRefreshModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ This will update permissions to match role templates. Any custom permissions will be overwritten.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select users to refresh:
                </label>
                <select
                  value={bulkRefreshRole}
                  onChange={(e) => setBulkRefreshRole(e.target.value as UserRole | 'all')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Users ({users.filter(u => u.role !== UserRole.DEV_ADMIN).length})</option>
                  <option value={UserRole.MANAGER}>Managers Only ({users.filter(u => u.role === UserRole.MANAGER).length})</option>
                  <option value={UserRole.SUPERVISOR}>Supervisors Only ({users.filter(u => u.role === UserRole.SUPERVISOR).length})</option>
                  <option value={UserRole.LOGISTICS}>Logistics Only ({users.filter(u => u.role === UserRole.LOGISTICS).length})</option>
                  <option value={UserRole.PRODUCTION}>Production Only ({users.filter(u => u.role === UserRole.PRODUCTION).length})</option>
                  <option value={UserRole.QA}>QA Only ({users.filter(u => u.role === UserRole.QA).length})</option>
                  <option value={UserRole.VIEWER}>Viewers Only ({users.filter(u => u.role === UserRole.VIEWER).length})</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowBulkRefreshModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRefresh}
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                >
                  Refresh Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}