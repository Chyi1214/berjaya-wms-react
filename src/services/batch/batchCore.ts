// Batch Core Service - Basic CRUD Operations
import { collection, getDocs, query, where, doc, setDoc, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CarType, Batch, ZoneBOMMapping } from '../../types/inventory';
import { createModuleLogger } from '../logger';

const logger = createModuleLogger('BatchCore');

export class BatchCoreService {
  // ========= Car Types Collection =========
  async createCarType(carType: Omit<CarType, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating car type:', carType.carCode);
      const newCarType: CarType = {
        ...carType,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'carTypes', carType.carCode), newCarType);
      logger.info('Car type created successfully:', carType.carCode);
      return carType.carCode;
    } catch (error) {
      logger.error('Failed to create car type:', error);
      throw error;
    }
  }

  async getAllCarTypes(): Promise<CarType[]> {
    try {
      const carTypesRef = collection(db, 'carTypes');
      const snapshot = await getDocs(query(carTypesRef, orderBy('carCode')));
      return snapshot.docs.map(doc => ({ ...doc.data() } as CarType));
    } catch (error) {
      logger.error('Failed to get car types:', error);
      throw error;
    }
  }

  // ========= Batch Collection =========
  async createBatch(batch: Omit<Batch, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating batch:', batch.batchId);
      const newBatch: Batch = {
        ...batch,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'batches', batch.batchId), newBatch);
      logger.info('Batch created successfully:', batch.batchId);
      return batch.batchId;
    } catch (error) {
      logger.error('Failed to create batch:', error);
      throw error;
    }
  }

  async getBatchById(batchId: string): Promise<Batch | null> {
    try {
      const batchDocRef = doc(db, 'batches', batchId);
      const batchDoc = await getDoc(batchDocRef);
      if (batchDoc.exists()) {
        return batchDoc.data() as Batch;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get batch by ID: ${batchId}`, error);
      throw error;
    }
  }

  async getAllBatches(): Promise<Batch[]> {
    try {
      const batchesRef = collection(db, 'batches');
      const snapshot = await getDocs(query(batchesRef, orderBy('batchId')));
      return snapshot.docs.map(doc => ({ ...doc.data() } as Batch));
    } catch (error) {
      logger.error('Failed to get batches:', error);
      throw error;
    }
  }

  async deleteBatch(batchId: string): Promise<void> {
    try {
      logger.info('Deleting batch:', batchId);
      
      // Delete batch document
      const batchQuery = query(collection(db, 'batches'), where('batchId', '==', batchId));
      const batchSnapshot = await getDocs(batchQuery);
      
      if (batchSnapshot.empty) {
        throw new Error(`Batch ${batchId} not found`);
      }
      
      // Delete the batch document
      await deleteDoc(batchSnapshot.docs[0].ref);
      
      // Clean up related data
      // Delete batch requirements
      const batchRequirementsCol = collection(db, 'batchRequirements');
      const reqSnapshot = await getDocs(query(batchRequirementsCol, where('batchId', '==', batchId)));
      for (const reqDoc of reqSnapshot.docs) {
        await deleteDoc(reqDoc.ref);
      }
      
      // Delete VIN plans
      const vinPlansCol = collection(db, 'vin_plans');
      const vinSnapshot = await getDocs(query(vinPlansCol, where('batchId', '==', batchId)));
      for (const vinDoc of vinSnapshot.docs) {
        await deleteDoc(vinDoc.ref);
      }
      
      // Delete batch receipts
      const receiptsCol = collection(db, 'batch_receipts');
      const receiptSnapshot = await getDocs(query(receiptsCol, where('batchId', '==', batchId)));
      for (const receiptDoc of receiptSnapshot.docs) {
        await deleteDoc(receiptDoc.ref);
      }
      
      logger.info(`Batch ${batchId} and all related data deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete batch:', error);
      throw error;
    }
  }

  // ========= Zone BOM Mapping Collection =========
  async createZoneBOMMapping(mapping: Omit<ZoneBOMMapping, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Creating zone BOM mapping:', `${mapping.zoneId}-${mapping.carCode}`);
      const newMapping: ZoneBOMMapping = {
        ...mapping,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mappingId = `${mapping.zoneId}_${mapping.carCode}_${mapping.bomCode}`;
      await setDoc(doc(db, 'zoneBOMMappings', mappingId), newMapping);
      logger.info('Zone BOM mapping created successfully:', mappingId);
      return mappingId;
    } catch (error) {
      logger.error('Failed to create zone BOM mapping:', error);
      throw error;
    }
  }

  async getZoneBOMMappings(zoneId?: string, carCode?: string): Promise<ZoneBOMMapping[]> {
    try {
      const mappingsRef = collection(db, 'zoneBOMMappings');
      let q = query(mappingsRef);
      
      if (zoneId) {
        q = query(q, where('zoneId', '==', zoneId));
      }
      if (carCode) {
        q = query(q, where('carCode', '==', carCode));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data() } as ZoneBOMMapping));
    } catch (error) {
      logger.error('Failed to get zone BOM mappings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const batchCoreService = new BatchCoreService();