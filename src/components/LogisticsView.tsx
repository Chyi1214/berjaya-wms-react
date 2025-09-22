// Logistics View Component - Inventory counting for logistics team
import { useState } from 'react';
import { User, InventoryCountEntry, Transaction, TransactionFormData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import InventoryCountForm from './InventoryCountForm';
import TransactionSendForm from './TransactionSendForm';
import TransactionOTPDisplay from './TransactionOTPDisplay';
import UnifiedScannerView from './scanner/UnifiedScannerView';
import { ElaMenu } from './ela/ElaMenu';
import { ElaChat } from './ela/ElaChat';
import PersonalSettings from './PersonalSettings';

interface LogisticsViewProps {
  user: User;
  onBack: () => void;
  onCountSubmit: (entries: InventoryCountEntry[]) => void;
  counts: InventoryCountEntry[];
  onTransactionCreate: (transactionData: TransactionFormData & { otp: string }) => Promise<{ transaction: Transaction, otp: string }>;
  transactions: Transaction[];
}

export function LogisticsView({ user, onBack, onCountSubmit, counts, onTransactionCreate, transactions }: LogisticsViewProps) {
  const { t } = useLanguage();
  const [selectedAction, setSelectedAction] = useState<'menu' | 'check' | 'transaction' | 'scanner'>('menu');
  const [transactionResult, setTransactionResult] = useState<{ transaction: Transaction, otp: string } | null>(null);
  const [showElaMenu, setShowElaMenu] = useState(false);
  const [showElaChat, setShowElaChat] = useState(false);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  
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

  // Context-aware back button handler
  const handleBackButton = () => {
    if (selectedAction === 'menu') {
      // From main menu -> go to role selection
      onBack();
    } else {
      // From any sub-screen -> go back to menu
      handleBackToMenu();
    }
  };

  // Handle transaction submission
  const handleTransactionSubmit = async (transactionData: TransactionFormData & { otp: string; skipOTP?: boolean }) => {
    try {
      const result = await onTransactionCreate(transactionData);
      
      // If skip OTP is enabled, don't show OTP display - transaction is complete
      if (transactionData.skipOTP) {
        alert('✅ Transaction completed successfully! Items sent immediately.');
        handleBackToMenu();
      } else {
        setTransactionResult(result);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Eugene's redesigned upper panel */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Back Button */}
            <button
              onClick={handleBackButton}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={selectedAction === 'menu' ? 'Back to role selection' : 'Back to menu'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title */}
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-2xl">
                {selectedAction === 'check' ? '📋' :
                 selectedAction === 'transaction' ? '🔄' :
                 selectedAction === 'scanner' ? '📱' : '📦'}
              </span>
              <h1 className="text-lg font-bold text-gray-900">
                {selectedAction === 'check' ? t('inventory.inventoryCount') :
                 selectedAction === 'transaction' ? t('logistics.sendItems') :
                 selectedAction === 'scanner' ? 'Unified Scanner' : t('roles.logistics')}
              </h1>
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
              {/* Action Menu - iPhone Style with 3 buttons */}
              <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">

                {/* Check Inventory Button */}
                <button
                  onClick={() => setSelectedAction('check')}
                  className="h-24 bg-blue-500 hover:bg-blue-600 rounded-2xl shadow-lg transition-all duration-200 flex flex-col items-center justify-center text-white group active:scale-95"
                >
                  <div className="text-3xl mb-1">📋</div>
                  <span className="text-sm font-medium">{t('logistics.checkInventory')}</span>
                </button>

                {/* Transaction Button */}
                <button
                  onClick={() => setSelectedAction('transaction')}
                  className="h-24 bg-purple-500 hover:bg-purple-600 rounded-2xl shadow-lg transition-all duration-200 flex flex-col items-center justify-center text-white group active:scale-95"
                >
                  <div className="text-3xl mb-1">🔄</div>
                  <span className="text-sm font-medium">{t('logistics.sendItems')}</span>
                </button>

                {/* Unified Scanner Button */}
                <button
                  onClick={() => setSelectedAction('scanner')}
                  className="h-24 bg-green-500 hover:bg-green-600 rounded-2xl shadow-lg transition-all duration-200 flex flex-col items-center justify-center text-white group active:scale-95"
                >
                  <div className="text-3xl mb-1">📱</div>
                  <span className="text-sm font-medium">Unified Scanner</span>
                </button>
              </div>

            </>
          )}

          {selectedAction === 'check' && (
            <>
              {/* Count Form */}
              <div className="max-w-2xl mx-auto">
                <InventoryCountForm
                  onSubmit={handleCountSubmit}
                  userEmail={user.email}
                  location="logistics"
                />
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
                    allTransactions={transactions}
                  />
                </>
              ) : (
                <>
                  {/* Transaction Send Form */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">📤</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {t('logistics.sendItems')} - {t('roles.logistics')}
                    </h2>
                    <p className="text-gray-600">
                      {t('transactions.sendInventoryToProduction')}
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
            <UnifiedScannerView
              user={user}
              onBack={handleBackToMenu}
            />
          )}

        </div>
      </main>

      {/* Ela Chat Modal */}
      {showElaChat && (
        <ElaChat
          user={user}
          userRole="logistics"
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

export default LogisticsView;