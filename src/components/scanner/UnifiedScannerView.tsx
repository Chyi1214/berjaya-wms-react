// Unified Scanner View - Combines zone lookup + inventory scanning functionality
import { useState, useRef, useEffect } from 'react';
import { User, ItemMaster, Transaction, TransactionType, TransactionStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { scannerService } from '../../services/scannerService';
import { scanLookupService } from '../../services/scanLookupService';
import { transactionService } from '../../services/transactions';
import { tableStateService } from '../../services/tableState';
import { itemMasterService } from '../../services/itemMaster';
import { batchAllocationService } from '../../services/batchAllocationService';
import { batchManagementService } from '../../services/batchManagement';
import { packingBoxesService } from '../../services/packingBoxesService';
import { supplierBoxScanService } from '../../services/supplierBoxScanService';
import { SearchAutocomplete } from '../common/SearchAutocomplete';

interface UnifiedScannerViewProps {
  user: User;
  onBatchChange?: (batchId: string) => void; // Callback when batch selection changes
}

interface UnifiedScanResult {
  sku: string;
  zones: Array<{
    zone: string;
    itemName?: string;
    expectedQuantity?: number;
    perCarQuantity?: number; // v7.19.0
  }>;
  item?: ItemMaster;
  timestamp: Date;
}

export function UnifiedScannerView({ user, onBatchChange }: UnifiedScannerViewProps) {
  const { t } = useLanguage();
  const { getUserDisplayName } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<UnifiedScanResult | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);
  const [rawQRCode, setRawQRCode] = useState<string>(''); // Track raw QR code for supplier box tracking

  // Double scan confirmation states
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
  const [confirmationText, setConfirmationText] = useState('');

  // Car type selection (v7.19.0)
  const [availableCarTypes, setAvailableCarTypes] = useState<Array<{carCode: string; name: string}>>([]);
  const [selectedCarType, setSelectedCarType] = useState<string>('TK1'); // Default to TK1
  const [carTypesLoading, setCarTypesLoading] = useState(false);

  // Batch allocation states
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [batchConfigLoading, setBatchConfigLoading] = useState(false);
  // Box selection
  const [availableBoxes, setAvailableBoxes] = useState<string[]>([]);
  const [selectedBox, setSelectedBox] = useState<string>('');

  // Load car types and batch configuration on mount (v7.19.0)
  useEffect(() => {
    loadCarTypes();
    loadBatchConfig();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanning();
      clearResult();
    };
  }, []);

  // Notify parent when batch changes (for logistics monitor sync)
  useEffect(() => {
    if (selectedBatch && onBatchChange) {
      onBatchChange(selectedBatch);
    }
  }, [selectedBatch, onBatchChange]);

  const checkCameraSupport = async () => {
    const isAvailable = await scannerService.isCameraAvailable();
    if (!isAvailable) {
      setError(t('scanner.cameraNotAvailable'));
    }
  };

  // Load available car types (v7.19.0)
  const loadCarTypes = async () => {
    try {
      setCarTypesLoading(true);

      // Ensure TK1 exists
      await batchManagementService.ensureTK1CarTypeExists();

      // Load all car types
      const carTypes = await batchManagementService.getAllCarTypes();
      setAvailableCarTypes(carTypes.map(ct => ({ carCode: ct.carCode, name: ct.name })));

      // Restore last selected car type from localStorage, default to TK1
      const lastCarType = localStorage.getItem('wms-scanner-car-type') || 'TK1';
      if (carTypes.some(ct => ct.carCode === lastCarType)) {
        setSelectedCarType(lastCarType);
      } else {
        setSelectedCarType('TK1');
      }
    } catch (error) {
      console.error('Failed to load car types:', error);
      setError('Failed to load car types');
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
      setError('Failed to load batch configuration');
    } finally {
      setBatchConfigLoading(false);
    }
  };

  // Load boxes list when batch changes and restore last used box from localStorage
  useEffect(() => {
    (async () => {
      if (!selectedBatch) {
        setAvailableBoxes([]);
        setSelectedBox('');
        return;
      }
      try {
        const boxes = await packingBoxesService.listBoxes(selectedBatch);
        const caseNos = boxes.map((b) => b.caseNo).sort();
        setAvailableBoxes(caseNos);
        try {
          const last = localStorage.getItem(`wms-active-box:${selectedBatch}`) || '';
          if (last && caseNos.includes(last)) setSelectedBox(last);
        } catch {}
      } catch (e) {
        console.error('Failed to load boxes for batch', selectedBatch, e);
        setAvailableBoxes([]);
      }
    })();
  }, [selectedBatch]);

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
      // Store raw QR code for supplier box tracking
      setRawQRCode(scannedCode);

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
        // Step 1: Try zone lookup (v7.19.0: car-type-specific)
        const allLookups = await scanLookupService.getAllLookupsBySKU(candidate, selectedCarType);

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

          // Prepare zone information (v7.19.0: include perCarQuantity)
          const zones = allLookups.map(lookup => ({
            zone: lookup.targetZone.toString(),
            itemName: lookup.itemName,
            expectedQuantity: lookup.expectedQuantity,
            perCarQuantity: lookup.perCarQuantity
          }));

          // If no zones but we have item master, show that we found the item
          if (zones.length === 0 && masterItem) {
            zones.push({
              zone: 'Unknown',
              itemName: masterItem.name,
              expectedQuantity: undefined,
              perCarQuantity: undefined // v7.19.0: Add missing field
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


  const handleSearchEntry = async () => {
    if (!selectedSearchResult?.code) return;

    setError(null);
    setSuccess(null);

    // Store raw QR code for supplier box tracking
    setRawQRCode(selectedSearchResult.code);

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

    if (!selectedBatch) {
      setError('Please select a batch for this inventory');
      return;
    }

    // Box requirement: DEFAULT batch doesn't need box, others do
    const isDefaultBatch = selectedBatch === 'DEFAULT';
    if (!isDefaultBatch && !selectedBox) {
      setError('Please select or enter a box (CASE NO)');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // SUPPLIER BOX QR TRACKING: Check for duplicate scans (only if QR code exists)
      if (rawQRCode && rawQRCode.trim().length > 0) {
        try {
          const duplicate = await supplierBoxScanService.checkDuplicate(rawQRCode, selectedBatch);

          if (duplicate) {
            // Show custom confirmation dialog - requires typing confirmation text
            setDuplicateInfo(duplicate);
            setShowDuplicateDialog(true);
            // Keep isProcessing = true to prevent other actions
            return; // Wait for user confirmation
          }
        } catch (dupCheckError: any) {
          // Silently handle permission errors - QR tracking is optional
          if (dupCheckError?.code !== 'permission-denied') {
            console.error('Failed to check for duplicate QR code:', dupCheckError);
          }
          // Continue with scan even if duplicate check fails
        }
      }

      // No duplicate detected, proceed with scan
      await proceedWithScan();

    } catch (error) {
      console.error('Failed to save inventory:', error);
      setError('Failed to save inventory. Please try again.');
      setIsProcessing(false);
    }
  };

  // Continue with scan after duplicate confirmation
  const proceedWithScan = async () => {
    if (!scanResult) return;

    const qty = parseFloat(quantity);
    const isDefaultBatch = selectedBatch === 'DEFAULT';

    try {
      // NO MORE STRICT VALIDATION
      // We track what actually happens, not enforce what should happen
      // Workers can put any item in any box

      // Use the optimized method to add to inventory
      const { previousAmount, newAmount } = await tableStateService.addToInventoryCountOptimized(
        scanResult.sku,
        scanResult.item!.name,
        qty,
        'logistics',
        user.email
      );

      // Create transaction for audit trail
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku: scanResult.sku,
        itemName: scanResult.item!.name,
        amount: qty,
        previousAmount: previousAmount,
        newAmount: newAmount,
        location: 'logistics',
        transactionType: TransactionType.TRANSFER_IN,
        status: TransactionStatus.COMPLETED,
        performedBy: user.email,
        performedByName: getUserDisplayName(),
        timestamp: new Date(),
        notes: `Unified scanner → logistics (Batch: ${selectedBatch})`,
        batchId: selectedBatch
      };

      // PERFORMANCE FIX: Run all independent writes in parallel
      const parallelWrites: Promise<any>[] = [
        // 1. Add to batch allocation tracking
        batchAllocationService.addToBatchAllocation(
          scanResult.sku,
          'logistics',
          selectedBatch,
          qty
        ),
        // 2. Save transaction
        transactionService.saveTransaction(transaction)
      ];

      // 3. SUPPLIER BOX QR TRACKING (optional, only if QR code exists)
      if (rawQRCode && rawQRCode.trim().length > 0) {
        parallelWrites.push(
          supplierBoxScanService.recordScan({
            supplierBoxQR: rawQRCode,
            batchId: selectedBatch,
            scannedBy: user.email,
            sku: scanResult.sku,
            quantity: qty,
            caseNo: isDefaultBatch ? null : (selectedBox || null),
            transactionId: transaction.id
          }).catch((recordError: any) => {
            // Silently handle permission errors - QR tracking is optional
            if (recordError?.code !== 'permission-denied') {
              console.error('Failed to record supplier box scan:', recordError);
            }
          })
        );
      }

      // 4. Update packing box progress (optional, only for non-DEFAULT batches with box)
      if (!isDefaultBatch && selectedBox) {
        parallelWrites.push(
          packingBoxesService.applyScan(selectedBatch, selectedBox, scanResult.sku, qty, user.email)
            .then(() => {
              try { localStorage.setItem(`wms-active-box:${selectedBatch}`, selectedBox); } catch {}
            })
            .catch((e: any) => {
              console.error('Box tracking failed:', e);
              // Don't show error to user - box tracking is now optional
            })
        );
      }

      // Execute all writes in parallel - much faster!
      await Promise.all(parallelWrites);

      if (rawQRCode && rawQRCode.trim().length > 0) {
        console.log('✅ Supplier box QR scan recorded:', rawQRCode);
      }

      // Success! (message will clear when worker starts next scan)
      setSuccess(`✅ Added ${qty} x ${scanResult.item!.name} to inventory (Batch: ${selectedBatch}, Total: ${newAmount})`);

    } catch (error) {
      console.error('Failed to save inventory:', error);
      setError('Failed to save inventory. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle duplicate scan confirmation
  const handleDuplicateConfirm = () => {
    if (confirmationText.trim() === 'Double scan with no duplication.') {
      setShowDuplicateDialog(false);
      setConfirmationText('');
      setDuplicateInfo(null);
      // Continue with scan
      proceedWithScan();
    } else {
      setError('Please type the exact confirmation text: "Double scan with no duplication."');
    }
  };

  // Handle duplicate scan cancellation
  const handleDuplicateCancel = () => {
    setShowDuplicateDialog(false);
    setConfirmationText('');
    setDuplicateInfo(null);
    setIsProcessing(false);
    setError('Scan cancelled - duplicate supplier box detected');
  };

  const clearResult = () => {
    setScanResult(null);
    setQuantity('');
    setError(null);
    setSuccess(null);
    setRawQRCode(''); // Clear raw QR code as well
  };

  // Remove unused function
  // const handleNewScan = () => {
  //   clearResult();
  //   startScanning();
  // };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Compact Badge Style - Car Type & Batch (v7.19.0) */}
        <div className="mb-4 bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="space-y-2">
            {/* Car Type Badge Line */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-gray-600">Car Type:</span>
              <span>🚗</span>
              <span className="font-semibold text-purple-700">
                {carTypesLoading ? '⏳ Loading...' : selectedCarType || 'Not Set'}
              </span>
              {!carTypesLoading && availableCarTypes.length > 1 && (
                <select
                  id="car-type-selector"
                  value={selectedCarType}
                  onChange={(e) => {
                    const newCarType = e.target.value;
                    setSelectedCarType(newCarType);
                    try {
                      localStorage.setItem('wms-scanner-car-type', newCarType);
                    } catch (err) {
                      console.error('Failed to save car type to localStorage:', err);
                    }
                  }}
                  className="text-xs border border-purple-300 bg-purple-50 rounded px-2 py-1 text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availableCarTypes.map(carType => (
                    <option key={carType.carCode} value={carType.carCode}>
                      Change ▼ {carType.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Batch Badge Line */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-gray-600">Batch:</span>
              <span>📦</span>
              <span className="font-semibold text-orange-700">
                {batchConfigLoading ? '⏳ Loading...' : selectedBatch || 'Not Set'}
              </span>
              {!batchConfigLoading && availableBatches.length > 1 && (
                <select
                  id="batch-selector"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="text-xs border border-orange-300 bg-orange-50 rounded px-2 py-1 text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableBatches.map(batchId => (
                    <option key={batchId} value={batchId}>
                      Change ▼ Batch {batchId}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Box Selection - Only show for non-DEFAULT batches */}
        {selectedBatch !== 'DEFAULT' && (
          <div className="mb-6 bg-white border rounded-lg p-4">
            {/* Mobile-friendly layout: Stack vertically */}
            <div className="space-y-4">
              {/* Box Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📦 Box (CASE NO)</label>
                <input
                  type="text"
                  value={selectedBox}
                  onChange={(e) => setSelectedBox(e.target.value.trim())}
                  placeholder={availableBoxes.length ? `e.g., ${availableBoxes[0]}` : 'Enter CASE NO (e.g., C10C1)'}
                  className="w-full px-4 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-2">💡 We remember your last box for this batch</p>
              </div>

              {/* Box Suggestions - Full width on mobile */}
              {availableBoxes.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">Quick Select:</div>
                  <div className="flex flex-wrap gap-2">
                    {availableBoxes
                      .filter((b) => !selectedBox || b.toLowerCase().includes(selectedBox.toLowerCase()))
                      .slice(0, 8)
                      .map((b) => (
                        <button
                          key={b}
                          type="button"
                          className="px-4 py-2 bg-gray-100 hover:bg-green-100 border border-gray-300 hover:border-green-500 rounded-lg text-sm font-medium transition-colors"
                          onClick={() => setSelectedBox(b)}
                        >
                          {b}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scan Result Display */}
        {scanResult && (
          <div className="mb-6 bg-white rounded-lg border-2 border-blue-500 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 {t('scanner.scanResult')}</h3>

            {/* Action Required Warning */}
            {scanResult.item && !success && (
              <div className="mb-4 bg-orange-50 border-2 border-orange-400 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-orange-600 text-2xl mr-3">⚠️</span>
                  <div>
                    <p className="text-orange-900 font-bold text-lg">{t('scanner.actionRequired')}</p>
                    <p className="text-orange-800 text-sm mt-1">{t('scanner.scanNotComplete')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SKU Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('scanner.sku')}</span>
                <span className="font-mono font-bold">{scanResult.sku}</span>
              </div>
              {scanResult.item && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('scanner.name')}</span>
                    <span className="font-medium">{scanResult.item.name}</span>
                  </div>
                  {scanResult.item.category && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('scanner.category')}</span>
                      <span>{scanResult.item.category}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Zone Information */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">📍 {t('scanner.zoneInformation')}</h4>
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
                      {zoneInfo.perCarQuantity && (
                        <div className="text-xs text-purple-600">Per Car: {zoneInfo.perCarQuantity}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">{t('scanner.noZoneInfo')}</div>
              )}
            </div>

            {/* Quantity Input - Only show if item is found in Item Master */}
            {scanResult.item && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-4">📥 {t('scanner.addToInventory')}</h4>

                <div>
                  <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('scanner.enterQuantityToAdd')}
                  </label>
                  <input
                    id="quantity-input"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddToInventory()}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder={t('scanner.enterQuantityPlaceholder')}
                    min="0.01"
                    step="any"
                    autoFocus
                  />
                </div>

                {/* Batch Information */}
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                  <div className="text-sm text-blue-800">
                    📦 {t('scanner.targetBatch')} <span className="font-bold text-blue-900">Batch {selectedBatch}</span>
                  </div>
                </div>

                {/* Success Message - Moved to bottom for visibility */}
                {success && (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center">
                      <span className="text-green-600 text-2xl mr-3">✅</span>
                      <p className="text-green-800 font-bold">{success}</p>
                    </div>
                  </div>
                )}

                {/* Error Message - Moved to bottom for visibility */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                    <div className="flex items-center">
                      <span className="text-red-600 text-2xl mr-3">⚠️</span>
                      <p className="text-red-800 font-bold">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleAddToInventory}
                    disabled={!quantity || isProcessing || !selectedBatch}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                  >
                    {isProcessing ? `⏳ ${t('scanner.adding')}` : `➕ ${t('scanner.addToBatch')} ${selectedBatch}`}
                  </button>
                  <button
                    onClick={clearResult}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    📷 {t('scanner.newScan')}
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
                  📷 {t('scanner.newScan')}
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
              {/* Prominent Start Scanning Button */}
              <div className="p-4">
                {!isScanning ? (
                  <button
                    onClick={startScanning}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-md"
                  >
                    📱 Start Scanning
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-md"
                  >
                    ⏹️ Stop Scanner
                  </button>
                )}
              </div>

              <div className="p-6 pt-0">
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
                        <p>{t('scanner.cameraWillAppearHere')}</p>
                      </div>
                    </div>
                  )}

                  {/* Scanning indicator */}
                  {isScanning && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                      🔍 {t('scanner.scanning')}
                    </div>
                  )}
                </div>

                {/* Camera Permission Status */}
                <div className="space-y-4">
                  {cameraPermission === 'denied' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-red-800 font-semibold mb-3">📱 Camera Permission Required</h4>

                      <div className="space-y-3 text-red-700 text-sm">
                        <p className="font-medium">Try these device-specific solutions:</p>

                        <div className="space-y-2">
                          {scannerService.getCameraTroubleshootingAdvice().map((advice, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <span className="text-red-600 font-bold">{index + 1}.</span>
                              <p>{advice}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-red-200 flex space-x-3">
                          <button
                            onClick={() => {
                              setCameraPermission('unknown');
                              setError(null);
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            🔄 Try Camera Again
                          </button>
                          <button
                            onClick={() => window.location.reload()}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                          >
                            🔄 Reload Page
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Smart Search */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🔍 {t('scanner.smartSearch')}</h3>
                <p className="text-sm text-gray-500">{t('scanner.searchItemsNotAvailable')}</p>
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

        {/* Duplicate Scan Confirmation Modal */}
        {showDuplicateDialog && duplicateInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">⚠️</span>
                <h3 className="text-xl font-bold text-red-600">Duplicate Scan Detected!</h3>
              </div>

              {/* Previous Scan Details */}
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-900 mb-2">This supplier box was already scanned:</p>
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>📅 Date: {duplicateInfo.scannedAt.toLocaleDateString()} {duplicateInfo.scannedAt.toLocaleTimeString()}</p>
                  <p>👤 By: {duplicateInfo.scannedBy}</p>
                  <p>📦 SKU: {duplicateInfo.sku}</p>
                  <p>🔢 Quantity: {duplicateInfo.quantity} units</p>
                  <p>📍 Box: {duplicateInfo.caseNo || 'DEFAULT'}</p>
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  To proceed, type the following text exactly:
                </label>
                <p className="text-sm font-mono bg-gray-100 border border-gray-300 rounded p-2 mb-3 text-center">
                  Double scan with no duplication.
                </p>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDuplicateCancel}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDuplicateConfirm}
                  disabled={confirmationText.trim() !== 'Double scan with no duplication.'}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Confirm Duplicate Scan
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}

export default UnifiedScannerView;
