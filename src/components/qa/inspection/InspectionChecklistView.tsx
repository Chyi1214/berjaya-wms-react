// Inspection Checklist View - Worker interface for inspecting a section
import React, { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type {
  CarInspection,
  InspectionSection,
  InspectionTemplate,
  DefectType,
  InspectionItem,
} from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText, getLocalizedTextSafe } from '../../../utils/multilingualHelper';

const logger = createModuleLogger('InspectionChecklistView');

// Sanitize field names for Firestore (replace invalid characters)
// Firestore field names cannot contain: / $ # [ ] * ~ .
function sanitizeFieldName(name: string | any): string {
  if (typeof name === 'object' && name && 'en' in name) {
    // If multilingual, sanitize the English version as the key
    return (name as any).en.replace(/[~/\*\[\]\$\#\.]/g, '_');
  }
  if (typeof name === 'string') {
    return name.replace(/[~/\*\[\]\$\#\.]/g, '_');
  }
  return String(name).replace(/[~/\*\[\]\$\#\.]/g, '_');
}

interface InspectionChecklistViewProps {
  inspectionId: string;
  section: InspectionSection;
  userEmail: string;
  userName: string;
  onBack: () => void;
  onComplete: () => void;
}

const InspectionChecklistView: React.FC<InspectionChecklistViewProps> = ({
  inspectionId,
  section,
  userEmail,
  userName,
  onBack,
  onComplete,
}) => {
  const { currentLanguage, t } = useLanguage();
  const [inspection, setInspection] = useState<CarInspection | null>(null);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Map language context to multilingual helper language code
  const langCode = currentLanguage as 'en' | 'ms' | 'zh' | 'my' | 'bn';

  useEffect(() => {
    let templateUnsubscribe: (() => void) | null = null;

    // First, get the inspection to find out which template to use
    const initializeAndSubscribe = async () => {
      try {
        const insp = await inspectionService.getInspectionById(inspectionId);
        if (!insp) {
          setError('Inspection not found');
          setLoading(false);
          return;
        }

        // Start section if needed
        if (insp.sections[section].status === 'not_started') {
          await inspectionService.startSection(inspectionId, section, userEmail, userName);
        }

        // Subscribe to real-time template updates
        templateUnsubscribe = inspectionService.subscribeToTemplate(
          insp.templateId,
          (templ) => {
            if (!templ) {
              setError('Template not found');
              setLoading(false);
              return;
            }
            setTemplate(templ);
            setLoading(false);
          },
          (err) => {
            logger.error('Template subscription error:', err);
            setError('Failed to load template updates');
            setLoading(false);
          }
        );
      } catch (err) {
        logger.error('Failed to initialize:', err);
        setError('Failed to load inspection');
        setLoading(false);
      }
    };

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
        setError(null);
      },
      (err) => {
        logger.error('Inspection subscription error:', err);
        setError('Failed to load inspection updates');
        setLoading(false);
      }
    );

    // Initialize
    initializeAndSubscribe();

    // Cleanup subscriptions
    return () => {
      inspectionUnsubscribe();
      if (templateUnsubscribe) {
        templateUnsubscribe();
      }
    };
  }, [inspectionId, section, userEmail, userName]);

  const handleDefectSelect = async (itemName: string, defectType: DefectType) => {
    if (!inspection) return;

    try {
      setSaving(true);
      await inspectionService.recordDefect(inspectionId, section, itemName, {
        defectType,
        notes: notes[itemName] || undefined,
        checkedBy: userEmail,
      });

      const updated = await inspectionService.getInspectionById(inspectionId);
      if (updated) {
        setInspection(updated);
      } else {
        setError('Failed to reload inspection after save');
      }

      logger.info('Defect recorded:', { itemName, defectType });
    } catch (err) {
      logger.error('Failed to record defect:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSection = async () => {
    if (!inspection || !template) return;

    const sectionTemplate = template.sections[section];
    const sectionResult = inspection.sections[section];
    const totalItems = sectionTemplate.items.length;
    const checkedItems = Object.keys(sectionResult.results).length;

    if (checkedItems < totalItems) {
      const confirm = window.confirm(
        `You have only checked ${checkedItems} out of ${totalItems} items. Are you sure you want to complete this section?`
      );
      if (!confirm) return;
    }

    try {
      setSaving(true);
      await inspectionService.completeSection(inspectionId, section);
      onComplete();
    } catch (err) {
      logger.error('Failed to complete section:', err);
      setError('Failed to complete section. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading checklist...</div>
        </div>
      </div>
    );
  }

  if (error || !inspection || !template) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <div className="text-red-800 font-medium">{error || 'Data not found'}</div>
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

  const sectionTemplate = template.sections[section];
  const sectionResult = inspection.sections[section];

  if (!sectionTemplate || !sectionTemplate.items || !Array.isArray(sectionTemplate.items)) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <div className="text-red-800 font-medium">
            Section template not found for: {section}
          </div>
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

  const items = sectionTemplate.items;
  const totalItems = items.length;
  const checkedItems = Object.keys(sectionResult.results).length;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  const getDefectButtonColor = (defectType: string, isSelected: boolean) => {
    if (!isSelected) {
      return 'bg-gray-100 text-gray-700 border-gray-300';
    }

    switch (defectType) {
      case 'Ok':
        return 'bg-green-500 text-white border-green-600';
      case 'Scratches':
        return 'bg-orange-500 text-white border-orange-600';
      case 'Dent':
        return 'bg-red-500 text-white border-red-600';
      case 'Paint Defect':
        return 'bg-purple-500 text-white border-purple-600';
      case 'Not installed properly':
        return 'bg-red-600 text-white border-red-700';
      case 'Gap':
        return 'bg-yellow-500 text-white border-yellow-600';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 sticky top-16 z-10">
          <button
            onClick={onBack}
            className="mb-3 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {getLocalizedTextSafe(sectionTemplate.sectionName, langCode, template)}
              </h1>
              <p className="text-sm text-gray-600">{t('qa.vin')}: {inspection.vin}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600">{t('qa.progress')}</div>
              <div className="text-2xl font-bold text-blue-600">
                {checkedItems}/{totalItems}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          {items.map((item: InspectionItem) => {
            const itemName = getLocalizedTextSafe(item.itemName, langCode, template);
            const itemKey = getLocalizedText(item.itemName, 'en'); // Use English as key
            const sanitizedItemName = sanitizeFieldName(itemKey);
            const result = sectionResult.results[sanitizedItemName];
            const isChecked = !!result;
            const isExpanded = selectedItem === itemKey;

            // Get defect types for this item (use custom if available, otherwise defaults)
            const itemDefectTypes = item.defectTypes && item.defectTypes.length > 0
              ? item.defectTypes
              : template.defectTypes || [];

            return (
              <div
                key={itemKey}
                className={`bg-white rounded-lg shadow transition-all ${
                  isChecked ? 'border-2 border-green-300' : 'border-2 border-gray-200'
                }`}
              >
                <div
                  onClick={() =>
                    setSelectedItem(isExpanded ? null : itemKey)
                  }
                  className="p-4 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-gray-500 w-8">
                        {item.itemNumber}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {itemName}
                        </div>
                        {isChecked && (
                          <div className="text-sm text-gray-600 mt-1">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                result.defectType === 'Ok'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {result.defectType}
                            </span>
                            {result.notes && (
                              <span className="ml-2 text-gray-500">
                                "{result.notes}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isChecked && (
                        <div className="text-green-600 text-xl">✓</div>
                      )}
                      <div className="text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('qa.selectDefectType')}:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {itemDefectTypes.map((defectType) => {
                          const defectKey = getLocalizedText(defectType, 'en');
                          const defectLabel = getLocalizedTextSafe(defectType, langCode, template);
                          const isSelected = result?.defectType === defectKey;
                          return (
                            <button
                              key={defectKey}
                              onClick={() =>
                                handleDefectSelect(itemKey, defectKey)
                              }
                              disabled={saving}
                              className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${getDefectButtonColor(
                                defectKey,
                                isSelected
                              )} ${
                                saving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                              }`}
                            >
                              {defectLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {result && result.defectType !== 'Ok' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('qa.addNotes')}:
                        </label>
                        <textarea
                          value={notes[itemKey] || result.notes || ''}
                          onChange={(e) =>
                            setNotes({ ...notes, [itemKey]: e.target.value })
                          }
                          onBlur={() => {
                            if (notes[itemKey] !== result.notes) {
                              handleDefectSelect(itemKey, result.defectType);
                            }
                          }}
                          placeholder={t('qa.addNotes')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Complete Button - Normal button at the bottom */}
        <div className="mt-6">
          <button
            onClick={handleCompleteSection}
            disabled={saving || sectionResult.status === 'completed'}
            className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg shadow-lg"
          >
            {sectionResult.status === 'completed'
              ? `✓ ${t('qa.status.completed')}`
              : `${t('qa.completeSection')} (${checkedItems}/${totalItems})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspectionChecklistView;
