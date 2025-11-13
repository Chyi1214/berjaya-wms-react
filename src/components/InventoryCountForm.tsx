// Inventory Count Form Component - Smart search for Items and BOMs
import { useState } from 'react';
import { InventoryCountEntry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { SearchAutocomplete } from './common/SearchAutocomplete';
import { SearchResult } from '../services/combinedSearch';
import { bomService } from '../services/bom';
import { filterToWesternNumerals, parseFilteredInt } from '../utils/numeralConversion';

interface InventoryCountFormProps {
  onSubmit: (entries: InventoryCountEntry[]) => void;
  userEmail: string;
  location: string;
}


export function InventoryCountForm({ onSubmit, userEmail, location }: InventoryCountFormProps) {
  const { t } = useLanguage();
  
  // Form state
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [amountInput, setAmountInput] = useState<string>(''); // String for input display
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bomPreview, setBOMPreview] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Handle item/BOM selection
  const handleItemSelect = async (result: SearchResult) => {
    setSelectedItem(result);
    setError(null);
    
    // If BOM selected, show preview
    if (result.type === 'bom' && amount > 0) {
      try {
        const preview = await bomService.previewBOMExpansion(result.code, amount);
        setBOMPreview(preview);
        setShowPreview(true);
      } catch (error) {
        console.error('Failed to preview BOM:', error);
      }
    } else {
      setBOMPreview(null);
      setShowPreview(false);
    }
  };

  // Handle amount change
  const handleAmountChange = async (newAmount: number) => {
    setAmount(newAmount);
    
    // Update BOM preview if BOM selected
    if (selectedItem?.type === 'bom' && newAmount > 0) {
      try {
        const preview = await bomService.previewBOMExpansion(selectedItem.code, newAmount);
        setBOMPreview(preview);
        setShowPreview(true);
      } catch (error) {
        setBOMPreview(null);
        setShowPreview(false);
      }
    } else {
      setBOMPreview(null);
      setShowPreview(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem) {
      setError(t('messages.pleaseSelectSKU'));
      return;
    }
    
    if (amount <= 0) {
      setError(t('messages.pleaseEnterValidAmount'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let entries: InventoryCountEntry[] = [];
      
      if (selectedItem.type === 'bom') {
        // Expand BOM to individual components
        entries = await bomService.expandBOMToInventoryEntries(
          selectedItem.code,
          amount,
          location,
          userEmail,
          t('bom.expandedFrom', { name: selectedItem.name })
        );
      } else {
        // Single item entry
        const entry: InventoryCountEntry = {
          sku: selectedItem.code,
          itemName: selectedItem.name,
          amount: amount,
          location: location,
          countedBy: userEmail,
          timestamp: new Date()
        };
        entries = [entry];
      }

      await onSubmit(entries);
      
      // Reset form after successful submission
      setSelectedItem(null);
      setAmount(0);
      setBOMPreview(null);
      setShowPreview(false);
      
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
        {/* Smart Item/BOM Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔍 {t('inventory.selectSKU')} or {t('bom.title')}:
          </label>
          <SearchAutocomplete
            onSelect={handleItemSelect}
            value={selectedItem}
            onClear={() => {
              setSelectedItem(null);
              setBOMPreview(null);
              setShowPreview(false);
            }}
            placeholder={t('bom.searchItemsBOMs')}
            className="mb-2"
          />
        </div>

        {/* Selected Item/BOM Display */}
        {selectedItem && (
          <div className={`border rounded-lg p-4 ${
            selectedItem.type === 'bom' 
              ? 'bg-purple-50 border-purple-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                selectedItem.type === 'bom'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedItem.type === 'bom' ? `📋 ${t('bom.title')}` : '📦 Item'}
              </span>
              {selectedItem.type === 'bom' && selectedItem.componentCount && (
                <span className="text-sm text-gray-600">
                  ({t('bom.componentCount', { count: selectedItem.componentCount })})
                </span>
              )}
            </div>
            <h4 className={`font-medium ${
              selectedItem.type === 'bom' ? 'text-purple-900' : 'text-blue-900'
            }`}>
              {selectedItem.type === 'bom' ? t('bom.bomSelected') + ':' : t('inventory.itemName') + ':'}
            </h4>
            <p className={selectedItem.type === 'bom' ? 'text-purple-800' : 'text-blue-800'}>
              <span className="font-medium">{selectedItem.code}</span> - {selectedItem.name}
            </p>
            {selectedItem.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedItem.description}</p>
            )}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 mb-2">
            {selectedItem?.type === 'bom' ? `📋 ${t('bom.bomQuantity')}:` : t('inventory.amount') + ':'}
          </label>
          <input
            id="amount-input"
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={(e) => {
              const filtered = filterToWesternNumerals(e.target.value);
              setAmountInput(filtered); // Display filtered string
              const parsed = parseFilteredInt(filtered, 0);
              handleAmountChange(parsed);
            }}
            placeholder={selectedItem?.type === 'bom' ? t('bom.howManySets') : t('inventory.enterAmount')}
            className="input-primary"
          />
          {selectedItem?.type === 'bom' && (
            <p className="text-sm text-gray-600 mt-1">
              💡 {t('bom.setsOf', { count: amount, name: selectedItem.name })}
            </p>
          )}
        </div>

        {/* BOM Expansion Preview */}
        {showPreview && bomPreview && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">
              📋 {t('bom.bomPreview')} - {t('bom.willBeAdded', { count: bomPreview.totalEntries })}:
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {bomPreview.previewEntries.map((entry: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-yellow-800">
                    <span className="font-mono">{entry.sku}</span> - {entry.itemName}
                  </span>
                  <span className="text-yellow-700 font-medium">
                    {entry.originalQty} × {amount} = {entry.expandedQty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedItem || amount <= 0}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t('common.loading')}...</span>
            </div>
          ) : (
            <span>
              {selectedItem?.type === 'bom' 
                ? t('bom.addBOM', { count: bomPreview?.totalEntries || 0 })
                : `📝 ${t('common.submit')}`}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}

export default InventoryCountForm;