// Car Scan View - Version 4.0 VIN Scanning for Production Lines
import { useState, useRef, useEffect } from 'react';
import { User, Car, CarScanFormData, CarStatus } from '../../types';
// VIN scanning uses hardcoded English text for production speed
import { scannerService } from '../../services/scannerService';
import { carTrackingService } from '../../services/carTrackingService';

interface CarScanViewProps {
  user: User;
  zoneId: number;
  onBack: () => void;
  onCarScanned: (car: Car) => void;
}

export function CarScanView({ user, zoneId, onBack, onCarScanned }: CarScanViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualVin, setManualVin] = useState('');
  
  // Removed car form state - now creating cars automatically with default values

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkCameraSupport();
    // Auto-start camera when component mounts
    setTimeout(() => {
      startScanning();
    }, 500); // Small delay to ensure component is fully mounted
    
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
    setSuccess(null);

    try {
      const hasPermission = await scannerService.requestCameraPermission();
      if (!hasPermission) {
        setCameraPermission('denied');
        setError('Camera permission denied');
        return;
      }

      setCameraPermission('granted');
      setIsScanning(true);

      await scannerService.startScanning(
        videoRef.current,
        handleScanSuccess,
        (error) => {
          console.error('Scanning error:', error);
          setError(`Scanning error: ${error}`);
          setIsScanning(false);
        }
      );
    } catch (error) {
      console.error('Failed to start scanning:', error);
      setError(`Failed to start camera: ${error}`);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    scannerService.stopScanning();
    setIsScanning(false);
  };

  const handleScanSuccess = async (scannedCode: string) => {
    console.log('📱 Scanned VIN:', scannedCode);
    
    // Clean the scanned code
    const cleanVin = scannedCode.trim().toUpperCase();
    
    // Validate VIN format (basic check)
    if (cleanVin.length !== 17) {
      setError(`Invalid VIN format: ${cleanVin}. VINs must be 17 characters.`);
      return;
    }

    setIsProcessing(true);
    stopScanning();
    
    try {
      await processVinScan(cleanVin);
    } catch (error) {
      setError(`Failed to process VIN: ${error}`);
      setIsProcessing(false);
    }
  };

  const handleManualEntry = async () => {
    const cleanVin = manualVin.trim().toUpperCase();
    
    if (!cleanVin) {
      setError('Please enter a VIN number');
      return;
    }
    
    if (cleanVin.length !== 17) {
      setError(`Invalid VIN format: ${cleanVin}. VINs must be 17 characters.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      await processVinScan(cleanVin);
      setManualVin('');
      setShowManualEntry(false);
    } catch (error) {
      setError(`Failed to process VIN: ${error}`);
      setIsProcessing(false);
    }
  };

  // Create car automatically with default values - focus on VIN and time tracking only
  const createCarAutomatically = async (vin: string) => {
    const autoCarData: CarScanFormData = {
      vin,
      type: 'Standard',        // Default type for time tracking
      color: 'Unknown',        // Default color - not important for time tracking
      series: 'Production',    // Default series - not important for time tracking
      status: CarStatus.IN_PRODUCTION,
      currentZone: null
    };

    try {
      // Create the car
      await carTrackingService.createCar(autoCarData);

      // Immediately scan into zone using ATOMIC operation
      await carTrackingService.scanCarIntoZoneAtomic(vin, zoneId, user.email);

      // Get the created car
      const newCar = await carTrackingService.getCarByVIN(vin);
      if (newCar) {
        setSuccess(`✅ Atomic scan-in: Car ${vin} created and scanned into Zone ${zoneId} - Time tracking started!`);
        onCarScanned(newCar);

        // Play success sound
        scannerService.triggerFeedback();
      }
    } catch (error) {
      throw new Error(`Failed to create car: ${error}`);
    }
  };

  const processVinScan = async (vin: string) => {
    try {
      // Check if car already exists
      const existingCar = await carTrackingService.getCarByVIN(vin);

      if (existingCar) {
        // Car exists, scan into zone using ATOMIC operation
        if (existingCar.currentZone !== null) {
          throw new Error(`Car ${vin} is already in zone ${existingCar.currentZone}`);
        }

        await carTrackingService.scanCarIntoZoneAtomic(vin, zoneId, user.email);

        // Get updated car data
        const updatedCar = await carTrackingService.getCarByVIN(vin);
        if (updatedCar) {
          setSuccess(`✅ Atomic scan-in: Car ${vin} successfully scanned into Zone ${zoneId}`);
          onCarScanned(updatedCar);

          // Play success sound
          scannerService.triggerFeedback();
        }
      } else {
        // New car, create automatically with default values for time tracking only
        await createCarAutomatically(vin);
      }

      setIsProcessing(false);
    } catch (error) {
      throw error;
    }
  };

  // Removed handleCreateCar - now using createCarAutomatically instead

  const resetScanState = () => {
    setError(null);
    setSuccess(null);
    setShowManualEntry(false);
    setManualVin('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">


          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">{success}</span>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    resetScanState();
                    onBack();
                  }}
                  className="btn-primary"
                >
                  Continue to Zone Menu
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Car form removed - cars are now created automatically with default values */}

          {/* Scanner Interface */}
          {!success && (
            <div className="bg-white rounded-lg shadow-md p-6">
              
              {/* Camera Scanner */}
              {cameraPermission !== 'denied' && (
                <div className="mb-6">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '300px' }}>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                        <button
                          onClick={startScanning}
                          disabled={isProcessing}
                          className="btn-primary text-lg px-8 py-4 disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : '📱 Start Camera'}
                        </button>
                      </div>
                    )}
                    
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-2 border-green-500 w-64 h-32 rounded-lg"></div>
                      </div>
                    )}
                  </div>
                  
                  {isScanning && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={stopScanning}
                        className="btn-secondary"
                      >
                        Stop Camera
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Entry Option */}
              <div className="border-t pt-6">
                <div className="text-center mb-4">
                  <p className="text-gray-600 mb-4">Camera not working?</p>
                  
                  {!showManualEntry ? (
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="btn-secondary"
                    >
                      Enter VIN Manually
                    </button>
                  ) : (
                    <div className="max-w-md mx-auto space-y-4">
                      <div>
                        <input
                          type="text"
                          value={manualVin}
                          onChange={(e) => setManualVin(e.target.value.toUpperCase())}
                          placeholder="Enter 17-character VIN"
                          maxLength={17}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {manualVin.length}/17 characters
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleManualEntry}
                          disabled={manualVin.length !== 17 || isProcessing}
                          className="flex-1 btn-primary disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Process VIN'}
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowManualEntry(false);
                            setManualVin('');
                          }}
                          className="flex-1 btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={onBack}
              className="btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Zone Menu
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

export default CarScanView;