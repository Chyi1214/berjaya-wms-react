// Car Scan View - Version 4.0 VIN Scanning for Production Lines
import { useState, useRef, useEffect } from 'react';
import { User, Car, CarScanFormData, CarStatus } from '../../types';
// VIN scanning uses hardcoded English text for production speed
import { scannerService } from '../../services/scannerService';
import { carTrackingService } from '../../services/carTrackingService';
import { workStationService } from '../../services/workStationService';

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
  
  // Car creation state
  const [showCarForm, setShowCarForm] = useState(false);
  const [scannedVin, setScannedVin] = useState('');
  const [carFormData, setCarFormData] = useState<CarScanFormData>({
    vin: '',
    type: '',
    color: '',
    series: '',
    status: CarStatus.IN_PRODUCTION,
    currentZone: null
  });

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false);

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

  const processVinScan = async (vin: string) => {
    try {
      // Check if car already exists
      const existingCar = await carTrackingService.getCarByVIN(vin);
      
      if (existingCar) {
        // Car exists, scan into zone
        if (existingCar.currentZone !== null) {
          throw new Error(`Car ${vin} is already in zone ${existingCar.currentZone}`);
        }
        
        await carTrackingService.scanCarIntoZone(vin, zoneId, user.email);
        await workStationService.updateStationWithCar(zoneId, vin);
        
        // Get updated car data
        const updatedCar = await carTrackingService.getCarByVIN(vin);
        if (updatedCar) {
          setSuccess(`Car ${vin} successfully scanned into Zone ${zoneId}`);
          onCarScanned(updatedCar);
          
          // Play success sound
          scannerService.triggerFeedback();
        }
      } else {
        // New car, need to create it first
        setScannedVin(vin);
        setCarFormData({ ...carFormData, vin });
        setShowCarForm(true);
      }
      
      setIsProcessing(false);
    } catch (error) {
      throw error;
    }
  };

  const handleCreateCar = async () => {
    if (!carFormData.type || !carFormData.color || !carFormData.series) {
      setError('Please fill in all car details');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create new car
      await carTrackingService.createCar(carFormData);
      
      // Scan into zone
      await carTrackingService.scanCarIntoZone(carFormData.vin, zoneId, user.email);
      await workStationService.updateStationWithCar(zoneId, carFormData.vin);
      
      // Get car data
      const newCar = await carTrackingService.getCarByVIN(carFormData.vin);
      if (newCar) {
        setSuccess(`New car ${carFormData.vin} created and scanned into Zone ${zoneId}`);
        onCarScanned(newCar);
        
        // Play success sound
        scannerService.triggerFeedback();
      }

      // Reset form
      setShowCarForm(false);
      setScannedVin('');
      setCarFormData({ 
        vin: '', 
        type: '', 
        color: '', 
        series: '',
        status: CarStatus.IN_PRODUCTION,
        currentZone: null
      });
      setIsProcessing(false);
    } catch (error) {
      setError(`Failed to create car: ${error}`);
      setIsProcessing(false);
    }
  };

  const resetScanState = () => {
    setError(null);
    setSuccess(null);
    setScannedVin('');
    setShowCarForm(false);
    setShowManualEntry(false);
    setManualVin('');
    setCarFormData({ 
      vin: '', 
      type: '', 
      color: '', 
      series: '',
      status: CarStatus.IN_PRODUCTION,
      currentZone: null
    });
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
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚗</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Scan Car - Zone {zoneId}
              </h1>
            </div>
            
            <div className="bg-blue-100 border border-blue-200 rounded-lg px-3 py-1">
              <span className="text-blue-800 text-sm font-medium">
                Zone {zoneId}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Instructions */}
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Scan Car VIN
            </h2>
            <p className="text-gray-600">
              Scan the car's VIN barcode or QR code to register it in Zone {zoneId}
            </p>
          </div>

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

          {/* Car Creation Form */}
          {showCarForm && (
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                New Car Details - VIN: {scannedVin}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Car Type *
                    </label>
                    <select
                      value={carFormData.type}
                      onChange={(e) => setCarFormData({ ...carFormData, type: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                      <option value="Series3">Series3</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color *
                    </label>
                    <select
                      value={carFormData.color}
                      onChange={(e) => setCarFormData({ ...carFormData, color: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Color</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Silver">Silver</option>
                      <option value="Black">Black</option>
                      <option value="White">White</option>
                      <option value="Gray">Gray</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Series *
                    </label>
                    <select
                      value={carFormData.series}
                      onChange={(e) => setCarFormData({ ...carFormData, series: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Series</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Series3">Series3</option>
                      <option value="Limited">Limited</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateCar}
                    disabled={isProcessing}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {isProcessing ? 'Creating...' : 'Create Car & Scan Into Zone'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowCarForm(false);
                      setScannedVin('');
                      resetScanState();
                    }}
                    disabled={isProcessing}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scanner Interface */}
          {!showCarForm && !success && (
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
          {!showCarForm && (
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
          )}

        </div>
      </main>
    </div>
  );
}

export default CarScanView;