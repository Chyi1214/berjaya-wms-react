// Waste & Lost View - Report damaged, lost, or unusable items
import { useState, useEffect } from 'react';
import { User } from '../../types';
import { tableStateService } from '../../services/tableState';
import { combinedSearchService } from '../../services/combinedSearch';

interface WasteLostViewProps {
  user: User;
  zoneId: number;
  onBack: () => void;
}

interface WasteLostEntry {
  sku: string;
  itemName: string;
  quantity: number;
  reason?: string;
}

export function WasteLostView({ user, zoneId, onBack }: WasteLostViewProps) {
  const [entries, setEntries] = useState<WasteLostEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<WasteLostEntry>({
    sku: '',
    itemName: '',
    quantity: 1,
    reason: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setSearchResults(results.slice(0, 10)); // Limit to 10 results  
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

  const addEntry = () => {
    if (!currentEntry.sku || !currentEntry.itemName || currentEntry.quantity < 1) {
      setError('Please select an item and enter a valid quantity');
      return;
    }

    setEntries([...entries, { ...currentEntry }]);
    setCurrentEntry({
      sku: '',
      itemName: '',
      quantity: 1,
      reason: ''
    });
    setSearchTerm('');
    setError(null);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const submitWasteLost = async () => {
    if (entries.length === 0) {
      setError('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Send each item to waste/lost (no OTP required)
      for (const entry of entries) {
        // 1. REDUCE the actual zone inventory (so Expected table shows the loss)
        await tableStateService.addToInventoryCountOptimized(
          entry.sku,
          entry.itemName,
          -entry.quantity, // Negative quantity reduces Expected inventory
          `production_zone_${zoneId}`, // Actual zone location
          user.email
        );
        
        // 2. CREATE a waste tracking record (for audit trail in Waste & Lost tab)
        await tableStateService.addToInventoryCountOptimized(
          entry.sku,
          entry.itemName,
          entry.quantity, // Positive quantity in waste location for tracking
          `waste_lost_zone_${zoneId}`, // Waste tracking location
          user.email
        );
      }

      setSuccess(`Successfully reported ${entries.length} waste/lost item(s) from Zone ${zoneId}`);
      setEntries([]);
      
    } catch (error) {
      console.error('Failed to submit waste/lost items:', error);
      setError(`Failed to submit: ${error}`);
    } finally {
      setIsSubmitting(false);
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
                Back to Zone Menu
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
              <span className="text-2xl mr-2">🗑️</span>
              Report Waste & Lost Items - Zone {zoneId}
            </h3>

            <div className="space-y-4">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentEntry.quantity}
                    onChange={(e) => setCurrentEntry({
                      ...currentEntry,
                      quantity: parseInt(e.target.value) || 1
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <button
                    onClick={addEntry}
                    disabled={!currentEntry.sku}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {/* Reason (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={currentEntry.reason}
                  onChange={(e) => setCurrentEntry({
                    ...currentEntry,
                    reason: e.target.value
                  })}
                  placeholder="e.g., Damaged, Lost, Expired..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
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
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{entry.sku} - {entry.itemName}</div>
                    <div className="text-sm text-gray-600">
                      Quantity: {entry.quantity}
                      {entry.reason && ` • Reason: ${entry.reason}`}
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
                onClick={submitWasteLost}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  `Report ${entries.length} Waste & Lost Items`
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
              Back to Zone Menu
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default WasteLostView;