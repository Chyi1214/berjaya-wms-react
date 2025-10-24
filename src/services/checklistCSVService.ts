// Checklist CSV Service - Parse and validate CSV files for inspection templates
import type { InspectionTemplate, InspectionSectionTemplate, InspectionItem, MultilingualText, LanguageCode } from '../types/inspection';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ChecklistCSVService');

export type { LanguageCode } from '../types/inspection';

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  ms: 'Malay',
  zh: 'Chinese',
  my: 'Myanmar',
  bn: 'Bengali'
};

interface CSVRow {
  SectionID: string;
  SectionName: string;
  ItemNumber: string;
  ItemName: string;
  DefectType: string;
  Required: string;
}

interface ParsedChecklistData {
  templateName: string;
  sections: Map<string, {
    sectionId: string;
    sectionName: string;
    items: Map<number, {
      itemNumber: number;
      itemName: string;
      defectTypes: string[];
    }>;
  }>;
}

class ChecklistCSVService {
  /**
   * Parse CSV content into structured checklist data
   */
  parseCSV(csvContent: string, language: LanguageCode): ParsedChecklistData {
    logger.info(`Parsing CSV for language: ${language}`);

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    // Parse header - just check we have 6 columns, ignore header text (can be translated)
    const header = lines[0].split(',').map(h => h.trim());
    if (header.length !== 6) {
      throw new Error(`CSV must have exactly 6 columns, found ${header.length}`);
    }

    // Use fixed column positions: 0=SectionID, 1=SectionName, 2=ItemNumber, 3=ItemName, 4=DefectType, 5=Required
    const sections = new Map<string, {
      sectionId: string;
      sectionName: string;
      items: Map<number, {
        itemNumber: number;
        itemName: string;
        defectTypes: string[];
      }>;
    }>();

    let currentSection: string | null = null;
    let currentItemNumber: number | null = null;

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);

      // Use column positions instead of header names
      const row: CSVRow = {
        SectionID: values[0] || '',
        SectionName: values[1] || '',
        ItemNumber: values[2] || '',
        ItemName: values[3] || '',
        DefectType: values[4] || '',
        Required: values[5] || ''
      };

      // New section
      if (row.SectionID && row.SectionName) {
        currentSection = row.SectionID;
        if (!sections.has(currentSection)) {
          sections.set(currentSection, {
            sectionId: row.SectionID,
            sectionName: row.SectionName,
            items: new Map()
          });
        }
        currentItemNumber = null;
        continue;
      }

      // New item
      if (row.ItemNumber && row.ItemName && currentSection) {
        currentItemNumber = parseInt(row.ItemNumber);
        const section = sections.get(currentSection)!;
        if (!section.items.has(currentItemNumber)) {
          section.items.set(currentItemNumber, {
            itemNumber: currentItemNumber,
            itemName: row.ItemName,
            defectTypes: []
          });
        }
        continue;
      }

      // Defect type for current item
      if (row.DefectType && currentSection && currentItemNumber !== null) {
        const section = sections.get(currentSection)!;
        const item = section.items.get(currentItemNumber)!;
        item.defectTypes.push(row.DefectType);
        continue;
      }
    }

    return {
      templateName: `Vehicle Inspection Checklist`,
      sections
    };
  }

  /**
   * Parse CSV line handling quotes and commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Validate that all language CSV files have matching structure
   */
  validateStructure(parsedData: Map<LanguageCode, ParsedChecklistData>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (parsedData.size === 0) {
      errors.push('No CSV files provided');
      return { valid: false, errors };
    }

    // Use English as reference
    const reference = parsedData.get('en');
    if (!reference) {
      errors.push('English CSV file is required as reference');
      return { valid: false, errors };
    }

    // Check each language against English structure
    for (const [lang, data] of parsedData.entries()) {
      if (lang === 'en') continue;

      // Check section count
      if (data.sections.size !== reference.sections.size) {
        errors.push(`${LANGUAGE_NAMES[lang]}: Different number of sections (${data.sections.size} vs ${reference.sections.size})`);
        continue;
      }

      // Check each section
      for (const [sectionId, refSection] of reference.sections.entries()) {
        const langSection = data.sections.get(sectionId);

        if (!langSection) {
          errors.push(`${LANGUAGE_NAMES[lang]}: Missing section "${sectionId}"`);
          continue;
        }

        // Check item count
        if (langSection.items.size !== refSection.items.size) {
          errors.push(`${LANGUAGE_NAMES[lang]}: Section "${sectionId}" has different number of items (${langSection.items.size} vs ${refSection.items.size})`);
        }

        // Check each item
        for (const [itemNum, refItem] of refSection.items.entries()) {
          const langItem = langSection.items.get(itemNum);

          if (!langItem) {
            errors.push(`${LANGUAGE_NAMES[lang]}: Section "${sectionId}" missing item number ${itemNum}`);
            continue;
          }

          // Check defect types count
          if (langItem.defectTypes.length !== refItem.defectTypes.length) {
            errors.push(`${LANGUAGE_NAMES[lang]}: Section "${sectionId}", item ${itemNum} has different number of defect types (${langItem.defectTypes.length} vs ${refItem.defectTypes.length})`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Combine multiple language CSV files into a multilingual template
   */
  createMultilingualTemplate(
    parsedData: Map<LanguageCode, ParsedChecklistData>,
    templateId: string,
    version: string
  ): InspectionTemplate {
    logger.info('Creating multilingual template');

    // Validate structure first
    const validation = this.validateStructure(parsedData);
    if (!validation.valid) {
      throw new Error(`CSV structure validation failed:\n${validation.errors.join('\n')}`);
    }

    const enData = parsedData.get('en')!;
    const sections: Record<string, InspectionSectionTemplate> = {};

    // Build multilingual sections
    for (const [sectionId, enSection] of enData.sections.entries()) {
      const sectionName: MultilingualText = {
        en: enSection.sectionName,
        ms: parsedData.get('ms')?.sections.get(sectionId)?.sectionName || enSection.sectionName,
        zh: parsedData.get('zh')?.sections.get(sectionId)?.sectionName || enSection.sectionName,
        my: parsedData.get('my')?.sections.get(sectionId)?.sectionName || enSection.sectionName,
        bn: parsedData.get('bn')?.sections.get(sectionId)?.sectionName || enSection.sectionName
      };

      const items: InspectionItem[] = [];

      for (const [itemNum, enItem] of enSection.items.entries()) {
        const itemName: MultilingualText = {
          en: enItem.itemName,
          ms: parsedData.get('ms')?.sections.get(sectionId)?.items.get(itemNum)?.itemName || enItem.itemName,
          zh: parsedData.get('zh')?.sections.get(sectionId)?.items.get(itemNum)?.itemName || enItem.itemName,
          my: parsedData.get('my')?.sections.get(sectionId)?.items.get(itemNum)?.itemName || enItem.itemName,
          bn: parsedData.get('bn')?.sections.get(sectionId)?.items.get(itemNum)?.itemName || enItem.itemName
        };

        const defectTypes: MultilingualText[] = enItem.defectTypes.map((_, defectIdx) => ({
          en: enItem.defectTypes[defectIdx],
          ms: parsedData.get('ms')?.sections.get(sectionId)?.items.get(itemNum)?.defectTypes[defectIdx] || enItem.defectTypes[defectIdx],
          zh: parsedData.get('zh')?.sections.get(sectionId)?.items.get(itemNum)?.defectTypes[defectIdx] || enItem.defectTypes[defectIdx],
          my: parsedData.get('my')?.sections.get(sectionId)?.items.get(itemNum)?.defectTypes[defectIdx] || enItem.defectTypes[defectIdx],
          bn: parsedData.get('bn')?.sections.get(sectionId)?.items.get(itemNum)?.defectTypes[defectIdx] || enItem.defectTypes[defectIdx]
        }));

        items.push({
          itemNumber: itemNum,
          itemName,
          defectTypes
        });
      }

      sections[sectionId] = {
        sectionId,
        sectionName,
        items
      };
    }

    const templateName: MultilingualText = {
      en: enData.templateName,
      ms: parsedData.get('ms')?.templateName || enData.templateName,
      zh: parsedData.get('zh')?.templateName || enData.templateName,
      my: parsedData.get('my')?.templateName || enData.templateName,
      bn: parsedData.get('bn')?.templateName || enData.templateName
    };

    return {
      templateId,
      templateName,
      version,
      sections,
      isMultilingual: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Export template to CSV for download
   */
  exportToCSV(template: InspectionTemplate, language: LanguageCode): string {
    logger.info(`Exporting template to CSV for language: ${language}`);

    const rows: string[] = [];

    // Header
    rows.push('SectionID,SectionName,ItemNumber,ItemName,DefectType,Required');

    // Get text in specified language
    const getText = (text: string | MultilingualText): string => {
      if (typeof text === 'string') return text;
      return text[language] || text.en;
    };

    // Export sections
    for (const section of Object.values(template.sections)) {
      const sectionName = getText(section.sectionName);

      // Section row
      rows.push(`${section.sectionId},"${sectionName}",,,`);

      // Items
      for (const item of section.items) {
        const itemName = getText(item.itemName);

        // Item row
        rows.push(`,,${item.itemNumber},"${itemName}",,Yes`);

        // Defect types
        if (item.defectTypes && item.defectTypes.length > 0) {
          for (const defectType of item.defectTypes) {
            const defectName = getText(defectType);
            rows.push(`,,,,"${defectName}",`);
          }
        } else if (template.defectTypes && template.defectTypes.length > 0) {
          // Use default defect types if item has none
          for (const defectType of template.defectTypes) {
            const defectName = getText(defectType);
            rows.push(`,,,,"${defectName}",`);
          }
        }
      }
    }

    return rows.join('\n');
  }

  /**
   * Validate a translation CSV against the English master template
   * Returns errors if structure doesn't match
   */
  validateTranslationPatch(
    masterTemplate: InspectionTemplate,
    translationData: ParsedChecklistData,
    language: LanguageCode
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Extract English structure from master template
    const masterSections = Object.keys(masterTemplate.sections).sort();
    const translationSections = Array.from(translationData.sections.keys()).sort();

    // Check: Same number of sections
    if (masterSections.length !== translationSections.length) {
      errors.push(
        `Section count mismatch: English has ${masterSections.length} sections, ${language} has ${translationSections.length}`
      );
    }

    // Check: Same section IDs
    for (const sectionId of masterSections) {
      if (!translationData.sections.has(sectionId)) {
        errors.push(`Missing section: "${sectionId}" not found in ${language} translation`);
      }
    }

    for (const sectionId of translationSections) {
      if (!masterTemplate.sections[sectionId]) {
        errors.push(`Extra section: "${sectionId}" found in ${language} but not in English`);
      }
    }

    // Check each section's items
    for (const sectionId of masterSections) {
      const masterSection = masterTemplate.sections[sectionId];
      const translationSection = translationData.sections.get(sectionId);

      if (!translationSection) continue;

      const masterItems = masterSection.items;
      const translationItems = Array.from(translationSection.items.values());

      // Check: Same number of items
      if (masterItems.length !== translationItems.length) {
        errors.push(
          `Section "${sectionId}": Item count mismatch (English: ${masterItems.length}, ${language}: ${translationItems.length})`
        );
        continue;
      }

      // Check: Same item numbers and order
      for (let i = 0; i < masterItems.length; i++) {
        const masterItem = masterItems[i];
        const translationItem = translationItems[i];

        if (masterItem.itemNumber !== translationItem.itemNumber) {
          errors.push(
            `Section "${sectionId}": Item number mismatch at position ${i + 1} (English: ${masterItem.itemNumber}, ${language}: ${translationItem.itemNumber})`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply a single-language translation patch to an existing template
   * Updates only the specified language, keeps English intact
   */
  applyTranslationPatch(
    template: InspectionTemplate,
    translationData: ParsedChecklistData,
    language: LanguageCode,
    uploadedBy?: string
  ): InspectionTemplate {
    logger.info(`Applying ${language} translation patch to template ${template.templateId}`);

    // Create updated sections with translation
    const updatedSections: Record<string, InspectionSectionTemplate> = {};

    for (const [sectionId, section] of Object.entries(template.sections)) {
      const translationSection = translationData.sections.get(sectionId);

      if (!translationSection) {
        // Keep existing section if no translation
        updatedSections[sectionId] = section;
        continue;
      }

      // Update section name
      const sectionName = typeof section.sectionName === 'string'
        ? { en: section.sectionName, ms: '', zh: '', my: '', bn: '' }
        : { ...section.sectionName };

      if (language !== 'en') {
        sectionName[language] = translationSection.sectionName;
      }

      // Update items
      const updatedItems = section.items.map((item) => {
        const translationItem = translationSection.items.get(item.itemNumber);

        if (!translationItem) return item;

        // Update item name
        const itemName = typeof item.itemName === 'string'
          ? { en: item.itemName, ms: '', zh: '', my: '', bn: '' }
          : { ...item.itemName };

        if (language !== 'en') {
          itemName[language] = translationItem.itemName;
        }

        // Update defect types if item has custom ones
        let defectTypes = item.defectTypes;
        if (defectTypes && translationItem.defectTypes.length > 0) {
          defectTypes = defectTypes.map((defect, idx) => {
            const translationDefect = translationItem.defectTypes[idx];
            if (!translationDefect) return defect;

            const defectText = typeof defect === 'string'
              ? { en: defect, ms: '', zh: '', my: '', bn: '' }
              : { ...defect };

            if (language !== 'en') {
              defectText[language] = translationDefect;
            }

            return defectText;
          });
        }

        return {
          ...item,
          itemName,
          defectTypes
        };
      });

      updatedSections[sectionId] = {
        ...section,
        sectionName,
        items: updatedItems
      };
    }

    // Update global defect types
    let defectTypes = template.defectTypes;
    if (defectTypes && defectTypes.length > 0) {
      // For global defect types, we'd need to extract them from the translation data
      // For now, keep them as-is since they're handled at item level
      defectTypes = defectTypes;
    }

    // Update translation metadata
    const translations: Partial<Record<LanguageCode, import('../types/inspection').TranslationMetadata>> = {
      ...(template.translations || {})
    };
    translations[language] = {
      language,
      syncedWithVersion: template.version,
      lastUpdated: new Date(),
      status: 'synced',
      uploadedBy
    };

    return {
      ...template,
      sections: updatedSections,
      defectTypes,
      translations,
      isMultilingual: true,
      updatedAt: new Date()
    };
  }

  /**
   * Convert ParsedChecklistData to InspectionTemplate format
   * Used when uploading a new English template via CSV
   */
  convertToTemplate(
    parsedData: ParsedChecklistData,
    templateId: string
  ): InspectionTemplate {
    logger.info(`Converting parsed data to template: ${templateId}`);

    // Build sections from parsed data
    const sections: Record<string, InspectionSectionTemplate> = {};

    for (const [sectionId, sectionData] of parsedData.sections) {
      const items: InspectionItem[] = Array.from(sectionData.items.values())
        .sort((a, b) => a.itemNumber - b.itemNumber)
        .map(itemData => ({
          itemNumber: itemData.itemNumber,
          itemName: itemData.itemName,
          defectTypes: itemData.defectTypes.length > 0 ? itemData.defectTypes : undefined
        }));

      sections[sectionId] = {
        sectionId: sectionData.sectionId,
        sectionName: sectionData.sectionName,
        items
      };
    }

    // Extract default defect types (collect all unique defect types)
    const allDefectTypes = new Set<string>();
    for (const section of parsedData.sections.values()) {
      for (const item of section.items.values()) {
        item.defectTypes.forEach(dt => allDefectTypes.add(dt));
      }
    }

    const now = new Date();

    return {
      templateId,
      templateName: parsedData.templateName,
      version: '1.0',
      sections,
      defectTypes: Array.from(allDefectTypes),
      createdAt: now,
      updatedAt: now,
      isMultilingual: true,
      translations: {}
    };
  }
}

export const checklistCSVService = new ChecklistCSVService();
