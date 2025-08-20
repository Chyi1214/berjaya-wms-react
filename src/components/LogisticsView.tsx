// Logistics View Component - Inventory counting for logistics team
import { useState } from 'react';
import { User, InventoryCountEntry, Transaction, TransactionFormData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import InventoryCountForm from './InventoryCountForm';
import RecentCounts from './RecentCounts';
import TransactionSendForm from './TransactionSendForm';
import TransactionOTPDisplay from './TransactionOTPDisplay';
import ScannerView from './scanner/ScannerView';

interface LogisticsViewProps {
  user: User;
  onBack: () => void;
  onCountSubmit: (entries: InventoryCountEntry[]) => void;
  counts: InventoryCountEntry[];
  onClearCounts: () => void;
  onTransactionCreate: (transactionData: TransactionFormData & { otp: string }) => Promise<{ transaction: Transaction, otp: string }>;
}

export function LogisticsView({ user, onBack, onCountSubmit, counts, onClearCounts, onTransactionCreate }: LogisticsViewProps) {
  const { t } = useLanguage();
  const [selectedAction, setSelectedAction] = useState<'menu' | 'check' | 'transaction' | 'scanner'>('menu');
  const [transactionResult, setTransactionResult] = useState<{ transaction: Transaction, otp: string } | null>(null);
  
  // Handle new count submission (now supports both single items and BOM expansion)
  const handleCountSubmit = async (entries: InventoryCountEntry[]) => {
    await onCountSubmit(entries);
    console.log(`Count submitted and passed to App: ${entries.length} entries`, entries);
  };

  // Handle back to menu
  const handleBackToMenu = () => {
    setSelectedAction('menu');
    setTransactionResult(null);
  };

  // Handle transaction submission
  const handleTransactionSubmit = async (transactionData: TransactionFormData & { otp: string }) => {
    try {
      const result = await onTransactionCreate(transactionData);
      setTransactionResult(result);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
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
                {t('logistics.title')}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {t('logistics.role')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {selectedAction === 'menu' && (
            <>
              {/* Welcome Section */}
              <div className="text-center">
                <div className="text-4xl mb-2">📦</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('roles.logistics')}
                </h2>
                <p className="text-gray-600">
                  {t('logistics.description')}
                </p>
              </div>

              {/* Action Menu */}
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                
                {/* Check Inventory Button */}
                <button
                  onClick={() => setSelectedAction('check')}
                  className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-center group"
                >
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('inventory.checkInventory')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t('logistics.checkDescription')}
                  </p>
                  <div className="mt-4 text-blue-500 group-hover:text-blue-600">
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Transaction Button */}
                <button
                  onClick={() => setSelectedAction('transaction')}
                  className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 text-center group"
                >
                  <div className="text-4xl mb-3">🔄</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('transactions.title')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t('transactions.logisticsDescription')}
                  </p>
                  <div className="mt-4 text-purple-500 group-hover:text-purple-600">
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Scanner Button - NEW v3.2.0 */}
                <button
                  onClick={() => setSelectedAction('scanner')}
                  className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-center group"
                >
                  <div className="text-4xl mb-3">📱</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Inbound Scanner
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Scan barcodes to find target zones
                  </p>
                  <div className="mt-4 text-green-500 group-hover:text-green-600">
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Back to Roles Button */}
              <div className="text-center">
                <button
                  onClick={onBack}
                  className="btn-secondary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                <div className="text-4xl mb-2">📋</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('inventory.inventoryCount')} - {t('roles.logistics')}
                </h2>
                <p className="text-gray-600">
                  {t('logistics.description')}
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

              {/* Back to Menu Button */}
              <div className="text-center">
                <button
                  onClick={handleBackToMenu}
                  className="btn-secondary mr-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('common.back')}
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

          {selectedAction === 'transaction' && (
            <>
              {transactionResult ? (
                <>
                  {/* Show OTP Display */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔄</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Transaction Created - {t('roles.logistics')}
                    </h2>
                  </div>

                  <TransactionOTPDisplay
                    transaction={transactionResult.transaction}
                    otp={transactionResult.otp}
                    onClose={handleBackToMenu}
                  />
                </>
              ) : (
                <>
                  {/* Transaction Send Form */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">📤</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Send Items - {t('roles.logistics')}
                    </h2>
                    <p className="text-gray-600">
                      Send inventory to production zones with OTP confirmation
                    </p>
                  </div>

                  <TransactionSendForm
                    onSubmit={handleTransactionSubmit}
                    onCancel={handleBackToMenu}
                    senderEmail={user.email}
                    inventoryCounts={counts}
                  />
                </>
              )}
            </>
          )}

          {selectedAction === 'scanner' && (
            <ScannerView 
              user={user}
              onBack={handleBackToMenu}
            />
          )}

        </div>
      </main>
    </div>
  );
}

export default LogisticsView;