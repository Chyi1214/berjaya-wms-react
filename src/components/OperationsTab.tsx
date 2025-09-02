// Operations Tab - Full Batch Management Interface
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OperationsTabs } from './operations/OperationsTabs';
import { VinMonitorPanel } from './operations/VinMonitorPanel';
import { EnhancedBatchManagement } from './operations/EnhancedBatchManagement';
import { BatchSetupPage } from './operations/BatchSetupPage';

interface OperationsTabProps {
  onRefresh?: () => void;
}

export function OperationsTab({ onRefresh }: OperationsTabProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'batches' | 'vins' | 'setup'>('batches');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">🏭 Batch Management Operations</h2>
        <p className="text-sm text-gray-600 mt-2">
          Manage production batches with data preview - VIN by VIN, component by component
        </p>
      </div>

      {/* Tabs */}
      <OperationsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {activeTab === 'batches' && (
        <EnhancedBatchManagement user={user} onRefresh={onRefresh} />
      )}

      {activeTab === 'vins' && (
        <VinMonitorPanel />
      )}

      {activeTab === 'setup' && (
        <BatchSetupPage user={user} />
      )}
    </div>
  );
}
