// Zone Status Display - Version 4.0 Real-time Zone Information
import { useState, useEffect } from 'react';
import { WorkStation } from '../../types';
import { workStationService } from '../../services/workStationService';
import { useLanguage } from '../../contexts/LanguageContext';

interface ZoneStatusDisplayProps {
  zoneId: number;
  onRefresh?: () => void;
  compact?: boolean; // For smaller displays
  onScanCar?: () => void;
  onCompleteCar?: () => void;
}

export function ZoneStatusDisplay({ zoneId, onRefresh, compact = false, onScanCar, onCompleteCar }: ZoneStatusDisplayProps) {
  const { t } = useLanguage();

  // State
  const [workStation, setWorkStation] = useState<WorkStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadWorkStation();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadWorkStation();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [zoneId]);

  const loadWorkStation = async () => {
    try {
      setError(null);
      const station = await workStationService.getWorkStation(zoneId);
      if (station) {
        // Refresh the station status to get updated times
        const refreshedStation = await workStationService.refreshStationStatus(zoneId);
        setWorkStation(refreshedStation || station);
      } else {
        setWorkStation(null);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load work station:', error);
      setError(`Failed to load zone status: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    loadWorkStation();
    onRefresh?.();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading && !workStation) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">{t('production.loadingZoneStatus')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 text-sm">{error}</span>
        </div>
        <button
          onClick={handleManualRefresh}
          className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
        >
          {t('production.tryAgain')}
        </button>
      </div>
    );
  }

  if (!workStation) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Zone {zoneId} - No Data</p>
        </div>
      </div>
    );
  }

  // Compact view for smaller spaces
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900 text-sm">{t('production.zoneStatus', { zone: zoneId })}</h3>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh status"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          {/* Current Car */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{t('production.currentCar')}:</span>
            <span className={`font-medium ${workStation.currentCar ? 'text-blue-600' : 'text-gray-400'}`}>
              {workStation.currentCar ? workStation.currentCar.vin.slice(-6) : t('production.none')}
            </span>
          </div>

          {/* Worker Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{t('production.worker')}:</span>
            <span className={`font-medium ${workStation.currentWorker ? 'text-green-600' : 'text-gray-400'}`}>
              {workStation.currentWorker ? t('production.checkedIn') : t('production.available')}
            </span>
          </div>

          {/* Time Info */}
          {(workStation.currentCar || workStation.currentWorker) && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{t('production.timeInZone')}:</span>
              <span className="font-medium text-orange-600">
                {workStation.currentCar && formatTime(workStation.currentCar.timeElapsed)}
                {workStation.currentWorker && !workStation.currentCar && formatTime(workStation.currentWorker.timeWorking)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('production.zoneStatus', { zone: zoneId })}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
{t('production.updated')} {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-1 rounded"
            title="Refresh status"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Current Car Section - Clickable but subtle */}
        <div className={`rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
          workStation.currentCar 
            ? 'bg-blue-50 border border-blue-200 hover:border-blue-300' 
            : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
        }`}
        onClick={workStation.currentCar ? onCompleteCar : onScanCar}
        >
          <div className="flex items-center mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              workStation.currentCar ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
              <span className="text-white text-sm font-bold">🚗</span>
            </div>
            <h4 className="ml-2 font-medium text-gray-900">{t('production.currentCar')}</h4>
          </div>

          {workStation.currentCar ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('production.vin')}:</span>
                <span className="font-mono font-medium">{workStation.currentCar.vin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('production.type')}:</span>
                <span className="font-medium">{workStation.currentCar.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('production.color')}:</span>
                <span className="font-medium">{workStation.currentCar.color}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('production.timeInZone')}:</span>
                <span className="font-medium text-blue-600">{formatTime(workStation.currentCar.timeElapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('production.enteredAt')}:</span>
                <span className="font-medium">{workStation.currentCar.enteredAt.toLocaleTimeString()}</span>
              </div>
              <div className="mt-3 pt-2 border-t border-blue-200">
                <p className="text-blue-700 text-xs text-center font-medium">{t('production.clickToMarkWorkComplete')}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-500 text-sm">{t('production.noCarCurrentlyInZone')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('production.readyForNextCar')}</p>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-gray-600 text-xs font-medium">{t('production.clickToScanNewCar')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default ZoneStatusDisplay;