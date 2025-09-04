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
  // Debug: Log data to see what we're getting
  console.log('ZoneTimeChart data:', data.slice(0, 3));
  console.log('First zone data:', data[0]);
  console.log('Data max time:', Math.max(...data.map(d => Math.max(d.avgTime, d.currentTime))));
  
  // Enhanced debugging - check for zero values
  const zeroAvgCount = data.filter(d => d.avgTime === 0).length;
  const nonZeroAvgCount = data.filter(d => d.avgTime > 0).length;
  console.log(`🔍 Chart Debug: ${nonZeroAvgCount} zones with avgTime > 0, ${zeroAvgCount} zones with avgTime = 0`);
  
  // Find max time for dynamic scaling
  const dataMaxTime = Math.max(
    ...data.map(d => Math.max(d.avgTime, d.currentTime)),
    1 // Minimum 1 minute to avoid zero
  );
  
  // Smart scaling: round up to next meaningful interval
  let maxTime: number;
  if (dataMaxTime <= 30) {
    maxTime = Math.ceil(dataMaxTime / 10) * 10; // Round to next 10 minutes
  } else if (dataMaxTime <= 60) {
    maxTime = Math.ceil(dataMaxTime / 15) * 15; // Round to next 15 minutes
  } else if (dataMaxTime <= 120) {
    maxTime = Math.ceil(dataMaxTime / 30) * 30; // Round to next 30 minutes
  } else {
    maxTime = Math.ceil(dataMaxTime / 60) * 60; // Round to next hour
  }
  
  // Add 10% padding for better visualization
  const chartMaxTime = maxTime * 1.1;

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  const getBarHeight = (time: number): number => {
    if (time === 0) return 0; // No bar for zero time
    const height = Math.max((time / chartMaxTime) * 100, 3); // Minimum 3% height for visibility
    return height;
  };

  const getBarColor = (avgTime: number, currentTime: number): { avg: string; current: string } => {
    const isOverAverage = currentTime > 0 && avgTime > 0 && currentTime > avgTime * 1.5;
    
    return {
      avg: '#3b82f6', // Average time - always blue (#3b82f6 = bg-blue-500)
      current: currentTime === 0 
        ? '#d1d5db' // No car - gray (#d1d5db = bg-gray-300)
        : isOverAverage 
          ? '#ef4444' // Over average - red (#ef4444 = bg-red-500)
          : '#10b981' // Normal - green (#10b981 = bg-green-500)
    };
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${className}`}>
      {/* Chart Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Zone Processing Times</h3>
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
            <span>Current (Over Avg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>No Car</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col-reverse justify-between text-xs text-gray-500">
          <span>0m</span>
          <span>{formatTime(chartMaxTime * 0.25)}</span>
          <span>{formatTime(chartMaxTime * 0.5)}</span>
          <span>{formatTime(chartMaxTime * 0.75)}</span>
          <span>{formatTime(chartMaxTime)}</span>
        </div>

        {/* Chart Area */}
        <div className="ml-14 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col-reverse">
            {[0, 0.25, 0.5, 0.75, 1].map((_, index) => (
              <div
                key={index}
                className="border-t border-gray-200 flex-1"
                style={{ borderTopWidth: index === 0 ? 2 : 1 }}
              />
            ))}
          </div>

          {/* Bars Container */}
          <div className="relative h-48 flex items-end justify-between gap-1 px-1">
            {data.map((zone) => {
              const colors = getBarColor(zone.avgTime, zone.currentTime);
              const avgHeight = getBarHeight(zone.avgTime);
              const currentHeight = getBarHeight(zone.currentTime);

              // Debug for first few zones
              if (zone.zoneId <= 3) {
                console.log(`🎯 Zone ${zone.zoneId}: avgTime=${zone.avgTime}, currentTime=${zone.currentTime}, avgHeight=${avgHeight}%, currentHeight=${currentHeight}%, chartMaxTime=${chartMaxTime.toFixed(1)}, colors=${colors.avg}/${colors.current}`);
              }

              return (
                <div key={zone.zoneId} className="flex-1 flex items-end justify-center gap-0.5 h-full">
                  {/* Average Bar */}
                  <div className="flex flex-col justify-end flex-1 h-full">
                    <div
                      className="rounded-sm w-full transition-all duration-300"
                      style={{ 
                        height: `${avgHeight}%`,
                        minHeight: avgHeight > 0 ? '4px' : '0px',
                        backgroundColor: colors.avg
                      }}
                      title={`Zone ${zone.zoneId} - Avg: ${formatTime(zone.avgTime)}`}
                    />
                  </div>
                  
                  {/* Current Bar */}
                  <div className="flex flex-col justify-end flex-1 h-full">
                    <div
                      className="rounded-sm w-full transition-all duration-300"
                      style={{ 
                        height: `${currentHeight}%`,
                        minHeight: currentHeight > 0 ? '4px' : '0px',
                        backgroundColor: colors.current
                      }}
                      title={`Zone ${zone.zoneId} - Current: ${formatTime(zone.currentTime)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {data.map((zone) => (
              <div key={zone.zoneId} className="flex-1 text-center">
                Z{zone.zoneId}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
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
            {data.filter(z => z.currentTime > 0 && z.avgTime > 0 && z.currentTime > z.avgTime * 1.5).length}
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
