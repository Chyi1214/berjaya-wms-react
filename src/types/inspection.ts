// Types for Car Inspection QA System

// Multilingual text support for 5 languages
export interface MultilingualText {
  en: string;  // English
  ms: string;  // Malay
  zh: string;  // Chinese
  my: string;  // Myanmar
  bn: string;  // Bengali
}

// Legacy: Keep string type for backward compatibility
export type DefectType = string;

export type InspectionSection = string;

export type SectionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed';

export type InspectionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed';

// Individual inspection item within a section
export interface InspectionItem {
  itemName: string | MultilingualText;  // Support both legacy and new format
  itemNumber: number;
  defectTypes?: (string | MultilingualText)[];  // Optional custom defect types per item
}

// Result for a single inspection item
export interface InspectionItemResult {
  defectType: string;  // Stored as English key for consistency
  notes?: string;
  photoUrls?: string[];
  checkedAt?: Date;
  checkedBy?: string;
}

// Section configuration in template
export interface InspectionSectionTemplate {
  sectionId: string;
  sectionName: string | MultilingualText;  // Support both legacy and new format
  items: InspectionItem[];
}

// Inspection template (master checklist)
export interface InspectionTemplate {
  templateId: string;
  templateName: string | MultilingualText;  // Support both legacy and new format
  version: string;
  sections: Record<string, InspectionSectionTemplate>;
  defectTypes?: (string | MultilingualText)[];  // Global defect types (legacy support)
  createdAt: Date;
  updatedAt: Date;
  isMultilingual?: boolean;  // Flag to indicate new multilingual format
}

// Section results within a car inspection
export interface InspectionSectionResult {
  status: SectionStatus;
  inspector: string | null; // email
  inspectorName: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  results: Record<string, InspectionItemResult>; // key = item name
}

// Complete car inspection record
export interface CarInspection {
  inspectionId: string;
  vin: string;
  carType?: string;
  batchId?: string;
  templateId: string;
  status: InspectionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  sections: Record<InspectionSection, InspectionSectionResult>;
  createdAt: Date;
  updatedAt: Date;
}

// Summary statistics for an inspection
export interface InspectionSummary {
  totalSections: number;
  completedSections: number;
  totalDefects: number;
  defectsByType: Record<DefectType, number>;
  inspectors: string[];
}
