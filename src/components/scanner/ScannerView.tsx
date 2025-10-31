// Scanner View - Main barcode scanning interface for logistics workers
import { useState, useRef, useEffect } from 'react';
import { User, ScanResult } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { scannerService } from '../../services/scannerService';
import { scanLookupService } from '../../services/scanLookupService';
import { ScanResultDisplay } from './ScanResultDisplay';

interface ScannerViewProps {
  user: User;
  onBack: () => void;
}

export function ScannerView({ user }: ScannerViewProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [manualEntry, setManualEntry] = useState('');

  // Check camera availability on mount
  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanning();
      clearResult(); // Reset state on unmount
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
    console.log('📏 Raw code length:', scannedCode.length);

    // Stop scanning temporarily
    stopScanning();

    try {
      // Universal QR code processing for multiple providers
      const result = await processUniversalQRCode(scannedCode);
      
      if (result.success && result.scanResult) {
        setScanResult(result.scanResult);
        setError(null); // Clear any previous errors
      } else {
        // Show what was tried in the error message
        setScanResult(null); // Clear any previous results
        const attemptsList = result.attemptedLookups.join(', ');
        setError(t('scanner.noValidSKUFound', { attempts: attemptsList }));
        console.log('❌ All lookup attempts failed:', result.attemptedLookups);
      }
    } catch (error) {
      console.error('Failed to process scanned code:', error);
      setError(t('scanner.failedToProcessEntry'));
    }
  };

  // Universal QR code processing for multiple provider formats
  const processUniversalQRCode = async (rawCode: string): Promise<{
    success: boolean;
    scanResult?: ScanResult;
    attemptedLookups: string[];
  }> => {
    console.log('🌍 Processing universal QR code...');
    const attemptedLookups: string[] = [];
    
    // Step 1: Clean basic whitespace and newlines
    const cleanedCode = rawCode
      .trim()
      .replace(/[\r\n\t]/g, '');
    
    console.log('✨ Basic cleaned code:', JSON.stringify(cleanedCode));

    // First, always try the exact cleaned code as-is (now supports multiple zones!) (v7.19.0: default to TK1)
    const exactCleanCode = cleanedCode.toUpperCase();
    console.log('🎯 Trying exact cleaned code lookup:', exactCleanCode);
    attemptedLookups.push(exactCleanCode);
    try {
      const allLookups = await scanLookupService.getAllLookupsBySKU(exactCleanCode, 'TK1');
      if (allLookups.length > 0) {
        console.log(`✅ SUCCESS! Found ${allLookups.length} zone(s) for:`, exactCleanCode);
        
        // Create scan result with all zones (use first lookup as primary for compatibility)
        const scanResult: ScanResult = {
          scannedCode: exactCleanCode,
          lookup: allLookups[0], // Primary lookup for compatibility
          allLookups: allLookups, // All zones for display
          timestamp: new Date(),
          scannedBy: user.email
        };
        
        return {
          success: true,
          scanResult,
          attemptedLookups
        };
      }
      console.log('❌ No exact match found for:', exactCleanCode);
    } catch (error) {
      console.log('⚠️ Exact lookup error:', error);
    }

    // Step 2: Normalize - replace all non-alphanumeric and non-dash with *
    const normalizedCode = cleanedCode.replace(/[^a-zA-Z0-9\-\.]/g, '*').toUpperCase();
    console.log('🔧 Normalized code:', normalizedCode);

    // Step 3: Split by * to get potential SKU candidates
    const allSegments = normalizedCode.split('*').filter(str => str.length >= 3);
    
    // Smart filtering: prioritize segments that look like actual SKU values, not field names
    const skuLikeSegments = allSegments.filter(segment => {
      // Skip obvious field names
      const fieldNames = ['BT', 'MO', 'ITEMCODE', 'ITEMNAME', 'SPEC', 'QTY', 'UNIT', 'UNITNAME', 'LOT', 'SN', 'MEMO', 'CLC'];
      if (fieldNames.includes(segment)) return false;
      
      // Skip very short segments that are likely noise
      if (segment.length < 4) return false;
      
      // Prioritize segments that contain numbers and letters (typical SKU pattern)
      const hasNumbers = /\d/.test(segment);
      const hasLetters = /[A-Z]/.test(segment);
      
      return hasNumbers || hasLetters;
    });
    
    // Sort by likelihood of being a SKU (segments with both numbers and letters first)
    const sortedCandidates = skuLikeSegments.sort((a, b) => {
      const aHasBoth = /\d/.test(a) && /[A-Z]/.test(a);
      const bHasBoth = /\d/.test(b) && /[A-Z]/.test(b);
      
      if (aHasBoth && !bHasBoth) return -1;
      if (!aHasBoth && bHasBoth) return 1;
      
      // If both or neither have both, prefer shorter ones (more likely to be simple SKUs)
      return a.length - b.length;
    });
    
    // Take top candidates
    const candidates = sortedCandidates.slice(0, 8);
    
    console.log('📋 All segments:', allSegments);
    console.log('📋 SKU-like candidates (filtered):', skuLikeSegments);
    console.log('📋 Sorted candidates:', sortedCandidates);
    console.log('📋 Final candidates to test:', candidates);

    // Step 4: Try lookup for each candidate until one succeeds (v7.19.0: default to TK1)
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      console.log(`🔍 Testing candidate ${i + 1}/${candidates.length}: ${candidate}`);
      attemptedLookups.push(candidate);

      try {
        const allLookups = await scanLookupService.getAllLookupsBySKU(candidate, 'TK1');
        
        if (allLookups.length > 0) {
          console.log(`✅ SUCCESS! Found ${allLookups.length} zone(s) for:`, candidate);
          console.log('🎯 Lookup data:', allLookups);
          
          // Create scan result with all zones (same pattern as exact match)
          const scanResult: ScanResult = {
            scannedCode: candidate,
            lookup: allLookups[0], // Primary lookup for compatibility
            allLookups: allLookups, // All zones for display
            timestamp: new Date(),
            scannedBy: user.email
          };
          
          return {
            success: true,
            scanResult,
            attemptedLookups
          };
        } else {
          console.log('❌ No lookup found for:', candidate);
        }
      } catch (error) {
        console.log('⚠️ Lookup error for', candidate, ':', error);
        continue; // Try next candidate
      }
    }

    console.log('😞 No valid SKU found in any candidates');
    console.log('📋 Total attempts made:', attemptedLookups);
    return {
      success: false,
      attemptedLookups
    };
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
      
      // Use the same universal QR processing for manual entries
      const result = await processUniversalQRCode(manualEntry);
      
      if (result.success && result.scanResult) {
        setScanResult(result.scanResult);
        setManualEntry('');
        setError(null); // Clear any previous errors
      } else {
        // Show what was tried in the error message
        setScanResult(null); // Clear any previous results
        const attemptsList = result.attemptedLookups.join(', ');
        setError(t('scanner.noValidSKUFound', { attempts: attemptsList }));
        console.log('❌ All manual entry lookup attempts failed:', result.attemptedLookups);
      }
    } catch (error) {
      console.error('Failed to process manual entry:', error);
      setError(t('scanner.failedToProcessEntry'));
    }
  };

  const clearResult = () => {
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Scanner Interface */}
        {!scanResult && (
          <div className="space-y-6">
            

            {/* Camera View */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📷 {t('scanner.cameraScanner')}</h3>
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
                  
                  {/* Overlay */}
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

                  {/* Camera Permission Status */}
                  {cameraPermission === 'denied' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-red-800 font-semibold mb-3">📱 {t('scanner.cameraAccessRequired')}</h4>

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

            {/* Manual Entry Fallback */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">⌨️ {t('scanner.manualEntry')}</h3>
                <p className="text-sm text-gray-500">{t('scanner.enterSKU')}</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  <textarea
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    placeholder={`${t('scanner.enterSKUPlaceholder')}\n${t('scanner.exampleQR')}`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleManualEntry()}
                  />
                  <button
                    onClick={handleManualEntry}
                    disabled={!manualEntry.trim()}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    🔍 {t('scanner.processSKU')}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-red-600 text-lg mr-3">⚠️</div>
                  <div>
                    <h3 className="text-sm font-medium text-red-900 mb-1">{t('scanner.error')}</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Result Display */}
        {scanResult && (
          <ScanResultDisplay
            result={scanResult}
            onNewScan={clearResult}
          />
        )}

      </main>
    </div>
  );
}

export default ScannerView;