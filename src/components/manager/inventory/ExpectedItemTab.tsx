// Expected Item Tab - System calculated expected inventory with discrepancy highlighting
import { useMemo } from 'react';
import { InventoryCountEntry } from '../../../types';

interface ExpectedItemTabProps {
  tableData: InventoryCountEntry[];
  checkedData: InventoryCountEntry[];
  onConcludeToday?: () => void;
}

interface EnhancedInventoryEntry extends InventoryCountEntry {
  checkedAmount?: number;
  discrepancy: number;
  discrepancyRatio: number;
  hasDiscrepancy: boolean;
}

export function ExpectedItemTab({ tableData, checkedData, onConcludeToday }: ExpectedItemTabProps) {
  // Create enhanced data with discrepancy calculation and smart sorting
  const enhancedData = useMemo(() => {
    const checkedMap = new Map<string, number>();
    
    // Create map of checked amounts by SKU
    checkedData.forEach(item => {
      const existing = checkedMap.get(item.sku) || 0;
      checkedMap.set(item.sku, existing + item.amount);
    });

    // Enhance expected data with discrepancy info
    const enhanced: EnhancedInventoryEntry[] = tableData.map(expectedItem => {
      const expectedTotal = expectedItem.amount;
      const checkedTotal = checkedMap.get(expectedItem.sku) || 0;
      
      const discrepancy = Math.abs(expectedTotal - checkedTotal);
      const discrepancyRatio = expectedTotal > 0 ? discrepancy / expectedTotal : (checkedTotal > 0 ? 1 : 0);
      
      return {
        ...expectedItem,
        checkedAmount: checkedTotal,
        discrepancy,
        discrepancyRatio,
        hasDiscrepancy: discrepancy > 0
      };
    });

    // Sort by biggest discrepancy ratio first (Eugene's smart algorithm)
    return enhanced.sort((a, b) => b.discrepancyRatio - a.discrepancyRatio);
  }, [tableData, checkedData]);

  const totalDiscrepancies = enhancedData.filter(item => item.hasDiscrepancy).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          📊 Expected Item Table
        </h3>
        <div className="flex items-center space-x-4">
          {totalDiscrepancies > 0 && (
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              ⚠️ {totalDiscrepancies} discrepancies found
            </span>
          )}
          {onConcludeToday && (
            <button
              onClick={onConcludeToday}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ✅ Conclude Today
            </button>
          )}
        </div>
      </div>
      
      {tableData.length > 0 ? (
        <div>
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-900 mb-2">📊 System Calculated Expected Inventory</h4>
            <p className="text-orange-700 text-sm">
              Expected vs Checked comparison • Yellow highlighting shows discrepancies • Sorted by biggest differences first
            </p>
          </div>
          
          {/* Enhanced Table with Discrepancy Highlighting */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Checked
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enhancedData.map((item, index) => (
                    <tr 
                      key={`${item.sku}-${index}`}
                      className={item.hasDiscrepancy ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-white hover:bg-gray-50'}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-semibold text-gray-900">
                          {item.amount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-semibold ${
                          item.hasDiscrepancy ? 'text-yellow-700' : 'text-green-600'
                        }`}>
                          {item.checkedAmount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hasDiscrepancy ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                            ⚠️ {item.discrepancy}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Match
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.location}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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