// Add Extra Defect Modal - Multi-step wizard for adding additional defects
import React, { useState } from 'react';
import type {
  DefectLocation,
  SectionImage,
  InspectionItem,
  InspectionTemplate,
  InspectionSection,
} from '../../../types/inspection';
import { DefectLocationMarker } from './DefectLocationMarker';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText, getLocalizedTextSafe } from '../../../utils/multilingualHelper';

interface AddExtraDefectModalProps {
  section: InspectionSection;
  template: InspectionTemplate;
  sectionImages?: SectionImage[];
  nextDotNumber: number;
  onSave: (data: {
    itemName: string;
    defectType: string;
    defectLocation?: DefectLocation;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

type Step = 'location' | 'item' | 'defectType';

export const AddExtraDefectModal: React.FC<AddExtraDefectModalProps> = ({
  section,
  template,
  sectionImages,
  nextDotNumber,
  onSave,
  onCancel,
}) => {
  const { currentLanguage, t } = useLanguage();
  const langCode = currentLanguage as 'en' | 'ms' | 'zh' | 'my' | 'bn';

  const hasImages = sectionImages && sectionImages.length > 0;

  // State
  const [currentStep, setCurrentStep] = useState<Step>(hasImages ? 'location' : 'item');
  const [selectedLocation, setSelectedLocation] = useState<DefectLocation | undefined>();
  const [selectedItemKey, setSelectedItemKey] = useState<string>('');
  const [selectedItemDisplayName, setSelectedItemDisplayName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const sectionTemplate = template.sections[section];
  const items = sectionTemplate?.items || [];

  // Get defect types (use template-level defect types)
  const defectTypes = template.defectTypes || [];

  // Step 1: Location marking (only if images exist)
  const handleLocationSet = (location: DefectLocation) => {
    setSelectedLocation(location);
    setCurrentStep('item');
  };

  const handleLocationCancel = () => {
    onCancel();
  };

  // Step 2: Item selection
  const handleItemSelect = (itemKey: string, itemDisplayName: string) => {
    setSelectedItemKey(itemKey);
    setSelectedItemDisplayName(itemDisplayName);
    setCurrentStep('defectType');
  };

  // Step 3: Defect type selection
  const handleDefectTypeSelect = (defectType: string) => {
    // Auto-save when defect type is selected
    onSave({
      itemName: selectedItemKey,
      defectType,
      defectLocation: selectedLocation,
      notes: notes || undefined,
    });
  };

  const handleBack = () => {
    if (currentStep === 'defectType') {
      setCurrentStep('item');
    } else if (currentStep === 'item') {
      if (hasImages) {
        setCurrentStep('location');
      } else {
        onCancel();
      }
    }
  };

  const getDefectButtonColor = (defectType: string) => {
    switch (defectType) {
      case 'Scratches':
        return 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600';
      case 'Dent':
        return 'bg-red-500 text-white border-red-600 hover:bg-red-600';
      case 'Paint Defect':
        return 'bg-purple-500 text-white border-purple-600 hover:bg-purple-600';
      case 'Not installed properly':
        return 'bg-red-600 text-white border-red-700 hover:bg-red-700';
      case 'Gap':
        return 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600';
      default:
        return 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600';
    }
  };

  // Render step content
  const renderStepContent = () => {
    // Step 1: Location marking
    if (currentStep === 'location' && hasImages) {
      return (
        <DefectLocationMarker
          images={sectionImages!}
          dotNumber={nextDotNumber}
          itemName="Additional Defect"
          defectType="Additional"
          onLocationSet={handleLocationSet}
          onCancel={handleLocationCancel}
        />
      );
    }

    // Step 2: Item selection
    if (currentStep === 'item') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('qa.markExtraIssues') || 'Mark Extra Issues'}
              </h2>
              <p className="text-gray-600 mt-2">
                {hasImages
                  ? t('qa.selectRelatedItem') || 'Which item does this defect relate to?'
                  : 'Select an item from the checklist'}
              </p>
              {selectedLocation && (
                <div className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                  ✓ Location marked (Dot #{nextDotNumber})
                </div>
              )}
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {items.map((item: InspectionItem) => {
                  const itemKey = getLocalizedText(item.itemName, 'en');
                  const itemDisplayName = getLocalizedTextSafe(item.itemName, langCode, template);

                  return (
                    <button
                      key={itemKey}
                      onClick={() => handleItemSelect(itemKey, itemDisplayName)}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-gray-500 w-8">
                          {item.itemNumber}
                        </div>
                        <div className="font-medium text-gray-900">{itemDisplayName}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ← Back
              </button>
              <button
                onClick={onCancel}
                className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Step 3: Defect type selection
    if (currentStep === 'defectType') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('qa.markExtraIssues') || 'Mark Extra Issues'}
              </h2>
              <p className="text-gray-600 mt-2">
                {t('qa.selectDefectType') || 'What type of defect is this?'}
              </p>
              <div className="mt-2 space-y-1">
                {selectedLocation && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    ✓ Location marked (Dot #{nextDotNumber})
                  </div>
                )}
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  ✓ Item: {selectedItemDisplayName}
                </div>
              </div>
            </div>

            {/* Defect Type Selection */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3">
                {defectTypes.map((defectType) => {
                  const defectKey = getLocalizedText(defectType, 'en');
                  const defectLabel = getLocalizedTextSafe(defectType, langCode, template);
                  return (
                    <button
                      key={defectKey}
                      onClick={() => handleDefectTypeSelect(defectKey)}
                      className={`px-6 py-4 border-2 rounded-lg font-medium transition-all ${getDefectButtonColor(
                        defectKey
                      )}`}
                    >
                      {defectLabel}
                    </button>
                  );
                })}
              </div>

              {/* Optional Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('qa.addNotes') || 'Add Notes'} (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('qa.addNotes') || 'Add any additional notes...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ← Back
              </button>
              <button
                onClick={onCancel}
                className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return <>{renderStepContent()}</>;
};
