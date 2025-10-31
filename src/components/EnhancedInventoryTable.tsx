// Enhanced Inventory Table Component - Manager dashboard with zone breakdown
import { useState } from 'react';
import { InventoryCountEntry, BatchAllocation } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import StockAdjustmentDialog from './manager/inventory/StockAdjustmentDialog';
import MakeTransactionDialog from './manager/inventory/MakeTransactionDialog';

interface EnhancedInventoryTableProps {
  counts: InventoryCountEntry[];
  batchAllocations?: BatchAllocation[];
  showActions?: boolean;
  onAdjustStock?: (sku: string, location: string) => void;
}

// Zone-specific inventory data
interface ZoneInventory {
  zoneId: string;
  zoneName: string;
  quantity: number;
  lastUpdated: Date;
  countedBy: string;
}

// Batch breakdown data
interface BatchBreakdown {
  batchId: string;
  location: string;
  quantity: number;
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
  batchBreakdown?: BatchBreakdown[];
  isExpanded?: boolean;
}

export function EnhancedInventoryTable({ counts, batchAllocations }: EnhancedInventoryTableProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [adjustDialogSku, setAdjustDialogSku] = useState<{ sku: string; itemName: string } | null>(null);
  const [transferDialogSku, setTransferDialogSku] = useState<{ sku: string; itemName: string } | null>(null);

  // Process inventory data with zone breakdown
  const processInventoryData = (): EnhancedInventorySummary[] => {
    const summaryMap = new Map<string, EnhancedInventorySummary>();

    // First, create summary entries for each unique SKU
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
    });

    // Then calculate quantities for each SKU (fixed logic to avoid duplication)
    Array.from(summaryMap.values()).forEach(summary => {
      // Get latest logistics count for this SKU
      const logisticsCounts = counts.filter(c => 
        c.sku === summary.sku && c.location === 'logistics'
      ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      if (logisticsCounts.length > 0) {
        summary.logistics = logisticsCounts[0].amount;
      }
      
      // Get all production zone counts for this SKU
      const productionCounts = counts.filter(c => 
        c.sku === summary.sku && c.location.startsWith('production_zone_')
      );
      
      // Group by zone and get latest per zone
      const zoneLatest: Record<string, InventoryCountEntry> = {};
      productionCounts.forEach(count => {
        const zoneId = count.location.replace('production_zone_', '');
        if (!zoneLatest[zoneId] || count.timestamp > zoneLatest[zoneId].timestamp) {
          zoneLatest[zoneId] = count;
        }
      });
      
      // Create zone data from latest counts
      summary.productionZones = Object.entries(zoneLatest).map(([zoneId, latestCount]) => ({
        zoneId,
        zoneName: `Zone ${zoneId}`,
        quantity: latestCount.amount,
        lastUpdated: latestCount.timestamp,
        countedBy: latestCount.countedBy
      }));

      // Add batch breakdown if batch allocations are provided
      if (batchAllocations) {
        const batchBreakdown: BatchBreakdown[] = [];

        // Find all batch allocations for this SKU
        const skuAllocations = batchAllocations.filter(alloc => alloc.sku === summary.sku);

        skuAllocations.forEach(alloc => {
          Object.entries(alloc.allocations).forEach(([batchId, quantity]) => {
            if (quantity > 0) {
              batchBreakdown.push({
                batchId,
                location: alloc.location,
                quantity
              });
            }
          });
        });

        // Sort by batch ID numerically
        batchBreakdown.sort((a, b) => {
          const aNum = a.batchId === 'DEFAULT' ? Number.MAX_SAFE_INTEGER : parseInt(a.batchId) || 0;
          const bNum = b.batchId === 'DEFAULT' ? Number.MAX_SAFE_INTEGER : parseInt(b.batchId) || 0;
          return aNum - bNum;
        });

        summary.batchBreakdown = batchBreakdown;
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
                    <div className="flex items-center justify-center gap-2">
                      {/* Batch Breakdown Button (shown only when batch allocations available) */}
                      {item.batchBreakdown && item.batchBreakdown.length > 0 && (
                        <button
                          onClick={() => toggleRowExpansion(`${item.sku}-batches`)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title={expandedRows.has(`${item.sku}-batches`) ? 'Hide Batches' : 'Show Batches'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {expandedRows.has(`${item.sku}-batches`) ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )}
                          </svg>
                        </button>
                      )}

                      {/* Zone Expansion Button */}
                      {item.productionZones.length > 0 && (
                        <button
                          onClick={() => toggleRowExpansion(item.sku)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title={expandedRows.has(item.sku) ? 'Hide Zones' : 'Show Zones'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {expandedRows.has(item.sku) ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )}
                          </svg>
                        </button>
                      )}

                      {/* Action Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === item.sku ? null : item.sku)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                          title="Actions"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {openDropdown === item.sku && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                setAdjustDialogSku({ sku: item.sku, itemName: item.itemName });
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center text-sm text-gray-700 rounded-t-lg"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => {
                                setTransferDialogSku({ sku: item.sku, itemName: item.itemName });
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center text-sm text-gray-700 border-t border-gray-100 rounded-b-lg"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Make Transaction
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Expanded Batch Breakdown */}
                {expandedRows.has(`${item.sku}-batches`) && item.batchBreakdown && item.batchBreakdown.length > 0 && (
                  <tr key={`${item.sku}-batches`} className="bg-green-50">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="ml-8">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Batch Breakdown for {item.sku}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {item.batchBreakdown.map((batch) => (
                            <div key={`${batch.batchId}-${batch.location}`} className="bg-white border border-green-200 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {batch.batchId === 'DEFAULT' ? '❓ Default' : `📦 Batch ${batch.batchId}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    @ {batch.location === 'logistics' ? 'Logistics' : batch.location.replace('production_zone_', 'Zone ')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    {batch.quantity}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    units
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-gray-600">
                          Total across all batches: <span className="font-semibold">{item.batchBreakdown.reduce((sum, b) => sum + b.quantity, 0)} units</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

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

            {/* Action Buttons */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
              {item.productionZones.length > 0 && (
                <button
                  onClick={() => toggleRowExpansion(item.sku)}
                  className="flex-1 text-blue-600 hover:text-blue-900 text-sm font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  {expandedRows.has(item.sku) ? 'Hide Zones' : 'Show Zones'}
                </button>
              )}
              <button
                onClick={() => setAdjustDialogSku({ sku: item.sku, itemName: item.itemName })}
                className="flex-1 text-gray-700 hover:text-gray-900 text-sm font-medium py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Adjust Stock
              </button>
              <button
                onClick={() => setTransferDialogSku({ sku: item.sku, itemName: item.itemName })}
                className="flex-1 text-gray-700 hover:text-gray-900 text-sm font-medium py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Transfer
              </button>
            </div>

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

      {/* Dialogs */}
      {adjustDialogSku && (
        <StockAdjustmentDialog
          sku={adjustDialogSku.sku}
          itemName={adjustDialogSku.itemName}
          onClose={() => setAdjustDialogSku(null)}
          onSuccess={() => {
            setAdjustDialogSku(null);
            // Optionally trigger a data refresh here
          }}
        />
      )}

      {transferDialogSku && (
        <MakeTransactionDialog
          sku={transferDialogSku.sku}
          itemName={transferDialogSku.itemName}
          onClose={() => setTransferDialogSku(null)}
          onSuccess={() => {
            setTransferDialogSku(null);
            // Optionally trigger a data refresh here
          }}
        />
      )}
    </div>
  );
}

export default EnhancedInventoryTable;