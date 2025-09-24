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
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
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
          <button
            onClick={() => setShowAddUser(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            ➕ Add User
          </button>
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
    </div>
  );
}