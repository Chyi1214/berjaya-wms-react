import { memo } from 'react';
import { UserRecord, UserRole } from '../../types';

interface UserListTableProps {
  users: UserRecord[];
  isLoading: boolean;
  canManageUsers: boolean;
  onEditUser: (user: UserRecord) => void;
  onToggleUserStatus: (user: UserRecord) => void;
  onDeleteUser: (email: string) => void;
  onRefreshPermissions: (user: UserRecord) => void;
  onAddUser: () => void;
}

// Role color mapping utility function
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

// Format last login utility function
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

export const UserListTable = memo(function UserListTable({
  users,
  isLoading,
  canManageUsers,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
  onRefreshPermissions,
  onAddUser,
}: UserListTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl">⏳</div>
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-6">👤</div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
          <p className="text-gray-500 mb-6">Start by adding your first user</p>
          {canManageUsers && (
            <button
              onClick={onAddUser}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              ➕ Add First User
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
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
          {users.map((user) => (
            <tr key={user.email} className={!user.isActive ? 'opacity-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    {user.displayName ? (
                      <>
                        <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">
                          Created {user.createdAt.toLocaleDateString()}
                        </div>
                      </>
                    )}
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
                {user.role !== UserRole.DEV_ADMIN && canManageUsers && (
                  <>
                    <button
                      onClick={() => onEditUser(user)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit user details"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onRefreshPermissions(user)}
                      className="text-purple-600 hover:text-purple-800"
                      title="Refresh permissions to match role template"
                    >
                      🔄 Refresh
                    </button>
                    <button
                      onClick={() => onToggleUserStatus(user)}
                      className={user.isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDeleteUser(user.email)}
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
  );
});