// Checked Item Tab - Display items counted by workers
import { InventoryCountEntry } from '../../../types';
import EnhancedInventoryTable from '../../EnhancedInventoryTable';

interface CheckedItemTabProps {
  tableData: InventoryCountEntry[];
}

export function CheckedItemTab({ tableData }: CheckedItemTabProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          📋 Checked Item Table
        </h3>
        <span className="text-sm text-gray-500">
          Items counted by workers today
        </span>
      </div>
      
      {tableData.length > 0 ? (
        <EnhancedInventoryTable counts={tableData} />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <p>No inventory counts recorded yet</p>
          <p className="text-sm mt-2">Workers need to submit counts via Logistics or Production roles</p>
        </div>
      )}
    </div>
  );
}

export default CheckedItemTab;