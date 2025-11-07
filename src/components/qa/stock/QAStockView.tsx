// QA Stock View - Display all cars currently in QA with locations and timing
import { useState, useEffect } from 'react';
import { qaLocationService } from '../../../services/qaLocationService';
import type { Car } from '../../../types/production';
import { createModuleLogger } from '../../../services/logger';
import { InspectionResultsModal } from './InspectionResultsModal';
import { AssignLocationModal } from '../inspection/AssignLocationModal';
import { useAuth } from '../../../contexts/AuthContext';

const logger = createModuleLogger('QAStockView');

export default function QAStockView() {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchVIN, setSearchVIN] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedVINForResults, setSelectedVINForResults] = useState<string | null>(null);
  const [showAssignLocationModal, setShowAssignLocationModal] = useState(false);

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const unsubscribe = qaLocationService.subscribeToCarsInQA((updatedCars) => {
      setCars(updatedCars);
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const carsData = await qaLocationService.getAllCarsInQA();
      setCars(carsData);
      logger.info('QA Stock loaded', { carsCount: carsData.length });
    } catch (error) {
      logger.error('Failed to load QA stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time in QA location
  const getTimeInLocation = (assignedAt?: Date): string => {
    if (!assignedAt) return '-';

    const now = new Date();
    const diffMs = now.getTime() - assignedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  // Filter cars based on search and location
  const filteredCars = cars.filter(car => {
    const matchesSearch = searchVIN === '' ||
      car.vin.toLowerCase().includes(searchVIN.toLowerCase());

    const matchesLocation = selectedLocation === 'all' ||
      car.qaLocation === selectedLocation;

    return matchesSearch && matchesLocation;
  });

  // Get unique location names from cars
  const uniqueLocations = Array.from(new Set(cars.map(car => car.qaLocation).filter(Boolean))) as string[];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QA Stock</h1>
            <p className="text-gray-600">
              View all cars currently in the QA area with their assigned locations
            </p>
          </div>
          <button
            onClick={() => setShowAssignLocationModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap flex items-center gap-2"
          >
            <span className="text-xl">📍</span>
            Assign Location
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🚗</div>
            <div>
              <div className="text-sm text-gray-600">Total Cars in QA</div>
              <div className="text-3xl font-bold text-gray-900">{cars.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📍</div>
            <div>
              <div className="text-sm text-gray-600">Active Locations</div>
              <div className="text-3xl font-bold text-gray-900">{uniqueLocations.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">✅</div>
            <div>
              <div className="text-sm text-gray-600">Filtered Results</div>
              <div className="text-3xl font-bold text-gray-900">{filteredCars.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          {/* Search by VIN */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by VIN
            </label>
            <input
              type="text"
              value={searchVIN}
              onChange={(e) => setSearchVIN(e.target.value)}
              placeholder="Enter VIN to search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter by Location */}
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchVIN || selectedLocation !== 'all') && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchVIN('');
                  setSelectedLocation('all');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cars Table */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading QA stock...</p>
        </div>
      ) : filteredCars.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-600 mb-2">
            {searchVIN || selectedLocation !== 'all'
              ? 'No cars match your filters'
              : 'No cars in QA area yet'}
          </p>
          {(searchVIN || selectedLocation !== 'all') && (
            <button
              onClick={() => {
                setSearchVIN('');
                setSelectedLocation('all');
              }}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters to see all cars
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Series
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QA Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time in Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCars.map((car) => (
                  <tr key={car.vin} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900">
                        {car.vin}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{car.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{car.color}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{car.series}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
                        📍 {car.qaLocation}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getTimeInLocation(car.qaLocationAssignedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {car.qaLocationAssignedByName || car.qaLocationAssignedBy?.split('@')[0] || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedVINForResults(car.vin)}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm hover:underline"
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About QA Stock</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• This view shows all cars currently assigned to QA locations</li>
          <li>• Use the "Assign Location" button above to assign cars to QA bays/zones</li>
          <li>• Use the search bar to find specific VINs</li>
          <li>• Filter by location to see cars in a specific QA bay/zone</li>
          <li>• Time in location updates in real-time</li>
          <li>• Click "View Results" to see all gate inspection results for a car</li>
        </ul>
      </div>

      {/* Inspection Results Modal */}
      {selectedVINForResults && (
        <InspectionResultsModal
          vin={selectedVINForResults}
          onClose={() => setSelectedVINForResults(null)}
        />
      )}

      {/* Assign Location Modal */}
      {showAssignLocationModal && user && (
        <AssignLocationModal
          userEmail={user.email || ''}
          userName={user.displayName || user.email?.split('@')[0] || 'User'}
          onClose={() => setShowAssignLocationModal(false)}
          onSuccess={(vin, locationName) => {
            logger.info('Location assigned successfully', { vin, locationName });
            // Reload the data to show the newly assigned car
            loadData();
          }}
        />
      )}
    </div>
  );
}
