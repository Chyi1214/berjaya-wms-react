// Zone Initializer - V8.1.0 One-time migration component
import { useState } from 'react';
import { zoneConfigService } from '../../services/zoneConfigService';

export function ZoneInitializer() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    if (!window.confirm(
      'Initialize default zone configurations?\n\n' +
      'This will create:\n' +
      '• Zones 1-23 as Production zones\n' +
      '• Zone 99 as Maintenance zone (CP7/CP8)\n\n' +
      'This is safe to run multiple times (only creates missing zones).'
    )) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('Initializing zones...');

    try {
      await zoneConfigService.initializeDefaultZones();
      setStatus('✅ Zone configurations initialized successfully!');

      // Load and display created zones
      const configs = await zoneConfigService.getAllZoneConfigs();
      setStatus(
        `✅ Initialized ${configs.length} zones:\n` +
        `• Production zones: ${configs.filter(c => c.type === 'production').length}\n` +
        `• Maintenance zones: ${configs.filter(c => c.type === 'maintenance').length}`
      );
    } catch (err) {
      console.error('Failed to initialize zones:', err);
      setError(`Failed to initialize zones: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <span className="text-2xl">🏭</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Initialize Zone Configurations</h3>
          <p className="text-sm text-gray-600">V8.1.0 - Dynamic Zone System Migration</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">What this does:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Creates zone configuration database</li>
            <li>• Initializes zones 1-23 as production zones</li>
            <li>• Initializes zone 99 as maintenance zone (CP7/CP8)</li>
            <li>• Safe to run multiple times (won't duplicate)</li>
          </ul>
        </div>

        {status && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <pre className="text-sm text-green-800 whitespace-pre-wrap">{status}</pre>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleInitialize}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Initializing...
            </div>
          ) : (
            'Initialize Zone Configurations'
          )}
        </button>
      </div>
    </div>
  );
}

export default ZoneInitializer;
