// Zone Activity View Component - Track Activity by Zone
import { useState, useEffect } from 'react';
import { CarMovement } from '../../types';
import { carTrackingService } from '../../services/carTrackingService';

interface ZoneActivityViewProps {
  className?: string;
}

export function ZoneActivityView({ className = '' }: ZoneActivityViewProps) {
  const [selectedZone, setSelectedZone] = useState<number>(1);
  const [movements, setMovements] = useState<(CarMovement & { movedByName: string; idleTime?: number; groupIndex: number; isFirstInGroup: boolean; groupSize: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Load data when zone or date changes
  useEffect(() => {
    loadZoneActivity();
  }, [selectedZone, selectedDate]);

  const loadZoneActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse selected date and create date range for that day
      const dateFrom = new Date(selectedDate);
      dateFrom.setHours(0, 0, 0, 0);

      const dateTo = new Date(selectedDate);
      dateTo.setHours(23, 59, 59, 999);

      console.log('🔍 Loading zone activity for Zone:', selectedZone, 'Date:', selectedDate);

      const data = await carTrackingService.getZoneMovements(selectedZone, {
        dateFrom,
        dateTo,
        limit: 100
      });

      // Get display names for the movements
      const uniqueEmails = [...new Set(data.map(m => m.movedBy))];
      const emailToNameMap = new Map<string, string>();

      for (const email of uniqueEmails) {
        const displayName = await carTrackingService.getUserDisplayName(email);

        // If display name is same as email, try to create a simpler name
        let finalName = displayName;
        if (displayName === email) {
          // Extract name from email - take part before @ and capitalize
          const namePart = email.split('@')[0];
          // Simple capitalization - just first letter
          finalName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        emailToNameMap.set(email, finalName);
      }

      // Add display names to movements
      const movementsWithNames = data.map(movement => ({
        ...movement,
        movedByName: emailToNameMap.get(movement.movedBy) || movement.movedBy
      }));

      // Calculate idle times for movements
      const movementsWithIdleTime = calculateIdleTime(movementsWithNames);

      // Add VIN grouping for visual organization
      const groupedMovements = addVinGrouping(movementsWithIdleTime);

      setMovements(groupedMovements);
    } catch (err) {
      console.error('Failed to load zone activity:', err);
      setError(`Failed to load data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleZoneChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedZone(parseInt(event.target.value));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleRefresh = () => {
    loadZoneActivity();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Group consecutive movements by VIN for visual organization
  const addVinGrouping = (movements: (CarMovement & { movedByName: string; idleTime?: number })[]):
    (CarMovement & { movedByName: string; idleTime?: number; groupIndex: number; isFirstInGroup: boolean; groupSize: number })[] => {

    if (movements.length === 0) return [];

    // First pass: count group sizes
    const groupSizes: number[] = [];
    let currentVin = movements[0].vin;
    let currentGroupSize = 1;

    for (let i = 1; i < movements.length; i++) {
      if (movements[i].vin === currentVin) {
        currentGroupSize++;
      } else {
        groupSizes.push(currentGroupSize);
        currentVin = movements[i].vin;
        currentGroupSize = 1;
      }
    }
    groupSizes.push(currentGroupSize); // Add last group

    // Second pass: add grouping metadata
    const result = [];
    let groupIndex = 0;
    let positionInGroup = 0;
    currentVin = movements[0].vin;

    for (let i = 0; i < movements.length; i++) {
      const movement = movements[i];

      if (movement.vin !== currentVin) {
        currentVin = movement.vin;
        groupIndex++;
        positionInGroup = 0;
      }

      result.push({
        ...movement,
        groupIndex,
        isFirstInGroup: positionInGroup === 0,
        groupSize: groupSizes[groupIndex]
      });

      positionInGroup++;
    }

    return result;
  };

  // Calculate idle time between car completion and next scan-in
  const calculateIdleTime = (movements: (CarMovement & { movedByName: string })[]): (CarMovement & { movedByName: string; idleTime?: number })[] => {
    // Sort movements by time to ensure proper order
    const sortedMovements = [...movements].sort((a, b) => a.movedAt.getTime() - b.movedAt.getTime());

    const enhancedMovements = [];

    for (let i = 0; i < sortedMovements.length; i++) {
      const current = sortedMovements[i];
      let idleTime: number | undefined = undefined;

      // If this is a scan_in, look for the previous complete in the same zone
      if (current.movementType === 'scan_in') {
        // Find the most recent complete action in this zone before current scan_in
        for (let j = i - 1; j >= 0; j--) {
          const previous = sortedMovements[j];

          // Look for complete action FROM the zone we're scanning INTO
          if (previous.movementType === 'complete' && previous.fromZone === current.toZone) {
            // Calculate time difference in minutes
            const timeDiffMs = current.movedAt.getTime() - previous.movedAt.getTime();
            const timeDiffMinutes = Math.round(timeDiffMs / (1000 * 60));

            // Only count idle time if it's less than 3 hours (180 minutes)
            // Anything over 3 hours is considered off-clock time
            if (timeDiffMinutes <= 180) {
              idleTime = timeDiffMinutes;
            }
            break; // Found the relevant complete action
          }
        }
      }

      enhancedMovements.push({
        ...current,
        idleTime
      });
    }

    return enhancedMovements;
  };

  const getMovementTypeDisplay = (type: string): string => {
    switch (type) {
      case 'scan_in': return '📱 Scan In';
      case 'complete': return '✅ Complete';
      case 'transfer': return '↔️ Transfer';
      case 'hold': return '⏸️ Hold';
      default: return type;
    }
  };

  // Calculate some basic statistics
  const stats = {
    totalMovements: movements.length,
    uniqueCars: new Set(movements.map(m => m.vin)).size,
    uniqueWorkers: new Set(movements.map(m => m.movedBy)).size,
    scanIns: movements.filter(m => m.movementType === 'scan_in').length,
    completions: movements.filter(m => m.movementType === 'complete').length,
    avgTime: movements.filter(m => m.timeInPreviousZone).length > 0
      ? Math.round(movements.filter(m => m.timeInPreviousZone).reduce((sum, m) => sum + (m.timeInPreviousZone || 0), 0) / movements.filter(m => m.timeInPreviousZone).length)
      : 0,
    avgIdleTime: movements.filter(m => m.idleTime).length > 0
      ? Math.round(movements.filter(m => m.idleTime).reduce((sum, m) => sum + (m.idleTime || 0), 0) / movements.filter(m => m.idleTime).length)
      : 0,
    totalIdleEvents: movements.filter(m => m.idleTime).length
  };

  // Generate zone options (1-23 for production zones)
  const zoneOptions = Array.from({ length: 23 }, (_, i) => i + 1);

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Zone Activity Tracking
        </h3>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Zone Selection */}
        <div className="flex items-center gap-2">
          <label htmlFor="zone-select" className="text-sm font-medium text-gray-700">
            Zone:
          </label>
          <select
            id="zone-select"
            value={selectedZone}
            onChange={handleZoneChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {zoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                Zone {zone}
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <label htmlFor="zone-date" className="text-sm font-medium text-gray-700">
            Date:
          </label>
          <input
            id="zone-date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Statistics Summary */}
      {!loading && movements.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalMovements}</div>
            <div className="text-xs text-blue-600">Total Movements</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats.uniqueCars}</div>
            <div className="text-xs text-green-600">Unique Cars</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueWorkers}</div>
            <div className="text-xs text-purple-600">Workers</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.scanIns}</div>
            <div className="text-xs text-orange-600">Scan Ins</div>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-teal-600">{stats.completions}</div>
            <div className="text-xs text-teal-600">Completions</div>
          </div>
          {stats.avgTime > 0 && (
            <div className="bg-indigo-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-indigo-600">{formatDuration(stats.avgTime)}</div>
              <div className="text-xs text-indigo-600">Avg Work Time</div>
            </div>
          )}
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.totalIdleEvents}</div>
            <div className="text-xs text-yellow-600">Idle Events</div>
          </div>
          {stats.avgIdleTime > 0 && (
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{formatDuration(stats.avgIdleTime)}</div>
              <div className="text-xs text-red-600">Avg Idle Time</div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading zone activity...</div>
        </div>
      )}

      {/* No Data State */}
      {!loading && movements.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500">No activity found for Zone {selectedZone} on {selectedDate}</p>
          <p className="text-sm text-gray-400 mt-2">
            Try selecting a different zone or date, or check if any cars have been scanned.
          </p>
        </div>
      )}

      {/* Activity Table */}
      {!loading && movements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VIN
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Time
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Idle Time
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {movements.map((movement) => {
                // Alternating background colors per VIN group
                const isEvenGroup = movement.groupIndex % 2 === 0;
                const bgColor = isEvenGroup ? 'bg-white' : 'bg-gray-50';
                const hoverColor = isEvenGroup ? 'hover:bg-gray-50' : 'hover:bg-gray-100';

                return (
                  <tr key={movement.id} className={`${bgColor} ${hoverColor}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {formatTime(movement.movedAt)}
                    </td>
                    {/* VIN cell - only show in first row of each group */}
                    {movement.isFirstInGroup ? (
                      <td
                        className="border border-gray-200 px-4 py-3 text-sm font-mono text-center align-top"
                        rowSpan={movement.groupSize}
                      >
                        <div className="font-medium text-blue-900">
                          {movement.vin}
                        </div>
                      </td>
                    ) : null}
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {getMovementTypeDisplay(movement.movementType)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {movement.movedByName}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {movement.timeInPreviousZone ? formatDuration(movement.timeInPreviousZone) : '-'}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {movement.idleTime ? (
                        <span className="text-red-600 font-medium">
                          {formatDuration(movement.idleTime)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">
                      {movement.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {movements.length} activities for Zone {selectedZone} on {selectedDate}
          </div>
        </div>
      )}
    </div>
  );
}

export default ZoneActivityView;