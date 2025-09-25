// Transaction Table - Display transactions in manager dashboard
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  onCancelTransaction?: (transaction: Transaction) => void;
  canCancel?: boolean;
}

export function TransactionTable({ transactions, onCancelTransaction, canCancel = false }: TransactionTableProps) {
  
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
            {canCancel && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 font-mono">
                  {transaction.id.slice(-8)}
                </div>
                <div className="text-xs text-gray-500">
                  By: {transaction.performedBy}
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

              {/* Batch Cell */}
              <td className="px-6 py-4 whitespace-nowrap">
                {transaction.batchId ? (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    📦 {transaction.batchId}
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

              {/* Actions Cell */}
              {canCancel && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {transaction.status === TransactionStatus.COMPLETED && !transaction.isRectification && (
                    <button
                      onClick={() => onCancelTransaction?.(transaction)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                      title="Cancel and rectify this transaction"
                    >
                      🔄 Cancel & Rectify
                    </button>
                  )}
                  {transaction.parentTransactionId && (
                    <span className="text-xs text-gray-500">
                      ↳ Rectifies #{transaction.parentTransactionId.slice(-8)}
                    </span>
                  )}
                </td>
              )}
            </tr>
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