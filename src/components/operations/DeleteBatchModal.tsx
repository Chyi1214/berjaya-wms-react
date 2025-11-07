// Delete Batch Modal - Enhanced with stock visibility and clear warnings
import { useState, useEffect } from 'react';
import { Batch } from '../../types/inventory';
import { batchAllocationService } from '../../services/batchAllocationService';
import { batchManagementService } from '../../services/batchManagement';

interface DeleteBatchModalProps {
  batch: Batch | null; // null means show batch selector inside modal
  boxCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  mode?: 'full' | 'inventory-only'; // 'full' = delete everything, 'inventory-only' = delete only inventory allocations
}

interface BatchStockSummary {
  totalStock: number;
  locationBreakdown: Array<{ location: string; quantity: number }>;
  skuCount: number;
}

export function DeleteBatchModal({ batch: batchProp, boxCount: boxCountProp, onConfirm, onCancel, mode = 'full' }: DeleteBatchModalProps) {
  // Internal state for batch selection when batch prop is null
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(batchProp);
  const [boxCount, setBoxCount] = useState(boxCountProp);

  const [stockSummary, setStockSummary] = useState<BatchStockSummary | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(batchProp === null);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inventory-only mode specific state
  const [deleteMetadataToo, setDeleteMetadataToo] = useState(false);

  // Load available batches if batch prop is null (batch selector mode)
  useEffect(() => {
    if (batchProp === null) {
      loadAvailableBatches();
    } else {
      setSelectedBatch(batchProp);
      setBoxCount(boxCountProp);
    }
  }, [batchProp]);

  // Load batch stock when selected batch changes
  useEffect(() => {
    if (selectedBatch) {
      loadBatchStock(selectedBatch.batchId);
      loadBoxCount(selectedBatch.batchId);
    }
  }, [selectedBatch]);

  // Load selected batch info when batch ID changes (in selector mode)
  useEffect(() => {
    if (selectedBatchId && batchProp === null && availableBatches.length > 0) {
      // Use the batch from availableBatches directly (it already has all the info we created)
      const batch = availableBatches.find(b => b.batchId === selectedBatchId);
      if (batch) {
        console.log('✅ Setting selected batch:', batch.batchId);
        setSelectedBatch(batch);
      } else {
        console.warn('⚠️ Batch not found in availableBatches:', selectedBatchId);
      }
    }
  }, [selectedBatchId, availableBatches, batchProp]);

  const loadAvailableBatches = async () => {
    setIsLoadingBatches(true);
    try {
      // Get batches from batch metadata
      const batches = await batchManagementService.getAllBatches();

      // ALSO get all batches that exist in batch allocations
      const allocations = await batchAllocationService.getAllBatchAllocations();
      const batchesFromAllocations = new Set<string>();

      allocations.forEach(allocation => {
        if (allocation.allocations) {
          Object.keys(allocation.allocations).forEach(batchId => {
            if (allocation.allocations[batchId] > 0) {
              batchesFromAllocations.add(batchId);
            }
          });
        }
      });

      // Create batch objects for batches that exist only in allocations
      const allBatches = [...batches];
      const existingBatchIds = new Set(batches.map(b => b.batchId));

      batchesFromAllocations.forEach(batchId => {
        if (!existingBatchIds.has(batchId)) {
          // Create a minimal batch object for inventory-only batches
          allBatches.push({
            batchId,
            name: batchId,
            items: [],
            carVins: [],
            carType: 'Not set',
            totalCars: 0,
            status: 'planning' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      });

      // Sort by batchId
      allBatches.sort((a, b) => a.batchId.localeCompare(b.batchId));

      console.log(`📦 Found ${allBatches.length} total batches (${batches.length} with metadata, ${batchesFromAllocations.size} with allocations)`);

      setAvailableBatches(allBatches);
      if (allBatches.length > 0) {
        setSelectedBatchId(allBatches[0].batchId);
      } else {
        console.warn('⚠️ No batches found in either metadata or allocations');
      }
    } catch (error) {
      console.error('❌ Failed to load batches:', error);
      setAvailableBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Removed loadBatchInfo - we now use batches from availableBatches directly

  const loadBoxCount = async (batchId: string) => {
    try {
      const { packingBoxesService } = await import('../../services/packingBoxesService');
      const boxes = await packingBoxesService.listBoxes(batchId);
      setBoxCount(boxes.length);
    } catch (error) {
      console.error('Failed to load box count:', error);
      setBoxCount(0);
    }
  };

  const loadBatchStock = async (batchId: string) => {
    setIsLoadingStock(true);
    try {
      // Get batch allocations
      const allocations = await batchAllocationService.getAllBatchAllocations();

      // ALSO get actual inventory counts to compare
      const { collection, getDocs, getFirestore } = await import('firebase/firestore');
      const db = getFirestore();
      const inventorySnapshot = await getDocs(collection(db, 'inventory_counts'));

      let totalStock = 0;
      const locationMap = new Map<string, number>();
      const skusSet = new Set<string>();

      // Method 1: Count from batch allocations
      allocations.forEach(allocation => {
        if (allocation.allocations && allocation.allocations[batchId]) {
          const qty = allocation.allocations[batchId];
          if (qty > 0) {
            totalStock += qty;
            skusSet.add(allocation.sku);
            const currentLoc = locationMap.get(allocation.location) || 0;
            locationMap.set(allocation.location, currentLoc + qty);
          }
        }
      });

      // Method 2: Also check actual inventory_counts for this batch
      // Some inventory might be in inventory_counts but not in batch allocations
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Check if this inventory entry is for our batch
        if (data.batchId === batchId && data.amount > 0) {
          const sku = data.sku;
          const location = data.location;
          const amount = data.amount;

          // Add to totals (checking if not already counted from batch allocations)
          const existingQty = locationMap.get(location) || 0;

          // Only add if this location wasn't already fully counted from batch allocations
          // This prevents double-counting
          const allocationQty = allocations.find(a => a.sku === sku && a.location === location)?.allocations?.[batchId] || 0;

          if (amount > allocationQty) {
            // There's more actual inventory than allocation shows
            const difference = amount - allocationQty;
            totalStock += difference;
            locationMap.set(location, existingQty + difference);
            skusSet.add(sku);
          }
        }
      });

      const locationBreakdown = Array.from(locationMap.entries())
        .map(([location, quantity]) => ({ location, quantity }))
        .sort((a, b) => b.quantity - a.quantity);

      console.log(`📊 Batch ${batchId} inventory summary:`, {
        totalStock,
        skuCount: skusSet.size,
        locationBreakdown
      });

      setStockSummary({
        totalStock,
        locationBreakdown,
        skuCount: skusSet.size
      });
    } catch (error) {
      console.error('Failed to load batch stock:', error);
      setStockSummary({ totalStock: 0, locationBreakdown: [], skuCount: 0 });
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBatch) return;

    setIsDeleting(true);
    try {
      if (mode === 'inventory-only') {
        // Inventory-only mode: Only delete batch allocations (Layer 2)
        console.log(`🗑️ Clearing inventory for batch ${selectedBatch.batchId}...`);
        const result = await batchAllocationService.zeroStockForBatch(selectedBatch.batchId, 'SYSTEM_INVENTORY_MANAGER');

        let message = `✅ Successfully cleared inventory for Batch ${selectedBatch.batchId}!\n\n` +
                      `📊 Summary:\n` +
                      `• ${result.skusAffected} SKU+Location combinations affected\n` +
                      `• ${result.totalZeroed} total units removed`;

        // Optionally delete batch metadata if requested and allowed
        if (deleteMetadataToo && canDeleteMetadata()) {
          try {
            console.log(`🗑️ Also deleting batch metadata for ${selectedBatch.batchId}...`);
            await batchManagementService.deleteBatch(selectedBatch.batchId);
            message += `\n\n🗑️ Batch metadata also deleted`;
          } catch (metadataError) {
            console.warn(`⚠️ Batch metadata not found (batch only exists in allocations):`, metadataError);
            message += `\n\n⚠️ Note: This batch had no metadata to delete (inventory-only batch)`;
          }
        }

        alert(message);
      } else {
        // Full mode: Delete everything (original behavior)
        await batchManagementService.deleteBatch(selectedBatch.batchId);
        console.log(`✅ Successfully deleted batch ${selectedBatch.batchId}`);
        alert(`🗑️ Batch ${selectedBatch.batchId} deleted successfully!`);
      }

      onConfirm();
    } catch (error) {
      console.error('Failed to delete batch:', error);
      alert(`Failed to delete batch. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if batch metadata can be deleted (only if not active and has no VINs/boxes)
  const canDeleteMetadata = () => {
    if (!selectedBatch) return false;
    const isNotActive = selectedBatch.status !== 'in_progress';
    const hasNoVins = (selectedBatch.carVins?.length || 0) === 0;
    const hasNoBoxes = boxCount === 0;
    return isNotActive && hasNoVins && hasNoBoxes;
  };

  const formatLocation = (loc: string) => {
    if (loc === 'logistics') return '🚚 Logistics';
    if (loc.startsWith('production_zone_')) {
      const zoneNum = loc.replace('production_zone_', '');
      return `🏭 Production Zone ${zoneNum}`;
    }
    return loc;
  };

  const hasStock = stockSummary && stockSummary.totalStock > 0;
  const vinCount = selectedBatch?.carVins?.length || 0;

  // Show loading state while batches are being loaded
  if (batchProp === null && isLoadingBatches) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading batches...</p>
        </div>
      </div>
    );
  }

  // If no batch selected yet (shouldn't happen but safeguard)
  if (!selectedBatch) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No batch selected</p>
          <button onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`sticky top-0 border-b px-6 py-4 rounded-t-lg ${
          mode === 'inventory-only'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`text-xl font-bold flex items-center ${
            mode === 'inventory-only' ? 'text-orange-900' : 'text-red-900'
          }`}>
            <span className="text-3xl mr-3">{mode === 'inventory-only' ? '🗂️' : '🗑️'}</span>
            {mode === 'inventory-only'
              ? `Manage Batch ${selectedBatch.batchId} Inventory`
              : `Delete Batch ${selectedBatch.batchId}`
            }
          </h3>
          <p className={`text-sm mt-1 ${
            mode === 'inventory-only' ? 'text-orange-700' : 'text-red-700'
          }`}>
            {mode === 'inventory-only'
              ? '⚠️ Layer 2 Only: This will clear inventory allocations, not batch metadata'
              : 'This action will permanently remove all batch data'
            }
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Batch Selector - Only show when batch prop is null */}
          {batchProp === null && availableBatches.length > 0 && (
            <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Select Batch to Delete:
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setConfirmationChecked(false); // Reset confirmation when batch changes
                }}
                className="w-full border-2 border-blue-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {availableBatches.map(batch => (
                  <option key={batch.batchId} value={batch.batchId}>
                    Batch {batch.batchId} - {batch.carType || 'No car type'} ({batch.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Batch Info Card */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">📦 Batch Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Batch ID:</span>
                <div className="font-medium text-gray-900">{selectedBatch.batchId}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="font-medium text-gray-900">{selectedBatch.status || 'planning'}</div>
              </div>
              <div>
                <span className="text-gray-600">Car Type:</span>
                <div className="font-medium text-gray-900">{selectedBatch.carType || 'Not set'}</div>
              </div>
              <div>
                <span className="text-gray-600">Total Cars:</span>
                <div className="font-medium text-gray-900">{selectedBatch.totalCars || 0} VINs</div>
              </div>
            </div>
          </div>

          {/* Stock Warning Card */}
          {isLoadingStock ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Calculating inventory...</p>
            </div>
          ) : hasStock ? (
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300">
              <div className="flex items-start mb-3">
                <span className="text-3xl mr-3">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-bold text-orange-900 mb-1">Batch Contains Inventory</h4>
                  <p className="text-sm text-orange-800">
                    This batch has <strong>{stockSummary.totalStock} units</strong> of inventory across <strong>{stockSummary.skuCount} SKUs</strong>.
                    Deleting will discard all inventory.
                  </p>
                </div>
              </div>

              {/* Location Breakdown */}
              <div className="bg-white rounded border border-orange-200 p-3 mt-3">
                <div className="text-xs font-semibold text-orange-900 mb-2">📍 Stock by Location:</div>
                <div className="space-y-1">
                  {stockSummary.locationBreakdown.slice(0, 5).map(({ location, quantity }) => (
                    <div key={location} className="flex justify-between text-xs">
                      <span className="text-gray-700">{formatLocation(location)}</span>
                      <span className="font-medium text-orange-700">{quantity} units</span>
                    </div>
                  ))}
                  {stockSummary.locationBreakdown.length > 5 && (
                    <div className="text-xs text-orange-600 italic">
                      ... and {stockSummary.locationBreakdown.length - 5} more locations
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h4 className="font-semibold text-green-900">No Inventory</h4>
                  <p className="text-sm text-green-700">This batch has no inventory allocations.</p>
                </div>
              </div>
            </div>
          )}

          {/* What Will Be Deleted */}
          {mode === 'inventory-only' ? (
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300">
              <h4 className="font-bold text-orange-900 mb-3 flex items-center">
                <span className="mr-2">📦</span>
                This Will Remove (Layer 2 - Inventory Only):
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <span className="mr-2">•</span>
                  <div>
                    <strong className="text-orange-900">
                      {hasStock ? `${stockSummary?.totalStock} units of inventory` : 'No inventory to remove'}
                    </strong>
                    <div className="text-orange-700 text-xs">
                      All batch_allocations records for this batch will be zeroed
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-orange-200">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center text-sm">
                  <span className="mr-2">✅</span>
                  Will NOT Be Affected (Layer 1 - Operations):
                </h4>
                <div className="space-y-1 text-xs text-green-800">
                  <div>• Batch metadata and configuration</div>
                  {vinCount > 0 && <div>• {vinCount} VIN plans</div>}
                  {boxCount > 0 && <div>• {boxCount} packing boxes</div>}
                  <div>• Material requirements tracking</div>
                </div>
              </div>

              {/* Optional: Delete metadata too */}
              {canDeleteMetadata() && (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteMetadataToo}
                      onChange={(e) => setDeleteMetadataToo(e.target.checked)}
                      className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      disabled={isDeleting}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-red-900 text-sm">
                        Also delete batch metadata
                      </span>
                      <p className="text-xs text-red-700 mt-1">
                        This batch is not active and has no VINs or boxes. You can optionally delete the batch metadata too.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-bold text-red-900 mb-3 flex items-center">
                <span className="mr-2">❌</span>
                This Will Permanently Delete:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <span className="mr-2">•</span>
                  <div>
                    <strong>Batch configuration and metadata</strong>
                    <div className="text-red-700 text-xs">All batch settings and information</div>
                  </div>
                </div>
                {vinCount > 0 && (
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <div>
                      <strong>{vinCount} VIN plans</strong>
                      <div className="text-red-700 text-xs">Vehicle identification numbers and car type mappings</div>
                    </div>
                  </div>
                )}
                {boxCount > 0 && (
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <div>
                      <strong>{boxCount} packing boxes</strong>
                      <div className="text-red-700 text-xs">Packing list and box contents</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start">
                  <span className="mr-2">•</span>
                  <div>
                    <strong>Material requirements tracking</strong>
                    <div className="text-red-700 text-xs">Health tracking and consumption records</div>
                  </div>
                </div>
                {hasStock && (
                  <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <div>
                      <strong className="text-orange-900">{stockSummary?.totalStock} units of inventory</strong>
                      <div className="text-orange-700 text-xs font-medium">
                        Inventory allocations will be removed from all locations
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(e) => setConfirmationChecked(e.target.checked)}
                className={`mt-1 mr-3 h-5 w-5 rounded border-gray-300 focus:ring-${mode === 'inventory-only' ? 'orange' : 'red'}-500 ${
                  mode === 'inventory-only' ? 'text-orange-600' : 'text-red-600'
                }`}
                disabled={isDeleting}
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">
                  I understand this action cannot be undone
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  {mode === 'inventory-only'
                    ? hasStock
                      ? `I acknowledge that ${stockSummary?.totalStock} units of inventory will be removed from batch allocations (Layer 2).`
                      : 'I confirm that I want to clear this batch\'s inventory allocations.'
                    : hasStock
                      ? `I acknowledge that ${stockSummary?.totalStock} units of inventory will be discarded and cannot be recovered.`
                      : 'I confirm that I want to permanently delete this batch and all related data.'
                  }
                </p>
              </div>
            </label>
          </div>

          {/* Info Note */}
          <div className={`rounded-lg p-3 border ${
            mode === 'inventory-only'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start text-sm">
              <span className="text-blue-600 mr-2">ℹ️</span>
              <p className="text-blue-800">
                {mode === 'inventory-only' ? (
                  <>
                    <strong>Layer Separation:</strong> This operation only affects the inventory layer (batch_allocations).
                    The batch metadata in the operations layer remains intact unless you also check the optional deletion above.
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> Deleting a batch with inventory is a normal operation when discarding parts or scrapping a batch.
                    {hasStock && ' The inventory will be removed from all locations.'}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={!confirmationChecked || isDeleting}
            className={`flex-1 px-4 py-3 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
              mode === 'inventory-only'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {mode === 'inventory-only' ? 'Clearing...' : 'Deleting...'}
              </>
            ) : mode === 'inventory-only' ? (
              <>
                <span className="mr-2">🗂️</span>
                Clear Batch Inventory
              </>
            ) : (
              <>
                <span className="mr-2">🗑️</span>
                Delete Batch Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteBatchModal;
