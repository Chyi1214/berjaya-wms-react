// Inventory Table Component - Shows aggregated inventory data for Manager
import { InventoryCountEntry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryTableProps {
  counts: InventoryCountEntry[];
}

// Current inventory by SKU and location (latest count only)
interface LocationQuantity {
  logistics: number;
  production: number; // Sum of all production zones
}

interface InventorySummary {
  sku: string;
  itemName: string;
  quantities: LocationQuantity;
  lastCountedBy: string;
  lastCountedAt: Date;
}

export function InventoryTable({ counts }: InventoryTableProps) {
  const { t } = useLanguage();
  // Get latest count per SKU per location (physical stocktake logic)
  const inventorySummary: InventorySummary[] = Object.values(
    counts.reduce((acc, count) => {
      const key = count.sku;
      
      if (!acc[key]) {
        acc[key] = {
          sku: count.sku,
          itemName: count.itemName,
          quantities: { logistics: 0, production: 0 },
          lastCountedBy: count.countedBy,
          lastCountedAt: count.timestamp
        };
      }
      
      // Update if this count is more recent
      if (count.timestamp >= acc[key].lastCountedAt) {
        acc[key].lastCountedBy = count.countedBy;
        acc[key].lastCountedAt = count.timestamp;
      }
      
      return acc;
    }, {} as Record<string, InventorySummary>)
  );
  
  // Calculate quantities for each SKU (fixed logic to avoid duplication)
  inventorySummary.forEach(summary => {
    // Get latest logistics count for this SKU
    const logisticsCounts = counts.filter(c => 
      c.sku === summary.sku && c.location === 'logistics'
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (logisticsCounts.length > 0) {
      summary.quantities.logistics = logisticsCounts[0].amount;
    }
    
    // Get latest count per production zone for this SKU, then sum
    const productionCounts = counts.filter(c => 
      c.sku === summary.sku && c.location.startsWith('production_zone_')
    );
    
    if (productionCounts.length > 0) {
      // Group by zone and get latest per zone
      const zoneLatest = productionCounts.reduce((zones, c) => {
        if (!zones[c.location] || c.timestamp > zones[c.location].timestamp) {
          zones[c.location] = c;
        }
        return zones;
      }, {} as Record<string, InventoryCountEntry>);
      
      // Sum latest counts from all zones
      summary.quantities.production = Object.values(zoneLatest)
        .reduce((sum, c) => sum + c.amount, 0);
    }
  });
  
  // Filter out items with no quantities and sort
  const filteredSummary = inventorySummary
    .filter(item => item.quantities.logistics > 0 || item.quantities.production > 0)
    .sort((a, b) => a.sku.localeCompare(b.sku));

  if (filteredSummary.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📊 {t('manager.inventoryDashboard')}
        </h3>
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">📭</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">{t('manager.noData')}</h4>
          <p>{t('inventory.noItems')}</p>
          <p className="text-sm mt-2">{t('inventory.startCounting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          📊 {t('manager.inventoryDashboard')}
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
          <span className="text-blue-800 text-sm font-medium">
            {t('stats.items', { count: filteredSummary.length })} • {t('stats.countRecords', { count: counts.length })}
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inventory.sku')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inventory.partName')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('roles.logistics')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('roles.production')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('manager.lastUpdated')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSummary.map((item) => (
              <tr key={item.sku} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {item.sku}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.itemName}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {item.quantities.logistics || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {item.quantities.production || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.lastCountedAt.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredSummary.map((item) => (
          <div key={item.sku} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {item.sku}
                </span>
                <h4 className="font-medium text-gray-900 mt-1">{item.itemName}</h4>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{item.quantities.logistics || '-'}</div>
                <div className="text-xs text-gray-500">{t('roles.logistics')}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{item.quantities.production || '-'}</div>
                <div className="text-xs text-gray-500">{t('roles.production')}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center">
              🕒 {item.lastCountedAt.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">
            {filteredSummary.length}
          </div>
          <div className="text-blue-700 text-sm">{t('manager.activeSKUs')}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-900">
            {filteredSummary.reduce((sum, item) => sum + item.quantities.logistics, 0)}
          </div>
          <div className="text-green-700 text-sm">{t('manager.logisticsTotal')}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-900">
            {filteredSummary.reduce((sum, item) => sum + item.quantities.production, 0)}
          </div>
          <div className="text-purple-700 text-sm">{t('manager.productionTotal')}</div>
        </div>
      </div>
    </div>
  );
}

export default InventoryTable;