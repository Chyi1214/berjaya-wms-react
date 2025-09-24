import { useState, useEffect, useMemo } from 'react';
import { scanLookupService } from '../../services/scanLookupService';
import { ScanLookup } from '../../types';
import { EditScannerEntryModal } from './EditScannerEntryModal';

interface ScannerInventoryTableProps {
  onRefresh?: () => void;
  userEmail: string;
}

export function ScannerInventoryTable({ onRefresh, userEmail }: ScannerInventoryTableProps) {
  const [lookups, setLookups] = useState<ScanLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ScanLookup>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingLookup, setEditingLookup] = useState<ScanLookup | null>(null);
  const itemsPerPage = 50;

  // Load scanner data
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await scanLookupService.getAllLookups();
      setLookups(data);
    } catch (error) {
      console.error('Failed to load scanner data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    let filtered = lookups;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = lookups.filter(lookup =>
        lookup.sku.toLowerCase().includes(term) ||
        (lookup.itemName?.toLowerCase() || '').includes(term) ||
        lookup.targetZone.toString().includes(term)
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
  }, [lookups, searchTerm, sortField, sortDirection]);

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

  // Handle delete
  const handleDelete = async (lookup: ScanLookup) => {
    if (!confirm(`Delete ${lookup.sku} in zone ${lookup.targetZone}?`)) {
      return;
    }

    try {
      await scanLookupService.deleteLookup(lookup.sku, lookup.targetZone.toString());
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
      {/* Search and Stats Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search SKU, item name, or zone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Total: {filteredAndSortedData.length} entries</span>
          <span>Zones: {new Set(lookups.map(l => l.targetZone)).size}</span>
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