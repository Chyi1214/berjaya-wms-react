import { memo } from 'react';
import { UserRecord, UserRole } from '../../types';

interface UserStatsCardsProps {
  users: UserRecord[];
}

export const UserStatsCards = memo(function UserStatsCards({ users }: UserStatsCardsProps) {
  return (
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
  );
});