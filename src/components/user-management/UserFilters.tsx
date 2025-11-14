import { memo } from 'react';
import { UserRole } from '../../types';

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedRole: UserRole | 'all';
  setSelectedRole: (role: UserRole | 'all') => void;
}

export const UserFilters = memo(function UserFilters({
  searchTerm,
  setSearchTerm,
  selectedRole,
  setSelectedRole,
}: UserFiltersProps) {
  return (
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
          <option value={UserRole.QA}>QA</option>
          <option value={UserRole.VIEWER}>Viewer</option>
        </select>
      </div>
    </div>
  );
});