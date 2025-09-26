// Unified Logistics Monitor - Batch-focused view with current vs belonging locations
import { useState, useEffect } from 'react';
import { ScanLookup } from '../../types';
import { tableStateService } from '../../services/tableState';
import { scanLookupService } from '../../services/scanLookupService';
import { batchAllocationService } from '../../services/batchAllocationService';

interface UnifiedLogisticsMonitorProps {
  userEmail: string;
}

interface LocationData {
  sku: string;
  itemName: string;
  location: string;
  quantity: number;
}

export function UnifiedLogisticsMonitor({ userEmail: _userEmail }: UnifiedLogisticsMonitorProps) {
  const [loading, setLoading] = useState(true);
  const [unboxedBoxes, setUnboxedBoxes] = useState<number>(0);

  // Batch selection
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  // Data for selected batch
  const [currentLocationData, setCurrentLocationData] = useState<LocationData[]>([]);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);

      // Load unboxed boxes count
      const unboxedCount = await tableStateService.getUnboxedBoxesCount();
      setUnboxedBoxes(unboxedCount);

      // Load available batches from batch configuration
      const batchConfig = await batchAllocationService.getBatchConfig();
      const batchIds = batchConfig?.availableBatches || [];
      setAvailableBatches(batchIds);

      console.log('🎯 Loaded batch config:', batchConfig);
      console.log('📦 Available batches:', batchIds);

      // Set active batch as default if available
      if (batchIds.length > 0 && !selectedBatch) {
        const defaultBatch = batchConfig?.activeBatch || batchIds[0];
        setSelectedBatch(defaultBatch);
        console.log('🔄 Set default batch:', defaultBatch);
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load batch-specific data
  const loadBatchData = async (batchId: string) => {
    if (!batchId) return;

    try {
      // Get batch allocations for this batch
      const batchAllocations = await batchAllocationService.getAllBatchAllocations();
      const filteredAllocations = batchAllocations.filter((allocation: any) =>
        allocation.allocations && allocation.allocations[batchId]
      );

      // Get current inventory locations
      const inventoryData = await tableStateService.getExpectedInventory();

      // Get scanner lookup data for target destinations
      const scannerData = await scanLookupService.getAllLookups();

      // Group by target destination
      const destinationGroups: Record<string, LocationData[]> = {};

      filteredAllocations.forEach((allocation: any) => {
        // Find all scanner lookups for this SKU (multiple target zones possible)
        const scannerLookups = scannerData.filter((lookup: ScanLookup) => lookup.sku === allocation.sku);

        scannerLookups.forEach((scannerLookup: ScanLookup) => {
          const targetDestination = `Zone ${scannerLookup.targetZone}`;

          if (!destinationGroups[targetDestination]) {
            destinationGroups[targetDestination] = [];
          }

          // Find current inventory for this SKU
          const inventoryItem = inventoryData.find(inv =>
            inv.sku === allocation.sku && inv.location === allocation.location
          );

          if (inventoryItem && inventoryItem.amount > 0) {
            // Get the quantity allocated to this specific batch
            const batchQuantity = allocation.allocations[batchId] || 0;

            // Only show items that have allocation for this batch
            if (batchQuantity > 0) {
              destinationGroups[targetDestination].push({
                sku: allocation.sku,
                itemName: scannerLookup.itemName || inventoryItem.itemName || allocation.sku,
                location: `Currently at: ${inventoryItem.location}`,
                quantity: batchQuantity  // Show batch-specific quantity (now properly updated by transactions)
              });
            }
          }
        });
      });

      // Convert to flat list for rendering, sorted by destination
      const flatData: LocationData[] = [];
      Object.keys(destinationGroups)
        .sort()
        .forEach(destination => {
          // Add destination header
          flatData.push({
            sku: `DESTINATION_${destination}`,
            itemName: destination,
            location: 'TARGET_DESTINATION',
            quantity: 0
          });

          // Add items under this destination
          flatData.push(...destinationGroups[destination]);
        });

      setCurrentLocationData(flatData);

    } catch (error) {
      console.error('Failed to load batch data:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Load batch data when selection changes
  useEffect(() => {
    if (selectedBatch) {
      loadBatchData(selectedBatch);
    }
  }, [selectedBatch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading logistics monitor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metric Row */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{unboxedBoxes}</div>
            <div className="text-gray-600 font-medium">📦 Unboxed Boxes</div>
          </div>
        </div>
      </div>

      {/* Batch Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <label className="text-lg font-semibold text-gray-900">🎯 Select Batch:</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="flex-1 max-w-md border border-gray-300 rounded-md px-3 py-2 text-lg font-medium"
          >
            <option value="">Choose a batch...</option>
            {availableBatches.map(batchId => (
              <option key={batchId} value={batchId}>
                Batch {batchId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Single Panel - Grouped by Destination */}
      {selectedBatch && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🎯 Items Grouped by Target Destination</h3>
            <p className="text-sm text-gray-600">Showing where items should go and their current locations</p>
          </div>
          <div className="p-4">
            {currentLocationData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>No items found for this batch</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentLocationData.map((item, index) => {
                  // Check if this is a destination header
                  if (item.location === 'TARGET_DESTINATION') {
                    return (
                      <div key={index} className="mt-6 mb-3 first:mt-0">
                        <div className="flex items-center space-x-2 pb-2 border-b-2 border-blue-200">
                          <div className="text-xl">🎯</div>
                          <h4 className="text-lg font-semibold text-blue-800">{item.itemName}</h4>
                        </div>
                      </div>
                    );
                  }

                  // Regular item under a destination
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg ml-6">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.sku}</div>
                        <div className="text-sm text-gray-600">{item.itemName}</div>
                        <div className="text-xs text-blue-600 mt-1">{item.location}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-600">{item.quantity}</div>
                        <div className="text-xs text-gray-500">units</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Batch Selected */}
      {!selectedBatch && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium">Select a batch to view details</h3>
          <p>Choose a batch from the dropdown above to see current and belonging locations</p>
        </div>
      )}
    </div>
  );
}

export default UnifiedLogisticsMonitor;