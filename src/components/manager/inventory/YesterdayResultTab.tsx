// Yesterday Result Tab - Final confirmed inventory from previous period
import { InventoryCountEntry } from '../../../types';
import EnhancedInventoryTable from '../../EnhancedInventoryTable';

interface YesterdayResultTabProps {
  tableData: InventoryCountEntry[];
  showComparison: boolean;
}

export function YesterdayResultTab({ tableData, showComparison }: YesterdayResultTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          🗓️ Yesterday Result Table
        </h3>
        <span className="text-sm text-gray-500">
          Final confirmed inventory from previous period
        </span>
      </div>
      
      {tableData.length > 0 ? (
        <div>
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">📊 Yesterday's Final Results</h4>
            <p className="text-green-700 text-sm">
              {showComparison ? 
                'These are calculated results based on checked items and completed transactions.' :
                'These are the concluded inventory amounts from the previous period.'
              }
            </p>
          </div>
          <EnhancedInventoryTable counts={tableData} />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <p className="font-medium">No Yesterday Results Yet</p>
          <p className="text-sm mt-2">Use "Compare Tables" to calculate expected results or "Conclude Period" to save current data</p>
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-green-700 text-sm">
              <strong>Eugene's v2.0.0 Workflow:</strong><br/>
              1. Compare Checked vs Transaction tables<br/>
              2. Resolve any differences<br/>
              3. Conclude period to create Yesterday Results
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default YesterdayResultTab;