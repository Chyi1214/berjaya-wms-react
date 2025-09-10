// Production View Component - Zone-based production management with Version 4.0 Car Tracking
import { useState, useEffect } from 'react';
import { User, InventoryCountEntry, Transaction, Car } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import InventoryCountForm from './InventoryCountForm';
import RecentCounts from './RecentCounts';
import TransactionReceiveView from './TransactionReceiveView';
import CarScanView from './production/CarScanView';
import CarCompleteView from './production/CarCompleteView';
import ZoneStatusDisplay from './production/ZoneStatusDisplay';
import WasteLostView from './production/WasteLostView';
import ProductionLineView from './production/ProductionLineView';
import ProductionInfoBoard from './production/ProductionInfoBoard';
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';
import PersonalSettings from './PersonalSettings';
import { reportService } from '../services/reportService';
import { getDisplayName } from '../utils/displayName';
import { useAuth } from '../contexts/AuthContext';

interface ProductionViewProps {
  user: User;
  onBack: () => void;
  onCountSubmit: (entries: InventoryCountEntry[]) => void;
  counts: InventoryCountEntry[];
  onClearCounts: () => void;
  transactions: Transaction[];
  onTransactionConfirm: (transactionId: string, otp: string) => void;
  onTransactionReject: (transactionId: string, reason: string) => void;
}

// Note: Zone generation moved to ProductionLineView component

export function ProductionView({ user, onBack, onCountSubmit, counts, onClearCounts, transactions, onTransactionConfirm, onTransactionReject }: ProductionViewProps) {
  const { t } = useLanguage();
  const { authenticatedUser } = useAuth();
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<'menu' | 'check' | 'transaction' | 'scan_car' | 'complete_car' | 'info_board' | 'waste_lost'>('menu');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  const [hasActiveReport, setHasActiveReport] = useState(false);
  
  // Handle zone selection
  const handleZoneSelect = (zoneId: number) => {
    setSelectedZone(zoneId);
    setSelectedAction('menu'); // Reset to menu when selecting zone
  };

  // Check for active report when zone changes
  useEffect(() => {
    const checkActiveReport = async () => {
      if (selectedZone) {
        const hasReport = await reportService.hasActiveReport(selectedZone, user.email);
        setHasActiveReport(hasReport);
      } else {
        setHasActiveReport(false);
      }
    };

    checkActiveReport();
  }, [selectedZone, user.email]);
  
  // Handle back to zone selection
  const handleBackToZones = () => {
    setSelectedZone(null);
    setSelectedAction('menu');
  };

  // Handle back to action menu
  const handleBackToMenu = () => {
    setSelectedAction('menu');
  };

  // Context-aware back button handler
  const handleBackButton = () => {
    if (!selectedZone) {
      // From zone selection -> go to role selection
      onBack();
    } else if (selectedAction === 'menu') {
      // From zone menu -> go back to zone selection
      handleBackToZones();
    } else {
      // From any sub-screen -> go back to zone menu
      handleBackToMenu();
    }
  };
  
  // Handle car scanned
  const handleCarScanned = (car: Car) => {
    console.log('Car scanned:', car.vin, 'Zone:', selectedZone);
    setRefreshKey(prev => prev + 1); // Trigger zone status refresh
    setSelectedAction('menu');
  };

  // Handle report toggle - v5.7 Worker Report Button
  const handleReportToggle = async () => {
    if (!selectedZone) {
      alert('No zone selected');
      return;
    }

    try {
      const displayName = getDisplayName(user, authenticatedUser?.userRecord);
      
      // Check current status from database to be sure
      const currentHasReport = await reportService.hasActiveReport(selectedZone, user.email);
      console.log('🔍 Current report status from DB:', currentHasReport, 'UI state:', hasActiveReport);
      
      if (currentHasReport) {
        // Dismiss existing report
        await reportService.dismissOwnReport(selectedZone, user.email);
        setHasActiveReport(false);
        alert(`✅ Report dismissed for Zone ${selectedZone}`);
        console.log('✅ Report dismissed for zone:', selectedZone, 'by:', displayName);
      } else {
        // Submit new report
        await reportService.submitReport(selectedZone, user.email, displayName);
        setHasActiveReport(true);
        alert(`⚠️ Report submitted for Zone ${selectedZone}\nThis will be visible on the info board.`);
        console.log('✅ Report submitted for zone:', selectedZone, 'by:', displayName);
      }
      
      // Refresh the state from database to ensure consistency
      setTimeout(async () => {
        const newStatus = await reportService.hasActiveReport(selectedZone, user.email);
        setHasActiveReport(newStatus);
        console.log('🔄 Refreshed report status:', newStatus);
      }, 500);
      
    } catch (error) {
      console.error('Failed to toggle report:', error);
      alert('Failed to update report. Please try again.');
    }
  };
  
  // Handle car completed
  const handleCarCompleted = (car: Car) => {
    console.log('Car completed:', car.vin, 'Zone:', selectedZone);
    setRefreshKey(prev => prev + 1); // Trigger zone status refresh
    setSelectedAction('menu');
  };
  
  
  // Refresh zone data
  const handleZoneRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Handle inventory count submission (supports both single items and BOM expansion)
  const handleCountSubmit = async (entries: InventoryCountEntry[]) => {
    if (!selectedZone) return;
    
    // Update all entries with production zone location
    const productionEntries: InventoryCountEntry[] = entries.map(entry => ({
      ...entry,
      location: `production_zone_${selectedZone}`
    }));
    
    await onCountSubmit(productionEntries);
  };
  
  // Filter counts for current zone
  const zonePrefix = selectedZone ? `production_zone_${selectedZone}` : '';
  const zoneCounts = counts.filter(count => count.location === zonePrefix);
  
  // If no zone selected, show zone selection OR info board
  if (!selectedZone) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2 ml-3">
                <span className="text-2xl">🔧</span>
                <h1 className="text-lg font-bold text-gray-900">Production</h1>
              </div>

              {/* Ela Menu Button */}
              <div className="ml-auto relative">
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
                    onPersonalSettingsOpen={() => setShowPersonalSettings(true)}
                    onClose={() => setShowElaMenu(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {selectedAction === 'info_board' ? (
            <>
              {/* Info Board View */}
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📺</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Production Info Board
                </h2>
                <p className="text-gray-600">
                  Real-time zone status across all production lines
                </p>
              </div>

              <ProductionInfoBoard />

              {/* Back Button */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setSelectedAction('menu')}
                  className="btn-secondary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Zone Selection
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Info Board Button */}
              <div className="text-center">
                <button
                  onClick={() => setSelectedAction('info_board')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                >
                  <span className="text-2xl mr-3">📺</span>
                  <span>Production Info Board</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Production Line View - Zone Selection */}
              <ProductionLineView onZoneSelect={handleZoneSelect} />
            </>
          )}
        </div>

        {/* Ela Chat Modal */}
        {showElaChat && (
          <ElaChat
            user={user}
            userRole="production"
            onClose={() => setShowElaChat(false)}
          />
        )}
      </div>
    );
  }
  
  // Zone-specific inventory counting view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBackButton}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={selectedAction === 'menu' ? 'Back to zones' : 'Back to menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 ml-3">
              <span className="text-2xl">🔧</span>
              <h1 className="text-lg font-bold text-gray-900">Zone {selectedZone}</h1>
            </div>

            {/* Ela Menu Button */}
            <div className="ml-auto relative">
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
                  onPersonalSettingsOpen={() => setShowPersonalSettings(true)}
                  onClose={() => setShowElaMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {selectedAction === 'menu' && (
            <>

              {/* Zone Status Display - Version 4.0 */}
              <div className="mb-6">
                <ZoneStatusDisplay 
                  key={refreshKey}
                  zoneId={selectedZone} 
                  onRefresh={handleZoneRefresh}
                  onScanCar={() => setSelectedAction('scan_car')}
                  onCompleteCar={() => setSelectedAction('complete_car')}
                />
              </div>
              
              {/* iPhone App Style Action Menu */}
              <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
                
                {/* Report Issue App Button */}
                <div className="text-center">
                  <button
                    onClick={handleReportToggle}
                    className={`w-16 h-16 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                      hasActiveReport
                        ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600'
                    }`}
                  >
                    <div className="text-white text-2xl">⚠️</div>
                  </button>
                  <p className={`text-xs mt-1 font-medium ${
                    hasActiveReport ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {hasActiveReport ? 'Report Active' : 'Report Issue'}
                  </p>
                </div>

                {/* Inventory App Button */}
                <div className="text-center">
                  <button
                    onClick={() => setSelectedAction('check')}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <div className="text-white text-2xl">📋</div>
                  </button>
                  <p className="text-xs text-gray-700 mt-1 font-medium">Inventory</p>
                </div>

                {/* Receive App Button */}
                <div className="text-center">
                  <button
                    onClick={() => setSelectedAction('transaction')}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <div className="text-white text-2xl">📬</div>
                  </button>
                  <p className="text-xs text-gray-700 mt-1 font-medium">Receive</p>
                </div>

                {/* Waste & Lost App Button */}
                <div className="text-center">
                  <button
                    onClick={() => setSelectedAction('waste_lost')}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    <div className="text-white text-2xl">🗑️</div>
                  </button>
                  <p className="text-xs text-gray-700 mt-1 font-medium">Waste & Lost</p>
                </div>
              </div>

            </>
          )}

          {selectedAction === 'check' && (
            <>
              {/* Check Inventory View */}
              <div className="text-center">
                <div className="text-4xl mb-2">📦</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('inventory.inventoryCount')} - {t('production.zoneTitle', { zone: selectedZone })}
                </h2>
                <p className="text-gray-600">
                  {t('production.zoneDesc', { zone: selectedZone })}
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

              {/* Back to Menu Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleBackToMenu}
                  className="btn-secondary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('common.back')}
                </button>
                
                <button
                  onClick={handleBackToZones}
                  className="btn-secondary"
                >
                  {t('production.backToZones')}
                </button>
                
                <button
                  onClick={onBack}
                  className="btn-secondary"
                >
                  {t('nav.backToRoles')}
                </button>
              </div>
            </>
          )}

          {selectedAction === 'scan_car' && (
            <CarScanView
              user={user}
              zoneId={selectedZone!}
              onBack={handleBackToMenu}
              onCarScanned={handleCarScanned}
            />
          )}

          {selectedAction === 'complete_car' && (
            <CarCompleteView
              user={user}
              zoneId={selectedZone!}
              onBack={handleBackToMenu}
              onCarCompleted={handleCarCompleted}
            />
          )}


          {selectedAction === 'waste_lost' && (
            <WasteLostView
              user={user}
              zoneId={selectedZone!}
              onBack={handleBackToMenu}
            />
          )}

          {selectedAction === 'transaction' && (
            <>
              {/* Transaction Receive View */}
              <div className="text-center">
                <div className="text-4xl mb-2">📥</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Confirm Transactions - {t('production.zoneTitle', { zone: selectedZone })}
                </h2>
                <p className="text-gray-600">
                  Confirm incoming items from logistics with OTP
                </p>
              </div>

              <TransactionReceiveView
                pendingTransactions={transactions}
                currentZone={selectedZone!}
                onConfirmTransaction={onTransactionConfirm}
                onRejectTransaction={onTransactionReject}
              />

              {/* Back to Menu Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleBackToMenu}
                  className="btn-secondary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('common.back')}
                </button>
                
                <button
                  onClick={handleBackToZones}
                  className="btn-secondary"
                >
                  {t('production.backToZones')}
                </button>
                
                <button
                  onClick={onBack}
                  className="btn-secondary"
                >
                  {t('nav.backToRoles')}
                </button>
              </div>
            </>
          )}


        </div>
      </main>

      {/* Ela Chat Modal */}
      {showElaChat && (
        <ElaChat
          user={user}
          userRole={`production-zone-${selectedZone}`}
          onClose={() => setShowElaChat(false)}
        />
      )}

      {/* Personal Settings */}
      {showPersonalSettings && (
        <PersonalSettings
          user={user}
          onClose={() => setShowPersonalSettings(false)}
        />
      )}
    </div>
  );
}

export default ProductionView;