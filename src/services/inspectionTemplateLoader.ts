// Inspection Template Loader - Load default inspection templates into Firebase
import { inspectionService } from './inspectionService';
import type {
  InspectionTemplate,
  InspectionSection,
  InspectionSectionTemplate,
  InspectionItem,
  DefectType,
} from '../types/inspection';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('InspectionTemplateLoader');

// Default inspection template based on CSV data
const DEFAULT_TEMPLATE_ID = 'vehicle_inspection_v1';

const DEFECT_TYPES: DefectType[] = [
  'Not installed properly',
  'Scratches',
  'Paint Defect',
  'Dent',
  'Gap',
  'Ok',
];

// Right Outside inspection items
const RIGHT_OUTSIDE_ITEMS: InspectionItem[] = [
  { itemNumber: 1, itemName: 'Front fender surface' },
  { itemNumber: 2, itemName: 'Front fender leaf' },
  { itemNumber: 3, itemName: 'Rim surface' },
  { itemNumber: 4, itemName: 'Rimcap' },
  { itemNumber: 5, itemName: 'Tyre' },
  { itemNumber: 6, itemName: 'Side mirror cover' },
  { itemNumber: 7, itemName: 'Side mirror signal indicator' },
  { itemNumber: 8, itemName: 'Side mirror glass' },
  { itemNumber: 9, itemName: 'Front door upper trim strip' },
  { itemNumber: 10, itemName: 'Front window glass' },
  { itemNumber: 11, itemName: 'Front door lower trim strip' },
  { itemNumber: 12, itemName: 'Front door surface' },
  { itemNumber: 13, itemName: 'Front door handle' },
  { itemNumber: 14, itemName: 'Front right door skriting' },
  { itemNumber: 15, itemName: 'Rear door upper trim strip' },
  { itemNumber: 16, itemName: 'Rear window glass' },
  { itemNumber: 17, itemName: 'Rear door lower trim strip' },
  { itemNumber: 18, itemName: 'Rear door surface' },
  { itemNumber: 19, itemName: 'Rear door handle' },
  { itemNumber: 20, itemName: 'Rear right door skriting' },
  { itemNumber: 21, itemName: 'Rear right door leaf' },
  { itemNumber: 22, itemName: 'Rear trim strip' },
  { itemNumber: 23, itemName: 'Rear triangle mirror' },
  { itemNumber: 24, itemName: 'Rear fender surface' },
  { itemNumber: 25, itemName: 'Rear fender leaf' },
  { itemNumber: 26, itemName: 'Rim surface' },
  { itemNumber: 27, itemName: 'Rim cap' },
  { itemNumber: 28, itemName: 'Tyre' },
];

// Left Outside inspection items (same as right)
const LEFT_OUTSIDE_ITEMS: InspectionItem[] = RIGHT_OUTSIDE_ITEMS;

// Front & Back inspection items
const FRONT_BACK_ITEMS: InspectionItem[] = [
  { itemNumber: 1, itemName: 'Windscreen' },
  { itemNumber: 2, itemName: 'Windscreen rubber strip' },
  { itemNumber: 3, itemName: 'Wiper' },
  { itemNumber: 4, itemName: 'Hood surface ( outside )' },
  { itemNumber: 5, itemName: 'Emblem JETUOR' },
  { itemNumber: 6, itemName: 'Heat shield' },
  { itemNumber: 7, itemName: 'Heat shield clip' },
  { itemNumber: 8, itemName: 'Head lamp' },
  { itemNumber: 9, itemName: 'Front bumper' },
  { itemNumber: 10, itemName: 'Front bumper grill' },
  { itemNumber: 11, itemName: 'Front bumper lamp' },
  { itemNumber: 12, itemName: 'Front bumper lip' },
  { itemNumber: 13, itemName: 'Rear emblem JETUOR' },
  { itemNumber: 14, itemName: 'Rear emblem VT9/DASHING' },
  { itemNumber: 15, itemName: 'Rear spoiler' },
  { itemNumber: 16, itemName: 'Third brake lamp' },
  { itemNumber: 17, itemName: 'Wiper nozzle' },
  { itemNumber: 18, itemName: 'Rear windscreen' },
  { itemNumber: 19, itemName: 'Wiper' },
  { itemNumber: 20, itemName: 'Tail lamp' },
  { itemNumber: 21, itemName: 'Rear trunk surface' },
  { itemNumber: 22, itemName: 'Reflector' },
  { itemNumber: 23, itemName: 'Rear bumper' },
  { itemNumber: 24, itemName: 'Reflector' },
  { itemNumber: 25, itemName: 'Rear trunk surface ( inside )' },
  { itemNumber: 26, itemName: 'Rear trunk upper cover' },
  { itemNumber: 27, itemName: 'Rear trunk lower cover' },
  { itemNumber: 28, itemName: 'Tools and equipment' },
];

// Interior inspection items
const INTERIOR_ITEMS: InspectionItem[] = [
  { itemNumber: 1, itemName: 'Door surface' },
  { itemNumber: 2, itemName: 'Front door panel' },
  { itemNumber: 3, itemName: 'Door trim rubber' },
  { itemNumber: 4, itemName: 'Front door D surface' },
  { itemNumber: 5, itemName: 'Door sill' },
  { itemNumber: 6, itemName: 'Door sill plastic cover' },
  { itemNumber: 7, itemName: 'Front seat back rest leather' },
  { itemNumber: 8, itemName: 'Front seat leather' },
  { itemNumber: 9, itemName: 'Front seat cover' },
  { itemNumber: 10, itemName: 'Dash board ( upper )' },
  { itemNumber: 11, itemName: 'Dash board ( lower )' },
  { itemNumber: 12, itemName: 'Signal/wiper assy cover' },
  { itemNumber: 13, itemName: 'Steering' },
  { itemNumber: 14, itemName: 'Wireless Charger cover' },
  { itemNumber: 15, itemName: 'Gear knob' },
  { itemNumber: 16, itemName: 'Arm rest surface' },
  { itemNumber: 17, itemName: 'Air bag' },
  { itemNumber: 18, itemName: 'Sun visor' },
  { itemNumber: 19, itemName: 'A pillar' },
  { itemNumber: 20, itemName: 'B pillar' },
  { itemNumber: 21, itemName: 'B pillar Air bag cap' },
  { itemNumber: 22, itemName: 'Seat belt' },
  { itemNumber: 23, itemName: 'Back seat back rest leather' },
  { itemNumber: 24, itemName: 'Back seat leather' },
  { itemNumber: 25, itemName: 'Back seat rubber plug' },
  { itemNumber: 26, itemName: 'Rear interior panel' },
  { itemNumber: 27, itemName: 'Roof lining' },
];

export function buildDefaultTemplate(): InspectionTemplate {
  const sections: Record<InspectionSection, InspectionSectionTemplate> = {
    right_outside: {
      sectionId: 'right_outside',
      sectionName: 'Right Outside',
      items: RIGHT_OUTSIDE_ITEMS,
    },
    left_outside: {
      sectionId: 'left_outside',
      sectionName: 'Left Outside',
      items: LEFT_OUTSIDE_ITEMS,
    },
    front_back: {
      sectionId: 'front_back',
      sectionName: 'Front & Back',
      items: FRONT_BACK_ITEMS,
    },
    interior_right: {
      sectionId: 'interior_right',
      sectionName: 'Interior Right',
      items: INTERIOR_ITEMS,
    },
    interior_left: {
      sectionId: 'interior_left',
      sectionName: 'Interior Left',
      items: INTERIOR_ITEMS,
    },
  };

  return {
    templateId: DEFAULT_TEMPLATE_ID,
    templateName: 'Vehicle Inspection Checklist v1',
    version: '1.0',
    sections,
    defectTypes: DEFECT_TYPES,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function loadDefaultTemplate(): Promise<void> {
  try {
    logger.info('Ensuring default inspection template exists...');

    // Check if template already exists
    const existing = await inspectionService.getTemplate(DEFAULT_TEMPLATE_ID);
    if (existing) {
      // Check if defectTypes exists in the template
      if (!existing.defectTypes || existing.defectTypes.length === 0) {
        logger.info('Template exists but missing defect types. Updating...');
        const template = buildDefaultTemplate();
        await inspectionService.createTemplate(template); // setDoc will overwrite
        logger.info('Template updated with defect types');
      } else {
        logger.info('Default template already exists with defect types');
      }
      return;
    }

    // Create template if it doesn't exist
    const template = buildDefaultTemplate();
    await inspectionService.createTemplate(template);

    logger.info('Default inspection template created successfully');
  } catch (error) {
    logger.error('Failed to ensure default template:', error);
    throw error;
  }
}

// Auto-load template on app initialization
export async function ensureTemplateExists(): Promise<void> {
  await loadDefaultTemplate();
}
