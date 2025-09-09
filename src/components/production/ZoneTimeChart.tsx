import { memo } from 'react';

interface ZoneTimeData {
  zoneId: number;
  avgTime: number;    // Average time today in minutes
  currentTime: number; // Current car time in minutes (0 if no car)
}

interface ZoneTimeChartProps {
  data: ZoneTimeData[];
  className?: string;
}

export const ZoneTimeChart = memo(function ZoneTimeChart({ 
  data, 
  className = '' 
}: ZoneTimeChartProps) {
  
  // Find the maximum time to set chart scale
  const maxTime = Math.max(
    ...data.map(d => Math.max(d.avgTime, d.currentTime)),
    10 // Minimum scale of 10 minutes
  );
  
  // Round up to next 10-minute interval for clean scale
  const chartMax = Math.ceil(maxTime / 10) * 10;
  
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes < 60) return `${roundedMinutes}m`;
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  const getBarColor = (avgTime: number, currentTime: number): string => {
    if (currentTime === 0) return '#d1d5db'; // Gray for no car
    if (avgTime > 0 && currentTime > avgTime) return '#ef4444'; // Red when current exceeds average
    return '#10b981'; // Green for normal
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Zone Processing Times</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Average Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Current (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Current (Over Average)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>No Car</span>
          </div>
        </div>
      </div>

      {/* Simple Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-48 w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>{formatTime(chartMax)}</span>
          <span>{formatTime(chartMax * 0.75)}</span>
          <span>{formatTime(chartMax * 0.5)}</span>
          <span>{formatTime(chartMax * 0.25)}</span>
          <span>0m</span>
        </div>

        {/* Chart area with grid lines */}
        <div className="ml-16 relative h-48">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {/* Horizontal grid lines */}
            <div className="absolute bottom-0 w-full h-px bg-gray-300"></div>
            <div className="absolute bottom-1/4 w-full h-px bg-gray-200"></div>
            <div className="absolute bottom-2/4 w-full h-px bg-gray-200"></div>
            <div className="absolute bottom-3/4 w-full h-px bg-gray-200"></div>
            <div className="absolute top-0 w-full h-px bg-gray-300"></div>
          </div>
          
          {/* Bars container */}
          <div className="absolute inset-0 flex items-end justify-between gap-1 px-1">
            {data.map((zone) => {
            const avgHeight = zone.avgTime > 0 ? Math.max((zone.avgTime / chartMax) * 100, 3) : 0;
            const currentHeight = zone.currentTime > 0 ? Math.max((zone.currentTime / chartMax) * 100, 3) : 0;
            
            return (
              <div key={zone.zoneId} className="flex-1 flex items-end justify-center gap-0.5 h-full">
                {/* Average bar (blue) */}
                <div className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="bg-blue-500 rounded-sm w-full min-h-0"
                    style={{ 
                      height: avgHeight > 0 ? `${avgHeight}%` : '0px',
                      minHeight: avgHeight > 0 ? '3px' : '0px'
                    }}
                    title={`Zone ${zone.zoneId} - Avg: ${formatTime(zone.avgTime)}`}
                  />
                </div>
                
                {/* Current bar (colored by status) */}
                <div className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="rounded-sm w-full min-h-0"
                    style={{ 
                      height: currentHeight > 0 ? `${currentHeight}%` : '0px',
                      minHeight: currentHeight > 0 ? '3px' : '0px',
                      backgroundColor: getBarColor(zone.avgTime, zone.currentTime)
                    }}
                    title={`Zone ${zone.zoneId} - Current: ${formatTime(zone.currentTime)}`}
                  />
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="ml-16 flex justify-between mt-2 text-xs text-gray-500">
          {data.map((zone) => (
            <div key={zone.zoneId} className="flex-1 text-center">
              Z{zone.zoneId}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-center text-sm">
        <div>
          <div className="text-lg font-bold text-blue-600">
            {formatTime(data.reduce((sum, z) => sum + z.avgTime, 0) / data.length)}
          </div>
          <div className="text-gray-600">Avg All Zones</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">
            {data.filter(z => z.currentTime > 0).length}
          </div>
          <div className="text-gray-600">Zones Active</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-600">
            {data.filter(z => z.currentTime > 0 && z.avgTime > 0 && z.currentTime > z.avgTime).length}
          </div>
          <div className="text-gray-600">Over Average</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">
            {formatTime(Math.max(...data.map(z => z.currentTime)))}
          </div>
          <div className="text-gray-600">Longest Current</div>
        </div>
      </div>
    </div>
  );
});

export default ZoneTimeChart;