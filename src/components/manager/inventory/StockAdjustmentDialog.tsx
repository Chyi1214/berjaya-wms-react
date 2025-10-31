// Stock Adjustment Dialog - Manager inventory correction tool
import { useState, useEffect } from 'react';
import { tableStateService } from '../../../services/tableState';
import { transactionService } from '../../../services/transactions';
import { batchAllocationService } from '../../../services/batchAllocationService';
import { Transaction, TransactionType, TransactionStatus } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { LocationDropdown } from '../../common/LocationDropdown';
import { BatchDropdown } from '../../common/BatchDropdown';

interface StockAdjustmentDialogProps {
  sku: string;
  itemName: string;
  onClose: () => void;
  onSuccess: () => void;
}

type AdjustmentMode = 'SET_TO' | 'ADD' | 'SUBTRACT';

const ADJUSTMENT_REASONS = [
  'Inventory count correction',
  'System error correction',
  'Damaged goods write-off',
  'Found items (unrecorded)',
  'Lost items (unrecorded)',
  'Transfer not recorded',
  'Manual rebalancing',
  'Other (specify in notes)'
];

export function StockAdjustmentDialog({ sku, itemName, onClose, onSuccess }: StockAdjustmentDialogProps) {
  const { userRecord } = useAuth();
  const [mode, setMode] = useState<AdjustmentMode>('SET_TO');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [batchOptions, setBatchOptions] = useState<Array<{ id: string; label: string; stockAmount?: number }>>([]);
  const [locationOptions, setLocationOptions] = useState<Array<{ id: string; label: string; stockAmount?: number }>>([]);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available locations
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const allocations = await batchAllocationService.getAllBatchAllocations();
      const locations = new Set<string>();

      // Standard locations
      locations.add('logistics');
      for (let i = 1; i <= 20; i++) {
        locations.add(`production_zone_${i}`);
      }

      // Locations from existing allocations
      allocations.forEach(alloc => locations.add(alloc.location));

      setAvailableLocations(Array.from(locations).sort());

      // Auto-select logistics as default
      if (locations.has('logistics')) {
        setSelectedLocation('logistics');
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      setError('Failed to load locations');
    }
  };

  // Build location options with stock info when batch changes
  useEffect(() => {
    if (selectedBatch && sku) {
      loadLocationOptions();
    } else if (sku) {
      // No batch selected, show all locations without stock info
      const options = availableLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: undefined
      }));
      setLocationOptions(options);
    }
  }, [selectedBatch, sku, availableLocations]);

  // Build batch options with stock info when location changes
  useEffect(() => {
    if (selectedLocation) {
      loadBatches();
    } else {
      setBatchOptions([]);
      setSelectedBatch('');
    }
  }, [selectedLocation, sku]);

  const loadLocationOptions = async () => {
    if (!selectedBatch || !sku) return;

    try {
      const allocations = await batchAllocationService.getAllBatchAllocations();

      const locationStocks = new Map<string, number>();
      allocations.forEach(allocation => {
        if (allocation.sku === sku) {
          const batchStock = allocation.allocations[selectedBatch] || 0;
          locationStocks.set(allocation.location, batchStock);
        }
      });

      const options = availableLocations.map(loc => ({
        id: loc,
        label: loc,
        stockAmount: locationStocks.get(loc) || 0
      }));

      setLocationOptions(options);
    } catch (error) {
      console.error('Failed to load location options:', error);
      setLocationOptions([]);
    }
  };

  const loadBatches = async () => {
    if (!selectedLocation) return;

    try {
      const allocation = await batchAllocationService.getBatchAllocation(sku, selectedLocation);

      if (allocation && allocation.allocations) {
        // Get batches with their stock amounts
        const batchEntries = Object.entries(allocation.allocations)
          .filter(([, qty]) => qty > 0)
          .sort(([a], [b]) => {
            // Numeric sort: 1, 2, 3... not 1, 10, 2...
            const aNum = a === 'DEFAULT' ? Number.MAX_SAFE_INTEGER : parseInt(a) || 0;
            const bNum = b === 'DEFAULT' ? Number.MAX_SAFE_INTEGER : parseInt(b) || 0;
            return aNum - bNum;
          });

        // Always include DEFAULT
        const hasDefault = batchEntries.some(([id]) => id === 'DEFAULT');
        if (!hasDefault) {
          batchEntries.push(['DEFAULT', 0]);
        }

        // Build batch options with stock amounts
        const options = batchEntries.map(([id, qty]) => ({
          id,
          label: id === 'DEFAULT' ? 'Default' : `Batch ${id}`,
          stockAmount: qty
        }));
        setBatchOptions(options);
      } else {
        // No existing allocations, only show DEFAULT
        setBatchOptions([{ id: 'DEFAULT', label: 'Default', stockAmount: 0 }]);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
      setBatchOptions([{ id: 'DEFAULT', label: 'Default', stockAmount: 0 }]);
    }
  };

  // Load current stock when location or batch changes
  useEffect(() => {
    if (selectedLocation && selectedBatch) {
      loadCurrentStock();
    }
  }, [selectedLocation, selectedBatch, sku]);

  const loadCurrentStock = async () => {
    if (!selectedLocation || !selectedBatch) return;

    try {
      // Load batch-specific stock from Layer 2 (batch_allocations)
      const allocation = await batchAllocationService.getBatchAllocation(sku, selectedLocation);
      const batchStock = allocation?.allocations[selectedBatch] || 0;
      setCurrentStock(batchStock);
    } catch (error) {
      console.error('Failed to load current stock:', error);
      setCurrentStock(null);
    }
  };

  const calculateNewAmount = (): number => {
    const current = currentStock || 0;

    switch (mode) {
      case 'SET_TO':
        return amount;
      case 'ADD':
        return current + amount;
      case 'SUBTRACT':
        return current - amount;
      default:
        return current;
    }
  };

  const calculateDelta = (): number => {
    const newAmount = calculateNewAmount();
    return newAmount - (currentStock || 0);
  };

  const handleSubmit = async () => {
    if (!userRecord) {
      setError('User not authenticated');
      return;
    }

    // Validation
    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    if (!selectedBatch) {
      setError('Please select a batch');
      return;
    }

    if (!reason) {
      setError('Please select a reason for adjustment');
      return;
    }

    if (mode === 'SET_TO' && amount < 0) {
      setError('Cannot set stock to negative value');
      return;
    }

    const newAmount = calculateNewAmount();
    if (newAmount < 0) {
      setError(`Adjustment would result in negative stock (${newAmount}). Please adjust the amount.`);
      return;
    }

    const delta = calculateDelta();
    if (delta === 0) {
      setError('No change in stock quantity. Please adjust the amount.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const previousAmount = currentStock || 0;

      // Create adjustment transaction
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku,
        itemName,
        amount: delta,
        previousAmount,
        newAmount,
        location: selectedLocation,
        transactionType: TransactionType.ADJUSTMENT,
        status: TransactionStatus.COMPLETED,
        performedBy: userRecord.email,
        timestamp: new Date(),
        notes: `${reason}${notes ? ` | ${notes}` : ''} | Mode: ${mode} | Batch: ${selectedBatch} | Adjusted by: ${userRecord.email}`
      };

      // Save transaction to database
      await transactionService.saveTransaction(transaction);

      // TWO-LAYER SYNC PATTERN:
      // 1. Update Layer 2 (batch_allocations) first - source of truth
      if (delta > 0) {
        // Adding stock
        await batchAllocationService.addToBatchAllocation(
          sku,
          selectedLocation,
          selectedBatch,
          delta
        );
      } else {
        // Removing stock (delta is negative)
        await batchAllocationService.removeToBatchAllocation(
          sku,
          selectedLocation,
          selectedBatch,
          Math.abs(delta)
        );
      }

      // 2. Calculate the total amount at this location after adjustment
      // We need to sum ALL batches at this location, not just the one we adjusted
      const allocationAfter = await batchAllocationService.getBatchAllocation(sku, selectedLocation);
      const totalAtLocation = allocationAfter?.totalAllocated || 0;

      // 3. Sync Layer 1 (expected_inventory) from Layer 2 automatically
      try {
        await tableStateService.syncExpectedFromBatchAllocations(sku, selectedLocation, totalAtLocation);
      } catch (syncError) {
        console.error(`❌ Layer sync failed for ${sku} @ ${selectedLocation}:`, syncError);
        // Don't throw - adjustment already succeeded, just log the sync failure
      }

      console.log(`✅ Stock adjustment completed: ${sku} @ ${selectedLocation} Batch ${selectedBatch}: ${previousAmount} → ${newAmount} (${delta >= 0 ? '+' : ''}${delta})`);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      setError(`Failed to adjust stock: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const newAmount = calculateNewAmount();
  const delta = calculateDelta();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Adjust Stock - {sku}
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

          {/* Batch Selection */}
          {batchOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch *
              </label>
              <BatchDropdown
                value={selectedBatch}
                onChange={(value) => setSelectedBatch(value)}
                options={batchOptions}
                placeholder="Select batch..."
                disabled={isLoading}
                showStockBadges={true}
                includeDefault={false}
              />
            </div>
          )}

          {/* Location Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <LocationDropdown
              value={selectedLocation}
              onChange={(value) => setSelectedLocation(value)}
              options={locationOptions}
              placeholder="Select location..."
              disabled={isLoading}
              showStockBadges={true}
            />
          </div>

          {/* Current Stock Display */}
          {currentStock !== null && selectedLocation && selectedBatch && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-blue-900 mb-2">Current Stock</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    @ {selectedLocation === 'logistics' ? 'Logistics' : selectedLocation.replace('production_zone_', 'Zone ')} - {selectedBatch === 'DEFAULT' ? '❓ Default' : `📦 Batch ${selectedBatch}`}
                  </span>
                  <span className="text-2xl font-bold text-blue-900">{currentStock} units</span>
                </div>
              </div>
            </div>
          )}

          {/* Adjustment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Adjustment Mode *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMode('SET_TO')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  mode === 'SET_TO'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isLoading}
              >
                <div className="text-sm font-medium">Set To</div>
                <div className="text-xs text-gray-600 mt-1">Absolute value</div>
              </button>
              <button
                onClick={() => setMode('ADD')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  mode === 'ADD'
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isLoading}
              >
                <div className="text-sm font-medium">Add (+)</div>
                <div className="text-xs text-gray-600 mt-1">Increase stock</div>
              </button>
              <button
                onClick={() => setMode('SUBTRACT')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  mode === 'SUBTRACT'
                    ? 'border-red-500 bg-red-50 text-red-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                disabled={isLoading}
              >
                <div className="text-sm font-medium">Subtract (-)</div>
                <div className="text-xs text-gray-600 mt-1">Decrease stock</div>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {mode === 'SET_TO' ? 'New Stock Level *' : 'Quantity *'}
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={mode === 'SET_TO' ? 'Enter new stock level' : 'Enter quantity'}
              disabled={isLoading}
            />
          </div>

          {/* Preview */}
          {currentStock !== null && amount > 0 && (
            <div className={`rounded-lg p-4 border-2 ${
              newAmount < 0
                ? 'bg-red-50 border-red-300'
                : delta > 0
                  ? 'bg-green-50 border-green-300'
                  : delta < 0
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="text-sm font-medium text-gray-900 mb-2">Preview:</div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">{currentStock} units</span>
                <span className="text-2xl mx-4">→</span>
                <span className={`font-bold ${newAmount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {newAmount} units
                </span>
                <span className={`ml-4 font-semibold ${
                  delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  ({delta >= 0 ? '+' : ''}{delta})
                </span>
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Adjustment *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">Select reason...</option>
              {ADJUSTMENT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes {reason === 'Other (specify in notes)' && '*'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional context or details..."
              disabled={isLoading}
            />
          </div>
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
            disabled={isLoading || !selectedLocation || !selectedBatch || !reason || (reason === 'Other (specify in notes)' && !notes)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adjusting...
              </div>
            ) : (
              'Adjust Stock'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockAdjustmentDialog;
