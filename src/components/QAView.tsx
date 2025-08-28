// Quality Assurance View - v4.1.0
import React, { useState, useEffect } from 'react';
import { QAViewProps, Car, QAInspection, QAChecklist } from '../types';
import { carTrackingService } from '../services/carTrackingService';
import { qualityAssuranceService } from '../services/qualityAssuranceService';
import QACarListView from './qa/QACarListView';
import QAInspectionView from './qa/QAInspectionView';
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';

const QAView: React.FC<QAViewProps> = ({ user, onBack }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [inspections, setInspections] = useState<QAInspection[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<QAChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'inspection'>('list');
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);

  // Load today's cars and inspections
  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's cars (in production + completed today)
      const [todayCars, todayInspections] = await Promise.all([
        carTrackingService.getTodayCars(),
        qualityAssuranceService.getTodayInspections()
      ]);

      setCars(todayCars);
      setInspections(todayInspections);
    } catch (error) {
      console.error('Failed to load QA data:', error);
      setError('Failed to load cars and inspections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCarSelect = async (vin: string) => {
    try {
      const car = cars.find(c => c.vin === vin);
      if (!car) {
        setError('Car not found');
        return;
      }

      // Find appropriate checklist for this car
      const checklist = await qualityAssuranceService.getChecklistForCar(car);
      if (!checklist) {
        setError('No quality checklist available for this car type. Please contact manager to create checklists.');
        return;
      }

      setSelectedCar(car);
      setSelectedChecklist(checklist);
      setCurrentView('inspection');
    } catch (error) {
      console.error('Failed to select car:', error);
      setError('Failed to start inspection. Please try again.');
    }
  };

  const handleInspectionComplete = (inspection: QAInspection) => {
    // Add to inspections list
    setInspections(prev => [inspection, ...prev]);
    
    // Return to car list
    setSelectedCar(null);
    setSelectedChecklist(null);
    setCurrentView('list');
  };

  const handleBack = () => {
    if (currentView === 'inspection') {
      setSelectedCar(null);
      setSelectedChecklist(null);
      setCurrentView('list');
    } else {
      onBack();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading QA data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 mt-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={loadTodayData}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={currentView === 'list' ? 'Back to role selection' : 'Back to car list'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title */}
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-2xl">🔍</span>
              <h1 className="text-lg font-bold text-gray-900">
                {currentView === 'list' 
                  ? 'Quality Assurance'
                  : `Inspecting: ${selectedCar?.vin}`
                }
              </h1>
            </div>

            {/* Right side buttons */}
            <div className="ml-auto flex items-center space-x-2">
              {/* Refresh Button */}
              {currentView === 'list' && (
                <button
                  onClick={loadTodayData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              )}

              {/* Ela Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowElaMenu(!showElaMenu)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Ela Menu Dropdown */}
                {showElaMenu && (
                  <ElaMenu
                    onChatOpen={() => setShowElaChat(true)}
                    onClose={() => setShowElaMenu(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'list' ? (
          <QACarListView
            cars={cars}
            inspections={inspections}
            onCarSelect={handleCarSelect}
            onRefresh={loadTodayData}
          />
        ) : (
          selectedCar && selectedChecklist && (
            <QAInspectionView
              car={selectedCar}
              checklist={selectedChecklist}
              onComplete={handleInspectionComplete}
              onBack={() => setCurrentView('list')}
            />
          )
        )}
      </main>

      {/* Ela Chat Modal */}
      {showElaChat && (
        <ElaChat
          user={user}
          userRole="qa"
          onClose={() => setShowElaChat(false)}
        />
      )}
    </div>
  );
};

export default QAView;