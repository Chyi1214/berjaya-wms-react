// Overview Tab - Dashboard with stats cards for inventory management

interface OverviewTabProps {
  checkedCount: number;
  transactionCount: number;
  itemCount: number;
  expectedCount: number;
  yesterdayCount: number;
}

export function OverviewTab({ 
  checkedCount, 
  transactionCount, 
  itemCount,
  expectedCount,
  yesterdayCount 
}: OverviewTabProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-6">📊</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Inventory Overview</h3>
      <p className="text-gray-500 mb-8">Manager insights and quick actions for inventory management</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
        {/* Checked Items Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-blue-600 text-2xl mb-2">📋</div>
          <h4 className="font-medium text-blue-900">Checked Items</h4>
          <p className="text-blue-700 text-2xl font-bold">{checkedCount}</p>
          <p className="text-blue-700 text-sm mt-1">Items counted today</p>
        </div>
        
        {/* Expected Items Card */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="text-orange-600 text-2xl mb-2">📊</div>
          <h4 className="font-medium text-orange-900">Expected</h4>
          <p className="text-orange-700 text-2xl font-bold">{expectedCount}</p>
          <p className="text-orange-700 text-sm mt-1">Calculated expected</p>
        </div>
        
        {/* Transactions Card */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-purple-600 text-2xl mb-2">🔄</div>
          <h4 className="font-medium text-purple-900">Transactions</h4>
          <p className="text-purple-700 text-2xl font-bold">{transactionCount}</p>
          <p className="text-purple-700 text-sm mt-1">Total transactions</p>
        </div>
        
        {/* Yesterday Results Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-green-600 text-2xl mb-2">🗓️</div>
          <h4 className="font-medium text-green-900">Yesterday</h4>
          <p className="text-green-700 text-2xl font-bold">{yesterdayCount}</p>
          <p className="text-green-700 text-sm mt-1">Previous period</p>
        </div>
        
        {/* Item Master Card */}
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
          <div className="text-pink-600 text-2xl mb-2">📦</div>
          <h4 className="font-medium text-pink-900">Item Master</h4>
          <p className="text-pink-700 text-2xl font-bold">{itemCount}</p>
          <p className="text-pink-700 text-sm mt-1">Items in catalog</p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
        <h4 className="font-medium text-blue-900 mb-2">📊 Eugene's v2.0.0 Workflow</h4>
        <div className="text-blue-700 text-sm space-y-1">
          <p><strong>Overview:</strong> View all inventory statistics at a glance</p>
          <p><strong>Process:</strong> Check items → Compare with expected → Conclude period</p>
          <p><strong>Navigation:</strong> Use tabs above to access specific inventory functions</p>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;