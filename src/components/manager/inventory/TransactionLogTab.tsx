// Transaction Log Tab - Display all transaction activity
import { useState, useMemo } from 'react';
import { Transaction, TransactionFilter, TransactionStatus } from '../../../types';
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Selection state for bulk operations
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

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
      if (filters.batchId === 'DEFAULT') {
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

    // Cross-batch transfer filter
    if (filters.showCrossBatchOnly === false) {
      // Hide cross-batch transfers
      filtered = filtered.filter(t =>
        !(t.notes?.includes('Manager transfer from Batch') && t.notes?.includes('to Batch'))
      );
    } else if (filters.showCrossBatchOnly === true) {
      // Show only cross-batch transfers
      filtered = filtered.filter(t =>
        t.notes?.includes('Manager transfer from Batch') && t.notes?.includes('to Batch')
      );
    }

    return filtered;
  }, [transactions, filters]);

  // Paginate filtered transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters]);

  // Select all filtered transactions (across all pages)
  const handleSelectAllFiltered = () => {
    const allFilteredIds = new Set(filteredTransactions.map(t => t.id));
    setSelectedTransactions(allFilteredIds);
  };

  // Handle bulk cancel & rectify
  const handleBulkCancelRectify = async () => {
    if (!userRecord || selectedTransactions.size === 0) return;

    // Filter to only eligible transactions (completed, not rectifications)
    const eligibleTransactions = filteredTransactions.filter(t =>
      selectedTransactions.has(t.id) &&
      t.status === TransactionStatus.COMPLETED &&
      !t.isRectification
    );

    if (eligibleTransactions.length === 0) {
      alert('⚠️ No eligible transactions selected. Only completed, non-rectification transactions can be cancelled.');
      return;
    }

    const reason = prompt(`Cancel & Rectify ${eligibleTransactions.length} transaction${eligibleTransactions.length > 1 ? 's' : ''}?\n\nPlease enter a reason:`);
    if (reason === null) return;

    setIsProcessing(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const transaction of eligibleTransactions) {
        try {
          await transactionService.cancelAndRectifyTransaction(
            transaction,
            userRecord.email,
            reason
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to cancel transaction ${transaction.id}:`, error);
          failCount++;
        }
      }

      setSelectedTransactions(new Set());

      if (failCount === 0) {
        alert(`✅ Successfully cancelled and rectified ${successCount} transaction${successCount > 1 ? 's' : ''}.`);
      } else {
        alert(`⚠️ Cancelled ${successCount} transactions, but ${failCount} failed. Check console for details.`);
      }
    } catch (error) {
      console.error('Bulk cancel & rectify failed:', error);
      alert('❌ Bulk operation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!userRecord || selectedTransactions.size === 0) return;

    const count = selectedTransactions.size;
    if (!confirm(`⚠️ Bulk Delete Transaction Records?\n\nYou are about to PERMANENTLY delete ${count} transaction record${count > 1 ? 's' : ''}.\n\n⚠️ This does NOT reverse inventory changes!\n\nAre you sure?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Delete all selected transactions
      for (const transactionId of selectedTransactions) {
        try {
          await transactionService.deleteTransaction(transactionId);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete transaction ${transactionId}:`, error);
          failCount++;
        }
      }

      // Clear selection
      setSelectedTransactions(new Set());

      if (failCount === 0) {
        alert(`✅ Successfully deleted ${successCount} transaction record${successCount > 1 ? 's' : ''}.`);
      } else {
        alert(`⚠️ Deleted ${successCount} records, but ${failCount} failed. Check console for details.`);
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('❌ Bulk delete operation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear selection when filters change
  useMemo(() => {
    setSelectedTransactions(new Set());
  }, [filters]);

  // Check if user can cancel transactions (managers, supervisors, and devAdmins)
  const canCancelTransactions = Boolean(userRecord && ['manager', 'supervisor', 'devAdmin'].includes(userRecord.role));

  // Check if user can delete transactions (managers and devAdmins only)
  const canDeleteTransactions = Boolean(userRecord && ['manager', 'devAdmin'].includes(userRecord.role));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          🔄 Transaction Log
        </h3>
        <div className="text-right">
          <span className="text-sm text-gray-500 block">
            Showing {filteredTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} filtered ({transactions.length} total)
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

      {/* Bulk Actions Bar */}
      {(canCancelTransactions || canDeleteTransactions) && (
        <div className="mb-4 bg-gray-50 border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Selection info and controls */}
            <div className="flex items-center space-x-3">
              {selectedTransactions.size > 0 ? (
                <>
                  <span className="text-gray-900 font-medium">
                    {selectedTransactions.size} of {filteredTransactions.length} selected
                  </span>
                  <button
                    onClick={() => setSelectedTransactions(new Set())}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <span className="text-gray-600 text-sm">
                  Select transactions to perform bulk actions
                </span>
              )}
              {selectedTransactions.size < filteredTransactions.length && (
                <button
                  onClick={handleSelectAllFiltered}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All {filteredTransactions.length} Filtered
                </button>
              )}
            </div>

            {/* Right side - Action buttons (always visible) */}
            <div className="flex items-center space-x-2">
              {canCancelTransactions && (
                <button
                  onClick={handleBulkCancelRectify}
                  disabled={isProcessing || selectedTransactions.size === 0}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Cancel & Rectify ({selectedTransactions.size})</span>
                </button>
              )}
              {canDeleteTransactions && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isProcessing || selectedTransactions.size === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span>🗑️</span>
                  <span>Delete ({selectedTransactions.size})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
            <span className="text-blue-800">Processing transaction cancellation...</span>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredTransactions.length > itemsPerPage && (
        <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 px-4">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Last
            </button>
          </div>
        </div>
      )}

      <TransactionTable
        transactions={paginatedTransactions}
        selectedTransactions={selectedTransactions}
        onSelectionChange={(canCancelTransactions || canDeleteTransactions) ? setSelectedTransactions : undefined}
      />

      {/* Bottom Pagination (duplicate for convenience) */}
      {filteredTransactions.length > itemsPerPage && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionLogTab;