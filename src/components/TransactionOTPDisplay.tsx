// Transaction OTP Display - Shows OTP after transaction creation
import { useState, useEffect } from 'react';
import { Transaction, TransactionStatus, BOM } from '../types';
import { bomService } from '../services/bom';

interface TransactionOTPDisplayProps {
  transaction: Transaction;
  otp: string;
  onClose: () => void;
  allTransactions?: Transaction[];
}

export function TransactionOTPDisplay({ transaction, otp, onClose, allTransactions }: TransactionOTPDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [bomData, setBomData] = useState<BOM | null>(null);
  const [loadingBOM, setLoadingBOM] = useState(false);

  // Check if this is a BOM transaction and fetch BOM data
  const isBOM = transaction.sku.startsWith('BOM');

  useEffect(() => {
    const fetchBOMData = async () => {
      if (!isBOM) return;
      
      setLoadingBOM(true);
      try {
        const bom = await bomService.getBOMByCode(transaction.sku);
        setBomData(bom);
      } catch (error) {
        console.error('Failed to fetch BOM data:', error);
      } finally {
        setLoadingBOM(false);
      }
    };

    fetchBOMData();
  }, [transaction.sku, isBOM]);
  
  // Check if this transaction has been updated in real-time
  const currentTransaction = allTransactions?.find(t => t.id === transaction.id) || transaction;
  const isCompleted = currentTransaction.status === TransactionStatus.COMPLETED;
  const isRejected = currentTransaction.status === TransactionStatus.CANCELLED;

  // 🔍 DEBUG: Log status information for troubleshooting desktop/mobile differences
  console.log('🖥️📱 TransactionOTPDisplay Debug:', {
    transactionId: transaction.id,
    originalStatus: transaction.status,
    currentStatus: currentTransaction.status,
    isCompleted,
    isRejected,
    isPending: !isCompleted && !isRejected,
    userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
    screenWidth: window.innerWidth
  });

  const handleCopyOTP = async () => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy OTP:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = otp;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
      
      {/* Dynamic Status Header */}
      <div className="text-center mb-6">
        {isCompleted ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ✅ Transaction Completed!
            </h3>
            <div className="bg-green-100 border border-green-200 rounded-full px-3 py-1 inline-block mb-2">
              <span className="text-green-800 text-sm font-medium">STATUS: COMPLETED</span>
            </div>
            <p className="text-gray-600 text-sm">
              Production worker has confirmed and received the items
            </p>
          </>
        ) : isRejected ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ❌ Transaction Rejected
            </h3>
            <div className="bg-red-100 border border-red-200 rounded-full px-3 py-1 inline-block mb-2">
              <span className="text-red-800 text-sm font-medium">STATUS: REJECTED</span>
            </div>
            <p className="text-gray-600 text-sm">
              Production worker has rejected this transaction
            </p>
          </>
        ) : (
          <>
            {/* Enhanced Pending Status - More visible on all devices */}
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-orange-300 ring-opacity-30 animate-pulse">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ⏳ Transaction Awaiting Confirmation
            </h3>
            <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 rounded-full px-4 py-2 inline-block mb-3 shadow-md">
              <span className="text-orange-900 font-bold text-base">🟠 STATUS: PENDING</span>
            </div>
            <p className="text-gray-700 font-medium">
              Production worker must confirm with OTP to complete this transaction
            </p>
            <div className="mt-2 text-sm text-orange-600 font-medium">
              🖥️📱 Debug: This should be visible on both desktop and mobile
            </div>
          </>
        )}
      </div>

      {/* Critical Instructions - Only show when pending */}
      {!isCompleted && !isRejected && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <h4 className="font-bold text-red-900 mb-2">🚨 TRANSACTION NOT COMPLETE:</h4>
          <ul className="text-red-700 text-sm space-y-2 font-medium">
            <li>• 🔄 <strong>PENDING until production worker confirms</strong></li>
            <li>• 📱 Give this OTP to the worker in {transaction.toLocation?.replace('production_zone_', 'Zone ')}</li>
            <li>• ⏰ Keep monitoring - you'll know when it's confirmed</li>
            <li>• ❌ Items are NOT transferred yet</li>
          </ul>
        </div>
      )}
      
      {/* Success/Completion Message */}
      {isCompleted && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
          <h4 className="font-bold text-green-900 mb-2">🎉 TRANSACTION COMPLETED:</h4>
          <ul className="text-green-700 text-sm space-y-2 font-medium">
            <li>• ✅ <strong>Production worker has confirmed receipt</strong></li>
            <li>• 📦 Items have been successfully transferred</li>
            <li>• 📝 Transaction is now complete and recorded</li>
            <li>• 🔄 Inventory levels have been updated</li>
          </ul>
        </div>
      )}
      
      {/* Rejection Message */}
      {isRejected && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <h4 className="font-bold text-red-900 mb-2">❌ TRANSACTION REJECTED:</h4>
          <ul className="text-red-700 text-sm space-y-2 font-medium">
            <li>• 🚫 <strong>Production worker has rejected this transaction</strong></li>
            <li>• 📋 Reason: {currentTransaction.notes || 'No reason provided'}</li>
            <li>• 🔄 Items remain in logistics inventory</li>
            <li>• 💬 Contact production zone for details</li>
          </ul>
        </div>
      )}

      {/* Transaction Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-3">📋 Transaction Details:</h4>

        {/* Multi-item transaction display (v7.6.0+) */}
        {transaction.items && transaction.items.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between mb-3">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium text-blue-600">{transaction.items.length} item(s)</span>
              </div>

              {/* Items list */}
              <div className="bg-white rounded-lg p-3 mb-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {transaction.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center border-b border-gray-200 last:border-b-0 pb-2 last:pb-0">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.sku}</div>
                        <div className="text-xs text-gray-600">{item.itemName}</div>
                      </div>
                      <div className="font-medium text-gray-900 ml-3">
                        {item.amount} units
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">To Zone:</span>
                <span className="font-medium">{transaction.toLocation?.replace('production_zone_', 'Zone ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{formatTimestamp(transaction.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-medium font-mono text-xs">{transaction.id.slice(-8)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Single-item transaction display (legacy) */
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Item:</span>
              <span className="font-medium">{transaction.sku} - {transaction.itemName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">{transaction.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">To Zone:</span>
              <span className="font-medium">{transaction.toLocation?.replace('production_zone_', 'Zone ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{formatTimestamp(transaction.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ID:</span>
              <span className="font-medium font-mono text-xs">{transaction.id.slice(-8)}</span>
            </div>
          </div>
        )}
      </div>

      {/* BOM Content Display */}
      {isBOM && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-3">📦 BOM Contents:</h4>
          {loadingBOM ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-blue-700">Loading BOM details...</span>
            </div>
          ) : bomData ? (
            <div className="space-y-3">
              <div className="bg-white rounded p-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>{bomData.name}</strong> {bomData.description && `- ${bomData.description}`}
                </p>
                <p className="text-xs text-blue-600 mb-2">
                  This BOM will be expanded into {bomData.components.length} individual components:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {bomData.components.map((component, index) => (
                    <div key={index} className="flex justify-between items-center text-xs bg-blue-25 p-2 rounded">
                      <span className="font-medium text-blue-900">{component.sku}</span>
                      <span className="text-blue-700">
                        {component.quantity} × {transaction.amount} = {component.quantity * transaction.amount} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-blue-700">
              <p className="text-sm">⚠️ Could not load BOM details</p>
              <p className="text-xs">BOM will still be processed normally</p>
            </div>
          )}
        </div>
      )}

      {/* OTP Display */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6 text-center">
        <h4 className="font-semibold text-blue-900 mb-2">🔐 One-Time Password</h4>
        <p className="text-blue-700 text-sm mb-4">
          Share this OTP with the production zone worker to confirm the transaction
        </p>
        
        <div className="bg-white border-2 border-blue-300 rounded-lg p-4 mb-4">
          <div className="text-3xl font-bold font-mono text-blue-600 tracking-wider">
            {otp}
          </div>
        </div>

        <button
          onClick={handleCopyOTP}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            copied 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-blue-100 border border-blue-300 text-blue-800 hover:bg-blue-200'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy OTP
            </>
          )}
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`w-full font-medium py-3 px-4 rounded-lg transition-colors ${
          isCompleted 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : isRejected
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
      >
        {isCompleted 
          ? '✅ Transaction Complete - Close' 
          : isRejected
            ? '❌ Transaction Rejected - Close'
            : '📋 I\'ve Shared the OTP (Transaction Still Pending)'
        }
      </button>
    </div>
  );
}

export default TransactionOTPDisplay;