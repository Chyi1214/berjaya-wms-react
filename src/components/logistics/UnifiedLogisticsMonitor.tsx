// Unified Logistics Monitor - Batch-focused view with current vs belonging locations
import { useState, useEffect } from 'react';
import { ScanLookup } from '../../types';
import { tableStateService } from '../../services/tableState';
import { scanLookupService } from '../../services/scanLookupService';
import { batchAllocationService } from '../../services/batchAllocationService';
import { batchManagementService } from '../../services/batchManagement';

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
  const [belongingLocationData, setBelongingLocationData] = useState<LocationData[]>([]);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);

      // Load unboxed boxes count
      const unboxedCount = await tableStateService.getUnboxedBoxesCount();
      setUnboxedBoxes(unboxedCount);

      // Load available batches
      const batches = await batchManagementService.getAllBatches();
      const batchIds = batches.map((batch: any) => batch.batchId);
      setAvailableBatches(batchIds);

      // Set first batch as default if available
      if (batchIds.length > 0 && !selectedBatch) {
        setSelectedBatch(batchIds[0]);
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

      // Get scanner lookup data for belonging locations
      const scannerData = await scanLookupService.getAllLookups();

      // Filter and format current location data
      const currentData: LocationData[] = [];
      filteredAllocations.forEach((allocation: any) => {
        const inventoryItem = inventoryData.find(inv =>
          inv.sku === allocation.sku && inv.location === allocation.location
        );

        if (inventoryItem && inventoryItem.amount > 0) {
          currentData.push({
            sku: allocation.sku,
            itemName: inventoryItem.itemName,
            location: inventoryItem.location,
            quantity: inventoryItem.amount
          });
        }
      });

      // Format belonging location data from scanner lookup
      const belongingData: LocationData[] = [];
      filteredAllocations.forEach((allocation: any) => {
        const scannerLookup = scannerData.find((lookup: ScanLookup) => lookup.sku === allocation.sku);

        if (scannerLookup) {
          belongingData.push({
            sku: allocation.sku,
            itemName: scannerLookup.itemName || allocation.sku,
            location: `Zone ${scannerLookup.targetZone}`,
            quantity: allocation.allocations[batchId] || 0
          });
        }
      });

      setCurrentLocationData(currentData);
      setBelongingLocationData(belongingData);

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

      {/* Two-Panel View */}
      {selectedBatch && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Location Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📍 Current Location</h3>
              <p className="text-sm text-gray-600">Where items ARE now</p>
            </div>
            <div className="p-4">
              {currentLocationData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No items found for this batch</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentLocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.sku}</div>
                        <div className="text-sm text-gray-600">{item.itemName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-600">{item.quantity}</div>
                        <div className="text-sm text-gray-600">{item.location}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Belonging Location Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">🎯 Belonging Location</h3>
              <p className="text-sm text-gray-600">Where items SHOULD go</p>
            </div>
            <div className="p-4">
              {belongingLocationData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎯</div>
                  <p>No destination data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {belongingLocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.sku}</div>
                        <div className="text-sm text-gray-600">{item.itemName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-green-600">{item.quantity}</div>
                        <div className="text-sm text-gray-600">{item.location}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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