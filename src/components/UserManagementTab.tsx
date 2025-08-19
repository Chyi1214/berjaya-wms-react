// User Management Tab - HR section for managing user accounts and permissions
import { useState, useEffect } from 'react';
import { UserRecord, UserRole } from '../types';
import { userManagementService } from '../services/userManagement';
import { useAuth } from '../contexts/AuthContext';

// User Form Modal Component
interface UserFormModalProps {
  user?: UserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: { email: string; role: UserRole; zone?: number; isActive?: boolean }) => Promise<void>;
}

function UserFormModal({ user, isOpen, onClose, onSave }: UserFormModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
  const [zone, setZone] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with existing user data
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setRole(user.role);
      setZone(user.zone || '');
      setIsActive(user.isActive);
    } else {
      // Reset form for new user
      setEmail('');
      setRole(UserRole.VIEWER);
      setZone('');
      setIsActive(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if ((role === UserRole.LOGISTICS || role === UserRole.PRODUCTION) && !zone) {
      alert('Zone is required for Logistics and Production workers');
      return;
    }

    setIsSubmitting(true);
    
    const userData = {
      email: email.trim().toLowerCase(),
      role,
      zone: zone ? Number(zone) : undefined,
      isActive
    };

    try {
      await onSave(userData);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {user ? 'Edit User' : 'Add New User'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!user} // Can't change email when editing
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="user@company.com"
              required
            />
            {user && (
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed when editing existing user
              </p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value={UserRole.VIEWER}>👁️ Viewer - Read-only access</option>
              <option value={UserRole.LOGISTICS}>📦 Logistics - Warehouse operations</option>
              <option value={UserRole.PRODUCTION}>🔧 Production - Manufacturing floor</option>
              <option value={UserRole.SUPERVISOR}>👨‍💼 Supervisor - Team management</option>
              <option value={UserRole.MANAGER}>📊 Manager - Full department access</option>
            </select>
          </div>

          {/* Zone Field */}
          {(role === UserRole.LOGISTICS || role === UserRole.PRODUCTION) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone * (Required for {role} workers)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={zone}
                onChange={(e) => setZone(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1-30"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Assign worker to specific zone (1-30)
              </p>
            </div>
          )}

          {/* Active Status */}
          {user && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Account is active
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : user ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

  // Role color mapping
  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.DEV_ADMIN: return 'bg-red-100 text-red-800';
      case UserRole.MANAGER: return 'bg-purple-100 text-purple-800';
      case UserRole.SUPERVISOR: return 'bg-blue-100 text-blue-800';
      case UserRole.LOGISTICS: return 'bg-yellow-100 text-yellow-800';
      case UserRole.PRODUCTION: return 'bg-green-100 text-green-800';
      case UserRole.VIEWER: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format last login
  const formatLastLogin = (date?: Date): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
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
        {isDevAdmin && (
          <button
            onClick={() => setShowAddUser(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            ➕ Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value={UserRole.DEV_ADMIN}>DevAdmin</option>
            <option value={UserRole.MANAGER}>Manager</option>
            <option value={UserRole.SUPERVISOR}>Supervisor</option>
            <option value={UserRole.LOGISTICS}>Logistics</option>
            <option value={UserRole.PRODUCTION}>Production</option>
            <option value={UserRole.VIEWER}>Viewer</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-900">Total Users</div>
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-900">Active Users</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.isActive).length}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-yellow-900">Managers</div>
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter(u => u.role === UserRole.MANAGER).length}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-purple-900">Workers</div>
          <div className="text-2xl font-bold text-purple-600">
            {users.filter(u => [UserRole.LOGISTICS, UserRole.PRODUCTION].includes(u.role)).length}
          </div>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-2xl">⏳</div>
          <p className="text-gray-500">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-6">👤</div>
          {users.length === 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
              <p className="text-gray-500 mb-6">Start by adding your first user</p>
              {isDevAdmin && (
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  ➕ Add First User
                </button>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users match your search</h3>
              <p className="text-gray-500">Try adjusting your search terms or filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.email} className={!user.isActive ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">
                          Created {user.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.zone ? `Zone ${user.zone}` : '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastLogin(user.lastLogin)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {user.role !== UserRole.DEV_ADMIN && isDevAdmin && (
                      <>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={user.isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.email)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {user.role === UserRole.DEV_ADMIN && (
                      <span className="text-gray-400 text-xs">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {(showAddUser || editingUser) && (
        <UserFormModal
          user={editingUser}
          isOpen={true}
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
      )}
    </div>
  );
}