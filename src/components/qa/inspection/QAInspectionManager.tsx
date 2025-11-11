// QA Inspection Manager - Manager view for inspections oversight
import React, { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import { inspectionReportService } from '../../../services/inspectionReportService';
import { gateService } from '../../../services/gateService';
import { InspectionResultsModal } from '../stock/InspectionResultsModal';
import type { CarInspection } from '../../../types/inspection';
import type { QAGate } from '../../../types/gate';
import { createModuleLogger } from '../../../services/logger';

const logger = createModuleLogger('QAInspectionManager');

const QAInspectionManager: React.FC = () => {
  const [inspections, setInspections] = useState<CarInspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<CarInspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<CarInspection | null>(null);
  const [gates, setGates] = useState<QAGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGate, setFilterGate] = useState<string>('all');
  const [searchVIN, setSearchVIN] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsVIN, setDetailsVIN] = useState<string | null>(null);

  useEffect(() => {
    loadInspections();
    loadGates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inspections, filterStatus, filterGate, searchVIN]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const data = await inspectionService.getAllInspections();
      setInspections(data);
    } catch (err) {
      logger.error('Failed to load inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGates = async () => {
    try {
      const allGates = await gateService.getAllGates();
      setGates(allGates);
    } catch (err) {
      logger.error('Failed to load gates:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...inspections];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((i) => i.status === filterStatus);
    }

    // Filter by gate
    if (filterGate !== 'all') {
      filtered = filtered.filter((i) => i.gateId === filterGate);
    }

    // Filter by VIN search
    if (searchVIN.trim()) {
      filtered = filtered.filter((i) =>
        i.vin.toLowerCase().includes(searchVIN.toLowerCase())
      );
    }

    setFilteredInspections(filtered);
  };


  const exportToCSV = (inspection: CarInspection) => {
    const rows: string[] = [
      'VIN,Section,Item,Defect Type,Notes,Inspector,Checked At,Status,IsAdditional',
    ];

    Object.entries(inspection.sections).forEach(([sectionId, section]) => {
      Object.entries(section.results).forEach(([itemName, result]) => {
        // Main defect row
        rows.push(
          [
            inspection.vin,
            sectionId,
            itemName,
            result.defectType,
            result.notes || '',
            section.inspectorName || section.inspector || '',
            result.checkedAt
              ? new Date(result.checkedAt).toLocaleString()
              : '',
            result.status || '',
            'No',  // Main defect is not additional
          ].join(',')
        );

        // Additional defects rows (backwards compatibility: treat undefined as empty array)
        const additionalDefects = result.additionalDefects || [];
        additionalDefects.forEach((additionalDefect) => {
          rows.push(
            [
              inspection.vin,
              sectionId,
              itemName,
              additionalDefect.defectType,
              additionalDefect.notes || '',
              additionalDefect.checkedBy || '',
              additionalDefect.checkedAt
                ? new Date(additionalDefect.checkedAt).toLocaleString()
                : '',
              additionalDefect.status || '',
              'Yes',  // Additional defect
            ].join(',')
          );
        });
      });
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection_${inspection.vin}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = async (inspection: CarInspection) => {
    try {
      await inspectionReportService.generateReportById(inspection.inspectionId);
      logger.info('PDF report generated for:', inspection.vin);
    } catch (err) {
      logger.error('Failed to generate PDF report:', err);
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const handleDeleteInspection = async (inspection: CarInspection) => {
    const confirmMessage =
      `⚠️ DELETE INSPECTION\n\n` +
      `VIN: ${inspection.vin}\n` +
      `Status: ${inspection.status}\n` +
      `Created: ${new Date(inspection.createdAt).toLocaleDateString()}\n\n` +
      `This will permanently delete:\n` +
      `• All inspection data\n` +
      `• All section results\n` +
      `• All photos (if any)\n\n` +
      `Are you sure you want to DELETE this inspection?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await inspectionService.deleteInspection(inspection.inspectionId);
      logger.info('Inspection deleted:', inspection.vin);

      // Reload inspections list
      await loadInspections();

      // Close detail view if this inspection was selected
      if (selectedInspection?.inspectionId === inspection.inspectionId) {
        setSelectedInspection(null);
      }

      alert(`✅ Inspection for VIN ${inspection.vin} deleted successfully`);
    } catch (err) {
      logger.error('Failed to delete inspection:', err);
      alert('❌ Failed to delete inspection. Please try again.');
    }
  };

  const getResolvedDefectsCount = (inspection: CarInspection): number => {
    let resolvedCount = 0;

    Object.values(inspection.sections).forEach(section => {
      Object.values(section.results).forEach(result => {
        // Count main defect if it's resolved
        if (result.defectType !== 'Ok' && result.status === 'Resolved') {
          resolvedCount++;
        }

        // Count resolved additional defects
        const additionalDefects = result.additionalDefects || [];
        additionalDefects.forEach((additionalDefect) => {
          if (additionalDefect.status === 'Resolved') {
            resolvedCount++;
          }
        });
      });
    });

    return resolvedCount;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              QA Inspection Management
            </h1>
            <p className="text-gray-600 mt-1">
              View and manage car inspections
            </p>
          </div>
          <button
            onClick={loadInspections}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">
            {inspections.length}
          </div>
          <div className="text-sm text-gray-600">Total Inspections</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-600">
            {inspections.filter((i) => i.status === 'not_started').length}
          </div>
          <div className="text-sm text-gray-600">Not Started</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {inspections.filter((i) => i.status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {inspections.filter((i) => i.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">
            {inspections.reduce((total, inspection) => {
              const summary = inspectionService.getInspectionSummary(inspection);
              return total + summary.totalDefects;
            }, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Defects</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {inspections.reduce((total, inspection) => {
              return total + getResolvedDefectsCount(inspection);
            }, 0)}
          </div>
          <div className="text-sm text-gray-600">Fixed Defects</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchVIN}
              onChange={(e) => setSearchVIN(e.target.value)}
              placeholder="Search by VIN..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterGate}
            onChange={(e) => setFilterGate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
          >
            <option value="all">All Gates</option>
            {gates.map((gate) => (
              <option key={gate.gateId} value={gate.gateId}>
                {gate.gateName} (Gate {gate.gateIndex})
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Inspections List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Inspections ({filteredInspections.length})
          </h2>
        </div>

        {filteredInspections.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-3">📋</div>
            <div>No inspections found</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredInspections.map((inspection) => {
              const summary = inspectionService.getInspectionSummary(inspection);
              const isExpanded = selectedInspection?.inspectionId === inspection.inspectionId;

              return (
                <div key={inspection.inspectionId}>
                  <div
                    onClick={() =>
                      setSelectedInspection(isExpanded ? null : inspection)
                    }
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {inspection.vin}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              inspection.status
                            )}`}
                          >
                            {inspection.status}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          {inspection.gateName && (
                            <div className="flex items-center gap-2">
                              <span>🚪 Gate:</span>
                              <span className="font-medium text-purple-700">
                                {inspection.gateName}
                              </span>
                              {inspection.gateIndex && (
                                <span className="text-xs text-gray-500">
                                  (Gate {inspection.gateIndex})
                                </span>
                              )}
                            </div>
                          )}
                          <div>
                            Sections: {summary.completedSections}/
                            {summary.totalSections} completed
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Defects: {summary.totalDefects}</span>
                            {summary.totalDefects > 0 && (
                              <span className="text-green-600 font-medium">
                                ({getResolvedDefectsCount(inspection)} fixed)
                              </span>
                            )}
                          </div>
                          <div>
                            Inspectors: {summary.inspectors.length > 0
                              ? summary.inspectors.join(', ')
                              : 'None'}
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${
                                  (summary.completedSections /
                                    summary.totalSections) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsVIN(inspection.vin);
                            setShowDetailsModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                          title="View detailed defects and resolution status"
                        >
                          🔍 View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generatePDFReport(inspection);
                          }}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                        >
                          📄 PDF Report
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportToCSV(inspection);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          CSV
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInspection(inspection);
                          }}
                          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm flex items-center gap-1"
                          title="Delete this inspection permanently"
                        >
                          🗑️ Delete
                        </button>
                        <div className="text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Section Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(inspection.sections).map(
                          ([sectionId, section]) => {
                            // Count main defects
                            let defectCount = Object.values(
                              section.results
                            ).filter((r) => r.defectType !== 'Ok').length;

                            // Add additional defects count
                            Object.values(section.results).forEach((r) => {
                              if (r.additionalDefects) {
                                defectCount += r.additionalDefects.length;
                              }
                            });

                            return (
                              <div
                                key={sectionId}
                                className="bg-white rounded-lg p-4 border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-gray-900">
                                    {sectionId.replace(/_/g, ' ')}
                                  </div>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(
                                      section.status
                                    )}`}
                                  >
                                    {section.status}
                                  </span>
                                </div>

                                {section.inspector && (
                                  <div className="text-sm text-gray-600 mb-1">
                                    Inspector:{' '}
                                    {section.inspectorName ||
                                      section.inspector}
                                  </div>
                                )}

                                <div className="text-sm text-gray-600 mb-1">
                                  Items: {Object.keys(section.results).length}
                                </div>

                                <div className="text-sm text-gray-600">
                                  Defects: {defectCount}
                                </div>

                                {section.completedAt && (
                                  <div className="text-xs text-gray-500 mt-2">
                                    Completed:{' '}
                                    {new Date(
                                      section.completedAt
                                    ).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>

                      {summary.totalDefects > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-2">
                            Defect Summary
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {Object.entries(summary.defectsByType).map(
                              ([type, count]) => {
                                if (type === 'Ok' || count === 0) return null;
                                return (
                                  <div
                                    key={type}
                                    className="bg-red-50 rounded p-2 text-center"
                                  >
                                    <div className="text-lg font-bold text-red-600">
                                      {count}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {type}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Defect Details Modal */}
      {showDetailsModal && detailsVIN && (
        <InspectionResultsModal
          vin={detailsVIN}
          onClose={() => {
            setShowDetailsModal(false);
            setDetailsVIN(null);
          }}
        />
      )}
    </div>
  );
};

export default QAInspectionManager;
