// Inventory Count Form Component - Simple SKU and amount entry
import { useState } from 'react';
import { CatalogItem, CountFormData, InventoryCountEntry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryCountFormProps {
  onSubmit: (entry: InventoryCountEntry) => void;
  userEmail: string;
  location: string;
}

// Sample catalog data (in real app, this would come from Firebase)
const SAMPLE_CATALOG: CatalogItem[] = [
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

export function InventoryCountForm({ onSubmit, userEmail, location }: InventoryCountFormProps) {
  const { t } = useLanguage();
  // Form state
  const [formData, setFormData] = useState<CountFormData>({
    selectedSku: '',
    amount: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected item details
  const selectedItem = SAMPLE_CATALOG.find(item => item.sku === formData.selectedSku);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.selectedSku) {
      setError(t('messages.pleaseSelectSKU'));
      return;
    }
    
    if (formData.amount <= 0) {
      setError(t('messages.pleaseEnterValidAmount'));
      return;
    }

    if (!selectedItem) {
      setError(t('messages.selectedItemNotFound'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const entry: InventoryCountEntry = {
        sku: formData.selectedSku,
        itemName: selectedItem.name,
        amount: formData.amount,
        location: location,
        countedBy: userEmail,
        timestamp: new Date()
      };

      await onSubmit(entry);
      
      // Reset form after successful submission
      setFormData({ selectedSku: '', amount: 0 });
      
    } catch (error) {
      setError(error instanceof Error ? error.message : t('messages.countFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        📦 {t('inventory.countInventory')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SKU Selection */}
        <div>
          <label htmlFor="sku-select" className="block text-sm font-medium text-gray-700 mb-2">
            {t('inventory.selectSKU')}:
          </label>
          <select
            id="sku-select"
            value={formData.selectedSku}
            onChange={(e) => setFormData(prev => ({ ...prev, selectedSku: e.target.value }))}
            className="input-primary"
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
            <h4 className="font-medium text-blue-900">{t('inventory.itemName')}:</h4>
            <p className="text-blue-800">
              <span className="font-medium">{selectedItem.sku}</span> - {selectedItem.name}
            </p>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 mb-2">
            {t('inventory.amount')}:
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
          />
        </div>

        {/* Location Display */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900">{t('inventory.countDetails')}:</h4>
          <p className="text-gray-700">
            <span className="font-medium">{t('inventory.location')}:</span> {location}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">{t('inventory.countedBy')}:</span> {userEmail}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.selectedSku || formData.amount <= 0}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t('common.loading')}...</span>
            </div>
          ) : (
            <>
              <span>📝 {t('common.submit')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default InventoryCountForm;