// Production Worker V5 - Flying Car Workflow
import React, { useState, useEffect } from 'react';
import { workStationServiceV5 } from '../../services/workStationServiceV5';
import { productionSystemService } from '../../services/productionSystemService';
import { useAuth } from '../../contexts/AuthContext';
import { WorkStation, ZoneStatus } from '../../types/production';
import { createModuleLogger } from '../../services/logger';

const logger = createModuleLogger('ProductionWorkerV5');

interface ProductionWorkerV5Props {
  zoneId: number;
}

export const ProductionWorkerV5: React.FC<ProductionWorkerV5Props> = ({ zoneId }) => {
  const { authenticatedUser, getUserDisplayName } = useAuth();
  const [zone, setZone] = useState<WorkStation | null>(null);
  const [previousZone, setPreviousZone] = useState<WorkStation | null>(null);
  const [systemIsOn, setSystemIsOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCarVin, setNewCarVin] = useState('');
  const [newCarType, setNewCarType] = useState('TK1');
  const [newCarColor, setNewCarColor] = useState('White');

  useEffect(() => {
    loadZoneData();
    const interval = setInterval(loadZoneData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [zoneId]);

  const loadZoneData = async () => {
    try {
      const [currentZone, prevZone, systemState] = await Promise.all([
        workStationServiceV5.getWorkStation(zoneId),
        zoneId > 1 ? workStationServiceV5.getWorkStation(zoneId - 1) : Promise.resolve(null),
        productionSystemService.getSystemState(),
      ]);

      setZone(currentZone);
      setPreviousZone(prevZone);
      setSystemIsOn(systemState.isOn);
      setLoading(false);
    } catch (error) {
      logger.error('Failed to load zone data:', error);
    }
  };

  const handleStartNewCar = async () => {
    if (!authenticatedUser || !newCarVin.trim()) return;

    try {
      await workStationServiceV5.startWork(
        zoneId,
        newCarVin.trim(),
        newCarType,
        newCarColor,
        authenticatedUser.email,
        getUserDisplayName(),
        false
      );

      setNewCarVin('');
      await loadZoneData();
      logger.info(`Started work on new car ${newCarVin} in zone ${zoneId}`);
    } catch (error) {
      logger.error('Failed to start new car:', error);
      alert('Failed to start work on new car');
    }
  };

  const handleScanToAccept = async () => {
    if (!authenticatedUser || !newCarVin.trim()) return;

    // Check if this VIN matches the flying car from previous zone
    if (previousZone?.flyingCar && previousZone.flyingCar.vin === newCarVin.trim()) {
      try {
        await workStationServiceV5.startWork(
          zoneId,
          previousZone.flyingCar.vin,
          previousZone.flyingCar.type,
          previousZone.flyingCar.color,
          authenticatedUser.email,
          getUserDisplayName(),
          true
        );

        setNewCarVin('');
        await loadZoneData();
        logger.info(`Accepted flying car ${previousZone.flyingCar.vin} in zone ${zoneId}`);
      } catch (error) {
        logger.error('Failed to accept flying car:', error);
        alert('Failed to accept car from previous zone');
      }
    } else {
      alert(`VIN "${newCarVin}" does not match the incoming car from Zone ${zoneId - 1}`);
    }
  };

  const handleCompleteWork = async () => {
    if (!authenticatedUser || !zone?.currentCar) return;

    const confirmed = confirm(
      `Complete work on ${zone.currentCar.vin}?\nCar will become "flying" and wait for next zone to accept.`
    );

    if (!confirmed) return;

    try {
      await workStationServiceV5.completeWork(zoneId, zone.currentCar.vin);
      await loadZoneData();
      logger.info(`Completed work on ${zone.currentCar.vin} in zone ${zoneId}`);
    } catch (error) {
      logger.error('Failed to complete work:', error);
      alert('Failed to complete work');
    }
  };

  const handleMoveToMaintenance = async () => {
    if (!authenticatedUser || (!zone?.currentCar && !zone?.flyingCar)) return;

    const carVin = zone.currentCar?.vin || zone.flyingCar?.vin || '';
    const confirmed = confirm(
      `Move ${carVin} to maintenance zone?\nThis car will be removed from the production line.`
    );

    if (!confirmed) return;

    try {
      await workStationServiceV5.moveToMaintenance(
        zoneId,
        carVin,
        authenticatedUser.email,
        getUserDisplayName()
      );

      await loadZoneData();
      logger.info(`Moved ${carVin} to maintenance`);
    } catch (error) {
      logger.error('Failed to move to maintenance:', error);
      alert('Failed to move car to maintenance');
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: ZoneStatus): string => {
    switch (status) {
      case ZoneStatus.WORK:
        return 'bg-green-50 border-green-400 text-green-900';
      case ZoneStatus.STARVE:
        return 'bg-yellow-50 border-yellow-400 text-yellow-900';
      case ZoneStatus.BLOCK:
        return 'bg-red-50 border-red-400 text-red-900';
      case ZoneStatus.PAUSED:
        return 'bg-gray-50 border-gray-400 text-gray-900';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading zone {zoneId}...</div>
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800">Zone {zoneId} not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className={`border-2 rounded-lg p-6 mb-6 ${getStatusColor(zone.status)}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Zone {zoneId}</h1>
            <p className="text-sm mt-1">
              Status: <span className="font-bold">{zone.status.toUpperCase()}</span>
            </p>
          </div>
          {!systemIsOn && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg px-4 py-2">
              <div className="font-bold text-yellow-900">⏸️ SYSTEM PAUSED</div>
            </div>
          )}
        </div>

        {/* Worker Info */}
        {zone.currentWorker && (
          <div className="bg-white bg-opacity-50 rounded p-3 mb-4">
            <div className="text-sm text-gray-600">Checked In</div>
            <div className="font-medium">👷 {zone.currentWorker.displayName}</div>
            <div className="text-sm text-gray-600">
              {formatTime(zone.currentWorker.timeWorking)}
            </div>
          </div>
        )}
      </div>

      {/* Current Car */}
      {zone.currentCar && (
        <div className="bg-white border-2 border-blue-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🚗 Current Car</h2>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">VIN:</span>
              <span className="ml-2 font-bold text-lg">{zone.currentCar.vin}</span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2">{zone.currentCar.color} {zone.currentCar.type}</span>
            </div>
            <div>
              <span className="text-gray-600">Work Time:</span>
              <span className="ml-2 font-bold text-blue-600">{formatTime(zone.currentCar.timeElapsed)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCompleteWork}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg"
            >
              ✓ Complete Work
            </button>
            <button
              onClick={handleMoveToMaintenance}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg"
            >
              🔧 Maintenance
            </button>
          </div>
        </div>
      )}

      {/* Flying Car */}
      {zone.flyingCar && (
        <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">✈️ Flying Car (Work Complete)</h2>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">VIN:</span>
              <span className="ml-2 font-bold text-lg">{zone.flyingCar.vin}</span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2">{zone.flyingCar.color} {zone.flyingCar.type}</span>
            </div>
            <div>
              <span className="text-gray-600">Flying Time:</span>
              <span className="ml-2 font-bold text-orange-600">{formatTime(zone.flyingCar.flyingTime)}</span>
            </div>
          </div>

          <div className="mt-4 bg-white bg-opacity-50 rounded p-3">
            <div className="text-sm text-orange-800">
              This car is waiting for the next zone to accept it.
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleMoveToMaintenance}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg"
            >
              🔧 Move to Maintenance
            </button>
          </div>
        </div>
      )}

      {/* Scan to Accept Flying Car from Previous Zone */}
      {!zone.currentCar && previousZone?.flyingCar && (
        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">✈️ Incoming Car from Zone {zoneId - 1}</h2>
          <div className="space-y-2 mb-4">
            <div>
              <span className="text-gray-600">VIN:</span>
              <span className="ml-2 font-bold text-lg">{previousZone.flyingCar.vin}</span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-2">{previousZone.flyingCar.color} {previousZone.flyingCar.type}</span>
            </div>
            <div>
              <span className="text-gray-600">Waiting:</span>
              <span className="ml-2 font-bold text-blue-600">{formatTime(previousZone.flyingCar.flyingTime)}</span>
            </div>
          </div>

          <div className="bg-white bg-opacity-70 rounded p-4 mb-4">
            <div className="text-sm text-blue-800 mb-2">
              📱 Scan the VIN to accept this car and start work
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scan VIN</label>
              <input
                type="text"
                value={newCarVin}
                onChange={(e) => setNewCarVin(e.target.value)}
                placeholder="Scan or enter VIN..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <button
              onClick={handleScanToAccept}
              disabled={!newCarVin.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              ✓ Accept Car and Start Work
            </button>
          </div>
        </div>
      )}

      {/* Start New Car (Zone 1 only) */}
      {zoneId === 1 && !zone.currentCar && !zone.flyingCar && (
        <div className="bg-green-100 border-2 border-green-400 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🚗 Start New Car</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
              <input
                type="text"
                value={newCarVin}
                onChange={(e) => setNewCarVin(e.target.value)}
                placeholder="Enter VIN..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={newCarType}
                  onChange={(e) => setNewCarType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="TK1">TK1</option>
                  <option value="TK2">TK2</option>
                  <option value="TK3">TK3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <select
                  value={newCarColor}
                  onChange={(e) => setNewCarColor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="White">White</option>
                  <option value="Black">Black</option>
                  <option value="Red">Red</option>
                  <option value="Blue">Blue</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleStartNewCar}
              disabled={!newCarVin.trim()}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              ✓ Start Work on New Car
            </button>
          </div>
        </div>
      )}

      {/* Empty Zone Message */}
      {!zone.currentCar && !zone.flyingCar && !previousZone?.flyingCar && zoneId !== 1 && (
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">⏳</div>
            <div className="font-medium">Zone is empty</div>
            <div className="text-sm mt-1">
              {zone.status === ZoneStatus.STARVE && 'Waiting for work from previous zone'}
              {zone.status === ZoneStatus.BLOCK && 'Previous zone has a car waiting, but you haven\'t accepted it'}
              {zone.status === ZoneStatus.PAUSED && 'System is paused'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionWorkerV5;
