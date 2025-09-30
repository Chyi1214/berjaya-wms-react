// Car Journey View Component - Track Individual Car's Journey
import { useState, useEffect } from 'react';
import { Car, CarMovement } from '../../types';
import { carTrackingService } from '../../services/carTrackingService';

interface CarJourneyViewProps {
  className?: string;
}

export function CarJourneyView({ className = '' }: CarJourneyViewProps) {
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [selectedVin, setSelectedVin] = useState<string>('');
  const [searchVin, setSearchVin] = useState<string>(''); // For manual VIN search
  const [car, setCar] = useState<Car | null>(null);
  const [movements, setMovements] = useState<(CarMovement & { movedByName: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carsLoading, setCarsLoading] = useState(true);

  // Load available cars on mount
  useEffect(() => {
    loadAvailableCars();
  }, []);

  // Load car journey when VIN is selected
  useEffect(() => {
    if (selectedVin) {
      loadCarJourney();
    } else {
      setCar(null);
      setMovements([]);
    }
  }, [selectedVin]);

  const loadAvailableCars = async () => {
    setCarsLoading(true);
    try {
      // Get cars from today and yesterday to have some options
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const cars = await carTrackingService.getCars({
        dateFrom: yesterday
      });

      console.log('🚗 Loaded available cars:', cars.length);
      setAvailableCars(cars);
    } catch (err) {
      console.error('Failed to load cars:', err);
    } finally {
      setCarsLoading(false);
    }
  };

  const loadCarJourney = async () => {
    if (!selectedVin) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading journey for VIN:', selectedVin);

      // Get car details and movements
      const [carData, movementData] = await Promise.all([
        carTrackingService.getCarByVIN(selectedVin),
        carTrackingService.getCarMovementsWithNames({ vin: selectedVin, limit: 50 })
      ]);

      if (!carData) {
        setError('Car not found');
        return;
      }

      console.log('📋 Car data:', carData);
      console.log('📋 Movement data:', movementData.length, 'movements');

      setCar(carData);
      setMovements(movementData);
    } catch (err) {
      console.error('Failed to load car journey:', err);
      setError(`Failed to load data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVinChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVin(event.target.value);
    setSearchVin(''); // Clear manual search when using dropdown
  };

  const handleSearchVin = async () => {
    const cleanVin = searchVin.trim().toUpperCase();
    if (!cleanVin) {
      setError('Please enter a VIN number to search');
      return;
    }

    setSelectedVin(cleanVin);
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVin(event.target.value);
    setSelectedVin(''); // Clear dropdown when typing manually
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchVin();
    }
  };

  const handleRefresh = () => {
    if (selectedVin) {
      loadCarJourney();
    }
    loadAvailableCars();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getMovementTypeDisplay = (type: string): string => {
    switch (type) {
      case 'scan_in': return '📱 Entered';
      case 'complete': return '✅ Completed';
      case 'transfer': return '↔️ Transferred';
      case 'hold': return '⏸️ Put on Hold';
      default: return type;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Car Journey Tracking
        </h3>

        <button
          onClick={handleRefresh}
          disabled={loading || carsLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading || carsLoading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Car Selection */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Search for Car Journey</h4>

        {/* Method 1: Search by VIN */}
        <div className="mb-4">
          <label htmlFor="vin-search" className="block text-sm font-medium text-gray-700 mb-2">
            🔍 Search by VIN Number:
          </label>
          <div className="flex gap-2 max-w-lg">
            <input
              id="vin-search"
              type="text"
              value={searchVin}
              onChange={handleSearchInputChange}
              onKeyPress={handleSearchKeyPress}
              placeholder="Enter VIN (e.g., ABC123DEF456GHJKL) and press Enter"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
            <button
              onClick={handleSearchVin}
              disabled={!searchVin.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
        </div>

        {/* Method 2: Select from Recent Cars */}
        <div>
          <label htmlFor="vin-select" className="block text-sm font-medium text-gray-700 mb-2">
            📋 Or select from recent cars:
          </label>
          <select
            id="vin-select"
            value={selectedVin}
            onChange={handleVinChange}
            disabled={carsLoading}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">
              {carsLoading ? 'Loading cars...' : 'Select a car to view journey'}
            </option>
            {availableCars.map((car) => (
              <option key={car.vin} value={car.vin}>
                {car.vin} - {car.type} {car.color} ({car.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading car journey...</div>
        </div>
      )}

      {/* Car Details */}
      {car && !loading && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Car Details</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">VIN:</span>
              <div className="font-mono">{car.vin}</div>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <div>{car.type}</div>
            </div>
            <div>
              <span className="text-gray-500">Color:</span>
              <div>{car.color}</div>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                car.status === 'completed' ? 'bg-green-100 text-green-800' :
                car.status === 'in_production' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {car.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>

          {car.currentZone && (
            <div className="mt-2">
              <span className="text-gray-500">Current Zone:</span>
              <span className="ml-2 font-medium">Zone {car.currentZone}</span>
            </div>
          )}

          {car.totalProductionTime && (
            <div className="mt-2">
              <span className="text-gray-500">Total Production Time:</span>
              <span className="ml-2 font-medium">{formatDuration(car.totalProductionTime)}</span>
            </div>
          )}
        </div>
      )}

      {/* Journey Timeline */}
      {car && movements.length > 0 && !loading && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Journey Timeline</h4>

          <div className="space-y-4">
            {movements.map((movement, index) => (
              <div key={movement.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                {/* Timeline Indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full ${
                    movement.movementType === 'scan_in' ? 'bg-blue-500' :
                    movement.movementType === 'complete' ? 'bg-green-500' :
                    movement.movementType === 'transfer' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                  {index < movements.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                  )}
                </div>

                {/* Movement Details */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-gray-900">
                      {getMovementTypeDisplay(movement.movementType)}
                    </h5>
                    <span className="text-sm text-gray-500">
                      {formatTime(movement.movedAt)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Zone:</span>
                      {movement.fromZone !== null && ` From Zone ${movement.fromZone}`}
                      {movement.toZone !== null && ` To Zone ${movement.toZone}`}
                      {movement.fromZone === null && movement.toZone !== null && ` Entered Zone ${movement.toZone}`}
                      {movement.fromZone !== null && movement.toZone === null && ` Left Zone ${movement.fromZone}`}
                    </div>

                    <div>
                      <span className="font-medium">Worker:</span> {movement.movedByName}
                    </div>

                    {movement.timeInPreviousZone && (
                      <div>
                        <span className="font-medium">Time Spent:</span> {formatDuration(movement.timeInPreviousZone)}
                      </div>
                    )}

                    {movement.notes && (
                      <div>
                        <span className="font-medium">Notes:</span> {movement.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Journey shows {movements.length} movements for {car.vin}
          </div>
        </div>
      )}

      {/* No Data State */}
      {selectedVin && car && movements.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">No movements found for this car</p>
          <p className="text-sm text-gray-400 mt-2">
            This car may not have been scanned into any zones yet.
          </p>
        </div>
      )}
    </div>
  );
}

export default CarJourneyView;