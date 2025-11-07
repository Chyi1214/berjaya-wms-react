// Inspection Results Modal - View all gate inspection results for a car
import { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type { CarInspection, InspectionItemResult } from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';

const logger = createModuleLogger('InspectionResultsModal');

interface InspectionResultsModalProps {
  vin: string;
  onClose: () => void;
}

export function InspectionResultsModal({ vin, onClose }: InspectionResultsModalProps) {
  const [inspections, setInspections] = useState<CarInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGateIndex, setSelectedGateIndex] = useState<number>(0);

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
      }

      setInspections(data);
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

  const selectedInspection = inspections[selectedGateIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inspection Results</h2>
              <p className="text-sm text-gray-600 mt-1 font-mono">VIN: {vin}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
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
              {/* Left Sidebar - Gate Selection */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
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

              {/* Right Content - Inspection Details */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedInspection ? (
                  <div className="space-y-6">
                    {/* Inspection Overview */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
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

                    {/* Sections */}
                    {Object.entries(selectedInspection.sections).map(([sectionId, sectionData]) => {
                      const defectCount = countDefects(sectionData.results);
                      const itemCount = Object.keys(sectionData.results).length;

                      return (
                        <div key={sectionId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          {/* Section Header */}
                          <div className="bg-gray-50 p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 capitalize">
                                  {sectionId.replace(/_/g, ' ')}
                                </h4>
                                <div className="text-sm text-gray-600 mt-1">
                                  Inspector: {sectionData.inspectorName || sectionData.inspector || '-'}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(sectionData.status)}`}>
                                  {sectionData.status}
                                </span>
                                <div className="text-sm text-gray-600 mt-1">
                                  {defectCount} defect{defectCount !== 1 ? 's' : ''} / {itemCount} items
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section Items */}
                          {sectionData.status !== 'not_started' && (
                            <div className="p-4">
                              {Object.keys(sectionData.results).length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No items checked yet</p>
                              ) : (
                                <div className="space-y-3">
                                  {Object.entries(sectionData.results).map(([itemName, result]) => (
                                    <div key={itemName} className="border border-gray-200 rounded-lg p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="font-medium text-gray-900">{itemName}</div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDefectColor(result.defectType)}`}>
                                          {result.defectType}
                                        </span>
                                      </div>

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
                                          {result.additionalDefects.map((additional, idx) => (
                                            <div key={idx} className="text-sm bg-orange-50 p-2 rounded">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-orange-900">
                                                  {additional.defectType}
                                                </span>
                                                {additional.defectLocation && (
                                                  <span className="text-xs text-orange-700">
                                                    Dot #{additional.defectLocation.dotNumber}
                                                  </span>
                                                )}
                                              </div>
                                              {additional.notes && (
                                                <div className="text-xs text-orange-800 mt-1">
                                                  📝 {additional.notes}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Metadata */}
                                      <div className="text-xs text-gray-500 mt-2">
                                        Checked by {result.checkedBy} at {formatTimestamp(result.checkedAt || null)}
                                      </div>
                                    </div>
                                  ))}
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
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {!isLoading && !error && (
                <>Total: {inspections.length} gate inspection{inspections.length !== 1 ? 's' : ''}</>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
