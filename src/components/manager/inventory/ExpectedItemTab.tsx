// Expected Item Tab - Enhanced with batch/location filters and stock adjustment
import { useState, useMemo, useEffect } from 'react';
import { InventoryCountEntry } from '../../../types';
import { BatchAllocation } from '../../../types/inventory';
import EnhancedInventoryTable from '../../EnhancedInventoryTable';
import { batchAllocationService } from '../../../services/batchAllocationService';
import { tableStateService } from '../../../services/tableState';
import { useAuth } from '../../../contexts/AuthContext';

interface ExpectedItemTabProps {
  tableData: InventoryCountEntry[];
}

export function ExpectedItemTab({ tableData }: ExpectedItemTabProps) {
  const { userRecord } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [batchAllocations, setBatchAllocations] = useState<BatchAllocation[]>([]);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Load batch allocations
  useEffect(() => {
    loadBatchAllocations();
  }, []);

  const loadBatchAllocations = async () => {
    setIsLoading(true);
    try {
      const allocations = await batchAllocationService.getAllBatchAllocations();
      setBatchAllocations(allocations);

      // Extract unique batches and locations
      const batches = new Set<string>();
      const locations = new Set<string>();

      allocations.forEach(allocation => {
        Object.keys(allocation.allocations).forEach(batchId => {
          if (batchId !== 'UNASSIGNED') {
            batches.add(batchId);
          }
        });
        locations.add(allocation.location);
      });

      setAvailableBatches(Array.from(batches).sort());
      setAvailableLocations(Array.from(locations).sort());
    } catch (error) {
      console.error('Failed to load batch allocations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter table data based on batch and location
  const filteredData = useMemo(() => {
    if (selectedBatch === 'ALL' && selectedLocation === 'ALL') {
      return tableData;
    }

    // Build a map of filtered items from batch allocations
    const filteredItems = new Map<string, InventoryCountEntry>();

    batchAllocations.forEach(allocation => {
      // Filter by location
      if (selectedLocation !== 'ALL' && allocation.location !== selectedLocation) {
        return;
      }

      // Filter by batch
      if (selectedBatch !== 'ALL') {
        const batchQty = allocation.allocations[selectedBatch] || 0;
        if (batchQty === 0) {
          return;
        }

        // Create or update entry for this SKU+Location
        const key = `${allocation.sku}_${allocation.location}`;
        filteredItems.set(key, {
          sku: allocation.sku,
          itemName: allocation.sku, // Use SKU as itemName for now
          location: allocation.location,
          amount: batchQty,
          timestamp: new Date(),
          countedBy: 'system'
        });
      } else {
        // No batch filter, just location filter - show total
        const key = `${allocation.sku}_${allocation.location}`;
        filteredItems.set(key, {
          sku: allocation.sku,
          itemName: allocation.sku, // Use SKU as itemName for now
          location: allocation.location,
          amount: allocation.totalAllocated,
          timestamp: new Date(),
          countedBy: 'system'
        });
      }
    });

    return Array.from(filteredItems.values());
  }, [tableData, batchAllocations, selectedBatch, selectedLocation]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalSKUs = new Set(filteredData.map(item => item.sku)).size;
    const totalQty = filteredData.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalLocations = new Set(filteredData.map(item => item.location)).size;

    return {
      totalSKUs,
      totalQty,
      totalLocations
    };
  }, [filteredData]);

  // EMERGENCY: One-time clean of raw inventory
  const handleEmergencyCleanAll = async () => {
    if (!userRecord) return;

    if (!confirm('🚨 EMERGENCY CLEAN\n\nThis will delete ALL inventory from expected_inventory collection.\n\nThis is a ONE-TIME emergency button for legacy data.\n\nContinue?')) {
      return;
    }

    if (!confirm('⚠️ FINAL WARNING: This will DELETE ALL VISIBLE INVENTORY.\n\nType YES in the next prompt.')) {
      return;
    }

    const finalConfirm = prompt('Type YES to confirm:');
    if (finalConfirm !== 'YES') {
      alert('❌ Cancelled');
      return;
    }

    setIsCleaning(true);
    try {
      await tableStateService.clearExpectedInventory();
      alert('✅ All inventory cleared! Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear inventory:', error);
      alert('❌ Failed to clear inventory.');
    } finally {
      setIsCleaning(false);
    }
  };

  // Handle clean stock operations
  const handleCleanStock = async (mode: 'ALL' | 'BATCH' | 'UNASSIGNED') => {
    if (!userRecord) return;

    let confirmMessage = '';
    let actionDescription = '';

    if (mode === 'ALL') {
      confirmMessage = '🚨 ZERO ALL INVENTORY?\n\nThis will:\n• Remove ALL stock across ALL batches\n• Clear ALL locations\n• Cannot be undone!\n\nAre you absolutely sure?';
      actionDescription = 'all inventory';
    } else if (mode === 'BATCH' && selectedBatch !== 'ALL') {
      confirmMessage = `🗑️ Zero stock for Batch ${selectedBatch}?\n\nThis will:\n• Remove all inventory for Batch ${selectedBatch}\n• Across all locations\n• Cannot be undone!\n\nContinue?`;
      actionDescription = `Batch ${selectedBatch}`;
    } else if (mode === 'UNASSIGNED') {
      confirmMessage = '🗑️ Zero all UNASSIGNED stock?\n\nThis will:\n• Remove all stock not assigned to any batch\n• Across all locations\n• Cannot be undone!\n\nContinue?';
      actionDescription = 'unassigned inventory';
    } else {
      alert('⚠️ Please select a specific batch to clean batch stock.');
      return;
    }

    if (!confirm(confirmMessage)) return;

    // Double confirmation for ALL
    if (mode === 'ALL') {
      if (!confirm('⚠️ FINAL WARNING: You are about to DELETE ALL INVENTORY DATA.\n\nType YES in the next prompt to confirm.')) {
        return;
      }
      const finalConfirm = prompt('Type YES (in capital letters) to confirm deletion of ALL inventory:');
      if (finalConfirm !== 'YES') {
        alert('❌ Cancellation confirmed. No data was deleted.');
        return;
      }
    }

    setIsCleaning(true);
    try {
      let result;

      if (mode === 'ALL') {
        result = await batchAllocationService.zeroAllStock(userRecord.email);
      } else if (mode === 'BATCH') {
        result = await batchAllocationService.zeroStockForBatch(selectedBatch, userRecord.email);
      } else {
        result = await batchAllocationService.zeroUnassignedStock(userRecord.email);
      }

      alert(`✅ Successfully zeroed ${actionDescription}!\n\n📊 Summary:\n• ${result.skusAffected} SKU+Location combinations affected\n• ${result.totalZeroed} total units zeroed`);

      // Reload data
      await loadBatchAllocations();
      setShowCleanDialog(false);
    } catch (error) {
      console.error('Failed to clean stock:', error);
      alert('❌ Failed to clean stock. Please try again.');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Expected Inventory
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Baseline inventory with batch and location filtering
          </p>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-blue-900">{summary.totalSKUs}</div>
            <div className="text-xs text-blue-700">SKUs</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-green-900">{summary.totalQty}</div>
            <div className="text-xs text-green-700">Total Qty</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold text-purple-900">{summary.totalLocations}</div>
            <div className="text-xs text-purple-700">Locations</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🏭 Filter by Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Batches</option>
              {availableBatches.map(batch => (
                <option key={batch} value={batch}>Batch {batch}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📍 Filter by Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Locations</option>
              {availableLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadBatchAllocations}
            disabled={isLoading}
            className="self-end px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium disabled:opacity-50"
          >
            🔄 Refresh
          </button>

          <button
            onClick={() => setShowCleanDialog(true)}
            className="self-end px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
          >
            🗑️ Clean Stock
          </button>

          <button
            onClick={handleEmergencyCleanAll}
            disabled={isCleaning}
            className="self-end px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            title="ONE-TIME: Clear legacy inventory data"
          >
            ⚡ Emergency Clean
          </button>
        </div>

        {/* Active Filters Display */}
        {(selectedBatch !== 'ALL' || selectedLocation !== 'ALL') && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-600">Active filters:</span>
            {selectedBatch !== 'ALL' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                Batch: {selectedBatch}
                <button
                  onClick={() => setSelectedBatch('ALL')}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedLocation !== 'ALL' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                Location: {selectedLocation}
                <button
                  onClick={() => setSelectedLocation('ALL')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedBatch('ALL');
                setSelectedLocation('ALL');
              }}
              className="text-gray-500 hover:text-gray-700 text-xs underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading inventory...</span>
        </div>
      ) : filteredData.length > 0 ? (
        <EnhancedInventoryTable counts={filteredData} />
      ) : (
        <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-4">📦</div>
          <p className="font-medium">No Inventory Found</p>
          <p className="text-sm mt-2">
            {selectedBatch !== 'ALL' || selectedLocation !== 'ALL'
              ? 'Try adjusting your filters'
              : 'No inventory data available'}
          </p>
        </div>
      )}

      {/* Clean Stock Dialog */}
      {showCleanDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🗑️</span>
              Clean Stock
            </h3>

            <p className="text-sm text-gray-600 mb-6">
              Choose how you want to clean inventory. This operation cannot be undone.
            </p>

            <div className="space-y-3 mb-6">
              {/* Clean Specific Batch */}
              <button
                onClick={() => handleCleanStock('BATCH')}
                disabled={isCleaning || selectedBatch === 'ALL'}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedBatch === 'ALL'
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100'
                }`}
              >
                <div className="font-medium text-orange-900">
                  🏭 Zero Batch {selectedBatch === 'ALL' ? '(Select a batch first)' : selectedBatch}
                </div>
                <div className="text-sm text-orange-700 mt-1">
                  Remove all inventory for the selected batch across all locations
                </div>
              </button>

              {/* Clean Unassigned */}
              <button
                onClick={() => handleCleanStock('UNASSIGNED')}
                disabled={isCleaning}
                className="w-full text-left p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 hover:border-yellow-400 hover:bg-yellow-100 transition-colors"
              >
                <div className="font-medium text-yellow-900">
                  ❓ Zero Unassigned Stock
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  Remove all inventory not assigned to any batch
                </div>
              </button>

              {/* Clean ALL */}
              <button
                onClick={() => handleCleanStock('ALL')}
                disabled={isCleaning}
                className="w-full text-left p-4 rounded-lg border-2 border-red-300 bg-red-50 hover:border-red-500 hover:bg-red-100 transition-colors"
              >
                <div className="font-medium text-red-900">
                  🚨 Zero ALL Inventory
                </div>
                <div className="text-sm text-red-700 mt-1">
                  <strong>DANGER:</strong> Remove ALL stock across ALL batches and locations
                </div>
              </button>
            </div>

            {isCleaning && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                  <span className="text-blue-800">Processing...</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCleanDialog(false)}
                disabled={isCleaning}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpectedItemTab;
