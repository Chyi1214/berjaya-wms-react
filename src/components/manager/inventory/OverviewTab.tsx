// Overview Tab - Inventory management with batch progress and admin tools
import { useState } from 'react';
import { dataCleanupService } from '../../../services/dataCleanup';

interface OverviewTabProps {
  // Remove the unhelpful indices, we'll add needed props later
  onGenerateMockData?: () => void;
  onConcludeToday?: () => void;
  onClearAllData?: () => void;
  onResetAllQuantities?: () => void;
  isLoading?: boolean;
}

export function OverviewTab({
  onGenerateMockData,
  onConcludeToday,
  onClearAllData,
  onResetAllQuantities,
  isLoading
}: OverviewTabProps) {
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleDataCleanup = async () => {
    if (!confirm('🧹 Clean up inventory data integrity issues?\n\nThis will:\n• Remove BOM entries from inventory tables\n• Fix item name misalignments\n• Exclude waste items from main inventory\n\nThis cannot be undone!')) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const results = await dataCleanupService.cleanupInventoryData();
      alert(`✅ Data cleanup completed!\n\n📊 Results:\n• BOM entries removed: ${results.bomsRemoved}\n• Item names fixed: ${results.itemNamesFixed}\n\nNote: Waste items are now preserved for audit tracking.\nPlease refresh the page to see updated inventory.`);
    } catch (error) {
      console.error('Failed to cleanup data:', error);
      alert('❌ Failed to cleanup data. Check console for details.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Inventory Overview</h3>
        <p className="text-gray-500">Batch progress monitoring and inventory management tools</p>
      </div>

      {/* Batch Progress Placeholders - Creative & Visual */}
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900">📦 Batch Progress Monitor</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Batches */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="text-blue-600 text-3xl mb-3">🔄</div>
            <h5 className="font-medium text-blue-900 mb-2">Active Batches</h5>
            <div className="space-y-2">
              <div className="text-blue-700 text-2xl font-bold">12</div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
              <p className="text-blue-700 text-sm">75% Complete</p>
            </div>
          </div>

          {/* Batch Health */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="text-green-600 text-3xl mb-3">💚</div>
            <h5 className="font-medium text-green-900 mb-2">Batch Health</h5>
            <div className="space-y-2">
              <div className="text-green-700 text-2xl font-bold">96%</div>
              <div className="flex space-x-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-2 flex-1 rounded ${i <= 4 ? 'bg-green-500' : 'bg-green-200'}`}></div>
                ))}
              </div>
              <p className="text-green-700 text-sm">Quality Score</p>
            </div>
          </div>

          {/* Pending Reconciliations */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
            <div className="text-yellow-600 text-3xl mb-3">⚠️</div>
            <h5 className="font-medium text-yellow-900 mb-2">Reconciliations</h5>
            <div className="space-y-2">
              <div className="text-yellow-700 text-2xl font-bold">7</div>
              <div className="text-yellow-700 text-xs space-y-1">
                <div>SKU-A001: +5 variance</div>
                <div>SKU-B003: -2 variance</div>
              </div>
              <p className="text-yellow-700 text-sm">Need Attention</p>
            </div>
          </div>

          {/* Batch Timeline */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
            <div className="text-purple-600 text-3xl mb-3">⏰</div>
            <h5 className="font-medium text-purple-900 mb-2">Timeline</h5>
            <div className="space-y-2">
              <div className="text-purple-700 text-lg font-bold">2.5 hrs</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="text-purple-700 text-xs">Batch-001 Started</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="text-purple-700 text-xs">Batch-002 Pending</div>
                </div>
              </div>
              <p className="text-purple-700 text-sm">Avg Process Time</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <div className="text-gray-400 text-2xl mb-2">🚧</div>
          <p className="text-gray-600 font-medium">Advanced Batch Analytics Coming Soon</p>
          <p className="text-gray-500 text-sm mt-1">Real-time batch tracking, automated reconciliation, and predictive insights</p>
        </div>
      </div>

      {/* Admin Tools Section */}
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900">⚙️ Management Tools</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Data Generation */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4">🎲 Test Data</h5>
            <button
              onClick={onGenerateMockData}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? '⏳ Generating...' : '🎯 Generate Mock Data'}
            </button>
            <p className="text-gray-500 text-sm mt-2">Create test inventory and transactions</p>
          </div>

          {/* CSV Operations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4">📄 CSV Operations</h5>
            <div className="space-y-2">
              <button className="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded transition-colors">
                📤 Export Data
              </button>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 px-3 rounded transition-colors">
                📥 Import Data
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">Export and import inventory data</p>
          </div>

          {/* Daily Operations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4">📅 Daily Operations</h5>
            <div className="space-y-2">
              <button
                onClick={onConcludeToday}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm py-2 px-3 rounded transition-colors"
              >
                ✅ Conclude Today
              </button>
              <button
                onClick={onResetAllQuantities}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 px-3 rounded transition-colors"
              >
                🔄 Reset All Quantities
              </button>
              <button
                onClick={onClearAllData}
                className="w-full bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-3 rounded transition-colors"
              >
                🗑️ Clear All Data
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-2">End-of-day and maintenance operations</p>
          </div>

          {/* Data Cleanup - NEW */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h5 className="font-medium text-gray-900 mb-4">🧹 Data Cleanup</h5>
            <button
              onClick={handleDataCleanup}
              disabled={isCleaningUp}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white text-sm py-2 px-3 rounded transition-colors"
            >
              {isCleaningUp ? '🔄 Cleaning...' : '🔧 Fix Data Issues'}
            </button>
            <p className="text-gray-500 text-xs mt-2">Remove BOMs from inventory, fix item names</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;