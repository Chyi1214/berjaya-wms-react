// Batch Configuration Card - Manager controls for batch allocation system
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
  const [editing, setEditing] = useState(false);
  const [activeBatch, setActiveBatch] = useState('');
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [newBatch, setNewBatch] = useState('');
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

      let batchConfig = await batchAllocationService.getBatchConfig();

      if (!batchConfig) {
        // Initialize default configuration
        await batchAllocationService.initializeDefaultConfig();
        batchConfig = await batchAllocationService.getBatchConfig();
      }

      if (batchConfig) {
        setConfig(batchConfig);
        setActiveBatch(batchConfig.activeBatch);
        setAvailableBatches([...batchConfig.availableBatches]);
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

    if (!activeBatch || availableBatches.length === 0) {
      setError('Active batch and available batches are required');
      return;
    }

    if (!availableBatches.includes(activeBatch)) {
      setError('Active batch must be in available batches list');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await batchAllocationService.saveBatchConfig({
        activeBatch,
        availableBatches,
        updatedBy: user.email
      });

      setSuccess('Batch configuration saved successfully');
      setEditing(false);
      await loadConfig(); // Reload to get updated data
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

  const handleCancel = () => {
    if (config) {
      setActiveBatch(config.activeBatch);
      setAvailableBatches([...config.availableBatches]);
    }
    setEditing(false);
    setError(null);
    setNewBatch('');
  };

  const handleAddBatch = () => {
    if (!newBatch.trim()) return;

    const batchId = newBatch.trim().toUpperCase();
    if (availableBatches.includes(batchId)) {
      setError(`Batch ${batchId} already exists`);
      return;
    }

    setAvailableBatches(prev => [...prev, batchId].sort());
    setNewBatch('');
    setError(null);
  };

  const handleRemoveBatch = (batchId: string) => {
    if (batchId === activeBatch) {
      setError('Cannot remove the active batch');
      return;
    }

    setAvailableBatches(prev => prev.filter(id => id !== batchId));
    setError(null);
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-gray-500">Loading batch configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">⚙️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Batch Allocation Settings</h3>
        <p className="text-sm text-gray-500">
          Configure default batch for scan-in operations and manage available batches
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
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {!editing ? (
        // Display Mode
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Batch (Default for Scan-In)
                </label>
                <div className="text-2xl font-bold text-blue-600">
                  {config?.activeBatch || 'Not Set'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Batches
                </label>
                <div className="flex flex-wrap gap-2">
                  {config?.availableBatches.map(batchId => (
                    <span
                      key={batchId}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        batchId === config?.activeBatch
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {batchId}
                      {batchId === config?.activeBatch && ' (Active)'}
                    </span>
                  )) || (
                    <span className="text-gray-500 text-sm">No batches configured</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {config && (
            <div className="text-xs text-gray-500 text-center">
              Last updated: {config.updatedAt.toLocaleString()} by {config.updatedBy}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setEditing(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Configure Batches
            </button>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-6">
          {/* Active Batch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active Batch (Default for Scan-In)
            </label>
            <select
              value={activeBatch}
              onChange={(e) => setActiveBatch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select active batch...</option>
              {availableBatches.map(batchId => (
                <option key={batchId} value={batchId}>
                  Batch {batchId}
                </option>
              ))}
            </select>
          </div>

          {/* Available Batches Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Batches
            </label>

            {/* Add New Batch */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newBatch}
                onChange={(e) => setNewBatch(e.target.value)}
                placeholder="Enter batch ID (e.g., 807)"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddBatch()}
              />
              <button
                onClick={handleAddBatch}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Add
              </button>
            </div>

            {/* Current Batches */}
            <div className="space-y-2">
              {availableBatches.map(batchId => (
                <div
                  key={batchId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    batchId === activeBatch
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <span className="font-medium">
                    Batch {batchId}
                    {batchId === activeBatch && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                  </span>
                  {batchId !== activeBatch && (
                    <button
                      onClick={() => handleRemoveBatch(batchId)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});