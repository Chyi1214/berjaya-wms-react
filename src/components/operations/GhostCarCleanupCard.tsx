import { memo, useState } from 'react';
import { workStationServiceV5 } from '../../services/workStationServiceV5';

interface GhostCarCleanupCardProps {
  user: { email: string } | null;
  onRefresh?: () => void;
}

interface CleanupResult {
  fixed: number;
  issues: string[];
}

export const GhostCarCleanupCard = memo(function GhostCarCleanupCard({
  user,
  onRefresh
}: GhostCarCleanupCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [manualZone, setManualZone] = useState('');

  // V5: Run automatic zone cleanup (check all zones for stuck cars)
  const handleAutoCleanup = async () => {
    if (!user?.email || isProcessing) return;

    try {
      setIsProcessing(true);
      setCleanupResult(null);

      console.log('🧹 V5: Scanning all zones for stuck data...');

      const issues: string[] = [];
      let fixed = 0;

      // Check all production zones (1-23)
      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        const station = await workStationServiceV5.getWorkStation(zoneId);

        // If zone has currentCar or flyingCar, report it
        if (station?.currentCar) {
          issues.push(`Zone ${zoneId}: Has current car ${station.currentCar.vin}`);
        }
        if (station?.flyingCar) {
          issues.push(`Zone ${zoneId}: Has flying car ${station.flyingCar.vin}`);
        }
      }

      setCleanupResult({
        fixed,
        issues: issues.length > 0 ? issues : ['✨ All zones are clean! No stuck cars found.']
      });
      onRefresh?.();

      console.log('✅ V5 zone scan completed');
    } catch (error) {
      console.error('Failed to run auto cleanup:', error);
      setCleanupResult({
        fixed: 0,
        issues: [`Error: ${error instanceof Error ? error.message : String(error)}`]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // V5: Force clear specific zone (clears both currentCar and flyingCar)
  const handleForceClearZone = async () => {
    if (!user?.email || !manualZone.trim() || isProcessing) return;

    const zoneId = parseInt(manualZone.trim());
    if (isNaN(zoneId) || zoneId < 1 || zoneId > 25) {
      setCleanupResult({
        fixed: 0,
        issues: ['Invalid zone number. Please enter a number between 1 and 25.']
      });
      return;
    }

    try {
      setIsProcessing(true);
      setCleanupResult(null);

      console.log('🧹 V5: Force clearing zone:', zoneId);

      // V5: Get current zone state
      const station = await workStationServiceV5.getWorkStation(zoneId);
      const clearedItems: string[] = [];

      if (station?.currentCar) {
        clearedItems.push(`currentCar: ${station.currentCar.vin}`);
      }
      if (station?.flyingCar) {
        clearedItems.push(`flyingCar: ${station.flyingCar.vin}`);
      }

      // V5: Clear the zone by creating a fresh default station
      // This is effectively a force reset of the zone
      const { updateDoc, doc, collection } = await import('../../services/costTracking/firestoreWrapper');
      const { db } = await import('../../services/firebase');

      await updateDoc(doc(collection(db, 'workStations'), zoneId.toString()), {
        currentCar: null,
        flyingCar: null,
        currentWorker: null,
        lastUpdated: new Date()
      });

      setCleanupResult({
        fixed: 1,
        issues: clearedItems.length > 0
          ? [`✅ Cleared Zone ${zoneId}: ${clearedItems.join(', ')}`]
          : [`✅ Cleared Zone ${zoneId} (zone was already empty)`]
      });

      setManualZone('');
      onRefresh?.();

      console.log('✅ V5 zone clear completed');
    } catch (error) {
      console.error('Failed to clear zone:', error);
      setCleanupResult({
        fixed: 0,
        issues: [`Error clearing Zone ${zoneId}: ${error instanceof Error ? error.message : String(error)}`]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user?.email) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🧹 Ghost Car Cleanup</h3>
        <p className="text-gray-500">Please log in to access ghost car cleanup tools.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">🧹</span>
        <h3 className="text-lg font-semibold text-gray-900">Ghost Car Cleanup</h3>
      </div>

      <p className="text-gray-600 mb-6">
        ✨ <strong>V5 Single-Source System:</strong> Scan all zones for stuck cars or clear specific zones.
        No more ghost cars with the new single-source architecture!
      </p>

      {/* Automatic Scan */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900">🔍 Scan All Zones</h4>
        <p className="text-sm text-gray-600">
          Scan all 23 production zones and report any cars currently in zones (currentCar or flyingCar).
          Use this to see which zones have cars before clearing them.
        </p>
        <button
          onClick={handleAutoCleanup}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isProcessing ? '🔄 Scanning All Zones...' : '🔍 Scan All Zones'}
        </button>
      </div>

      {/* Force Clear Zone */}
      <div className="space-y-4 mb-6 border-t pt-6">
        <h4 className="font-medium text-gray-900">⚠️ Force Clear Zone (Nuclear Option)</h4>
        <p className="text-sm text-gray-600">
          Clear a stuck zone when you get "Zone shows different car" errors. This clears the workStation record for the zone.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
          <p className="text-sm text-yellow-800">
            <strong>When to use:</strong> When you try to complete a car but get an error saying the zone has a different car.
            This clears the zone's workStation data so you can scan a new car in.
          </p>
        </div>
        <div className="flex space-x-2">
          <input
            type="number"
            value={manualZone}
            onChange={(e) => setManualZone(e.target.value)}
            placeholder="Enter Zone Number (1-25)"
            min="1"
            max="25"
            className="flex-1 p-2 border border-gray-300 rounded-lg"
            disabled={isProcessing}
          />
          <button
            onClick={handleForceClearZone}
            disabled={isProcessing || !manualZone.trim()}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isProcessing ? '🔄 Clearing...' : '🧹 Clear Zone'}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {cleanupResult && (
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Cleanup Results</h4>

          {cleanupResult.fixed > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-medium">
                ✅ Fixed {cleanupResult.fixed} inconsistenc{cleanupResult.fixed !== 1 ? 'ies' : 'y'} across both data collections
              </p>
              <p className="text-green-700 text-sm mt-1">
                🏭 Factory data integrity restored
              </p>
            </div>
          )}

          {cleanupResult.issues.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="text-blue-800 font-medium mb-2">Details:</h5>
              <ul className="text-blue-700 text-sm space-y-1">
                {cleanupResult.issues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cleanupResult.fixed === 0 && cleanupResult.issues.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">
                ✨ No ghost cars found! All zones are clean.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h5 className="text-green-800 font-medium mb-2">✨ V5 Single-Source System Benefits:</h5>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• <strong>No More Ghost Cars:</strong> Single source of truth eliminates data inconsistencies</li>
          <li>• <strong>Simpler Cleanup:</strong> Just clear zones directly when needed</li>
          <li>• <strong>Flying Car Support:</strong> Cars automatically move between zones</li>
          <li>• <strong>Real-time Status:</strong> All zone data comes from one place</li>
        </ul>
        <p className="text-green-800 text-sm mt-3 font-medium">
          🎯 If you see stuck cars, use "Force Clear Zone" to reset the zone
        </p>
      </div>
    </div>
  );
});