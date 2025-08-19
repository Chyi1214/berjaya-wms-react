// Scanner View - Main barcode scanning interface for logistics workers
import { useState, useRef, useEffect } from 'react';
import { User, ScanResult } from '../../types';
import { scannerService } from '../../services/scannerService';
import { scanLookupService } from '../../services/scanLookupService';
import { ScanResultDisplay } from './ScanResultDisplay';

interface ScannerViewProps {
  user: User;
  onBack: () => void;
}

export function ScannerView({ user, onBack }: ScannerViewProps) {
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
    };
  }, []);

  const checkCameraSupport = async () => {
    const isAvailable = await scannerService.isCameraAvailable();
    if (!isAvailable) {
      setError('Camera not available on this device');
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
        setError('Camera permission denied. Please enable camera access and try again.');
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
      setError('Failed to start camera. Please try again.');
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
        setError(`No valid SKU found. Tried: ${attemptsList}`);
        console.log('❌ All lookup attempts failed:', result.attemptedLookups);
      }
    } catch (error) {
      console.error('Failed to process scanned code:', error);
      setError('Failed to process scanned item');
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

    // First, always try the exact cleaned code as-is
    const exactCleanCode = cleanedCode.toUpperCase();
    console.log('🎯 Trying exact cleaned code lookup:', exactCleanCode);
    attemptedLookups.push(exactCleanCode);
    try {
      const exactLookup = await scanLookupService.getLookupBySKU(exactCleanCode);
      if (exactLookup) {
        console.log('✅ SUCCESS! Found exact match:', exactCleanCode);
        return {
          success: true,
          scanResult: {
            scannedCode: exactCleanCode,
            lookup: exactLookup,
            timestamp: new Date(),
            scannedBy: user.email
          },
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

    // Step 4: Try lookup for each candidate until one succeeds
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      console.log(`🔍 Testing candidate ${i + 1}/${candidates.length}: ${candidate}`);
      attemptedLookups.push(candidate);
      
      try {
        const lookup = await scanLookupService.getLookupBySKU(candidate);
        
        if (lookup) {
          console.log('✅ SUCCESS! Found lookup for:', candidate);
          console.log('🎯 Lookup data:', lookup);
          
          return {
            success: true,
            scanResult: {
              scannedCode: candidate,
              lookup,
              timestamp: new Date(),
              scannedBy: user.email
            },
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
    setError(`Scanner error: ${err.message}`);
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
        setError(`No valid SKU found. Tried: ${attemptsList}`);
        console.log('❌ All manual entry lookup attempts failed:', result.attemptedLookups);
      }
    } catch (error) {
      console.error('Failed to process manual entry:', error);
      setError('Failed to process entered text');
    }
  };

  const clearResult = () => {
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-2xl">📱</div>
              <h1 className="text-xl font-semibold text-gray-900">
                Inbound Scanner
              </h1>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.displayName || user.email}
              </p>
              <p className="text-xs text-gray-500">Logistics Worker</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Scanner Interface */}
        {!scanResult && (
          <div className="space-y-6">
            
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-blue-600 text-lg mr-3">ℹ️</div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">How to use the scanner:</h3>
                  <p className="text-sm text-blue-700">
                    1. Point your camera at a barcode<br/>
                    2. Wait for the scan (you'll hear a beep)<br/>
                    3. View the target zone information
                  </p>
                </div>
              </div>
            </div>

            {/* Camera View */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📷 Camera Scanner</h3>
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
                        📱 Camera access required. Please enable camera permissions in your browser settings.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Entry Fallback */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">⌨️ Manual Entry</h3>
                <p className="text-sm text-gray-500">Enter SKU or paste full QR code for testing</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  <textarea
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    placeholder="Enter SKU (A001) or paste QR code for testing&#10;Example QR: 10#F16-1301P05AA$11#2CR$17#2$18#25469-CX70P250401$19#3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleManualEntry()}
                  />
                  <button
                    onClick={handleManualEntry}
                    disabled={!manualEntry.trim()}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    🔍 Process (SKU or QR Code)
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
                    <h3 className="text-sm font-medium text-red-900 mb-1">Error</h3>
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
            onBack={onBack}
          />
        )}

      </main>
    </div>
  );
}

export default ScannerView;