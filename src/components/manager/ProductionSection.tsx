// Production Section - Version 4.0 Manager Dashboard Production Tracking
import { useState, useEffect } from 'react';
// Production dashboard uses hardcoded English text for technical terms
import { Car, WorkStation, WorkerActivity, ProductionStats } from '../../types';
import { ManagerTab } from '../../types/manager';
import { carTrackingService } from '../../services/carTrackingService';
import { workStationService } from '../../services/workStationService';
import { workerActivityService } from '../../services/workerActivityService';

interface ProductionSectionProps {
  activeTab: ManagerTab;
  onTabChange: (tab: ManagerTab) => void;
}

export function ProductionSection({ activeTab, onTabChange }: ProductionSectionProps) {

  // State
  const [cars, setCars] = useState<Car[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [workerActivities, setWorkerActivities] = useState<WorkerActivity[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductionData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadProductionData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProductionData = async () => {
    try {
      setError(null);
      
      const [carsData, stationsData, activitiesData] = await Promise.all([
        carTrackingService.getCars(),
        workStationService.getAllWorkStations(),
        workerActivityService.getWorkerActivities()
      ]);

      setCars(carsData);
      setWorkStations(stationsData);
      setWorkerActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load production data:', error);
      setError(`Failed to load production data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadProductionData();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getProductionStats = (): ProductionStats => {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayCars = cars.filter(car => car.createdAt >= todayStart);
    const carsCompleted = todayCars.filter(car => car.completedAt).length;
    const carsInProgress = cars.filter(car => car.currentZone !== null).length;
    
    const completedCars = cars.filter(car => car.completedAt);
    const totalProductionMinutes = completedCars.reduce((sum, car) => sum + (car.totalProductionTime || 0), 0);
    const averageProductionTime = completedCars.length > 0 ? Math.round(totalProductionMinutes / completedCars.length) : 0;

    const zoneStats = workStations.map(station => ({
      zoneId: station.zoneId,
      carsProcessed: station.carsProcessedToday,
      averageTimePerCar: station.averageProcessingTime,
      currentlyOccupied: station.currentCar !== undefined
    }));

    const todayActivities = workerActivities.filter(activity => 
      activity.checkedInAt >= todayStart
    );

    const workerMap = new Map<string, { name: string; totalMinutes: number; cars: Set<string> }>();
    todayActivities.forEach(activity => {
      if (!workerMap.has(activity.workerEmail)) {
        workerMap.set(activity.workerEmail, {
          name: activity.workerName,
          totalMinutes: 0,
          cars: new Set()
        });
      }
      const worker = workerMap.get(activity.workerEmail)!;
      worker.totalMinutes += activity.totalMinutes || 0;
      if (activity.workedOnCar) {
        worker.cars.add(activity.workedOnCar.vin);
      }
    });

    const workerStats = Array.from(workerMap.entries()).map(([email, data]) => ({
      email,
      displayName: data.name,
      hoursWorked: Math.round((data.totalMinutes / 60) * 100) / 100,
      carsWorkedOn: data.cars.size
    }));

    return {
      date: today,
      carsStarted: todayCars.length,
      carsCompleted,
      carsInProgress,
      averageProductionTime,
      totalProductionMinutes,
      zoneStats,
      workerStats,
      lastCalculated: new Date()
    };
  };

  const stats = getProductionStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading production data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange('production_line')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'production_line'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🚗 Production Line
          </button>
          <button
            onClick={() => onTabChange('production_stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'production_stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Statistics
          </button>
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {activeTab === 'production_line' ? 'Production Line Overview' : 'Production Statistics'}
          </h2>
          <p className="text-sm text-gray-600">
            Real-time production monitoring and analytics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Production Line Tab */}
      {activeTab === 'production_line' && (
        <div className="space-y-6">
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🚗</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">Cars Today</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.carsStarted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.carsCompleted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⚡</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.carsInProgress}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⏱️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-600">Avg Time</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.averageProductionTime > 0 ? formatTime(stats.averageProductionTime) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Zone Status Grid */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Zone Status Overview</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 23 }, (_, i) => i + 1).map(zoneId => {
                  const station = workStations.find(s => s.zoneId === zoneId);
                  const hasWorker = station?.currentWorker !== undefined;
                  const hasCar = station?.currentCar !== undefined;
                  
                  return (
                    <div
                      key={zoneId}
                      className={`p-3 rounded-lg border text-center ${
                        hasCar && hasWorker ? 'bg-green-50 border-green-200' :
                        hasCar ? 'bg-yellow-50 border-yellow-200' :
                        hasWorker ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="text-lg font-bold text-gray-900 mb-1">
                        {zoneId}
                      </div>
                      <div className="text-xs space-y-1">
                        {hasCar && (
                          <div className="text-green-600">
                            🚗 {station!.currentCar!.vin.slice(-6)}
                          </div>
                        )}
                        {hasWorker && (
                          <div className="text-blue-600">
                            👷 Worker
                          </div>
                        )}
                        {!hasCar && !hasWorker && (
                          <div className="text-gray-400">Available</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Cars Table */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Cars</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                      Current Zone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cars.slice(0, 10).map((car) => (
                    <tr key={car.vin} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 font-mono">
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
                        <div className="text-sm text-gray-900">
                          {car.currentZone ? `Zone ${car.currentZone}` : 'Completed'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          car.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : car.status === 'in_production'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {car.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedCar(car)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {cars.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No cars in production yet</p>
                  <p className="text-sm text-gray-400">Cars will appear here once VINs are scanned</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Production Statistics Tab */}
      {activeTab === 'production_stats' && (
        <div className="space-y-6">
          
          {/* Worker Statistics */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Worker Performance Today</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours Worked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cars Worked On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.workerStats.map((worker) => (
                    <tr key={worker.email} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {worker.displayName}
                        </div>
                        <div className="text-xs text-gray-500">{worker.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{worker.hoursWorked}h</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{worker.carsWorkedOn}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {stats.workerStats.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No worker activity today</p>
                </div>
              )}
            </div>
          </div>

          {/* Zone Performance */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Zone Performance</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.zoneStats
                  .filter(zone => zone.carsProcessed > 0 || zone.currentlyOccupied)
                  .map((zone) => (
                    <div key={zone.zoneId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">Zone {zone.zoneId}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          zone.currentlyOccupied 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {zone.currentlyOccupied ? 'Occupied' : 'Available'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cars processed:</span>
                          <span className="font-medium">{zone.carsProcessed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg time:</span>
                          <span className="font-medium">
                            {zone.averageTimePerCar > 0 ? formatTime(zone.averageTimePerCar) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {stats.zoneStats.every(zone => zone.carsProcessed === 0 && !zone.currentlyOccupied) && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No zone activity yet today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Car Detail Modal */}
      {selectedCar && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setSelectedCar(null)}>
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Car Details</h3>
                <button
                  onClick={() => setSelectedCar(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">VIN</p>
                    <p className="font-mono font-medium">{selectedCar.vin}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium">{selectedCar.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Color</p>
                    <p className="font-medium">{selectedCar.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Series</p>
                    <p className="font-medium">{selectedCar.series}</p>
                  </div>
                </div>

                {selectedCar.zoneHistory.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Zone History</h4>
                    <div className="space-y-2">
                      {selectedCar.zoneHistory.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">Zone {entry.zoneId}</span>
                          <div className="text-sm text-gray-600">
                            {entry.timeSpent ? formatTime(entry.timeSpent) : 'In progress'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductionSection;