// Expected Item Tab - Enhanced with batch/location filters and stock adjustment
import { useState, useMemo, useEffect } from 'react';
import { InventoryCountEntry } from '../../../types';
import { BatchAllocation } from '../../../types/inventory';
import EnhancedInventoryTable from '../../EnhancedInventoryTable';
import { batchAllocationService } from '../../../services/batchAllocationService';
import { tableStateService } from '../../../services/tableState';
import { useAuth } from '../../../contexts/AuthContext';
import { DeleteBatchModal } from '../../operations/DeleteBatchModal';

interface ExpectedItemTabProps {
  tableData?: InventoryCountEntry[]; // Not used anymore - we build from batch_allocations (Layer 2 is source of truth)
}

interface DivergenceInfo {
  sku: string;
  location: string;
  layer1Amount: number; // expected_inventory
  layer2Amount: number; // batch_allocations sum
  divergence: number; // layer2 - layer1
}

export function ExpectedItemTab(_props: ExpectedItemTabProps) {
  const { userRecord } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [batchAllocations, setBatchAllocations] = useState<BatchAllocation[]>([]);
  const [expectedInventory, setExpectedInventory] = useState<InventoryCountEntry[]>([]);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // Batch actions modal state
  const [showBatchActionsModal, setShowBatchActionsModal] = useState(false);

  // Load batch allocations with real-time updates
  useEffect(() => {
    setIsLoading(true);

    // Set up real-time listener for batch allocations
    const unsubscribe = batchAllocationService.onBatchAllocationsChange((allocations) => {
      setBatchAllocations(allocations);

      // Extract unique batches and locations
      const batches = new Set<string>();
      const locations = new Set<string>();

      allocations.forEach(allocation => {
        Object.keys(allocation.allocations).forEach(batchId => {
          if (batchId !== 'DEFAULT') {
            batches.add(batchId);
          }
        });
        locations.add(allocation.location);
      });

      setAvailableBatches(Array.from(batches).sort());
      setAvailableLocations(Array.from(locations).sort());
      setIsLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Load expected inventory (Layer 1) with real-time updates
  useEffect(() => {
    // Set up real-time listener for expected_inventory
    const unsubscribe = tableStateService.onExpectedInventoryChange((inventory) => {
      setExpectedInventory(inventory);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Filter table data based on batch and location
  const filteredData = useMemo(() => {
    // ALWAYS build from batch allocations (Layer 2 is the source of truth)
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

        // Create or update entry for this SKU+Location for specific batch
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
        // "All Batches" selected - show total allocated
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
  }, [batchAllocations, selectedBatch, selectedLocation]);

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

  // Calculate divergences between Layer 1 (expected_inventory) and Layer 2 (batch_allocations)
  const divergences = useMemo<DivergenceInfo[]>(() => {
    const divergenceMap = new Map<string, DivergenceInfo>();

    // Build Layer 1 map (expected_inventory)
    const layer1Map = new Map<string, number>();
    expectedInventory.forEach(item => {
      const key = `${item.sku}_${item.location}`;
      layer1Map.set(key, item.amount);
    });

    // Build Layer 2 map (batch_allocations) and calculate divergence
    batchAllocations.forEach(allocation => {
      const key = `${allocation.sku}_${allocation.location}`;
      const layer2Amount = allocation.totalAllocated;
      const layer1Amount = layer1Map.get(key) || 0;
      const divergence = layer2Amount - layer1Amount;

      // Only track if there's a divergence OR if either layer has data
      if (divergence !== 0 || layer1Amount > 0 || layer2Amount > 0) {
        divergenceMap.set(key, {
          sku: allocation.sku,
          location: allocation.location,
          layer1Amount,
          layer2Amount,
          divergence
        });
      }
    });

    // Check for items in Layer 1 that don't exist in Layer 2
    expectedInventory.forEach(item => {
      const key = `${item.sku}_${item.location}`;
      if (!divergenceMap.has(key) && item.amount > 0) {
        divergenceMap.set(key, {
          sku: item.sku,
          location: item.location,
          layer1Amount: item.amount,
          layer2Amount: 0,
          divergence: -item.amount
        });
      }
    });

    return Array.from(divergenceMap.values()).filter(d => d.divergence !== 0);
  }, [batchAllocations, expectedInventory]);

  // Calculate divergence summary
  const divergenceSummary = useMemo(() => {
    const totalDivergences = divergences.length;
    const totalDivergenceAmount = divergences.reduce((sum, d) => sum + Math.abs(d.divergence), 0);
    const positives = divergences.filter(d => d.divergence > 0).length;
    const negatives = divergences.filter(d => d.divergence < 0).length;

    return {
      totalDivergences,
      totalDivergenceAmount,
      positives,
      negatives
    };
  }, [divergences]);

  // Handle data reconciliation
  const handleReconcile = async () => {
    if (!userRecord) return;

    if (!confirm('🔍 Data Reconciliation\n\nThis will:\n• Check if expected_inventory matches batch_allocations\n• Report any mismatches\n• Offer to auto-fix discrepancies\n\nRun reconciliation check?')) {
      return;
    }

    setIsReconciling(true);
    try {
      // First run without auto-fix to see the report
      const result = await tableStateService.reconcileInventoryData(false);

      const message = [
        '📊 Reconciliation Report:',
        '',
        `Total SKUs: ${result.totalSKUs}`,
        `✅ Matches: ${result.matches}`,
        `⚠️  Mismatches: ${result.mismatches.length}`,
        '',
      ].join('\n');

      if (result.mismatches.length > 0) {
        const details = result.mismatches.slice(0, 10).map(m =>
          `${m.sku} @ ${m.location}: ${m.expectedAmount} → ${m.calculatedAmount} (${m.diff >= 0 ? '+' : ''}${m.diff})`
        ).join('\n');

        const fullMessage = message + details + (result.mismatches.length > 10 ? '\n...(more in console)' : '');

        if (confirm(fullMessage + '\n\n🔧 Auto-fix these mismatches?')) {
          // Run again with auto-fix
          const fixResult = await tableStateService.reconcileInventoryData(true);
          alert(`✅ Fixed ${fixResult.mismatches.length} mismatches!\n\nData will update automatically via real-time sync.`);
          // No need to manually reload - real-time listener will update automatically
        }
      } else {
        alert(message + '\n✅ All data is in sync! No fixes needed.');
      }

    } catch (error) {
      console.error('Failed to reconcile data:', error);
      alert('❌ Failed to reconcile data. Check console for details.');
    } finally {
      setIsReconciling(false);
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

          {/* Removed manual refresh button - data updates automatically via real-time sync */}

          <button
            onClick={handleReconcile}
            disabled={isReconciling}
            className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            title="Check and fix data sync between layers"
          >
            {isReconciling ? '⏳ Checking...' : '🔍 Reconcile Data'}
          </button>

          <button
            onClick={() => setShowBatchActionsModal(true)}
            className="self-end px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium"
            title="Manage batch inventory (Layer 2 only)"
          >
            🗑️ Batch Actions
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

      {/* Divergence Alert Section */}
      {divergences.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚠️</span>
                <h4 className="text-lg font-bold text-orange-900">
                  Layer Divergence Detected
                </h4>
              </div>

              <p className="text-sm text-orange-800 mb-4">
                The two inventory layers are not in sync. This means the detailed batch breakdowns (Layer 2) don't match the aggregated totals (Layer 1).
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-lg border border-orange-200 p-3">
                  <div className="text-2xl font-bold text-orange-900">{divergenceSummary.totalDivergences}</div>
                  <div className="text-xs text-orange-700">SKU+Location Divergences</div>
                </div>
                <div className="bg-white rounded-lg border border-orange-200 p-3">
                  <div className="text-2xl font-bold text-orange-900">{divergenceSummary.totalDivergenceAmount}</div>
                  <div className="text-xs text-orange-700">Total Units Misaligned</div>
                </div>
                <div className="bg-green-50 rounded-lg border border-green-300 p-3">
                  <div className="text-2xl font-bold text-green-900">+{divergenceSummary.positives}</div>
                  <div className="text-xs text-green-700">Over-allocated</div>
                  <div className="text-xs text-green-600">(Layer 2 &gt; Layer 1)</div>
                </div>
                <div className="bg-red-50 rounded-lg border border-red-300 p-3">
                  <div className="text-2xl font-bold text-red-900">−{divergenceSummary.negatives}</div>
                  <div className="text-xs text-red-700">Under-allocated</div>
                  <div className="text-xs text-red-600">(Layer 2 &lt; Layer 1)</div>
                </div>
              </div>

              <details className="bg-white rounded-lg border border-orange-200 p-3">
                <summary className="cursor-pointer font-medium text-orange-900 hover:text-orange-700">
                  📋 View Detailed Divergences ({divergences.length} items)
                </summary>
                <div className="mt-3 max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 border-b">SKU</th>
                        <th className="text-left p-2 border-b">Location</th>
                        <th className="text-right p-2 border-b">Layer 1</th>
                        <th className="text-right p-2 border-b">Layer 2</th>
                        <th className="text-right p-2 border-b">Divergence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divergences.map((d, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">{d.sku}</td>
                          <td className="p-2">{d.location}</td>
                          <td className="p-2 text-right">{d.layer1Amount}</td>
                          <td className="p-2 text-right">{d.layer2Amount}</td>
                          <td className={`p-2 text-right font-bold ${
                            d.divergence > 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {d.divergence > 0 ? '+' : ''}{d.divergence}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>

            <button
              onClick={handleReconcile}
              disabled={isReconciling}
              className="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {isReconciling ? '⏳ Fixing...' : '🔧 Fix Now'}
            </button>
          </div>
        </div>
      )}

      {/* Success - All Synced (compact badge) */}
      {divergences.length === 0 && batchAllocations.length > 0 && expectedInventory.length > 0 && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-2.5 inline-flex items-center gap-2">
          <span className="text-sm">✅</span>
          <span className="text-sm font-medium text-green-900">All Layers Synced</span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading inventory...</span>
        </div>
      ) : filteredData.length > 0 ? (
        <EnhancedInventoryTable
          counts={filteredData}
          batchAllocations={selectedBatch === 'ALL' ? batchAllocations : undefined}
        />
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

      {/* Batch Actions Modal */}
      {showBatchActionsModal && (
        <DeleteBatchModal
          batch={null}
          boxCount={0}
          mode="inventory-only"
          onConfirm={() => {
            setShowBatchActionsModal(false);
          }}
          onCancel={() => setShowBatchActionsModal(false)}
        />
      )}
    </div>
  );
}

export default ExpectedItemTab;
