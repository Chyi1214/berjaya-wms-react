// Production Section - Modular production tracking with decomposed components
import { useState, useEffect } from 'react';
// Production dashboard uses hardcoded English text for technical terms
import { Car, WorkStation, WorkerActivity } from '../../types';
import { ManagerTab } from '../../types/manager';
import { carTrackingService } from '../../services/carTrackingService';
import { workStationService } from '../../services/workStationService';
import { workerActivityService } from '../../services/workerActivityService';
import {
  ProductionTabs,
  ProductionMetricsCards,
  ZoneStatusGrid,
  RecentCarsTable,
  WorkerPerformanceTable,
  ZonePerformanceCards,
  CarDetailModal,
  getProductionStats
} from './production';
import { CarTrackingSection } from './production/CarTrackingSection';

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

  // Handle reset averages - v5.8 Manager Reset Function
  const handleResetAverages = async () => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset all average processing times?\n\n' +
      'This will:\n' +
      '• Clear all current average times shown on info board\n' +
      '• Reset cars processed today counters\n' +
      '• Keep historical data for audit purposes\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmReset) return;

    try {
      setLoading(true);
      await workStationService.resetAverageProcessingTimes();
      
      // Refresh the data to show updated averages
      await loadProductionData();
      
      alert('✅ Average processing times have been reset successfully!\n\nInfo board will now show fresh averages.');
      console.log('✅ Manager reset average processing times');
    } catch (error) {
      console.error('Failed to reset averages:', error);
      alert('Failed to reset average processing times. Please try again.');
    }
  };

  const stats = getProductionStats(cars, workStations, workerActivities);

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
      <ProductionTabs activeTab={activeTab} onTabChange={onTabChange} />

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
        <div className="flex gap-3">
          <button
            onClick={handleResetAverages}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Avg Data
          </button>
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
      </div>

      {/* Production Line Tab */}
      {activeTab === 'production_line' && (
        <div className="space-y-6">
          <ProductionMetricsCards stats={stats} />
          <ZoneStatusGrid workStations={workStations} />
          <RecentCarsTable cars={cars} onViewDetails={setSelectedCar} />
        </div>
      )}

      {/* Production Statistics Tab */}
      {activeTab === 'production_stats' && (
        <div className="space-y-6">
          <WorkerPerformanceTable stats={stats} />
          <ZonePerformanceCards stats={stats} />
        </div>
      )}

      {/* Car Tracking Tab */}
      {activeTab === 'car_tracking' && (
        <CarTrackingSection />
      )}

      <CarDetailModal car={selectedCar} onClose={() => setSelectedCar(null)} />
    </div>
  );
}

export default ProductionSection;