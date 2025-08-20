// Transaction Receive View - For production workers to confirm incoming transactions
import { useState } from 'react';
import { Transaction, TransactionStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface TransactionReceiveViewProps {
  pendingTransactions: Transaction[];
  currentZone: number;
  onConfirmTransaction: (transactionId: string, otp: string) => void;
  onRejectTransaction: (transactionId: string, reason: string) => void;
}

export function TransactionReceiveView({ 
  pendingTransactions, 
  currentZone,
  onConfirmTransaction, 
  onRejectTransaction
}: TransactionReceiveViewProps) {
  const { t } = useLanguage();
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{transactionId: string, details: any} | null>(null);

  // Debug logging
  console.log('📱 Mobile Debug - TransactionReceiveView render:', { showSuccess, currentZone, pendingTransactionsCount: pendingTransactions.length });

  // Filter transactions for current zone
  const zoneTransactions = pendingTransactions.filter(
    txn => txn.toLocation === `production_zone_${currentZone}` && txn.status === TransactionStatus.PENDING
  );

  const handleConfirm = async (transactionId: string) => {
    console.log('📱 Mobile Debug - Confirm button clicked:', { transactionId, otpInput, isProcessing });
    
    if (!otpInput.trim()) {
      alert(t('transactions.pleaseEnterOTP'));
      return;
    }

    setIsProcessing(true);
    try {
      // Find transaction details before confirming
      const transaction = pendingTransactions.find(t => t.id === transactionId);
      
      console.log('📱 Mobile Debug - Calling onConfirmTransaction...');
      await onConfirmTransaction(transactionId, otpInput.trim());
      console.log('📱 Mobile Debug - Transaction confirmed successfully');
      
      // Show success message
      if (transaction) {
        console.log('📱 Mobile Debug - Setting success message:', transaction);
        setShowSuccess({
          transactionId,
          details: {
            sku: transaction.sku,
            itemName: transaction.itemName,
            amount: transaction.amount,
            fromUser: transaction.performedBy
          }
        });
        
        // No auto-hide - user controls when to close
      }
      
      setSelectedTransaction(null);
      setOtpInput('');
    } catch (error) {
      console.error('📱 Mobile Debug - Failed to confirm transaction:', error);
      alert(`${t('transactions.failedToConfirm')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!rejectReason.trim()) {
      alert(t('transactions.pleaseProvideReason'));
      return;
    }

    setIsProcessing(true);
    try {
      await onRejectTransaction(transactionId, rejectReason.trim());
      setSelectedTransaction(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject transaction:', error);
      alert(t('transactions.failedToReject'));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(new Date(timestamp));
  };

  // Show full-page processing screen while confirming transaction
  if (isProcessing && selectedTransaction) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          
          {/* Processing Animation */}
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          {/* Processing Title */}
          <h1 className="text-3xl font-bold text-blue-900 mb-4">
            {t('transactions.waitingForConfirmation').toUpperCase()}
          </h1>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {t('transactions.confirmTransaction')}
          </h2>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-blue-800 font-medium text-lg mb-2">
              📱 {t('transactions.waitingForConfirmation')}
            </p>
            <p className="text-blue-700">
              🔄 {t('transactions.waitingForConfirmation')}
            </p>
            <p className="text-blue-600 text-sm mt-4">
              {t('transactions.waitingForConfirmation')}
            </p>
          </div>
          
        </div>
      </div>
    );
  }

  // Show full-page success screen if success message is active
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          
          {/* Large Success Animation */}
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Success Title */}
          <h1 className="text-4xl font-bold text-green-900 mb-4">
            {t('transactions.transactionConfirmed').toUpperCase()}!
          </h1>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {t('transactions.transactionConfirmed')}
          </h2>
          
          {/* Transaction Details */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-green-900 mb-4 text-lg">📦 {t('transactions.transactionConfirmed')}:</h3>
            <div className="space-y-2">
              <p className="text-green-800 font-medium text-lg">
                {showSuccess.details.amount} units of {showSuccess.details.sku}
              </p>
              <p className="text-green-700">
                {showSuccess.details.itemName}
              </p>
              <p className="text-green-600 text-sm mt-4">
                📨 {t('transactions.fromLocation')}: {showSuccess.details.fromUser}
              </p>
              <p className="text-green-600 text-sm">
                📍 {t('production.zone')} {currentZone}
              </p>
            </div>
          </div>
          
          {/* Large OK Button */}
          <button
            onClick={() => setShowSuccess(null)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-xl py-4 px-8 rounded-lg transition-colors shadow-lg"
          >
            ✅ {t('common.confirm')} - {t('common.back')}
          </button>
          
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      
      {/* No Pending Transactions Message */}
      {zoneTransactions.length === 0 && !showSuccess && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('transactions.noPendingTransactions')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('transactions.noItemsBeingSent', { zone: currentZone })}
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-green-700 text-sm">
              ✨ {t('transactions.whenLogisticsSends')}
            </p>
          </div>
        </div>
      )}
      
      {/* Transactions List Header and Content */}
      {zoneTransactions.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              📥 {t('transactions.confirmIncoming')} - {t('production.zone')} {currentZone}
            </h3>
            <div className="bg-yellow-100 border border-yellow-200 rounded-lg px-3 py-1">
              <span className="text-yellow-800 text-sm font-medium">
                {zoneTransactions.length} {t('transactions.pending')}
              </span>
            </div>
          </div>

      <div className="space-y-4">
        {zoneTransactions.map((transaction) => (
          <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
            
            {/* Transaction Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-gray-900">
                  📦 {transaction.sku} - {transaction.itemName}
                </h4>
                <p className="text-sm text-gray-600">
                  {t('transactions.fromLocation')}: {transaction.performedBy} • {formatTimestamp(transaction.timestamp)}
                </p>
              </div>
              <div className="bg-yellow-100 border border-yellow-200 rounded px-2 py-1">
                <span className="text-yellow-800 text-xs font-medium">{t('transactions.pending').toUpperCase()}</span>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">{t('transactions.amount')}:</span>
                  <div className="font-medium">{transaction.amount}</div>
                </div>
                <div>
                  <span className="text-gray-500">{t('transactions.fromLocation')}:</span>
                  <div className="font-medium">{t('roles.logistics')}</div>
                </div>
                <div>
                  <span className="text-gray-500">{t('transactions.toLocation')}:</span>
                  <div className="font-medium">{t('production.zone')} {currentZone}</div>
                </div>
                <div>
                  <span className="text-gray-500">ID:</span>
                  <div className="font-medium font-mono text-xs">{transaction.id.slice(-8)}</div>
                </div>
              </div>
              
              {transaction.notes && (
                <div className="mt-3">
                  <span className="text-gray-500 text-sm">{t('transactions.notes')}:</span>
                  <div className="text-sm">{transaction.notes}</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedTransaction === transaction.id ? (
              <div className="space-y-4">
                
                {/* OTP Confirmation */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-3">🔐 {t('transactions.enterOTP')}</h5>
                  <p className="text-green-700 text-sm mb-3">
                    {t('transactions.enterOTP')}
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center font-mono text-lg"
                      placeholder="0000"
                      maxLength={4}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleConfirm(transaction.id);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      disabled={isProcessing || otpInput.length !== 4}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg font-medium disabled:cursor-not-allowed touch-manipulation"
                    >
                      {isProcessing ? '...' : '✅ ' + t('common.confirm')}
                    </button>
                  </div>
                </div>

                {/* Rejection Form */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-900 mb-3">❌ {t('transactions.transactionRejected')}</h5>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1 px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder={t('transactions.pleaseProvideReason')}
                    />
                    <button
                      onClick={() => handleReject(transaction.id)}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-2 rounded-lg font-medium disabled:cursor-not-allowed"
                    >
                      {isProcessing ? '...' : '❌ ' + t('transactions.transactionRejected')}
                    </button>
                  </div>
                </div>

                {/* Cancel */}
                <button
                  onClick={() => {
                    setSelectedTransaction(null);
                    setOtpInput('');
                    setRejectReason('');
                  }}
                  className="w-full btn-secondary"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedTransaction(transaction.id)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                🔐 {t('transactions.confirmTransaction')}
              </button>
            )}
          </div>
        ))}
      </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📋 {t('transactions.confirmTransaction')}:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>1. {t('transactions.confirmTransaction')}</li>
              <li>2. {t('transactions.enterOTP')}</li>
              <li>3. {t('transactions.confirmTransaction')}</li>
              <li>4. {t('transactions.transactionRejected')}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default TransactionReceiveView;