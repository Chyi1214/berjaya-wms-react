// Tool Check Dashboard - Compact manager view showing zone results (better than Excel!)
import { useState, useEffect } from 'react';
import { ToolCheckDashboardData } from '../../types';
import { toolCheckService } from '../../services/toolCheckService';

interface ToolCheckDashboardProps {
  taskId: string;
  onClose?: () => void;
}

export function ToolCheckDashboard({ taskId, onClose }: ToolCheckDashboardProps) {
  const [dashboardData, setDashboardData] = useState<ToolCheckDashboardData | null>(null);
  const [loading, setLoading] = useState(false);

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
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-600">{completedZones}/{totalZones}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedZones / totalZones) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Compact Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dashboardData.zones
          .filter(zone => dashboardData.completionStatus[zone]?.completed)
          .map(zone => {
            const completion = dashboardData.completionStatus[zone];
            const submission = dashboardData.submissions.find(s => s.zone === zone);
            
            return (
              <div key={zone} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Zone Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg text-gray-900">Zone {zone}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      ✓ Complete
                    </span>
                  </div>
                </div>

                {/* Worker & Time Info */}
                <div className="text-xs text-gray-500 mb-3">
                  <div>By: {completion.workerEmail}</div>
                  <div>At: {completion.submittedAt?.toLocaleString()}</div>
                </div>

                {/* Tool Results */}
                <div className="space-y-2">
                  {dashboardData.items.map(item => {
                    const result = dashboardData.summaryGrid[item.id]?.[zone];
                    if (!result) return null;

                    const statusColor = 
                      result.status === 'ok' ? 'text-green-600' :
                      result.status === 'low' ? 'text-yellow-600' :
                      result.status === 'high' ? 'text-orange-600' :
                      result.status === 'missing' ? 'text-red-600' :
                      'text-gray-600';

                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate flex-1 mr-2">
                          {item.name}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className={`font-medium ${statusColor}`}>
                            {result.actualCount}
                          </span>
                          <span className="text-gray-400">/{result.expectedCount}</span>
                          {result.status === 'ok' ? (
                            <span className="text-green-600 text-xs">✓</span>
                          ) : result.status === 'low' ? (
                            <span className="text-yellow-600 text-xs">↓</span>
                          ) : result.status === 'high' ? (
                            <span className="text-orange-600 text-xs">↑</span>
                          ) : result.status === 'missing' ? (
                            <span className="text-red-600 text-xs">✗</span>
                          ) : null}
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

      {/* Pending Zones */}
      {Object.keys(dashboardData.completionStatus).some(zone => !dashboardData.completionStatus[parseInt(zone)].completed) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">⏳ Pending Zones</h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(dashboardData.completionStatus)
              .filter(zone => !dashboardData.completionStatus[parseInt(zone)].completed)
              .map(zone => (
                <span
                  key={zone}
                  className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium"
                >
                  Zone {zone}
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
    </div>
  );
}

export default ToolCheckDashboard;