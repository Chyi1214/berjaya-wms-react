// Recent Counts Component - Shows recent inventory count entries
import { InventoryCountEntry } from '../types';

interface RecentCountsProps {
  counts: InventoryCountEntry[];
  onClear?: () => void;
}

export function RecentCounts({ counts, onClear }: RecentCountsProps) {
  if (counts.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📋 Recent Counts
        </h3>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📭</div>
          <p>No counts recorded yet</p>
          <p className="text-sm">Use the form above to start counting inventory</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900">
          📋 Recent Counts ({counts.length})
        </h3>
        {onClear && counts.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {counts.map((count, index) => (
          <div
            key={index}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {count.sku}
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {count.amount}
                  </span>
                  <span className="text-gray-500">pcs</span>
                </div>
                
                <p className="text-gray-700 font-medium mb-1">
                  {count.itemName}
                </p>
                
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📍 {count.location}</p>
                  <p>👤 {count.countedBy}</p>
                  <p>🕒 {count.timestamp.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="ml-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {counts.length > 5 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            💡 <span className="font-medium">Tip:</span> In production, these counts would sync to Firebase automatically
          </p>
        </div>
      )}
    </div>
  );
}

export default RecentCounts;