// Tool Check Dashboard - Compact manager view showing zone results (better than Excel!)
import { useState, useEffect } from 'react';
import { ToolCheckDashboardData } from '../../types';
import { toolCheckService } from '../../services/toolCheckService';
import { taskService } from '../../services/taskService';

interface ToolCheckDashboardProps {
  taskId: string;
  onClose?: () => void;
  onTaskDeleted?: () => void;
}

export function ToolCheckDashboard({ taskId, onClose, onTaskDeleted }: ToolCheckDashboardProps) {
  const [dashboardData, setDashboardData] = useState<ToolCheckDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [taskId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await toolCheckService.getToolCheckDashboard(taskId);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      setDeleting(true);
      await taskService.deleteTask(taskId);
      setShowDeleteConfirm(false);

      // Notify parent components that task was deleted
      onTaskDeleted?.();
      onClose?.(); // Go back to task list
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-lg font-medium">No data found</h3>
        <p>Tool check data could not be loaded</p>
      </div>
    );
  }

  const completedZones = Object.values(dashboardData.completionStatus).filter(z => z.completed).length;
  const totalZones = dashboardData.zones.length;

  // Dashboard data loaded successfully

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">🔧 Tool Check Results</h3>
          <p className="text-sm text-gray-600 mt-1">
            Task ID: {taskId} • {completedZones}/{totalZones} zones completed
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            disabled={deleting}
          >
            {deleting ? '🗑️ Deleting...' : '🗑️ Delete Task'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Task Completion Status */}
      {completedZones === totalZones ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-500 text-2xl mr-3">✅</div>
            <div>
              <h4 className="font-semibold text-green-900">Task Completed!</h4>
              <p className="text-sm text-green-700">All {totalZones} zones have submitted their tool check data.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-blue-500 text-2xl mr-3">⏳</div>
            <div>
              <h4 className="font-semibold text-blue-900">Task In Progress</h4>
              <p className="text-sm text-blue-700">{completedZones} of {totalZones} zones completed. Waiting for remaining zones.</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-600">{completedZones}/{totalZones}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              completedZones === totalZones ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${(completedZones / totalZones) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Completed Zone Results */}
      {completedZones > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Completed Zone Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.keys(dashboardData.completionStatus)
              .filter(zoneKey => dashboardData.completionStatus[parseInt(zoneKey)].completed)
              .map(zoneKey => {
                const zone = parseInt(zoneKey);
                const completion = dashboardData.completionStatus[zone];
                const submission = dashboardData.submissions.find(s => s.zone === zone);
            
            return (
              <div key={zone} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Zone Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-gray-900">Zone {zone}</span>
                    {(() => {
                      const hasProblems = dashboardData.items.some(item => {
                        const result = dashboardData.summaryGrid[item.id]?.[zone];
                        return result && result.status !== 'ok';
                      });

                      return hasProblems ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                          ⚠️ Problems Found
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          ✅ All Good
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Worker & Time Info */}
                <div className="text-xs text-gray-500 mb-3">
                  <div>By: {completion.workerEmail}</div>
                  <div>At: {completion.submittedAt?.toLocaleString()}</div>
                </div>

                {/* Tool Results */}
                <div className="space-y-3">
                  {dashboardData.items.length === 0 && (
                    <div className="text-gray-500 text-sm italic">No tool items configured</div>
                  )}
                  {dashboardData.items.map(item => {
                    const result = dashboardData.summaryGrid[item.id]?.[zone];

                    // Skip rendering if no result found
                    if (!result) {
                      return (
                        <div key={item.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 font-medium text-sm">
                              {item.name}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              No Data
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-700 font-medium text-sm">
                            {item.name}
                          </span>
                          {result.status === 'ok' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              ✅ Checked
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              ❌ Problem
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Count:</span>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold ${
                              result.status === 'ok' ? 'text-green-600' :
                              result.status === 'low' ? 'text-orange-600' :
                              result.status === 'high' ? 'text-orange-600' :
                              result.status === 'missing' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {result.actualCount}
                            </span>
                            <span className="text-gray-400">/{result.expectedCount}</span>
                            {result.status === 'low' && (
                              <span className="text-orange-600 text-xs bg-orange-50 px-1 rounded">Too Low</span>
                            )}
                            {result.status === 'high' && (
                              <span className="text-orange-600 text-xs bg-orange-50 px-1 rounded">Too High</span>
                            )}
                            {result.status === 'missing' && (
                              <span className="text-red-600 text-xs bg-red-50 px-1 rounded">Missing</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Extra Fields */}
                {submission?.items.some(item => item.extraFieldValue) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-600 font-medium mb-1">Extra Data:</div>
                    {submission.items
                      .filter(item => item.extraFieldValue)
                      .map(item => {
                        const configItem = dashboardData.items.find(i => i.id === item.itemId);
                        return (
                          <div key={item.itemId} className="text-xs text-gray-600">
                            {configItem?.extraField?.name}: {item.extraFieldValue}
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Pending Zones - Only show when there are actually pending zones */}
      {completedZones < totalZones && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">⏳ Pending Zones</h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(dashboardData.completionStatus)
              .filter(zoneKey => !dashboardData.completionStatus[parseInt(zoneKey)].completed)
              .map(zoneKey => (
                <span
                  key={zoneKey}
                  className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium"
                >
                  Zone {zoneKey}
                </span>
              ))
            }
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">📊 Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Total Items</div>
            <div className="font-bold text-lg text-blue-600">
              {dashboardData.items.length}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Zones Completed</div>
            <div className="font-bold text-lg text-green-600">
              {completedZones}/{totalZones}
            </div>
          </div>
          <div>
            <div className="text-gray-600">OK Items</div>
            <div className="font-bold text-lg text-green-600">
              {dashboardData.submissions.reduce((total, sub) => 
                total + sub.items.filter(item => item.status === 'ok').length, 0
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Issues Found</div>
            <div className="font-bold text-lg text-orange-600">
              {dashboardData.submissions.reduce((total, sub) => 
                total + sub.items.filter(item => ['low', 'high', 'missing'].includes(item.status)).length, 0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="text-red-500 text-3xl mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete this tool check task? This will permanently remove:
              </p>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                <li>All submitted tool check data</li>
                <li>Zone completion records</li>
                <li>Task history and progress</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ToolCheckDashboard;