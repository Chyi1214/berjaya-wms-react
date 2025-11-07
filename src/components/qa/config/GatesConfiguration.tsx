// Gates Configuration Component - Manage QA gates
import { useState, useEffect } from 'react';
import { gateService } from '../../../services/gateService';
import type { QAGate, CreateGateInput } from '../../../types/gate';
import { createModuleLogger } from '../../../services/logger';

const logger = createModuleLogger('GatesConfiguration');

export default function GatesConfiguration() {
  const [gates, setGates] = useState<QAGate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Form states
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGateName, setNewGateName] = useState('');
  const [newGateDescription, setNewGateDescription] = useState('');

  // Edit states
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [editGateName, setEditGateName] = useState('');
  const [editGateDescription, setEditGateDescription] = useState('');

  // Load gates on mount
  useEffect(() => {
    loadGates();
  }, []);

  const loadGates = async () => {
    setIsLoading(true);
    try {
      const allGates = await gateService.getAllGates();
      setGates(allGates);

      if (allGates.length === 0) {
        setStatusMessage('No gates configured. Click "Initialize Default Gate" to get started.');
      }
    } catch (error) {
      logger.error('Failed to load gates:', error);
      setStatusMessage('❌ Failed to load gates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeDefault = async () => {
    setIsInitializing(true);
    setStatusMessage('Initializing default gate...');
    try {
      await gateService.initializeDefaultGates();
      await loadGates();
      setStatusMessage('✅ Default gate initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize default gate:', error);
      setStatusMessage('❌ Failed to initialize default gate');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddGate = async () => {
    if (!newGateName.trim()) {
      setStatusMessage('❌ Gate name is required');
      return;
    }

    try {
      const input: CreateGateInput = {
        gateName: newGateName,
        description: newGateDescription,
      };
      await gateService.createGate(input);
      await loadGates();

      // Reset form
      setIsAddingNew(false);
      setNewGateName('');
      setNewGateDescription('');
      setStatusMessage('✅ Gate added successfully');
    } catch (error) {
      logger.error('Failed to add gate:', error);
      setStatusMessage('❌ Failed to add gate');
    }
  };

  const handleStartEdit = (gate: QAGate) => {
    setEditingGateId(gate.gateId);
    setEditGateName(gate.gateName);
    setEditGateDescription(gate.description || '');
  };

  const handleSaveEdit = async (gateId: string) => {
    if (!editGateName.trim()) {
      setStatusMessage('❌ Gate name is required');
      return;
    }

    try {
      await gateService.updateGate(gateId, {
        gateName: editGateName,
        description: editGateDescription,
      });
      await loadGates();

      setEditingGateId(null);
      setEditGateName('');
      setEditGateDescription('');
      setStatusMessage('✅ Gate updated successfully');
    } catch (error) {
      logger.error('Failed to update gate:', error);
      setStatusMessage('❌ Failed to update gate');
    }
  };

  const handleCancelEdit = () => {
    setEditingGateId(null);
    setEditGateName('');
    setEditGateDescription('');
  };

  const handleToggleActive = async (gate: QAGate) => {
    try {
      await gateService.updateGate(gate.gateId, {
        isActive: !gate.isActive,
      });
      await loadGates();
      setStatusMessage(`✅ Gate ${gate.isActive ? 'disabled' : 'enabled'}`);
    } catch (error) {
      logger.error('Failed to toggle gate status:', error);
      setStatusMessage('❌ Failed to update gate status');
    }
  };

  const handleDeleteGate = async (gate: QAGate) => {
    if (!confirm(`Are you sure you want to delete gate "${gate.gateName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await gateService.deleteGate(gate.gateId);
      await loadGates();
      setStatusMessage('✅ Gate deleted successfully');
    } catch (error) {
      logger.error('Failed to delete gate:', error);
      setStatusMessage('❌ Failed to delete gate');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading gates...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">QA Gates Configuration</h3>
        <p className="text-gray-600">
          Manage quality assurance gates. Workers will select a gate before starting an inspection.
        </p>
      </div>

      {/* Initialize Default Gate Button (only shown when no gates exist) */}
      {gates.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Get Started</h4>
          <p className="text-blue-800 mb-4">
            No gates configured yet. Initialize a default gate to get started.
          </p>
          <button
            onClick={handleInitializeDefault}
            disabled={isInitializing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isInitializing ? 'Initializing...' : 'Initialize Default Gate'}
          </button>
        </div>
      )}

      {/* Gates List */}
      {gates.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Configured Gates</h4>
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
            >
              ➕ Add Gate
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {gates.map(gate => (
              <div
                key={gate.gateId}
                className={`p-4 ${!gate.isActive ? 'bg-gray-50 opacity-60' : ''}`}
              >
                {editingGateId === gate.gateId ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gate Name
                      </label>
                      <input
                        type="text"
                        value={editGateName}
                        onChange={(e) => setEditGateName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., CP8, Z001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editGateDescription}
                        onChange={(e) => setEditGateDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(gate.gateId)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Gate {gate.gateIndex}
                        </span>
                        <h5 className="text-lg font-semibold text-gray-900">
                          {gate.gateName}
                        </h5>
                        {!gate.isActive && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      {gate.description && (
                        <p className="text-sm text-gray-600 mt-1">{gate.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(gate)}
                        className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-lg"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(gate)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          gate.isActive
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {gate.isActive ? '🔒 Disable' : '🔓 Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteGate(gate)}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Gate Form */}
      {isAddingNew && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">Add New Gate</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gate Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newGateName}
                onChange={(e) => setNewGateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., CP8, CP7, Z001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newGateDescription}
                onChange={(e) => setNewGateDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddGate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Add Gate
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewGateName('');
                  setNewGateDescription('');
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg ${
            statusMessage.startsWith('✅')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : statusMessage.startsWith('❌')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">How Gates Work</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Each gate represents a quality checkpoint (e.g., CP8, CP7, Z001)</li>
          <li>Workers select a gate before starting an inspection</li>
          <li>All gates share the same checklist (positions and items)</li>
          <li>Gate Index is used internally for ordering and future access control</li>
          <li>Disabled gates won't appear in the worker's selection list</li>
        </ul>
      </div>
    </div>
  );
}
