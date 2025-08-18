// Inventory Table Component - Shows aggregated inventory data for Manager
import { InventoryCountEntry } from '../types';

interface InventoryTableProps {
  counts: InventoryCountEntry[];
}

// Aggregate counts by SKU
interface InventorySummary {
  sku: string;
  itemName: string;
  totalCounted: number;
  lastCountedBy: string;
  lastCountedAt: Date;
  countEntries: number;
}

export function InventoryTable({ counts }: InventoryTableProps) {
  // Aggregate counts by SKU
  const inventorySummary: InventorySummary[] = Object.values(
    counts.reduce((acc, count) => {
      const existing = acc[count.sku];
      
      if (existing) {
        existing.totalCounted += count.amount;
        existing.countEntries += 1;
        if (count.timestamp > existing.lastCountedAt) {
          existing.lastCountedBy = count.countedBy;
          existing.lastCountedAt = count.timestamp;
        }
      } else {
        acc[count.sku] = {
          sku: count.sku,
          itemName: count.itemName,
          totalCounted: count.amount,
          lastCountedBy: count.countedBy,
          lastCountedAt: count.timestamp,
          countEntries: 1
        };
      }
      
      return acc;
    }, {} as Record<string, InventorySummary>)
  ).sort((a, b) => a.sku.localeCompare(b.sku));

  if (counts.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📊 Inventory Summary
        </h3>
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">📭</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Inventory Data</h4>
          <p>No items have been counted yet.</p>
          <p className="text-sm mt-2">Switch to Logistics role to start counting inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          📊 Inventory Summary
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
          <span className="text-blue-800 text-sm font-medium">
            {inventorySummary.length} SKUs • {counts.length} Total Counts
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Counted
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Count Entries
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Count By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Count Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventorySummary.map((item) => (
              <tr key={item.sku} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {item.sku}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {item.itemName}
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {item.totalCounted}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                    {item.countEntries} counts
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {item.lastCountedBy.split('@')[0]}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {item.lastCountedAt.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {inventorySummary.map((item) => (
          <div key={item.sku} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {item.sku}
                </span>
                <h4 className="font-medium text-gray-900 mt-1">{item.itemName}</h4>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{item.totalCounted}</div>
                <div className="text-xs text-gray-500">{item.countEntries} counts</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>👤 Last counted by: {item.lastCountedBy.split('@')[0]}</p>
              <p>🕒 {item.lastCountedAt.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">
            {inventorySummary.length}
          </div>
          <div className="text-blue-700 text-sm">Unique SKUs</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-900">
            {counts.length}
          </div>
          <div className="text-green-700 text-sm">Total Counts</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-900">
            {inventorySummary.reduce((sum, item) => sum + item.totalCounted, 0)}
          </div>
          <div className="text-purple-700 text-sm">Total Items</div>
        </div>
      </div>
    </div>
  );
}

export default InventoryTable;