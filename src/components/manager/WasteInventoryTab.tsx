// Waste Inventory Tab - Shows individual waste/lost/defect reports
import { useState, useEffect } from 'react';
import { wasteReportService, type WasteReport } from '../../services/wasteReportService';
import { useAuth } from '../../contexts/AuthContext';
import { userManagementService } from '../../services/userManagement';

export function WasteInventoryTab() {
  const { user } = useAuth();
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<WasteReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WasteReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'WASTE' | 'LOST' | 'DEFECT' | 'UNPLANNED_USAGE'>('ALL');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL'); // v7.18.0: Batch filter
  const [selectedApprovalFilter, setSelectedApprovalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL'); // Approval filter
  const [availableBatches, setAvailableBatches] = useState<string[]>([]); // v7.18.0: List of batches
  const [approvingReport, setApprovingReport] = useState(false); // Loading state for approval
  const [userDisplayNames, setUserDisplayNames] = useState<Map<string, string>>(new Map()); // Email to display name mapping
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalQuantity: 0,
    zoneCount: 0,
    wasteCount: 0,
    lostCount: 0,
    defectCount: 0
  });

  // Handle opening report modal - track image download when modal opens
  const openReportModal = (report: WasteReport) => {
    setSelectedReport(report);

    // Track image download cost (only when user actually views images)
    if (report.labelImageUrl || report.damageImageUrl) {
      wasteReportService.trackReportImageView(report);
    }
  };

  // Handle approving a report
  const handleApproveReport = async (reportId: string) => {
    if (!user?.email) return;

    setApprovingReport(true);
    try {
      await wasteReportService.approveWasteReport(reportId, user.email);

      // Get approver's display name
      let approverName = user.email.split('@')[0];
      try {
        const userRecord = await userManagementService.getUserRecord(user.email);
        if (userRecord?.displayName && userRecord?.useDisplayName) {
          approverName = userRecord.displayName;
        }
      } catch (error) {
        // Use fallback
      }

      // Update user display names map
      setUserDisplayNames(prev => new Map(prev).set(user.email, approverName));

      // Reload reports to get updated data
      await loadWasteReports();

      // Update the selected report to show approved status
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({
          ...selectedReport,
          approved: true,
          approvedBy: user.email,
          approvedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to approve report:', error);
      alert('Failed to approve report. Please try again.');
    } finally {
      setApprovingReport(false);
    }
  };

  useEffect(() => {
    loadWasteReports();
  }, []);

  useEffect(() => {
    applyFilters(wasteReports, selectedTypeFilter, selectedBatchFilter, selectedApprovalFilter);
  }, [selectedTypeFilter, selectedBatchFilter, selectedApprovalFilter, wasteReports]);

  // v7.18.0: Combined filter function for type, batch, and approval
  const applyFilters = (reports: WasteReport[], typeFilter: string, batchFilter: string, approvalFilter: string) => {
    let filtered = reports;

    // Apply type filter
    switch (typeFilter) {
      case 'WASTE':
        filtered = filtered.filter(report => report.type === 'WASTE');
        break;
      case 'LOST':
        filtered = filtered.filter(report => report.type === 'LOST');
        break;
      case 'DEFECT':
        filtered = filtered.filter(report => report.type === 'DEFECT');
        break;
      case 'UNPLANNED_USAGE':
        filtered = filtered.filter(report => report.type === 'UNPLANNED_USAGE');
        break;
      case 'ALL':
      default:
        // No type filtering
        break;
    }

    // Apply batch filter (v7.18.0)
    if (batchFilter !== 'ALL') {
      if (batchFilter === 'NO_BATCH') {
        // Show reports without batch
        filtered = filtered.filter(report => !report.batchId);
      } else {
        // Show reports from specific batch
        filtered = filtered.filter(report => report.batchId === batchFilter);
      }
    }

    // Apply approval filter
    switch (approvalFilter) {
      case 'PENDING':
        filtered = filtered.filter(report => !report.approved);
        break;
      case 'APPROVED':
        filtered = filtered.filter(report => report.approved === true);
        break;
      case 'ALL':
      default:
        // No approval filtering
        break;
    }

    setFilteredReports(filtered);
  };

  const loadWasteReports = async () => {
    setIsLoading(true);
    try {
      // Get all individual waste reports from new collection
      const reports = await wasteReportService.getAllWasteReports();
      setWasteReports(reports);

      // Calculate summary statistics
      const summary = await wasteReportService.getWasteSummary();
      setSummary({
        totalItems: summary.totalReports,
        totalQuantity: summary.totalQuantity,
        zoneCount: summary.locationsCount,
        wasteCount: summary.wasteCount,
        lostCount: summary.lostCount,
        defectCount: summary.defectCount
      });

      // v7.18.0: Extract unique batch IDs from reports
      const batches = Array.from(new Set(
        reports
          .map(r => r.batchId)
          .filter(batchId => batchId !== undefined && batchId !== null)
      )).sort((a, b) => {
        // Sort: Put DEFAULT last, otherwise sort numerically
        if (a === 'DEFAULT') return 1;
        if (b === 'DEFAULT') return -1;
        const aNum = parseInt(a) || 0;
        const bNum = parseInt(b) || 0;
        return aNum - bNum;
      }) as string[];
      setAvailableBatches(batches);

      // Load display names for all approvers
      const uniqueApprovers = Array.from(new Set(
        reports
          .filter(r => r.approvedBy)
          .map(r => r.approvedBy!)
      ));

      const namesMap = new Map<string, string>();
      for (const email of uniqueApprovers) {
        try {
          const userRecord = await userManagementService.getUserRecord(email);
          if (userRecord?.displayName && userRecord?.useDisplayName) {
            namesMap.set(email, userRecord.displayName);
          } else {
            // Fallback to email username
            namesMap.set(email, email.split('@')[0]);
          }
        } catch (error) {
          // Fallback to email username
          namesMap.set(email, email.split('@')[0]);
        }
      }
      setUserDisplayNames(namesMap);

      // Apply initial filters
      applyFilters(reports, selectedTypeFilter, selectedBatchFilter, selectedApprovalFilter);

    } catch (error) {
      console.error('Failed to load waste reports:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getLocationColor = (location: string) => {
    if (location === 'logistics') {
      return 'bg-blue-100 text-blue-800';
    }
    const colors = [
      'bg-green-50 text-green-700',
      'bg-purple-50 text-purple-700',
      'bg-orange-50 text-orange-700',
      'bg-red-50 text-red-700'
    ];
    const hash = location.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WASTE': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOST': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DEFECT': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'UNPLANNED_USAGE': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'WASTE': return '🔥';
      case 'LOST': return '❓';
      case 'DEFECT': return '⚠️';
      case 'UNPLANNED_USAGE': return '📋';
      default: return '📦';
    }
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
          onClick={loadWasteReports}
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

      {/* Filters: Type and Batch (v7.18.0) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Type Filter Buttons */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'WASTE', 'LOST', 'DEFECT', 'UNPLANNED_USAGE'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedTypeFilter(filter)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTypeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'ALL' && '📊 All Reports'}
                {filter === 'WASTE' && '🔥 Waste'}
                {filter === 'LOST' && '❓ Lost'}
                {filter === 'DEFECT' && '⚠️ Defect'}
                {filter === 'UNPLANNED_USAGE' && '📋 Unplanned Usage'}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Filter Dropdown (v7.18.0) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">📦 Filter by Batch</label>
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="w-full max-w-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">All Batches</option>
            <option value="NO_BATCH">No Batch Assigned</option>
            {availableBatches.map((batchId) => (
              <option key={batchId} value={batchId}>
                {batchId === 'DEFAULT' ? '🚫 DEFAULT Batch' : `Batch ${batchId}`}
              </option>
            ))}
          </select>
        </div>

        {/* Approval Filter Buttons */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">✓ Filter by Approval</label>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedApprovalFilter(filter)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedApprovalFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter === 'ALL' && '📋 All'}
                {filter === 'PENDING' && '⏳ Pending'}
                {filter === 'APPROVED' && '✅ Approved'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredReports.length} of {summary.totalItems} reports
        </div>
      </div>

      {/* Waste Reports Table */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Waste Reports</h3>
          <p className="text-gray-600">No waste, lost, or defect reports have been submitted yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Individual Waste Reports</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    📸
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    📦 Batch
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
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {report.approved ? (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Approved
                            </span>
                            {report.approvedBy && (
                              <span className="text-xs text-gray-500">
                                {userDisplayNames.get(report.approvedBy) || report.approvedBy.split('@')[0]}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(report.reportedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLocationColor(report.location)}`}>
                        {report.locationDisplay}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getTypeColor(report.type)}`}>
                        <span className="mr-1">{getTypeEmoji(report.type)}</span>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(report.labelImageUrl || report.damageImageUrl) ? (
                        <span className="text-green-600" title="Has photo evidence">
                          <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-gray-300" title="No photos">
                          <svg className="w-5 h-5 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.batchId ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          📦 {report.batchId === 'DEFAULT' ? '🚫 DEFAULT' : report.batchId}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No batch</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{report.sku}</div>
                      <div className="text-gray-500">{report.itemName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {report.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="max-w-xs truncate" title={report.reason}>
                          {report.reason || 'No reason provided'}
                        </div>
                        <button
                          onClick={() => openReportModal(report)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.reportedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Options */}
      {filteredReports.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Export Options</h4>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const csvContent = [
                  ['Date', 'Location', 'Type', 'SKU', 'Item Name', 'Quantity', 'Reason', 'Reported By'].join(','),
                  ...filteredReports.map(report => [
                    formatDateTime(report.reportedAt),
                    report.locationDisplay,
                    report.type,
                    report.sku,
                    report.itemName,
                    report.quantity,
                    report.reason?.replace(/,/g, ';') || '',
                    report.reportedBy
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

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl max-h-screen overflow-y-auto p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-2">{getTypeEmoji(selectedReport.type)}</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedReport.type} Report Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <p className="text-sm text-gray-900">{selectedReport.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <p className="text-sm text-gray-900">{selectedReport.itemName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="text-sm text-gray-900">{selectedReport.quantity}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{selectedReport.locationDisplay}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">📦 Batch</label>
                  <p className="text-sm text-gray-900">
                    {selectedReport.batchId ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        {selectedReport.batchId === 'DEFAULT' ? '🚫 DEFAULT' : selectedReport.batchId}
                      </span>
                    ) : (
                      <span className="text-gray-400">No batch assigned</span>
                    )}
                    {selectedReport.batchAllocation && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Batch had {selectedReport.batchAllocation} units at time of report)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reported By</label>
                  <p className="text-sm text-gray-900">{selectedReport.reportedBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedReport.reportedAt)}</p>
                </div>
              </div>

              {/* Images (v7.38.2) */}
              {(selectedReport.labelImageUrl || selectedReport.damageImageUrl) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📸</span>
                    Photo Evidence
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedReport.labelImageUrl && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Label Photo</label>
                        <a
                          href={selectedReport.labelImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative group"
                        >
                          <img
                            src={selectedReport.labelImageUrl}
                            alt="Label"
                            className="w-full h-48 object-cover rounded-lg border border-gray-300 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg">
                            <span className="text-white text-sm font-medium">🔍 Click to view full size</span>
                          </div>
                        </a>
                      </div>
                    )}
                    {selectedReport.damageImageUrl && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Damage Photo</label>
                        <a
                          href={selectedReport.damageImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative group"
                        >
                          <img
                            src={selectedReport.damageImageUrl}
                            alt="Damage"
                            className="w-full h-48 object-cover rounded-lg border border-gray-300 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg">
                            <span className="text-white text-sm font-medium">🔍 Click to view full size</span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                  {selectedReport.reason || 'No reason provided'}
                </p>
              </div>

              {/* Detailed Reason */}
              {selectedReport.detailedReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                    {selectedReport.detailedReason}
                  </p>
                </div>
              )}

              {/* DEFECT-specific fields */}
              {selectedReport.type === 'DEFECT' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">🔍 Defect Details</h4>

                  {selectedReport.rejectionReasons && selectedReport.rejectionReasons.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reasons</label>
                      <div className="bg-gray-50 p-3 rounded border">
                        {selectedReport.rejectionReasons.map((reason, index) => (
                          <div key={index} className="text-sm text-gray-900">
                            • {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedReport.customReason && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Custom Reason</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                        {selectedReport.customReason}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {selectedReport.totalLotQuantity && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Lot Quantity</label>
                        <p className="text-sm text-gray-900">{selectedReport.totalLotQuantity}</p>
                      </div>
                    )}
                    {selectedReport.shift && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Shift</label>
                        <p className="text-sm text-gray-900">{selectedReport.shift}</p>
                      </div>
                    )}
                    {selectedReport.detectedBy && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Detected By</label>
                        <p className="text-sm text-gray-900">{selectedReport.detectedBy}</p>
                      </div>
                    )}
                    {selectedReport.actionTaken && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Action Taken</label>
                        <p className="text-sm text-gray-900">{selectedReport.actionTaken}</p>
                      </div>
                    )}
                  </div>

                  {/* Claim Report */}
                  {selectedReport.claimReport && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">📋 Generated Claim Report</label>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs overflow-x-auto">
                        <pre>{selectedReport.claimReport}</pre>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedReport.claimReport!);
                          // You could add a toast notification here
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        📋 Copy Claim Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6">
              {/* Approval Status / Button */}
              <div>
                {selectedReport.approved ? (
                  <div className="text-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Approved
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      By: {selectedReport.approvedBy ? (userDisplayNames.get(selectedReport.approvedBy) || selectedReport.approvedBy.split('@')[0]) : 'Unknown'}
                      {selectedReport.approvedAt && (
                        <span className="ml-2">
                          {new Date(selectedReport.approvedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => selectedReport.id && handleApproveReport(selectedReport.id)}
                    disabled={approvingReport}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {approvingReport ? 'Approving...' : '✓ Approve Report'}
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedReport(null)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WasteInventoryTab;