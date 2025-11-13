// Inspection Checklist View - Worker interface for inspecting a section
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp } from '../../../services/costTracking/firestoreWrapper';
import { db } from '../../../services/firebase';
import { inspectionService } from '../../../services/inspectionService';
import { preloadImages } from '../../../services/imageCache';
import type {
  CarInspection,
  InspectionSection,
  InspectionTemplate,
  DefectType,
  InspectionItem,
  DefectLocation,
  InspectionItemResult,
} from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText, getLocalizedTextSafe } from '../../../utils/multilingualHelper';
import { DefectLocationMarker } from './DefectLocationMarker';
import { AddExtraDefectModal } from './AddExtraDefectModal';
import { PreviousGateDefectsPanel } from './PreviousGateDefectsPanel';

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
  const [showLocationMarker, setShowLocationMarker] = useState(false);
  const [pendingDefect, setPendingDefect] = useState<{
    itemName: string;
    defectType: DefectType;
    itemDisplayName: string;
  } | null>(null);
  const [nextDotNumber, setNextDotNumber] = useState(1);
  const [showExtraDefectModal, setShowExtraDefectModal] = useState(false);
  const [previousInspections, setPreviousInspections] = useState<CarInspection[]>([]);
  const [emailToNameMap, setEmailToNameMap] = useState<Map<string, string>>(new Map());
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationImage, setSelectedLocationImage] = useState<{
    imageUrl: string;
    imageName: string;
    locations: DefectLocation[];
  } | null>(null);

  // Map language context to multilingual helper language code
  const langCode = currentLanguage as 'en' | 'ms' | 'zh' | 'my' | 'bn';

  // Load previous gate inspections
  useEffect(() => {
    const loadPreviousInspections = async () => {
      if (!inspection || inspection.gateIndex === undefined) return;

      try {
        // Get all inspections for this VIN
        const allInspections = await inspectionService.getInspectionsByVIN(inspection.vin);

        // Filter for inspections from earlier gates (lower gateIndex)
        const currentGateIndex = inspection.gateIndex;
        const previous = allInspections.filter(
          insp =>
            insp.inspectionId !== inspection.inspectionId &&
            insp.gateIndex !== undefined &&
            insp.gateIndex < currentGateIndex
        );

        setPreviousInspections(previous);

        // Build email-to-name mapping from all previous inspections
        const nameMap = new Map<string, string>();
        for (const prevInsp of previous) {
          // Add mappings from each section
          Object.values(prevInsp.sections).forEach(section => {
            if (section.inspector && section.inspectorName) {
              nameMap.set(section.inspector, section.inspectorName);
            }
          });
        }
        setEmailToNameMap(nameMap);

        if (previous.length > 0) {
          logger.info('Loaded previous gate inspections:', {
            vin: inspection.vin,
            currentGate: inspection.gateIndex,
            previousGates: previous.map(i => ({ gateIndex: i.gateIndex, gateName: i.gateName })),
            inspectorMappings: nameMap.size
          });
        }
      } catch (err) {
        logger.error('Failed to load previous inspections:', err);
        // Don't show error to user - previous inspections are optional
      }
    };

    loadPreviousInspections();
  }, [inspection]);

  // Calculate next dot number based on existing defects in this section (including additional defects)
  useEffect(() => {
    if (!inspection) return;

    const sectionResult = inspection.sections[section];
    const allDotNumbers: number[] = [];

    // Collect dot numbers from main defects
    Object.values(sectionResult.results).forEach(result => {
      if (result.defectType !== 'Ok' && result.defectLocation) {
        allDotNumbers.push(result.defectLocation.dotNumber);
      }

      // Collect dot numbers from additional defects
      if (result.additionalDefects) {
        result.additionalDefects.forEach(additionalDefect => {
          if (additionalDefect.defectLocation) {
            allDotNumbers.push(additionalDefect.defectLocation.dotNumber);
          }
        });
      }
    });

    const maxDotNumber = allDotNumbers.length > 0 ? Math.max(...allDotNumbers) : 0;
    setNextDotNumber(maxDotNumber + 1);
  }, [inspection, section]);

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

  // Pre-load all template images when template is loaded
  useEffect(() => {
    if (!template) return;

    // Collect all image URLs from all sections
    const imageUrls: string[] = [];
    Object.values(template.sections).forEach(sectionTemplate => {
      if (sectionTemplate.images) {
        sectionTemplate.images.forEach(img => {
          if (img.imageUrl) {
            imageUrls.push(img.imageUrl);
          }
        });
      }
    });

    if (imageUrls.length > 0) {
      // Pre-load images in background (don't await)
      preloadImages(imageUrls).catch(err => {
        logger.warn('Failed to preload some images:', err);
      });
    }
  }, [template]);

  const handleDefectSelect = async (itemName: string, defectType: DefectType, itemDisplayName: string) => {
    if (!inspection || !template) return;

    const sectionTemplate = template.sections[section];

    // Find all items with the same display name (duplicates)
    const duplicateItems = sectionTemplate.items.filter(item => {
      const itemDisplayText = typeof item.itemName === 'string'
        ? item.itemName
        : getLocalizedTextSafe(item.itemName, langCode, template);
      return itemDisplayText === itemDisplayName;
    });

    // If defect is "Ok", no location needed - save immediately for all duplicates
    if (defectType === 'Ok') {
      try {
        setSaving(true);

        // Apply to all duplicate items
        for (const item of duplicateItems) {
          const key = sanitizeFieldName(item.itemName);
          await inspectionService.recordDefect(inspectionId, section, key, {
            defectType,
            notes: notes[key] || undefined,
            checkedBy: userEmail,
          });
        }

        const updated = await inspectionService.getInspectionById(inspectionId);
        if (updated) {
          setInspection(updated);
        } else {
          setError('Failed to reload inspection after save');
        }

        logger.info('OK recorded for all duplicates:', {
          itemDisplayName,
          count: duplicateItems.length,
          defectType
        });
      } catch (err) {
        logger.error('Failed to record defect:', err);
        setError('Failed to save. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // For actual defects, check if section has images
    const hasImages = sectionTemplate.images && sectionTemplate.images.length > 0;

    if (!hasImages) {
      // No images available - save defect without location
      try {
        setSaving(true);

        // Apply to all duplicate items
        for (const item of duplicateItems) {
          const key = sanitizeFieldName(item.itemName);
          await inspectionService.recordDefect(inspectionId, section, key, {
            defectType,
            notes: notes[key] || undefined,
            checkedBy: userEmail,
            // No defectLocation since there are no images
          });
        }

        const updated = await inspectionService.getInspectionById(inspectionId);
        if (updated) {
          setInspection(updated);
        } else {
          setError('Failed to reload inspection after save');
        }

        logger.info('Defect recorded without location (no images):', {
          itemDisplayName,
          count: duplicateItems.length,
          defectType
        });
      } catch (err) {
        logger.error('Failed to record defect:', err);
        setError('Failed to save. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Has images - proceed with location marking
    // If multiple duplicates, show confirmation
    if (duplicateItems.length > 1) {
      const confirm = window.confirm(
        `Found ${duplicateItems.length} items with name "${itemDisplayName}". Apply defect "${defectType}" to all of them?`
      );
      if (!confirm) {
        // Apply only to the selected item
        setPendingDefect({ itemName, defectType, itemDisplayName });
        setShowLocationMarker(true);
        return;
      }

      // User confirmed - mark all duplicates
      // For defects, we need to ask for location for the first one, then apply to all
      setPendingDefect({
        itemName: 'ALL_DUPLICATES',
        defectType,
        itemDisplayName,
      });
      setShowLocationMarker(true);
      return;
    }

    // Single item - show location marker for defects
    setPendingDefect({ itemName, defectType, itemDisplayName });
    setShowLocationMarker(true);
  };

  const handleLocationSet = async (location: DefectLocation) => {
    if (!inspection || !pendingDefect || !template) return;

    try {
      setSaving(true);
      setShowLocationMarker(false);

      // Check if applying to all duplicates
      if (pendingDefect.itemName === 'ALL_DUPLICATES') {
        const sectionTemplate = template.sections[section];
        const duplicateItems = sectionTemplate.items.filter(item => {
          const itemDisplayText = typeof item.itemName === 'string'
            ? item.itemName
            : getLocalizedTextSafe(item.itemName, langCode, template);
          return itemDisplayText === pendingDefect.itemDisplayName;
        });

        // Apply to all duplicate items with same location
        for (const item of duplicateItems) {
          const key = sanitizeFieldName(item.itemName);
          await inspectionService.recordDefect(inspectionId, section, key, {
            defectType: pendingDefect.defectType,
            notes: notes[key] || undefined,
            checkedBy: userEmail,
            defectLocation: location,
          });
        }

        logger.info('Defect with location recorded for all duplicates:', {
          itemDisplayName: pendingDefect.itemDisplayName,
          count: duplicateItems.length,
          defectType: pendingDefect.defectType,
          location,
        });
      } else {
        // Single item
        await inspectionService.recordDefect(inspectionId, section, pendingDefect.itemName, {
          defectType: pendingDefect.defectType,
          notes: notes[pendingDefect.itemName] || undefined,
          checkedBy: userEmail,
          defectLocation: location,
        });

        logger.info('Defect with location recorded:', {
          itemName: pendingDefect.itemName,
          defectType: pendingDefect.defectType,
          location,
        });
      }

      const updated = await inspectionService.getInspectionById(inspectionId);
      if (updated) {
        setInspection(updated);
      } else {
        setError('Failed to reload inspection after save');
      }

      setPendingDefect(null);
    } catch (err) {
      logger.error('Failed to record defect:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLocationCancel = () => {
    setShowLocationMarker(false);
    setPendingDefect(null);
  };

  const handleSaveExtraDefect = async (data: {
    itemName: string;
    defectType: string;
    defectLocation?: DefectLocation;
    notes?: string;
  }) => {
    if (!inspection) return;

    try {
      setSaving(true);
      setShowExtraDefectModal(false);

      await inspectionService.addAdditionalDefect(
        inspectionId,
        section,
        data.itemName,
        {
          defectType: data.defectType,
          defectLocation: data.defectLocation,
          notes: data.notes,
          checkedBy: userEmail,
        }
      );

      const updated = await inspectionService.getInspectionById(inspectionId);
      if (updated) {
        setInspection(updated);
      } else {
        setError('Failed to reload inspection after save');
      }

      logger.info('Extra defect saved successfully:', data);
    } catch (err) {
      logger.error('Failed to save extra defect:', err);
      setError('Failed to save extra defect. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle viewing defect location from previous gate
  const handleViewPreviousLocation = (defectLocation: DefectLocation) => {
    if (!template) return;

    const sectionTemplate = template.sections[section];
    if (!sectionTemplate?.images || sectionTemplate.images.length === 0) return;

    // Find the image that matches the defect location
    const image = sectionTemplate.images.find(img => img.imageId === defectLocation.imageId);
    if (!image) return;

    setSelectedLocationImage({
      imageUrl: image.imageUrl,
      imageName: image.imageName,
      locations: [defectLocation],
    });
    setShowLocationModal(true);
  };

  const handleCancelExtraDefect = () => {
    setShowExtraDefectModal(false);
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

  const handleReopenSection = async () => {
    if (!inspection) return;

    const confirm = window.confirm(
      'Reopen this section to finish checking the remaining items?'
    );
    if (!confirm) return;

    try {
      setSaving(true);

      // Update section status back to in_progress
      const docRef = doc(db, 'carInspections', inspectionId);
      await updateDoc(docRef, {
        [`sections.${section}.status`]: 'in_progress',
        [`sections.${section}.completedAt`]: null,
        updatedAt: Timestamp.now(),
      });

      // Reload inspection
      const updated = await inspectionService.getInspectionById(inspectionId);
      if (updated) {
        setInspection(updated);
      }

      logger.info('Section reopened:', { inspectionId, section });
    } catch (err) {
      logger.error('Failed to reopen section:', err);
      setError('Failed to reopen section. Please try again.');
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

        {/* Previous Gate Defects Panel */}
        {previousInspections.length > 0 && (
          <PreviousGateDefectsPanel
            previousInspections={previousInspections}
            currentSectionId={section}
            template={template}
          />
        )}

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

            // Check if this item was already reported by previous gates
            const previousReports: Array<{
              gateName: string;
              defectType: string;
              result: InspectionItemResult;
              inspectedAt: Date | null;
              inspector: string;
              gateIndex: number;
            }> = [];

            if (!isChecked) {
              // Collect ALL reports from previous gates for this item
              for (const prevInspection of previousInspections) {
                const prevSection = prevInspection.sections[section];
                if (prevSection && prevSection.results[sanitizedItemName]) {
                  const prevResult = prevSection.results[sanitizedItemName];
                  if (prevResult.defectType !== 'Ok') {
                    // Get inspector name from mapping, fallback to email or section name
                    const inspectorEmail = prevResult.checkedBy || prevSection.inspector;
                    const inspectorName = inspectorEmail
                      ? (emailToNameMap.get(inspectorEmail) || prevSection.inspectorName || inspectorEmail)
                      : (prevSection.inspectorName || 'Unknown');

                    previousReports.push({
                      gateName: prevInspection.gateName || `Gate ${prevInspection.gateIndex}`,
                      defectType: prevResult.defectType,
                      result: prevResult,
                      inspectedAt: prevResult.checkedAt || prevSection.completedAt || null,
                      inspector: inspectorName,
                      gateIndex: prevInspection.gateIndex ?? 0,
                    });
                  }
                }
              }
            }

            return (
              <div
                key={itemKey}
                className={`bg-white rounded-lg shadow transition-all ${
                  previousReports.length > 0
                    ? 'border-2 border-orange-300 bg-orange-50'
                    : isChecked
                    ? 'border-2 border-green-300'
                    : 'border-2 border-gray-200'
                }`}
              >
                <div
                  onClick={() => {
                    if (previousReports.length === 0) {
                      setSelectedItem(isExpanded ? null : itemKey);
                    }
                  }}
                  className={`p-4 ${previousReports.length > 0 ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
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
                        {previousReports.length > 0 && (
                          <div className="mt-2 p-3 bg-orange-100 border border-orange-300 rounded-lg space-y-3">
                            {/* Show all previous reports */}
                            {previousReports.map((report, idx) => (
                              <div key={idx} className={`${idx > 0 ? 'pt-3 border-t border-orange-200' : ''}`}>
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className="text-xs px-2 py-1 bg-orange-600 text-white rounded-full font-medium flex items-center gap-1">
                                    🔒 {report.gateName}
                                  </span>
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded font-medium">
                                    {report.defectType}
                                  </span>
                                  {report.result.defectLocation && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPreviousLocation(report.result.defectLocation!);
                                      }}
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                                      title="Click to view location on image"
                                    >
                                      📍 Position #{report.result.defectLocation.dotNumber}
                                    </button>
                                  )}
                                  {report.result.status === 'Resolved' && (
                                    <span className="text-xs px-2 py-1 bg-green-600 text-white rounded font-bold">
                                      ✓ Fixed
                                    </span>
                                  )}
                                </div>

                                {/* Inspector and Date */}
                                <div className="text-xs text-gray-700">
                                  <strong>Inspector:</strong> {report.inspector}
                                  {report.inspectedAt && (
                                    <span className="ml-2">
                                      <strong>Date:</strong> {new Date(report.inspectedAt).toLocaleString('en-MY', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>

                                {/* Notes */}
                                {report.result.notes && (
                                  <div className="text-xs bg-white p-2 rounded border border-orange-200 mt-1">
                                    <strong className="text-gray-700">Notes:</strong> {report.result.notes}
                                  </div>
                                )}

                                {/* Photos */}
                                {report.result.photoUrls && report.result.photoUrls.length > 0 && (
                                  <div className="mt-1">
                                    <div className="text-xs font-semibold text-gray-700 mb-1">Photos:</div>
                                    <div className="flex gap-1 flex-wrap">
                                      {report.result.photoUrls.map((url: string, photoIdx: number) => (
                                        <a
                                          key={photoIdx}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-block"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <img
                                            src={url}
                                            alt={`Defect ${photoIdx + 1}`}
                                            className="h-16 w-16 object-cover rounded border-2 border-orange-400 hover:opacity-75 transition-opacity"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Resolution Info */}
                                {report.result.status === 'Resolved' && report.result.resolvedBy && (
                                  <div className="text-xs bg-green-50 p-2 rounded border border-green-200 mt-1">
                                    <strong className="text-green-700">Fixed by:</strong> {report.result.resolvedBy}
                                    {report.result.resolvedAt && (
                                      <span className="ml-2">
                                        on {new Date(report.result.resolvedAt).toLocaleString('en-MY', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    )}
                                    {report.result.resolutionNote && (
                                      <div className="mt-1 italic text-green-800">"{report.result.resolutionNote}"</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}

                            <div className="text-xs text-orange-800 font-medium pt-2 border-t border-orange-200">
                              💡 To report additional defects on this item, use the "Mark Extra Issues" button
                            </div>
                          </div>
                        )}
                        {isChecked && (
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  result.defectType === 'Ok'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {result.defectType}
                                {result.defectLocation && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">
                                    #{result.defectLocation.dotNumber}
                                  </span>
                                )}
                              </span>
                              {result.status === 'Resolved' && result.defectType !== 'Ok' && (
                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-500 text-white">
                                  ✓ Fixed
                                </span>
                              )}
                              {result.notes && (
                                <span className="text-gray-500">
                                  "{result.notes}"
                                </span>
                              )}
                            </div>
                            {/* Show additional defects if any */}
                            {result.additionalDefects && result.additionalDefects.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="text-xs text-gray-600">+{result.additionalDefects.length} more:</span>
                                {result.additionalDefects.map((additionalDefect, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                      {additionalDefect.defectType}
                                      {additionalDefect.defectLocation && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-orange-600 text-white rounded-full text-xs font-bold">
                                          #{additionalDefect.defectLocation.dotNumber}
                                        </span>
                                      )}
                                    </span>
                                    {additionalDefect.status === 'Resolved' && (
                                      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-green-500 text-white">
                                        ✓
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {previousReports.length > 0 ? (
                        <div className="text-xs text-orange-700 italic">
                          Use "Mark Extra Issues" to add more
                        </div>
                      ) : (
                        <>
                          {isChecked && (
                            <div className="text-green-600 text-xl">✓</div>
                          )}
                          <div className="text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </div>
                        </>
                      )}
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
                                handleDefectSelect(itemKey, defectKey, itemName)
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
                              handleDefectSelect(itemKey, result.defectType, itemName);
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
        <div className="mt-6 space-y-3">
          {sectionResult.status === 'completed' && checkedItems < totalItems ? (
            // Show Reopen button if completed but items are missing
            <button
              onClick={handleReopenSection}
              disabled={saving}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg shadow-lg"
            >
              🔓 Reopen Section to Finish ({checkedItems}/{totalItems})
            </button>
          ) : (
            // Show normal Complete button
            <button
              onClick={handleCompleteSection}
              disabled={saving || sectionResult.status === 'completed'}
              className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg shadow-lg"
            >
              {sectionResult.status === 'completed'
                ? `✓ ${t('qa.status.completed')}`
                : `${t('qa.completeSection')} (${checkedItems}/${totalItems})`}
            </button>
          )}

          {/* Mark Extra Issues Button */}
          <button
            onClick={() => setShowExtraDefectModal(true)}
            disabled={saving}
            className="w-full py-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg shadow-lg"
          >
            📍 {t('qa.markExtraIssues') || 'Mark Extra Issues'}
          </button>

          {/* Show unchecked items if any */}
          {checkedItems < totalItems && (
            <div className={`mt-3 p-3 rounded-lg ${
              sectionResult.status === 'completed'
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className={`text-sm font-medium mb-2 ${
                sectionResult.status === 'completed' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {sectionResult.status === 'completed' ? '❌' : '⚠️'} {totalItems - checkedItems} item(s) left to check:
              </div>
              <ul className={`text-sm space-y-1 ${
                sectionResult.status === 'completed' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {items.map((item) => {
                  const itemKey = sanitizeFieldName(item.itemName);
                  const result = sectionResult.results[itemKey];
                  if (!result) {
                    const itemName = typeof item.itemName === 'string'
                      ? item.itemName
                      : getLocalizedTextSafe(item.itemName, langCode, template);
                    return (
                      <li key={itemKey} className="flex items-center gap-2">
                        <span className={sectionResult.status === 'completed' ? 'text-red-600' : 'text-yellow-600'}>•</span>
                        <span className="font-medium">{item.itemNumber}.</span>
                        <span>{itemName}</span>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
              {sectionResult.status === 'completed' ? (
                <div className="mt-3 text-xs text-red-600 bg-red-100 p-2 rounded">
                  ⚠️ This section was marked as complete but some items were not checked!
                </div>
              ) : (
                <div className="mt-2 text-xs text-yellow-600">
                  💡 You can still complete the section, but a confirmation will be required.
                </div>
              )}
            </div>
          )}

          {/* Show saving indicator */}
          {saving && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-sm font-medium text-blue-800">
                💾 Saving...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Defect Location Marker Modal */}
      {showLocationMarker && pendingDefect && template && template.sections[section].images && (
        <DefectLocationMarker
          images={template.sections[section].images!}
          existingLocation={undefined}
          dotNumber={nextDotNumber}
          itemName={pendingDefect.itemDisplayName}
          defectType={pendingDefect.defectType}
          onLocationSet={handleLocationSet}
          onCancel={handleLocationCancel}
        />
      )}

      {/* Add Extra Defect Modal */}
      {showExtraDefectModal && template && (
        <AddExtraDefectModal
          section={section}
          template={template}
          sectionImages={template.sections[section].images}
          nextDotNumber={nextDotNumber}
          onSave={handleSaveExtraDefect}
          onCancel={handleCancelExtraDefect}
        />
      )}

      {/* View Previous Location Modal */}
      {showLocationModal && selectedLocationImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Defect Location</h3>
                <p className="text-sm text-gray-600">{selectedLocationImage.imageName}</p>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="relative inline-block">
                <img
                  src={selectedLocationImage.imageUrl}
                  alt={selectedLocationImage.imageName}
                  className="max-w-full h-auto"
                />
                {/* Draw defect location dots */}
                <svg
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  {selectedLocationImage.locations.map((loc, idx) => (
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
                  <strong>Legend:</strong> Red dot shows where the defect was marked by the previous gate inspector.
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowLocationModal(false)}
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
};

export default InspectionChecklistView;
