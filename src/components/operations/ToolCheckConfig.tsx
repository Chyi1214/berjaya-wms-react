// Tool Check Configuration - Manager interface for creating and managing tool check tasks
import { useState, useEffect } from 'react';
import { type ToolCheckConfig, ToolCheckItem, CreateToolCheckTaskRequest } from '../../types';
import { toolCheckService } from '../../services/toolCheckService';
import { useAuth } from '../../contexts/AuthContext';

interface ToolCheckConfigProps {
  onRefresh?: () => void;
}

export function ToolCheckConfig({ onRefresh }: ToolCheckConfigProps) {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<ToolCheckConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ToolCheckConfig | null>(null);

  // Load existing configurations
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const allConfigs = await toolCheckService.getToolCheckConfigs();
      setConfigs(allConfigs);
    } catch (error) {
      console.error('Failed to load tool check configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (configId: string, targetZones?: number[]) => {
    try {
      if (!user) return;
      
      const request: CreateToolCheckTaskRequest = {
        configId,
        triggerType: 'manual',
        targetZones,
        note: 'Manual trigger from manager'
      };

      await toolCheckService.createToolCheckTask(request, user.email);
      alert('Tool check task sent to workers!');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create tool check task:', error);
      alert('Failed to create task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🔧 Tool Check Configuration</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure tool inventory checks for production zones
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          ➕ New Tool Check
        </button>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading configurations...</span>
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">🔧</div>
            <h3 className="text-lg font-medium">No tool checks configured</h3>
            <p>Create your first tool check configuration to get started</p>
          </div>
        ) : (
          configs.map((config) => (
            <div
              key={config.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{config.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      config.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {config.schedule?.enabled && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {config.schedule.frequency} {config.schedule.time}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{config.description}</p>
                  
                  {/* Items Preview */}
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">Items to check:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {config.items.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {item.name} (Exp: {item.expectedCount})
                          {item.extraField && (
                            <span className="ml-1 text-blue-600">+{item.extraField.name}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Target Zones */}
                  <div>
                    <span className="text-sm font-medium text-gray-700">Target zones:</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {config.targetZones.join(', ')}
                    </span>
                  </div>
                </div>

                <div className="ml-4 flex flex-col space-y-2">
                  <button
                    onClick={() => handleCreateTask(config.id)}
                    className="btn-primary text-sm px-3 py-1"
                    disabled={!config.isActive}
                  >
                    📤 Send Now
                  </button>
                  <button
                    onClick={() => setEditingConfig(config)}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    ⚙️ Configure
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Created: {config.createdAt.toLocaleString()} by {config.createdBy}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingConfig) && (
        <ToolCheckFormModal
          config={editingConfig}
          onClose={() => {
            setShowCreateForm(false);
            setEditingConfig(null);
          }}
          onSave={async (configData) => {
            try {
              if (!user) return;
              await toolCheckService.saveToolCheckConfig(configData, user.email);
              await loadConfigs();
              setShowCreateForm(false);
              setEditingConfig(null);
            } catch (error) {
              console.error('Failed to save config:', error);
              alert('Failed to save configuration');
            }
          }}
        />
      )}
    </div>
  );
}

// Tool Check Form Modal Component
interface ToolCheckFormModalProps {
  config: ToolCheckConfig | null;
  onClose: () => void;
  onSave: (config: Omit<ToolCheckConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

function ToolCheckFormModal({ config, onClose, onSave }: ToolCheckFormModalProps) {
  const [name, setName] = useState(config?.name || '');
  const [description, setDescription] = useState(config?.description || '');
  const [isActive, setIsActive] = useState(config?.isActive ?? true);
  const [items, setItems] = useState<ToolCheckItem[]>(config?.items || []);
  const [targetZones, setTargetZones] = useState<number[]>(config?.targetZones || [1]);
  
  // Scheduling state
  const [scheduleEnabled, setScheduleEnabled] = useState(config?.schedule?.enabled ?? false);
  const [scheduleTime, setScheduleTime] = useState(config?.schedule?.time || '08:00');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly'>((config?.schedule?.frequency as 'daily' | 'weekly') || 'daily');

  const addItem = () => {
    const newItem: ToolCheckItem = {
      id: `item_${Date.now()}`,
      name: '',
      expectedCount: 1
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<ToolCheckItem>) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const configData = {
      name: name.trim(),
      description: description.trim(),
      isActive,
      items: items.filter(item => item.name.trim()),
      targetZones,
      createdBy: '', // Will be set by the service
      schedule: scheduleEnabled ? {
        enabled: true,
        time: scheduleTime,
        frequency: scheduleFrequency,
        weekdays: scheduleFrequency === 'daily' ? [1,2,3,4,5] : [1]
      } : undefined
    };

    onSave(configData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-900">
              {config ? 'Edit Tool Check' : 'Create Tool Check'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Daily Tool Check"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={2}
                placeholder="Check tools before starting work"
              />
            </div>

            {/* Target Zones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Zones *
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map(zone => (
                  <label key={zone} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={targetZones.includes(zone)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetZones([...targetZones, zone]);
                        } else {
                          setTargetZones(targetZones.filter(z => z !== zone));
                        }
                      }}
                      className="mr-1"
                    />
                    {zone}
                  </label>
                ))}
              </div>
            </div>

            {/* Items Configuration */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Items to Check *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-primary text-sm px-3 py-1"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, { name: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Screwdriver"
                          required
                        />
                      </div>
                      
                      <div>
                        <input
                          type="number"
                          value={item.expectedCount}
                          onChange={(e) => updateItem(index, { expectedCount: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Expected count"
                          min="0"
                          required
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={!!item.extraField}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateItem(index, {
                                  extraField: {
                                    name: 'Dial Reading',
                                    type: 'text',
                                    placeholder: '0.01mm'
                                  }
                                });
                              } else {
                                updateItem(index, { extraField: undefined });
                              }
                            }}
                            className="mr-1"
                          />
                          Extra Field
                        </label>
                        
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {item.extraField && (
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={item.extraField.name}
                          onChange={(e) => updateItem(index, {
                            extraField: { ...item.extraField!, name: e.target.value }
                          })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Field name (e.g., Dial Reading)"
                        />
                        <input
                          type="text"
                          value={item.extraField.placeholder}
                          onChange={(e) => updateItem(index, {
                            extraField: { ...item.extraField!, placeholder: e.target.value }
                          })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Placeholder (e.g., 0.01mm)"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable Automatic Scheduling
              </label>

              {scheduleEnabled && (
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Frequency</label>
                      <select
                        value={scheduleFrequency}
                        onChange={(e) => setScheduleFrequency(e.target.value as 'daily' | 'weekly')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {config ? 'Update' : 'Create'} Tool Check
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}