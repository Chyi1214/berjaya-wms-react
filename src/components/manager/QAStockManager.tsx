// QA Stock Manager - Manager view with car deletion capability
import { useState, useEffect } from 'react';
import { qaLocationService } from '../../services/qaLocationService';
import { carTrackingService } from '../../services/carTrackingService';
import { inspectionService } from '../../services/inspectionService';
import type { Car } from '../../types/production';
import type { CarInspection, InspectionItemResult, AdditionalDefect } from '../../types/inspection';
import { createModuleLogger } from '../../services/logger';
import { InspectionResultsModal } from '../qa/stock/InspectionResultsModal';
import { AssignLocationModal } from '../qa/inspection/AssignLocationModal';
import { useAuth } from '../../contexts/AuthContext';

const logger = createModuleLogger('QAStockManager');

// Defect stats for a car
interface DefectStats {
  totalDefects: number;
  resolvedDefects: number;
  unresolvedDefects: number;
}

export default function QAStockManager() {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchVIN, setSearchVIN] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedVINForResults, setSelectedVINForResults] = useState<string | null>(null);
  const [showAssignLocationModal, setShowAssignLocationModal] = useState(false);
  const [deletingVIN, setDeletingVIN] = useState<string | null>(null);
  const [defectStatsMap, setDefectStatsMap] = useState<Map<string, DefectStats>>(new Map());
  const [defectFilter, setDefectFilter] = useState<'all' | 'has_defects' | 'all_fixed'>('all');

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

  // Handle car deletion
  const handleDeleteCar = async (vin: string) => {
    if (!user) {
      alert('You must be logged in to delete cars');
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete car ${vin}?\n\n` +
      `This action cannot be undone and will:\n` +
      `• Remove the car from the system completely\n` +
      `• Delete all production history\n` +
      `• Remove QA location assignment\n\n` +
      `Type the VIN to confirm deletion.`
    );

    if (!confirmed) return;

    // Additional confirmation - ask user to type VIN
    const vinConfirmation = window.prompt(
      `Please type the VIN "${vin}" to confirm deletion:`
    );

    if (vinConfirmation !== vin) {
      alert('VIN does not match. Deletion cancelled.');
      return;
    }

    setDeletingVIN(vin);
    try {
      await carTrackingService.deleteCar(vin, user.email || 'unknown');
      logger.info('Car deleted successfully', { vin, deletedBy: user.email });
      alert(`Car ${vin} has been deleted successfully.`);

      // Reload the data
      await loadData();
    } catch (error) {
      logger.error('Failed to delete car:', error);
      alert(`Failed to delete car: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingVIN(null);
    }
  };

  // Filter cars based on search, location, and defect status
  const filteredCars = cars.filter(car => {
    const matchesSearch = searchVIN === '' ||
      car.vin.toLowerCase().includes(searchVIN.toLowerCase());

    const matchesLocation = selectedLocation === 'all' ||
      car.qaLocation === selectedLocation;

    // Defect filter
    const stats = defectStatsMap.get(car.vin);
    let matchesDefectFilter = true;
    if (defectFilter === 'has_defects' && stats) {
      matchesDefectFilter = stats.unresolvedDefects > 0;
    } else if (defectFilter === 'all_fixed' && stats) {
      matchesDefectFilter = stats.totalDefects > 0 && stats.unresolvedDefects === 0;
    }

    return matchesSearch && matchesLocation && matchesDefectFilter;
  });

  // Get unique location names from cars
  const uniqueLocations = Array.from(new Set(cars.map(car => car.qaLocation).filter(Boolean))) as string[];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QA Stock Management</h1>
            <p className="text-gray-600">
              View and manage all cars in QA area (Manager access)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search by VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by VIN
            </label>
            <input
              type="text"
              value={searchVIN}
              onChange={(e) => setSearchVIN(e.target.value)}
              placeholder="Enter VIN..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter by Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
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

          {/* Filter by Defect Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Defect Status
            </label>
            <select
              value={defectFilter}
              onChange={(e) => setDefectFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Cars</option>
              <option value="has_defects">Has Unfixed Defects</option>
              <option value="all_fixed">All Defects Fixed</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            {(searchVIN || selectedLocation !== 'all' || defectFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchVIN('');
                  setSelectedLocation('all');
                  setDefectFilter('all');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
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
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Car Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QA Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
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
                        <div className="text-xs text-gray-500">{car.color} • {car.series}</div>
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
                        <div className="text-xs text-gray-500">
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
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setSelectedVINForResults(car.vin)}
                            className="text-blue-600 hover:text-blue-900 font-medium text-sm hover:underline"
                          >
                            View Results
                          </button>
                          <button
                            onClick={() => handleDeleteCar(car.vin)}
                            disabled={deletingVIN === car.vin}
                            className={`text-red-600 hover:text-red-900 font-medium text-sm hover:underline ${
                              deletingVIN === car.vin ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {deletingVIN === car.vin ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {filteredCars.map((car) => {
              const stats = defectStatsMap.get(car.vin);
              const isAllFixed = stats && stats.totalDefects > 0 && stats.unresolvedDefects === 0;

              return (
                <div
                  key={car.vin}
                  className={`p-4 ${isAllFixed ? 'bg-green-50' : 'bg-white'}`}
                >
                  <div className="space-y-3">
                    {/* VIN and Status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-mono font-bold text-gray-900">
                          {car.vin}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {car.type} • {car.color} • {car.series}
                        </div>
                      </div>
                      {stats && (
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
                      )}
                    </div>

                    {/* Location and Time */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
                        📍 {car.qaLocation}
                      </span>
                      <span className="text-sm text-gray-600">
                        {getTimeInLocation(car.qaLocationAssignedAt)}
                      </span>
                    </div>

                    {/* Assigned by */}
                    <div className="text-xs text-gray-500">
                      By: {car.qaLocationAssignedByName || car.qaLocationAssignedBy?.split('@')[0] || '-'}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setSelectedVINForResults(car.vin)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => handleDeleteCar(car.vin)}
                        disabled={deletingVIN === car.vin}
                        className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium ${
                          deletingVIN === car.vin ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {deletingVIN === car.vin ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning Box */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
          <span>⚠️</span>
          Manager Actions
        </h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• You can delete cars from the system using the "Delete" button</li>
          <li>• Deletion is permanent and cannot be undone</li>
          <li>• You will be asked to confirm twice before deletion</li>
          <li>• All production history and QA data will be removed</li>
          <li>• Use this feature carefully - it's intended for test data or mistakes</li>
        </ul>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About QA Stock Management</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• This view shows all cars currently assigned to QA locations</li>
          <li>• Use "Assign Location" button to assign cars to QA bays/zones</li>
          <li>• Search by VIN or filter by location to find specific cars</li>
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
          onSuccess={async (vin, locationName) => {
            logger.info('Location assigned successfully', { vin, locationName });
            // Close assign modal
            setShowAssignLocationModal(false);
            // Wait a moment for modal to close
            await new Promise(resolve => setTimeout(resolve, 300));
            // Open inspection results modal
            setSelectedVINForResults(vin);
            // Reload the data in background
            loadData();
          }}
        />
      )}
    </div>
  );
}
