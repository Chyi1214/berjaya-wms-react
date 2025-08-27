// Expected Item Tab - Simple baseline inventory table
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
          Baseline inventory (yesterday + concluded transactions)
        </span>
      </div>
      
      {tableData.length > 0 ? (
        <div>
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📊 Baseline Expected Inventory</h4>
            <p className="text-blue-700 text-sm">
              This shows the baseline inventory after period conclusion. New transactions will be added to this baseline.
            </p>
          </div>
          <EnhancedInventoryTable counts={tableData} />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">📦</div>
          <p className="font-medium">No Expected Inventory Set</p>
          <p className="text-sm mt-2">Expected table will be populated after period conclusion</p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-700 text-sm">
              <strong>Expected Table:</strong><br/>
              • Baseline = Yesterday Results after conclusion<br/>
              • New transactions add to this baseline<br/>
              • Use "Compared" tab to see Expected vs Checked differences
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpectedItemTab;