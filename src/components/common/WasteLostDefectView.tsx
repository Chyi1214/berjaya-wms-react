// Enhanced Waste/Lost/Defect View - Universal component for production and logistics
import { useState, useEffect } from 'react';
import { User } from '../../types';
import { tableStateService } from '../../services/tableState';
import { combinedSearchService } from '../../services/combinedSearch';

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

  const selectItem = (item: any) => {
    setCurrentEntry({
      ...currentEntry,
      sku: item.code,
      itemName: item.name
    });
    setSearchTerm(`${item.code} - ${item.name}`);
    setShowSearch(false);
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
    if (!currentEntry.sku || !currentEntry.itemName || currentEntry.quantity < 1) {
      setError('Please select an item and enter a valid quantity');
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
      for (const entry of entries) {
        // Create comprehensive reason with type tag
        const reasonWithType = `[${entry.type}] ${entry.reason || ''} ${
          entry.type === 'DEFECT' && entry.rejectionReason ?
          `| Rejection: ${entry.rejectionReason.join(', ')}` : ''
        }`.trim();

        // 1. REDUCE the actual inventory (Expected table shows the loss)
        await tableStateService.addToInventoryCountOptimized(
          entry.sku,
          entry.itemName,
          -entry.quantity, // Negative quantity reduces inventory
          location, // Actual location (logistics or production_zone_X)
          user.email
        );

        // 2. CREATE tracking record with type tag in waste location
        // Note: Reason is stored in console/claim reports, not in inventory database
        await tableStateService.addToInventoryCountOptimized(
          entry.sku,
          entry.itemName,
          entry.quantity, // Positive quantity for tracking
          `waste_lost_${location}`, // Tracking location
          user.email
        );

        // 3. Log detailed tracking information including reasons
        console.log(`${entry.type} Item Logged:`, {
          sku: entry.sku,
          itemName: entry.itemName,
          quantity: entry.quantity,
          type: entry.type,
          location: location,
          reason: reasonWithType,
          timestamp: new Date().toISOString()
        });

        // 4. For DEFECT items, generate formal claim report
        if (entry.type === 'DEFECT') {
          const claimReport = generateClaimReport(entry);
          console.log(`🚨 DEFECT CLAIM REPORT for ${entry.sku}:`, claimReport);

          // Could also store this in a separate claims collection for formal tracking
          // await claimsService.createClaimReport(entry, claimReport);
        }
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
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">{error}</span>
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