// Supplier Box Scan Manager - Manager view for QR tracking system (v7.8.0)
import { useState, useEffect } from 'react';
import { supplierBoxScanService, SupplierBoxScanRecord } from '../../services/supplierBoxScanService';
import { logger } from '../../services/logger';

export function SupplierBoxScanManager() {
  const [loading, setLoading] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [scans, setScans] = useState<SupplierBoxScanRecord[]>([]);
  const [duplicates, setDuplicates] = useState<Map<string, SupplierBoxScanRecord[]>>(new Map());
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load available batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  // Load scans when batch changes
  useEffect(() => {
    if (selectedBatch) {
      loadScans();
      loadDuplicates();
    }
  }, [selectedBatch]);

  const loadBatches = async () => {
    try {
      const { batchManagementService } = await import('../../services/batchManagement');
      const allBatches = await batchManagementService.getAllBatches();
      const batchIds = allBatches
        .filter(batch => batch.status === 'in_progress')
        .map(batch => batch.batchId)
        .sort();

      setAvailableBatches(batchIds);
      if (batchIds.length > 0 && !selectedBatch) {
        setSelectedBatch(batchIds[0]);
      }
    } catch (error) {
      logger.error('Failed to load batches:', error);
    }
  };

  const loadScans = async () => {
    if (!selectedBatch) return;

    try {
      setLoading(true);
      const scanRecords = await supplierBoxScanService.getScansByBatch(selectedBatch, 500);
      setScans(scanRecords);
      logger.info('Loaded supplier box scans:', { count: scanRecords.length, batch: selectedBatch });
    } catch (error) {
      logger.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicates = async () => {
    if (!selectedBatch) return;

    try {
      const duplicateMap = await supplierBoxScanService.findDuplicates(selectedBatch);
      setDuplicates(duplicateMap);
      logger.info('Found duplicate QR scans:', { count: duplicateMap.size });
    } catch (error) {
      logger.error('Failed to find duplicates:', error);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!scanId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this scan record?\n\n' +
      'This will remove it from the tracking system, but will NOT affect inventory counts or transactions.'
    );

    if (!confirmed) return;

    try {
      setDeleting(scanId);
      await supplierBoxScanService.deleteScan(scanId);
      logger.info('Deleted supplier box scan:', { scanId });

      // Refresh data
      await loadScans();
      await loadDuplicates();
    } catch (error) {
      logger.error('Failed to delete scan:', error);
      alert('Failed to delete scan. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAllScans = async () => {
    if (!selectedBatch) return;

    const confirmed = window.confirm(
      `⚠️ WARNING: Delete ALL scans for Batch ${selectedBatch}?\n\n` +
      `This will permanently delete ${scans.length} scan record(s).\n\n` +
      'This will remove all scans from the tracking system, but will NOT affect inventory counts or transactions.\n\n' +
      'This action cannot be undone. Continue?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const deletedCount = await supplierBoxScanService.deleteAllScansForBatch(selectedBatch);
      logger.info('Deleted all scans for batch:', { batchId: selectedBatch, count: deletedCount });

      alert(`Successfully deleted ${deletedCount} scan record(s) for Batch ${selectedBatch}`);

      // Refresh data
      await loadScans();
      await loadDuplicates();
    } catch (error) {
      logger.error('Failed to delete all scans:', error);
      alert('Failed to delete all scans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayScans = showDuplicatesOnly
    ? scans.filter(scan => duplicates.has(scan.supplierBoxQR))
    : scans;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📦 Supplier Box QR Tracking</h3>
        <p className="text-sm text-gray-600">
          Track and manage supplier box QR code scans to prevent double-counting.
          This helps ensure accurate inventory by detecting when the same physical box is scanned multiple times.
        </p>
      </div>

      {/* Batch Selector and Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Batch:</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Choose a batch...</option>
              {availableBatches.map(batchId => (
                <option key={batchId} value={batchId}>
                  Batch {batchId}
                </option>
              ))}
            </select>
          </div>

          {selectedBatch && (
            <>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    loadScans();
                    loadDuplicates();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDeleteAllScans}
                  disabled={loading || scans.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                  title="Delete all scans for this batch"
                >
                  🗑️ Delete All ({scans.length})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-duplicates"
                  checked={showDuplicatesOnly}
                  onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="show-duplicates" className="text-sm text-gray-700 cursor-pointer">
                  Show duplicates only ({duplicates.size})
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {selectedBatch && scans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{scans.length}</div>
            <div className="text-sm text-gray-600">Total Scans</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {new Set(scans.map(s => s.supplierBoxQR)).size}
            </div>
            <div className="text-sm text-gray-600">Unique QR Codes</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{duplicates.size}</div>
            <div className="text-sm text-gray-600">Duplicate QR Codes</div>
          </div>
        </div>
      )}

      {/* Scans Table */}
      {selectedBatch && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Box
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scanned By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scanned At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Loading scans...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayScans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {showDuplicatesOnly ? 'No duplicate scans found' : 'No scans found for this batch'}
                    </td>
                  </tr>
                ) : (
                  displayScans.map((scan) => {
                    const isDuplicate = duplicates.has(scan.supplierBoxQR);
                    return (
                      <tr
                        key={scan.id}
                        className={isDuplicate ? 'bg-red-50' : ''}
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-gray-900">{scan.supplierBoxQR}</span>
                            {isDuplicate && (
                              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                                DUPLICATE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{scan.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{scan.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {scan.caseNo || <span className="italic text-gray-400">DEFAULT</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{scan.scannedBy}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {scan.scannedAt.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDeleteScan(scan.id!)}
                            disabled={deleting === scan.id}
                            className="text-red-600 hover:text-red-800 disabled:text-gray-400 transition-colors"
                          >
                            {deleting === scan.id ? '⏳' : '🗑️ Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Batch Selected */}
      {!selectedBatch && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium">Select a batch to view QR scans</h3>
          <p>Choose a batch from the dropdown above to manage supplier box scans</p>
        </div>
      )}
    </div>
  );
}
