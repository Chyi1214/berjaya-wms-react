// Logistics View Component - Inventory counting for logistics team
import { User } from '../types';

interface LogisticsViewProps {
  user: User;
  onBack: () => void;
}

export function LogisticsView({ user, onBack }: LogisticsViewProps) {
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
        <div className="card max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-4">📦</div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Logistics Dashboard
          </h2>
          
          <p className="text-gray-600 mb-6">
            Welcome to the logistics section! Here you'll manage inventory counting and logistics operations.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-blue-800 font-medium mb-2">🚧 Coming Soon:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Inventory counting interface</li>
              <li>• SKU scanning and entry</li>
              <li>• Real-time inventory updates</li>
              <li>• Transaction history</li>
            </ul>
          </div>
          
          <button
            onClick={onBack}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Role Selection
          </button>
        </div>
      </main>
    </div>
  );
}

export default LogisticsView;