// Waste Inventory Tab - Shows waste and lost items reported from production zones
import { useState, useEffect } from 'react';
import { InventoryCountEntry } from '../../types';
import { tableStateService } from '../../services/tableState';

interface WasteEntry extends InventoryCountEntry {
  zoneId?: string;
  reason?: string;
  type?: 'WASTE' | 'LOST' | 'DEFECT';
  detailedReason?: string;
}

export function WasteInventoryTab() {
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WasteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'WASTE' | 'LOST' | 'DEFECT' | 'LEGACY'>('ALL');
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    zoneCount: 0,
    wasteCount: 0,
    lostCount: 0,
    defectCount: 0
  });

  useEffect(() => {
    loadWasteEntries();
  }, []);

  useEffect(() => {
    applyTypeFilter(wasteEntries, selectedTypeFilter);
  }, [selectedTypeFilter, wasteEntries]);

  const applyTypeFilter = (entries: WasteEntry[], filter: string) => {
    let filtered = entries;

    switch (filter) {
      case 'WASTE':
        filtered = entries.filter(entry => entry.type === 'WASTE');
        break;
      case 'LOST':
        filtered = entries.filter(entry => entry.type === 'LOST');
        break;
      case 'DEFECT':
        filtered = entries.filter(entry => entry.type === 'DEFECT');
        break;
      case 'LEGACY':
        filtered = entries.filter(entry => !entry.type);
        break;
      case 'ALL':
      default:
        filtered = entries;
        break;
    }

    setFilteredEntries(filtered);
  };

  const loadWasteEntries = async () => {
    setIsLoading(true);
    try {
      // Get all inventory entries from waste_lost locations (both old and new format)
      const allCounts = await tableStateService.getExpectedInventory();
      const wasteItems = allCounts.filter(entry =>
        entry.location.startsWith('waste_lost_zone_') || // Old production format
        entry.location.startsWith('waste_lost_logistics') || // New logistics format
        entry.location.startsWith('waste_lost_production_zone_') // New production format
      );

      // Extract location information and parse types from console logs
      const enrichedWasteItems: WasteEntry[] = wasteItems.map(entry => {
        let zoneId = '';

        if (entry.location.startsWith('waste_lost_zone_')) {
          // Old format: waste_lost_zone_1
          zoneId = entry.location.replace('waste_lost_zone_', '');
        } else if (entry.location.startsWith('waste_lost_logistics')) {
          // New format: waste_lost_logistics
          zoneId = 'logistics';
        } else if (entry.location.startsWith('waste_lost_production_zone_')) {
          // New format: waste_lost_production_zone_1
          zoneId = entry.location.replace('waste_lost_production_zone_', '');
        }

        // Extract type and reason from countedBy field or notes
        // New entries have format like: "[WASTE] reason text | Rejection: ..."
        const reasonText = entry.notes || '';
        let type: 'WASTE' | 'LOST' | 'DEFECT' | undefined;
        let detailedReason = reasonText;

        if (reasonText.includes('[WASTE]')) {
          type = 'WASTE';
          detailedReason = reasonText.replace('[WASTE]', '').trim();
        } else if (reasonText.includes('[LOST]')) {
          type = 'LOST';
          detailedReason = reasonText.replace('[LOST]', '').trim();
        } else if (reasonText.includes('[DEFECT]')) {
          type = 'DEFECT';
          detailedReason = reasonText.replace('[DEFECT]', '').trim();
        }

        return {
          ...entry,
          zoneId,
          reason: reasonText || 'No reason provided',
          type,
          detailedReason: detailedReason || 'No reason provided'
        };
      }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setWasteEntries(enrichedWasteItems);

      // Calculate summary statistics
      const zones = new Set(enrichedWasteItems.map(item => item.zoneId));
      const totalQuantity = enrichedWasteItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
      const wasteCount = enrichedWasteItems.filter(item => item.type === 'WASTE').length;
      const lostCount = enrichedWasteItems.filter(item => item.type === 'LOST').length;
      const defectCount = enrichedWasteItems.filter(item => item.type === 'DEFECT').length;

      setSummary({
        totalItems: enrichedWasteItems.length,
        totalQuantity: totalQuantity,
        zoneCount: zones.size,
        wasteCount,
        lostCount,
        defectCount
      });

      // Apply initial filter
      applyTypeFilter(enrichedWasteItems, selectedTypeFilter);

    } catch (error) {
      console.error('Failed to load waste entries:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getZoneColor = (zoneId: string) => {
    if (zoneId === 'logistics') {
      return 'bg-blue-100 text-blue-800';
    }
    const colors = [
      'bg-green-50 text-green-700',
      'bg-purple-50 text-purple-700',
      'bg-orange-50 text-orange-700',
      'bg-red-50 text-red-700'
    ];
    const hash = zoneId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'WASTE': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOST': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DEFECT': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeEmoji = (type?: string) => {
    switch (type) {
      case 'WASTE': return '🔥';
      case 'LOST': return '❓';
      case 'DEFECT': return '⚠️';
      default: return '📦';
    }
  };

  const getZoneDisplay = (entry: WasteEntry) => {
    if (entry.zoneId === 'logistics') {
      return 'Logistics';
    }
    return `Zone ${entry.zoneId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading waste inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">🗂️</span>
            Waste/Lost/Defect Inventory
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Items reported as waste, lost, or defective by logistics and production workers
          </p>
        </div>
        <button
          onClick={loadWasteEntries}
          className="btn-secondary text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{summary.totalItems}</div>
          <div className="text-sm text-gray-600">Total Reports</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{summary.totalQuantity}</div>
          <div className="text-sm text-gray-600">Total Quantity</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{summary.wasteCount}</div>
          <div className="text-sm text-gray-600">🔥 Waste</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{summary.lostCount}</div>
          <div className="text-sm text-gray-600">❓ Lost</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{summary.defectCount}</div>
          <div className="text-sm text-gray-600">⚠️ Defect</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{summary.zoneCount}</div>
          <div className="text-sm text-gray-600">Locations</div>
        </div>
      </div>

      {/* Type Filter Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'WASTE', 'LOST', 'DEFECT', 'LEGACY'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedTypeFilter(filter)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTypeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'ALL' && '📋 All Items'}
              {filter === 'WASTE' && '🔥 Waste'}
              {filter === 'LOST' && '❓ Lost'}
              {filter === 'DEFECT' && '⚠️ Defect'}
              {filter === 'LEGACY' && '📦 Legacy'}
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredEntries.length} of {summary.totalItems} items
        </div>
      </div>

      {/* Waste Entries Table */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Waste Items</h3>
          <p className="text-gray-600">No waste or lost items have been reported yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Waste & Lost Reports</h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getZoneColor(entry.zoneId || '')}`}>
                        {getZoneDisplay(entry)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getTypeColor(entry.type)}`}>
                        <span className="mr-1">{getTypeEmoji(entry.type)}</span>
                        {entry.type || 'LEGACY'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{entry.sku}</div>
                      <div className="text-gray-500">{entry.itemName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        -{Math.abs(entry.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="max-w-xs truncate" title={entry.reason}>
                        {entry.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.countedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Options */}
      {wasteEntries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Export Options</h4>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const csvContent = [
                  ['Date', 'Zone', 'SKU', 'Item Name', 'Quantity', 'Reason', 'Reported By'].join(','),
                  ...wasteEntries.map(entry => [
                    formatDateTime(entry.timestamp),
                    `Zone ${entry.zoneId}`,
                    entry.sku,
                    entry.itemName,
                    Math.abs(entry.amount),
                    entry.reason,
                    entry.countedBy
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `waste-inventory-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="btn-secondary text-sm"
            >
              📊 Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WasteInventoryTab;