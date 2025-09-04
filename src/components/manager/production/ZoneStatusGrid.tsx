import { memo } from 'react';
import { WorkStation } from '../../../types';

interface ZoneStatusGridProps {
  workStations: WorkStation[];
}

export const ZoneStatusGrid = memo(function ZoneStatusGrid({ 
  workStations 
}: ZoneStatusGridProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Zone Status Overview</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 23 }, (_, i) => i + 1).map(zoneId => {
            const station = workStations.find(s => s.zoneId === zoneId);
            const hasWorker = station?.currentWorker !== undefined && station?.currentWorker !== null;
            const hasCar = station?.currentCar !== undefined && station?.currentCar !== null;
            
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
                  {hasCar && station?.currentCar && (
                    <div className="text-green-600">
                      🚗 {station.currentCar.vin.slice(-6)}
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
  );
});