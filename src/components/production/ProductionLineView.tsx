// Production Line View - V5 Single-Source System
import { useState, useEffect } from 'react';
import { WorkStation, Car } from '../../types';
import { workStationServiceV5 } from '../../services/workStationServiceV5';

interface ProductionLineViewProps {
  onZoneSelect: (zoneId: number) => void;
}

interface ZoneStatus {
  id: number;
  workStation: WorkStation | null;
  currentCar: Car | null;
  timeInZone: number | null; // minutes
  status: 'available' | 'occupied' | 'problem';
  loading: boolean;
}

export function ProductionLineView({ onZoneSelect }: ProductionLineViewProps) {
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize zones (includes CP7 and CP8)
  useEffect(() => {
    const initialZones: ZoneStatus[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      workStation: null,
      currentCar: null,
      timeInZone: null,
      status: 'available',
      loading: true
    }));
    setZones(initialZones);
    loadAllZoneStatuses();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllZoneStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadAllZoneStatuses = async () => {
    try {
      console.log('🔄 V5: Loading all zone statuses from single source...');

      // V5: Load all work stations (single source of truth)
      const workStations = await loadAllWorkStations();

      // V5: Extract car data directly from workStations (no separate cars collection)
      const carsByZone = new Map<number, Car>();
      workStations.forEach(ws => {
        if (ws.currentCar) {
          // Convert workStation.currentCar to Car type
          const car: Car = {
            vin: ws.currentCar.vin,
            type: ws.currentCar.type,
            color: ws.currentCar.color,
            series: 'Production',
            status: 'in_production' as any,
            currentZone: ws.zoneId,
            zoneHistory: [{
              zoneId: ws.zoneId,
              enteredAt: ws.currentCar.enteredAt,
              enteredBy: ws.currentWorker?.email || 'unknown'
            }],
            createdAt: ws.currentCar.enteredAt
          };
          carsByZone.set(ws.zoneId, car);
        }
      });

      // Update zones with current status
      setZones(prevZones => prevZones.map(zone => {
        const workStation = workStations.find(ws => ws.zoneId === zone.id) || null;
        const currentCar = carsByZone.get(zone.id) || null;
        const timeInZone = calculateTimeInZone(currentCar);

        return {
          ...zone,
          workStation,
          currentCar,
          timeInZone,
          status: determineZoneStatus(workStation, currentCar),
          loading: false
        };
      }));

      setLastUpdate(new Date());
      console.log(`✅ V5: Updated ${23} zones at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('❌ Failed to load zone statuses:', error);
      // Mark all zones as no longer loading on error
      setZones(prevZones => prevZones.map(zone => ({ ...zone, loading: false })));
    }
  };

  const loadAllWorkStations = async (): Promise<WorkStation[]> => {
    // V5: Use workStationServiceV5 instead of old service
    const promises = Array.from({ length: 23 }, (_, i) =>
      workStationServiceV5.getWorkStation(i + 1)
    );

    const results = await Promise.allSettled(promises);
    return results
      .filter((result): result is PromiseFulfilledResult<WorkStation> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  };

  const calculateTimeInZone = (car: Car | null): number | null => {
    if (!car || !car.zoneHistory.length) return null;
    
    const currentEntry = car.zoneHistory[car.zoneHistory.length - 1];
    if (!currentEntry || currentEntry.exitedAt) return null;
    
    const now = new Date();
    const enteredAt = new Date(currentEntry.enteredAt);
    return Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60));
  };

  const determineZoneStatus = (_workStation: WorkStation | null, car: Car | null): 'available' | 'occupied' | 'problem' => {
    if (car) return 'occupied';
    // Future: Add problem detection logic here
    return 'available';
  };

  const getZoneStatusColor = (status: 'available' | 'occupied' | 'problem'): string => {
    switch (status) {
      case 'available': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'occupied': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'problem': return 'bg-red-50 border-red-200 hover:bg-red-100';
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getStatusIndicator = (status: 'available' | 'occupied' | 'problem'): string => {
    switch (status) {
      case 'available': return '🟢';
      case 'occupied': return '🔵';
      case 'problem': return '🔴';
      default: return '⚪';
    }
  };

  const formatTimeInZone = (minutes: number | null): string => {
    if (minutes === null) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">🏭 Production Line</h1>
              <p className="text-sm text-gray-600">Real-time zone status</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Last update:</p>
              <p className="text-xs font-medium text-gray-700">
                {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Production Line - Vertical Flow */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {zones.map((zone, index) => (
            <div key={zone.id} className="relative">
              {/* Zone Row */}
              <button
                onClick={() => onZoneSelect(zone.id)}
                disabled={zone.loading}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  zone.loading 
                    ? 'bg-gray-100 border-gray-200 cursor-wait' 
                    : `${getZoneStatusColor(zone.status)} cursor-pointer transform hover:scale-[1.02] active:scale-95`
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left: Zone Number & Status */}
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold text-gray-700 min-w-[60px]">
                      {zone.id === 24 ? 'CP7' : zone.id === 25 ? 'CP8' : `Zone ${zone.id}`}
                    </div>
                    <div className="text-lg">
                      {zone.loading ? '⚪' : getStatusIndicator(zone.status)}
                    </div>
                  </div>

                  {/* Right: Zone Information */}
                  <div className="flex-1 ml-4 text-right">
                    {zone.loading ? (
                      <div className="text-sm text-gray-500">Loading...</div>
                    ) : zone.currentCar ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          🚗 {zone.currentCar.vin}
                        </div>
                        <div className="text-xs text-gray-600">
                          {zone.currentCar.color} {zone.currentCar.type}
                        </div>
                        {zone.timeInZone && (
                          <div className="text-xs text-blue-600 font-medium">
                            ⏱️ {formatTimeInZone(zone.timeInZone)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Available
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Flow Arrow (except for last zone) */}
              {index < zones.length - 1 && (
                <div className="flex justify-center py-2">
                  <div className="text-gray-400 text-lg">
                    ↓
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status Legend */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
          <div className="flex space-x-6 text-xs">
            <div className="flex items-center space-x-1">
              <span>🟢</span>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔵</span>
              <span className="text-gray-600">Car in Progress</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🔴</span>
              <span className="text-gray-600">Problem/Help Needed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductionLineView;