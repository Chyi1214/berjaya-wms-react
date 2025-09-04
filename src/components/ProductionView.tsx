// Production View Component - Zone-based production management with Version 4.0 Car Tracking
import { useState } from 'react';
import { User, InventoryCountEntry, Transaction, Car } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import InventoryCountForm from './InventoryCountForm';
import RecentCounts from './RecentCounts';
import TransactionReceiveView from './TransactionReceiveView';
import CarScanView from './production/CarScanView';
import CarCompleteView from './production/CarCompleteView';
import WorkerCheckInView from './production/WorkerCheckInView';
import ZoneStatusDisplay from './production/ZoneStatusDisplay';
import ProductionLineView from './production/ProductionLineView';
import ProductionInfoBoard from './production/ProductionInfoBoard';
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';

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
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<'menu' | 'check' | 'transaction' | 'scan_car' | 'complete_car' | 'check_in' | 'info_board'>('menu');
  const [isWorkerCheckedIn, setIsWorkerCheckedIn] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  
  // Handle zone selection
  const handleZoneSelect = (zoneId: number) => {
    setSelectedZone(zoneId);
    setSelectedAction('menu'); // Reset to menu when selecting zone
  };
  
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
  
  // Handle car completed
  const handleCarCompleted = (car: Car) => {
    console.log('Car completed:', car.vin, 'Zone:', selectedZone);
    setRefreshKey(prev => prev + 1); // Trigger zone status refresh
    setSelectedAction('menu');
  };
  
  // Handle worker status change
  const handleWorkerStatusChange = (isCheckedIn: boolean) => {
    setIsWorkerCheckedIn(isCheckedIn);
    setRefreshKey(prev => prev + 1); // Trigger zone status refresh
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
                />
              </div>
              
              {/* Action Menu - Version 4.0 with 4 buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                
                {/* Scan Car Button - NEW V4.0 */}
                <button
                  onClick={() => setSelectedAction('scan_car')}
                  className="p-3 md:p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-center group"
                >
                  <div className="text-2xl md:text-3xl mb-2">📱</div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                    Scan Car
                  </h3>
                  <p className="text-gray-600 text-xs">
                    Scan VIN to register car
                  </p>
                  <div className="mt-2 text-blue-500 group-hover:text-blue-600">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Complete Work Button - NEW V4.0 */}
                <button
                  onClick={() => setSelectedAction('complete_car')}
                  className="p-3 md:p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-center group"
                >
                  <div className="text-2xl md:text-3xl mb-2">✅</div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                    Complete
                  </h3>
                  <p className="text-gray-600 text-xs">
                    Mark work complete
                  </p>
                  <div className="mt-2 text-green-500 group-hover:text-green-600">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Check In/Out Button - NEW V4.0 */}
                <button
                  onClick={() => setSelectedAction('check_in')}
                  className={`p-3 md:p-4 bg-white rounded-xl border-2 transition-all duration-200 text-center group ${
                    isWorkerCheckedIn 
                      ? 'border-green-300 bg-green-50 hover:border-green-500 hover:bg-green-100' 
                      : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                  }`}
                >
                  <div className="text-2xl md:text-3xl mb-2">
                    {isWorkerCheckedIn ? '⏰' : '🕐'}
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                    {isWorkerCheckedIn ? 'Checked In' : 'Clock In'}
                  </h3>
                  <p className="text-gray-600 text-xs">
                    {isWorkerCheckedIn ? 'Manage time' : 'Track work time'}
                  </p>
                  <div className={`mt-2 group-hover:opacity-75 ${
                    isWorkerCheckedIn ? 'text-green-500' : 'text-orange-500'
                  }`}>
                    <svg className="w-4 h-4 md:w-5 md:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                {/* Check Inventory Button - Existing */}
                <button
                  onClick={() => setSelectedAction('check')}
                  className="p-3 md:p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 text-center group"
                >
                  <div className="text-2xl md:text-3xl mb-2">📋</div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                    Inventory
                  </h3>
                  <p className="text-gray-600 text-xs">
                    Count items
                  </p>
                  <div className="mt-2 text-indigo-500 group-hover:text-indigo-600">
                    <svg className="w-4 h-4 md:w-5 md:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
              
              {/* Transactions Button - Moved below main actions */}
              <div className="mt-6 max-w-md mx-auto">
                <button
                  onClick={() => setSelectedAction('transaction')}
                  className="w-full p-3 md:p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 text-center group"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="text-2xl">🔄</div>
                    <div className="text-left">
                      <h3 className="text-base font-semibold text-gray-900">
                        {t('transactions.title')}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {t('transactions.productionDescription')}
                      </p>
                    </div>
                    <div className="text-purple-500 group-hover:text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
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
                  {t('production.backToZones')}
                </button>
                
                <button
                  onClick={onBack}
                  className="btn-secondary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('nav.backToRoles')}
                </button>
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

          {selectedAction === 'check_in' && (
            <WorkerCheckInView
              user={user}
              zoneId={selectedZone!}
              onBack={handleBackToMenu}
              onWorkerStatusChange={handleWorkerStatusChange}
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
    </div>
  );
}

export default ProductionView;