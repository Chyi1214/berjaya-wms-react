// Make Transaction Dialog - Manager cross-batch/location transfer tool
import { useState, useEffect } from 'react';
import { tableStateService } from '../../../services/tableState';
import { transactionService } from '../../../services/transactions';
import { batchAllocationService } from '../../../services/batchAllocationService';
import { batchManagementService } from '../../../services/batchManagement';
import { Transaction, TransactionType, TransactionStatus } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { BatchDropdown } from '../../common/BatchDropdown';
import { LocationDropdown } from '../../common/LocationDropdown';

interface MakeTransactionDialogProps {
  sku: string;
  itemName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MakeTransactionDialog({ sku, itemName, onClose, onSuccess }: MakeTransactionDialogProps) {
  const { userRecord } = useAuth();
  const [fromLocation, setFromLocation] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [fromBatch, setFromBatch] = useState<string>('');
  const [toBatch, setToBatch] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [fromBatchOptions, setFromBatchOptions] = useState<Array<{ id: string; label: string; stockAmount?: number }>>([]);
  const [toBatchOptions, setToBatchOptions] = useState<Array<{ id: string; label: string; stockAmount?: number }>>([]);
  const [fromLocationOptions, setFromLocationOptions] = useState<Array<{ id: string; label: string; stockAmount?: number }>>([]);
  const [toLocationOptions, setToLocationOptions] = useState<Array<{ id: string; label: string; stockAmount?: number }>>([]);
  const [fromStockInfo, setFromStockInfo] = useState<{ total: number; batchAmount: number } | null>(null);
  const [toStockInfo, setToStockInfo] = useState<{ total: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available locations and batches
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load ALL managed batches and inventory allocations
      const [allocations, batches] = await Promise.all([
        batchAllocationService.getAllBatchAllocations(),
        batchManagementService.getAllBatches()
      ]);

      const locations = new Set<string>();

      // Standard locations
      locations.add('logistics');
      for (let i = 1; i <= 20; i++) {
        locations.add(`production_zone_${i}`);
      }

      // Locations from existing allocations
      allocations.forEach((alloc: any) => locations.add(alloc.location));

      const sortedLocations = Array.from(locations).sort();
      setAvailableLocations(sortedLocations);

      // Get batch IDs from batch management (all managed batches)
      const batchIds = batches.map((b: any) => b.batchId).sort((a: string, b: string) => {
        if (a === 'DEFAULT') return 1;
        if (b === 'DEFAULT') return -1;
        const aNum = parseInt(a) || 0;
        const bNum = parseInt(b) || 0;
        return aNum - bNum;
      });
      setAvailableBatches(batchIds);

      // Calculate stock amounts from inventory allocations for this SKU
      const batchStockTotals = new Map<string, number>();
      allocations.forEach(allocation => {
        if (allocation.sku === sku) {
          Object.entries(allocation.allocations).forEach(([batchId, qty]) => {
            const current = batchStockTotals.get(batchId) || 0;
            batchStockTotals.set(batchId, current + (qty as number));
          });
        }
      });

      // Initialize location options (no stock info yet)
      const initialLocationOptions = sortedLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: undefined
      }));
      setFromLocationOptions(initialLocationOptions);
      setToLocationOptions(initialLocationOptions);

      // Initialize batch options WITH total stock amounts (including 0)
      const initialBatchOptions = batchIds.map((batchId: string) => ({
        id: batchId,
        label: `Batch ${batchId}`,
        stockAmount: batchStockTotals.get(batchId) || 0
      }));
      setFromBatchOptions(initialBatchOptions);
      setToBatchOptions(initialBatchOptions);

    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load locations and batches');
    }
  };

  // Load batch options with stock info when location changes
  useEffect(() => {
    if (fromLocation && sku) {
      loadFromBatchOptions();
    } else {
      setFromBatchOptions([]);
    }
  }, [fromLocation, sku]);

  useEffect(() => {
    if (toLocation && sku) {
      loadToBatchOptions();
    } else {
      setToBatchOptions([]);
    }
  }, [toLocation, sku]);

  // Load location options with stock info when batch/SKU changes
  useEffect(() => {
    if (fromBatch && sku) {
      loadFromLocationOptions();
    } else if (sku) {
      // No batch selected, show all locations
      const options = availableLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: undefined
      }));
      setFromLocationOptions(options);
    }
  }, [fromBatch, sku, availableLocations]);

  useEffect(() => {
    if (toBatch && sku) {
      loadToLocationOptions();
    } else if (sku) {
      // No batch selected, show all locations
      const options = availableLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: undefined
      }));
      setToLocationOptions(options);
    }
  }, [toBatch, sku, availableLocations]);

  // Load source stock info when from location/batch changes
  useEffect(() => {
    if (fromLocation && sku) {
      loadFromStockInfo();
    }
  }, [fromLocation, fromBatch, sku]);

  // Load destination stock info when to location changes
  useEffect(() => {
    if (toLocation && sku) {
      loadToStockInfo();
    }
  }, [toLocation, sku]);

  const loadFromLocationOptions = async () => {
    if (!fromBatch || !sku) return;

    try {
      const allocations = await batchAllocationService.getAllBatchAllocations();

      const locationStocks = new Map<string, number>();
      allocations.forEach(allocation => {
        if (allocation.sku === sku) {
          const batchStock = allocation.allocations[fromBatch] || 0;
          if (batchStock > 0) {
            locationStocks.set(allocation.location, batchStock);
          }
        }
      });

      const options = availableLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: locationStocks.get(loc) || 0
      }));

      setFromLocationOptions(options);
    } catch (error) {
      console.error('Failed to load from location options:', error);
      setFromLocationOptions([]);
    }
  };

  const loadToLocationOptions = async () => {
    if (!toBatch || !sku) return;

    try {
      const allocations = await batchAllocationService.getAllBatchAllocations();

      const locationStocks = new Map<string, number>();
      allocations.forEach(allocation => {
        if (allocation.sku === sku) {
          const batchStock = allocation.allocations[toBatch] || 0;
          locationStocks.set(allocation.location, batchStock);
        }
      });

      const options = availableLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: locationStocks.get(loc) || 0
      }));

      setToLocationOptions(options);
    } catch (error) {
      console.error('Failed to load to location options:', error);
      setToLocationOptions([]);
    }
  };

  const loadFromBatchOptions = async () => {
    if (!fromLocation || !sku) return;

    try {
      const allocation = await batchAllocationService.getBatchAllocation(sku, fromLocation);

      const options = availableBatches.map(batchId => ({
        id: batchId,
        label: `Batch ${batchId}`,
        stockAmount: allocation?.allocations[batchId] || 0
      }));

      setFromBatchOptions(options);
    } catch (error) {
      console.error('Failed to load from batch options:', error);
      setFromBatchOptions([]);
    }
  };

  const loadToBatchOptions = async () => {
    if (!toLocation || !sku) return;

    try {
      const allocation = await batchAllocationService.getBatchAllocation(sku, toLocation);

      const options = availableBatches.map(batchId => ({
        id: batchId,
        label: `Batch ${batchId}`,
        stockAmount: allocation?.allocations[batchId] || 0
      }));

      setToBatchOptions(options);
    } catch (error) {
      console.error('Failed to load to batch options:', error);
      setToBatchOptions([]);
    }
  };

  const loadFromStockInfo = async () => {
    if (!fromLocation) return;

    try {
      const expected = await tableStateService.getExpectedInventory();
      const stock = expected.find(e => e.sku === sku && e.location === fromLocation);
      const totalStock = stock?.amount || 0;

      // Get batch-specific stock if batch selected
      let batchAmount = totalStock;
      if (fromBatch) {
        const allocation = await batchAllocationService.getBatchAllocation(sku, fromLocation);
        batchAmount = allocation?.allocations[fromBatch] || 0;
      }

      setFromStockInfo({ total: totalStock, batchAmount });
    } catch (error) {
      console.error('Failed to load from stock info:', error);
      setFromStockInfo(null);
    }
  };

  const loadToStockInfo = async () => {
    if (!toLocation) return;

    try {
      const expected = await tableStateService.getExpectedInventory();
      const stock = expected.find(e => e.sku === sku && e.location === toLocation);
      setToStockInfo({ total: stock?.amount || 0 });
    } catch (error) {
      console.error('Failed to load to stock info:', error);
      setToStockInfo(null);
    }
  };

  const handleSubmit = async () => {
    if (!userRecord) {
      setError('User not authenticated');
      return;
    }

    // Validation
    if (!fromLocation) {
      setError('Please select source location');
      return;
    }

    if (!fromBatch) {
      setError('Please select source batch');
      return;
    }

    if (!toLocation) {
      setError('Please select destination location');
      return;
    }

    if (!toBatch) {
      setError('Please select destination batch');
      return;
    }

    if (fromLocation === toLocation && fromBatch === toBatch) {
      setError('Source and destination must be different');
      return;
    }

    if (amount <= 0) {
      setError('Transfer amount must be greater than zero');
      return;
    }

    // Check available stock
    const availableAmount = fromBatch && fromStockInfo ? fromStockInfo.batchAmount : fromStockInfo?.total || 0;
    if (amount > availableAmount) {
      setError(`Insufficient stock. Available: ${availableAmount} units`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create transfer transaction
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku,
        itemName,
        amount,
        previousAmount: toStockInfo?.total || 0,
        newAmount: (toStockInfo?.total || 0) + amount,
        location: toLocation, // Destination location for the transaction
        fromLocation,
        toLocation,
        transactionType: TransactionType.TRANSFER_IN,
        status: TransactionStatus.COMPLETED,
        performedBy: userRecord.email,
        timestamp: new Date(),
        notes: `Manager transfer from ${fromBatch === 'DEFAULT' ? 'Default' : `Batch ${fromBatch}`} to ${toBatch === 'DEFAULT' ? 'Default' : `Batch ${toBatch}`}${notes ? ` | ${notes}` : ''} | By: ${userRecord.email}`,
        batchId: toBatch // Destination batch (required)
      };

      // Save transaction
      await transactionService.saveTransaction(transaction);

      // TWO-LAYER SYNC PATTERN:
      // 1. Update Layer 2 (batch_allocations) first - source of truth
      // 2. Then sync Layer 1 (expected_inventory) from Layer 2 automatically

      // Update source: Remove from batch allocation
      await batchAllocationService.removeToBatchAllocation(
        sku,
        fromLocation,
        fromBatch, // Batch is now required
        amount
      );

      // Get total at source location after removal
      const sourceAllocation = await batchAllocationService.getBatchAllocation(sku, fromLocation);
      const sourceTotal = sourceAllocation?.totalAllocated || 0;

      // Sync Layer 1 from Layer 2 for source location
      console.log(`🔄 Syncing Layer 1 for source: ${sku} @ ${fromLocation}...`);
      try {
        await tableStateService.syncExpectedFromBatchAllocations(sku, fromLocation, sourceTotal);
        console.log(`✅ Source layer sync completed`);
      } catch (syncError) {
        console.error(`❌ Source layer sync failed:`, syncError);
      }

      // Update destination: Add to batch allocation
      await batchAllocationService.addToBatchAllocation(
        sku,
        toLocation,
        toBatch, // Batch is now required
        amount
      );

      // Get total at destination location after addition
      const destAllocation = await batchAllocationService.getBatchAllocation(sku, toLocation);
      const destTotal = destAllocation?.totalAllocated || 0;

      // Sync Layer 1 from Layer 2 for destination location
      console.log(`🔄 Syncing Layer 1 for destination: ${sku} @ ${toLocation}...`);
      try {
        await tableStateService.syncExpectedFromBatchAllocations(sku, toLocation, destTotal);
        console.log(`✅ Destination layer sync completed`);
      } catch (syncError) {
        console.error(`❌ Destination layer sync failed:`, syncError);
      }

      console.log(`✅ Transfer completed: ${amount} x ${sku} from ${fromLocation} (${fromBatch === 'DEFAULT' ? 'Default' : `Batch ${fromBatch}`}) to ${toLocation} (${toBatch === 'DEFAULT' ? 'Default' : `Batch ${toBatch}`})`);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create transfer:', error);
      setError(`Failed to create transfer: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLocation = (loc: string) => {
    return loc === 'logistics' ? 'Logistics' : loc.replace('production_zone_', 'Production Zone ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🔄</span>
            Make Transaction - {sku}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{itemName}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Source Section */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📤</span>
              Transfer From (Source)
            </h4>

            <div className="space-y-4">
              {/* From Batch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Batch *
                </label>
                <BatchDropdown
                  value={fromBatch}
                  onChange={(value) => setFromBatch(value)}
                  options={fromBatchOptions}
                  placeholder="Select batch..."
                  disabled={isLoading}
                  showStockBadges={true}
                  includeDefault={true}
                />
              </div>

              {/* From Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Location *
                </label>
                <LocationDropdown
                  value={fromLocation}
                  onChange={(value) => setFromLocation(value)}
                  options={fromLocationOptions}
                  placeholder="Select source location..."
                  disabled={isLoading}
                  showStockBadges={true}
                />
              </div>

              {/* Source Stock Info */}
              {fromStockInfo && fromLocation && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">Available Stock:</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {fromBatch ? fromStockInfo.batchAmount : fromStockInfo.total}
                    </span>
                    <span className="text-sm text-gray-600">units</span>
                    {fromBatch && (
                      <span className="text-xs text-gray-500">
                        (Total: {fromStockInfo.total})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transfer Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={amount || ''}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter quantity to transfer"
              disabled={isLoading}
            />
          </div>

          {/* Destination Section */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📥</span>
              Transfer To (Destination)
            </h4>

            <div className="space-y-4">
              {/* To Batch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Batch *
                </label>
                <BatchDropdown
                  value={toBatch}
                  onChange={(value) => setToBatch(value)}
                  options={toBatchOptions}
                  placeholder="Select batch..."
                  disabled={isLoading}
                  showStockBadges={true}
                  includeDefault={true}
                />
              </div>

              {/* To Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Location *
                </label>
                <LocationDropdown
                  value={toLocation}
                  onChange={(value) => setToLocation(value)}
                  options={toLocationOptions}
                  placeholder="Select destination location..."
                  disabled={isLoading}
                  showStockBadges={true}
                />
              </div>

              {/* Destination Stock Info */}
              {toStockInfo && toLocation && (
                <div className="bg-white border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-gray-600 mb-1">Current Stock:</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{toStockInfo.total}</span>
                    <span className="text-sm text-gray-600">units</span>
                    {amount > 0 && (
                      <>
                        <span className="text-xl mx-2">→</span>
                        <span className="text-2xl font-bold text-blue-600">{toStockInfo.total + amount}</span>
                        <span className="text-sm text-blue-600">units</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional context (e.g., reason for transfer, reference number)..."
              disabled={isLoading}
            />
          </div>

          {/* Transfer Summary */}
          {fromLocation && toLocation && amount > 0 && (
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
              <div className="text-sm font-semibold text-purple-900 mb-2">Transfer Summary:</div>
              <div className="text-sm text-purple-800 space-y-1">
                <div>
                  <strong>{amount} units</strong> of <strong>{sku}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <span>From: {formatLocation(fromLocation)}{fromBatch ? ` (Batch ${fromBatch})` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>To: {formatLocation(toLocation)}{toBatch ? ` (Batch ${toBatch})` : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !fromLocation || !fromBatch || !toLocation || !toBatch || amount <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Transferring...
              </div>
            ) : (
              'Create Transfer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MakeTransactionDialog;
