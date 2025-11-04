// Visual Template Editor - Friendly UI for managing inspection templates
import { useState, useEffect } from 'react';
import { inspectionService } from '../../../services/inspectionService';
import type {
  InspectionTemplate,
  InspectionItem,
  InspectionSection,
  DefectType,
  SectionImage,
} from '../../../types/inspection';
import { createModuleLogger } from '../../../services/logger';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getLocalizedText } from '../../../utils/multilingualHelper';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImageIfNeeded } from '../../../utils/imageCompression';

const logger = createModuleLogger('VisualTemplateEditor');

export default function VisualTemplateEditor() {
  const { currentLanguage } = useLanguage();
  const langCode = currentLanguage as 'en' | 'ms' | 'zh' | 'my' | 'bn';

  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<InspectionSection | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<Record<string, boolean>>({});

  // Load template
  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const tmpl = await inspectionService.getTemplate('vehicle_inspection_v1');
      if (tmpl) {
        setTemplate(tmpl);
      } else {
        setMessage({ type: 'error', text: 'Template not found' });
      }
    } catch (error) {
      logger.error('Failed to load template:', error);
      setMessage({ type: 'error', text: 'Failed to load template' });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!template) return;

    try {
      setSaving(true);

      // Load original template to detect changes
      const originalTemplate = await inspectionService.getTemplate(template.templateId);

      if (!originalTemplate) {
        throw new Error('Could not load original template for comparison');
      }

      // Process multilingual updates based on detected changes
      const processedTemplate = processMultilingualUpdates(originalTemplate, template);

      await inspectionService.createTemplate(processedTemplate);

      // Reload the template to verify it was saved and update the UI
      const reloaded = await inspectionService.getTemplate(template.templateId);
      if (reloaded) {
        setTemplate(reloaded);
        logger.info('Template saved and reloaded successfully');
      } else {
        logger.warn('Template saved but could not reload - using current state');
      }

      setMessage({ type: 'success', text: `✅ Template saved successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to save template:', error);
      setMessage({ type: 'error', text: '❌ Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  // Process multilingual updates when saving from Visual Editor
  const processMultilingualUpdates = (
    originalTemplate: InspectionTemplate,
    newTemplate: InspectionTemplate
  ): InspectionTemplate => {
    // Check if template has multilingual data
    const isMultilingual = newTemplate.isMultilingual && newTemplate.translations;

    if (!isMultilingual) {
      // No multilingual data, just return the new template as-is
      return newTemplate;
    }

    // Get list of active languages (languages with 'synced' status)
    const activeLanguages: import('../../../types/inspection').LanguageCode[] = [];
    if (newTemplate.translations) {
      for (const lang in newTemplate.translations) {
        const langCode = lang as import('../../../types/inspection').LanguageCode;
        if (langCode !== 'en' && newTemplate.translations[langCode]?.status === 'synced') {
          activeLanguages.push(langCode);
        }
      }
    }

    // If no active translations, just return the new template
    if (activeLanguages.length === 0) {
      return newTemplate;
    }

    // Process template-level defect types
    let processedDefectTypes = newTemplate.defectTypes;
    if (newTemplate.defectTypes && originalTemplate.defectTypes) {
      processedDefectTypes = processDefectTypeChanges(
        originalTemplate.defectTypes,
        newTemplate.defectTypes,
        activeLanguages
      );
    }

    // Process each section
    const updatedSections = { ...newTemplate.sections };

    for (const sectionId in updatedSections) {
      const oldSection = originalTemplate.sections[sectionId];
      const newSection = updatedSections[sectionId];

      if (!oldSection) {
        // Section was ADDED - extend with blanks
        updatedSections[sectionId] = extendSectionWithBlanks(newSection, activeLanguages);
        continue;
      }

      if (!newSection) {
        // Section was deleted - already removed, no action needed
        continue;
      }

      // Process items in this section
      const updatedItems = processItemChanges(
        oldSection.items,
        newSection.items,
        activeLanguages,
        newTemplate.defectTypes
      );

      updatedSections[sectionId] = {
        ...newSection,
        items: updatedItems
      };
    }

    return {
      ...newTemplate,
      defectTypes: processedDefectTypes,
      sections: updatedSections,
      updatedAt: new Date()
    };
  };

  // Process changes to defect types array
  const processDefectTypeChanges = (
    oldDefectTypes: (string | import('../../../types/inspection').MultilingualText)[],
    newDefectTypes: (string | import('../../../types/inspection').MultilingualText)[],
    activeLanguages: import('../../../types/inspection').LanguageCode[]
  ): (string | import('../../../types/inspection').MultilingualText)[] => {
    return newDefectTypes.map((newDefect, index) => {
      const oldDefect = oldDefectTypes[index];

      // Get English text for comparison
      const getEnText = (d: string | import('../../../types/inspection').MultilingualText) =>
        typeof d === 'string' ? d : d.en;

      if (!oldDefect) {
        // NEW defect type - extend with blanks
        return extendTextWithBlanks(newDefect, activeLanguages);
      }

      if (getEnText(oldDefect) !== getEnText(newDefect)) {
        // Defect type name EDITED - clear translations
        return clearTextTranslations(newDefect, activeLanguages);
      }

      // Unchanged - keep as is
      return newDefect;
    });
  };

  // Process changes to items array
  const processItemChanges = (
    oldItems: InspectionItem[],
    newItems: InspectionItem[],
    activeLanguages: import('../../../types/inspection').LanguageCode[],
    _templateDefectTypes?: (string | import('../../../types/inspection').MultilingualText)[]
  ): InspectionItem[] => {
    return newItems.map((newItem, index) => {
      const oldItem = oldItems[index];

      if (!oldItem) {
        // NEW item - extend with blanks
        return extendItemWithBlanks(newItem, activeLanguages);
      }

      // Get English text for comparison
      const getEnText = (name: string | import('../../../types/inspection').MultilingualText) =>
        typeof name === 'string' ? name : name.en;

      const oldItemName = getEnText(oldItem.itemName);
      const newItemName = getEnText(newItem.itemName);

      if (oldItemName !== newItemName) {
        // Item name EDITED - clear translations
        return clearItemTranslations(newItem, activeLanguages);
      }

      // Check if item has custom defect types and if they changed
      if (newItem.defectTypes && oldItem.defectTypes) {
        const processedDefectTypes = processDefectTypeChanges(
          oldItem.defectTypes,
          newItem.defectTypes,
          activeLanguages
        );
        return {
          ...newItem,
          defectTypes: processedDefectTypes
        };
      }

      // Unchanged - keep as is
      return newItem;
    });
  };

  // Extend a section with blank translations
  const extendSectionWithBlanks = (
    section: import('../../../types/inspection').InspectionSectionTemplate,
    activeLanguages: import('../../../types/inspection').LanguageCode[]
  ): import('../../../types/inspection').InspectionSectionTemplate => {
    return {
      ...section,
      sectionName: extendTextWithBlanks(section.sectionName, activeLanguages),
      items: section.items.map(item => extendItemWithBlanks(item, activeLanguages))
    };
  };

  // Extend an item with blank translations
  const extendItemWithBlanks = (
    item: InspectionItem,
    activeLanguages: import('../../../types/inspection').LanguageCode[]
  ): InspectionItem => {
    return {
      ...item,
      itemName: extendTextWithBlanks(item.itemName, activeLanguages),
      defectTypes: item.defectTypes?.map(dt => extendTextWithBlanks(dt, activeLanguages))
    };
  };

  // Clear translations for an item (Option B - safer)
  const clearItemTranslations = (
    item: InspectionItem,
    activeLanguages: import('../../../types/inspection').LanguageCode[]
  ): InspectionItem => {
    return {
      ...item,
      itemName: clearTextTranslations(item.itemName, activeLanguages),
      defectTypes: item.defectTypes?.map(dt => clearTextTranslations(dt, activeLanguages))
    };
  };

  // Extend a text field with blank translations
  const extendTextWithBlanks = (
    text: string | import('../../../types/inspection').MultilingualText,
    _activeLanguages: import('../../../types/inspection').LanguageCode[]
  ): import('../../../types/inspection').MultilingualText => {
    const enText = typeof text === 'string' ? text : text.en;
    const existingText = typeof text === 'object' ? text : undefined;

    return {
      en: enText,
      ms: existingText?.ms || '',
      zh: existingText?.zh || '',
      my: existingText?.my || '',
      bn: existingText?.bn || ''
    };
  };

  // Clear all translations except English
  const clearTextTranslations = (
    text: string | import('../../../types/inspection').MultilingualText,
    _activeLanguages: import('../../../types/inspection').LanguageCode[]
  ): import('../../../types/inspection').MultilingualText => {
    const enText = typeof text === 'string' ? text : text.en;

    return {
      en: enText,
      ms: '',
      zh: '',
      my: '',
      bn: ''
    };
  };

  // ===== DEFAULT DEFECT TYPES MANAGEMENT =====

  const addDefaultDefectType = () => {
    if (!template) return;
    const newDefect = prompt('Enter new defect type name:');
    if (!newDefect || !newDefect.trim()) return;

    setTemplate({
      ...template,
      defectTypes: [...(template.defectTypes || []), newDefect.trim()],
    });
  };

  const removeDefaultDefectType = (index: number) => {
    if (!template || !template.defectTypes) return;
    const confirm = window.confirm(
      `Remove "${template.defectTypes[index]}" from default defect types?`
    );
    if (!confirm) return;

    const newDefectTypes = [...template.defectTypes];
    newDefectTypes.splice(index, 1);
    setTemplate({
      ...template,
      defectTypes: newDefectTypes,
    });
  };

  const editDefaultDefectType = (index: number) => {
    if (!template || !template.defectTypes) return;
    const current = template.defectTypes[index];
    const newName = prompt('Edit defect type name:', current as string);
    if (!newName || !newName.trim() || newName === current) return;

    const newDefectTypes = [...template.defectTypes];
    newDefectTypes[index] = newName.trim();
    setTemplate({
      ...template,
      defectTypes: newDefectTypes,
    });
  };

  const applyDefaultsToAllItems = () => {
    if (!template || !template.defectTypes) return;
    const confirm = window.confirm(
      'This will replace all item-specific defect types with the default defect types. Continue?'
    );
    if (!confirm) return;

    const newSections = { ...template.sections };
    Object.keys(newSections).forEach((sectionId) => {
      const section = newSections[sectionId as InspectionSection];
      section.items = section.items.map((item) => ({
        ...item,
        defectTypes: undefined, // Remove custom defect types, will use defaults
      }));
    });

    setTemplate({
      ...template,
      sections: newSections,
    });
    setMessage({
      type: 'success',
      text: '✅ Default defect types applied to all items',
    });
  };

  // ===== SECTION MANAGEMENT =====

  const addSection = () => {
    if (!template) return;
    const sectionId = prompt('Enter section ID (e.g., custom_section):');
    if (!sectionId || !sectionId.trim()) return;

    const sectionName = prompt('Enter section name (e.g., Custom Section):');
    if (!sectionName || !sectionName.trim()) return;

    if (template.sections[sectionId as InspectionSection]) {
      alert('Section ID already exists!');
      return;
    }

    setTemplate({
      ...template,
      sections: {
        ...template.sections,
        [sectionId]: {
          sectionId,
          sectionName,
          items: [],
        },
      },
    });
  };

  const removeSection = (sectionId: InspectionSection) => {
    if (!template) return;
    const confirm = window.confirm(
      `Remove entire section "${sectionId}"? This cannot be undone.`
    );
    if (!confirm) return;

    const newSections = { ...template.sections };
    delete newSections[sectionId];
    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  // ===== ITEM MANAGEMENT =====

  const addItem = (sectionId: InspectionSection) => {
    if (!template) return;
    const itemName = prompt('Enter item name:');
    if (!itemName || !itemName.trim()) return;

    const section = template.sections[sectionId];
    const newItemNumber = section.items.length + 1;

    const newItem: InspectionItem = {
      itemNumber: newItemNumber,
      itemName: itemName.trim(),
      defectTypes: undefined, // Will use template defaults
    };

    const newSections = {
      ...template.sections,
      [sectionId]: {
        ...section,
        items: [...section.items, newItem],
      },
    };

    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  const removeItem = (sectionId: InspectionSection, itemIndex: number) => {
    if (!template) return;
    const section = template.sections[sectionId];
    const item = section.items[itemIndex];
    const confirm = window.confirm(
      `Remove item "${typeof item.itemName === 'string' ? item.itemName : (item.itemName as any).en}"?`
    );
    if (!confirm) return;

    const newItems = [...section.items];
    newItems.splice(itemIndex, 1);

    // Renumber items
    newItems.forEach((item, idx) => {
      item.itemNumber = idx + 1;
    });

    const newSections = {
      ...template.sections,
      [sectionId]: {
        ...section,
        items: newItems,
      },
    };

    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  const editItemName = (sectionId: InspectionSection, itemIndex: number) => {
    if (!template) return;
    const section = template.sections[sectionId];
    const item = section.items[itemIndex];
    const currentName =
      typeof item.itemName === 'string' ? item.itemName : (item.itemName as any).en;
    const newName = prompt('Edit item name:', currentName);
    if (!newName || !newName.trim() || newName === currentName) return;

    const newItems = [...section.items];
    newItems[itemIndex] = {
      ...item,
      itemName: newName.trim(),
    };

    const newSections = {
      ...template.sections,
      [sectionId]: {
        ...section,
        items: newItems,
      },
    };

    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  // ===== ITEM DEFECT TYPES MANAGEMENT =====

  const addItemDefectType = (sectionId: InspectionSection, itemIndex: number) => {
    if (!template) return;
    const defectName = prompt('Enter defect type name:');
    if (!defectName || !defectName.trim()) return;

    const section = template.sections[sectionId];
    const item = section.items[itemIndex];

    // If item has no custom defect types, copy from template defaults first
    const currentDefects = item.defectTypes || [...(template.defectTypes || [])];

    const newItems = [...section.items];
    newItems[itemIndex] = {
      ...item,
      defectTypes: [...currentDefects, defectName.trim()] as DefectType[],
    };

    const newSections = {
      ...template.sections,
      [sectionId]: {
        ...section,
        items: newItems,
      },
    };

    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  const removeItemDefectType = (
    sectionId: InspectionSection,
    itemIndex: number,
    defectIndex: number
  ) => {
    if (!template) return;
    const section = template.sections[sectionId];
    const item = section.items[itemIndex];
    const itemDefects = item.defectTypes || template.defectTypes || [];

    const newDefects = [...itemDefects];
    newDefects.splice(defectIndex, 1);

    const newItems = [...section.items];
    newItems[itemIndex] = {
      ...item,
      defectTypes: newDefects as DefectType[],
    };

    const newSections = {
      ...template.sections,
      [sectionId]: {
        ...section,
        items: newItems,
      },
    };

    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  const resetItemToDefaults = (sectionId: InspectionSection, itemIndex: number) => {
    if (!template) return;
    const confirm = window.confirm(
      'Reset this item to use default defect types?'
    );
    if (!confirm) return;

    const section = template.sections[sectionId];
    const newItems = [...section.items];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      defectTypes: undefined, // Remove custom defects
    };

    const newSections = {
      ...template.sections,
      [sectionId]: {
        ...section,
        items: newItems,
      },
    };

    setTemplate({
      ...template,
      sections: newSections,
    });
  };

  // ===== SECTION IMAGE MANAGEMENT =====

  const uploadSectionImage = async (sectionId: InspectionSection, file: File) => {
    if (!template) return;

    try {
      setUploadingImage({ ...uploadingImage, [sectionId]: true });

      // Compress image if needed (only if > 1MB)
      const { file: processedFile, wasCompressed, originalSize, finalSize } = await compressImageIfNeeded(file, {
        maxSizeMB: 1,      // Only compress if larger than 1MB
        maxWidthOrHeight: 1920, // Max 1920px on longest side
        quality: 0.85,     // 85% JPEG quality
      });

      if (wasCompressed) {
        logger.info('Image compressed:', {
          original: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
          final: `${(finalSize / 1024 / 1024).toFixed(2)} MB`,
          saved: `${(((originalSize - finalSize) / originalSize) * 100).toFixed(1)}%`,
        });
      }

      // Generate unique image ID
      const imageId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const storagePath = `inspection-templates/${template.templateId}/sections/${sectionId}/${imageId}`;

      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, processedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Create SectionImage object
      const newImage: SectionImage = {
        imageId,
        imageUrl: downloadURL,
        imageName: file.name,
        size: finalSize, // Store file size for duplicate detection
        uploadedAt: new Date(),
      };

      // Add image to section
      const section = template.sections[sectionId];
      const currentImages = section.images || [];

      const newSections = {
        ...template.sections,
        [sectionId]: {
          ...section,
          images: [...currentImages, newImage],
        },
      };

      setTemplate({
        ...template,
        sections: newSections,
      });

      setMessage({ type: 'success', text: `✅ Image uploaded successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to upload image:', error);
      setMessage({ type: 'error', text: '❌ Failed to upload image' });
    } finally {
      setUploadingImage({ ...uploadingImage, [sectionId]: false });
    }
  };

  const deleteSectionImage = async (sectionId: InspectionSection, imageId: string) => {
    if (!template) return;

    const confirm = window.confirm('Delete this image? This cannot be undone.');
    if (!confirm) return;

    try {
      const section = template.sections[sectionId];
      const image = section.images?.find(img => img.imageId === imageId);

      if (image) {
        // Delete from Firebase Storage
        const storage = getStorage();
        const storagePath = `inspection-templates/${template.templateId}/sections/${sectionId}/${imageId}`;
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }

      // Remove from section
      const newImages = (section.images || []).filter(img => img.imageId !== imageId);

      const newSections = {
        ...template.sections,
        [sectionId]: {
          ...section,
          images: newImages.length > 0 ? newImages : undefined,
        },
      };

      setTemplate({
        ...template,
        sections: newSections,
      });

      setMessage({ type: 'success', text: `✅ Image deleted successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to delete image:', error);
      setMessage({ type: 'error', text: '❌ Failed to delete image' });
    }
  };

  const handleImageFileSelect = (sectionId: InspectionSection, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '❌ Please select an image file' });
      return;
    }

    // Validate file size (max 20MB raw - we'll compress it automatically)
    if (file.size > 20 * 1024 * 1024) {
      setMessage({ type: 'error', text: '❌ Image size must be less than 20MB' });
      return;
    }

    uploadSectionImage(sectionId, file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading template...</div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800">Template not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Visual Template Editor</h2>
            <p className="text-gray-600 mt-1">
              Edit inspection checklist structure and defect types
            </p>
          </div>
          <button
            onClick={saveTemplate}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
          >
            {saving ? 'Saving...' : '💾 Save Template'}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* DEFAULT DEFECT TYPES SECTION */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Default Defect Types</h3>
            <p className="text-sm text-gray-600 mt-1">
              These defect types apply to all items unless customized
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyDefaultsToAllItems}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              🔄 Apply to All Items
            </button>
            <button
              onClick={addDefaultDefectType}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              ➕ Add Defect Type
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(template.defectTypes || []).map((defect, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
            >
              <div className="flex-1 font-medium text-gray-900">
                {typeof defect === 'string' ? defect : (defect as any).en}
              </div>
              <button
                onClick={() => editDefaultDefectType(index)}
                className="text-blue-600 hover:text-blue-700"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => removeDefaultDefectType(index)}
                className="text-red-600 hover:text-red-700"
                title="Remove"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {(!template.defectTypes || template.defectTypes.length === 0) && (
          <div className="text-center text-gray-400 py-8">
            No default defect types defined
          </div>
        )}
      </div>

      {/* SECTIONS */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Inspection Sections</h3>
          <button
            onClick={addSection}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            ➕ Add Section
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(template.sections)
            .sort(([idA], [idB]) => {
              // Define consistent section order
              const sectionOrder = [
                'right_outside',
                'left_outside',
                'front_back',
                'interior_right',
                'interior_left'
              ];
              const indexA = sectionOrder.indexOf(idA);
              const indexB = sectionOrder.indexOf(idB);

              // If both sections are in the predefined order, sort by that order
              if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
              }
              // If only A is in the predefined order, put it first
              if (indexA !== -1) return -1;
              // If only B is in the predefined order, put it first
              if (indexB !== -1) return 1;
              // For custom sections not in the order, sort alphabetically
              return idA.localeCompare(idB);
            })
            .map(([sectionId, section]) => {
            const isExpanded = expandedSection === sectionId;
            const sectionName =
              typeof section.sectionName === 'string'
                ? section.sectionName
                : getLocalizedText(section.sectionName, langCode);

            return (
              <div
                key={sectionId}
                className="border-2 border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Section Header */}
                <div
                  className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                  onClick={() =>
                    setExpandedSection(isExpanded ? null : (sectionId as InspectionSection))
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{isExpanded ? '▼' : '▶'}</div>
                    <div>
                      <div className="font-bold text-gray-900">{sectionName}</div>
                      <div className="text-sm text-gray-600">
                        {section.items.length} items
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(sectionId as InspectionSection);
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      ➕ Add Item
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(sectionId as InspectionSection);
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>

                {/* Section Items */}
                {isExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    {/* Section Images */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">🖼️ Section Images for Defect Marking</h4>
                        <label className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                          uploadingImage[sectionId]
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                          {uploadingImage[sectionId] ? 'Uploading...' : '📤 Upload Image'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingImage[sectionId]}
                            onChange={(e) => handleImageFileSelect(sectionId as InspectionSection, e)}
                          />
                        </label>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">
                        Upload images where workers will mark defect locations. Multiple images are allowed per section.
                      </p>

                      {/* Image Grid */}
                      {section.images && section.images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {section.images.map((image) => (
                            <div key={image.imageId} className="relative group">
                              <img
                                src={image.imageUrl}
                                alt={image.imageName}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                                <button
                                  onClick={() => deleteSectionImage(sectionId as InspectionSection, image.imageId)}
                                  className="opacity-0 group-hover:opacity-100 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 truncate">{image.imageName}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                          No images uploaded yet. Click "Upload Image" to add section images.
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    {section.items.map((item, itemIndex) => {
                      const itemName =
                        typeof item.itemName === 'string'
                          ? item.itemName
                          : getLocalizedText(item.itemName, langCode);
                      const itemKey = `${sectionId}-${itemIndex}`;
                      const isItemExpanded = expandedItem === itemKey;
                      const itemDefects = item.defectTypes || template.defectTypes || [];
                      const usingCustomDefects = !!item.defectTypes;

                      return (
                        <div
                          key={itemKey}
                          className="border border-gray-300 rounded-lg overflow-hidden"
                        >
                          {/* Item Header */}
                          <div
                            className="bg-gray-100 p-3 cursor-pointer hover:bg-gray-200 flex items-center justify-between"
                            onClick={() =>
                              setExpandedItem(isItemExpanded ? null : itemKey)
                            }
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-gray-500">{isItemExpanded ? '▼' : '▶'}</div>
                              <div className="font-semibold text-gray-900 w-8">
                                {item.itemNumber}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{itemName}</div>
                                <div className="text-xs text-gray-500">
                                  {itemDefects.length} defect types
                                  {usingCustomDefects && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                      Custom
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editItemName(sectionId as InspectionSection, itemIndex);
                                }}
                                className="px-2 py-1 text-blue-600 hover:text-blue-700 text-sm"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(sectionId as InspectionSection, itemIndex);
                                }}
                                className="px-2 py-1 text-red-600 hover:text-red-700 text-sm"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Item Defect Types */}
                          {isItemExpanded && (
                            <div className="p-3 bg-white space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-700">
                                  Defect Types for this item:
                                </div>
                                <div className="flex gap-2">
                                  {usingCustomDefects && (
                                    <button
                                      onClick={() =>
                                        resetItemToDefaults(
                                          sectionId as InspectionSection,
                                          itemIndex
                                        )
                                      }
                                      className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                    >
                                      🔄 Reset to Defaults
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      addItemDefectType(
                                        sectionId as InspectionSection,
                                        itemIndex
                                      )
                                    }
                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  >
                                    ➕ Add Defect
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                {itemDefects.map((defect, defectIndex) => {
                                  const defectName =
                                    typeof defect === 'string'
                                      ? defect
                                      : (defect as any).en;
                                  return (
                                    <div
                                      key={defectIndex}
                                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2"
                                    >
                                      <div className="flex-1 text-sm text-gray-900">
                                        {defectName}
                                      </div>
                                      <button
                                        onClick={() =>
                                          removeItemDefectType(
                                            sectionId as InspectionSection,
                                            itemIndex,
                                            defectIndex
                                          )
                                        }
                                        className="text-red-600 hover:text-red-700 text-sm"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {itemDefects.length === 0 && (
                                <div className="text-center text-gray-400 py-4 text-sm">
                                  No defect types for this item
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {section.items.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        No items in this section
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
