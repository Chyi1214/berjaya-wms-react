// Expected Item Tab - System calculated expected inventory
import { InventoryCountEntry } from '../../../types';
import EnhancedInventoryTable from '../../EnhancedInventoryTable';

interface ExpectedItemTabProps {
  tableData: InventoryCountEntry[];
}

export function ExpectedItemTab({ tableData }: ExpectedItemTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          📊 Expected Item Table
        </h3>
        <span className="text-sm text-gray-500">
          Yesterday inventory + today's completed transactions
        </span>
      </div>
      
      {tableData.length > 0 ? (
        <div>
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-900 mb-2">📊 System Calculated Expected Inventory</h4>
            <p className="text-orange-700 text-sm">
              This shows what inventory should be after applying all completed transactions to yesterday's baseline.
              Compare with Checked Item Table to identify discrepancies.
            </p>
          </div>
          <EnhancedInventoryTable counts={tableData} />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🧮</div>
          <p className="font-medium">No Expected Inventory Calculated Yet</p>
          <p className="text-sm mt-2">Use "Compare Tables" to calculate expected inventory from yesterday results + transactions</p>
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-orange-700 text-sm">
              <strong>How it works:</strong><br/>
              Expected = Yesterday Results + Today's Completed Transactions<br/>
              Compare this with Checked Items to spot differences
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpectedItemTab;