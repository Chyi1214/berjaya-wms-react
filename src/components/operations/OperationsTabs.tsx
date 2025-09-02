import { memo } from 'react';

interface OperationsTabsProps {
  activeTab: 'batches' | 'vins' | 'setup';
  onTabChange: (tab: 'batches' | 'vins' | 'setup') => void;
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
          onClick={() => onTabChange('setup')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'setup'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🔧 Setup
        </button>
      </nav>
    </div>
  );
});

