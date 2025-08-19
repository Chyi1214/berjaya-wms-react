// Transaction Log Tab - Display all transaction activity
import { Transaction } from '../../../types';
import TransactionTable from '../../TransactionTable';

interface TransactionLogTabProps {
  transactions: Transaction[];
}

export function TransactionLogTab({ transactions }: TransactionLogTabProps) {
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
      
      <TransactionTable transactions={transactions} />
    </div>
  );
}

export default TransactionLogTab;