// Transaction View Component - Transaction management interface
import { useState, useMemo } from 'react';
import { User, Transaction, TransactionStatus, TransactionFilter } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import TransactionFilters from './TransactionFilters';

interface TransactionViewProps {
  user: User;
  onBack: () => void;
  transactions: Transaction[];
  onTransactionCreate: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onTransactionUpdate: (transaction: Transaction) => void;
}

export function TransactionView({ 
  user, 
  onBack, 
  transactions, 
  onTransactionCreate,
  onTransactionUpdate 
}: TransactionViewProps) {
  const { t } = useLanguage();
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [filters, setFilters] = useState<TransactionFilter>({});
  
  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      if (filters.sku && !transaction.sku.toLowerCase().includes(filters.sku.toLowerCase())) {
        return false;
      }
      if (filters.location && transaction.location !== filters.location) {
        return false;
      }
      if (filters.transactionType && transaction.transactionType !== filters.transactionType) {
        return false;
      }
      if (filters.status && transaction.status !== filters.status) {
        return false;
      }
      if (filters.performedBy && !transaction.performedBy.toLowerCase().includes(filters.performedBy.toLowerCase())) {
        return false;
      }
      if (filters.dateFrom && transaction.timestamp < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && transaction.timestamp > filters.dateTo) {
        return false;
      }
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const searchFields = [
          transaction.sku,
          transaction.itemName,
          transaction.notes || '',
          transaction.reference || ''
        ];
        if (!searchFields.some(field => field.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, filters]);

  const handleCreateTransaction = (transactionData: Omit<Transaction, 'id' | 'timestamp'>) => {
    onTransactionCreate(transactionData);
    setShowNewTransaction(false);
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
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                {t('transactions.title')}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowNewTransaction(true)}
                className="btn-primary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('transactions.newTransaction')}
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {t('transactions.role')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('transactions.title')}
            </h2>
            <p className="text-gray-600">
              {t('transactions.description')}
            </p>
          </div>

          {/* Filters Section */}
          <div className="card">
            <TransactionFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* Transaction Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-900">
                {transactions.length}
              </div>
              <div className="text-blue-700 text-sm">{t('common.total')} {t('transactions.transactionHistory')}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-900">
                {transactions.filter(t => t.status === TransactionStatus.COMPLETED).length}
              </div>
              <div className="text-green-700 text-sm">{t('transactions.completed')}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-900">
                {transactions.filter(t => t.status === TransactionStatus.PENDING).length}
              </div>
              <div className="text-yellow-700 text-sm">{t('transactions.pending')}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-900">
                {transactions.filter(t => t.status === TransactionStatus.CANCELLED).length}
              </div>
              <div className="text-red-700 text-sm">{t('transactions.cancelled')}</div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                📋 {t('transactions.transactionHistory')}
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                <span className="text-blue-800 text-sm font-medium">
                  {filteredTransactions.length} {t('transactions.transactionHistory').toLowerCase()}
                </span>
              </div>
            </div>
            
            <TransactionList
              transactions={filteredTransactions}
              onTransactionUpdate={onTransactionUpdate}
            />
          </div>

          {/* Back Button */}
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
        </div>
      </main>

      {/* New Transaction Modal */}
      {showNewTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('transactions.newTransaction')}
                </h3>
                <button
                  onClick={() => setShowNewTransaction(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <TransactionForm
                onSubmit={handleCreateTransaction}
                onCancel={() => setShowNewTransaction(false)}
                userEmail={user.email}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionView;