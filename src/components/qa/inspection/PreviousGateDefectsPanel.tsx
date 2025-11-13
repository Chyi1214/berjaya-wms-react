// Previous Gate Defects Panel - Shows read-only inspection results from earlier gates
import { useState } from 'react';
import type { CarInspection, InspectionItemResult, InspectionTemplate, DefectLocation } from '../../../types/inspection';

interface PreviousGateDefectsPanelProps {
  previousInspections: CarInspection[];
  currentSectionId?: string; // Optional: highlight defects from same section
  template?: InspectionTemplate; // Template to get section images
}

export function PreviousGateDefectsPanel({
  previousInspections,
  currentSectionId,
  template
}: PreviousGateDefectsPanelProps) {
  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    imageUrl: string;
    imageName: string;
    locations: DefectLocation[];
  } | null>(null);

  // Toggle gate expansion
  const toggleGate = (inspectionId: string) => {
    setExpandedGates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inspectionId)) {
        newSet.delete(inspectionId);
      } else {
        newSet.add(inspectionId);
      }
      return newSet;
    });
  };

  // Toggle section expansion
  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Count defects in results
  const countDefects = (results: Record<string, InspectionItemResult>): number => {
    let count = 0;
    Object.values(results).forEach(result => {
      if (result.defectType !== 'Ok') {
        count++;
      }
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Collect defect locations from a section
  const collectDefectLocations = (inspection: CarInspection, sectionId: string): DefectLocation[] => {
    const locations: DefectLocation[] = [];
    const section = inspection.sections[sectionId];

    if (!section) return locations;

    Object.values(section.results).forEach(result => {
      if (result.defectLocation) {
        locations.push(result.defectLocation);
      }
      if (result.additionalDefects) {
        result.additionalDefects.forEach(additionalDefect => {
          if (additionalDefect.defectLocation) {
            locations.push(additionalDefect.defectLocation);
          }
        });
      }
    });

    return locations;
  };

  // Show defect locations on image
  const handleViewLocations = (inspection: CarInspection, sectionId: string) => {
    if (!template) return;

    const sectionTemplate = template.sections[sectionId];
    if (!sectionTemplate?.images || sectionTemplate.images.length === 0) return;

    const locations = collectDefectLocations(inspection, sectionId);
    if (locations.length === 0) return;

    // Use the first image for now (could be enhanced to show all images)
    const firstImage = sectionTemplate.images[0];
    setSelectedImage({
      imageUrl: firstImage.imageUrl,
      imageName: firstImage.imageName,
      locations,
    });
    setShowImageModal(true);
  };

  if (previousInspections.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xl">🔒</div>
        <div>
          <h3 className="font-bold text-gray-700">Previous Gate Inspections</h3>
          <p className="text-sm text-gray-600">
            Read-only results from earlier quality gates ({previousInspections.length} gate{previousInspections.length !== 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {/* Previous Inspections */}
      <div className="space-y-3">
        {previousInspections.map((inspection) => {
          const isExpanded = expandedGates.has(inspection.inspectionId);
          const totalDefects = Object.values(inspection.sections).reduce(
            (sum, section) => sum + countDefects(section.results),
            0
          );

          return (
            <div
              key={inspection.inspectionId}
              className="bg-white border border-gray-300 rounded-lg overflow-hidden"
            >
              {/* Gate Header */}
              <div
                onClick={() => toggleGate(inspection.inspectionId)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <button className="text-gray-600">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {inspection.gateName || `Gate ${inspection.gateIndex}`}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        Gate {inspection.gateIndex}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Inspected: {formatTimestamp(inspection.completedAt || inspection.startedAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-700">
                    {totalDefects} defect{totalDefects !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Object.values(inspection.sections).filter(s => s.status === 'completed').length}/
                    {Object.keys(inspection.sections).length} sections
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-3">
                  <div className="space-y-2">
                    {Object.entries(inspection.sections).map(([sectionId, sectionData]) => {
                      const sectionKey = `${inspection.inspectionId}_${sectionId}`;
                      const isSectionExpanded = expandedSections.has(sectionKey);
                      const sectionDefects = countDefects(sectionData.results);

                      // Highlight if this is the current section worker is viewing
                      const isCurrentSection = currentSectionId === sectionId;

                      if (sectionData.status === 'not_started') {
                        return null; // Don't show sections that weren't inspected
                      }

                      return (
                        <div
                          key={sectionId}
                          className={`bg-white border rounded-lg overflow-hidden ${
                            isCurrentSection ? 'border-blue-400 shadow-sm' : 'border-gray-300'
                          }`}
                        >
                          {/* Section Header */}
                          <div
                            onClick={() => toggleSection(sectionKey)}
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <button className="text-gray-500 text-sm">
                                {isSectionExpanded ? '▼' : '▶'}
                              </button>
                              <div>
                                <div className="font-medium text-gray-800 text-sm capitalize flex items-center gap-2">
                                  {sectionId.replace(/_/g, ' ')}
                                  {isCurrentSection && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {sectionData.inspectorName || sectionData.inspector}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-600">
                                {sectionDefects > 0 ? (
                                  <span className="font-semibold text-red-600">
                                    {sectionDefects} defect{sectionDefects !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-green-600 font-medium">No defects</span>
                                )}
                              </div>
                              {template && sectionDefects > 0 && collectDefectLocations(inspection, sectionId).length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewLocations(inspection, sectionId);
                                  }}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                  title="View defect locations on image"
                                >
                                  📍 View Locations
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Section Items */}
                          {isSectionExpanded && (
                            <div className="border-t border-gray-200 p-2 bg-gray-50">
                              <div className="space-y-2">
                                {Object.entries(sectionData.results)
                                  .filter(([, result]) => result.defectType !== 'Ok') // Only show defects
                                  .map(([itemName, result]) => (
                                    <div
                                      key={itemName}
                                      className="bg-white border border-gray-200 rounded p-2 text-sm"
                                    >
                                      <div className="flex items-start justify-between mb-1">
                                        <div className="font-medium text-gray-800">
                                          {itemName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                            {result.defectType}
                                          </span>
                                          {result.status === 'Resolved' && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                              ✓ Fixed
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Notes */}
                                      {result.notes && (
                                        <div className="text-xs text-gray-700 bg-gray-50 p-1.5 rounded mb-1">
                                          📝 {result.notes}
                                        </div>
                                      )}

                                      {/* Defect Location */}
                                      {result.defectLocation && (
                                        <div className="text-xs text-gray-600 mb-1">
                                          📍 Marked at position (Dot #{result.defectLocation.dotNumber})
                                        </div>
                                      )}

                                      {/* Photos */}
                                      {result.photoUrls && result.photoUrls.length > 0 && (
                                        <div className="flex gap-1 flex-wrap mb-1">
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
                                                className="h-16 w-16 object-cover rounded border border-gray-300 hover:opacity-75 transition-opacity"
                                              />
                                            </a>
                                          ))}
                                        </div>
                                      )}

                                      {/* Additional Defects */}
                                      {result.additionalDefects && result.additionalDefects.length > 0 && (
                                        <div className="mt-1 pl-2 border-l-2 border-orange-300 space-y-1">
                                          <div className="text-xs font-semibold text-orange-700">
                                            + {result.additionalDefects.length} more defect{result.additionalDefects.length !== 1 ? 's' : ''}
                                          </div>
                                          {result.additionalDefects.map((additional, idx) => (
                                            <div key={idx} className="text-xs bg-orange-50 p-1.5 rounded border border-orange-200">
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium text-orange-900">
                                                  {additional.defectType}
                                                </span>
                                                {additional.status === 'Resolved' && (
                                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                    ✓ Fixed
                                                  </span>
                                                )}
                                              </div>
                                              {additional.notes && (
                                                <div className="text-xs text-orange-800 mt-0.5">
                                                  📝 {additional.notes}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Metadata */}
                                      <div className="text-xs text-gray-500 mt-1">
                                        Checked by {result.checkedBy} at {formatTimestamp(result.checkedAt || null)}
                                      </div>
                                    </div>
                                  ))}
                                {Object.values(sectionData.results).every(r => r.defectType === 'Ok') && (
                                  <div className="text-center text-sm text-green-600 py-2">
                                    ✓ No defects found in this section
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        <strong>ℹ️ Note:</strong> These defects were found by previous gates. You can add new defects but cannot modify or remove these entries.
      </div>

      {/* Image Modal - Show defect locations */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Defect Locations</h3>
                <p className="text-sm text-gray-600">{selectedImage.imageName}</p>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="relative inline-block">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.imageName}
                  className="max-w-full h-auto"
                />
                {/* Draw defect location dots */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  {selectedImage.locations.map((loc, idx) => (
                    <g key={idx}>
                      {/* White fill circle */}
                      <circle
                        cx={`${loc.x}%`}
                        cy={`${loc.y}%`}
                        r="16"
                        fill="white"
                        stroke="red"
                        strokeWidth="3"
                      />
                      {/* Dot number */}
                      <text
                        x={`${loc.x}%`}
                        y={`${loc.y}%`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="16"
                        fontWeight="bold"
                        fill="red"
                      >
                        {loc.dotNumber}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-700">
                  <strong>Legend:</strong> Red dots show where defects were marked by the previous gate inspector.
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
