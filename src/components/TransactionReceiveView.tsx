// Transaction Receive View - For production workers to confirm incoming transactions
import { useState } from 'react';
import { Transaction, TransactionStatus } from '../types';

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
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter transactions for current zone
  const zoneTransactions = pendingTransactions.filter(
    txn => txn.toLocation === `production_zone_${currentZone}` && txn.status === TransactionStatus.PENDING
  );

  const handleConfirm = async (transactionId: string) => {
    if (!otpInput.trim()) {
      alert('Please enter the OTP');
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirmTransaction(transactionId, otpInput.trim());
      setSelectedTransaction(null);
      setOtpInput('');
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      alert('Failed to confirm transaction. Please check the OTP and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      await onRejectTransaction(transactionId, rejectReason.trim());
      setSelectedTransaction(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject transaction:', error);
      alert('Failed to reject transaction. Please try again.');
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

  if (zoneTransactions.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Pending Transactions
          </h3>
          <p className="text-gray-600 mb-4">
            No items are being sent to Zone {currentZone} right now.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-green-700 text-sm">
              ✨ When logistics sends items to your zone, they'll appear here with an OTP for confirmation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          📥 Incoming Transactions - Zone {currentZone}
        </h3>
        <div className="bg-yellow-100 border border-yellow-200 rounded-lg px-3 py-1">
          <span className="text-yellow-800 text-sm font-medium">
            {zoneTransactions.length} pending
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
                  From: {transaction.performedBy} • {formatTimestamp(transaction.timestamp)}
                </p>
              </div>
              <div className="bg-yellow-100 border border-yellow-200 rounded px-2 py-1">
                <span className="text-yellow-800 text-xs font-medium">PENDING</span>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <div className="font-medium">{transaction.amount}</div>
                </div>
                <div>
                  <span className="text-gray-500">From:</span>
                  <div className="font-medium">Logistics</div>
                </div>
                <div>
                  <span className="text-gray-500">To:</span>
                  <div className="font-medium">Zone {currentZone}</div>
                </div>
                <div>
                  <span className="text-gray-500">ID:</span>
                  <div className="font-medium font-mono text-xs">{transaction.id.slice(-8)}</div>
                </div>
              </div>
              
              {transaction.notes && (
                <div className="mt-3">
                  <span className="text-gray-500 text-sm">Notes:</span>
                  <div className="text-sm">{transaction.notes}</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedTransaction === transaction.id ? (
              <div className="space-y-4">
                
                {/* OTP Confirmation */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-3">🔐 Enter OTP to Confirm</h5>
                  <p className="text-green-700 text-sm mb-3">
                    The sender should have provided you with a 4-digit OTP code.
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
                      onClick={() => handleConfirm(transaction.id)}
                      disabled={isProcessing || otpInput.length !== 4}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg font-medium disabled:cursor-not-allowed"
                    >
                      {isProcessing ? '...' : '✅ Confirm'}
                    </button>
                  </div>
                </div>

                {/* Rejection Form */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-900 mb-3">❌ Or Reject Transaction</h5>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1 px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Reason for rejection..."
                    />
                    <button
                      onClick={() => handleReject(transaction.id)}
                      disabled={isProcessing || !rejectReason.trim()}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-2 rounded-lg font-medium disabled:cursor-not-allowed"
                    >
                      {isProcessing ? '...' : '❌ Reject'}
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
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedTransaction(transaction.id)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                🔐 Confirm with OTP
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 How to Confirm Transactions:</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>1. Check the transaction details carefully</li>
          <li>2. Get the 4-digit OTP from the sender (logistics worker)</li>
          <li>3. Enter the OTP and click "Confirm" to accept the items</li>
          <li>4. Or provide a reason and "Reject" if there's an issue</li>
        </ul>
      </div>
    </div>
  );
}

export default TransactionReceiveView;