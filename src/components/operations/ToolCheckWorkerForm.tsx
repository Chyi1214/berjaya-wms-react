// Tool Check Worker Form - Production worker interface for submitting tool counts
import { useState, useEffect } from 'react';
import { Task, ToolCheckItem, ToolCheckItemResult } from '../../types';
import { toolCheckService } from '../../services/toolCheckService';
import { useAuth } from '../../contexts/AuthContext';

interface ToolCheckWorkerFormProps {
  task: Task;
  onComplete: () => void;
  onCancel: () => void;
}

export function ToolCheckWorkerForm({ task, onComplete, onCancel }: ToolCheckWorkerFormProps) {
  const { user, userRecord } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toolItems, setToolItems] = useState<ToolCheckItem[]>([]);
  const [itemResults, setItemResults] = useState<{ [itemId: string]: { count: number; extra?: string } }>({});

  // Load tool check configuration
  useEffect(() => {
    loadToolCheckConfig();
  }, [task]);

  const loadToolCheckConfig = async () => {
    try {
      if (!task.config.relatedEntities?.batchId) return;
      
      const configId = task.config.relatedEntities.batchId;
      const config = await toolCheckService.getToolCheckConfig(configId);
      
      if (config) {
        setToolItems(config.items);
        // Initialize results
        const initialResults: { [itemId: string]: { count: number; extra?: string } } = {};
        config.items.forEach(item => {
          initialResults[item.id] = { count: 0 };
        });
        setItemResults(initialResults);
      }
    } catch (error) {
      console.error('Failed to load tool check config:', error);
    }
  };

  const updateItemResult = (itemId: string, updates: { count?: number; extra?: string }) => {
    setItemResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...updates
      }
    }));
  };

  const calculateStatus = (actual: number, expected: number): 'ok' | 'low' | 'high' | 'missing' => {
    if (actual === 0) return 'missing';
    if (actual < expected) return 'low';
    if (actual > expected) return 'high';
    return 'ok';
  };

  const handleSubmit = async () => {
    try {
      if (!user || !userRecord?.zone) {
        alert('Unable to determine your zone. Please contact manager.');
        return;
      }

      setLoading(true);

      // Convert to ToolCheckItemResult format
      const results: ToolCheckItemResult[] = toolItems.map(item => {
        const result: ToolCheckItemResult = {
          itemId: item.id,
          actualCount: itemResults[item.id]?.count || 0,
          status: calculateStatus(itemResults[item.id]?.count || 0, item.expectedCount)
        };

        // Only add extraFieldValue if it exists (avoid undefined)
        if (itemResults[item.id]?.extra) {
          result.extraFieldValue = itemResults[item.id].extra;
        }

        return result;
      });

      const configId = task.config.relatedEntities?.batchId;
      if (!configId) {
        throw new Error('Tool check configuration not found');
      }

      await toolCheckService.submitToolCheck(
        task.id,
        configId,
        user.email,
        userRecord.zone,
        results
      );

      alert('Tool check completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Failed to submit tool check:', error);
      alert('Failed to submit tool check. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete = toolItems.every(item => 
    itemResults[item.id]?.count !== undefined && itemResults[item.id]?.count >= 0
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {task.config.title}
          </h2>
          <p className="text-gray-600 text-sm">
            {task.config.description}
          </p>
          {userRecord?.zone && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Zone {userRecord.zone}
              </span>
            </div>
          )}
        </div>

        {/* Tool Check Items */}
        <div className="space-y-4 mb-6">
          {toolItems.map((item) => {
            const result = itemResults[item.id];
            const status = result ? calculateStatus(result.count, item.expectedCount) : 'missing';
            
            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 transition-colors ${
                  status === 'ok' ? 'border-green-200 bg-green-50' :
                  status === 'low' || status === 'high' ? 'border-yellow-200 bg-yellow-50' :
                  status === 'missing' ? 'border-red-200 bg-red-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <span className="text-sm text-gray-500">
                        (Expected: {item.expectedCount})
                      </span>
                      {status !== 'missing' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          status === 'ok' ? 'bg-green-100 text-green-800' :
                          status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                          status === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status === 'ok' ? '✓ OK' :
                           status === 'low' ? '↓ Low' :
                           status === 'high' ? '↑ High' : status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Count Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Count *
                    </label>
                    <input
                      type="number"
                      value={result?.count || ''}
                      onChange={(e) => updateItemResult(item.id, { 
                        count: parseInt(e.target.value) || 0 
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg font-medium"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>

                  {/* Extra Field */}
                  {item.extraField && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {item.extraField.name}
                      </label>
                      <input
                        type={item.extraField.type}
                        value={result?.extra || ''}
                        onChange={(e) => updateItemResult(item.id, { 
                          extra: e.target.value 
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder={item.extraField.placeholder}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Items checked:</span>
              <span className="ml-2 font-medium">
                {Object.values(itemResults).filter(r => r.count >= 0).length} / {toolItems.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium">
                {isFormComplete ? (
                  <span className="text-green-600">Ready to submit</span>
                ) : (
                  <span className="text-yellow-600">Incomplete</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormComplete || loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              '✓ Complete Check'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ToolCheckWorkerForm;