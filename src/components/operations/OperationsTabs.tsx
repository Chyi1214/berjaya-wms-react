import { memo } from 'react';

interface OperationsTabsProps {
  activeTab: 'batches' | 'vins' | 'logistics_setup' | 'production_setup' | 'system' | 'cost_tracking';
  onTabChange: (tab: 'batches' | 'vins' | 'logistics_setup' | 'production_setup' | 'system' | 'cost_tracking') => void;
}

export const OperationsTabs = memo(function OperationsTabs({ activeTab, onTabChange }: OperationsTabsProps) {
  return (
    <div className="border-b border-gray-200 mb-4">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('batches')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'batches'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🏭 Batches
        </button>
        <button
          onClick={() => onTabChange('vins')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'vins'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🚗 VINs/Cars
        </button>
        <button
          onClick={() => onTabChange('logistics_setup')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'logistics_setup'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🚚 Logistics Setup
        </button>
        <button
          onClick={() => onTabChange('production_setup')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'production_setup'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🏭 Production Setup
        </button>
        <button
          onClick={() => onTabChange('system')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'system'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🧹 System
        </button>
        <button
          onClick={() => onTabChange('cost_tracking')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'cost_tracking'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          💰 Cost Tracking
        </button>
      </nav>
    </div>
  );
});

