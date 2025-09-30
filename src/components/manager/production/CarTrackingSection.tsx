// Manager Car Tracking Section - Enhanced with search and manager-level insights
import { useState } from 'react';
import CarMovementHistory from '../../production/CarMovementHistory';
import CarJourneyView from '../../production/CarJourneyView';
import ZoneActivityView from '../../production/ZoneActivityView';

interface CarTrackingSectionProps {
  className?: string;
}

export function CarTrackingSection({ className = '' }: CarTrackingSectionProps) {
  const [activeView, setActiveView] = useState<'movements' | 'journey' | 'zone'>('movements');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">🚗</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Car Movement Tracking
        </h2>
        <p className="text-gray-600">
          Track who checks in cars and when they move through zones - Manager oversight
        </p>
      </div>

      {/* Tab Navigation for Different Views */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveView('movements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Raw Transactions
            </button>
            <button
              onClick={() => setActiveView('journey')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'journey'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🚗 By Car (Search VIN)
            </button>
            <button
              onClick={() => setActiveView('zone')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'zone'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏭 By Zone
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeView === 'movements' && (
            <CarMovementHistory />
          )}

          {activeView === 'journey' && (
            <CarJourneyView />
          )}

          {activeView === 'zone' && (
            <ZoneActivityView />
          )}
        </div>
      </div>

      {/* Manager Insights Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          📊 Manager Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-blue-600 font-medium">Current Features</div>
            <ul className="mt-2 text-gray-600 space-y-1">
              <li>• Real-time movement tracking</li>
              <li>• Worker name display</li>
              <li>• Complete audit trail</li>
              <li>• Date filtering</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-blue-600 font-medium">Search Capabilities</div>
            <ul className="mt-2 text-gray-600 space-y-1">
              <li>• Search by VIN number</li>
              <li>• Filter by date range</li>
              <li>• Zone activity monitoring</li>
              <li>• Worker activity tracking</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-blue-600 font-medium">Management Value</div>
            <ul className="mt-2 text-gray-600 space-y-1">
              <li>• Accountability tracking</li>
              <li>• Performance monitoring</li>
              <li>• Process verification</li>
              <li>• Issue investigation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarTrackingSection;