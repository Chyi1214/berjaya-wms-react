// HR Section Component - Wrapper for HR/User Management functionality
import { Suspense, lazy } from 'react';

// Lazy load the UserManagementTab
const UserManagementTab = lazy(() => import('../UserManagementTab').then(module => ({ default: module.UserManagementTab })));

interface HRSectionProps {
  onRefresh: () => void;
}

export function HRSection({ onRefresh }: HRSectionProps) {
  return (
    <div className="p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Loading HR Management...</p>
          </div>
        </div>
      }>
        <UserManagementTab 
          onRefresh={onRefresh}
        />
      </Suspense>
    </div>
  );
}