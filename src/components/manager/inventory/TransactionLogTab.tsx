// Transaction Log Tab - Display all transaction activity
import { useState, useMemo } from 'react';
import { Transaction } from '../../../types';
import TransactionTable from '../../TransactionTable';
import { SearchAutocomplete } from '../../common/SearchAutocomplete';

interface TransactionLogTabProps {
  transactions: Transaction[];
}

export function TransactionLogTab({ transactions }: TransactionLogTabProps) {
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);

  // Filter transactions based on selected item
  const filteredTransactions = useMemo(() => {
    if (!selectedSearchResult) {
      return transactions; // Show all transactions if no filter
    }

    // Filter by SKU or item name
    return transactions.filter(transaction => 
      transaction.sku === selectedSearchResult.code ||
      transaction.itemName?.toLowerCase().includes(selectedSearchResult.name.toLowerCase())
    );
  }, [transactions, selectedSearchResult]);

  // Handle item selection from SearchAutocomplete
  const handleItemSelect = (result: any) => {
    setSelectedSearchResult(result);
  };

  // Clear filter
  const handleClearFilter = () => {
    setSelectedSearchResult(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          🔄 Transaction Log
        </h3>
        <span className="text-sm text-gray-500">
          All transaction activity (pending, completed, cancelled)
        </span>
      </div>

      {/* Search Filter */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Filter by Item
            </label>
            <SearchAutocomplete
              placeholder="Search by SKU (A001) or item name to filter transactions..."
              onSelect={handleItemSelect}
              value={selectedSearchResult}
              onClear={handleClearFilter}
            />
          </div>
          {selectedSearchResult && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Filtering:</span> {selectedSearchResult.code} - {selectedSearchResult.name}
              <br />
              <span className="text-blue-600">{filteredTransactions.length} of {transactions.length} transactions</span>
            </div>
          )}
        </div>
      </div>
      
      <TransactionTable transactions={filteredTransactions} />
    </div>
  );
}

export default TransactionLogTab;