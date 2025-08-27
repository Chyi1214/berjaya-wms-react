// Car Complete View - Version 4.0 Complete Work on Car
import { useState, useEffect } from 'react';
import { User, Car } from '../../types';
// Car completion uses hardcoded English text for production efficiency
import { carTrackingService } from '../../services/carTrackingService';
import { workStationService } from '../../services/workStationService';
import { workerActivityService } from '../../services/workerActivityService';
import { batchManagementService } from '../../services/batchManagement';

interface CarCompleteViewProps {
  user: User;
  zoneId: number;
  onBack: () => void;
  onCarCompleted: (car: Car) => void;
}

export function CarCompleteView({ user, zoneId, onBack, onCarCompleted }: CarCompleteViewProps) {
  
  // State
  const [currentCar, setCurrentCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCurrentCar();
  }, [zoneId]);

  const loadCurrentCar = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get cars currently in this zone
      const carsInZone = await carTrackingService.getCarsInZone(zoneId);
      
      if (carsInZone.length === 0) {
        setCurrentCar(null);
      } else if (carsInZone.length === 1) {
        setCurrentCar(carsInZone[0]);
      } else {
        // Multiple cars in zone - shouldn't happen, but handle gracefully
        setCurrentCar(carsInZone[0]);
        console.warn('Multiple cars found in zone:', zoneId, carsInZone);
      }
    } catch (error) {
      console.error('Failed to load current car:', error);
      setError(`Failed to load current car: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!currentCar) {
      setError('No car currently in this zone');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Complete car work
      await carTrackingService.completeCarWork(
        currentCar.vin, 
        user.email, 
        notes.trim() || undefined
      );

      // Update work station
      await workStationService.clearCarFromStation(zoneId);

      // Mark worker activity as completed if worker is checked in
      const activeWorker = await workerActivityService.getActiveWorkerActivity(user.email);
      if (activeWorker) {
        await workerActivityService.markCarWorkCompleted(user.email, currentCar.vin);
      }

      // Process BOM consumption for this car/zone combination (Section 5.3)
      try {
        if (currentCar.carType) {
          await batchManagementService.consumeBOMForCarCompletion(
            currentCar.vin,
            zoneId.toString(),
            currentCar.carType,
            user.email
          );
          console.log('✅ BOM consumption processed for car completion');
        }
      } catch (bomError) {
        console.warn('BOM consumption failed (non-critical):', bomError);
        // Don't fail the entire car completion if BOM consumption fails
      }

      // Get updated car data
      const updatedCar = await carTrackingService.getCarByVIN(currentCar.vin);
      if (updatedCar) {
        setSuccess(`Work completed on car ${currentCar.vin} in Zone ${zoneId}`);
        onCarCompleted(updatedCar);
        setCurrentCar(null);
        setNotes('');
      }
    } catch (error) {
      console.error('Failed to complete car work:', error);
      setError(`Failed to complete work: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTimeInZone = () => {
    if (!currentCar?.zoneHistory) return '0 minutes';
    
    const currentZoneEntry = currentCar.zoneHistory.find(
      entry => entry.zoneId === zoneId && !entry.exitedAt
    );
    
    if (!currentZoneEntry) return '0 minutes';
    
    const timeElapsed = Math.floor(
      (new Date().getTime() - currentZoneEntry.enteredAt.getTime()) / (1000 * 60)
    );
    
    const hours = Math.floor(timeElapsed / 60);
    const minutes = timeElapsed % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  const getCurrentZoneEntry = () => {
    if (!currentCar?.zoneHistory) return null;
    
    return currentCar.zoneHistory.find(
      entry => entry.zoneId === zoneId && !entry.exitedAt
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading current car...</p>
        </div>
      </div>
    );
  }

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
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">✅</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Complete Work - Zone {zoneId}
              </h1>
            </div>
            
            <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-1">
              <span className="text-green-800 text-sm font-medium">
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
            <div className="text-4xl mb-4">🔧</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Complete Car Work
            </h2>
            <p className="text-gray-600">
              Mark your work as complete on the current car in Zone {zoneId}
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
                    setSuccess(null);
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

          {/* No Car Message */}
          {!currentCar && !success && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🚫</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Car in Zone {zoneId}
                </h3>
                <p className="text-gray-600 mb-4">
                  There is no car currently being worked on in this zone. 
                  You need to scan a car into the zone first.
                </p>
                <button
                  onClick={onBack}
                  className="btn-primary"
                >
                  Back to Zone Menu
                </button>
              </div>
            </div>
          )}

          {/* Current Car Info & Complete Form */}
          {currentCar && !success && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current Car in Zone {zoneId}
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Car Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Car Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">VIN:</span>
                        <span className="font-mono font-medium">{currentCar.vin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{currentCar.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Color:</span>
                        <span className="font-medium">{currentCar.color}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Series:</span>
                        <span className="font-medium">{currentCar.series}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Tracking */}
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Time Tracking</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time in Zone:</span>
                        <span className="font-medium text-blue-600">{calculateTimeInZone()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scanned by:</span>
                        <span className="font-medium">{getCurrentZoneEntry()?.enteredBy || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entered at:</span>
                        <span className="font-medium">
                          {getCurrentZoneEntry()?.enteredAt.toLocaleTimeString() || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Notes */}
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Add any notes about the work completed, issues encountered, or quality checks performed..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  These notes will be saved in the car's history for tracking and quality purposes.
                </p>
              </div>

              {/* Complete Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleCompleteWork}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completing Work...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Complete Work
                    </div>
                  )}
                </button>
                
                <button
                  onClick={onBack}
                  disabled={isProcessing}
                  className="flex-1 btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Back Button */}
          {!currentCar && !success && (
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

export default CarCompleteView;