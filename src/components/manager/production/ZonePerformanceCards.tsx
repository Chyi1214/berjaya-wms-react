import { memo } from 'react';
import { ProductionStats } from '../../../types';
import { formatTime } from './utils';

interface ZonePerformanceCardsProps {
  stats: ProductionStats;
}

export const ZonePerformanceCards = memo(function ZonePerformanceCards({ 
  stats 
}: ZonePerformanceCardsProps) {
  return (
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
  );
});