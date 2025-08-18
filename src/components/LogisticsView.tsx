// Logistics View Component - Inventory counting for logistics team
import { User, InventoryCountEntry } from '../types';
import InventoryCountForm from './InventoryCountForm';
import RecentCounts from './RecentCounts';

interface LogisticsViewProps {
  user: User;
  onBack: () => void;
  onCountSubmit: (entry: InventoryCountEntry) => void;
  counts: InventoryCountEntry[];
  onClearCounts: () => void;
}

export function LogisticsView({ user, onBack, onCountSubmit, counts, onClearCounts }: LogisticsViewProps) {
  // Handle new count submission (now just passes up to App)
  const handleCountSubmit = async (entry: InventoryCountEntry) => {
    await onCountSubmit(entry);
    console.log('Count submitted and passed to App:', entry);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Logistics - Inventory Count
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  Logistics Role
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <div className="text-4xl mb-2">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Logistics Inventory Counting
            </h2>
            <p className="text-gray-600">
              Count and track inventory items in the logistics area
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left Column: Count Form */}
            <div>
              <InventoryCountForm
                onSubmit={handleCountSubmit}
                userEmail={user.email}
                location="logistics"
              />
            </div>

            {/* Right Column: Recent Counts */}
            <div>
              <RecentCounts
                counts={counts}
                onClear={onClearCounts}
              />
            </div>
          </div>

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={onBack}
              className="btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Role Selection
            </button>
          </div>

          {/* Development Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">🚀 v1.2.0 Features:</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>✅ SKU dropdown with 15 sample items</li>
              <li>✅ Amount input and validation</li>
              <li>✅ Real-time count display</li>
              <li>✅ Local storage (Firebase integration ready)</li>
              <li>🚧 Next: Production zone counting, Manager dashboard</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LogisticsView;