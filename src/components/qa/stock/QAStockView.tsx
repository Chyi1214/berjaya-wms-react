// QA Stock View - Display all cars currently in QA with locations and timing
import { useState, useEffect } from 'react';
import { qaLocationService } from '../../../services/qaLocationService';
import { inspectionService } from '../../../services/inspectionService';
import type { Car } from '../../../types/production';
import type { CarInspection, InspectionItemResult, AdditionalDefect } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { InspectionResultsModal } from './InspectionResultsModal';
import { AssignLocationModal } from '../inspection/AssignLocationModal';
import { useAuth } from '../../../contexts/AuthContext';

const logger = createModuleLogger('QAStockView');

// Defect stats for a car
interface DefectStats {
  totalDefects: number;
  resolvedDefects: number;
  unresolvedDefects: number;
}

export default function QAStockView() {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchVIN, setSearchVIN] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedVINForResults, setSelectedVINForResults] = useState<string | null>(null);
  const [showAssignLocationModal, setShowAssignLocationModal] = useState(false);
  const [sortByTime, setSortByTime] = useState<'asc' | 'desc' | null>('asc'); // Default: newest first
  const [defectStatsMap, setDefectStatsMap] = useState<Map<string, DefectStats>>(new Map());

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const unsubscribe = qaLocationService.subscribeToCarsInQA((updatedCars) => {
      setCars(updatedCars);
    });

    return () => unsubscribe();
  }, []);

  // Calculate defect stats from inspections
  const calculateDefectStats = (inspections: CarInspection[]): DefectStats => {
    let totalDefects = 0;
    let resolvedDefects = 0;

    inspections.forEach(inspection => {
      Object.values(inspection.sections).forEach(section => {
        Object.values(section.results).forEach((result: InspectionItemResult) => {
          // Count main defect if not Ok
          if (result.defectType !== 'Ok') {
            totalDefects++;
            if (result.status === 'Resolved') {
              resolvedDefects++;
            }
          }

          // Count additional defects
          if (result.additionalDefects) {
            result.additionalDefects.forEach((additional: AdditionalDefect) => {
              totalDefects++;
              if (additional.status === 'Resolved') {
                resolvedDefects++;
              }
            });
          }
        });
      });
    });

    return {
      totalDefects,
      resolvedDefects,
      unresolvedDefects: totalDefects - resolvedDefects
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const carsData = await qaLocationService.getAllCarsInQA();
      setCars(carsData);

      // Load defect stats for each car
      const statsMap = new Map<string, DefectStats>();
      await Promise.all(
        carsData.map(async (car) => {
          try {
            const inspections = await inspectionService.getInspectionsByVIN(car.vin);
            const stats = calculateDefectStats(inspections);
            statsMap.set(car.vin, stats);
          } catch (error) {
            logger.error('Failed to load defect stats for car:', { vin: car.vin, error });
            statsMap.set(car.vin, { totalDefects: 0, resolvedDefects: 0, unresolvedDefects: 0 });
          }
        })
      );
      setDefectStatsMap(statsMap);

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

  // Toggle time sort
  const toggleTimeSort = () => {
    if (sortByTime === null) {
      setSortByTime('asc'); // First click: newest first (ascending time)
    } else if (sortByTime === 'asc') {
      setSortByTime('desc'); // Second click: oldest first (descending time)
    } else {
      setSortByTime(null); // Third click: no sort
    }
  };

  // Filter cars based on search and location
  let filteredCars = cars.filter(car => {
    const matchesSearch = searchVIN === '' ||
      car.vin.toLowerCase().includes(searchVIN.toLowerCase());

    const matchesLocation = selectedLocation === 'all' ||
      car.qaLocation === selectedLocation;

    return matchesSearch && matchesLocation;
  });

  // Sort by time if enabled
  if (sortByTime !== null) {
    filteredCars = [...filteredCars].sort((a, b) => {
      const timeA = a.qaLocationAssignedAt?.getTime() || 0;
      const timeB = b.qaLocationAssignedAt?.getTime() || 0;

      if (sortByTime === 'asc') {
        return timeB - timeA; // Newest first
      } else {
        return timeA - timeB; // Oldest first
      }
    });
  }

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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={toggleTimeSort}
                    title="Click to sort by time"
                  >
                    <div className="flex items-center gap-2">
                      Time in Location
                      {sortByTime === 'asc' && <span className="text-blue-600">↑</span>}
                      {sortByTime === 'desc' && <span className="text-blue-600">↓</span>}
                      {sortByTime === null && <span className="text-gray-300">⇅</span>}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Defects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCars.map((car) => {
                  const stats = defectStatsMap.get(car.vin);
                  const isAllFixed = stats && stats.totalDefects > 0 && stats.unresolvedDefects === 0;

                  return (
                    <tr
                      key={car.vin}
                      className={`transition-colors ${
                        isAllFixed
                          ? 'bg-green-50 hover:bg-green-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stats ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${
                              stats.totalDefects === 0
                                ? 'bg-gray-100 text-gray-600'
                                : stats.unresolvedDefects === 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {stats.unresolvedDefects === 0 && stats.totalDefects > 0 && '✓ '}
                              {stats.resolvedDefects}/{stats.totalDefects}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
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
                  );
                })}
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
          onClose={() => {
            console.log('[QAStockView] onClose called - closing assign location modal');
            setShowAssignLocationModal(false);
          }}
          onSuccess={(vin, locationName) => {
            console.log('[QAStockView] onSuccess called', { vin, locationName });
            logger.info('Location assigned successfully', { vin, locationName });
            // Open inspection results quickly
            console.log('[QAStockView] Opening inspection modal immediately');
            setShowAssignLocationModal(false);
            // Small delay to let modal close smoothly
            setTimeout(() => {
              console.log('[QAStockView] Opening inspection modal for VIN:', vin);
              setSelectedVINForResults(vin);
              loadData();
            }, 500);
          }}
        />
      )}
    </div>
  );
}
