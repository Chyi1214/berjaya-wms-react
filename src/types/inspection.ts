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

// Defect location on section image
export interface DefectLocation {
  x: number;          // Percentage position (0-100) on image width
  y: number;          // Percentage position (0-100) on image height
  imageId: string;    // Which section image the dot is placed on
  dotNumber: number;  // Sequential number for matching to defect in report (1, 2, 3...)
}

// Additional defect that can be added beyond the main checklist result
export interface AdditionalDefect {
  defectType: string;         // Stored as English key for consistency
  defectLocation?: DefectLocation;  // Optional location marker
  notes?: string;
  checkedBy: string;
  checkedAt: Date;
  status?: string;            // Track defect resolution status
}

// Section image for defect location marking
export interface SectionImage {
  imageId: string;
  imageUrl: string;
  imageName: string;
  size?: number;      // File size in bytes (for matching duplicate images)
  uploadedAt: Date;
  uploadedBy?: string;
}

// Result for a single inspection item
export interface InspectionItemResult {
  defectType: string;  // Stored as English key for consistency
  notes?: string;
  photoUrls?: string[];
  checkedAt?: Date;
  checkedBy?: string;
  status?: string;  // Track defect resolution status (e.g., "Pending", "Fixed", "Acknowledged")
  defectLocation?: DefectLocation;  // Location marked on section image (required for defects, not for "Ok")
  additionalDefects?: AdditionalDefect[];  // Additional defects found at same item (max 20)
}

// Section configuration in template
export interface InspectionSectionTemplate {
  sectionId: string;
  sectionName: string | MultilingualText;  // Support both legacy and new format
  items: InspectionItem[];
  images?: SectionImage[];  // Section images for defect location marking
}

// Translation status for a specific language
export type TranslationStatus = 'synced' | 'outdated' | 'missing';

export type LanguageCode = 'en' | 'ms' | 'zh' | 'my' | 'bn';

// Translation metadata for tracking sync status
export interface TranslationMetadata {
  language: LanguageCode;
  syncedWithVersion: string;  // Which English version this translation matches
  lastUpdated: Date;
  status: TranslationStatus;
  uploadedBy?: string;
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
  translations?: Partial<Record<LanguageCode, TranslationMetadata>>;  // Track translation sync status (not all languages required)
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
  gateId?: string;        // Quality gate ID
  gateIndex?: number;     // Gate index for sorting/filtering
  gateName?: string;      // Gate name for display
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
