// Transaction OTP Display - Shows OTP after transaction creation
import { useState } from 'react';
import { Transaction } from '../types';

interface TransactionOTPDisplayProps {
  transaction: Transaction;
  otp: string;
  onClose: () => void;
}

export function TransactionOTPDisplay({ transaction, otp, onClose }: TransactionOTPDisplayProps) {
  const [copied, setCopied] = useState(false);

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
      
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          ✅ Transaction Created!
        </h3>
        <p className="text-gray-600 text-sm">
          Items sent to production zone for confirmation
        </p>
      </div>

      {/* Transaction Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-3">📋 Transaction Details:</h4>
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
      </div>

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

      {/* Important Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important:</h4>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• Give this OTP to the worker in {transaction.toLocation?.replace('production_zone_', 'Zone ')}</li>
          <li>• Transaction is PENDING until confirmed</li>
          <li>• OTP expires after confirmation or rejection</li>
          <li>• Keep this window open until confirmed</li>
        </ul>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full btn-primary"
      >
        📱 Continue Working
      </button>
    </div>
  );
}

export default TransactionOTPDisplay;