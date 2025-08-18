// Transaction List Component - Display and manage transactions
import { useState } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionUpdate: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onTransactionUpdate }: TransactionListProps) {
  const { t } = useLanguage();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const getTransactionTypeColor = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.COUNT:
        return 'bg-blue-100 text-blue-800';
      case TransactionType.TRANSFER_IN:
        return 'bg-green-100 text-green-800';
      case TransactionType.TRANSFER_OUT:
        return 'bg-orange-100 text-orange-800';
      case TransactionType.ADJUSTMENT:
        return 'bg-purple-100 text-purple-800';
      case TransactionType.INITIAL_STOCK:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: TransactionStatus): string => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TransactionStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case TransactionStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeLabel = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.COUNT:
        return t('transactions.count');
      case TransactionType.TRANSFER_IN:
        return t('transactions.transferIn');
      case TransactionType.TRANSFER_OUT:
        return t('transactions.transferOut');
      case TransactionType.ADJUSTMENT:
        return t('transactions.adjustment');
      case TransactionType.INITIAL_STOCK:
        return t('transactions.initialStock');
      default:
        return type;
    }
  };

  const getStatusLabel = (status: TransactionStatus): string => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return t('transactions.completed');
      case TransactionStatus.PENDING:
        return t('transactions.pending');
      case TransactionStatus.CANCELLED:
        return t('transactions.cancelled');
      default:
        return status;
    }
  };

  const handleApprove = (transaction: Transaction) => {
    const updatedTransaction = {
      ...transaction,
      status: TransactionStatus.COMPLETED,
      approvedBy: 'current-user@example.com' // In real app, get from auth context
    };
    onTransactionUpdate(updatedTransaction);
  };

  const handleCancel = (transaction: Transaction) => {
    const updatedTransaction = {
      ...transaction,
      status: TransactionStatus.CANCELLED
    };
    onTransactionUpdate(updatedTransaction);
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <div className="text-4xl mb-4">📭</div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">{t('transactions.noTransactions')}</h4>
        <p>Start by creating your first transaction above.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inventory.sku')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inventory.itemName')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactions.transactionType')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inventory.amount')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inventory.location')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transactions.transactionDate')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('manager.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {transaction.sku}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {transaction.itemName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTransactionTypeColor(transaction.transactionType)}`}>
                    {getTransactionTypeLabel(transaction.transactionType)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {transaction.amount}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {transaction.fromLocation && transaction.toLocation ? (
                    <>
                      {transaction.fromLocation} → {transaction.toLocation}
                    </>
                  ) : (
                    transaction.location
                  )}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                    {getStatusLabel(transaction.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {transaction.timestamp.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {t('transactions.viewDetails')}
                    </button>
                    {transaction.status === TransactionStatus.PENDING && (
                      <>
                        <button
                          onClick={() => handleApprove(transaction)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          {t('transactions.approve')}
                        </button>
                        <button
                          onClick={() => handleCancel(transaction)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          {t('transactions.cancel')}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {transaction.sku}
                </span>
                <h4 className="font-medium text-gray-900 mt-1">{transaction.itemName}</h4>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                {getStatusLabel(transaction.status)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">Type</div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTransactionTypeColor(transaction.transactionType)}`}>
                  {getTransactionTypeLabel(transaction.transactionType)}
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">{t('inventory.amount')}</div>
                <div className="text-xl font-bold text-gray-900">{transaction.amount}</div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-2">
              <div>📍 {transaction.fromLocation && transaction.toLocation ? 
                `${transaction.fromLocation} → ${transaction.toLocation}` : 
                transaction.location}
              </div>
              <div>👤 {transaction.performedBy}</div>
              <div>🕒 {transaction.timestamp.toLocaleString()}</div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedTransaction(transaction)}
                className="flex-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {t('transactions.viewDetails')}
              </button>
              {transaction.status === TransactionStatus.PENDING && (
                <>
                  <button
                    onClick={() => handleApprove(transaction)}
                    className="flex-1 text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    {t('transactions.approve')}
                  </button>
                  <button
                    onClick={() => handleCancel(transaction)}
                    className="flex-1 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    {t('transactions.cancel')}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('inventory.sku')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.sku}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('inventory.itemName')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.itemName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.transactionType')}</label>
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-1 rounded-full ${getTransactionTypeColor(selectedTransaction.transactionType)}`}>
                      {getTransactionTypeLabel(selectedTransaction.transactionType)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                      {getStatusLabel(selectedTransaction.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.previousAmount')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.previousAmount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('inventory.amount')}</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{selectedTransaction.amount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.newAmount')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.newAmount}</p>
                  </div>
                </div>

                {selectedTransaction.fromLocation && selectedTransaction.toLocation && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('transactions.fromLocation')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedTransaction.fromLocation}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('transactions.toLocation')}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedTransaction.toLocation}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.performedBy')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.performedBy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.transactionDate')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.timestamp.toLocaleString()}</p>
                  </div>
                </div>

                {selectedTransaction.reference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.reference')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.reference}</p>
                  </div>
                )}

                {selectedTransaction.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.notes')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.notes}</p>
                  </div>
                )}

                {selectedTransaction.approvedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('transactions.approvedBy')}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.approvedBy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TransactionList;