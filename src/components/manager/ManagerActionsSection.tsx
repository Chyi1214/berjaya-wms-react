// Manager Actions Section Component - Handles Eugene's v2.0.0 workflow actions
import { InventoryCountEntry } from '../../types';

interface ManagerActionsSectionProps {
  isLoading: boolean;
  inventoryCounts: InventoryCountEntry[];
  handleCompareTables: () => Promise<void>;
  handleConcludePeriod: () => Promise<void>;
  handleClearAllData: () => Promise<void>;
}

export function ManagerActionsSection({
  isLoading,
  inventoryCounts,
  handleCompareTables,
  handleConcludePeriod,
  handleClearAllData
}: ManagerActionsSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Eugene's v2.0.0 Manager Actions</h3>
      <div className="grid md:grid-cols-3 gap-4">
        
        {/* Compare Tables Action */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 mb-2">⚖️</div>
          <h4 className="font-medium text-blue-900 mb-1">Compare Tables</h4>
          <p className="text-blue-700 text-sm mb-3">Calculate expected inventory after all transactions</p>
          <button 
            onClick={handleCompareTables}
            disabled={isLoading || inventoryCounts.length === 0}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            {isLoading ? '⏳ Comparing...' : '⚖️ Compare Tables'}
          </button>
        </div>

        {/* Conclude Period Action */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-600 mb-2">✅</div>
          <h4 className="font-medium text-green-900 mb-1">Conclude Period</h4>
          <p className="text-green-700 text-sm mb-3">Finalize current period and create yesterday results</p>
          <button 
            onClick={handleConcludePeriod}
            disabled={isLoading || inventoryCounts.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            {isLoading ? '⏳ Concluding...' : '✅ Conclude Period'}
          </button>
        </div>

        {/* Clear All Data */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 mb-2">🗑️</div>
          <h4 className="font-medium text-red-900 mb-1">Clear All Data</h4>
          <p className="text-red-700 text-sm mb-3">Reset everything including yesterday results</p>
          <button 
            onClick={handleClearAllData}
            disabled={isLoading}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm py-2 px-3 rounded transition-colors"
          >
            {isLoading ? '⏳ Clearing...' : '🗑️ Clear All'}
          </button>
        </div>
      </div>
    </div>
  );
}