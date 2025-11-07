import { memo } from 'react';
import { BatchConfigCard } from './BatchConfigCard';

interface LogisticsSetupPageProps {
  user: { email: string } | null;
}

export const LogisticsSetupPage = memo(function LogisticsSetupPage({ user }: LogisticsSetupPageProps) {
  return (
    <div className="space-y-6">
      {/* Scanner Auto-Select Settings */}
      <BatchConfigCard user={user} />
    </div>
  );
});
