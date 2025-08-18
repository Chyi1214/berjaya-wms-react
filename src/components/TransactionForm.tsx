// Transaction Form Component - Create new transactions
import { useState } from 'react';
import { Transaction, TransactionType, TransactionStatus, TransactionFormData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface TransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
  userEmail: string;
  initialData?: Partial<TransactionFormData>;
}

// Sample catalog data (same as InventoryCountForm)
const SAMPLE_CATALOG = [
  { sku: "a001", name: "Bolt M8x20 Steel" },
  { sku: "a002", name: "Washer M8 Zinc" },
  { sku: "a003", name: "Nut M8 Steel" },
  { sku: "b001", name: "Spring Coil Heavy Duty" },
  { sku: "b002", name: "Rubber Gasket Large" },
  { sku: "b003", name: "Metal Bracket L-Type" },
  { sku: "c001", name: "Wire Harness Main" },
  { sku: "c002", name: "Connector 4-Pin" },
  { sku: "c003", name: "Relay 12V 30A" },
  { sku: "d001", name: "Filter Oil Primary" },
  { sku: "d002", name: "Filter Air Secondary" },
  { sku: "d003", name: "Seal Ring Rubber" },
  { sku: "e001", name: "Bearing Ball 6203" },
  { sku: "e002", name: "Shaft Steel 15mm" },
  { sku: "e003", name: "Gear Wheel 24T" }
];

// Location options
const LOCATIONS = [
  { value: 'logistics', label: 'Logistics' },
  ...Array.from({ length: 23 }, (_, i) => ({
    value: `production_zone_${i + 1}`,
    label: `Production Zone ${i + 1}`
  }))
];

export function TransactionForm({ onSubmit, onCancel, userEmail, initialData }: TransactionFormProps) {
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState<TransactionFormData>({
    sku: initialData?.sku || '',
    amount: initialData?.amount || 0,
    transactionType: initialData?.transactionType || TransactionType.COUNT,
    location: initialData?.location || '',
    fromLocation: initialData?.fromLocation || '',
    toLocation: initialData?.toLocation || '',
    notes: initialData?.notes || '',
    reference: initialData?.reference || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected item details
  const selectedItem = SAMPLE_CATALOG.find(item => item.sku === formData.sku);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku) {
      setError(t('messages.pleaseSelectSKU'));
      return;
    }
    
    if (formData.amount <= 0) {
      setError(t('messages.pleaseEnterValidAmount'));
      return;
    }

    if (!formData.location && formData.transactionType !== TransactionType.TRANSFER_IN && formData.transactionType !== TransactionType.TRANSFER_OUT) {
      setError('Please select a location');
      return;
    }

    if ((formData.transactionType === TransactionType.TRANSFER_IN || formData.transactionType === TransactionType.TRANSFER_OUT) && (!formData.fromLocation || !formData.toLocation)) {
      setError('Please select both from and to locations for transfers');
      return;
    }

    if (!selectedItem) {
      setError(t('messages.selectedItemNotFound'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const transaction: Omit<Transaction, 'id' | 'timestamp'> = {
        sku: formData.sku,
        itemName: selectedItem.name,
        amount: formData.amount,
        previousAmount: 0, // Will be calculated by the parent component
        newAmount: 0, // Will be calculated by the parent component
        location: formData.location || formData.toLocation || '',
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        transactionType: formData.transactionType,
        status: TransactionStatus.COMPLETED,
        performedBy: userEmail,
        notes: formData.notes || undefined,
        reference: formData.reference || undefined
      };

      await onSubmit(transaction);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTransfer = formData.transactionType === TransactionType.TRANSFER_IN || formData.transactionType === TransactionType.TRANSFER_OUT;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SKU Selection */}
      <div>
        <label htmlFor="sku-select" className="block text-sm font-medium text-gray-700 mb-2">
          {t('inventory.sku')} *
        </label>
        <select
          id="sku-select"
          value={formData.sku}
          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
          className="input-primary"
          required
        >
          <option value="">{t('inventory.selectSKU')}...</option>
          {SAMPLE_CATALOG.map(item => (
            <option key={item.sku} value={item.sku}>
              {item.sku} - {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Item Display */}
      {selectedItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900">{t('inventory.selectedItem')}:</h4>
          <p className="text-blue-800">
            <span className="font-medium">{selectedItem.sku}</span> - {selectedItem.name}
          </p>
        </div>
      )}

      {/* Transaction Type */}
      <div>
        <label htmlFor="transaction-type" className="block text-sm font-medium text-gray-700 mb-2">
          {t('transactions.transactionType')} *
        </label>
        <select
          id="transaction-type"
          value={formData.transactionType}
          onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value as TransactionType }))}
          className="input-primary"
          required
        >
          <option value={TransactionType.COUNT}>{t('transactions.count')}</option>
          <option value={TransactionType.ADJUSTMENT}>{t('transactions.adjustment')}</option>
          <option value={TransactionType.TRANSFER_IN}>{t('transactions.transferIn')}</option>
          <option value={TransactionType.TRANSFER_OUT}>{t('transactions.transferOut')}</option>
          <option value={TransactionType.INITIAL_STOCK}>{t('transactions.initialStock')}</option>
        </select>
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 mb-2">
          {t('inventory.amount')} *
        </label>
        <input
          id="amount-input"
          type="number"
          min="0"
          step="1"
          value={formData.amount || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
          placeholder={t('inventory.enterAmount')}
          className="input-primary"
          required
        />
      </div>

      {/* Location Fields */}
      {isTransfer ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* From Location */}
          <div>
            <label htmlFor="from-location" className="block text-sm font-medium text-gray-700 mb-2">
              {t('transactions.fromLocation')} *
            </label>
            <select
              id="from-location"
              value={formData.fromLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, fromLocation: e.target.value }))}
              className="input-primary"
              required
            >
              <option value="">Select location...</option>
              {LOCATIONS.map(location => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          {/* To Location */}
          <div>
            <label htmlFor="to-location" className="block text-sm font-medium text-gray-700 mb-2">
              {t('transactions.toLocation')} *
            </label>
            <select
              id="to-location"
              value={formData.toLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
              className="input-primary"
              required
            >
              <option value="">Select location...</option>
              {LOCATIONS.map(location => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        /* Single Location */
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            {t('inventory.location')} *
          </label>
          <select
            id="location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="input-primary"
            required
          >
            <option value="">Select location...</option>
            {LOCATIONS.map(location => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Reference */}
      <div>
        <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
          {t('transactions.reference')}
        </label>
        <input
          id="reference"
          type="text"
          value={formData.reference}
          onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
          placeholder="PO-2025-001, WO-123, etc."
          className="input-primary"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          {t('transactions.notes')}
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes or comments..."
          rows={3}
          className="input-primary"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          type="submit"
          disabled={isSubmitting || !formData.sku || formData.amount <= 0}
          className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t('common.loading')}...</span>
            </div>
          ) : (
            <>
              <span>💾 {t('transactions.createTransaction')}</span>
            </>
          )}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 btn-secondary"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export default TransactionForm;