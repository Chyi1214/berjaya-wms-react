// Production Monitor V5 - Takt Time System with Flying Car
import React from 'react';
import { useProductionMonitor } from '../../../hooks/useProductionMonitor';
import { useAuth } from '../../../contexts/AuthContext';
import { WorkStation, ZoneStatus } from '../../../types/production';

export const ProductionMonitorV5: React.FC = () => {
  const {
    zones,
    maintenanceZone,
    systemState,
    loading,
    lastUpdate,
    toggleSystem,
    resetAllZones,
  } = useProductionMonitor();
  const { authenticatedUser, getUserDisplayName } = useAuth();

  const handleToggle = async () => {
    if (!authenticatedUser) return;

    const turnOn = !systemState?.isOn;
    await toggleSystem(turnOn, authenticatedUser.email, getUserDisplayName());
  };

  const handleReset = async () => {
    if (!authenticatedUser) return;

    const confirmed = confirm(
      '⚠️ START/END DAY - RESET ALL ZONES\n\n' +
      'This will:\n' +
      '• Clear all current cars\n' +
      '• Clear all flying cars\n' +
      '• Reset all timers to 0\n' +
      '• Reset today\'s time tracking\n' +
      '• Keep zone structure intact\n\n' +
      '❗ THIS CANNOT BE UNDONE ❗\n\n' +
      'Type "START" in the next dialog to confirm.'
    );

    if (!confirmed) return;

    const confirmText = prompt('Type START to confirm:');
    if (confirmText !== 'START') {
      alert('Operation cancelled.');
      return;
    }

    try {
      await resetAllZones();
      alert('✅ All zones have been reset successfully!');
    } catch (error) {
      alert('❌ Failed to reset zones. Please try again.');
      console.error(error);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: ZoneStatus): string => {
    switch (status) {
      case ZoneStatus.WORK:
        return 'bg-green-100 border-green-400';
      case ZoneStatus.STARVE:
        return 'bg-yellow-100 border-yellow-400';
      case ZoneStatus.BLOCK:
        return 'bg-red-100 border-red-400';
      case ZoneStatus.PAUSED:
        return 'bg-gray-100 border-gray-400';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusBadge = (status: ZoneStatus): JSX.Element => {
    const badges = {
      [ZoneStatus.WORK]: <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">WORK</span>,
      [ZoneStatus.STARVE]: <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">STARVE</span>,
      [ZoneStatus.BLOCK]: <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">BLOCK</span>,
      [ZoneStatus.PAUSED]: <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">PAUSED</span>,
    };
    return badges[status] || <span className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded">-</span>;
  };

  const isSpecialZone = (zoneId: number): 'head' | 'tail' | 'maintenance' | null => {
    if (zoneId === 1) return 'head';
    if (zoneId === 23) return 'tail';
    if (zoneId === 99) return 'maintenance';
    return null;
  };

  const renderZoneCard = (zone: WorkStation) => {
    const special = isSpecialZone(zone.zoneId);

    // Safe access with defaults for zones still initializing
    const workTime = zone.timeAccumulation?.workTime || 0;
    const starveTime = zone.timeAccumulation?.starveTime || 0;
    const blockTime = zone.timeAccumulation?.blockTime || 0;
    const totalTime = workTime + starveTime + blockTime;

    const workPercent = totalTime > 0 ? (workTime / totalTime) * 100 : 0;
    const starvePercent = totalTime > 0 ? (starveTime / totalTime) * 100 : 0;
    const blockPercent = totalTime > 0 ? (blockTime / totalTime) * 100 : 0;

    return (
      <div
        key={zone.zoneId}
        className={`border-2 rounded-lg p-4 ${getStatusColor(zone.status)} ${
          special ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">
              {zone.zoneId === 99 ? 'Maintenance' : `Zone ${zone.zoneId}`}
            </h3>
            {special && special !== 'maintenance' && (
              <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded">
                {special === 'head' ? 'START' : 'END'}
              </span>
            )}
          </div>
          {getStatusBadge(zone.status)}
        </div>

        {/* Current Car */}
        {zone.currentCar && (
          <div className="mb-2 p-2 bg-white bg-opacity-50 rounded">
            <div className="text-sm font-medium">🚗 {zone.currentCar.vin}</div>
            <div className="text-xs text-gray-600">
              {zone.currentCar.color} {zone.currentCar.type} • {formatTime(zone.currentCar.timeElapsed)}
            </div>
          </div>
        )}

        {/* Flying Car */}
        {zone.flyingCar && (
          <div className="mb-2 p-2 bg-orange-100 border border-orange-300 rounded">
            <div className="text-sm font-medium">✈️ {zone.flyingCar.vin}</div>
            <div className="text-xs text-orange-700">
              Flying {formatTime(zone.flyingCar.flyingTime)}
            </div>
          </div>
        )}

        {/* Stacked Bar Graph */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Time Distribution</div>
          <div className="h-8 flex rounded overflow-hidden border border-gray-300">
            {workPercent > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${workPercent}%` }}
                title={`Work: ${formatTime(workTime)}`}
              >
                {workPercent > 15 && formatTime(workTime)}
              </div>
            )}
            {starvePercent > 0 && (
              <div
                className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${starvePercent}%` }}
                title={`Starve: ${formatTime(starveTime)}`}
              >
                {starvePercent > 15 && formatTime(starveTime)}
              </div>
            )}
            {blockPercent > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${blockPercent}%` }}
                title={`Block: ${formatTime(blockTime)}`}
              >
                {blockPercent > 15 && formatTime(blockTime)}
              </div>
            )}
            {totalTime === 0 && (
              <div className="flex-1 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                No Data
              </div>
            )}
          </div>
        </div>

        {/* Caused Stop Timer */}
        <div className="p-2 bg-white bg-opacity-70 rounded border border-gray-300">
          <div className="text-xs text-gray-600 mb-1">Stop Time Caused by This Zone</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-red-600">
              {formatTime(zone.causedStopTime?.current || 0)}
            </div>
            <div className="text-xs text-gray-500">
              Total: {formatTime(zone.causedStopTime?.total || 0)}
            </div>
          </div>
          {((zone.causedStopTime?.starveTimeBlame || 0) > 0 || (zone.causedStopTime?.blockTimeBlame || 0) > 0) && (
            <div className="mt-1 flex gap-2 text-xs">
              {(zone.causedStopTime?.starveTimeBlame || 0) > 0 && (
                <span className="text-yellow-700">
                  ⚠️ Starve: {formatTime(zone.causedStopTime.starveTimeBlame)}
                </span>
              )}
              {(zone.causedStopTime?.blockTimeBlame || 0) > 0 && (
                <span className="text-red-700">
                  🚫 Block: {formatTime(zone.causedStopTime.blockTimeBlame)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Worker Info */}
        {zone.currentWorker && (
          <div className="mt-2 text-xs text-gray-600">
            👷 {zone.currentWorker.displayName}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading production monitor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with ON/OFF Toggle */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏭 Production Monitor V5.0</h1>
            <p className="text-gray-600 mt-1">Takt Time System with Flying Car Tracking</p>
          </div>

          <div className="flex gap-3">
            {/* Start/End Day Button */}
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all"
              title="Start or end the day - resets all zones and timers"
            >
              🔄 Start/End Today
            </button>

            {/* Pause/Resume Toggle */}
            <button
              onClick={handleToggle}
              className={`px-6 py-3 rounded-lg font-bold text-lg transition-all ${
                systemState?.isOn
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {systemState?.isOn ? '⏸️ PAUSE' : '▶️ RESUME'}
            </button>
          </div>
        </div>

        {/* System Status */}
        {systemState && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="text-sm text-gray-600">ON Time Today</div>
              <div className="text-xl font-bold text-green-700">{formatTime(systemState.todayOnTime)}</div>
            </div>
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <div className="text-sm text-gray-600">Paused Time Today</div>
              <div className="text-xl font-bold text-red-700">{formatTime(systemState.todayOffTime)}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="text-sm font-medium text-blue-700">{lastUpdate.toLocaleTimeString()}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <div className="text-sm text-gray-600">Active Zones</div>
              <div className="text-xl font-bold text-purple-700">
                {zones.filter(z => z.currentCar || z.flyingCar).length} / {zones.length}
              </div>
            </div>
          </div>
        )}

        {/* Pause Indicator */}
        {systemState && !systemState.isOn && (
          <div className="mt-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⏸️</span>
              <div>
                <div className="font-bold text-yellow-900">SYSTEM PAUSED</div>
                <div className="text-sm text-yellow-700">
                  Timers are frozen. Leaders can still view and address issues.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Production Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {zones.map(zone => renderZoneCard(zone))}
      </div>

      {/* Maintenance Zone */}
      {maintenanceZone && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔧 Maintenance Zone</h2>
          <div className="max-w-md">
            {renderZoneCard(maintenanceZone)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Status Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>WORK - Zone actively working</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>STARVE - Waiting for work</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>BLOCK - Can't move forward</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span>PAUSED - System Paused</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionMonitorV5;
