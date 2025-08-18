// Transaction Send Form - For logistics to send items to production zones
import { useState } from 'react';
import { TransactionType, TransactionFormData } from '../types';

interface TransactionSendFormProps {
  onSubmit: (transaction: TransactionFormData & { otp: string }) => void;
  onCancel: () => void;
  senderEmail: string;
}

// Sample SKUs (in real app, this would come from database)
const SAMPLE_SKUS = [
  { sku: 'A001', name: 'Engine Oil Filter' },
  { sku: 'A002', name: 'Air Filter' },
  { sku: 'B003', name: 'Brake Pad Set' },
  { sku: 'B004', name: 'Brake Disc' },
  { sku: 'C005', name: 'Spark Plug Set' },
  { sku: 'C006', name: 'Timing Belt' },
  { sku: 'D007', name: 'Water Pump' },
  { sku: 'D008', name: 'Alternator' },
  { sku: 'E009', name: 'Battery' },
  { sku: 'E010', name: 'Starter Motor' },
];

// Production zones 1-23
const PRODUCTION_ZONES = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `Zone ${i + 1}`,
  value: `production_zone_${i + 1}`
}));

export function TransactionSendForm({ onSubmit, onCancel, senderEmail }: TransactionSendFormProps) {
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

  const selectedSku = SAMPLE_SKUS.find(item => item.sku === formData.sku);

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
          <select
            value={formData.sku}
            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="">Select an item...</option>
            {SAMPLE_SKUS.map((item) => (
              <option key={item.sku} value={item.sku}>
                {item.sku} - {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔢 Amount *
          </label>
          <input
            type="number"
            min="1"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter amount"
            required
          />
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
        {formData.sku && formData.toLocation && formData.amount > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">📋 Transaction Summary:</h4>
            <ul className="text-purple-700 text-sm space-y-1">
              <li><strong>Item:</strong> {selectedSku?.sku} - {selectedSku?.name}</li>
              <li><strong>Amount:</strong> {formData.amount}</li>
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
            disabled={isSubmitting || !formData.sku || !formData.toLocation || formData.amount <= 0}
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