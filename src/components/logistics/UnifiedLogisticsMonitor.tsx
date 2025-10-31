// Unified Logistics Monitor - Batch-focused view with current vs belonging locations
import { useState, useEffect } from 'react';
import { ScanLookup } from '../../types';
import { scanLookupService } from '../../services/scanLookupService';
import { packingBoxesService } from '../../services/packingBoxesService';
import { logger } from '../../services/logger';

interface UnifiedLogisticsMonitorProps {
  userEmail: string;
}

interface ZoneItemStatus {
  sku: string;
  itemName: string;
  total: number;
  locationDistribution: Record<string, number>; // actual locations and quantities
  deliveryRate: number; // percentage delivered to zone
  isComplete: boolean; // true when inLogistics === 0
}

interface ZoneData {
  zoneName: string;
  zoneId: string;
  items: ZoneItemStatus[];
  completionRate: number; // percentage of items complete
  blockingItem: ZoneItemStatus | null; // item with lowest delivery rate
}

export function UnifiedLogisticsMonitor({ userEmail: _userEmail }: UnifiedLogisticsMonitorProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unboxedBoxes, setUnboxedBoxes] = useState<number>(0);
  const [totalBoxes, setTotalBoxes] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'zones' | 'boxes'>('boxes');

  // Batch selection
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  // Data for selected batch
  const [zoneData, setZoneData] = useState<ZoneData[]>([]);
  const [boxes, setBoxes] = useState<Awaited<ReturnType<typeof packingBoxesService.listBoxes>>>([]);
  const [expandedBox, setExpandedBox] = useState<string | null>(null);
  const [boxScans, setBoxScans] = useState<Record<string, Array<{ sku: string; qty: number; userEmail: string; timestamp: Date }>>>({});

  // Batch analysis UI state
  const [batchAnalysisCollapsed, setBatchAnalysisCollapsed] = useState(true);
  const [sortBy, setSortBy] = useState<'sku' | 'completion'>('completion'); // completion = missing first
  const [boxSortBy, setBoxSortBy] = useState<'caseNo' | 'completion'>('completion'); // completion = incomplete first

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);

      // Load ONLY activated batches (status = 'in_progress') from batch management
      const { batchManagementService } = await import('../../services/batchManagement');
      const allBatches = await batchManagementService.getAllBatches();
      const activatedBatches = allBatches
        .filter(batch => batch.status === 'in_progress')
        .map(batch => batch.batchId)
        .sort();

      setAvailableBatches(activatedBatches);

      logger.info('Loaded activated batches:', { activatedBatches });

      // Set first activated batch as default if available
      if (activatedBatches.length > 0 && !selectedBatch) {
        const defaultBatch = activatedBatches[0];
        setSelectedBatch(defaultBatch);
        logger.debug('Set default batch:', { defaultBatch });
      }

    } catch (error) {
      logger.error('Failed to load initial data:', { error });
    } finally {
      setLoading(false);
    }
  };

  // Load batch-specific zone data with smart caching
  const loadBatchData = async (batchId: string) => {
    if (!batchId) return;

    try {
      logger.debug('Loading zone data for batch:', { batchId });

      // Step 1: Get total quantities needed from packing boxes (source of truth)
      const boxes = await packingBoxesService.listBoxes(batchId);
      const batchTotals = new Map<string, number>();
      boxes.forEach(box => {
        Object.entries(box.expectedBySku).forEach(([sku, qty]) => {
          batchTotals.set(sku, (batchTotals.get(sku) || 0) + qty);
        });
      });

      logger.debug('Batch totals calculated:', { skuCount: batchTotals.size });

      // Step 2: Get scanner lookup data (Layer 1 - which zone each SKU belongs to)
      const scannerData = await scanLookupService.getAllLookups();

      // Build SKU -> Zone mapping from scanner lookup
      const skuToZoneMap = new Map<string, string>();
      scannerData.forEach((lookup: ScanLookup) => {
        if (!skuToZoneMap.has(lookup.sku)) {
          skuToZoneMap.set(lookup.sku, lookup.targetZone);
        }
      });

      // Step 3: Get batch allocations (Layer 2 - actual batch-specific inventory distribution)
      const { batchAllocationService } = await import('../../services/batchAllocationService');
      const allAllocations = await batchAllocationService.getAllBatchAllocations();

      logger.debug('Loaded batch allocation records:', { count: allAllocations.length });

      // Build zone-centric view using batch allocations
      const zoneMap = new Map<string, ZoneItemStatus[]>();

      // For each SKU in the batch
      batchTotals.forEach((total, sku) => {
        // Get the zone this SKU belongs to from scanner lookup
        const targetZoneId = skuToZoneMap.get(sku);
        if (!targetZoneId) {
          logger.warn('SKU has no scanner lookup entry - skipping:', { sku });
          return;
        }

        const zoneName = `Zone ${targetZoneId}`;

        // Get batch-specific inventory distribution from allocations (Layer 2 - Internal Knowledge)
        const locationDistribution: Record<string, number> = {};
        let totalAllocated = 0;

        // Find all allocations for this SKU that have quantity for this batch
        allAllocations.forEach(allocation => {
          if (allocation.sku === sku) {
            const qtyForBatch = allocation.allocations[batchId] || 0;

            if (qtyForBatch > 0) {
              logger.debug('SKU location allocation:', { sku, location: allocation.location, qty: qtyForBatch, batchId });
              locationDistribution[allocation.location] = qtyForBatch;
              totalAllocated += qtyForBatch;
            }
          }
        });

        logger.debug('SKU distribution:', { sku, locationDistribution, totalNeeded: total });

        // Only add to zone map if there's actual batch allocation
        if (totalAllocated === 0) {
          logger.debug('Skipping SKU - no batch allocation yet:', { sku });
          return;
        }

        // Calculate delivery rate and completion based on logistics
        const inLogistics = locationDistribution['logistics'] || 0;
        const inOtherLocations = totalAllocated - inLogistics;
        const deliveryRate = total > 0 ? Math.round((inOtherLocations / total) * 100) : 0;
        const isComplete = inLogistics === 0 && totalAllocated >= total;

        // Find scanner lookup for item name
        const scannerLookup = scannerData.find((lookup: ScanLookup) => lookup.sku === sku);

        // Add to zone map
        if (!zoneMap.has(zoneName)) {
          zoneMap.set(zoneName, []);
        }

        zoneMap.get(zoneName)!.push({
          sku,
          itemName: scannerLookup?.itemName || sku,
          total,
          locationDistribution,
          deliveryRate,
          isComplete
        });
      });

      // Step 4: Calculate zone-level metrics (completion rate, blocking items)
      const zones: ZoneData[] = [];
      zoneMap.forEach((items, zoneName) => {
        const completeItems = items.filter(item => item.isComplete).length;
        const completionRate = items.length > 0 ? Math.round((completeItems / items.length) * 100) : 0;

        // Find blocking item (lowest delivery rate among incomplete items)
        const incompleteItems = items.filter(item => !item.isComplete);
        const blockingItem = incompleteItems.length > 0
          ? incompleteItems.reduce((min, item) => item.deliveryRate < min.deliveryRate ? item : min)
          : null;

        // Sort items: incomplete first (by delivery rate), then complete
        const sortedItems = [
          ...incompleteItems.sort((a, b) => a.deliveryRate - b.deliveryRate),
          ...items.filter(item => item.isComplete).sort((a, b) => a.sku.localeCompare(b.sku))
        ];

        zones.push({
          zoneName,
          zoneId: zoneName.replace('Zone ', ''),
          items: sortedItems,
          completionRate,
          blockingItem
        });
      });

      // Sort zones by completion rate (least complete first - needs attention)
      zones.sort((a, b) => a.completionRate - b.completionRate);

      setZoneData(zones);
      logger.info('Loaded zones with cached calculations:', { zoneCount: zones.length });

    } catch (error) {
      logger.error('Failed to load batch data:', { error });
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Load batch data when selection changes
  useEffect(() => {
    if (selectedBatch) {
      if (activeTab === 'zones') {
        loadBatchData(selectedBatch);
      } else {
        loadBoxesData(selectedBatch);
      }
    }
  }, [selectedBatch, activeTab]);

  // Load boxes data and calculate batch-specific unboxed count
  const loadBoxesData = async (batchId: string) => {
    try {
      const b = await packingBoxesService.listBoxes(batchId);
      setBoxes(b);

      // Calculate batch-specific unboxed boxes count
      const unboxedCount = b.filter(box => box.status !== 'complete').length;
      setUnboxedBoxes(unboxedCount);
      setTotalBoxes(b.length);

      logger.debug('Batch-specific box count:', {
        batchId,
        total: b.length,
        unboxed: unboxedCount,
        complete: b.length - unboxedCount
      });
    } catch (e) {
      logger.error('Failed to load boxes:', { error: e });
      setBoxes([]);
      setUnboxedBoxes(0);
      setTotalBoxes(0);
    }
  };

  // Refresh current view
  const handleRefresh = async () => {
    if (!selectedBatch) return;

    setRefreshing(true);
    try {
      if (activeTab === 'zones') {
        await loadBatchData(selectedBatch);
      } else {
        await loadBoxesData(selectedBatch);
        // Also refresh unboxing progress
        await loadData();
      }
    } catch (error) {
      logger.error('Failed to refresh:', { error });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading logistics monitor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex space-x-2">
        <button
          className={`px-3 py-1 rounded ${activeTab === 'boxes' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('boxes')}
        >
          Boxes
        </button>
        <button
          className={`px-3 py-1 rounded ${activeTab === 'zones' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('zones')}
        >
          Zones
        </button>
      </div>
      {/* Top Metric Row - Only show on Boxes tab */}
      {activeTab === 'boxes' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{unboxedBoxes}</div>
              <div className="text-gray-600 font-medium">📦 Unboxed Boxes Remaining</div>
            </div>

            {/* Progress Bar */}
            {totalBoxes > 0 && (
              <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Unboxing Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    {totalBoxes - unboxedBoxes} / {totalBoxes} boxes complete
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
                    style={{ width: `${totalBoxes > 0 ? ((totalBoxes - unboxedBoxes) / totalBoxes) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-2xl font-bold text-green-600">
                    {totalBoxes > 0 ? Math.round(((totalBoxes - unboxedBoxes) / totalBoxes) * 100) : 0}%
                  </span>
                  <span className="text-sm text-gray-600 ml-2">Complete</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Selector with Refresh Button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <label className="text-lg font-semibold text-gray-900">🎯 Select Batch:</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="flex-1 max-w-md border border-gray-300 rounded-md px-3 py-2 text-lg font-medium"
          >
            <option value="">Choose a batch...</option>
            {availableBatches.map(batchId => (
              <option key={batchId} value={batchId}>
                Batch {batchId}
              </option>
            ))}
          </select>
          {selectedBatch && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                refreshing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {refreshing ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Refreshing...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Zones view - Redesigned for visual delivery tracking */}
      {selectedBatch && activeTab === 'zones' && (
        <div className="space-y-4">
          {zoneData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No zone assignments found for this batch</p>
            </div>
          ) : (
            zoneData.map((zone) => (
              <div key={zone.zoneName} className="bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden">
                {/* Zone Header with Completion Status */}
                <div className={`p-4 ${
                  zone.completionRate === 100 ? 'bg-green-50 border-b-2 border-green-200' :
                  zone.completionRate >= 50 ? 'bg-yellow-50 border-b-2 border-yellow-200' :
                  'bg-red-50 border-b-2 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {zone.completionRate === 100 ? '✅' : zone.completionRate >= 50 ? '🟡' : '🔴'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{zone.zoneName}</h3>
                        <p className="text-sm text-gray-600">
                          {zone.items.filter(i => i.isComplete).length} / {zone.items.length} items delivered
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        zone.completionRate === 100 ? 'text-green-600' :
                        zone.completionRate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {zone.completionRate}%
                      </div>
                      <div className="text-xs text-gray-600">Complete</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        zone.completionRate === 100 ? 'bg-green-500' :
                        zone.completionRate >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${zone.completionRate}%` }}
                    />
                  </div>

                  {/* Blocking Item Alert */}
                  {zone.blockingItem && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="text-xl">⚠️</div>
                        <div className="flex-1">
                          <div className="font-bold text-red-900">BLOCKING ITEM</div>
                          <div className="text-sm text-red-800">
                            {zone.blockingItem.sku} - {zone.blockingItem.itemName}
                          </div>
                          <div className="text-sm text-red-700 mt-1">
                            Only {zone.blockingItem.deliveryRate}% delivered • {zone.blockingItem.locationDistribution['logistics'] || 0} units still in Logistics
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">{zone.blockingItem.deliveryRate}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 space-y-2">
                  {zone.items.map((item) => (
                    <div
                      key={item.sku}
                      className={`p-3 rounded-lg border ${
                        item.isComplete
                          ? 'bg-green-50 border-green-200'
                          : item.deliveryRate >= 50
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-gray-900">{item.sku}</span>
                            {item.isComplete && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">✓ Complete</span>}
                          </div>
                          <div className="text-sm text-gray-700">{item.itemName}</div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            {Object.entries(item.locationDistribution)
                              .sort(([locA], [locB]) => {
                                // Sort: logistics first, then alphabetically
                                if (locA === 'logistics') return -1;
                                if (locB === 'logistics') return 1;
                                return locA.localeCompare(locB);
                              })
                              .map(([location, qty]) => (
                                <div key={location} className="flex items-center space-x-1">
                                  <span className="text-gray-600">@ {location}:</span>
                                  <span className={`font-bold ${location === 'logistics' ? 'text-orange-600' : 'text-blue-600'}`}>
                                    {qty}
                                  </span>
                                </div>
                              ))}
                            <div className="flex items-center space-x-1 ml-auto">
                              <span className="text-gray-600">Total needed:</span>
                              <span className="font-bold text-gray-900">{item.total}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-3xl font-bold ${
                            item.isComplete ? 'text-green-600' :
                            item.deliveryRate >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {item.deliveryRate}%
                          </div>
                          <div className="text-xs text-gray-600">Delivered</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Boxes view */}
      {selectedBatch && activeTab === 'boxes' && (
        <>
          {/* Batch-Level Analysis Summary */}
          {boxes.length > 0 && (() => {
            // Calculate batch totals (ignoring box boundaries)
            const batchTotals = boxes.reduce((acc, box) => {
              Object.entries(box.expectedBySku).forEach(([sku, qty]) => {
                acc.expected[sku] = (acc.expected[sku] || 0) + qty;
              });
              Object.entries(box.scannedBySku).forEach(([sku, qty]) => {
                acc.scanned[sku] = (acc.scanned[sku] || 0) + qty;
              });
              return acc;
            }, { expected: {} as Record<string, number>, scanned: {} as Record<string, number> });

            // Get all unique SKUs
            const allSkus = new Set([
              ...Object.keys(batchTotals.expected),
              ...Object.keys(batchTotals.scanned)
            ]);

            // Calculate discrepancies per SKU
            let skuAnalysis = Array.from(allSkus).map(sku => {
              const expected = batchTotals.expected[sku] || 0;
              const scanned = batchTotals.scanned[sku] || 0;
              const diff = scanned - expected;
              const status = diff === 0 ? 'ok' : diff > 0 ? 'excess' : 'missing';
              return { sku, expected, scanned, diff, status };
            });

            // Apply sorting
            if (sortBy === 'completion') {
              // Sort by completion: missing first, then excess, then ok
              skuAnalysis.sort((a, b) => {
                if (a.status === 'missing' && b.status !== 'missing') return -1;
                if (a.status !== 'missing' && b.status === 'missing') return 1;
                if (a.status === 'excess' && b.status === 'ok') return -1;
                if (a.status === 'ok' && b.status === 'excess') return 1;
                return a.sku.localeCompare(b.sku);
              });
            } else {
              // Sort by SKU alphabetically
              skuAnalysis.sort((a, b) => a.sku.localeCompare(b.sku));
            }

            const missingCount = skuAnalysis.filter(s => s.status === 'missing').length;
            const excessCount = skuAnalysis.filter(s => s.status === 'excess').length;
            const okCount = skuAnalysis.filter(s => s.status === 'ok').length;

            return (
              <div className="bg-white rounded-lg shadow-sm border-2 border-blue-500 mb-6">
                {/* Header - Always visible */}
                <div
                  className="p-4 bg-blue-50 border-b-2 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setBatchAnalysisCollapsed(!batchAnalysisCollapsed)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900">📊 Batch-Level Analysis</h3>
                      <button className="text-gray-600 hover:text-gray-900">
                        {batchAnalysisCollapsed ? '▶' : '▼'}
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      {missingCount > 0 && (
                        <div className="text-sm">
                          <span className="font-semibold text-red-600">{missingCount}</span>
                          <span className="text-gray-600"> Missing</span>
                        </div>
                      )}
                      {excessCount > 0 && (
                        <div className="text-sm">
                          <span className="font-semibold text-orange-600">{excessCount}</span>
                          <span className="text-gray-600"> Excess</span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="font-semibold text-green-600">{okCount}</span>
                        <span className="text-gray-600"> Complete</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Aggregate view across all boxes - Click to {batchAnalysisCollapsed ? 'expand' : 'collapse'}
                    </p>
                    {!batchAnalysisCollapsed && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">Sort by:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortBy('completion');
                          }}
                          className={`text-xs px-2 py-1 rounded ${
                            sortBy === 'completion'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-300'
                          }`}
                        >
                          Completion
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortBy('sku');
                          }}
                          className={`text-xs px-2 py-1 rounded ${
                            sortBy === 'sku'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-300'
                          }`}
                        >
                          SKU
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content - Collapsible */}
                {!batchAnalysisCollapsed && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {skuAnalysis.map(({ sku, expected, scanned, diff, status }) => (
                      <div
                        key={sku}
                        className={`p-3 rounded-lg border-2 ${
                          status === 'ok' ? 'bg-green-50 border-green-300' :
                          status === 'excess' ? 'bg-orange-50 border-orange-300' :
                          'bg-red-50 border-red-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono font-bold text-gray-900">{sku}</div>
                          {status === 'ok' && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">✓ Match</span>}
                          {status === 'excess' && <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded-full">+ {diff}</span>}
                          {status === 'missing' && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">{diff}</span>}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-gray-600">Expected:</span>
                            <span className="ml-1 font-semibold text-gray-900">{expected}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Scanned:</span>
                            <span className={`ml-1 font-semibold ${
                              status === 'ok' ? 'text-green-600' :
                              status === 'excess' ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {scanned}
                            </span>
                          </div>
                        </div>
                        {status !== 'ok' && (
                          <div className="mt-2 text-xs font-medium">
                            {status === 'missing' && (
                              <div className="text-red-700">
                                ⚠️ Missing {Math.abs(diff)} unit{Math.abs(diff) !== 1 ? 's' : ''}
                              </div>
                            )}
                            {status === 'excess' && (
                              <div className="text-orange-700">
                                ⚠️ Extra {diff} unit{diff !== 1 ? 's' : ''} scanned
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Individual Boxes View */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">📦 Boxes for Batch {selectedBatch}</h3>
                  <p className="text-sm text-gray-600">Track per-box progress and scan history</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Sort by:</span>
                  <button
                    onClick={() => setBoxSortBy('completion')}
                    className={`text-xs px-3 py-1.5 rounded ${
                      boxSortBy === 'completion'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Completion
                  </button>
                  <button
                    onClick={() => setBoxSortBy('caseNo')}
                    className={`text-xs px-3 py-1.5 rounded ${
                      boxSortBy === 'caseNo'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Case No
                  </button>
                </div>
              </div>
            </div>
          <div className="p-4 space-y-2">
            {boxes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No boxes found for this batch</div>
            ) : (
              boxes
                .slice()
                .sort((a, b) => {
                  if (boxSortBy === 'completion') {
                    // Sort by completion: incomplete/in_progress first, then not_started, then complete
                    const statusOrder = {
                      'in_progress': 1,
                      'not_started': 2,
                      'over_scanned': 3,
                      'complete': 4
                    };
                    const aOrder = statusOrder[a.status] || 5;
                    const bOrder = statusOrder[b.status] || 5;

                    if (aOrder !== bOrder) {
                      return aOrder - bOrder;
                    }

                    // Within same status, sort by completion percentage (lower first)
                    const aPct = a.totals.expectedQty > 0 ? (a.totals.scannedQty / a.totals.expectedQty) : 0;
                    const bPct = b.totals.expectedQty > 0 ? (b.totals.scannedQty / b.totals.expectedQty) : 0;

                    if (aPct !== bPct) {
                      return aPct - bPct;
                    }

                    // Finally by case number
                    return a.caseNo.localeCompare(b.caseNo);
                  } else {
                    // Sort by case number alphabetically
                    return a.caseNo.localeCompare(b.caseNo);
                  }
                })
                .map((box) => {
                  const pct = box.totals.expectedQty > 0 ? Math.round((box.totals.scannedQty / box.totals.expectedQty) * 100) : 0;
                  const isExpanded = expandedBox === box.caseNo;
                  return (
                    <div key={box.caseNo} className="border rounded-md">
                      <div className="flex items-center justify-between p-3 bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-mono">{box.caseNo}</div>
                          <div className="text-xs px-2 py-0.5 rounded-full border">
                            {box.status === 'complete' ? '✅ Complete' : box.status === 'in_progress' ? '⏳ In Progress' : box.status === 'not_started' ? '🕒 Not Started' : '⚠️ Over' }
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-40 h-2 bg-gray-200 rounded">
                            <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-gray-600">{box.totals.scannedQty}/{box.totals.expectedQty}</div>
                          <button
                            className="text-blue-600 hover:underline text-sm"
                            onClick={() => {
                              // Save as active box for scanner (localStorage per batch)
                              try { localStorage.setItem(`wms-active-box:${selectedBatch}`, box.caseNo); } catch {}
                              alert(`Box ${box.caseNo} set as active. Open Scanner to continue.`);
                            }}
                          >
                            Open in Scanner
                          </button>
                          <button
                            className="text-gray-700 hover:underline text-sm"
                            onClick={async () => {
                              const next = isExpanded ? null : box.caseNo;
                              setExpandedBox(next);
                              if (next) {
                                try {
                                  const scans = await packingBoxesService.listScans(selectedBatch, next, 50);
                                  setBoxScans((prev) => ({ ...prev, [next]: scans }));
                                } catch (e) {
                                  logger.error('Failed to load scans for box:', { boxId: next, error: e });
                                }
                              }
                            }}
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-3 space-y-3">
                          <div>
                            <div className="text-sm font-semibold mb-2">Expected vs Scanned</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {Object.keys(box.expectedBySku).sort().map((sku) => {
                                const exp = box.expectedBySku[sku] || 0;
                                const scn = box.scannedBySku[sku] || 0;
                                const ok = scn === exp;
                                const over = scn > exp;
                                return (
                                  <div key={sku} className={`flex items-center justify-between px-2 py-1 rounded ${ok ? 'bg-green-50' : over ? 'bg-red-50' : 'bg-yellow-50'}`}>
                                    <div className="font-mono text-sm">{sku}</div>
                                    <div className="text-xs text-gray-700">{scn}/{exp}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold mb-2">Recent Scans</div>
                            <div className="space-y-1">
                              {(boxScans[box.caseNo] || []).map((ev, idx) => (
                                <div key={idx} className="text-xs text-gray-700 flex justify-between">
                                  <span className="font-mono">{ev.sku} × {ev.qty}</span>
                                  <span>{new Date(ev.timestamp).toLocaleString()}</span>
                                </div>
                              ))}
                              {(!boxScans[box.caseNo] || boxScans[box.caseNo].length === 0) && (
                                <div className="text-xs text-gray-500">No scans yet</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
        </>
      )}

      {/* No Batch Selected */}
      {!selectedBatch && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium">Select a batch to view details</h3>
          <p>Choose a batch from the dropdown above to see current and belonging locations</p>
        </div>
      )}
    </div>
  );
}

export default UnifiedLogisticsMonitor;
