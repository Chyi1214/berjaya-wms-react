// Inspection Service - Car QA Inspection Management
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  updateDoc,
  orderBy,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from './costTracking/firestoreWrapper';
import { runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { createModuleLogger } from './logger';
import type {
  InspectionTemplate,
  CarInspection,
  InspectionSection,
  DefectType,
  InspectionItemResult,
  InspectionSectionResult,
  InspectionSummary,
  AdditionalDefect,
} from '../types/inspection';

const logger = createModuleLogger('InspectionService');

const TEMPLATES_COL = 'inspectionTemplates';
const INSPECTIONS_COL = 'carInspections';

// Sanitize field names for Firestore (replace invalid characters)
// Firestore field names cannot contain: / $ # [ ] * ~ .
function sanitizeFieldName(name: string): string {
  let sanitized = name.replace(/[~/\*\[\]\$\#\.]/g, '_');
  // Ensure the field name doesn't start with an underscore (from leading period)
  // This maintains readability while staying Firestore-compliant
  return sanitized;
}

// Remove undefined values from an object (Firestore doesn't allow undefined)
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== undefined) as T;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

// Convert Firestore Timestamp to Date
function convertTimestamps<T>(data: any): T {
  // Handle null or undefined
  if (data === null || data === undefined) {
    return data as T;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data as T;
  }

  // Handle Firestore Timestamp
  if (data?.toDate && typeof data.toDate === 'function') {
    return data.toDate() as T;
  }

  // Handle arrays - don't recurse into arrays to preserve item structure
  if (Array.isArray(data)) {
    return data as T;
  }

  // Handle objects - recursively convert nested objects
  const converted: Record<string, unknown> = {};
  Object.keys(data).forEach((key) => {
    converted[key] = convertTimestamps(data[key]);
  });
  return converted as T;
}

export const inspectionService = {
  // ========= Templates =========

  async getTemplate(templateId: string): Promise<InspectionTemplate | null> {
    try {
      const docRef = doc(db, TEMPLATES_COL, templateId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return convertTimestamps<InspectionTemplate>(docSnap.data());
    } catch (error) {
      logger.error('Failed to get template:', error);
      throw error;
    }
  },

  // Subscribe to real-time updates for a template
  subscribeToTemplate(
    templateId: string,
    onUpdate: (template: InspectionTemplate | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const docRef = doc(db, TEMPLATES_COL, templateId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onUpdate(null);
          return;
        }

        const template = convertTimestamps<InspectionTemplate>(docSnap.data());
        onUpdate(template);
      },
      (error) => {
        logger.error('Template subscription error:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  },

  async getAllTemplates(): Promise<InspectionTemplate[]> {
    try {
      const q = query(collection(db, TEMPLATES_COL), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertTimestamps<InspectionTemplate>(doc.data()));
    } catch (error) {
      logger.error('Failed to get templates:', error);
      throw error;
    }
  },

  async createTemplate(template: Omit<InspectionTemplate, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating inspection template:', template.templateId);

      // Remove undefined values (Firestore doesn't allow them)
      const cleanedTemplate = removeUndefined(template);

      const newTemplate: InspectionTemplate = {
        ...cleanedTemplate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Also clean the final object before sending to Firestore
      const firestoreData = removeUndefined({
        ...newTemplate,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await setDoc(doc(db, TEMPLATES_COL, template.templateId), firestoreData);

      logger.info('Template created successfully:', template.templateId);
      return template.templateId;
    } catch (error) {
      logger.error('Failed to create template:', error);
      throw error;
    }
  },

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      logger.info('Deleting template:', templateId);
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, TEMPLATES_COL, templateId));
      logger.info('Template deleted successfully:', templateId);
    } catch (error) {
      logger.error('Failed to delete template:', error);
      throw error;
    }
  },

  // ========= Inspections =========

  async createInspection(
    vin: string,
    templateId: string,
    batchId?: string,
    gateInfo?: { gateId: string; gateIndex: number; gateName: string }
  ): Promise<string> {
    try {
      logger.info('Creating inspection for VIN:', { vin, gate: gateInfo?.gateName });

      // Check if inspection already exists for this VIN+Gate combination
      // Each gate should have its own independent inspection
      if (gateInfo) {
        const existing = await this.getInspectionByVINAndGate(vin, gateInfo.gateId);
        if (existing) {
          logger.warn('Inspection already exists for VIN at this gate:', { vin, gate: gateInfo.gateName });
          return existing.inspectionId;
        }
      } else {
        // Fallback for cases without gate info (shouldn't happen in normal flow)
        const existing = await this.getInspectionByVIN(vin);
        if (existing) {
          logger.warn('Inspection already exists for VIN:', vin);
          return existing.inspectionId;
        }
      }

      // Get template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Initialize sections
      const sections: Record<InspectionSection, InspectionSectionResult> = {
        right_outside: {
          status: 'not_started',
          inspector: null,
          inspectorName: null,
          startedAt: null,
          completedAt: null,
          results: {},
        },
        left_outside: {
          status: 'not_started',
          inspector: null,
          inspectorName: null,
          startedAt: null,
          completedAt: null,
          results: {},
        },
        front_back: {
          status: 'not_started',
          inspector: null,
          inspectorName: null,
          startedAt: null,
          completedAt: null,
          results: {},
        },
        interior_right: {
          status: 'not_started',
          inspector: null,
          inspectorName: null,
          startedAt: null,
          completedAt: null,
          results: {},
        },
        interior_left: {
          status: 'not_started',
          inspector: null,
          inspectorName: null,
          startedAt: null,
          completedAt: null,
          results: {},
        },
      };

      const inspectionId = `INS_${vin}_${Date.now()}`;
      const inspection: CarInspection = {
        inspectionId,
        vin,
        templateId,
        status: 'not_started',
        startedAt: null,
        completedAt: null,
        sections,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(batchId && { batchId }),
        ...(gateInfo && {
          gateId: gateInfo.gateId,
          gateIndex: gateInfo.gateIndex,
          gateName: gateInfo.gateName,
        }),
      };

      await setDoc(doc(db, INSPECTIONS_COL, inspectionId), {
        ...inspection,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info('Inspection created successfully:', inspectionId);
      return inspectionId;
    } catch (error) {
      logger.error('Failed to create inspection:', error);
      throw error;
    }
  },

  async getInspectionById(inspectionId: string): Promise<CarInspection | null> {
    try {
      const docRef = doc(db, INSPECTIONS_COL, inspectionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return convertTimestamps<CarInspection>(docSnap.data());
    } catch (error) {
      logger.error('Failed to get inspection:', error);
      throw error;
    }
  },

  // Subscribe to real-time updates for an inspection
  subscribeToInspection(
    inspectionId: string,
    onUpdate: (inspection: CarInspection | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const docRef = doc(db, INSPECTIONS_COL, inspectionId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onUpdate(null);
          return;
        }

        const inspection = convertTimestamps<CarInspection>(docSnap.data());
        onUpdate(inspection);
      },
      (error) => {
        logger.error('Inspection subscription error:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  },

  async getInspectionByVIN(vin: string): Promise<CarInspection | null> {
    try {
      const q = query(collection(db, INSPECTIONS_COL), where('vin', '==', vin));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return convertTimestamps<CarInspection>(snapshot.docs[0].data());
    } catch (error) {
      logger.error('Failed to get inspection by VIN:', error);
      throw error;
    }
  },

  // Get inspection by VIN and Gate (for gate-specific operations)
  async getInspectionByVINAndGate(vin: string, gateId: string): Promise<CarInspection | null> {
    try {
      const q = query(
        collection(db, INSPECTIONS_COL),
        where('vin', '==', vin),
        where('gateId', '==', gateId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      return convertTimestamps<CarInspection>(snapshot.docs[0].data());
    } catch (error) {
      logger.error('Failed to get inspection by VIN and Gate:', error);
      throw error;
    }
  },

  // Get all inspections for a specific VIN across all gates
  async getInspectionsByVIN(vin: string): Promise<CarInspection[]> {
    try {
      const q = query(
        collection(db, INSPECTIONS_COL),
        where('vin', '==', vin)
      );
      const snapshot = await getDocs(q);
      const inspections = snapshot.docs.map(doc => convertTimestamps<CarInspection>(doc.data()));

      // Sort by gateIndex in JavaScript (no index needed)
      return inspections.sort((a, b) => (a.gateIndex || 0) - (b.gateIndex || 0));
    } catch (error) {
      logger.error('Failed to get inspections by VIN:', error);
      throw error;
    }
  },

  async getAllInspections(): Promise<CarInspection[]> {
    try {
      const q = query(collection(db, INSPECTIONS_COL), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertTimestamps<CarInspection>(doc.data()));
    } catch (error) {
      logger.error('Failed to get inspections:', error);
      throw error;
    }
  },

  async getInspectionsByDateRange(startDate: Date, endDate: Date): Promise<CarInspection[]> {
    try {
      const q = query(
        collection(db, INSPECTIONS_COL),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertTimestamps<CarInspection>(doc.data()));
    } catch (error) {
      logger.error('Failed to get inspections by date range:', error);
      throw error;
    }
  },

  // ========= Section Operations =========

  async startSection(
    inspectionId: string,
    section: InspectionSection,
    userEmail: string,
    userName: string
  ): Promise<void> {
    try {
      logger.info('Starting section:', { inspectionId, section, userEmail });

      return runTransaction(db, async (tx) => {
        const docRef = doc(db, INSPECTIONS_COL, inspectionId);
        const docSnap = await tx.get(docRef);

        if (!docSnap.exists()) {
          throw new Error(`Inspection not found: ${inspectionId}`);
        }

        const inspectionData = docSnap.data();
        if (!inspectionData) {
          throw new Error(`Inspection data is null: ${inspectionId}`);
        }

        // Check if this is the first section being started
        const isFirstSection = inspectionData.status === 'not_started';

        // Update only the specific fields (no spreading)
        const updates: Record<string, unknown> = {
          [`sections.${section}.status`]: 'in_progress',
          [`sections.${section}.inspector`]: userEmail,
          [`sections.${section}.inspectorName`]: userName,
          [`sections.${section}.startedAt`]: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // If this is the first section, update overall status
        if (isFirstSection) {
          updates.status = 'in_progress';
          updates.startedAt = Timestamp.now();
        }

        tx.update(docRef, updates);
      });
    } catch (error) {
      logger.error('Failed to start section:', error);
      throw error;
    }
  },

  async recordDefect(
    inspectionId: string,
    section: InspectionSection,
    itemName: string,
    result: InspectionItemResult
  ): Promise<void> {
    try {
      logger.info('Recording defect:', { inspectionId, section, itemName, defectType: result.defectType });

      const docRef = doc(db, INSPECTIONS_COL, inspectionId);

      // Sanitize item name for Firestore field path
      const sanitizedItemName = sanitizeFieldName(itemName);

      // Don't spread result - build the object manually to ensure only Firestore-safe values
      const resultData: any = {
        defectType: result.defectType,
        notes: result.notes || null,
        checkedBy: result.checkedBy,
        checkedAt: Timestamp.now(),
      };

      // Include defect location if provided
      if (result.defectLocation) {
        resultData.defectLocation = {
          x: result.defectLocation.x,
          y: result.defectLocation.y,
          imageId: result.defectLocation.imageId,
          dotNumber: result.defectLocation.dotNumber,
        };
      }

      await updateDoc(docRef, {
        [`sections.${section}.results.${sanitizedItemName}`]: resultData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      logger.error('Failed to record defect:', error);
      throw error;
    }
  },

  async addAdditionalDefect(
    inspectionId: string,
    section: InspectionSection,
    itemName: string,
    defectData: {
      defectType: string;
      defectLocation?: { x: number; y: number; imageId: string; dotNumber: number };
      notes?: string;
      checkedBy: string;
    }
  ): Promise<void> {
    try {
      logger.info('Adding additional defect:', { inspectionId, section, itemName, defectType: defectData.defectType });

      return runTransaction(db, async (tx) => {
        const docRef = doc(db, INSPECTIONS_COL, inspectionId);
        const docSnap = await tx.get(docRef);

        if (!docSnap.exists()) {
          throw new Error(`Inspection not found: ${inspectionId}`);
        }

        const inspection = convertTimestamps<CarInspection>(docSnap.data());
        const sanitizedItemName = sanitizeFieldName(itemName);

        // Get existing result or create a default "Ok" entry if item hasn't been checked yet
        let existingResult = inspection.sections[section].results[sanitizedItemName];
        const updates: Record<string, any> = {};

        if (!existingResult) {
          // Item hasn't been checked yet - create a default "Ok" result entry
          logger.info('Item not checked yet, creating default entry:', { itemName });

          existingResult = {
            defectType: 'Ok',
            checkedBy: defectData.checkedBy,
            checkedAt: new Date(),
            additionalDefects: [],
          };

          // Add the default result to updates
          updates[`sections.${section}.results.${sanitizedItemName}`] = {
            defectType: 'Ok',
            checkedBy: defectData.checkedBy,
            checkedAt: Timestamp.now(),
          };
        }

        // Get existing additional defects array or initialize empty
        const existingAdditional = existingResult.additionalDefects || [];

        // Check limit (max 20 additional defects per item)
        if (existingAdditional.length >= 20) {
          throw new Error('Maximum limit of 20 additional defects per item reached');
        }

        // Build new additional defect
        const newDefect: any = {
          defectType: defectData.defectType,
          notes: defectData.notes || null,
          checkedBy: defectData.checkedBy,
          checkedAt: Timestamp.now(),
        };

        if (defectData.defectLocation) {
          newDefect.defectLocation = {
            x: defectData.defectLocation.x,
            y: defectData.defectLocation.y,
            imageId: defectData.defectLocation.imageId,
            dotNumber: defectData.defectLocation.dotNumber,
          };
        }

        // Append to array
        const updatedAdditional = [...existingAdditional, newDefect];

        // Update Firestore
        updates[`sections.${section}.results.${sanitizedItemName}.additionalDefects`] = updatedAdditional;
        updates.updatedAt = Timestamp.now();

        tx.update(docRef, updates);

        logger.info('Additional defect added successfully:', {
          inspectionId,
          section,
          itemName,
          totalAdditional: updatedAdditional.length,
          createdDefaultEntry: !inspection.sections[section].results[sanitizedItemName],
        });
      });
    } catch (error) {
      logger.error('Failed to add additional defect:', error);
      throw error;
    }
  },

  async completeSection(inspectionId: string, section: InspectionSection): Promise<void> {
    try {
      logger.info('Completing section:', { inspectionId, section });

      return runTransaction(db, async (tx) => {
        const docRef = doc(db, INSPECTIONS_COL, inspectionId);
        const docSnap = await tx.get(docRef);

        if (!docSnap.exists()) {
          throw new Error(`Inspection not found: ${inspectionId}`);
        }

        const inspection = convertTimestamps<CarInspection>(docSnap.data());

        // Update section
        inspection.sections[section].status = 'completed';
        inspection.sections[section].completedAt = new Date();

        // Check if all sections are completed
        const allCompleted = Object.values(inspection.sections).every(
          s => s.status === 'completed'
        );

        if (allCompleted) {
          inspection.status = 'completed';
          inspection.completedAt = new Date();
        }

        inspection.updatedAt = new Date();

        tx.update(docRef, {
          [`sections.${section}.status`]: 'completed',
          [`sections.${section}.completedAt`]: Timestamp.now(),
          status: inspection.status,
          completedAt: inspection.completedAt ? Timestamp.fromDate(inspection.completedAt) : null,
          updatedAt: Timestamp.now(),
        });
      });
    } catch (error) {
      logger.error('Failed to complete section:', error);
      throw error;
    }
  },

  // ========= Utilities =========

  getInspectionSummary(inspection: CarInspection): InspectionSummary {
    const totalSections = Object.keys(inspection.sections).length;
    const completedSections = Object.values(inspection.sections).filter(
      s => s.status === 'completed'
    ).length;

    // Dynamically discover defect types from actual data
    const defectsByType: Record<DefectType, number> = {};

    const inspectorsSet = new Set<string>();
    let totalDefects = 0;

    Object.values(inspection.sections).forEach(section => {
      // Prefer inspectorName over email
      if (section.inspectorName) {
        inspectorsSet.add(section.inspectorName);
      } else if (section.inspector) {
        inspectorsSet.add(section.inspector);
      }

      Object.values(section.results).forEach(result => {
        // Initialize counter if this defect type hasn't been seen yet
        if (!defectsByType[result.defectType]) {
          defectsByType[result.defectType] = 0;
        }
        defectsByType[result.defectType]++;

        if (result.defectType !== 'Ok') {
          totalDefects++;
        }

        // Count additional defects (backwards compatibility: treat undefined as empty array)
        const additionalDefects = result.additionalDefects || [];
        additionalDefects.forEach((additionalDefect: AdditionalDefect) => {
          // Initialize counter if this defect type hasn't been seen yet
          if (!defectsByType[additionalDefect.defectType]) {
            defectsByType[additionalDefect.defectType] = 0;
          }
          defectsByType[additionalDefect.defectType]++;

          // Additional defects are always actual defects (never "Ok")
          totalDefects++;
        });
      });
    });

    return {
      totalSections,
      completedSections,
      totalDefects,
      defectsByType,
      inspectors: Array.from(inspectorsSet),
    };
  },

  async deleteInspection(inspectionId: string): Promise<void> {
    try {
      logger.info('Deleting inspection:', inspectionId);

      // Get inspection first to check for photos
      const inspection = await this.getInspectionById(inspectionId);
      if (!inspection) {
        logger.warn('Inspection not found:', inspectionId);
        return;
      }

      // Clean up any photo storage if photoUrls exist
      const photoUrls: string[] = [];
      Object.values(inspection.sections).forEach((section) => {
        Object.values(section.results).forEach((result) => {
          if (result.photoUrls && result.photoUrls.length > 0) {
            photoUrls.push(...result.photoUrls);
          }
        });
      });

      // If there are photos, delete them from Firebase Storage
      if (photoUrls.length > 0) {
        try {
          const { getStorage, ref, deleteObject } = await import('firebase/storage');
          const storage = getStorage();

          logger.info(`Deleting ${photoUrls.length} photos from storage`);
          await Promise.all(
            photoUrls.map(async (url) => {
              try {
                const photoRef = ref(storage, url);
                await deleteObject(photoRef);
              } catch (photoError) {
                logger.warn(`Failed to delete photo ${url}:`, photoError);
                // Continue deletion even if photo deletion fails
              }
            })
          );
        } catch (storageError) {
          logger.warn('Storage deletion failed, continuing with document deletion:', storageError);
        }
      }

      // Delete the inspection document from Firestore
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, INSPECTIONS_COL, inspectionId));

      logger.info('Inspection deleted successfully:', inspectionId);
    } catch (error) {
      logger.error('Failed to delete inspection:', error);
      throw error;
    }
  },

  // Mark a defect as resolved
  async markDefectAsResolved(
    inspectionId: string,
    section: InspectionSection,
    itemName: string,
    resolvedBy: string,
    resolvedByName: string,
    resolutionNote?: string,
    additionalDefectIndex?: number
  ): Promise<void> {
    try {
      logger.info('Marking defect as resolved:', {
        inspectionId,
        section,
        itemName,
        resolvedBy,
        additionalDefectIndex,
      });

      return runTransaction(db, async (tx) => {
        const docRef = doc(db, INSPECTIONS_COL, inspectionId);
        const docSnap = await tx.get(docRef);

        if (!docSnap.exists()) {
          throw new Error(`Inspection not found: ${inspectionId}`);
        }

        const inspection = convertTimestamps<CarInspection>(docSnap.data());
        const sanitizedItemName = sanitizeFieldName(itemName);
        const existingResult = inspection.sections[section].results[sanitizedItemName];

        if (!existingResult) {
          throw new Error(`Item result not found: ${itemName}`);
        }

        const updates: Record<string, any> = {};

        if (additionalDefectIndex !== undefined) {
          // Marking an additional defect as resolved
          if (
            !existingResult.additionalDefects ||
            additionalDefectIndex >= existingResult.additionalDefects.length
          ) {
            throw new Error(`Additional defect not found at index ${additionalDefectIndex}`);
          }

          // Update the specific additional defect in the array
          const updatedAdditionalDefects = existingResult.additionalDefects.map((defect, idx) => {
            if (idx === additionalDefectIndex) {
              return {
                defectType: defect.defectType,
                notes: defect.notes || null,
                checkedBy: defect.checkedBy,
                checkedAt: defect.checkedAt instanceof Date ? Timestamp.fromDate(defect.checkedAt) : defect.checkedAt,
                status: 'Resolved',
                resolvedBy: resolvedByName,
                resolvedAt: Timestamp.now(),
                ...(resolutionNote && { resolutionNote }),
                ...(defect.defectLocation && { defectLocation: defect.defectLocation }),
              };
            }
            // For other defects, convert Date back to Timestamp if needed
            return {
              defectType: defect.defectType,
              notes: defect.notes || null,
              checkedBy: defect.checkedBy,
              checkedAt: defect.checkedAt instanceof Date ? Timestamp.fromDate(defect.checkedAt) : defect.checkedAt,
              ...(defect.status && { status: defect.status }),
              ...(defect.resolvedBy && { resolvedBy: defect.resolvedBy }),
              ...(defect.resolvedAt && {
                resolvedAt: defect.resolvedAt instanceof Date ? Timestamp.fromDate(defect.resolvedAt) : defect.resolvedAt,
              }),
              ...(defect.resolutionNote && { resolutionNote: defect.resolutionNote }),
              ...(defect.defectLocation && { defectLocation: defect.defectLocation }),
            };
          });

          updates[`sections.${section}.results.${sanitizedItemName}.additionalDefects`] =
            updatedAdditionalDefects;
        } else {
          // Marking the main defect as resolved
          updates[`sections.${section}.results.${sanitizedItemName}.status`] = 'Resolved';
          updates[`sections.${section}.results.${sanitizedItemName}.resolvedBy`] = resolvedByName;
          updates[`sections.${section}.results.${sanitizedItemName}.resolvedAt`] = Timestamp.now();
          if (resolutionNote) {
            updates[`sections.${section}.results.${sanitizedItemName}.resolutionNote`] = resolutionNote;
          }
        }

        updates.updatedAt = Timestamp.now();

        tx.update(docRef, updates);
        logger.info('Defect marked as resolved successfully');
      });
    } catch (error) {
      logger.error('Failed to mark defect as resolved:', error);
      throw error;
    }
  },
};
