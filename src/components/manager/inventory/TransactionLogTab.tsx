// Transaction Log Tab - Display all transaction activity
import { useState, useMemo } from 'react';
import { Transaction, TransactionFilter } from '../../../types';
import TransactionTable from '../../TransactionTable';
import TransactionFilters from '../../TransactionFilters';
import { transactionService } from '../../../services/transactions';
import { useAuth } from '../../../contexts/AuthContext';

interface TransactionLogTabProps {
  transactions: Transaction[];
}

export function TransactionLogTab({ transactions }: TransactionLogTabProps) {
  const { userRecord } = useAuth();
  const [filters, setFilters] = useState<TransactionFilter>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter transactions based on active filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply all filters
    if (filters.sku) {
      filtered = filtered.filter(t => t.sku.toLowerCase().includes(filters.sku!.toLowerCase()));
    }
    if (filters.location) {
      filtered = filtered.filter(t => t.location === filters.location);
    }
    if (filters.transactionType) {
      filtered = filtered.filter(t => t.transactionType === filters.transactionType);
    }
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters.performedBy) {
      filtered = filtered.filter(t => t.performedBy.toLowerCase().includes(filters.performedBy!.toLowerCase()));
    }
    if (filters.batchId) {
      if (filters.batchId === 'UNASSIGNED') {
        filtered = filtered.filter(t => !t.batchId && !t.notes?.includes('Batch:'));
      } else {
        filtered = filtered.filter(t => t.batchId === filters.batchId || t.notes?.includes(`Batch: ${filters.batchId}`));
      }
    }
    if (filters.includeRectifications === false) {
      filtered = filtered.filter(t => !t.isRectification);
    } else if (filters.includeRectifications === true) {
      filtered = filtered.filter(t => t.isRectification);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.timestamp) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => new Date(t.timestamp) <= filters.dateTo!);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.sku.toLowerCase().includes(term) ||
        t.itemName?.toLowerCase().includes(term) ||
        t.notes?.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [transactions, filters]);

  // Handle transaction cancellation
  const handleCancelTransaction = async (transaction: Transaction) => {
    if (!userRecord) return;

    const reason = prompt('Please enter a reason for cancelling this transaction:');
    if (reason === null) return; // User cancelled

    setIsProcessing(true);
    try {
      await transactionService.cancelAndRectifyTransaction(
        transaction,
        userRecord.email,
        reason
      );

      alert(`✅ Transaction ${transaction.id.slice(-8)} has been cancelled and rectified successfully.`);
    } catch (error) {
      console.error('Failed to cancel transaction:', error);
      alert('❌ Failed to cancel transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if user can cancel transactions (managers and supervisors)
  const canCancelTransactions = Boolean(userRecord && ['manager', 'supervisor'].includes(userRecord.role));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          🔄 Transaction Log
        </h3>
        <div className="text-right">
          <span className="text-sm text-gray-500 block">
            {filteredTransactions.length} of {transactions.length} transactions
          </span>
          {canCancelTransactions && (
            <span className="text-xs text-blue-600">
              Click "Cancel & Rectify" to reverse completed transactions
            </span>
          )}
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            <span className="text-blue-800">Processing transaction cancellation...</span>
          </div>
        </div>
      )}

      <TransactionTable
        transactions={filteredTransactions}
        onCancelTransaction={handleCancelTransaction}
        canCancel={canCancelTransactions}
      />
    </div>
  );
}

export default TransactionLogTab;