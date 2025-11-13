// Assign Location Modal - For assigning cars to QA locations
import { useState, useEffect } from 'react';
import { qaLocationService } from '../../../services/qaLocationService';
import { carTrackingService } from '../../../services/carTrackingService';
import type { QALocation } from '../../../types/production';
import { CarStatus } from '../../../types/production';
import { createModuleLogger } from '../../../services/logger';
import { BarcodeScanner } from '../../common/BarcodeScanner';
import { useAuth } from '../../../contexts/AuthContext';
import { UserRole } from '../../../types/user';

const logger = createModuleLogger('AssignLocationModal');

interface AssignLocationModalProps {
  userEmail: string;
  userName: string;
  onClose: () => void;
  onSuccess?: (vin: string, locationName: string) => void;
}

export function AssignLocationModal({ userEmail, userName, onClose, onSuccess }: AssignLocationModalProps) {
  const { userRecord } = useAuth();
  const [locations, setLocations] = useState<QALocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<QALocation | null>(null);
  const [vinInput, setVinInput] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, [userEmail]);

  const loadLocations = async () => {
    try {
      const activeLocations = await qaLocationService.getActiveLocations();

      // Filter locations based on user assignments
      const isManager = userRecord?.role === UserRole.MANAGER || userRecord?.role === UserRole.DEV_ADMIN;
      let availableLocations = activeLocations;

      if (!isManager) {
        // Filter to only locations assigned to this user
        const assignedLocations = activeLocations.filter(location =>
          location.assignedUsers && location.assignedUsers.includes(userEmail.toLowerCase())
        );

        // If user has assigned locations, use them; otherwise show all (unassigned workers)
        if (assignedLocations.length > 0) {
          availableLocations = assignedLocations;
        }
      }

      setLocations(availableLocations);

      // Auto-select if only one location available
      if (availableLocations.length === 1) {
        setSelectedLocation(availableLocations[0]);
      }

      logger.info('Locations loaded', {
        totalLocations: activeLocations.length,
        availableLocations: availableLocations.length,
        isManager,
        userEmail
      });
    } catch (err) {
      logger.error('Failed to load locations:', err);
      setError('Failed to load QA locations');
    }
  };

  const validateVIN = (vin: string): { valid: boolean; error?: string } => {
    if (vin.length !== 17) {
      return { valid: false, error: `Invalid VIN length: ${vin.length}/17 characters` };
    }

    if (!vin.startsWith('PRU')) {
      return { valid: false, error: 'Invalid VIN: must start with "PRU"' };
    }

    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vin)) {
      return { valid: false, error: 'Invalid VIN characters' };
    }

    return { valid: true };
  };

  const handleAssignLocation = async () => {
    const vinToAssign = vinInput.trim().toUpperCase();

    // Validate VIN
    const validation = validateVIN(vinToAssign);
    if (!validation.valid) {
      setError(validation.error || 'Invalid VIN format');
      return;
    }

    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Check if car exists, create if it doesn't
      let car = await carTrackingService.getCarByVIN(vinToAssign);
      if (!car) {
        // Car doesn't exist in production system, create it for QA tracking
        await carTrackingService.createCar({
          vin: vinToAssign,
          type: 'Unknown',
          color: 'Unknown',
          series: 'QA',
          status: CarStatus.COMPLETED, // Mark as completed since it's in QA
          currentZone: null
        });
        logger.info('Auto-created car for QA location tracking:', { vin: vinToAssign });
      }

      // Assign to location
      await qaLocationService.assignCarToLocation(
        vinToAssign,
        selectedLocation.id,
        userEmail,
        userName
      );

      logger.info('Car assigned to location:', { vin: vinToAssign, location: selectedLocation.name });
      setSuccess(`✅ Car ${vinToAssign} assigned to ${selectedLocation.name}`);
      setVinInput('');

      if (onSuccess) {
        onSuccess(vinToAssign, selectedLocation.name);
      }

      // Close after 0.8 seconds for faster response
      setTimeout(() => {
        onClose();
      }, 800);

    } catch (err: any) {
      logger.error('Failed to assign location:', err);
      setError(err.message || 'Failed to assign location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScan = async (code: string) => {
    setShowScanner(false);
    const cleanVin = code.trim().toUpperCase();
    setVinInput(cleanVin);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Assign Car to QA Location</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Scan or enter VIN, then select a QA location
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Enter VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Step 1: Enter or Scan VIN
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                placeholder="Enter VIN (17 characters)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                maxLength={17}
              />
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>📷</span>
                Open Camera Scanner
              </button>
            </div>
          </div>

          {/* Step 2: Select Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Step 2: Select QA Location
            </label>
            {locations.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                ⚠️ No active QA locations configured. Please ask your manager to configure locations first.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedLocation?.id === location.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{location.name}</div>
                        {location.description && (
                          <div className="text-xs text-gray-600 mt-1">{location.description}</div>
                        )}
                      </div>
                      {selectedLocation?.id === location.id && (
                        <div className="text-blue-600 text-xl">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleAssignLocation}
            disabled={isLoading || !vinInput || !selectedLocation}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Assigning...' : 'Assign Location'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Scan VIN Barcode</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onError={(err) => {
                  setError(err);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
