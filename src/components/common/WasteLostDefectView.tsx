// Enhanced Waste/Lost/Defect View - Universal component for production and logistics
import { useState, useEffect } from 'react';
import { User, Transaction, TransactionType, TransactionStatus } from '../../types';
import { tableStateService } from '../../services/tableState';
import { combinedSearchService } from '../../services/combinedSearch';
import { wasteReportService, type WasteReport } from '../../services/wasteReportService';
import { batchAllocationService } from '../../services/batchAllocationService'; // v7.9.0: For batch allocation fix
import { transactionService } from '../../services/transactions'; // v7.18.0: For transaction records

interface WasteLostDefectViewProps {
  user: User;
  location: string; // "logistics" or "production_zone_X"
  locationDisplay: string; // "Logistics" or "Zone X"
  onBack: () => void;
}

interface WasteLostDefectEntry {
  sku: string;
  itemName: string;
  quantity: number;
  type: 'WASTE' | 'LOST' | 'DEFECT';
  reason?: string;

  // Batch tracking (v7.18.0)
  batchId?: string;
  batchAllocation?: number;

  // Additional fields for DEFECT (claim report)
  totalLotQuantity?: number;
  rejectionReason?: string[];
  customReason?: string;
  detectedBy?: string;
  actionTaken?: string;
  shift?: string;
}

// Rejection reason options for DEFECT
const REJECTION_REASONS = [
  'Defect (scratch, dent, crack, etc.)',
  'Wrong dimension / out of spec',
  'Missing component',
  'Contamination (oil, dirt, rust, etc.)'
];

const ACTION_OPTIONS = [
  'Rework',
  'Scrap',
  'Return to supplier',
  'Hold for further inspection'
];

export function WasteLostDefectView({ user, location, locationDisplay, onBack }: WasteLostDefectViewProps) {
  const [entries, setEntries] = useState<WasteLostDefectEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<WasteLostDefectEntry>({
    sku: '',
    itemName: '',
    quantity: 1,
    type: 'WASTE',
    reason: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<string[]>([]);
  const [currentStock, setCurrentStock] = useState<number | null>(null); // v7.9.0: Show current stock

  // v7.18.0: Batch selection
  const [availableBatches, setAvailableBatches] = useState<Array<{ batchId: string; allocated: number }>>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  // Search for items
  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        setShowSearch(false);
        return;
      }

      try {
        const results = await combinedSearchService.search(searchTerm, { includeItems: true, includeBOMs: false, limit: 10 });
        setSearchResults(results.slice(0, 10));
        setShowSearch(results.length > 0);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        setShowSearch(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const selectItem = async (item: any) => {
    setCurrentEntry({
      ...currentEntry,
      sku: item.code,
      itemName: item.name
    });
    setSearchTerm(`${item.code} - ${item.name}`);
    setShowSearch(false);

    // v7.9.0: Fetch and display current stock for selected item
    try {
      const expected = await tableStateService.getExpectedInventory();
      const stock = expected.find(e => e.sku === item.code && e.location === location);
      setCurrentStock(stock?.amount || 0);
    } catch (error) {
      console.warn('Failed to fetch current stock:', error);
      setCurrentStock(null);
    }

    // v7.18.0: Fetch available batches for this item at this location
    try {
      const batchAlloc = await batchAllocationService.getBatchAllocation(item.code, location);
      if (batchAlloc && batchAlloc.allocations) {
        const batches = Object.entries(batchAlloc.allocations)
          .filter(([, allocated]) => (allocated as number) > 0)
          .map(([batchId, allocated]) => ({
            batchId,
            allocated: allocated as number
          }))
          .sort((a, b) => {
            // Sort: Put DEFAULT last, otherwise sort by batch ID numerically
            if (a.batchId === 'DEFAULT') return 1;
            if (b.batchId === 'DEFAULT') return -1;
            const aNum = parseInt(a.batchId) || 0;
            const bNum = parseInt(b.batchId) || 0;
            return aNum - bNum;
          });
        setAvailableBatches(batches);
        setSelectedBatch(''); // Reset batch selection
      } else {
        setAvailableBatches([]);
        setSelectedBatch('');
      }
    } catch (error) {
      console.warn('Failed to fetch batch allocations:', error);
      setAvailableBatches([]);
      setSelectedBatch('');
    }
  };

  const handleTypeChange = (type: 'WASTE' | 'LOST' | 'DEFECT') => {
    setCurrentEntry({
      ...currentEntry,
      type,
      // Reset DEFECT-specific fields when switching types
      ...(type !== 'DEFECT' && {
        totalLotQuantity: undefined,
        rejectionReason: undefined,
        customReason: undefined,
        detectedBy: undefined,
        actionTaken: undefined,
        shift: undefined
      })
    });
    setSelectedRejectionReasons([]);
  };

  const handleRejectionReasonChange = (reason: string, checked: boolean) => {
    if (checked) {
      setSelectedRejectionReasons([...selectedRejectionReasons, reason]);
    } else {
      setSelectedRejectionReasons(selectedRejectionReasons.filter(r => r !== reason));
    }
  };

  const addEntry = () => {
    const missingFields: string[] = [];

    // Check required fields for all types
    if (!currentEntry.sku || !currentEntry.itemName) {
      missingFields.push('Item selection');
    }
    if (currentEntry.quantity < 1) {
      missingFields.push('Valid quantity (must be greater than 0)');
    }
    if (!currentEntry.reason?.trim()) {
      missingFields.push('Reason');
    }

    // v7.18.0: Batch selection validation
    if (availableBatches.length > 0) {
      if (!selectedBatch || !currentEntry.batchId) {
        missingFields.push('Batch selection');
      } else {
        // Validate quantity doesn't exceed batch allocation
        const batch = availableBatches.find(b => b.batchId === selectedBatch);
        const available = batch?.allocated || 0;
        if (currentEntry.quantity > available) {
          setError(`Insufficient stock in ${selectedBatch}. Available: ${available}, Trying to report: ${currentEntry.quantity}`);
          return;
        }
      }
    }

    // Additional validation for DEFECT type
    if (currentEntry.type === 'DEFECT') {
      if (selectedRejectionReasons.length === 0 && !currentEntry.customReason?.trim()) {
        missingFields.push('At least one rejection reason (checkboxes or custom reason)');
      }
      if (!currentEntry.detectedBy?.trim()) {
        missingFields.push('Detected By');
      }
      if (!currentEntry.actionTaken?.trim()) {
        missingFields.push('Action Taken');
      }
      if (!currentEntry.totalLotQuantity || currentEntry.totalLotQuantity < 1) {
        missingFields.push('Total Lot Quantity');
      }
    }

    // Show specific error message
    if (missingFields.length > 0) {
      setError(`Please fill the following required fields:\n• ${missingFields.join('\n• ')}`);
      return;
    }

    // For DEFECT, combine selected reasons
    const finalEntry = {
      ...currentEntry,
      ...(currentEntry.type === 'DEFECT' && {
        rejectionReason: selectedRejectionReasons.length > 0 ? selectedRejectionReasons : undefined
      })
    };

    setEntries([...entries, finalEntry]);
    setCurrentEntry({
      sku: '',
      itemName: '',
      quantity: 1,
      type: 'WASTE',
      reason: ''
    });
    setSearchTerm('');
    setSelectedRejectionReasons([]);
    setError(null);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const generateClaimReport = (entry: WasteLostDefectEntry): string => {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    return `
REJECT PART LOG
Date: ${date} Shift / Time: ${entry.shift || time}

Part Name / Description: ${entry.itemName} Part Number / Code: ${entry.sku}

Quantity Rejected: ${entry.quantity} Total Lot Quantity: ${entry.totalLotQuantity || ''}

Reason for Rejection:
${REJECTION_REASONS.map(reason =>
  `☐ ${entry.rejectionReason?.includes(reason) ? '✓' : ' '} ${reason}`
).join('\n')}
☐ ${entry.customReason ? '✓' : ' '} Others: ${entry.customReason || ''}

Detected By (Name / Dept.): ${entry.detectedBy || user.email}
Action Taken: ${ACTION_OPTIONS.map(action =>
  `☐ ${entry.actionTaken === action ? '✓' : ' '} ${action}`
).join(' ')}
Checked / Verified By: ________________________ Signature: ________________________
    `.trim();
  };

  const submitWasteLostDefect = async () => {
    if (entries.length === 0) {
      setError('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // VALIDATION: Check stock availability BEFORE submitting (v7.9.0 fix)
      const expected = await tableStateService.getExpectedInventory();
      for (const entry of entries) {
        const currentStock = expected.find(e => e.sku === entry.sku && e.location === location);
        const availableAmount = currentStock?.amount || 0;

        if (availableAmount < entry.quantity) {
          setError(
            `Insufficient stock for ${entry.sku} - ${entry.itemName}.\n` +
            `Available: ${availableAmount} units, Trying to report: ${entry.quantity} units.\n` +
            `Please adjust the quantity or verify the stock level.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Process each entry
      for (const entry of entries) {
        // Create comprehensive reason with type tag
        const reasonWithType = `[${entry.type}] ${entry.reason || ''} ${
          entry.type === 'DEFECT' && entry.rejectionReason ?
          `| Rejection: ${entry.rejectionReason.join(', ')}` : ''
        }`.trim();

        // TWO-LAYER SYNC PATTERN (v7.18.0):
        // 1. Update Layer 2 (batch_allocations) first - from SELECTED batch only
        // 2. Create Transaction record
        // 3. Then sync Layer 1 (expected_inventory) from Layer 2

        // 1. HANDLE BATCH ALLOCATIONS: Remove from SELECTED batch only (v7.18.0)
        try {
          if (entry.batchId) {
            // User selected a specific batch - remove from that batch only
            await batchAllocationService.removeToBatchAllocation(
              entry.sku,
              location,
              entry.batchId,
              entry.quantity
            );
            console.log(`✅ Removed ${entry.quantity} units from batch ${entry.batchId} due to ${entry.type}`);
          } else {
            // Fallback: No batch selected (should not happen with validation, but handle legacy cases)
            const batchAlloc = await batchAllocationService.getBatchAllocation(entry.sku, location);
            if (batchAlloc && batchAlloc.totalAllocated > 0) {
              // Remove from batch allocations proportionally (largest batches first)
              let remainingToRemove = entry.quantity;

              const sortedBatches = Object.entries(batchAlloc.allocations)
                .sort(([, a], [, b]) => (b as number) - (a as number));

              for (const [batchId, allocated] of sortedBatches) {
                if (remainingToRemove <= 0) break;

                const removeQty = Math.min(remainingToRemove, allocated as number);
                await batchAllocationService.removeToBatchAllocation(
                  entry.sku,
                  location,
                  batchId,
                  removeQty
                );

                remainingToRemove -= removeQty;
                console.log(`✅ Removed ${removeQty} units from batch ${batchId} due to ${entry.type}`);
              }
            }
          }
        } catch (batchError) {
          console.error('Failed to update batch allocations:', batchError);
          // Continue - we'll still create transaction and sync Layer 1
        }

        // 2. CREATE Transaction record (v7.18.0)
        try {
          // Fetch current stock for accurate transaction record
          const expectedNow = await tableStateService.getExpectedInventory();
          const currentStock = expectedNow.find(e => e.sku === entry.sku && e.location === location);
          const previousAmount = currentStock?.amount || 0;
          const newAmount = previousAmount - entry.quantity;

          const transaction: Transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sku: entry.sku,
            itemName: entry.itemName,
            amount: -entry.quantity,
            previousAmount,
            newAmount,
            location,
            transactionType: TransactionType.ADJUSTMENT,
            status: TransactionStatus.COMPLETED,
            performedBy: user.email,
            timestamp: new Date(),
            notes: reasonWithType,
            batchId: entry.batchId
          };

          await transactionService.saveTransaction(transaction);
          console.log(`✅ Transaction record created for ${entry.type}:`, transaction.id);
        } catch (txnError) {
          console.error('Failed to create transaction record:', txnError);
          // Continue - waste report will still be created
        }

        // 3. Sync Layer 1 (expected_inventory) from Layer 2 (batch_allocations)
        await tableStateService.syncExpectedFromBatchAllocations(entry.sku, location);

        // 4. CREATE individual waste report (NEW SYSTEM) (v7.18.0: with batch tracking)
        const wasteReport: Omit<WasteReport, 'id' | 'reportedAt'> = {
          sku: entry.sku,
          itemName: entry.itemName,
          quantity: entry.quantity,
          location: location,
          locationDisplay: locationDisplay,
          type: entry.type,
          reason: entry.reason || '',
          detailedReason: reasonWithType,

          // v7.18.0: Batch tracking
          batchId: entry.batchId,
          batchAllocation: entry.batchAllocation,

          reportedBy: user.email
        };

        // Add DEFECT-specific fields only if they have values (avoid undefined)
        if (entry.type === 'DEFECT') {
          if (entry.rejectionReason && entry.rejectionReason.length > 0) {
            wasteReport.rejectionReasons = entry.rejectionReason;
          }
          if (entry.customReason) {
            wasteReport.customReason = entry.customReason;
          }
          if (entry.totalLotQuantity) {
            wasteReport.totalLotQuantity = entry.totalLotQuantity;
          }
          if (entry.shift) {
            wasteReport.shift = entry.shift;
          }
          if (entry.detectedBy) {
            wasteReport.detectedBy = entry.detectedBy;
          }
          if (entry.actionTaken) {
            wasteReport.actionTaken = entry.actionTaken;
          }
        }

        // Generate claim report for DEFECT items
        if (entry.type === 'DEFECT') {
          const claimReport = generateClaimReport(entry);
          wasteReport.claimReport = claimReport;
          console.log(`🚨 DEFECT CLAIM REPORT for ${entry.sku}:`, claimReport);
        }

        // Save individual report
        const reportId = await wasteReportService.createWasteReport(wasteReport);
        console.log(`✅ Individual ${entry.type} report created:`, reportId);
      }

      const wasteCount = entries.filter(e => e.type === 'WASTE').length;
      const lostCount = entries.filter(e => e.type === 'LOST').length;
      const defectCount = entries.filter(e => e.type === 'DEFECT').length;

      let message = `Successfully reported from ${locationDisplay}:`;
      if (wasteCount > 0) message += ` ${wasteCount} waste,`;
      if (lostCount > 0) message += ` ${lostCount} lost,`;
      if (defectCount > 0) message += ` ${defectCount} defect items`;

      setSuccess(message.replace(/,$/, ''));
      setEntries([]);

    } catch (error) {
      console.error('Failed to submit waste/lost/defect items:', error);
      setError(`Failed to submit: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WASTE': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOST': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DEFECT': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'WASTE': return '🔥';
      case 'LOST': return '❓';
      case 'DEFECT': return '⚠️';
      default: return '📦';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">{success}</span>
            </div>
            <div className="mt-3">
              <button onClick={onBack} className="btn-primary">
                Back to {locationDisplay}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-red-800 whitespace-pre-line">{error}</div>
            </div>
          </div>
        )}

        {/* Main Form */}
        {!success && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🗂️</span>
              Report Items - {locationDisplay}
            </h3>

            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Item Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['WASTE', 'LOST', 'DEFECT'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleTypeChange(type)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        currentEntry.type === type
                          ? getTypeColor(type) + ' border-current'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xl mb-1">{getTypeEmoji(type)}</div>
                      <div className="text-sm font-medium">{type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for Item
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type item SKU or name..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {/* Search Results */}
                {showSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => selectItem(item)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                      >
                        <div className="font-medium">{item.code}</div>
                        <div className="text-sm text-gray-600">{item.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity and Basic Reason */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={currentEntry.quantity}
                    onChange={(e) => setCurrentEntry({
                      ...currentEntry,
                      quantity: parseInt(e.target.value) || 1
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {/* v7.9.0: Current stock display */}
                  {currentStock !== null && currentEntry.sku && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">
                        <strong>Current Stock:</strong> {currentStock} units
                      </span>
                      {currentEntry.quantity > currentStock && (
                        <div className="text-red-600 font-semibold mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          <span>Quantity exceeds available stock!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Basic Reason</label>
                  <input
                    type="text"
                    value={currentEntry.reason}
                    onChange={(e) => setCurrentEntry({
                      ...currentEntry,
                      reason: e.target.value
                    })}
                    placeholder="Brief description..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Batch Selection (v7.18.0) */}
              {currentEntry.sku && availableBatches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📦 Select Batch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => {
                      setSelectedBatch(e.target.value);
                      const batch = availableBatches.find(b => b.batchId === e.target.value);
                      setCurrentEntry({
                        ...currentEntry,
                        batchId: e.target.value,
                        batchAllocation: batch?.allocated || 0
                      });
                      setError(null);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a batch --</option>
                    {availableBatches.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        {batch.batchId === 'DEFAULT' ? '🚫 DEFAULT' : `Batch ${batch.batchId}`} - {batch.allocated} units available
                      </option>
                    ))}
                  </select>
                  {selectedBatch && currentEntry.quantity > 0 && (
                    <div className="mt-2 text-sm">
                      {(() => {
                        const batch = availableBatches.find(b => b.batchId === selectedBatch);
                        const available = batch?.allocated || 0;
                        if (currentEntry.quantity > available) {
                          return (
                            <div className="text-red-600 font-semibold flex items-center">
                              <span className="mr-1">⚠️</span>
                              <span>Quantity ({currentEntry.quantity}) exceeds batch allocation ({available})!</span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-green-600 flex items-center">
                              <span className="mr-1">✓</span>
                              <span>Valid - Batch has {available} units</span>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* DEFECT-specific fields */}
              {currentEntry.type === 'DEFECT' && (
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Claim Report Details
                  </h4>

                  {/* Total Lot Quantity and Shift */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Lot Quantity</label>
                      <input
                        type="number"
                        value={currentEntry.totalLotQuantity || ''}
                        onChange={(e) => setCurrentEntry({
                          ...currentEntry,
                          totalLotQuantity: parseInt(e.target.value) || undefined
                        })}
                        placeholder="Total received"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                      <input
                        type="text"
                        value={currentEntry.shift || ''}
                        onChange={(e) => setCurrentEntry({
                          ...currentEntry,
                          shift: e.target.value
                        })}
                        placeholder="e.g., Morning, A-Shift"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Rejection Reasons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection</label>
                    <div className="space-y-2">
                      {REJECTION_REASONS.map((reason) => (
                        <label key={reason} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedRejectionReasons.includes(reason)}
                            onChange={(e) => handleRejectionReasonChange(reason, e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">{reason}</span>
                        </label>
                      ))}
                      <div className="flex items-center">
                        <span className="text-sm mr-2">Others:</span>
                        <input
                          type="text"
                          value={currentEntry.customReason || ''}
                          onChange={(e) => setCurrentEntry({
                            ...currentEntry,
                            customReason: e.target.value
                          })}
                          placeholder="Specify other reason..."
                          className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detected By and Action Taken */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Detected By</label>
                      <input
                        type="text"
                        value={currentEntry.detectedBy || ''}
                        onChange={(e) => setCurrentEntry({
                          ...currentEntry,
                          detectedBy: e.target.value
                        })}
                        placeholder="Name / Department"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Action Taken</label>
                      <select
                        value={currentEntry.actionTaken || ''}
                        onChange={(e) => setCurrentEntry({
                          ...currentEntry,
                          actionTaken: e.target.value
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select action...</option>
                        {ACTION_OPTIONS.map((action) => (
                          <option key={action} value={action}>{action}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Button */}
              <div className="flex justify-end">
                <button
                  onClick={addEntry}
                  disabled={!currentEntry.sku}
                  className={`px-6 py-3 rounded-lg font-medium text-white transition-colors disabled:cursor-not-allowed ${
                    currentEntry.type === 'WASTE' ? 'bg-red-500 hover:bg-red-600 disabled:bg-gray-400' :
                    currentEntry.type === 'LOST' ? 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400' :
                    'bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400'
                  }`}
                >
                  Add {currentEntry.type} Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        {entries.length > 0 && !success && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Items to Report ({entries.length})</h4>

            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeColor(entry.type)}`}>
                        {getTypeEmoji(entry.type)} {entry.type}
                      </span>
                      <span className="font-medium">{entry.sku} - {entry.itemName}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Quantity: {entry.quantity}
                      {entry.reason && ` • ${entry.reason}`}
                      {entry.type === 'DEFECT' && entry.rejectionReason && ` • ${entry.rejectionReason.join(', ')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEntry(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={submitWasteLostDefect}
                disabled={isSubmitting}
                className="flex-1 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  `Report ${entries.length} Items`
                )}
              </button>

              <button
                onClick={onBack}
                disabled={isSubmitting}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Back Button for when no items */}
        {entries.length === 0 && !success && (
          <div className="text-center">
            <button onClick={onBack} className="btn-secondary">
              Back to {locationDisplay}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default WasteLostDefectView;