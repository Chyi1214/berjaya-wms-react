// Compared Item Tab - Smart discrepancy highlighting with sorting and location filtering
import { useMemo, useState } from 'react';
import { InventoryCountEntry } from '../../../types';

interface ComparedItemTabProps {
  expectedData: InventoryCountEntry[];
  checkedData: InventoryCountEntry[];
  onConcludeToday?: () => void;
}

type LocationFilter = 'all' | 'logistics' | 'production';

interface EnhancedInventoryEntry extends InventoryCountEntry {
  checkedAmount?: number;
  discrepancy: number;
  discrepancyRatio: number;
  hasDiscrepancy: boolean;
}

export function ComparedItemTab({ expectedData, checkedData, onConcludeToday }: ComparedItemTabProps) {
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');

  // Create enhanced data with discrepancy calculation and smart sorting
  const enhancedData = useMemo(() => {
    const checkedMap = new Map<string, number>();
    const expectedMap = new Map<string, number>();
    
    // Filter data based on location filter
    const getFilteredData = (data: InventoryCountEntry[]) => {
      if (locationFilter === 'logistics') {
        return data.filter(item => item.location === 'logistics');
      } else if (locationFilter === 'production') {
        return data.filter(item => item.location.startsWith('production_zone_'));
      }
      return data; // 'all' - no filtering
    };

    const filteredCheckedData = getFilteredData(checkedData);
    const filteredExpectedData = getFilteredData(expectedData);

    // Create map of checked amounts by SKU (filtered by location)
    // Group by SKU and location to get latest count per location
    const checkedByLocation = new Map<string, InventoryCountEntry>();
    filteredCheckedData.forEach(item => {
      const key = `${item.sku}_${item.location}`;
      const existing = checkedByLocation.get(key);
      if (!existing || item.timestamp > existing.timestamp) {
        checkedByLocation.set(key, item);
      }
    });
    
    // Sum latest counts per location for each SKU
    checkedByLocation.forEach(item => {
      const existing = checkedMap.get(item.sku) || 0;
      checkedMap.set(item.sku, existing + item.amount);
    });

    // Create map of expected amounts by SKU (filtered by location)
    // Group by SKU and location to get latest count per location
    const expectedByLocation = new Map<string, InventoryCountEntry>();
    filteredExpectedData.forEach(item => {
      const key = `${item.sku}_${item.location}`;
      const existing = expectedByLocation.get(key);
      if (!existing || item.timestamp > existing.timestamp) {
        expectedByLocation.set(key, item);
      }
    });
    
    // Sum latest counts per location for each SKU
    expectedByLocation.forEach(item => {
      const existing = expectedMap.get(item.sku) || 0;
      expectedMap.set(item.sku, existing + item.amount);
    });

    // Get unique SKUs from both filtered datasets
    const allSKUs = new Set([
      ...filteredExpectedData.map(item => item.sku),
      ...filteredCheckedData.map(item => item.sku)
    ]);

    // Create one entry per unique SKU with totals
    const enhanced: EnhancedInventoryEntry[] = Array.from(allSKUs).map(sku => {
      const expectedTotal = expectedMap.get(sku) || 0;
      const checkedTotal = checkedMap.get(sku) || 0;
      
      const discrepancy = Math.abs(expectedTotal - checkedTotal);
      const discrepancyRatio = expectedTotal > 0 ? discrepancy / expectedTotal : (checkedTotal > 0 ? 1 : 0);
      
      // Use first item with this SKU as template (from filtered data)
      const templateItem = filteredExpectedData.find(item => item.sku === sku) || 
                          filteredCheckedData.find(item => item.sku === sku) ||
                          expectedData.find(item => item.sku === sku) || 
                          checkedData.find(item => item.sku === sku)!;
      
      return {
        ...templateItem,
        amount: expectedTotal, // Show total expected amount
        checkedAmount: checkedTotal,
        discrepancy,
        discrepancyRatio,
        hasDiscrepancy: discrepancy > 0,
        location: locationFilter === 'all' ? 'multiple' : locationFilter
      };
    });

    // Sort by biggest discrepancy ratio first (Eugene's smart algorithm)
    return enhanced.sort((a, b) => b.discrepancyRatio - a.discrepancyRatio);
  }, [expectedData, checkedData, locationFilter]);

  const totalDiscrepancies = enhancedData.filter(item => item.hasDiscrepancy).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🔍 Compared Item Table
          </h3>
          
          {/* Location Filter Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLocationFilter('all')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                locationFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLocationFilter('logistics')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                locationFilter === 'logistics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Logistics
            </button>
            <button
              onClick={() => setLocationFilter('production')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                locationFilter === 'production'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Production
            </button>
          </div>
        </div>
        
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
      
      {expectedData.length > 0 || checkedData.length > 0 ? (
        <div>
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">🔍 Expected vs Checked Comparison</h4>
            <p className="text-yellow-700 text-sm">
              Yellow highlighting shows discrepancies • Sorted by biggest differences first • Filter by location using toggle buttons • Use for investigating inventory issues
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
          <div className="text-4xl mb-4">🔍</div>
          <p className="font-medium">No Data to Compare</p>
          <p className="text-sm mt-2">Expected and Checked tables need data to show comparison</p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-700 text-sm">
              <strong>Compared Table:</strong><br/>
              • Shows Expected vs Checked differences<br/>
              • Yellow highlights problem items<br/>
              • Sorted by biggest discrepancy ratio<br/>
              • Use for investigating inventory issues
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComparedItemTab;