import { memo, useState } from 'react';
import { carTrackingService } from '../../services/carTrackingService';
import { workStationService } from '../../services/workStationService';

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
  const [manualVin, setManualVin] = useState('');
  const [manualZone, setManualZone] = useState('');

  // Run automatic ghost car cleanup
  const handleAutoCleanup = async () => {
    if (!user?.email || isProcessing) return;

    try {
      setIsProcessing(true);
      setCleanupResult(null);

      console.log('🧹 Starting automatic ghost car cleanup...');
      const result = await carTrackingService.cleanupGhostCars();

      setCleanupResult(result);
      onRefresh?.();

      console.log('✅ Automatic cleanup completed:', result);
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

  // Force remove specific car
  const handleForceRemove = async () => {
    if (!user?.email || !manualVin.trim() || isProcessing) return;

    try {
      setIsProcessing(true);
      setCleanupResult(null);

      console.log('🧹 Force removing car:', manualVin);
      await carTrackingService.forceRemoveCarFromZone(
        manualVin.trim().toUpperCase(),
        'Manual removal by manager'
      );

      setCleanupResult({
        fixed: 1,
        issues: [`Manually removed car: ${manualVin.toUpperCase()}`]
      });

      setManualVin('');
      onRefresh?.();

      console.log('✅ Manual removal completed');
    } catch (error) {
      console.error('Failed to force remove car:', error);
      setCleanupResult({
        fixed: 0,
        issues: [`Error removing ${manualVin}: ${error instanceof Error ? error.message : String(error)}`]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Force clear specific zone (NUCLEAR OPTION for stuck zones)
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

      console.log('🧹 Force clearing zone:', zoneId);

      // Clear the workStation
      await workStationService.clearStationCar(zoneId, 'Manual zone clear by manager');

      setCleanupResult({
        fixed: 1,
        issues: [`✅ Cleared Zone ${zoneId} workStation - zone is now available for new cars`]
      });

      setManualZone('');
      onRefresh?.();

      console.log('✅ Manual zone clear completed');
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
        🏭 <strong>Factory-Grade Data Integrity:</strong> Fix cars that appear in zones but can't be completed,
        multiple cars claiming the same zone, or workStation-car data inconsistencies.
      </p>

      {/* Automatic Cleanup */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900">🤖 Comprehensive Auto Cleanup</h4>
        <p className="text-sm text-gray-600">
          <strong>Phase 1:</strong> Fix duplicate car assignments in zones<br/>
          <strong>Phase 2:</strong> Fix workStation-car data inconsistencies<br/>
          Safe for production use - maintains complete audit trail.
        </p>
        <button
          onClick={handleAutoCleanup}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isProcessing ? '🔄 Scanning Both Collections...' : '🏭 Run Factory Cleanup'}
        </button>
      </div>

      {/* Manual Removal */}
      <div className="space-y-4 mb-6 border-t pt-6">
        <h4 className="font-medium text-gray-900">Manual Car Removal</h4>
        <p className="text-sm text-gray-600">
          Force remove a specific car from its current zone (use when auto cleanup doesn't work).
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={manualVin}
            onChange={(e) => setManualVin(e.target.value)}
            placeholder="Enter VIN (e.g., PRUPBGFB35M301768)"
            className="flex-1 p-2 border border-gray-300 rounded-lg"
            disabled={isProcessing}
          />
          <button
            onClick={handleForceRemove}
            disabled={isProcessing || !manualVin.trim()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? '🔄' : '🗑️ Force Remove'}
          </button>
        </div>
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
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h5 className="text-yellow-800 font-medium mb-2">🏭 Factory Issues This Fixes:</h5>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• <strong>Zone Data Inconsistency:</strong> Zone shows a car but "No Car in Zone" appears when clicked</li>
          <li>• <strong>Duplicate Assignments:</strong> Multiple cars appear in the same zone</li>
          <li>• <strong>Workflow Blockage:</strong> Car completion button doesn't work</li>
          <li>• <strong>Production Floor Mismatch:</strong> Zone appears occupied but worker says it's empty</li>
          <li>• <strong>Database Sync Issues:</strong> WorkStation and Car collections out of sync</li>
        </ul>
        <p className="text-yellow-800 text-sm mt-3 font-medium">
          ⚡ Critical for production environments - Run immediately when issues occur
        </p>
      </div>
    </div>
  );
});