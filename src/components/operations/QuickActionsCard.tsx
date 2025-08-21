import { memo } from 'react';

interface QuickActionsCardProps {
  isDevAdmin: boolean;
  onRefresh?: () => void;
}

export const QuickActionsCard = memo(function QuickActionsCard({
  isDevAdmin,
  onRefresh,
}: QuickActionsCardProps) {
  if (!isDevAdmin) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">⚡ Quick Actions (DevAdmin)</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={onRefresh}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          🔄 Refresh Data
        </button>
        <button
          disabled
          className="px-3 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
        >
          📊 Generate Report
        </button>
        <button
          disabled
          className="px-3 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
        >
          🧹 Clean Cache
        </button>
        <button
          disabled
          className="px-3 py-2 text-sm bg-gray-100 text-gray-400 border border-gray-200 rounded cursor-not-allowed"
        >
          ⚙️ System Config
        </button>
      </div>
    </div>
  );
});