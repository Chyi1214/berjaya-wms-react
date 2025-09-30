// Car Movement History Component - Raw Transaction View
import { useState, useEffect } from 'react';
import { CarMovement } from '../../types';
import { carTrackingService } from '../../services/carTrackingService';

interface CarMovementHistoryProps {
  className?: string;
}

export function CarMovementHistory({ className = '' }: CarMovementHistoryProps) {
  const [movements, setMovements] = useState<(CarMovement & { movedByName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Load data when component mounts or date changes
  useEffect(() => {
    loadMovements();
  }, [selectedDate]);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse selected date and create date range for that day
      const dateFrom = new Date(selectedDate);
      dateFrom.setHours(0, 0, 0, 0);

      const dateTo = new Date(selectedDate);
      dateTo.setHours(23, 59, 59, 999);

      console.log('🔍 Loading car movements for:', selectedDate, 'From:', dateFrom, 'To:', dateTo);

      const data = await carTrackingService.getCarMovementsWithNames({
        dateFrom,
        dateTo,
        limit: 100
      });

      console.log('📋 Loaded movements:', data.length);
      setMovements(data);
    } catch (err) {
      console.error('Failed to load car movements:', err);
      setError(`Failed to load data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadMovements();
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatZone = (zone: number | null): string => {
    return zone === null ? '-' : `Zone ${zone}`;
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

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Car Movement History - Raw Transactions
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="movement-date" className="text-sm font-medium text-gray-700">
              Date:
            </label>
            <input
              id="movement-date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading car movements...</div>
        </div>
      )}

      {/* No Data State */}
      {!loading && movements.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500">No car movements found for {selectedDate}</p>
          <p className="text-sm text-gray-400 mt-2">
            Try selecting a different date or check if any cars have been scanned.
          </p>
        </div>
      )}

      {/* Data Table */}
      {!loading && movements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VIN
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From Zone
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To Zone
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-4 py-3 text-sm font-mono">
                    {movement.vin}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm">
                    {formatZone(movement.fromZone)}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm">
                    {formatZone(movement.toZone)}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm">
                    {formatTime(movement.movedAt)}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm">
                    {movement.movedByName}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm">
                    {getMovementTypeDisplay(movement.movementType)}
                  </td>
                  <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">
                    {movement.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {movements.length} movements for {selectedDate}
          </div>
        </div>
      )}
    </div>
  );
}

export default CarMovementHistory;