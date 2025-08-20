// Transaction Send Form - For logistics to send items to production zones
import { useState, useMemo } from 'react';
import { TransactionType, TransactionFormData, InventoryCountEntry } from '../types';
import { SearchAutocomplete } from './common/SearchAutocomplete';

interface TransactionSendFormProps {
  onSubmit: (transaction: TransactionFormData & { otp: string }) => void;
  onCancel: () => void;
  senderEmail: string;
  inventoryCounts: InventoryCountEntry[];
}

// Create available inventory items grouped by SKU with totals

// Production zones 1-23
const PRODUCTION_ZONES = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `Zone ${i + 1}`,
  value: `production_zone_${i + 1}`
}));

export function TransactionSendForm({ onSubmit, onCancel, senderEmail, inventoryCounts }: TransactionSendFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    sku: '',
    amount: 1,
    transactionType: TransactionType.TRANSFER_OUT,
    location: 'logistics',
    toLocation: '',
    notes: '',
    reference: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Process inventory counts to get available items with quantities
  const availableItems = useMemo(() => {
    const itemMap = new Map<string, { sku: string; name: string; totalQuantity: number; }>();
    
    // Group inventory counts by SKU and sum quantities
    inventoryCounts.forEach(count => {
      if (count.sku && count.amount > 0) {
        const existing = itemMap.get(count.sku);
        if (existing) {
          existing.totalQuantity += count.amount;
        } else {
          itemMap.set(count.sku, {
            sku: count.sku,
            name: count.itemName || count.sku,
            totalQuantity: count.amount
          });
        }
      }
    });
    
    return Array.from(itemMap.values()).sort((a, b) => a.sku.localeCompare(b.sku));
  }, [inventoryCounts]);

  // Get selected item details
  const selectedItem = availableItems.find(item => item.sku === formData.sku);
  const maxAvailableQuantity = selectedItem?.totalQuantity || 0;

  // Generate 4-digit OTP
  const generateOTP = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.toLocation || formData.amount <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const otp = generateOTP();
      await onSubmit({ ...formData, otp });
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle item selection from SearchAutocomplete
  const handleItemSelect = (result: any) => {
    setFormData(prev => ({ ...prev, sku: result.code }));
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          📤 Send Items to Production
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SKU Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📦 Item (SKU) *
          </label>
          <SearchAutocomplete
            placeholder="Search items in inventory..."
            onSelect={handleItemSelect}
          />
          
          {/* Show selected item details */}
          {selectedItem && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900">{selectedItem.sku} - {selectedItem.name}</p>
                  <p className="text-sm text-blue-700">
                    Available: {selectedItem.totalQuantity} units
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedItem.totalQuantity > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedItem.totalQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show message if no items available */}
          {availableItems.length === 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 No items available in inventory. Please add inventory counts first.
              </p>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔢 Amount * {selectedItem && `(Max: ${maxAvailableQuantity})`}
          </label>
          <input
            type="number"
            min="1"
            max={maxAvailableQuantity || undefined}
            value={formData.amount}
            onChange={(e) => {
              const value = e.target.value;
              const parsedValue = value === '' ? 0 : parseInt(value);
              if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= maxAvailableQuantity) {
                setFormData(prev => ({ ...prev, amount: parsedValue }));
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              formData.amount > maxAvailableQuantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Enter amount"
            disabled={!selectedItem || maxAvailableQuantity === 0}
            required
          />
          
          {/* Show validation error */}
          {formData.amount > maxAvailableQuantity && selectedItem && (
            <p className="mt-1 text-sm text-red-600">
              Cannot send more than {maxAvailableQuantity} units (available quantity)
            </p>
          )}
          
          {/* Show helper text */}
          {selectedItem && maxAvailableQuantity > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              You can send up to {maxAvailableQuantity} units of {selectedItem.sku}
            </p>
          )}
        </div>

        {/* Destination Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏭 Send to Production Zone *
          </label>
          <select
            value={formData.toLocation}
            onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="">Select destination zone...</option>
            {PRODUCTION_ZONES.map((zone) => (
              <option key={zone.id} value={zone.value}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📝 Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            rows={3}
            placeholder="Add any notes about this transfer..."
          />
        </div>

        {/* Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏷️ Reference (Optional)
          </label>
          <input
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Work order, batch number, etc."
          />
        </div>

        {/* Summary */}
        {formData.sku && formData.toLocation && formData.amount > 0 && selectedItem && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">📋 Transaction Summary:</h4>
            <ul className="text-purple-700 text-sm space-y-1">
              <li><strong>Item:</strong> {selectedItem.sku} - {selectedItem.name}</li>
              <li><strong>Amount:</strong> {formData.amount} units</li>
              <li><strong>Available:</strong> {selectedItem.totalQuantity} units</li>
              <li><strong>Remaining after send:</strong> {selectedItem.totalQuantity - formData.amount} units</li>
              <li><strong>From:</strong> Logistics</li>
              <li><strong>To:</strong> {PRODUCTION_ZONES.find(z => z.value === formData.toLocation)?.name}</li>
              <li><strong>Sender:</strong> {senderEmail}</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={
              isSubmitting || 
              !formData.sku || 
              !formData.toLocation || 
              formData.amount <= 0 || 
              formData.amount > maxAvailableQuantity ||
              !selectedItem ||
              maxAvailableQuantity === 0
            }
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                📤 Send & Generate OTP
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TransactionSendForm;