// Transaction Send Form - For logistics to send items to production zones
// v7.6.0 - Multi-item support with cart system
import { useState, useMemo, useEffect, useRef } from 'react';
import { TransactionType, TransactionFormData, InventoryCountEntry, BOM } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { SearchAutocomplete } from './common/SearchAutocomplete';
import { bomService } from '../services/bom';
import { scannerService } from '../services/scannerService';
import { qrExtractionService } from '../services/qrExtraction';
import { batchAllocationService } from '../services/batchAllocationService';

interface TransactionSendFormProps {
  onSubmit: (transaction: TransactionFormData & { otp: string; skipOTP?: boolean }) => void;
  onCancel: () => void;
  inventoryCounts: InventoryCountEntry[];
}

// Cart item interface
interface CartItem {
  sku: string;
  itemName: string;
  amount: number;
  isBOM: boolean;
  bomData?: BOM;
}

export function TransactionSendForm({ onSubmit, onCancel, inventoryCounts }: TransactionSendFormProps) {
  const { t } = useLanguage();

  // Production zones 1-25 (includes CP7 and CP8)
  const PRODUCTION_ZONES = useMemo(() => Array.from({ length: 25 }, (_, i) => {
    const zoneId = i + 1;
    let zoneName;

    if (zoneId === 24) {
      zoneName = 'CP7';
    } else if (zoneId === 25) {
      zoneName = 'CP8';
    } else {
      zoneName = `${t('production.zone')} ${zoneId}`;
    }

    return {
      id: zoneId,
      name: zoneName,
      value: `production_zone_${zoneId}`
    };
  }), [t]);

  // Multi-item cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [destinationZone, setDestinationZone] = useState<string>('');

  // Current item being added
  const [currentSku, setCurrentSku] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<number>(1);
  const [currentBomData, setCurrentBomData] = useState<BOM | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipOTP, setSkipOTP] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // QR Scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);

  // Batch allocation states
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [batchConfigLoading, setBatchConfigLoading] = useState(false);

  // Check if current item is a BOM
  const isBOM = currentSku.startsWith('BOM');

  // Fetch BOM data when BOM is selected
  useEffect(() => {
    if (isBOM && currentSku) {
      const fetchBomData = async () => {
        try {
          const bom = await bomService.getBOMByCode(currentSku);
          setCurrentBomData(bom);
        } catch (error) {
          console.error('Failed to fetch BOM data:', error);
          setCurrentBomData(null);
        }
      };
      fetchBomData();
    } else {
      setCurrentBomData(null);
    }
  }, [currentSku, isBOM]);

  // Load batch configuration on mount
  useEffect(() => {
    loadBatchConfig();
  }, []);

  const loadBatchConfig = async () => {
    try {
      setBatchConfigLoading(true);

      let config = await batchAllocationService.getBatchConfig();

      // Initialize if no config exists
      if (!config) {
        await batchAllocationService.initializeDefaultConfig();
        config = await batchAllocationService.getBatchConfig();
      }

      if (config) {
        setAvailableBatches(config.availableBatches);
        setSelectedBatch(config.activeBatch); // Default to active batch
      }
    } catch (error) {
      console.error('Failed to load batch configuration:', error);
    } finally {
      setBatchConfigLoading(false);
    }
  };

  // Process inventory counts to get available items with quantities
  const availableItems = useMemo(() => {
    const itemMap = new Map<string, { sku: string; name: string; totalQuantity: number; }>();

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

  // Get current item details
  const currentItem = availableItems.find(item => item.sku === currentSku);
  const maxAvailableQuantity = currentItem?.totalQuantity || 0;

  // Calculate how much is already in cart for this SKU
  const amountInCart = cart
    .filter(item => item.sku === currentSku)
    .reduce((sum, item) => sum + item.amount, 0);

  // Remaining available after considering cart
  const remainingAvailable = maxAvailableQuantity - amountInCart;

  // Generate 4-digit OTP (or use fixed OTP if skipped)
  const generateOTP = (): string => {
    if (skipOTP) {
      return '0000'; // Fixed OTP when skipping verification
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Add current item to cart
  const handleAddToCart = async () => {
    if (!currentSku || currentAmount <= 0) {
      alert('Please select an item and enter a valid quantity');
      return;
    }

    if (!selectedBatch) {
      alert('Please select a batch for this transaction');
      return;
    }

    setAllocationError(null);

    try {
      // Check batch allocation for regular items only
      if (!isBOM) {
        const allocation = await batchAllocationService.getBatchAllocation(currentSku, 'logistics');
        const availableInBatch = (allocation?.allocations && allocation.allocations[selectedBatch]) || 0;
        const totalNeeded = amountInCart + currentAmount;

        if (totalNeeded > availableInBatch) {
          setAllocationError(
            `Insufficient allocation in Batch ${selectedBatch}. Available: ${availableInBatch}, needed: ${totalNeeded} (including ${amountInCart} already in cart).`
          );
          return;
        }
      }

      // Add to cart
      const newCartItem: CartItem = {
        sku: currentSku,
        itemName: currentItem?.name || currentSku,
        amount: currentAmount,
        isBOM: isBOM,
        bomData: currentBomData || undefined
      };

      setCart(prev => [...prev, newCartItem]);

      // Reset current item fields
      setCurrentSku('');
      setCurrentAmount(1);
      setSelectedSearchResult(null);
      setCurrentBomData(null);
      setAllocationError(null);
      setScanError(null);

      console.log('✅ Added to cart:', newCartItem);
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      setAllocationError('Failed to verify batch allocation. Please try again.');
    }
  };

  // Remove item from cart
  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Update quantity in cart
  const handleUpdateCartQuantity = (index: number, newAmount: number) => {
    if (newAmount <= 0) {
      handleRemoveFromCart(index);
      return;
    }

    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, amount: newAmount } : item
    ));
  };

  // Submit all items in cart
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Cart is empty. Please add items before sending.');
      return;
    }

    if (!destinationZone) {
      alert('Please select a destination zone');
      return;
    }

    if (!selectedBatch) {
      alert('Please select a batch for this transaction');
      return;
    }

    setIsSubmitting(true);
    setAllocationError(null);

    try {
      const otp = generateOTP();

      // Create multi-item transaction data
      const transactionData: TransactionFormData & { otp: string; skipOTP?: boolean } = {
        sku: cart[0].sku, // Legacy field - use first item
        amount: cart[0].amount, // Legacy field - use first item
        items: cart.map(item => ({
          sku: item.sku,
          itemName: item.itemName,
          amount: item.amount
        })),
        transactionType: TransactionType.TRANSFER_OUT,
        location: 'logistics',
        toLocation: destinationZone,
        notes: `Multi-item send from Batch ${selectedBatch}. Total items: ${cart.length}`,
        reference: '',
        batchId: selectedBatch,
        otp,
        skipOTP
      };

      await onSubmit(transactionData);

      // Clear cart after successful submission
      setCart([]);
      setDestinationZone('');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert(t('transactions.failedToCreateTransaction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle item selection from SearchAutocomplete
  const handleItemSelect = (result: any) => {
    setCurrentSku(result.code);
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

      setIsScanning(true);

      setTimeout(async () => {
        if (!videoRef.current) {
          setScanError('Failed to initialize camera');
          setIsScanning(false);
          return;
        }

        try {
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
      const extractionResult = await qrExtractionService.extractSKUFromQRCode(scannedCode);

      if (extractionResult.success && extractionResult.extractedSKU && extractionResult.lookupData) {
        const extractedSKU = extractionResult.extractedSKU;

        console.log('✅ Successfully extracted SKU:', extractedSKU);

        const inventoryItem = availableItems.find(item => item.sku === extractedSKU);

        if (inventoryItem) {
          const searchResult = {
            code: inventoryItem.sku,
            name: inventoryItem.name,
            type: 'item' as const
          };

          setCurrentSku(extractedSKU);
          setSelectedSearchResult(searchResult);
          setScanError(null);

          console.log('📦 Found in inventory via scan:', inventoryItem);
        } else {
          setScanError(`${extractedSKU} found in scanner data but not in current inventory`);
          setSelectedSearchResult(null);
        }

      } else {
        const attemptsList = extractionResult.attemptedLookups.slice(0, 3).join(', ');
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
          📤 {t('transactions.sendItemsToProduction')} (Multi-Item)
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

      {/* Batch Selection Section */}
      <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Sending From Batch</p>
            <div className="text-xl font-bold text-orange-600">
              {batchConfigLoading ? '⏳ Loading...' : selectedBatch || 'Not Set'}
            </div>
          </div>

          {!batchConfigLoading && availableBatches.length > 1 && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const dropdown = document.getElementById('transaction-batch-selector');
                  if (dropdown) {
                    (dropdown as HTMLSelectElement).focus();
                  }
                }}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
              >
                Change
              </button>
              <select
                id="transaction-batch-selector"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {availableBatches.map(batchId => (
                  <option key={batchId} value={batchId}>
                    Batch {batchId}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {!batchConfigLoading && (
          <p className="text-xs text-gray-500 text-center mt-2">
            All items will be deducted from this batch allocation
          </p>
        )}
      </div>

      {/* Destination Zone - Select Once for All Items */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🏭 {t('transactions.sendToProductionZone')} * (for all items)
        </label>
        <select
          value={destinationZone}
          onChange={(e) => setDestinationZone(e.target.value)}
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

      {/* Cart Display */}
      {cart.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">
            🛒 Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
          </h4>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-green-200">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {item.sku} - {item.itemName}
                    {item.isBOM && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">BOM</span>}
                  </div>
                  {item.bomData && (
                    <div className="text-xs text-gray-500 mt-1">
                      Components: {item.bomData.components.map(c => `${c.sku} (${c.quantity}x)`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    value={item.amount}
                    onChange={(e) => handleUpdateCartQuantity(index, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(index)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove from cart"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Add Item Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-4">➕ Add Item to Cart</h4>

          {/* SKU Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📦 {t('transactions.itemSKU')}
            </label>
            <SearchAutocomplete
              placeholder={t('inventory.searchSKU')}
              onSelect={handleItemSelect}
              value={selectedSearchResult}
              onClear={() => {
                setCurrentSku('');
                setSelectedSearchResult(null);
                setScanError(null);
              }}
            />

            {/* QR Scanner Button */}
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
            {currentItem && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-blue-900">{currentItem.sku} - {currentItem.name}</p>
                    <p className="text-sm text-blue-700">
                      Available: {remainingAvailable} units (Total: {maxAvailableQuantity}, In cart: {amountInCart})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      remainingAvailable > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {remainingAvailable > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BOM Preview */}
            {isBOM && currentBomData && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📦 BOM Preview: {currentBomData.bomCode}</h4>
                <p className="text-sm text-blue-700 mb-3">{currentBomData.name}</p>

                <div className="space-y-1">
                  {currentBomData.components.map((component, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-blue-900">{component.sku} - {component.name}</span>
                      <span className="font-medium text-blue-800">{component.quantity}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔢 Quantity {!isBOM && currentItem && `(Max: ${remainingAvailable})`}
            </label>
            <input
              type="number"
              min="1"
              max={isBOM ? undefined : (remainingAvailable || undefined)}
              value={currentAmount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                if (value >= 0 && (isBOM || value <= remainingAvailable)) {
                  setCurrentAmount(value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
            />

            {/* Allocation error */}
            {allocationError && (
              <p className="mt-2 text-sm text-red-600">{allocationError}</p>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!currentSku || currentAmount <= 0 || (!isBOM && remainingAvailable <= 0)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➕ Add to Cart
          </button>
        </div>

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
              ⚠️ Testing mode: Transaction will be completed immediately. No OTP verification required.
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
              cart.length === 0 ||
              !destinationZone ||
              !selectedBatch
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
                📤 {skipOTP ? `Send ${cart.length} Item(s) (No OTP)` : `Send ${cart.length} Item(s) & Generate OTP`}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TransactionSendForm;
