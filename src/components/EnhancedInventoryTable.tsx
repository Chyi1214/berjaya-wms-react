// Enhanced Inventory Table Component - Manager dashboard with zone breakdown
import { useState } from 'react';
import { InventoryCountEntry } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EnhancedInventoryTableProps {
  counts: InventoryCountEntry[];
}

// Zone-specific inventory data
interface ZoneInventory {
  zoneId: string;
  zoneName: string;
  quantity: number;
  lastUpdated: Date;
  countedBy: string;
}

// Enhanced inventory summary with zone breakdown
interface EnhancedInventorySummary {
  sku: string;
  itemName: string;
  logistics: number;
  productionZones: ZoneInventory[];
  productionTotal: number;
  grandTotal: number;
  lastUpdated: Date;
  isExpanded?: boolean;
}

export function EnhancedInventoryTable({ counts }: EnhancedInventoryTableProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Process inventory data with zone breakdown
  const processInventoryData = (): EnhancedInventorySummary[] => {
    const summaryMap = new Map<string, EnhancedInventorySummary>();

    counts.forEach(count => {
      const key = count.sku;
      
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          sku: count.sku,
          itemName: count.itemName,
          logistics: 0,
          productionZones: [],
          productionTotal: 0,
          grandTotal: 0,
          lastUpdated: count.timestamp
        });
      }

      const summary = summaryMap.get(key)!;
      
      // Update last updated time if this count is more recent
      if (count.timestamp > summary.lastUpdated) {
        summary.lastUpdated = count.timestamp;
      }

      // Handle logistics location
      if (count.location === 'logistics') {
        // Get latest logistics count for this SKU
        const logisticsCounts = counts.filter(c => 
          c.sku === count.sku && c.location === 'logistics'
        ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        summary.logistics = logisticsCounts[0]?.amount || 0;
      }
      
      // Handle production zones
      else if (count.location.startsWith('production_zone_')) {
        const zoneId = count.location.replace('production_zone_', '');
        
        // Get latest count for this zone
        const zoneCounts = counts.filter(c => 
          c.sku === count.sku && c.location === count.location
        ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        const latestZoneCount = zoneCounts[0];
        
        // Update or add zone data
        const existingZoneIndex = summary.productionZones.findIndex(z => z.zoneId === zoneId);
        const zoneData: ZoneInventory = {
          zoneId,
          zoneName: `Zone ${zoneId}`,
          quantity: latestZoneCount.amount,
          lastUpdated: latestZoneCount.timestamp,
          countedBy: latestZoneCount.countedBy
        };
        
        if (existingZoneIndex >= 0) {
          summary.productionZones[existingZoneIndex] = zoneData;
        } else {
          summary.productionZones.push(zoneData);
        }
      }
    });

    // Calculate totals and sort zones
    return Array.from(summaryMap.values()).map(summary => {
      // Sort production zones by zone number
      summary.productionZones.sort((a, b) => 
        parseInt(a.zoneId) - parseInt(b.zoneId)
      );
      
      // Calculate production total
      summary.productionTotal = summary.productionZones.reduce(
        (sum, zone) => sum + zone.quantity, 0
      );
      
      // Calculate grand total
      summary.grandTotal = summary.logistics + summary.productionTotal;
      
      return summary;
    }).filter(summary => summary.grandTotal > 0);
  };

  const inventorySummary = processInventoryData();
  
  // Filter by search term
  const filteredSummary = inventorySummary.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.sku.localeCompare(b.sku));

  // Toggle row expansion
  const toggleRowExpansion = (sku: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sku)) {
      newExpanded.delete(sku);
    } else {
      newExpanded.add(sku);
    }
    setExpandedRows(newExpanded);
  };

  if (filteredSummary.length === 0 && searchTerm === '') {
    return (
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📊 {t('manager.inventoryDashboard')}
        </h3>
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">📭</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">{t('manager.noData')}</h4>
          <p>{t('inventory.noItems')}</p>
          <p className="text-sm mt-2">{t('nav.backToRoles')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-semibold text-gray-900">
          📊 {t('manager.inventoryDashboard')}
        </h3>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={t('inventory.searchSKU')}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-900">
            {filteredSummary.length}
          </div>
          <div className="text-blue-700 text-sm">{t('manager.activeSKUs')}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-900">
            {filteredSummary.reduce((sum, item) => sum + item.logistics, 0)}
          </div>
          <div className="text-green-700 text-sm">{t('manager.logisticsTotal')}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-900">
            {filteredSummary.reduce((sum, item) => sum + item.productionTotal, 0)}
          </div>
          <div className="text-purple-700 text-sm">{t('manager.productionTotal')}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {new Set(filteredSummary.flatMap(item => 
              item.productionZones.map(zone => zone.zoneId)
            )).size}
          </div>
          <div className="text-gray-700 text-sm">{t('manager.activeZones')}</div>
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
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.total')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('manager.lastUpdated')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('manager.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSummary.map((item) => (
              <>
                {/* Main Row */}
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
                      {item.logistics || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {item.productionTotal || '-'}
                    </span>
                    {item.productionZones.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.productionZones.length} zones
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-blue-600">
                      {item.grandTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.lastUpdated.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.productionZones.length > 0 && (
                      <button
                        onClick={() => toggleRowExpansion(item.sku)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        {expandedRows.has(item.sku) ? (
                          <>
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide Zones
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Show Zones
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Zone Details */}
                {expandedRows.has(item.sku) && item.productionZones.length > 0 && (
                  <tr key={`${item.sku}-zones`} className="bg-blue-50">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="ml-8">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Production Zone Breakdown for {item.sku}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {item.productionZones.map((zone) => (
                            <div key={zone.zoneId} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {zone.zoneName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    by {zone.countedBy}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-purple-600">
                                    {zone.quantity}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {zone.lastUpdated.toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
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
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{item.grandTotal}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{item.logistics || '-'}</div>
                <div className="text-xs text-gray-500">Logistics</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{item.productionTotal || '-'}</div>
                <div className="text-xs text-gray-500">Production ({item.productionZones.length} zones)</div>
              </div>
            </div>

            {item.productionZones.length > 0 && (
              <button
                onClick={() => toggleRowExpansion(item.sku)}
                className="w-full text-blue-600 hover:text-blue-900 text-sm font-medium py-2 border-t border-gray-200"
              >
                {expandedRows.has(item.sku) ? 'Hide Zone Details' : 'Show Zone Details'}
              </button>
            )}

            {/* Mobile Zone Details */}
            {expandedRows.has(item.sku) && item.productionZones.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Zone Breakdown:</h5>
                <div className="space-y-2">
                  {item.productionZones.map((zone) => (
                    <div key={zone.zoneId} className="bg-white border border-gray-200 rounded p-2 flex justify-between">
                      <div>
                        <div className="text-sm font-medium">{zone.zoneName}</div>
                        <div className="text-xs text-gray-500">by {zone.countedBy}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-purple-600">{zone.quantity}</div>
                        <div className="text-xs text-gray-500">{zone.lastUpdated.toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredSummary.length === 0 && searchTerm !== '' && (
        <div className="text-center text-gray-500 py-8">
          <div className="text-2xl mb-2">🔍</div>
          <p>No items found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

export default EnhancedInventoryTable;