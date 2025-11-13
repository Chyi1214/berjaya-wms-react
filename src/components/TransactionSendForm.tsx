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
import { batchManagementService } from '../services/batchManagement';
import { scanLookupService } from '../services/scanLookupService';
import { useZoneConfigs } from '../hooks/useZoneConfigs';
import { filterToWesternNumerals, parseFilteredInt } from '../utils/numeralConversion';

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
  zones?: Array<{zone: string; itemName?: string; expectedQuantity?: number}>;
}

export function TransactionSendForm({ onSubmit, onCancel, inventoryCounts }: TransactionSendFormProps) {
  const { t } = useLanguage();
  const { allZonesSorted, getDisplayName } = useZoneConfigs();

  // All zones (production + maintenance)
  const PRODUCTION_ZONES = useMemo(() => allZonesSorted().map(zone => ({
    id: zone.zoneId,
    name: getDisplayName(zone.zoneId),
    value: `production_zone_${zone.zoneId}`
  })), [allZonesSorted, getDisplayName]);

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
  const [selectedBatch, setSelectedBatch] = useState<string>(''); // Source batch (fromBatch)
  const [destinationBatch, setDestinationBatch] = useState<string>(''); // Destination batch (toBatch) - v7.20.0
  const [batchConfigLoading, setBatchConfigLoading] = useState(false);

  // Car type selection (v7.19.0)
  const [availableCarTypes, setAvailableCarTypes] = useState<Array<{carCode: string; name: string}>>([]);
  const [selectedCarType, setSelectedCarType] = useState<string>('TK1');
  const [carTypesLoading, setCarTypesLoading] = useState(false);

  // Store scan result data for zone display
  const [scannedItemZones, setScannedItemZones] = useState<Array<{zone: string; itemName?: string; expectedQuantity?: number}>>([]);

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

  // Load car types and batch configuration on mount
  useEffect(() => {
    loadCarTypes();
    loadBatchConfig();
  }, []);

  // Fetch zone data when SKU or car type changes
  useEffect(() => {
    const fetchZoneData = async () => {
      if (!currentSku || isBOM) {
        setScannedItemZones([]);
        return;
      }

      try {
        console.log(`🔍 Fetching zones for SKU: ${currentSku}, Car Type: ${selectedCarType}`);
        const allLookups = await scanLookupService.getAllLookupsBySKU(currentSku, selectedCarType);

        if (allLookups.length > 0) {
          const zones = allLookups.map(lookup => ({
            zone: lookup.targetZone.toString(),
            itemName: lookup.itemName,
            expectedQuantity: lookup.expectedQuantity
          }));
          setScannedItemZones(zones);
          console.log(`✅ Found ${zones.length} zones for ${currentSku} (${selectedCarType})`);
        } else {
          setScannedItemZones([]);
          console.log(`❌ No zones found for ${currentSku} (${selectedCarType})`);
        }
      } catch (error) {
        console.error('Failed to fetch zone data:', error);
        setScannedItemZones([]);
      }
    };

    fetchZoneData();
  }, [currentSku, selectedCarType, isBOM]);

  // Load available car types
  const loadCarTypes = async () => {
    try {
      setCarTypesLoading(true);

      // Ensure TK1 exists
      await batchManagementService.ensureTK1CarTypeExists();

      // Load all car types
      const carTypes = await batchManagementService.getAllCarTypes();
      setAvailableCarTypes(carTypes);

      console.log('✅ Loaded car types for Send Form:', carTypes);
    } catch (error) {
      console.error('Failed to load car types:', error);
      // Fallback to TK1 only
      setAvailableCarTypes([{ carCode: 'TK1', name: 'TK1 (Default)' }]);
    } finally {
      setCarTypesLoading(false);
    }
  };

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

  // Check for common zones across cart items
  const cartZoneWarning = useMemo(() => {
    // Need at least 2 items to check
    if (cart.length < 2) return null;

    // Get items with zone data (exclude BOMs and items without zones)
    const itemsWithZones = cart.filter(item => !item.isBOM && item.zones && item.zones.length > 0);

    // Need at least 2 items with zones to compare
    if (itemsWithZones.length < 2) return null;

    // Find common zones across all items
    const firstItemZones = new Set(itemsWithZones[0].zones!.map(z => z.zone));

    for (let i = 1; i < itemsWithZones.length; i++) {
      const currentZones = new Set(itemsWithZones[i].zones!.map(z => z.zone));

      // Keep only zones that exist in current item
      for (const zone of firstItemZones) {
        if (!currentZones.has(zone)) {
          firstItemZones.delete(zone);
        }
      }
    }

    // If no common zones, return warning
    if (firstItemZones.size === 0) {
      return {
        hasWarning: true,
        message: `⚠️ Warning: These ${itemsWithZones.length} items have NO common zones! They might be for different vehicles or purposes.`,
        itemCount: itemsWithZones.length
      };
    }

    return null;
  }, [cart]);

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

      // Add to cart with zone data
      const newCartItem: CartItem = {
        sku: currentSku,
        itemName: currentItem?.name || currentSku,
        amount: currentAmount,
        isBOM: isBOM,
        bomData: currentBomData || undefined,
        zones: scannedItemZones.length > 0 ? scannedItemZones : undefined
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

      // Determine if this is a cross-batch transfer
      const isCrossBatch = destinationBatch && destinationBatch !== selectedBatch;

      // Build notes with batch transfer information
      let notes = `Multi-item send from Batch ${selectedBatch}`;
      if (isCrossBatch) {
        notes += ` to Batch ${destinationBatch} (Cross-Batch Transfer)`;
      }
      notes += `. Total items: ${cart.length}`;

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
        notes,
        reference: '',
        batchId: selectedBatch, // Keep for backward compatibility
        fromBatch: selectedBatch, // v7.20.0 - Source batch
        toBatch: destinationBatch || selectedBatch, // v7.20.0 - Destination batch (defaults to source if not specified)
        otp,
        skipOTP
      };

      await onSubmit(transactionData);

      // Clear cart after successful submission
      setCart([]);
      setDestinationZone('');
      setDestinationBatch(''); // v7.20.0 - Clear destination batch
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
      // Pass selected car type to extraction service
      const extractionResult = await qrExtractionService.extractSKUFromQRCode(scannedCode, selectedCarType);

      // Now accepts items found in EITHER scanner lookup OR item master
      if (extractionResult.success && extractionResult.extractedSKU) {
        const extractedSKU = extractionResult.extractedSKU;

        console.log('✅ Successfully extracted SKU:', extractedSKU);
        console.log('📍 Zone data available:', extractionResult.lookupData ? 'Yes' : 'No');
        console.log('📋 Item Master available:', extractionResult.itemMaster ? 'Yes' : 'No');

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

          // Store zone information for display (if available)
          if (extractionResult.lookupData && extractionResult.lookupData.length > 0) {
            const zones = extractionResult.lookupData.map(lookup => ({
              zone: lookup.targetZone.toString(),
              itemName: lookup.itemName,
              expectedQuantity: lookup.expectedQuantity
            }));
            setScannedItemZones(zones);
          } else {
            setScannedItemZones([]); // No zone data available
          }

          console.log('📦 Found in inventory via scan:', inventoryItem);
        } else {
          setScanError(`${extractedSKU} found but not in current inventory`);
          setSelectedSearchResult(null);
          setScannedItemZones([]);
        }

      } else {
        const attemptsList = extractionResult.attemptedLookups.slice(0, 3).join(', ');
        setScanError(`No valid SKU found. Tried: ${attemptsList}${extractionResult.attemptedLookups.length > 3 ? '...' : ''}`);
        setSelectedSearchResult(null);
        setScannedItemZones([]);
      }
    } catch (error) {
      console.error('QR extraction failed:', error);
      setScanError('Failed to process scanned QR code');
      setSelectedSearchResult(null);
      setScannedItemZones([]);
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
      {/* Compact Badge Style - Match Scanner */}
      <div className="mb-4 bg-white rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="space-y-2">
          {/* Source Batch Badge Line */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-600">From Batch:</span>
            <span>📦</span>
            <span className="font-semibold text-orange-700">
              {batchConfigLoading ? '⏳ Loading...' : selectedBatch || 'Not Set'}
            </span>
            {!batchConfigLoading && availableBatches.length > 0 && (
              <select
                id="transaction-batch-selector"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="text-xs border border-orange-300 bg-orange-50 rounded px-2 py-1 text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select Source Batch *</option>
                {availableBatches.map(batchId => (
                  <option key={batchId} value={batchId}>
                    Batch {batchId}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Destination Batch Badge Line - v7.20.0 Cross-Batch Transfer */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-600">To Batch:</span>
            <span>🎯</span>
            <span className="font-semibold text-purple-700">
              {batchConfigLoading ? '⏳ Loading...' : destinationBatch || 'Same Batch'}
            </span>
            {!batchConfigLoading && availableBatches.length > 0 && (
              <select
                id="transaction-dest-batch-selector"
                value={destinationBatch}
                onChange={(e) => setDestinationBatch(e.target.value)}
                className="text-xs border border-purple-300 bg-purple-50 rounded px-2 py-1 text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Keep in Same Batch</option>
                {availableBatches.map(batchId => (
                  <option key={batchId} value={batchId}>
                    Batch {batchId}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Car Type Selection Badge Line */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-600">Car Type:</span>
            <span>🚗</span>
            <span className="font-semibold text-blue-700">
              {carTypesLoading ? '⏳ Loading...' : selectedCarType}
            </span>
            {!carTypesLoading && availableCarTypes.length > 1 && (
              <select
                value={selectedCarType}
                onChange={(e) => {
                  setSelectedCarType(e.target.value);
                  // Zones will auto-refresh via useEffect
                }}
                className="text-xs border border-blue-300 bg-blue-50 rounded px-2 py-1 text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableCarTypes.map(carType => (
                  <option key={carType.carCode} value={carType.carCode}>
                    Change ▼ {carType.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Zone Selection Badge Line */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-600">Send to Zone:</span>
            <span>🏭</span>
            <select
              value={destinationZone}
              onChange={(e) => setDestinationZone(e.target.value)}
              className="text-xs border border-blue-300 bg-blue-50 rounded px-2 py-1 text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Zone *</option>
              {PRODUCTION_ZONES.map((zone) => (
                <option key={zone.id} value={zone.value}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cart Display */}
      {cart.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">
            🛒 Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
          </h4>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="bg-white p-3 rounded border border-green-200">
                <div className="flex items-center justify-between">
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
                    {/* Display zones for this cart item */}
                    {item.zones && item.zones.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.zones.map((zoneInfo, zIdx) => (
                          <span key={zIdx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                            🎯 Zone {zoneInfo.zone}
                          </span>
                        ))}
                      </div>
                    )}
                    {!item.zones && !item.isBOM && (
                      <div className="mt-1 text-xs text-gray-500">
                        ⚠️ No zone data
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.amount}
                      onChange={(e) => {
                        const filtered = filterToWesternNumerals(e.target.value);
                        const parsed = parseFilteredInt(filtered, 1);
                        if (parsed >= 1) {
                          handleUpdateCartQuantity(index, parsed);
                        }
                      }}
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone Mismatch Warning */}
      {cartZoneWarning && (
        <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-3xl">🚨</span>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-lg font-bold text-red-900 mb-2">
                Zone Mismatch Detected!
              </h4>
              <p className="text-red-800 mb-3">
                {cartZoneWarning.message}
              </p>
              <div className="bg-white border border-red-200 rounded p-3 text-sm">
                <p className="font-semibold text-red-900 mb-2">Why is this a problem?</p>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  <li>Items for different zones shouldn't be sent together</li>
                  <li>You might have scanned the wrong item by mistake</li>
                  <li>This could cause confusion at the production line</li>
                </ul>
                <p className="mt-3 font-semibold text-red-900">
                  💡 Suggestion: Double-check your scanned items or send them separately
                </p>
              </div>
            </div>
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
                setScannedItemZones([]);
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

            {/* Destination Zones Display (shown when scanned) */}
            {scannedItemZones.length > 0 && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2 flex items-center">
                  <span className="mr-2">🎯</span>
                  Destination Zones for {currentItem?.sku}
                </h4>
                <div className="space-y-1">
                  {scannedItemZones.map((zoneInfo, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-green-200">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-green-800">Zone {zoneInfo.zone}</span>
                        {zoneInfo.itemName && (
                          <span className="text-gray-600">• {zoneInfo.itemName}</span>
                        )}
                      </div>
                      {zoneInfo.expectedQuantity && (
                        <span className="text-green-700 font-medium">
                          Expected: {zoneInfo.expectedQuantity} units
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 mt-2">
                  💡 This item needs to go to {scannedItemZones.length} zone{scannedItemZones.length > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* No Zone Data Message (when scanned but no zones found) */}
            {currentItem && scannedItemZones.length === 0 && selectedSearchResult && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ℹ️ No zone data available for this item. Item found in Item Master but not in Scanner Lookup.
                </p>
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentAmount}
              onChange={(e) => {
                const filtered = filterToWesternNumerals(e.target.value);
                const value = parseFilteredInt(filtered, 0);
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
