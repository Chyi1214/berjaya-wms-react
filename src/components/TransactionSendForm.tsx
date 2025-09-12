// Transaction Send Form - For logistics to send items to production zones
import { useState, useMemo, useEffect, useRef } from 'react';
import { TransactionType, TransactionFormData, InventoryCountEntry, BOM } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { SearchAutocomplete } from './common/SearchAutocomplete';
import { bomService } from '../services/bom';
import { scannerService } from '../services/scannerService';
import { qrExtractionService } from '../services/qrExtraction';

interface TransactionSendFormProps {
  onSubmit: (transaction: TransactionFormData & { otp: string; skipOTP?: boolean }) => void;
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
  const [skipOTP, setSkipOTP] = useState(false);
  
  // QR Scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);

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

  // Process inventory counts to get available items with quantities - FIXED: Only from logistics location
  const availableItems = useMemo(() => {
    const itemMap = new Map<string, { sku: string; name: string; totalQuantity: number; }>();
    
    // FIXED: Only count items from logistics location (sender's location)
    inventoryCounts.forEach(count => {
      if (count.sku && count.location === 'logistics' && count.amount > 0) {
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

  // Get selected item details - with enhanced debugging
  const selectedItem = availableItems.find(item => item.sku === formData.sku);
  const maxAvailableQuantity = selectedItem?.totalQuantity || 0;
  
  // Basic debug for selected item
  if (formData.sku && !selectedItem) {
    console.log('⚠️ Item not found in expected_inventory:', formData.sku);
  }
  

  // Generate 4-digit OTP (or use fixed OTP if skipped)
  const generateOTP = (): string => {
    if (skipOTP) {
      return '0000'; // Fixed OTP when skipping verification
    }
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
      await onSubmit({ ...formData, otp, skipOTP });
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
    setSelectedSearchResult(result);
    setScanError(null);
  };

  // QR Scanner Functions
  const startScanning = async () => {
    setScanError(null);
    
    try {
      const hasPermission = await scannerService.requestCameraPermission();
      if (!hasPermission) {
        setScanError('Camera permission denied');
        return;
      }

      // Set scanning state first to render video element
      setIsScanning(true);
      
      // Wait a moment for video element to be rendered
      setTimeout(async () => {
        if (!videoRef.current) {
          setScanError('Failed to initialize camera');
          setIsScanning(false);
          return;
        }

        try {
          // Start scanning with proper callback signatures
          await scannerService.startScanning(
            videoRef.current,
            (result: string) => handleScanResult(result),
            (error: Error) => {
              console.error('Scanner error:', error);
              setScanError(`Scanner error: ${error.message}`);
              setIsScanning(false);
            }
          );
        } catch (error) {
          console.error('Failed to start scanning:', error);
          setScanError('Failed to start camera');
          setIsScanning(false);
        }
      }, 100);
      
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      setScanError('Failed to request camera permission');
    }
  };

  const stopScanning = () => {
    scannerService.stopScanning();
    setIsScanning(false);
  };

  const handleScanResult = async (scannedCode: string) => {
    console.log('📱 Scanned code for Send Items:', scannedCode);
    
    // Stop scanning immediately after successful scan
    stopScanning();
    
    try {
      // Use QR extraction process (same as Inbound Scanner)
      const extractionResult = await qrExtractionService.extractSKUFromQRCode(scannedCode);
      
      if (extractionResult.success && extractionResult.extractedSKU && extractionResult.lookupData) {
        const extractedSKU = extractionResult.extractedSKU;
        
        console.log('✅ Successfully extracted SKU:', extractedSKU);
        console.log('📍 Found in zones:', extractionResult.lookupData.map(l => l.targetZone).join(', '));
        
        // First check if this SKU exists in current inventory
        const inventoryItem = availableItems.find(item => item.sku === extractedSKU);
        
        if (inventoryItem) {
          // Item exists in inventory - create SearchResult from inventory data
          const searchResult = {
            code: inventoryItem.sku,
            name: inventoryItem.name,
            type: 'item' as const
          };
          
          setFormData(prev => ({ ...prev, sku: extractedSKU }));
          setSelectedSearchResult(searchResult);
          setScanError(null);
          
          console.log('📦 Found in inventory via scan:', inventoryItem);
        } else {
          // Item only exists in scanner lookup - show not found
          setScanError(`${extractedSKU} found in scanner data but not in current inventory`);
          setSelectedSearchResult(null);
          console.log('⚠️ Item found in scanner lookup but not in inventory');
        }
        
      } else {
        console.log('⚠️ SKU extraction failed');
        const attemptsList = extractionResult.attemptedLookups.slice(0, 3).join(', '); // Show first 3 attempts only
        setScanError(`No valid SKU found. Tried: ${attemptsList}${extractionResult.attemptedLookups.length > 3 ? '...' : ''}`);
        setSelectedSearchResult(null);
      }
    } catch (error) {
      console.error('QR extraction failed:', error);
      setScanError('Failed to process scanned QR code');
      setSelectedSearchResult(null);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

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
            value={selectedSearchResult}
            onClear={() => {
              setFormData(prev => ({ ...prev, sku: '' }));
              setSelectedSearchResult(null);
              setScanError(null);
            }}
          />
          
          {/* QR Scanner Button - Below the search box */}
          <div className="mt-3">
            <button
              type="button"
              onClick={isScanning ? stopScanning : startScanning}
              className={`w-full px-4 py-2 rounded-lg border font-medium ${
                isScanning 
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
              }`}
            >
              {isScanning ? '⏹️ Stop Scanner' : '📱 Scan QR Code / Barcode'}
            </button>
          </div>

          {/* QR Scanner Video */}
          {isScanning && (
            <div className="mt-3 bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-48 object-cover"
                autoPlay
                muted
                playsInline
              />
              <div className="p-2 text-center bg-gray-800 text-white text-sm">
                📷 Point camera at QR code or barcode
              </div>
            </div>
          )}

          {/* Scanner Error */}
          {scanError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              ⚠️ {scanError}
            </div>
          )}
          
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

        {/* OTP Options */}
        <div className="border-t pt-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="skipOTP"
              checked={skipOTP}
              onChange={(e) => setSkipOTP(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="skipOTP" className="text-sm text-gray-700">
              🚀 Complete transaction immediately (no OTP verification needed)
            </label>
          </div>
          {skipOTP && (
            <p className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
              ⚠️ Testing mode: Transaction will be completed immediately when you click send. No OTP verification required.
            </p>
          )}
        </div>

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
                📤 {skipOTP ? 'Send Immediately (No OTP)' : t('transactions.sendAndGenerateOTP')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TransactionSendForm;