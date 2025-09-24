// Scan In View - Direct inventory input via barcode scanning
import { useState, useRef, useEffect } from 'react';
import { User, ItemMaster, Transaction, TransactionType, TransactionStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { scannerService } from '../../services/scannerService';
import { qrExtractionService } from '../../services/qrExtraction';
import { transactionService } from '../../services/transactions';
import { tableStateService } from '../../services/tableState';
import { inventoryService } from '../../services/inventory';
import { itemMasterService } from '../../services/itemMaster';

interface ScanInViewProps {
  user: User;
  onBack: () => void;
}

interface ScanInResult {
  sku: string;
  item: ItemMaster | null;
  quantity?: number;
}

export function ScanInView({ user, onBack }: ScanInViewProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanInResult | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    setError(null);
    setSuccess(null);
    setScanResult(null);

    try {
      // Request camera permission
      const hasPermission = await scannerService.requestCameraPermission();
      if (!hasPermission) {
        setError(t('scanner.cameraPermissionDenied'));
        return;
      }

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
    console.log('📦 Scanned code for inventory:', scannedCode);
    
    // Stop scanning
    stopScanning();

    // Process the scanned code
    await processScannedSKU(scannedCode);
  };

  const handleScanError = (err: Error) => {
    console.error('Scan error:', err);
    setError(`${t('scanner.scannerError')}: ${err.message}`);
    setIsScanning(false);
  };

  const processScannedSKU = async (rawCode: string) => {
    try {
      console.log('📦 Processing scanned code for Scan In:', rawCode);
      
      // Use QR extraction process (same as Inbound Scanner and Send Items)
      const extractionResult = await qrExtractionService.extractSKUFromQRCode(rawCode);
      
      if (extractionResult.success && extractionResult.extractedSKU && extractionResult.lookupData) {
        const extractedSKU = extractionResult.extractedSKU;
        const lookupData = extractionResult.lookupData[0]; // Use first lookup for item info
        
        console.log('✅ Successfully extracted SKU:', extractedSKU);
        console.log('📍 Found in zones:', extractionResult.lookupData.map(l => l.targetZone).join(', '));
        
        // Create mock ItemMaster object from lookup data
        const item: ItemMaster = {
          sku: extractedSKU,
          name: lookupData.itemName || extractedSKU,
          category: lookupData.itemName ? 'Scanned Item' : undefined,
          unit: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Set the scan result and show quantity dialog
        setScanResult({ sku: extractedSKU, item });
        setShowQuantityDialog(true);
        setQuantity('1'); // Default quantity
        
        // Focus on quantity input
        setTimeout(() => {
          const input = document.getElementById('quantity-input');
          if (input) (input as HTMLInputElement).select();
        }, 100);
        
        console.log('📦 Item ready for scanning in:', item);
        console.log(`🎯 Available in ${extractionResult.lookupData.length} zone(s)`);
        
      } else {
        console.log('⚠️ Scanner lookup failed, trying Item Master directly for Scan In');
        
        // FALLBACK: For Scan In, try to find the item directly in Item Master
        try {
          const masterItem = await itemMasterService.getItemBySKU(rawCode.trim().toUpperCase());
          
          if (masterItem) {
            console.log('✅ Found item in Item Master:', masterItem);
            
            // Set the scan result and show quantity dialog
            setScanResult({ sku: masterItem.sku, item: masterItem });
            setShowQuantityDialog(true);
            setQuantity('1'); // Default quantity
            
            // Focus on quantity input
            setTimeout(() => {
              const input = document.getElementById('quantity-input');
              if (input) (input as HTMLInputElement).select();
            }, 100);
            
            console.log('📦 Item ready for scanning in from Item Master:', masterItem);
            
          } else {
            console.log('❌ Item not found in Item Master either');
            const attemptsList = extractionResult.attemptedLookups.join(', ');
            setError(`Item not found. Tried scanner lookups: ${attemptsList}, and Item Master: ${rawCode}`);
            setScanResult({ sku: rawCode, item: null });
          }
          
        } catch (error) {
          console.error('Failed to check Item Master:', error);
          const attemptsList = extractionResult.attemptedLookups.join(', ');
          setError(`No valid SKU found. Tried: ${attemptsList}`);
          setScanResult({ sku: rawCode, item: null });
        }
      }
      
    } catch (error) {
      console.error('Failed to process SKU:', error);
      setError(t('scanner.failedToProcessScannedItem'));
    }
  };


  const handleQuantityConfirm = async () => {
    if (!scanResult?.item || !quantity || isProcessing) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError(t('scanner.pleaseEnterValidQuantity'));
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Strict: Get canonical name from Item Master; block if not found
      const masterItem = await itemMasterService.getItemBySKU(scanResult.sku);
      if (!masterItem) {
        throw new Error(t('scanner.skuNotFoundInItemMaster', { sku: scanResult.sku }));
      }

      // Use the SUPER-FAST optimized method - only touches one document!
      const { previousAmount, newAmount } = await tableStateService.addToInventoryCountOptimized(
        scanResult.sku,
        masterItem.name,
        qty,
        'logistics',
        user.email
      );

      // Keep legacy `inventory_counts` in sync so Send form sees availability
      await inventoryService.addToInventoryCount(
        scanResult.sku,
        masterItem.name,
        qty,
        'logistics',
        user.email
      );

      // Create a TRANSFER_IN transaction for audit trail
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku: scanResult.sku,
        itemName: scanResult.item.name,
        amount: qty,
        previousAmount: previousAmount,
        newAmount: newAmount,
        location: 'logistics',
        transactionType: TransactionType.TRANSFER_IN,
        status: TransactionStatus.COMPLETED, // Auto-complete with trust
        performedBy: user.email,
        timestamp: new Date(),
        notes: 'Scan in → logistics'
      };

      // Save transaction for audit trail
      await transactionService.saveTransaction(transaction);

      // Success!
      setSuccess(`✅ ${t('scanner.addedToExpectedTable', { quantity: qty, name: masterItem.name, total: newAmount })}`);
      setShowQuantityDialog(false);
      setScanResult(null);
      setQuantity('');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (error) {
      console.error('Failed to save inventory:', error);
      setError(t('scanner.failedToSaveInventory'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuantityCancel = () => {
    setShowQuantityDialog(false);
    setScanResult(null);
    setQuantity('');
    setError(null);
  };

  const handleNewScan = () => {
    setScanResult(null);
    setQuantity('');
    setError(null);
    setSuccess(null);
    setShowQuantityDialog(false);
    startScanning();
  };

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
              <span className="text-2xl">📥</span>
              <h1 className="text-lg font-bold text-gray-900">{t('scanner.scanInInventory')}</h1>
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

        {/* Quantity Input Dialog */}
        {showQuantityDialog && scanResult?.item && (
          <div className="mb-6 bg-white rounded-lg border-2 border-blue-500 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('scanner.itemScannedSuccessfully')}</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">SKU:</span>
                <span className="font-mono font-bold">{scanResult.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{scanResult.item.name}</span>
              </div>
              {scanResult.item.unit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit:</span>
                  <span>{scanResult.item.unit}</span>
                </div>
              )}
              {scanResult.item.category && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span>{scanResult.item.category}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('scanner.enterQuantity')}
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuantityConfirm()}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('scanner.enterQuantityPlaceholder')}
                  min="0.01"
                  step="any"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleQuantityConfirm}
                  disabled={!quantity || isProcessing}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {isProcessing ? `⏳ ${t('scanner.processing')}` : `✅ ${t('common.confirm')}`}
                </button>
                <button
                  onClick={handleQuantityCancel}
                  disabled={isProcessing}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  ❌ {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanner Interface */}
        {!showQuantityDialog && (
          <div className="space-y-6">
            
            {/* Camera Scanner */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📷 {t('scanner.barcodeScanner')}</h3>
                <p className="text-sm text-gray-500">{t('scanner.scanItemBarcode')}</p>
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

                {/* Scanner Controls */}
                <div className="space-y-4">
                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                      📱 {t('scanner.startScanner')}
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                      ⏹️ {t('scanner.stopScanner')}
                    </button>
                  )}
                </div>
              </div>
            </div>


            {/* Quick Scan Again Button */}
            {(success || error) && !isScanning && (
              <button
                onClick={handleNewScan}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors text-lg"
              >
                📷 {t('scanner.scanNextItem')}
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default ScanInView;
