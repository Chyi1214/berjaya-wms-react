// Unified Scanner View - Combines zone lookup + inventory scanning functionality
import { useState, useRef, useEffect } from 'react';
import { User, ItemMaster, Transaction, TransactionType, TransactionStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { scannerService } from '../../services/scannerService';
import { scanLookupService } from '../../services/scanLookupService';
import { transactionService } from '../../services/transactions';
import { tableStateService } from '../../services/tableState';
import { inventoryService } from '../../services/inventory';
import { itemMasterService } from '../../services/itemMaster';
import { SearchAutocomplete } from '../common/SearchAutocomplete';

interface UnifiedScannerViewProps {
  user: User;
  onBack: () => void;
}

interface UnifiedScanResult {
  sku: string;
  zones: Array<{
    zone: string;
    itemName?: string;
    expectedQuantity?: number;
  }>;
  item?: ItemMaster;
  timestamp: Date;
}

export function UnifiedScannerView({ user, onBack }: UnifiedScannerViewProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<UnifiedScanResult | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [manualEntry, setManualEntry] = useState('');
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanning();
      clearResult();
    };
  }, []);

  const checkCameraSupport = async () => {
    const isAvailable = await scannerService.isCameraAvailable();
    if (!isAvailable) {
      setError(t('scanner.cameraNotAvailable'));
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    setError(null);
    setSuccess(null);
    setScanResult(null);

    try {
      // Request camera permission
      const hasPermission = await scannerService.requestCameraPermission();
      if (!hasPermission) {
        setCameraPermission('denied');
        setError(t('scanner.cameraPermissionDenied'));
        return;
      }

      setCameraPermission('granted');
      setIsScanning(true);

      // Start scanning
      await scannerService.startScanning(
        videoRef.current,
        handleScanSuccess,
        handleScanError
      );

    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError(t('scanner.failedToStartCamera'));
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    scannerService.stopScanning();
    setIsScanning(false);
  };

  const handleScanSuccess = async (scannedCode: string) => {
    console.log('🔍 Raw scanned code:', JSON.stringify(scannedCode));

    // Stop scanning temporarily
    stopScanning();

    try {
      // Process the scanned code for unified result
      const result = await processUnifiedScan(scannedCode);

      if (result.success && result.unifiedResult) {
        setScanResult(result.unifiedResult);
        setQuantity('1'); // Default quantity
        setError(null);

        // Focus on quantity input if available
        setTimeout(() => {
          const input = document.getElementById('quantity-input');
          if (input) (input as HTMLInputElement).select();
        }, 100);
      } else {
        setScanResult(null);
        const attemptsList = result.attemptedLookups.join(', ');
        setError(`Item not found. Tried: ${attemptsList}`);
        console.log('❌ All lookup attempts failed:', result.attemptedLookups);
      }
    } catch (error) {
      console.error('Failed to process scanned code:', error);
      setError('Failed to process scanned item');
    }
  };

  // Unified processing that combines zone lookup + item master lookup
  const processUnifiedScan = async (rawCode: string): Promise<{
    success: boolean;
    unifiedResult?: UnifiedScanResult;
    attemptedLookups: string[];
  }> => {
    console.log('🌍 Processing unified scan...');
    const attemptedLookups: string[] = [];

    // Step 1: Clean basic whitespace and newlines
    const cleanedCode = rawCode
      .trim()
      .replace(/[\r\n\t]/g, '');

    console.log('✨ Basic cleaned code:', JSON.stringify(cleanedCode));

    // Get potential SKU candidates (reusing the same smart extraction logic)
    const candidates = await extractSKUCandidates(cleanedCode);

    // Try each candidate
    for (const candidate of candidates) {
      console.log(`🔍 Testing unified candidate: ${candidate}`);
      attemptedLookups.push(candidate);

      try {
        // Step 1: Try zone lookup
        const allLookups = await scanLookupService.getAllLookupsBySKU(candidate);

        // Step 2: Try item master lookup
        let masterItem: ItemMaster | undefined;
        try {
          const foundItem = await itemMasterService.getItemBySKU(candidate);
          masterItem = foundItem || undefined;
        } catch (error) {
          console.log('⚠️ Item Master lookup failed for:', candidate);
          masterItem = undefined;
        }

        // Success if we found zones OR item master (or both)
        if (allLookups.length > 0 || masterItem) {
          console.log(`✅ SUCCESS! Found data for: ${candidate}`);
          console.log(`📍 Zones: ${allLookups.length}, Item Master: ${masterItem ? 'Yes' : 'No'}`);

          // Prepare zone information
          const zones = allLookups.map(lookup => ({
            zone: lookup.targetZone.toString(),
            itemName: lookup.itemName,
            expectedQuantity: lookup.expectedQuantity
          }));

          // If no zones but we have item master, show that we found the item
          if (zones.length === 0 && masterItem) {
            zones.push({
              zone: 'Unknown',
              itemName: masterItem.name,
              expectedQuantity: undefined
            });
          }

          const unifiedResult: UnifiedScanResult = {
            sku: candidate,
            zones: zones,
            item: masterItem,
            timestamp: new Date()
          };

          return {
            success: true,
            unifiedResult,
            attemptedLookups
          };
        }

        console.log('❌ No data found for:', candidate);
      } catch (error) {
        console.log('⚠️ Lookup error for', candidate, ':', error);
        continue;
      }
    }

    console.log('😞 No valid data found for any candidates');
    return {
      success: false,
      attemptedLookups
    };
  };

  // Extract SKU candidates (same logic as original scanner)
  const extractSKUCandidates = async (cleanedCode: string): Promise<string[]> => {
    const candidates: string[] = [];

    // First, always try the exact cleaned code
    const exactCleanCode = cleanedCode.toUpperCase();
    candidates.push(exactCleanCode);

    // Then try smart extraction
    const normalizedCode = cleanedCode.replace(/[^a-zA-Z0-9\-\.]/g, '*').toUpperCase();
    const allSegments = normalizedCode.split('*').filter(str => str.length >= 3);

    const skuLikeSegments = allSegments.filter(segment => {
      const fieldNames = ['BT', 'MO', 'ITEMCODE', 'ITEMNAME', 'SPEC', 'QTY', 'UNIT', 'UNITNAME', 'LOT', 'SN', 'MEMO', 'CLC'];
      if (fieldNames.includes(segment)) return false;
      if (segment.length < 4) return false;

      const hasNumbers = /\d/.test(segment);
      const hasLetters = /[A-Z]/.test(segment);
      return hasNumbers || hasLetters;
    });

    const sortedCandidates = skuLikeSegments.sort((a, b) => {
      const aHasBoth = /\d/.test(a) && /[A-Z]/.test(a);
      const bHasBoth = /\d/.test(b) && /[A-Z]/.test(b);

      if (aHasBoth && !bHasBoth) return -1;
      if (!aHasBoth && bHasBoth) return 1;
      return a.length - b.length;
    });

    // Add sorted candidates (avoid duplicates)
    for (const candidate of sortedCandidates.slice(0, 7)) {
      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }

    return candidates;
  };

  const handleScanError = (err: Error) => {
    console.error('Scan error:', err);
    setError(`${t('scanner.scannerError')}: ${err.message}`);
    setIsScanning(false);
  };

  const handleManualEntry = async () => {
    if (!manualEntry.trim()) return;

    try {
      console.log('📝 Manual entry processing:', manualEntry);
      const result = await processUnifiedScan(manualEntry);

      if (result.success && result.unifiedResult) {
        setScanResult(result.unifiedResult);
        setQuantity('1');
        setManualEntry('');
        setError(null);
      } else {
        setScanResult(null);
        const attemptsList = result.attemptedLookups.join(', ');
        setError(`Item not found. Tried: ${attemptsList}`);
      }
    } catch (error) {
      console.error('Failed to process manual entry:', error);
      setError('Failed to process manual entry');
    }
  };

  const handleSearchEntry = async () => {
    if (!selectedSearchResult?.code) return;

    setError(null);
    setSuccess(null);

    const result = await processUnifiedScan(selectedSearchResult.code);

    if (result.success && result.unifiedResult) {
      setScanResult(result.unifiedResult);
      setQuantity('1');
      setSelectedSearchResult(null);
      setError(null);
    } else {
      setScanResult(null);
      const attemptsList = result.attemptedLookups.join(', ');
      setError(`Item not found. Tried: ${attemptsList}`);
    }
  };

  const handleItemSelect = (result: any) => {
    setSelectedSearchResult(result);
    setError(null);
  };

  const handleAddToInventory = async () => {
    if (!scanResult?.item || !quantity || isProcessing) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use the optimized method to add to inventory
      const { previousAmount, newAmount } = await tableStateService.addToInventoryCountOptimized(
        scanResult.sku,
        scanResult.item.name,
        qty,
        'logistics',
        user.email
      );

      // Keep legacy inventory_counts in sync
      await inventoryService.addToInventoryCount(
        scanResult.sku,
        scanResult.item.name,
        qty,
        'logistics',
        user.email
      );

      // Create transaction for audit trail
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku: scanResult.sku,
        itemName: scanResult.item.name,
        amount: qty,
        previousAmount: previousAmount,
        newAmount: newAmount,
        location: 'logistics',
        transactionType: TransactionType.TRANSFER_IN,
        status: TransactionStatus.COMPLETED,
        performedBy: user.email,
        timestamp: new Date(),
        notes: 'Unified scanner → logistics'
      };

      await transactionService.saveTransaction(transaction);

      // Success!
      setSuccess(`✅ Added ${qty} x ${scanResult.item.name} to inventory (Total: ${newAmount})`);

      // Clear after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (error) {
      console.error('Failed to save inventory:', error);
      setError('Failed to save inventory. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResult = () => {
    setScanResult(null);
    setQuantity('');
    setError(null);
    setSuccess(null);
  };

  // Remove unused function
  // const handleNewScan = () => {
  //   clearResult();
  //   startScanning();
  // };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-2xl">📱</span>
              <h1 className="text-lg font-bold text-gray-900">Unified Scanner</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-600 text-lg mr-2">✅</span>
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 text-lg mr-2">⚠️</span>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Scan Result Display */}
        {scanResult && (
          <div className="mb-6 bg-white rounded-lg border-2 border-blue-500 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Scan Result</h3>

            {/* SKU Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">SKU:</span>
                <span className="font-mono font-bold">{scanResult.sku}</span>
              </div>
              {scanResult.item && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{scanResult.item.name}</span>
                  </div>
                  {scanResult.item.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{scanResult.item.category}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Zone Information */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">📍 Zone Information:</h4>
              {scanResult.zones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scanResult.zones.map((zoneInfo, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="font-semibold text-blue-900">Zone {zoneInfo.zone}</div>
                      {zoneInfo.itemName && (
                        <div className="text-sm text-blue-700">{zoneInfo.itemName}</div>
                      )}
                      {zoneInfo.expectedQuantity && (
                        <div className="text-xs text-blue-600">Expected: {zoneInfo.expectedQuantity}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No zone information available</div>
              )}
            </div>

            {/* Quantity Input - Only show if item is found in Item Master */}
            {scanResult.item && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900">📥 Add to Inventory (Optional):</h4>
                <div>
                  <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Quantity:
                  </label>
                  <input
                    id="quantity-input"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddToInventory()}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity..."
                    min="0.01"
                    step="any"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleAddToInventory}
                    disabled={!quantity || isProcessing}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {isProcessing ? '⏳ Adding...' : '✅ Add to Inventory'}
                  </button>
                  <button
                    onClick={clearResult}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    📷 New Scan
                  </button>
                </div>
              </div>
            )}

            {/* If no item master found, just show new scan button */}
            {!scanResult.item && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={clearResult}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  📷 New Scan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scanner Interface - Show when no result */}
        {!scanResult && (
          <div className="space-y-6">

            {/* Camera Scanner */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📷 Barcode Scanner</h3>
                <p className="text-sm text-gray-500">Scan to see zones and optionally add to inventory</p>
              </div>

              <div className="p-6">
                {/* Video Element */}
                <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />

                  {/* Overlay when not scanning */}
                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="text-center text-white">
                        <div className="text-4xl mb-2">📷</div>
                        <p>Camera will appear here</p>
                      </div>
                    </div>
                  )}

                  {/* Scanning indicator */}
                  {isScanning && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                      🔍 Scanning...
                    </div>
                  )}
                </div>

                {/* Scanner Controls */}
                <div className="space-y-4">
                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                      📱 Start Scanner
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                      ⏹️ Stop Scanner
                    </button>
                  )}

                  {/* Camera Permission Status */}
                  {cameraPermission === 'denied' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm">
                        📱 Camera access required for scanning
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Entry */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">⌨️ Manual Entry</h3>
                <p className="text-sm text-gray-500">Enter barcode manually when scanner is not available</p>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  <textarea
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    placeholder="Enter barcode or QR code content..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleManualEntry()}
                  />
                  <button
                    onClick={handleManualEntry}
                    disabled={!manualEntry.trim()}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    🔍 Process Entry
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Search */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🔍 Smart Search</h3>
                <p className="text-sm text-gray-500">Search items when scanning is not available</p>
              </div>

              <div className="p-6" style={{ minHeight: '300px' }}>
                <div className="space-y-3 relative">
                  <SearchAutocomplete
                    placeholder="Search items (A001, B002) or BOMs (BOM001)..."
                    onSelect={handleItemSelect}
                    value={selectedSearchResult}
                    onClear={() => {
                      setSelectedSearchResult(null);
                      setError(null);
                    }}
                  />

                  <button
                    onClick={handleSearchEntry}
                    disabled={!selectedSearchResult}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    🔍 Process Item
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default UnifiedScannerView;