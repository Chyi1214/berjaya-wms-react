// Barcode Scanner Component - Reusable camera-based barcode scanner
import { useRef, useEffect, useState } from 'react';
import { scannerService } from '../../services/scannerService';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export function BarcodeScanner({ onScan, onError, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    // Auto-start scanning when component mounts
    startScanning();

    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      // Request camera permission
      const hasPermission = await scannerService.requestCameraPermission();
      if (!hasPermission) {
        setCameraPermission('denied');
        onError?.('Camera permission denied. Please enable camera access in your browser settings.');
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
      onError?.('Failed to start camera. Please try again.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    scannerService.stopScanning();
    setIsScanning(false);
  };

  const handleScanSuccess = async (scannedCode: string) => {
    console.log('📷 Scanned code:', scannedCode);

    // Stop scanning
    stopScanning();

    // Pass the scanned code to parent
    onScan(scannedCode.trim());
  };

  const handleScanError = (err: Error) => {
    console.error('Scan error:', err);
    onError?.(`Scanner error: ${err.message}`);
    setIsScanning(false);
  };

  return (
    <div className="space-y-4">
      {/* Video Element */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
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
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {/* Scanning indicator */}
        {isScanning && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            🔍 Scanning...
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Camera Permission Status */}
      {cameraPermission === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-2">📱 Camera Permission Required</h4>
          <div className="space-y-2 text-red-700 text-sm">
            <p>Please enable camera access in your browser settings:</p>
            <ul className="list-disc list-inside space-y-1">
              {scannerService.getCameraTroubleshootingAdvice().map((advice, index) => (
                <li key={index}>{advice}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => {
                setCameraPermission('unknown');
                startScanning();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
            >
              🔄 Try Again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {isScanning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Hold the barcode steady in front of the camera. The scanner will automatically detect and read the barcode.
          </p>
        </div>
      )}
    </div>
  );
}
