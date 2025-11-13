// Inspection Results Modal - View all gate inspection results for a car
import { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type { CarInspection, InspectionItemResult, InspectionTemplate, DefectLocation } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { useAuth } from '../../../contexts/AuthContext';

const logger = createModuleLogger('InspectionResultsModal');

interface InspectionResultsModalProps {
  vin: string;
  onClose: () => void;
}

export function InspectionResultsModal({ vin, onClose }: InspectionResultsModalProps) {
  const [inspections, setInspections] = useState<CarInspection[]>([]);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGateIndex, setSelectedGateIndex] = useState<number>(0);
  const [resolvingDefect, setResolvingDefect] = useState<string | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveDialogData, setResolveDialogData] = useState<{
    sectionId: string;
    itemName: string;
    additionalDefectIndex?: number;
  } | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const { authenticatedUser, getUserDisplayName } = useAuth();

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadInspections();
  }, [vin]);

  const loadInspections = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await inspectionService.getInspectionsByVIN(vin);

      if (data.length === 0) {
        setError('No inspection results found for this car');
        setIsLoading(false);
        return;
      }

      setInspections(data);

      // Load template to get section images
      if (data[0]?.templateId) {
        const tmpl = await inspectionService.getTemplate(data[0].templateId);
        setTemplate(tmpl);
      }

      logger.info('Loaded inspections for VIN:', { vin, count: data.length });
    } catch (err) {
      logger.error('Failed to load inspections:', err);
      setError('Failed to load inspection results');
    } finally {
      setIsLoading(false);
    }
  };

  // Count defects in a section
  const countDefects = (results: Record<string, InspectionItemResult>): number => {
    let count = 0;
    Object.values(results).forEach(result => {
      if (result.defectType !== 'Ok') {
        count++;
      }
      // Count additional defects
      if (result.additionalDefects) {
        count += result.additionalDefects.length;
      }
    });
    return count;
  };

  // Format timestamp
  const formatTimestamp = (date: Date | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get defect type badge color
  const getDefectColor = (defectType: string): string => {
    if (defectType === 'Ok') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-red-100 text-red-800';
  };

  // Collect all defect locations from inspection
  const collectDefectLocations = (inspection: CarInspection): DefectLocation[] => {
    const locations: DefectLocation[] = [];
    Object.values(inspection.sections).forEach(sectionData => {
      Object.values(sectionData.results).forEach(result => {
        if (result.defectLocation) {
          locations.push(result.defectLocation);
        }
        if (result.additionalDefects) {
          result.additionalDefects.forEach(additional => {
            if (additional.defectLocation) {
              locations.push(additional.defectLocation);
            }
          });
        }
      });
    });
    return locations;
  };

  // Open resolve dialog
  const handleMarkAsResolved = (
    sectionId: string,
    itemName: string,
    additionalDefectIndex?: number
  ) => {
    setResolveDialogData({ sectionId, itemName, additionalDefectIndex });
    setResolutionNote('');
    setShowResolveDialog(true);
  };

  // Perform the resolution after dialog confirmation
  const performResolve = async () => {
    if (!selectedInspection || !authenticatedUser || !resolveDialogData) return;

    const { sectionId, itemName, additionalDefectIndex } = resolveDialogData;
    const defectKey = `${sectionId}_${itemName}_${additionalDefectIndex ?? 'main'}`;
    setResolvingDefect(defectKey);
    setShowResolveDialog(false);

    try {
      await inspectionService.markDefectAsResolved(
        selectedInspection.inspectionId,
        sectionId as any,
        itemName,
        authenticatedUser.email,
        getUserDisplayName(),
        resolutionNote.trim() || undefined,
        additionalDefectIndex
      );

      // Reload inspections to show updated status
      await loadInspections();
      logger.info('Defect marked as resolved successfully');
    } catch (err) {
      logger.error('Failed to mark defect as resolved:', err);
      alert('Failed to mark defect as resolved');
    } finally {
      setResolvingDefect(null);
      setResolveDialogData(null);
      setResolutionNote('');
    }
  };

  const selectedInspection = inspections[selectedGateIndex];
  const defectLocations = selectedInspection ? collectDefectLocations(selectedInspection) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-lg shadow-xl max-w-6xl w-full h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Inspection Results</h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1 font-mono truncate">VIN: {vin}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none ml-4 flex-shrink-0"
            >
              ×
            </button>
          </div>

          {/* Mobile Gate Selector - Only show on mobile */}
          {!isLoading && !error && inspections.length > 0 && (
            <div className="mt-4 md:hidden">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Gate:</label>
              <select
                value={selectedGateIndex}
                onChange={(e) => setSelectedGateIndex(Number(e.target.value))}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {inspections.map((inspection, index) => {
                  const completedSections = Object.values(inspection.sections).filter(
                    s => s.status === 'completed'
                  ).length;
                  const totalSections = Object.keys(inspection.sections).length;

                  return (
                    <option key={inspection.inspectionId} value={index}>
                      {inspection.gateName || `Gate ${inspection.gateIndex}`} - {completedSections}/{totalSections} sections ({inspection.status})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading inspection results...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">❌</div>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left Sidebar - Gate Selection - Hidden on mobile */}
              <div className="hidden md:block md:w-64 border-r border-gray-200 overflow-y-auto bg-gray-50 flex-shrink-0">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Gate</h3>
                  <div className="space-y-2">
                    {inspections.map((inspection, index) => {
                      const completedSections = Object.values(inspection.sections).filter(
                        s => s.status === 'completed'
                      ).length;
                      const totalSections = Object.keys(inspection.sections).length;

                      return (
                        <button
                          key={inspection.inspectionId}
                          onClick={() => setSelectedGateIndex(index)}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                            selectedGateIndex === index
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 bg-white hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold text-gray-900">
                              {inspection.gateName || `Gate ${inspection.gateIndex}`}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(inspection.status)}`}>
                              {inspection.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {completedSections}/{totalSections} sections
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Content - Inspection Details - Full width on mobile */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {selectedInspection ? (
                  <div className="space-y-6">
                    {/* Inspection Overview */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <div className="text-sm text-blue-700 font-medium">Gate</div>
                          <div className="text-lg font-semibold text-blue-900">
                            {selectedInspection.gateName || `Gate ${selectedInspection.gateIndex}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-700 font-medium">Status</div>
                          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedInspection.status)}`}>
                            {selectedInspection.status}
                          </span>
                        </div>
                        {selectedInspection.linkedFromBodyCode && (
                          <div className="sm:col-span-2">
                            <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-700 font-semibold">🔗 Originally inspected as:</span>
                                <span className="text-purple-900 font-mono font-bold">{selectedInspection.linkedFromBodyCode}</span>
                              </div>
                              <div className="text-xs text-purple-700 mt-1">
                                Linked to VIN on {formatTimestamp(selectedInspection.linkedAt || null)} by {selectedInspection.linkedBy}
                              </div>
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-blue-700 font-medium">Started At</div>
                          <div className="text-sm text-blue-900">{formatTimestamp(selectedInspection.startedAt)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-700 font-medium">Completed At</div>
                          <div className="text-sm text-blue-900">{formatTimestamp(selectedInspection.completedAt)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Defect Location Images */}
                    {template && defectLocations.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-3 md:p-4 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base">
                            Defect Locations ({defectLocations.length} marked)
                          </h4>
                        </div>
                        <div className="p-3 md:p-4">
                          <div className="grid grid-cols-1 gap-4">
                            {Object.entries(selectedInspection.sections).map(([sectionId]) => {
                              const sectionTemplate = template.sections[sectionId];
                              if (!sectionTemplate?.images || sectionTemplate.images.length === 0) return null;

                              // Get locations for this section
                              const sectionLocations = defectLocations.filter(loc =>
                                sectionTemplate.images?.some(img => img.imageId === loc.imageId)
                              );

                              if (sectionLocations.length === 0) return null;

                              // Group by imageId
                              const imageGroups = new Map<string, DefectLocation[]>();
                              sectionLocations.forEach(loc => {
                                if (!imageGroups.has(loc.imageId)) {
                                  imageGroups.set(loc.imageId, []);
                                }
                                imageGroups.get(loc.imageId)!.push(loc);
                              });

                              return Array.from(imageGroups.entries()).map(([imageId, locations]) => {
                                const image = sectionTemplate.images?.find(img => img.imageId === imageId);
                                if (!image) return null;

                                return (
                                  <div key={imageId} className="border border-gray-300 rounded-lg overflow-hidden">
                                    <div className="bg-gray-100 p-2 text-sm font-medium text-gray-700">
                                      {sectionId.replace(/_/g, ' ')} - {image.imageName}
                                    </div>
                                    <div className="relative">
                                      <img src={image.imageUrl} alt={image.imageName} className="w-full" />
                                      {/* Draw dots */}
                                      <svg
                                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                        style={{ position: 'absolute', top: 0, left: 0 }}
                                      >
                                        {locations.map((loc, idx) => (
                                          <g key={idx}>
                                            {/* White fill circle */}
                                            <circle
                                              cx={`${loc.x}%`}
                                              cy={`${loc.y}%`}
                                              r="12"
                                              fill="white"
                                              stroke="black"
                                              strokeWidth="2.5"
                                            />
                                            {/* Dot number */}
                                            <text
                                              x={`${loc.x}%`}
                                              y={`${loc.y}%`}
                                              textAnchor="middle"
                                              dominantBaseline="central"
                                              fontSize="14"
                                              fontWeight="bold"
                                              fill="black"
                                            >
                                              {loc.dotNumber}
                                            </text>
                                          </g>
                                        ))}
                                      </svg>
                                    </div>
                                  </div>
                                );
                              });
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sections */}
                    {Object.entries(selectedInspection.sections).map(([sectionId, sectionData]) => {
                      const defectCount = countDefects(sectionData.results);
                      const itemCount = Object.keys(sectionData.results).length;
                      const isCollapsed = collapsedSections.has(sectionId);

                      // Sort items: defects first, then OK items
                      const sortedItems = Object.entries(sectionData.results).sort(([, a], [, b]) => {
                        const aIsDefect = a.defectType !== 'Ok';
                        const bIsDefect = b.defectType !== 'Ok';
                        if (aIsDefect && !bIsDefect) return -1;
                        if (!aIsDefect && bIsDefect) return 1;
                        return 0;
                      });

                      return (
                        <div key={sectionId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          {/* Section Header - Clickable to collapse/expand */}
                          <div
                            className="bg-gray-50 p-3 md:p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleSection(sectionId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button className="text-gray-600 hover:text-gray-900 transition-colors">
                                  {isCollapsed ? '▶' : '▼'}
                                </button>
                                <div>
                                  <h4 className="font-semibold text-gray-900 capitalize">
                                    {sectionId.replace(/_/g, ' ')}
                                  </h4>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Inspector: {sectionData.inspectorName || sectionData.inspector || '-'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(sectionData.status)}`}>
                                  {sectionData.status}
                                </span>
                                <div className="text-sm text-gray-600 mt-1">
                                  {defectCount > 0 && (
                                    <span className="text-red-600 font-bold">{defectCount} defect{defectCount !== 1 ? 's' : ''}</span>
                                  )}
                                  {defectCount > 0 && ' / '}
                                  {itemCount} items
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section Items - Hidden when collapsed */}
                          {!isCollapsed && sectionData.status !== 'not_started' && (
                            <div className="p-4">
                              {Object.keys(sectionData.results).length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No items checked yet</p>
                              ) : (
                                <div className="space-y-3">
                                  {sortedItems.map(([itemName, result]) => {
                                    const defectKey = `${sectionId}_${itemName}_main`;
                                    const isResolved = result.status === 'Resolved';
                                    const isDefect = result.defectType !== 'Ok';

                                    return (
                                      <div key={itemName} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="font-medium text-gray-900">{itemName}</div>
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDefectColor(result.defectType)}`}>
                                              {result.defectType}
                                            </span>
                                            {isResolved && (
                                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                ✓ Resolved
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Resolution status */}
                                        {isResolved && result.resolvedBy && result.resolvedAt && (
                                          <div className="text-xs text-green-700 mb-2 bg-green-50 p-2 rounded border border-green-200">
                                            <div>✓ Resolved by {result.resolvedBy} at {formatTimestamp(result.resolvedAt)}</div>
                                            {result.resolutionNote && (
                                              <div className="mt-1 text-green-800">
                                                <strong>Note:</strong> {result.resolutionNote}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Mark as resolved button */}
                                        {isDefect && !isResolved && authenticatedUser && (
                                          <div className="mb-2">
                                            <button
                                              onClick={() => handleMarkAsResolved(sectionId, itemName)}
                                              disabled={resolvingDefect === defectKey}
                                              className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {resolvingDefect === defectKey ? '⏳ Marking...' : '✓ Mark as Resolved'}
                                            </button>
                                          </div>
                                        )}

                                        {/* Main defect notes */}
                                        {result.notes && (
                                          <div className="text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded">
                                            📝 {result.notes}
                                          </div>
                                        )}

                                        {/* Defect location */}
                                        {result.defectLocation && (
                                          <div className="text-xs text-gray-600 mb-2">
                                            📍 Location marked on image (Dot #{result.defectLocation.dotNumber})
                                          </div>
                                        )}

                                      {/* Photos */}
                                      {result.photoUrls && result.photoUrls.length > 0 && (
                                        <div className="flex gap-2 flex-wrap mb-2">
                                          {result.photoUrls.map((url, idx) => (
                                            <a
                                              key={idx}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-block"
                                            >
                                              <img
                                                src={url}
                                                alt={`Defect ${idx + 1}`}
                                                className="h-20 w-20 object-cover rounded border border-gray-300 hover:opacity-75 transition-opacity"
                                              />
                                            </a>
                                          ))}
                                        </div>
                                      )}

                                        {/* Additional defects */}
                                        {result.additionalDefects && result.additionalDefects.length > 0 && (
                                          <div className="mt-2 pl-4 border-l-2 border-orange-300 space-y-2">
                                            <div className="text-xs font-semibold text-orange-700">
                                              Additional Defects:
                                            </div>
                                            {result.additionalDefects.map((additional, idx) => {
                                              const additionalDefectKey = `${sectionId}_${itemName}_${idx}`;
                                              const isAdditionalResolved = additional.status === 'Resolved';

                                              return (
                                                <div key={idx} className="text-sm bg-orange-50 p-2 rounded border border-orange-200">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-orange-900">
                                                      {additional.defectType}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      {additional.defectLocation && (
                                                        <span className="text-xs text-orange-700">
                                                          Dot #{additional.defectLocation.dotNumber}
                                                        </span>
                                                      )}
                                                      {isAdditionalResolved && (
                                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                          ✓ Resolved
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* Resolution status for additional defect */}
                                                  {isAdditionalResolved && additional.resolvedBy && additional.resolvedAt && (
                                                    <div className="text-xs text-green-700 mb-1 bg-green-50 p-2 rounded border border-green-200">
                                                      <div>✓ Resolved by {additional.resolvedBy} at {formatTimestamp(additional.resolvedAt)}</div>
                                                      {additional.resolutionNote && (
                                                        <div className="mt-1 text-green-800">
                                                          <strong>Note:</strong> {additional.resolutionNote}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* Mark as resolved button for additional defect */}
                                                  {!isAdditionalResolved && authenticatedUser && (
                                                    <div className="mb-1">
                                                      <button
                                                        onClick={() => handleMarkAsResolved(sectionId, itemName, idx)}
                                                        disabled={resolvingDefect === additionalDefectKey}
                                                        className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                      >
                                                        {resolvingDefect === additionalDefectKey ? '⏳ Marking...' : '✓ Mark as Resolved'}
                                                      </button>
                                                    </div>
                                                  )}

                                                  {additional.notes && (
                                                    <div className="text-xs text-orange-800 mt-1">
                                                      📝 {additional.notes}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* Metadata */}
                                        <div className="text-xs text-gray-500 mt-2">
                                          Checked by {result.checkedBy} at {formatTimestamp(result.checkedAt || null)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Select a gate to view inspection results</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
              {!isLoading && !error && (
                <>Total: {inspections.length} gate inspection{inspections.length !== 1 ? 's' : ''}</>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 md:py-2 text-base md:text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Resolve Dialog */}
      {showResolveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Mark Defect as Resolved
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add a note about how this defect was resolved (optional):
            </p>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="e.g., Replaced the part, Fixed alignment, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={4}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowResolveDialog(false);
                  setResolveDialogData(null);
                  setResolutionNote('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={performResolve}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              >
                ✓ Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
