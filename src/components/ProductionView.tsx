// Production View Component - Zone-based production management
import { useState } from 'react';
import { User, InventoryCountEntry } from '../types';
import InventoryCountForm from './InventoryCountForm';
import RecentCounts from './RecentCounts';

interface ProductionViewProps {
  user: User;
  onBack: () => void;
  onCountSubmit: (entry: InventoryCountEntry) => void;
  counts: InventoryCountEntry[];
  onClearCounts: () => void;
}

// Generate zones 1-23
const PRODUCTION_ZONES = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `Zone ${i + 1}`,
  description: `Production Zone ${i + 1}`
}));

export function ProductionView({ user, onBack, onCountSubmit, counts, onClearCounts }: ProductionViewProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  
  // Handle zone selection
  const handleZoneSelect = (zoneId: number) => {
    setSelectedZone(zoneId);
  };
  
  // Handle back to zone selection
  const handleBackToZones = () => {
    setSelectedZone(null);
  };
  
  // Handle inventory count submission
  const handleCountSubmit = async (entry: InventoryCountEntry) => {
    if (!selectedZone) return;
    
    // Create entry with production zone location
    const productionEntry: InventoryCountEntry = {
      ...entry,
      location: `production_zone_${selectedZone}`
    };
    
    await onCountSubmit(productionEntry);
  };
  
  // Filter counts for current zone
  const zonePrefix = selectedZone ? `production_zone_${selectedZone}` : '';
  const zoneCounts = counts.filter(count => count.location === zonePrefix);
  
  // If no zone selected, show zone selection
  if (!selectedZone) {
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
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Production - Select Zone
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Production Role
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Zone Selection */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <div className="text-4xl mb-2">🏭</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Production Zone Selection
              </h2>
              <p className="text-gray-600">
                Select a production zone to start inventory counting
              </p>
            </div>

            {/* Zone Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {PRODUCTION_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneSelect(zone.id)}
                  className="bg-white border border-gray-300 rounded-lg p-4 hover:bg-green-50 hover:border-green-300 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {zone.id}
                    </div>
                    <div className="text-sm text-gray-600">
                      Zone {zone.id}
                    </div>
                  </div>
                </button>
              ))}
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

            {/* Development Status */}
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-medium mb-2">🎉 v1.5.0 Features:</h3>
              <ul className="text-green-700 text-sm space-y-1">
                <li>✅ Production zone selection (1-23)</li>
                <li>✅ Zone-specific inventory counting</li>
                <li>✅ Firebase sync with zone data</li>
                <li>✅ Mobile-optimized zone grid</li>
                <li>🚧 Next: Enhanced Manager dashboard with zone breakdown</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Zone-specific inventory counting view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBackToZones}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to zones"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{selectedZone}</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Production Zone {selectedZone} - Inventory Count
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-1">
                <span className="text-green-800 text-sm font-medium">
                  Zone {selectedZone}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  Production Role
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Inventory Counting */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <div className="text-4xl mb-2">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Production Zone {selectedZone} Inventory
            </h2>
            <p className="text-gray-600">
              Count and track inventory items in production zone {selectedZone}
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left Column: Count Form */}
            <div>
              <InventoryCountForm
                onSubmit={handleCountSubmit}
                userEmail={user.email}
                location={`production_zone_${selectedZone}`}
              />
            </div>

            {/* Right Column: Recent Counts */}
            <div>
              <RecentCounts
                counts={zoneCounts}
                onClear={onClearCounts}
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBackToZones}
              className="btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Zone Selection
            </button>
            
            <button
              onClick={onBack}
              className="btn-secondary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Role Selection
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductionView;