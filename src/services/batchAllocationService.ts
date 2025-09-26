// Batch Allocation Service - Parallel inventory tracking by batch
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { BatchAllocation, BatchConfig, BatchProgress } from '../types/inventory';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('BatchAllocationService');

// Collection names
const BATCH_ALLOCATIONS_COLLECTION = 'batchAllocations';
const BATCH_CONFIG_COLLECTION = 'batchConfig';

// Utility to clean undefined values before Firestore
const prepareForFirestore = (data: any): any => {
  const cleanData: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      cleanData[key] = data[key];
    }
  });
  return cleanData;
};

// Convert Firestore document to BatchAllocation
const mapFirestoreToBatchAllocation = (data: Record<string, any>): BatchAllocation => ({
  sku: data.sku,
  location: data.location,
  allocations: data.allocations || {},
  totalAllocated: data.totalAllocated || 0,
  lastUpdated: data.lastUpdated?.toDate() || new Date(),
  createdAt: data.createdAt?.toDate() || new Date()
});

// Convert Firestore document to BatchConfig
const mapFirestoreToBatchConfig = (data: Record<string, any>): BatchConfig => ({
  activeBatch: data.activeBatch || '',
  availableBatches: data.availableBatches || [],
  updatedBy: data.updatedBy || '',
  updatedAt: data.updatedAt?.toDate() || new Date(),
  createdAt: data.createdAt?.toDate() || new Date()
});

// Convert to Firestore format
const mapBatchAllocationToFirestore = (allocation: BatchAllocation) => ({
  sku: allocation.sku,
  location: allocation.location,
  allocations: allocation.allocations,
  totalAllocated: allocation.totalAllocated,
  lastUpdated: Timestamp.fromDate(allocation.lastUpdated),
  createdAt: Timestamp.fromDate(allocation.createdAt)
});

const mapBatchConfigToFirestore = (config: BatchConfig) => ({
  activeBatch: config.activeBatch,
  availableBatches: config.availableBatches,
  updatedBy: config.updatedBy,
  updatedAt: Timestamp.fromDate(config.updatedAt),
  createdAt: Timestamp.fromDate(config.createdAt)
});

class BatchAllocationService {
  // ========= Batch Configuration Management =========

  async getBatchConfig(): Promise<BatchConfig | null> {
    try {
      const docRef = doc(db, BATCH_CONFIG_COLLECTION, 'default');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return mapFirestoreToBatchConfig(docSnap.data());
      }

      return null;
    } catch (error) {
      logger.error('Error getting batch configuration:', error);
      throw new Error('Failed to get batch configuration');
    }
  }

  async saveBatchConfig(config: Omit<BatchConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const docRef = doc(db, BATCH_CONFIG_COLLECTION, 'default');

      // Check if document exists
      const existing = await getDoc(docRef);
      const now = new Date();

      const fullConfig: BatchConfig = {
        ...config,
        updatedAt: now,
        createdAt: existing.exists() ? existing.data().createdAt?.toDate() || now : now
      };

      const firestoreData = prepareForFirestore(mapBatchConfigToFirestore(fullConfig));
      await setDoc(docRef, firestoreData);

      logger.info('Batch configuration saved:', { activeBatch: config.activeBatch });
    } catch (error) {
      logger.error('Error saving batch configuration:', error);
      throw new Error('Failed to save batch configuration');
    }
  }

  // ========= Batch Allocation Management =========

  async getBatchAllocation(sku: string, location: string): Promise<BatchAllocation | null> {
    try {
      const docId = `${sku}_${location}`;
      const docRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return mapFirestoreToBatchAllocation(docSnap.data());
      }

      return null;
    } catch (error) {
      logger.error('Error getting batch allocation:', error);
      throw new Error('Failed to get batch allocation');
    }
  }

  async getAllBatchAllocations(): Promise<BatchAllocation[]> {
    try {
      const q = query(
        collection(db, BATCH_ALLOCATIONS_COLLECTION),
        orderBy('lastUpdated', 'desc')
      );

      const snapshot = await getDocs(q);
      const allocations: BatchAllocation[] = [];

      snapshot.forEach((doc) => {
        const allocation = mapFirestoreToBatchAllocation(doc.data());
        allocations.push(allocation);
      });

      logger.debug('Retrieved batch allocations:', { count: allocations.length });
      return allocations;
    } catch (error) {
      logger.error('Error getting batch allocations:', error);
      throw new Error('Failed to get batch allocations');
    }
  }

  async addToBatchAllocation(
    sku: string,
    location: string,
    batchId: string,
    quantity: number
  ): Promise<void> {
    try {
      const docId = `${sku}_${location}`;
      const docRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);

      // Get existing allocation
      const existing = await getDoc(docRef);

      if (existing.exists()) {
        // Update existing allocation
        const currentData = existing.data();
        const currentAllocations = currentData.allocations || {};
        const currentBatchAmount = currentAllocations[batchId] || 0;

        const updatedAllocations = {
          ...currentAllocations,
          [batchId]: currentBatchAmount + quantity
        };

        const totalAllocated = Object.values(updatedAllocations).reduce((sum: number, amount) => sum + (amount as number), 0);

        await updateDoc(docRef, prepareForFirestore({
          allocations: updatedAllocations,
          totalAllocated,
          lastUpdated: Timestamp.now()
        }));

        logger.info(`Updated batch allocation for ${sku} in ${location}:`, {
          batch: batchId,
          added: quantity,
          newTotal: currentBatchAmount + quantity
        });
      } else {
        // Create new allocation
        const newAllocation: BatchAllocation = {
          sku,
          location,
          allocations: { [batchId]: quantity },
          totalAllocated: quantity,
          lastUpdated: new Date(),
          createdAt: new Date()
        };

        const firestoreData = prepareForFirestore(mapBatchAllocationToFirestore(newAllocation));
        await setDoc(docRef, firestoreData);

        logger.info(`Created new batch allocation for ${sku} in ${location}:`, {
          batch: batchId,
          quantity
        });
      }
    } catch (error) {
      logger.error('Error adding to batch allocation:', error);
      throw new Error('Failed to add to batch allocation');
    }
  }

  async removeToBatchAllocation(
    sku: string,
    location: string,
    batchId: string,
    quantity: number
  ): Promise<void> {
    try {
      const docId = `${sku}_${location}`;
      const docRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);

      // Get existing allocation
      const existing = await getDoc(docRef);

      if (!existing.exists()) {
        logger.warn(`No batch allocation found for ${sku} in ${location}`);
        return;
      }

      const currentData = existing.data();
      const currentAllocations = currentData.allocations || {};
      const currentBatchAmount = currentAllocations[batchId] || 0;

      if (currentBatchAmount < quantity) {
        logger.warn(`Insufficient batch allocation: trying to remove ${quantity} but only ${currentBatchAmount} available`);
        // Remove what's available
        quantity = currentBatchAmount;
      }

      const updatedAllocations = { ...currentAllocations };
      const newBatchAmount = currentBatchAmount - quantity;

      if (newBatchAmount <= 0) {
        // Remove batch entirely if zero or negative
        delete updatedAllocations[batchId];
      } else {
        updatedAllocations[batchId] = newBatchAmount;
      }

      const totalAllocated = Object.values(updatedAllocations).reduce((sum: number, amount) => sum + (amount as number), 0);

      await updateDoc(docRef, prepareForFirestore({
        allocations: updatedAllocations,
        totalAllocated,
        lastUpdated: Timestamp.now()
      }));

      logger.info(`Removed from batch allocation for ${sku} in ${location}:`, {
        batch: batchId,
        removed: quantity,
        newAmount: newBatchAmount > 0 ? newBatchAmount : 0
      });
    } catch (error) {
      logger.error('Error removing from batch allocation:', error);
      throw new Error('Failed to remove from batch allocation');
    }
  }

  // ========= Batch Progress Analysis =========

  async getBatchProgress(): Promise<BatchProgress[]> {
    try {
      // Get all batch allocations
      const allocations = await this.getAllBatchAllocations();

      // Group by batch
      const batchTotals = new Map<string, number>();

      for (const allocation of allocations) {
        for (const [batchId, amount] of Object.entries(allocation.allocations)) {
          if (batchId !== 'UNASSIGNED') {
            const current = batchTotals.get(batchId) || 0;
            batchTotals.set(batchId, current + amount);
          }
        }
      }

      // TODO: Compare with expected amounts from BatchRequirement
      // For now, just return what's allocated
      const progress: BatchProgress[] = [];

      for (const [batchId, totalAllocated] of batchTotals) {
        progress.push({
          batchId,
          totalExpected: 0, // TODO: Get from BatchRequirement
          totalAllocated,
          completionPercentage: 0, // TODO: Calculate when we have expected
          lastUpdated: new Date()
        });
      }

      logger.debug('Calculated batch progress:', { batches: progress.length });
      return progress.sort((a, b) => a.batchId.localeCompare(b.batchId));
    } catch (error) {
      logger.error('Error calculating batch progress:', error);
      throw new Error('Failed to calculate batch progress');
    }
  }

  // ========= Batch Allocation Update Methods =========

  async updateBatchAllocation(
    sku: string,
    location: string,
    batchId: string,
    newQuantity: number,
    updatedBy: string
  ): Promise<void> {
    try {
      const docId = `${sku}_${location}`;
      const docRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);

      // Get current allocation
      const existing = await getDoc(docRef);

      if (!existing.exists()) {
        logger.warn('Batch allocation not found for update', { sku, location, batchId });
        return;
      }

      const currentData = mapFirestoreToBatchAllocation(existing.data());

      // Update the specific batch quantity
      const updatedAllocations = {
        ...currentData.allocations,
        [batchId]: Math.max(0, newQuantity) // Ensure non-negative
      };

      // Calculate new total
      const newTotal = Object.values(updatedAllocations).reduce((sum: number, qty: number) => sum + qty, 0);

      const updatedAllocation: BatchAllocation = {
        ...currentData,
        allocations: updatedAllocations,
        totalAllocated: newTotal,
        lastUpdated: new Date()
      };

      const firestoreData = prepareForFirestore(mapBatchAllocationToFirestore(updatedAllocation));
      await updateDoc(docRef, firestoreData);

      logger.info('Batch allocation updated', {
        sku,
        location,
        batchId,
        newQuantity,
        newTotal,
        updatedBy
      });
    } catch (error) {
      logger.error('Error updating batch allocation:', error);
      throw new Error('Failed to update batch allocation');
    }
  }

  // ========= Utility Methods =========

  async initializeDefaultConfig(): Promise<void> {
    try {
      const existing = await this.getBatchConfig();

      if (!existing) {
        await this.saveBatchConfig({
          activeBatch: '001',
          availableBatches: ['001'],
          updatedBy: 'system'
        });

        logger.info('Initialized default batch configuration');
      }
    } catch (error) {
      logger.error('Error initializing batch configuration:', error);
      throw new Error('Failed to initialize batch configuration');
    }
  }
}

export const batchAllocationService = new BatchAllocationService();