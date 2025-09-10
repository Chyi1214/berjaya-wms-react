import { useState, useEffect, memo } from 'react';
import { WorkStation } from '../../types';
import { workStationService } from '../../services/workStationService';
import { reportService, WorkerReport } from '../../services/reportService';
import ZoneTimeChart from './ZoneTimeChart';

interface ProductionInfoBoardProps {
  className?: string;
}

interface ZoneInfo extends WorkStation {
  avgTimeToday: number;
  currentDuration: number;
  status: 'available' | 'occupied' | 'problem';
}

export const ProductionInfoBoard = memo(function ProductionInfoBoard({ 
  className = '' 
}: ProductionInfoBoardProps) {
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [activeReports, setActiveReports] = useState<WorkerReport[]>([]);

  const loadZoneData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const workStations = await workStationService.getAllWorkStations();
      
      // Debug: Log what we get from workStations
      console.log('WorkStations data:', workStations.slice(0, 3));
      
      const zoneInfos: ZoneInfo[] = await Promise.all(
        Array.from({ length: 23 }, (_, i) => i + 1).map(async (zoneId) => {
          const station = workStations.find((s: WorkStation) => s.zoneId === zoneId);
          
          // Debug: Log station data for first few zones
          if (zoneId <= 3) {
            console.log(`Zone ${zoneId} station:`, station);
          }
          
          // Use only real data for average processing time; do not synthesize values
          const avgTime = station?.averageProcessingTime || 0;
          
          // Calculate current duration if car is present
          let currentDuration = 0;
          if (station?.currentCar?.enteredAt) {
            const now = new Date();
            const enteredAt = new Date(station.currentCar.enteredAt);
            currentDuration = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60)); // minutes
          }
          
          // Determine status
          let status: 'available' | 'occupied' | 'problem' = 'available';
          if (station?.currentCar) {
            // Consider it a problem if car has been there more than 2x average time
            status = avgTime > 0 && currentDuration > (avgTime * 2) ? 'problem' : 'occupied';
          }
          
          return {
            zoneId,
            currentCar: station?.currentCar,
            currentWorker: station?.currentWorker,
            carsProcessedToday: station?.carsProcessedToday || 0,
            averageProcessingTime: station?.averageProcessingTime || 0,
            lastUpdated: station?.lastUpdated || new Date(),
            avgTimeToday: avgTime,
            currentDuration,
            status
          };
        })
      );
      
      setZones(zoneInfos);
      
      // Load active reports - v5.7
      const reports = await reportService.getActiveReports();
      setActiveReports(reports);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load zone data:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };


  useEffect(() => {
    loadZoneData();
    
    // Auto-refresh every 5 seconds - real-time production monitoring
    const interval = setInterval(() => {
      // Update data without showing loading state
      loadZoneData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatAlertDuration = (alertStartTime: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - alertStartTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return `${diffSeconds}s ago`;
    }
  };

  const getStatusColor = (status: 'available' | 'occupied' | 'problem', hasActiveReport = false) => {
    // If zone has active report, use warning colors with sharp blinking animation
    if (hasActiveReport) {
      return 'bg-orange-100 border-orange-400 text-orange-900 shadow-lg border-4';
    }
    
    switch (status) {
      case 'available': return 'bg-green-50 border-green-200 text-green-800';
      case 'occupied': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'problem': return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getStatusIcon = (status: 'available' | 'occupied' | 'problem') => {
    switch (status) {
      case 'available': return '✅';
      case 'occupied': return '🔧';
      case 'problem': return '⚠️';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            🏭 Production Line Status
          </h2>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading production line status...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sharp blinking animation CSS */}
      <style>{`
        @keyframes sharp-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
      
      <div className={`bg-white rounded-xl shadow-lg border ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
            🏭 Production Line Status
          </h2>
          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {zones.filter(z => z.status === 'available').length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {zones.filter(z => z.status === 'occupied').length}
            </div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {zones.filter(z => z.status === 'problem').length}
            </div>
            <div className="text-sm text-gray-600">Attention</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {zones.reduce((sum, z) => sum + z.carsProcessedToday, 0)}
            </div>
            <div className="text-sm text-gray-600">Cars Today</div>
          </div>
        </div>
      </div>

      {/* Zone Grid */}
      <div className="p-3 md:p-4">
        <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-1 md:gap-2">
          {zones.map((zone) => {
            // Check if this zone has active reports and get the earliest report time
            const zoneReports = activeReports.filter(report => report.zoneId === zone.zoneId);
            const hasActiveReport = zoneReports.length > 0;
            const earliestReport = zoneReports.length > 0 
              ? zoneReports.reduce((earliest, current) => 
                  current.timestamp < earliest.timestamp ? current : earliest
                )
              : null;
            
            return (
            <div
              key={zone.zoneId}
              className={`p-1 md:p-2 rounded border-2 transition-all duration-200 text-xs ${getStatusColor(zone.status, hasActiveReport)} ${hasActiveReport ? 'animate-pulse' : ''}`}
              style={hasActiveReport ? {
                animation: 'sharp-blink 1s infinite',
                animationTimingFunction: 'steps(2, start)'
              } : undefined}
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs md:text-sm font-bold">Z{zone.zoneId}</div>
                <div className="text-xs md:text-sm">
                  {hasActiveReport ? '🚨' : getStatusIcon(zone.status)}
                </div>
              </div>

              {/* Car Information */}
              {zone.currentCar ? (
                <div className="space-y-1 mb-2">
                  <div className="text-xs font-mono bg-white bg-opacity-50 px-1 py-0.5 rounded">
                    🚗 {zone.currentCar.vin.slice(-6)}
                  </div>
                  <div className="text-xs font-semibold">
                    ⏱️ {formatDuration(zone.currentDuration)}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 mb-2 h-8 md:h-10 flex items-center justify-center">
                  Available
                </div>
              )}

              {/* Statistics */}
              <div className="border-t border-white border-opacity-30 pt-1 space-y-0.5">
                <div className="text-xs flex justify-between">
                  <span>Avg:</span>
                  <span className="font-semibold">
                    {zone.avgTimeToday > 0 ? formatDuration(zone.avgTimeToday) : 'N/A'}
                  </span>
                </div>
                <div className="text-xs flex justify-between">
                  <span>Done:</span>
                  <span className="font-semibold">{zone.carsProcessedToday}</span>
                </div>
              </div>

              {/* Problem Alert */}
              {zone.status === 'problem' && (
                <div className="mt-1 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded text-center">
                  Over time!
                </div>
              )}

              {/* Active Report Alert Timer */}
              {hasActiveReport && earliestReport && (
                <div className="mt-1 text-xs bg-orange-200 text-orange-900 px-1 py-0.5 rounded text-center font-bold">
                  🚨 {formatAlertDuration(earliestReport.timestamp)}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>

      {/* Zone Time Chart */}
      <div className="p-4">
        <ZoneTimeChart 
          data={zones.map(zone => ({
            zoneId: zone.zoneId,
            avgTime: zone.avgTimeToday,
            currentTime: zone.currentDuration
          }))}
        />
      </div>

      {/* Worker Reports Signal - v5.7 */}
      {activeReports.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-orange-50">
          <div className="flex items-center justify-center space-x-4">
            {/* Blinking warning signal */}
            <div className="animate-pulse">
              <div className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-lg">
                <span className="text-xl animate-bounce">⚠️</span>
                <span className="font-bold text-sm">
                  {activeReports.length} ACTIVE REPORT{activeReports.length > 1 ? 'S' : ''}
                </span>
              </div>
            </div>
            
            {/* Report details */}
            <div className="flex flex-wrap gap-2 max-w-md">
              {activeReports.slice(0, 3).map((report) => (
                <div 
                  key={report.id}
                  className="bg-white rounded px-3 py-1 shadow-sm border border-orange-200 flex items-center space-x-2"
                >
                  <span className="text-xs font-medium text-orange-800">
                    Zone {report.zoneId}
                  </span>
                  <span className="text-xs text-orange-600">
                    {report.reportedByName}
                  </span>
                  <span className="text-xs text-orange-500 ml-1">⚠️</span>
                </div>
              ))}
              {activeReports.length > 3 && (
                <span className="text-xs text-orange-600 self-center">
                  +{activeReports.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
        🔄 Auto-refreshes every 5 seconds • Real-time Production Monitoring
      </div>
    </div>
    </>
  );
});

export default ProductionInfoBoard;
