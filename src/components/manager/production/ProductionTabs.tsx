import { memo } from 'react';
import { ManagerTab } from '../../../types/manager';

interface ProductionTabsProps {
  activeTab: ManagerTab;
  onTabChange: (tab: ManagerTab) => void;
}

export const ProductionTabs = memo(function ProductionTabs({ 
  activeTab, 
  onTabChange 
}: ProductionTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('production_line')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'production_line'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🚗 Production Line
        </button>
        <button
          onClick={() => onTabChange('production_stats')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'production_stats'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          📊 Statistics
        </button>
      </nav>
    </div>
  );
});