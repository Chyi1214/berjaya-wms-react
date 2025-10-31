import { useState, useEffect, useMemo } from 'react';
import { InventoryCountEntry, ScanLookup, BatchProgress, BatchAllocation } from '../../types';
import { tableStateService } from '../../services/tableState';
import { scanLookupService } from '../../services/scanLookupService';
import { batchAllocationService } from '../../services/batchAllocationService';
import { logger } from '../../services/logger';

interface LogisticsMonitorDashboardProps {
  userEmail: string;
}

export function LogisticsMonitorDashboard({ userEmail: _userEmail }: LogisticsMonitorDashboardProps) {
  const [inventoryData, setInventoryData] = useState<InventoryCountEntry[]>([]);
  const [scannerData, setScannerData] = useState<ScanLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'location' | 'belonging' | 'batch'>('location');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Car type selection (v7.19.0)
  const [availableCarTypes, setAvailableCarTypes] = useState<Array<{carCode: string; name: string}>>([]);
  const [selectedCarType, setSelectedCarType] = useState<string>('TK1');
  const [carTypesLoading, setCarTypesLoading] = useState(false);

  // Batch-related state
  const [batchAllocations, setBatchAllocations] = useState<BatchAllocation[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([]);

  // Load inventory and scanner data (v7.19.0: car-type-filtered)
  const loadData = async () => {
    try {
      const [inventoryData, scannerData, batchAllocations, batchProgress] = await Promise.all([
        tableStateService.getExpectedInventory(),
        scanLookupService.getAllLookups(selectedCarType),
        batchAllocationService.getAllBatchAllocations(),
        batchAllocationService.getBatchProgress()
      ]);
      setInventoryData(inventoryData);
      setScannerData(scannerData);
      setBatchAllocations(batchAllocations);
      setBatchProgress(batchProgress);
      setLastRefresh(new Date());
    } catch (error) {
      logger.error('Failed to load data:', { error });
    } finally{
      setLoading(false);
    }
  };

  // Load car types on mount (v7.19.0)
  useEffect(() => {
    const loadCarTypes = async () => {
      try {
        setCarTypesLoading(true);
        const { batchManagementService } = await import('../../services/batchManagement');
        await batchManagementService.ensureTK1CarTypeExists();
        const carTypes = await batchManagementService.getAllCarTypes();
        setAvailableCarTypes(carTypes.map(ct => ({ carCode: ct.carCode, name: ct.name })));

        // Default to TK1 if available
        if (carTypes.some(ct => ct.carCode === 'TK1')) {
          setSelectedCarType('TK1');
        } else if (carTypes.length > 0) {
          setSelectedCarType(carTypes[0].carCode);
        }
      } catch (error) {
        logger.error('Failed to load car types:', { error });
      } finally {
        setCarTypesLoading(false);
      }
    };

    loadCarTypes();
  }, []);

  useEffect(() => {
    // Initial load
    loadData();

    // Real-time updates
    const unsubscribe = tableStateService.onExpectedInventoryChange((data) => {
      setInventoryData(data);
      setLastRefresh(new Date());
    });

    // Auto refresh every 30 seconds if enabled
    let refreshInterval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      refreshInterval = setInterval(loadData, 30000);
    }

    return () => {
      unsubscribe();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, selectedCarType]); // v7.19.0: reload when car type changes

  // Get unique zones based on active tab
  const zones = useMemo(() => {
    if (activeTab === 'location') {
      // Current location zones
      const uniqueZones = [...new Set(inventoryData.map(item => item.location))].sort();
      return uniqueZones;
    } else {
      // Belonging zones from scanner data
      const belongingZones = [...new Set(scannerData.map(scanner => scanner.targetZone.toString()))].sort();
      return ['all', ...belongingZones, 'unmapped'];
    }
  }, [inventoryData, scannerData, activeTab]);

  // Create SKU to belonging zones mapping
  const skuToBelongingZones = useMemo(() => {
    const mapping: { [sku: string]: string[] } = {};
    scannerData.forEach(scanner => {
      const sku = scanner.sku.toUpperCase();
      if (!mapping[sku]) {
        mapping[sku] = [];
      }
      mapping[sku].push(scanner.targetZone.toString());
    });
    return mapping;
  }, [scannerData]);

  // Filtered data based on active tab
  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = inventoryData.filter(item =>
        item.sku.toLowerCase().includes(term) ||
        (item.itemName?.toLowerCase() || '').includes(term) ||
        item.location.toLowerCase().includes(term)
      );
    }

    // Apply zone filter based on tab
    if (selectedZone !== 'all') {
      if (activeTab === 'location') {
        filtered = filtered.filter(item => item.location === selectedZone);
      } else {
        // Belonging zone filter
        if (selectedZone === 'unmapped') {
          filtered = filtered.filter(item => !skuToBelongingZones[item.sku.toUpperCase()]);
        } else {
          filtered = filtered.filter(item =>
            skuToBelongingZones[item.sku.toUpperCase()]?.includes(selectedZone)
          );
        }
      }
    }

    return filtered;
  }, [inventoryData, searchTerm, selectedZone, activeTab, skuToBelongingZones]);

  // Group data by zone based on active tab
  const groupedByZone = useMemo(() => {
    const grouped: { [zone: string]: InventoryCountEntry[] } = {};

    if (activeTab === 'location') {
      // Group by current location
      filteredData.forEach(item => {
        if (!grouped[item.location]) {
          grouped[item.location] = [];
        }
        grouped[item.location].push(item);
      });
    } else {
      // Group by belonging zones
      filteredData.forEach(item => {
        const belongingZones = skuToBelongingZones[item.sku.toUpperCase()];

        if (!belongingZones || belongingZones.length === 0) {
          // Unmapped items
          if (!grouped['unmapped']) {
            grouped['unmapped'] = [];
          }
          grouped['unmapped'].push(item);
        } else {
          // Add to each belonging zone
          belongingZones.forEach(zone => {
            if (!grouped[zone]) {
              grouped[zone] = [];
            }
            grouped[zone].push(item);
          });
        }
      });
    }

    // Sort items within each zone by SKU
    Object.keys(grouped).forEach(zone => {
      grouped[zone].sort((a, b) => a.sku.localeCompare(b.sku));
    });

    return grouped;
  }, [filteredData, activeTab, skuToBelongingZones]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalItems: inventoryData.length,
      totalZones: zones.length,
      totalStock: inventoryData.reduce((sum, item) => sum + item.amount, 0),
      lowStockItems: inventoryData.filter(item => item.amount <= 5).length
    };
  }, [inventoryData, zones]);

  // Get stock level indicator
  const getStockLevel = (amount: number): { color: string; label: string } => {
    if (amount === 0) return { color: 'red', label: 'Empty' };
    if (amount <= 5) return { color: 'yellow', label: 'Low' };
    if (amount <= 20) return { color: 'blue', label: 'Normal' };
    return { color: 'green', label: 'Good' };
  };

  // Get distribution info for belonging zone view
  const getItemDistribution = (sku: string): { locations: { location: string; amount: number }[]; total: number } => {
    const allSKUItems = inventoryData.filter(item => item.sku.toUpperCase() === sku.toUpperCase());
    const locationTotals: { [location: string]: number } = {};

    allSKUItems.forEach(item => {
      locationTotals[item.location] = (locationTotals[item.location] || 0) + item.amount;
    });

    const locations = Object.entries(locationTotals).map(([location, amount]) => ({ location, amount }));
    const total = locations.reduce((sum, loc) => sum + loc.amount, 0);

    return { locations, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
          <div className="text-sm text-gray-500">Total Items</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.totalZones}</div>
          <div className="text-sm text-gray-500">Active Zones</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.totalStock}</div>
          <div className="text-sm text-gray-500">Total Stock</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
          <div className="text-sm text-gray-500">Low Stock</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => {
                setActiveTab('location');
                setSelectedZone('all');
              }}
              className={`py-3 px-6 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'location'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📍 Current Location
            </button>
            <button
              onClick={() => {
                setActiveTab('belonging');
                setSelectedZone('all');
              }}
              className={`py-3 px-6 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'belonging'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎯 Belonging Zone
            </button>
            <button
              onClick={() => {
                setActiveTab('batch');
                setSelectedZone('all');
              }}
              className={`py-3 px-6 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'batch'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Batch Progress
            </button>
          </nav>
        </div>

        {/* Controls (v7.19.0: added car type selector) */}
        <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Car Type Selector (v7.19.0) */}
            <div>
              {carTypesLoading ? (
                <div className="text-xs text-purple-600">⏳ Loading car types...</div>
              ) : (
                <select
                  value={selectedCarType}
                  onChange={(e) => setSelectedCarType(e.target.value)}
                  className="border border-purple-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {availableCarTypes.map(carType => (
                    <option key={carType.carCode} value={carType.carCode}>
                      🚗 {carType.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search SKU, item name, or zone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Zone Filter */}
            <div>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Zones</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Refresh Info */}
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 rounded text-xs ${
                autoRefresh
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'batch' ? (
        /* Batch Progress View */
        <div className="space-y-6">
          {/* Batch Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchProgress.map(batch => (
              <div key={batch.batchId} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Batch {batch.batchId}</h3>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    batch.completionPercentage >= 100 ? 'bg-green-100 text-green-800' :
                    batch.completionPercentage >= 80 ? 'bg-blue-100 text-blue-800' :
                    batch.completionPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {batch.completionPercentage.toFixed(1)}% Complete
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Allocated:</span>
                    <span className="font-medium">{batch.totalAllocated} items</span>
                  </div>
                  {batch.totalExpected > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expected:</span>
                      <span className="font-medium">{batch.totalExpected} items</span>
                    </div>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className={`h-2 rounded-full ${
                        batch.completionPercentage >= 100 ? 'bg-green-500' :
                        batch.completionPercentage >= 80 ? 'bg-blue-500' :
                        batch.completionPercentage >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, batch.completionPercentage)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last updated: {batch.lastUpdated.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Batch Allocation */}
          {batchAllocations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">📦 Batch Allocation Details</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batchAllocations.map(allocation => (
                    <div key={`${allocation.sku}_${allocation.location}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="font-medium text-gray-900 mb-2">{allocation.sku}</div>
                      <div className="text-sm text-gray-600 mb-3">Location: {allocation.location}</div>

                      <div className="space-y-2">
                        {Object.entries(allocation.allocations).map(([batchId, amount]) => (
                          <div key={batchId} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Batch {batchId}:</span>
                            <span className="font-medium text-orange-600">{amount} units</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-200 mt-3 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total:</span>
                          <span className="font-bold text-gray-900">{allocation.totalAllocated} units</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mt-2">
                        Updated: {allocation.lastUpdated.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty state for batch */}
          {batchProgress.length === 0 && batchAllocations.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No batch data found</h3>
              <p className="text-gray-500">
                Start scanning items with batch assignment to see progress here.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Zone Cards for Location/Belonging views */
        <div className="space-y-6">
          {Object.keys(groupedByZone).sort().map(zone => (
          <div key={zone} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Zone Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {activeTab === 'location' ? '📍' : '🎯'}
                  {zone === 'unmapped' ? ' Unmapped Items' : ` Zone: ${zone}`}
                </h3>
                <span className="text-sm text-gray-500">
                  {activeTab === 'belonging' && zone !== 'unmapped'
                    ? `${new Set(groupedByZone[zone].map(item => item.sku)).size} unique items`
                    : `${groupedByZone[zone].length} items`
                  } • {groupedByZone[zone].reduce((sum, item) => sum + item.amount, 0)} total stock
                </span>
              </div>
            </div>

            {/* Items Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTab === 'location'
                  ? (
                    // Current Location View - Original display
                    groupedByZone[zone].map((item) => {
                      const stockLevel = getStockLevel(item.amount);
                      return (
                        <div key={`${item.sku}_${item.location}`} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.sku}</div>
                              <div className="text-sm text-gray-600 truncate">
                                {item.itemName || 'No description'}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              stockLevel.color === 'red' ? 'bg-red-100 text-red-800' :
                              stockLevel.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              stockLevel.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {stockLevel.label}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-gray-900">
                              {item.amount}
                            </div>
                            <div className="text-xs text-gray-500">
                              Updated: {item.timestamp.toLocaleDateString()}
                            </div>
                          </div>
                          {item.countedBy && (
                            <div className="text-xs text-gray-400 mt-1">
                              By: {item.countedBy}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    // Belonging Zone View - Show unique SKUs with distribution
                    [...new Set(groupedByZone[zone].map(item => item.sku))].map((sku) => {
                      const distribution = getItemDistribution(sku);
                      const stockLevel = getStockLevel(distribution.total);
                      const itemName = groupedByZone[zone].find(item => item.sku === sku)?.itemName;

                      return (
                        <div key={`${sku}_${zone}`} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{sku}</div>
                              <div className="text-sm text-gray-600 truncate">
                                {itemName || 'No description'}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              stockLevel.color === 'red' ? 'bg-red-100 text-red-800' :
                              stockLevel.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              stockLevel.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {stockLevel.label}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-2xl font-bold text-gray-900">
                              {distribution.total}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total across locations
                            </div>
                          </div>
                          {/* Distribution Details */}
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-700">Distribution:</div>
                            {distribution.locations.map(loc => (
                              <div key={loc.location} className="flex justify-between text-xs text-gray-600">
                                <span>{loc.location}:</span>
                                <span className="font-medium">{loc.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )
                }
              </div>
            </div>
          </div>
        ))}

        {/* Empty State for Location/Belonging tabs */}
        {Object.keys(groupedByZone).length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory data found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedZone !== 'all'
                ? 'Try adjusting your search terms or zone filter.'
                : 'No inventory data available in the system.'
              }
            </p>
          </div>
        )}
        </div>
      )}
    </div>
  );
}