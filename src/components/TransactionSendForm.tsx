// Transaction Send Form - For logistics to send items to production zones
import { useState, useMemo, useEffect } from 'react';
import { TransactionType, TransactionFormData, InventoryCountEntry, BOM } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { SearchAutocomplete } from './common/SearchAutocomplete';
import { bomService } from '../services/bom';

interface TransactionSendFormProps {
  onSubmit: (transaction: TransactionFormData & { otp: string }) => void;
  onCancel: () => void;
  senderEmail: string;
  inventoryCounts: InventoryCountEntry[];
}

// Create available inventory items grouped by SKU with totals

export function TransactionSendForm({ onSubmit, onCancel, senderEmail, inventoryCounts }: TransactionSendFormProps) {
  const { t } = useLanguage();

  // Production zones 1-23
  const PRODUCTION_ZONES = useMemo(() => Array.from({ length: 23 }, (_, i) => ({
    id: i + 1,
    name: `${t('production.zone')} ${i + 1}`,
    value: `production_zone_${i + 1}`
  })), [t]);
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
  const [bomData, setBomData] = useState<BOM | null>(null);

  // Check if selected item is a BOM
  const isBOM = formData.sku.startsWith('BOM');

  // Fetch BOM data when BOM is selected
  useEffect(() => {
    if (isBOM && formData.sku) {
      const fetchBomData = async () => {
        try {
          const bom = await bomService.getBOMByCode(formData.sku);
          setBomData(bom);
        } catch (error) {
          console.error('Failed to fetch BOM data:', error);
          setBomData(null);
        }
      };
      fetchBomData();
    } else {
      setBomData(null);
    }
  }, [formData.sku, isBOM]);

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
      alert(t('transactions.pleaseFillAllFields'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const otp = generateOTP();
      await onSubmit({ ...formData, otp });
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert(t('transactions.failedToCreateTransaction'));
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
          📤 {t('transactions.sendItemsToProduction')}
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
            📦 {t('transactions.itemSKU')} *
          </label>
          <SearchAutocomplete
            placeholder={t('inventory.searchSKU')}
            onSelect={handleItemSelect}
          />
          
          {/* Show selected item details */}
          {selectedItem && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900">{selectedItem.sku} - {selectedItem.name}</p>
                  <p className="text-sm text-blue-700">
                    {t('transactions.available')}: {selectedItem.totalQuantity} {t('transactions.units')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedItem.totalQuantity > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedItem.totalQuantity > 0 ? t('transactions.inStock') : t('transactions.outOfStock')}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show message if no items available */}
          {availableItems.length === 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 {t('transactions.noItemsAvailable')}
              </p>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔢 {t('transactions.amount')} * {!isBOM && selectedItem && `(${t('transactions.maxAmount', { max: maxAvailableQuantity })})`}
          </label>
          <input
            type="number"
            min="1"
            max={isBOM ? undefined : (maxAvailableQuantity || undefined)}
            value={formData.amount}
            onChange={(e) => {
              const value = e.target.value;
              const parsedValue = value === '' ? 0 : parseInt(value);
              if (!isNaN(parsedValue) && parsedValue >= 0 && (isBOM || parsedValue <= maxAvailableQuantity)) {
                setFormData(prev => ({ ...prev, amount: parsedValue }));
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              (!isBOM && formData.amount > maxAvailableQuantity) ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder={t('inventory.enterAmount')}
            disabled={isBOM ? false : (!selectedItem || maxAvailableQuantity === 0)}
            required
          />
          
          {/* Show validation error */}
          {!isBOM && formData.amount > maxAvailableQuantity && selectedItem && (
            <p className="mt-1 text-sm text-red-600">
              {t('transactions.cannotSendMoreThan', { max: maxAvailableQuantity })}
            </p>
          )}
          
          {/* Show helper text */}
          {!isBOM && selectedItem && maxAvailableQuantity > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {t('transactions.youCanSendUpTo', { max: maxAvailableQuantity, sku: selectedItem.sku })}
            </p>
          )}
          
          {/* Show BOM helper text */}
          {isBOM && formData.sku && (
            <p className="mt-1 text-sm text-blue-600">
              📦 BOM will be expanded into individual components when sent
            </p>
          )}
          
          {/* BOM Preview */}
          {isBOM && bomData && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📦 BOM Preview: {bomData.bomCode}</h4>
              <p className="text-sm text-blue-700 mb-3">{bomData.name}</p>
              
              <div className="space-y-2">
                <div className="text-xs font-medium text-blue-800 uppercase tracking-wide">
                  Components per BOM:
                </div>
                {bomData.components.map((component, index) => (
                  <div key={index} className="flex justify-between items-center py-1 border-b border-blue-200 last:border-b-0">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-blue-900">{component.sku}</span>
                      {component.name && (
                        <span className="text-xs text-blue-600 ml-2">- {component.name}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-blue-800">
                      {component.quantity}x
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.amount > 1 && (
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <div className="text-xs font-medium text-blue-800 uppercase tracking-wide mb-1">
                    Total components for {formData.amount} BOMs:
                  </div>
                  <div className="text-sm text-blue-700">
                    {bomData.components.map((component, index) => (
                      <span key={index} className="mr-3">
                        {component.sku}: {component.quantity * formData.amount}x
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Destination Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏭 {t('transactions.sendToProductionZone')} *
          </label>
          <select
            value={formData.toLocation}
            onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            <option value="">{t('transactions.selectDestinationZone')}</option>
            {PRODUCTION_ZONES.map((zone) => (
              <option key={zone.id} value={zone.value}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>


        {/* Summary for regular items */}
        {formData.sku && formData.toLocation && formData.amount > 0 && selectedItem && !isBOM && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">📋 {t('transactions.transactionSummary')}:</h4>
            <ul className="text-purple-700 text-sm space-y-1">
              <li><strong>{t('transactions.item')}:</strong> {selectedItem.sku} - {selectedItem.name}</li>
              <li><strong>{t('transactions.amount')}:</strong> {formData.amount} {t('transactions.units')}</li>
              <li><strong>{t('transactions.available')}:</strong> {selectedItem.totalQuantity} {t('transactions.units')}</li>
              <li><strong>{t('transactions.remainingAfterSend')}:</strong> {selectedItem.totalQuantity - formData.amount} {t('transactions.units')}</li>
              <li><strong>{t('transactions.fromLocation')}:</strong> {t('roles.logistics')}</li>
              <li><strong>{t('transactions.toLocation')}:</strong> {PRODUCTION_ZONES.find(z => z.value === formData.toLocation)?.name}</li>
              <li><strong>{t('transactions.performedBy')}:</strong> {senderEmail}</li>
            </ul>
          </div>
        )}

        {/* Summary for BOMs */}
        {formData.sku && formData.toLocation && formData.amount > 0 && isBOM && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📦 BOM {t('transactions.transactionSummary')}:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li><strong>BOM:</strong> {formData.sku}</li>
              <li><strong>{t('transactions.quantity')}:</strong> {formData.amount} BOM(s)</li>
              <li><strong>{t('transactions.fromLocation')}:</strong> {t('roles.logistics')}</li>
              <li><strong>{t('transactions.toLocation')}:</strong> {PRODUCTION_ZONES.find(z => z.value === formData.toLocation)?.name}</li>
              <li><strong>{t('transactions.performedBy')}:</strong> {senderEmail}</li>
              <li><strong>Note:</strong> BOM will be expanded into individual components</li>
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
            {t('common.cancel')}
          </button>
          
          <button
            type="submit"
            disabled={
              isSubmitting || 
              !formData.sku || 
              !formData.toLocation || 
              formData.amount <= 0 || 
              (!isBOM && (formData.amount > maxAvailableQuantity || !selectedItem || maxAvailableQuantity === 0))
            }
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {t('transactions.waitingForConfirmation')}
              </>
            ) : (
              <>
                📤 {t('transactions.sendAndGenerateOTP')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TransactionSendForm;