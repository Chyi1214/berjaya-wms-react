// Car Inspection View - Shows 4 inspection sections for a car
import React, { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type {
  CarInspection,
  InspectionSection,
  InspectionTemplate,
  InspectionSummary,
} from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';

const logger = createModuleLogger('CarInspectionView');

interface CarInspectionViewProps {
  inspectionId: string;
  vin: string;
  userEmail: string;
  userName: string;
  onSelectSection: (section: InspectionSection) => void;
  onBack: () => void;
}

const CarInspectionView: React.FC<CarInspectionViewProps> = ({
  inspectionId,
  vin,
  userEmail: _userEmail,
  userName: _userName,
  onSelectSection,
  onBack,
}) => {
  const [inspection, setInspection] = useState<CarInspection | null>(null);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [summary, setSummary] = useState<InspectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let templateUnsubscribe: (() => void) | null = null;

    // Initialize and subscribe to template
    const initializeAndSubscribe = async () => {
      try {
        const insp = await inspectionService.getInspectionById(inspectionId);
        if (!insp) {
          setError('Inspection not found');
          setLoading(false);
          return;
        }

        // Subscribe to real-time template updates
        templateUnsubscribe = inspectionService.subscribeToTemplate(
          insp.templateId,
          (templ) => {
            if (!templ) {
              setError('Inspection template not found');
              setLoading(false);
              return;
            }
            setTemplate(templ);
          },
          (err) => {
            logger.error('Template subscription error:', err);
            setError('Failed to load template updates');
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error('Failed to load template:', err);
        setError('Failed to load inspection template');
        setLoading(false);
      }
    };

    initializeAndSubscribe();

    // Subscribe to real-time inspection updates
    const inspectionUnsubscribe = inspectionService.subscribeToInspection(
      inspectionId,
      (insp) => {
        if (!insp) {
          setError('Inspection not found');
          setLoading(false);
          return;
        }

        setInspection(insp);
        setSummary(inspectionService.getInspectionSummary(insp));
        setError(null);
        setLoading(false);
      },
      (err) => {
        logger.error('Inspection subscription error:', err);
        setError('Failed to load inspection updates');
        setLoading(false);
      }
    );

    // Clean up subscriptions on unmount
    return () => {
      inspectionUnsubscribe();
      if (templateUnsubscribe) {
        templateUnsubscribe();
      }
    };
  }, [inspectionId]);

  const getSectionIcon = (section: InspectionSection) => {
    switch (section) {
      case 'right_outside':
        return '🚗';
      case 'left_outside':
        return '🚙';
      case 'front_back':
        return '🚕';
      case 'interior_right':
        return '🪟';
      case 'interior_left':
        return '🪟';
      default:
        return '📋';
    }
  };

  const getSectionStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSectionStatusText = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading inspection...</div>
        </div>
      </div>
    );
  }

  if (error || !inspection || !template) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <div className="text-red-800 font-medium">{error || 'Inspection not found'}</div>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const sectionEntries: [InspectionSection, string][] = [
    ['right_outside', 'Right Outside'],
    ['left_outside', 'Left Outside'],
    ['front_back', 'Front & Back'],
    ['interior_right', 'Interior Right'],
    ['interior_left', 'Interior Left'],
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Inspection: {vin}
            </h1>
            <p className="text-gray-600 mt-1">
              Select an inspection area to begin or continue
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-medium ${
              inspection.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {inspection.status === 'completed' ? '✅ Complete' : '🔍 In Progress'}
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Overall Progress
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {summary.completedSections}/{summary.totalSections}
              </div>
              <div className="text-sm text-gray-600">Sections Complete</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">
                {summary.totalDefects}
              </div>
              <div className="text-sm text-gray-600">Total Defects</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {summary.inspectors.length}
              </div>
              <div className="text-sm text-gray-600">Inspectors</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{
                  width: `${(summary.completedSections / summary.totalSections) * 100}%`,
                }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 text-center">
              {Math.round((summary.completedSections / summary.totalSections) * 100)}% Complete
            </div>
          </div>
        </div>
      )}

      {/* Inspection Sections */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Inspection Sections
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionEntries.map(([sectionId, sectionName]) => {
            const section = inspection.sections[sectionId];
            const sectionTemplate = template.sections[sectionId];
            const totalItems = sectionTemplate.items.length;
            const completedItems = Object.keys(section.results).length;
            const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            return (
              <div
                key={sectionId}
                onClick={() => onSelectSection(sectionId)}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${getSectionStatusColor(
                  section.status
                )}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getSectionIcon(sectionId)}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{sectionName}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {totalItems} inspection points
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {getSectionStatusText(section.status)}
                  </div>
                </div>

                {section.status !== 'not_started' && (
                  <>
                    <div className="mb-3">
                      <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {completedItems}/{totalItems} items checked
                      </div>
                    </div>

                    {section.inspector && (
                      <div className="text-sm text-gray-700">
                        <strong>Inspector:</strong>{' '}
                        {section.inspectorName || section.inspector}
                      </div>
                    )}

                    {section.completedAt && (
                      <div className="mt-1 text-xs text-gray-600">
                        Completed: {new Date(section.completedAt).toLocaleString()}
                      </div>
                    )}
                  </>
                )}

                {section.status === 'not_started' && (
                  <div className="text-sm text-gray-600">
                    Click to start inspection
                  </div>
                )}

                <div className="mt-4 text-right text-blue-600 font-medium">
                  {section.status === 'completed' ? 'View Details →' : 'Start Inspection →'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Defect Summary (if any defects found) */}
      {summary && summary.totalDefects > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Defects Found</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(summary.defectsByType).map(([defectType, count]) => {
              if (defectType === 'Ok' || count === 0) return null;
              return (
                <div key={defectType} className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{count}</div>
                  <div className="text-sm text-gray-700">{defectType}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Worker Assignment</h3>
        <p className="text-sm text-blue-800">
          This inspection requires 4 QA workers, each responsible for one section.
          Workers can inspect sections in parallel. Select your assigned section to begin.
        </p>
      </div>
    </div>
  );
};

export default CarInspectionView;
