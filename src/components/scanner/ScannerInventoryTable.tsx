import { useState, useEffect, useMemo } from 'react';
import { scanLookupService } from '../../services/scanLookupService';
import { batchManagementService } from '../../services/batchManagement';
import { ScanLookup } from '../../types';
import { EditScannerEntryModal } from './EditScannerEntryModal';

interface ScannerInventoryTableProps {
  onRefresh?: () => void;
  userEmail: string;
  carType?: string; // Optional: if provided, uses this instead of own state
  hideCarTypeSelector?: boolean; // Optional: hide the car type selector
}

export function ScannerInventoryTable({ onRefresh, userEmail, carType: externalCarType, hideCarTypeSelector = false }: ScannerInventoryTableProps) {
  const [lookups, setLookups] = useState<ScanLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ScanLookup>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingLookup, setEditingLookup] = useState<ScanLookup | null>(null);
  const itemsPerPage = 50;

  // Car type filter (v7.19.0)
  const [availableCarTypes, setAvailableCarTypes] = useState<Array<{carCode: string; name: string}>>([]);
  const [selectedCarType, setSelectedCarType] = useState<string>('TK1');
  const [carTypesLoading, setCarTypesLoading] = useState(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  // Load car types on mount (v7.19.0)
  useEffect(() => {
    const loadCarTypes = async () => {
      try {
        setCarTypesLoading(true);
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
        console.error('Failed to load car types:', error);
      } finally {
        setCarTypesLoading(false);
      }
    };

    loadCarTypes();
  }, []);

  // Use external carType if provided, otherwise use internal state
  const activeCarType = externalCarType || selectedCarType;

  // Load scanner data (v7.19.0: car-type-filtered)
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await scanLookupService.getAllLookups(activeCarType);
      setLookups(data);
    } catch (error) {
      console.error('Failed to load scanner data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload when car type changes (v7.19.0)
  useEffect(() => {
    if (activeCarType) {
      loadData();
    }
  }, [activeCarType]);

  // Zone statistics (v7.19.0)
  const zoneStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    lookups.forEach(lookup => {
      const zone = lookup.targetZone.toString();
      stats[zone] = (stats[zone] || 0) + 1;
    });
    return stats;
  }, [lookups]);

  // Available zones for filter (v7.19.0)
  const availableZones = useMemo(() => {
    return Array.from(new Set(lookups.map(l => l.targetZone.toString()))).sort();
  }, [lookups]);

  // Filtered and sorted data (v7.19.0: added zone filter)
  const filteredAndSortedData = useMemo(() => {
    let filtered = lookups;

    // Apply zone filter
    if (selectedZoneFilter !== 'all') {
      filtered = filtered.filter(lookup => lookup.targetZone.toString() === selectedZoneFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lookup =>
        lookup.sku.toLowerCase().includes(term) ||
        (lookup.itemName?.toLowerCase() || '').includes(term) ||
        lookup.targetZone.toString().toLowerCase().includes(term)  // Fixed: now case-insensitive
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (sortField === 'targetZone' || sortField === 'expectedQuantity') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [lookups, searchTerm, sortField, sortDirection, selectedZoneFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);

  // Handle sort
  const handleSort = (field: keyof ScanLookup) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle delete (v7.19.0: pass carType)
  const handleDelete = async (lookup: ScanLookup) => {
    if (!confirm(`Delete ${lookup.sku} in zone ${lookup.targetZone}?`)) {
      return;
    }

    try {
      await scanLookupService.deleteLookup(lookup.sku, lookup.carType, lookup.targetZone.toString());
      await loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete lookup:', error);
      alert('Failed to delete entry. Please try again.');
    }
  };

  // Handle edit save
  const handleEditSave = async () => {
    await loadData();
    setEditingLookup(null);
    onRefresh?.();
  };

  // Sort icon
  const getSortIcon = (field: keyof ScanLookup) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl">📋</div>
          <p className="text-gray-500 mt-2">Loading scanner inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Car Type Selector (v7.19.0) - Hidden when controlled by parent */}
      {!hideCarTypeSelector && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">🚗 Car Type</h3>
              <p className="text-xs text-gray-500">Select car type to view scanner inventory</p>
            </div>
            <select
              value={selectedCarType}
              onChange={(e) => {
                setSelectedCarType(e.target.value);
                setSelectedZoneFilter('all'); // Reset zone filter when car changes
                setCurrentPage(1);
              }}
              disabled={carTypesLoading}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {availableCarTypes.map(carType => (
                <option key={carType.carCode} value={carType.carCode}>
                  {carType.carCode} - {carType.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Zone Statistics Preview (v7.19.0) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{lookups.length}</div>
          <div className="text-xs text-blue-600 font-medium">Total Items</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{availableZones.length}</div>
          <div className="text-xs text-green-600 font-medium">Total Zones</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-700">{new Set(lookups.map(l => l.sku)).size}</div>
          <div className="text-xs text-purple-600 font-medium">Unique SKUs</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-700">{filteredAndSortedData.length}</div>
          <div className="text-xs text-orange-600 font-medium">Filtered Results</div>
        </div>
      </div>

      {/* Search and Filter Bar (v7.19.0) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by SKU, item name, or zone code (e.g., Z001, Small Part, 15)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={selectedZoneFilter}
            onChange={(e) => {
              setSelectedZoneFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Zones ({lookups.length})</option>
            {availableZones.map(zone => (
              <option key={zone} value={zone}>
                Zone {zone} ({zoneStats[zone] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center space-x-1">
                    <span>SKU</span>
                    <span className="text-gray-400">{getSortIcon('sku')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('targetZone')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Zone</span>
                    <span className="text-gray-400">{getSortIcon('targetZone')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('itemName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Item Name</span>
                    <span className="text-gray-400">{getSortIcon('itemName')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('expectedQuantity')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Expected Qty</span>
                    <span className="text-gray-400">{getSortIcon('expectedQuantity')}</span>
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Updated</span>
                    <span className="text-gray-400">{getSortIcon('updatedAt')}</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((lookup) => (
                <tr key={`${lookup.sku}_${lookup.targetZone}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lookup.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {lookup.targetZone}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {lookup.itemName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lookup.expectedQuantity || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lookup.updatedAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setEditingLookup(lookup)}
                        className="text-blue-600 hover:text-blue-900 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(lookup)}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scanner data found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Upload CSV data or initialize test data to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLookup && (
        <EditScannerEntryModal
          lookup={editingLookup}
          onSave={handleEditSave}
          onCancel={() => setEditingLookup(null)}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}