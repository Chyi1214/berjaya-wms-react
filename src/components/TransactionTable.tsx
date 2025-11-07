// Transaction Table - Display transactions in manager dashboard
import { useState } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  selectedTransactions?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}

export function TransactionTable({
  transactions,
  selectedTransactions = new Set(),
  onSelectionChange
}: TransactionTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const allIds = new Set(transactions.map(t => t.id));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (transactionId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    onSelectionChange(newSelected);
  };

  const allSelected = transactions.length > 0 && transactions.every(t => selectedTransactions.has(t.id));
  const someSelected = transactions.some(t => selectedTransactions.has(t.id)) && !allSelected;

  const toggleRow = (transactionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedRows(newExpanded);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(new Date(timestamp));
  };

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return 'bg-green-100 border-green-200 text-green-800';
      case TransactionStatus.PENDING:
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case TransactionStatus.CANCELLED:
        return 'bg-red-100 border-red-200 text-red-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return '✅';
      case TransactionStatus.PENDING:
        return '⏳';
      case TransactionStatus.CANCELLED:
        return '❌';
      default:
        return '❓';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">📋</div>
        <p>No transactions recorded yet</p>
        <p className="text-sm mt-2">Transactions will appear here when workers send items between locations</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Selection Checkbox Column */}
            {onSelectionChange && (
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Transaction
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              From/To
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              📦 Batch
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <>
              <tr key={transaction.id} className="hover:bg-gray-50">
                {/* Selection Checkbox */}
                {onSelectionChange && (
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={(e) => handleSelectOne(transaction.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}

                {/* Expand Button */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleRow(transaction.id)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={expandedRows.has(transaction.id) ? 'Hide details' : 'Show details'}
                  >
                    <svg className="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{transform: expandedRows.has(transaction.id) ? 'rotate(90deg)' : 'rotate(0deg)'}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-mono">
                    {transaction.id.slice(-8)}
                  </div>
                  <div className="text-xs text-gray-500">
                    By: {transaction.performedByName || transaction.performedBy}
                  </div>
                </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {transaction.sku}
                </div>
                <div className="text-sm text-gray-500">
                  {transaction.itemName}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {transaction.transactionType === TransactionType.TRANSFER_IN ? (
                    // For TRANSFER_IN (Scan In), show notes instead of FROM/TO
                    <div className="text-blue-600 font-medium">
                      {transaction.notes || 'Transfer In'}
                    </div>
                  ) : (
                    // For regular transfers, show FROM/TO
                    <div className="flex items-center space-x-1">
                      <span>{transaction.location === 'logistics' ? 'Logistics' : transaction.location?.replace('production_zone_', 'Zone ')}</span>
                      <span className="text-gray-400">→</span>
                      <span>{transaction.toLocation?.replace('production_zone_', 'Zone ')}</span>
                    </div>
                  )}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {transaction.amount}
              </td>

              {/* Batch Cell - v7.20.0: Cross-batch transfer support */}
              <td className="px-6 py-4 whitespace-nowrap">
                {transaction.fromBatch && transaction.toBatch && transaction.fromBatch !== transaction.toBatch ? (
                  // Cross-batch transfer
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        📦 {transaction.fromBatch}
                      </span>
                      <span className="text-purple-600 font-bold">→</span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        🎯 {transaction.toBatch}
                      </span>
                    </div>
                    <div className="text-xs text-purple-600 font-medium">✨ Cross-Batch</div>
                  </div>
                ) : transaction.batchId || transaction.fromBatch ? (
                  // Regular single-batch transfer
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    📦 {transaction.toBatch || transaction.batchId || transaction.fromBatch}
                  </span>
                ) : transaction.notes?.includes('Batch:') ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    📦 {transaction.notes.match(/Batch: (\w+)/)?.[1] || 'Unknown'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">🚫 Unassigned</span>
                )}
                {transaction.isRectification && (
                  <div className="text-xs text-blue-600 mt-1">🔄 Rectification</div>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                  <span className="mr-1">{getStatusIcon(transaction.status)}</span>
                  {transaction.status.toUpperCase()}
                </span>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatTimestamp(transaction.timestamp)}
              </td>
            </tr>

            {/* Expanded Row - Transaction Details */}
            {expandedRows.has(transaction.id) && (
              <tr key={`${transaction.id}-details`}>
                <td colSpan={8 + (onSelectionChange ? 1 : 0)} className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-3">
                    {/* Transaction Details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        📋 Transaction Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Full ID:</span>
                          <span className="ml-2 font-mono text-gray-900">{transaction.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 text-gray-900">{transaction.transactionType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Previous Amount:</span>
                          <span className="ml-2 text-gray-900">{transaction.previousAmount || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">New Amount:</span>
                          <span className="ml-2 text-gray-900">{transaction.newAmount || 'N/A'}</span>
                        </div>
                        {/* Batch Transfer Details - v7.20.0 */}
                        {(transaction.fromBatch || transaction.batchId) && (
                          <div>
                            <span className="text-gray-600">Source Batch:</span>
                            <span className="ml-2 font-medium text-orange-700">
                              📦 {transaction.fromBatch || transaction.batchId}
                            </span>
                          </div>
                        )}
                        {transaction.toBatch && (
                          <div>
                            <span className="text-gray-600">Destination Batch:</span>
                            <span className="ml-2 font-medium text-purple-700">
                              🎯 {transaction.toBatch}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Cross-Batch Transfer Highlight */}
                      {transaction.fromBatch && transaction.toBatch && transaction.fromBatch !== transaction.toBatch && (
                        <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded">
                          <span className="text-sm text-purple-800 font-medium">
                            ✨ Cross-Batch Transfer: Items moved from Batch {transaction.fromBatch} to Batch {transaction.toBatch}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    {transaction.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                          📝 Notes / Reason
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{transaction.notes}</p>
                      </div>
                    )}

                    {/* Rectification Info */}
                    {transaction.isRectification && transaction.parentTransactionId && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <span className="text-sm text-yellow-800">
                          🔄 This is a rectification transaction for #{transaction.parentTransactionId.slice(-8)}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </>
          ))}
        </tbody>
      </table>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-900">
            {transactions.filter(t => t.status === TransactionStatus.COMPLETED).length}
          </div>
          <div className="text-green-700 text-sm">Completed</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-900">
            {transactions.filter(t => t.status === TransactionStatus.PENDING).length}
          </div>
          <div className="text-yellow-700 text-sm">Pending</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-900">
            {transactions.filter(t => t.status === TransactionStatus.CANCELLED).length}
          </div>
          <div className="text-red-700 text-sm">Cancelled</div>
        </div>
      </div>
    </div>
  );
}

export default TransactionTable;