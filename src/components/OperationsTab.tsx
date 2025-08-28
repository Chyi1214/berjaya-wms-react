// Operations Tab - Full Batch Management Interface
import { useAuth } from '../contexts/AuthContext';
import { BatchManagementCard } from './operations';

interface OperationsTabProps {
  onRefresh?: () => void;
}

export function OperationsTab({ onRefresh }: OperationsTabProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">🏭 Batch Management Operations</h2>
        <p className="text-sm text-gray-600 mt-2">
          Manage production batches with data preview - VIN by VIN, component by component
        </p>
      </div>

      {/* Batch-Centric Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar - Upload & Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <BatchManagementCard 
            user={user}
            onRefresh={onRefresh}
          />
          
          {/* Quick Stats */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">📊 Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Batches</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total VINs</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Car Types</span>
                <span className="font-medium">--</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Batch Data Preview */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Batch Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sample Batch 603 Preview */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">📦 Batch 603</h3>
                  <p className="text-sm text-gray-500">Production Batch 603</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">🟢 Healthy</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Car Type:</span>
                  <span className="font-medium">TK1_Red_High</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cars:</span>
                  <span className="font-medium">3 VINs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Components:</span>
                  <span className="font-medium">3 types</span>
                </div>
              </div>

              {/* VIN List - Each VIN gets its own row */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">🚗 Vehicle VINs:</h4>
                <div className="space-y-1">
                  <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono">VIN001603</div>
                  <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono">VIN002603</div>
                  <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono">VIN003603</div>
                </div>
              </div>

              {/* Component Requirements */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">🔧 Components Required:</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>A001 - Engine Part A</span>
                    <span className="font-medium">50 units</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>B001 - Body Panel B</span>
                    <span className="font-medium">25 units</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>C001 - Control Module C</span>
                    <span className="font-medium">10 units</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Batch 604 Preview */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">📦 Batch 604</h3>
                  <p className="text-sm text-gray-500">Production Batch 604</p>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">🟡 Warning</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Car Type:</span>
                  <span className="font-medium">TK1_Red_Low</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cars:</span>
                  <span className="font-medium">2 VINs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Components:</span>
                  <span className="font-medium">2 types</span>
                </div>
              </div>

              {/* VIN List */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">🚗 Vehicle VINs:</h4>
                <div className="space-y-1">
                  <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono">VIN001604</div>
                  <div className="bg-gray-50 px-2 py-1 rounded text-xs font-mono">VIN002604</div>
                </div>
              </div>

              {/* Component Requirements */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">🔧 Components Required:</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>A001 - Engine Part A</span>
                    <span className="font-medium">30 units</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>B001 - Body Panel B</span>
                    <span className="font-medium text-red-600">15 units ⚠️</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Batch Table View */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">📋 Batch Details Table</h3>
              <div className="text-sm text-gray-500">Sample data preview</div>
            </div>
            
            {/* Improved Table with VIN-per-row design */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Zone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Components</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td rowSpan={3} className="px-4 py-3 text-sm font-medium text-blue-600 border-r">603</td>
                    <td rowSpan={3} className="px-4 py-3 text-sm text-gray-900 border-r">TK1_Red_High</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-900">VIN001603</td>
                    <td className="px-4 py-3"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">In Production</span></td>
                    <td className="px-4 py-3 text-sm text-gray-900">Zone 5</td>
                    <td rowSpan={3} className="px-4 py-3 text-xs text-gray-600">A001×50, B001×25, C001×10</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-900">VIN002603</td>
                    <td className="px-4 py-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Zone 12</span></td>
                    <td className="px-4 py-3 text-sm text-gray-900">Zone 12</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-900">VIN003603</td>
                    <td className="px-4 py-3"><span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Planned</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">--</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-t-2">
                    <td rowSpan={2} className="px-4 py-3 text-sm font-medium text-orange-600 border-r">604</td>
                    <td rowSpan={2} className="px-4 py-3 text-sm text-gray-900 border-r">TK1_Red_Low</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-900">VIN001604</td>
                    <td className="px-4 py-3"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Material Wait</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">--</td>
                    <td rowSpan={2} className="px-4 py-3 text-xs text-gray-600">A001×30, B001×15 ⚠️</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-900">VIN002604</td>
                    <td className="px-4 py-3"><span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Planned</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">--</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              💡 <strong>Improved Design:</strong> Each VIN gets its own row for easy tracking. Components shortfall highlighted with ⚠️. 
              Real-time zone tracking shows exactly where each car is in production.
            </div>
          </div>

          {/* Eugene's Vision - More compact */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">💡 "The Soul of Factory Management" - Eugene</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-800">🎯 Batch Health</div>
                <p className="text-blue-700">Can batch complete?</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-800">🔄 Cross Impact</div>
                <p className="text-blue-700">603 uses 604's parts?</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-800">🚗 Auto Consume</div>
                <p className="text-blue-700">Zone + car = BOM used</p>
              </div>
              <div className="bg-white rounded p-2 border border-blue-100">
                <div className="font-medium text-blue-800">📈 Real-time</div>
                <p className="text-blue-700">Live production flow</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}