// Batch Configuration Card - Manager controls for scanner default batch
import { memo, useState, useEffect } from 'react';
import { batchAllocationService } from '../../services/batchAllocationService';
import { BatchConfig } from '../../types/inventory';

interface BatchConfigCardProps {
  user: { email: string } | null;
  onRefresh?: () => void;
}

export const BatchConfigCard = memo(function BatchConfigCard({
  user,
  onRefresh
}: BatchConfigCardProps) {
  const [config, setConfig] = useState<BatchConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedInbound, setSelectedInbound] = useState('');
  const [selectedOutbound, setSelectedOutbound] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const batchConfig = await batchAllocationService.getBatchConfig();

      if (batchConfig) {
        setConfig(batchConfig);
        setSelectedInbound(batchConfig.inboundBatch);
        setSelectedOutbound(batchConfig.outboundBatch);
      }
    } catch (err) {
      console.error('Failed to load batch configuration:', err);
      setError('Failed to load batch configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.email) {
      setError('User email is required');
      return;
    }

    if (!selectedInbound || !selectedOutbound) {
      setError('Please select both inbound and outbound batches');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await batchAllocationService.saveBatchConfig({
        inboundBatch: selectedInbound,
        outboundBatch: selectedOutbound,
        availableBatches: config?.availableBatches || [], // Not used, but required by type
        updatedBy: user.email
      });

      setSuccess('Default batches updated successfully! ✅');
      await loadConfig(); // Reload to show updated config
      onRefresh?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save batch configuration:', err);
      setError('Failed to save batch configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-gray-500">Loading batch configuration...</p>
        </div>
      </div>
    );
  }

  if (!config || config.availableBatches.length === 0) {
    return (
      <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activated Batches</h3>
          <p className="text-sm text-gray-500">
            Please activate at least one batch before configuring scanner defaults.
          </p>
        </div>
      </div>
    );
  }

  const hasChanges = selectedInbound !== config.inboundBatch || selectedOutbound !== config.outboundBatch;

  return (
    <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">⚙️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Scanner Auto-Select Settings</h3>
        <p className="text-sm text-gray-500">
          Choose which activated batch should be pre-selected in the scanner
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md">
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Default Batches Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📦 Inbound Batch
            </label>
            <div className="text-2xl font-bold text-green-600">
              Batch {config.inboundBatch}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              For receiving items
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📤 Outbound Batch
            </label>
            <div className="text-2xl font-bold text-orange-600">
              Batch {config.outboundBatch}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              For sending to production
            </p>
          </div>
        </div>

        {/* Available Activated Batches - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Available Activated Batches
          </label>
          <div className="flex flex-wrap gap-2">
            {config.availableBatches.map(batchId => (
              <span
                key={batchId}
                className={`px-3 py-2 text-sm font-medium rounded-lg border ${
                  batchId === config.inboundBatch || batchId === config.outboundBatch
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Batch {batchId}
                {batchId === config.inboundBatch && ' 📦'}
                {batchId === config.outboundBatch && ' 📤'}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 These batches are automatically fetched from activated batches. Workers can choose from any of these.
          </p>
        </div>

        {/* Change Default Batches */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Change Default Batches
          </label>
          <div className="space-y-3">
            <div className="flex gap-3 items-center">
              <label className="w-32 text-sm text-gray-700">📦 Inbound:</label>
              <select
                value={selectedInbound}
                onChange={(e) => setSelectedInbound(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                {config.availableBatches.map(batchId => (
                  <option key={batchId} value={batchId}>
                    Batch {batchId}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 items-center">
              <label className="w-32 text-sm text-gray-700">📤 Outbound:</label>
              <select
                value={selectedOutbound}
                onChange={(e) => setSelectedOutbound(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loading}
              >
                {config.availableBatches.map(batchId => (
                  <option key={batchId} value={batchId}>
                    Batch {batchId}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className={`w-full px-6 py-2 rounded-md font-medium transition-colors ${
                hasChanges && !loading
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
            </button>
          </div>
        </div>

        {/* Last Updated Info */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Last updated: {config.updatedAt.toLocaleString()} by {config.updatedBy}
        </div>
      </div>
    </div>
  );
});
