// Batch Allocation Service - Parallel inventory tracking by batch
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
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

// Convert Firestore document to BatchConfig (kept for saveBatchConfig compatibility)
// No longer used by getBatchConfig which now dynamically fetches activated batches

// Convert to Firestore format
const mapBatchAllocationToFirestore = (allocation: BatchAllocation) => ({
  sku: allocation.sku,
  location: allocation.location,
  allocations: allocation.allocations,
  totalAllocated: allocation.totalAllocated,
  lastUpdated: Timestamp.fromDate(allocation.lastUpdated),
  createdAt: Timestamp.fromDate(allocation.createdAt)
});

// mapBatchConfigToFirestore removed - no longer needed as we save minimal config data directly

class BatchAllocationService {
  // ========= Batch Configuration Management =========

  /**
   * Get activated batches dynamically from the batches collection
   * Only returns batches with status = 'in_progress'
   * OPTIMIZED: Uses where clause to filter at database level
   */
  async getActivatedBatches(): Promise<string[]> {
    try {
      const batchesRef = collection(db, 'batches');
      // OPTIMIZED: Filter by status at database level for better performance
      const q = query(
        batchesRef,
        where('status', '==', 'in_progress'),
        orderBy('batchId')
      );
      const snapshot = await getDocs(q);

      const activatedBatches: string[] = [];
      snapshot.forEach((doc) => {
        const batch = doc.data();
        activatedBatches.push(batch.batchId);
      });

      logger.info('Found activated batches:', { count: activatedBatches.length, batches: activatedBatches });
      return activatedBatches;
    } catch (error) {
      logger.error('Error getting activated batches:', error);
      throw new Error('Failed to get activated batches');
    }
  }

  async getBatchConfig(): Promise<BatchConfig | null> {
    try {
      // UPDATED: Dynamically fetch activated batches
      const activatedBatches = await this.getActivatedBatches();

      if (activatedBatches.length === 0) {
        logger.warn('No activated batches found');
        return null;
      }

      // Check if there's a stored default batch preference
      const docRef = doc(db, BATCH_CONFIG_COLLECTION, 'default');
      const docSnap = await getDoc(docRef);

      let defaultBatch = activatedBatches[0]; // Fallback to first activated batch

      if (docSnap.exists()) {
        const storedDefault = docSnap.data().activeBatch;
        // Only use stored default if it's still in the activated batches list
        if (storedDefault && activatedBatches.includes(storedDefault)) {
          defaultBatch = storedDefault;
        }
      }

      // Return config with activated batches and selected default
      return {
        activeBatch: defaultBatch,
        availableBatches: activatedBatches,
        updatedBy: docSnap.exists() ? docSnap.data().updatedBy : 'system',
        updatedAt: docSnap.exists() ? docSnap.data().updatedAt?.toDate() || new Date() : new Date(),
        createdAt: docSnap.exists() ? docSnap.data().createdAt?.toDate() || new Date() : new Date()
      };
    } catch (error) {
      logger.error('Error getting batch configuration:', error);
      throw new Error('Failed to get batch configuration');
    }
  }

  async saveBatchConfig(config: Omit<BatchConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      // UPDATED: Only save the default batch preference, not the available batches
      // Available batches are now dynamically fetched from activated batches
      const docRef = doc(db, BATCH_CONFIG_COLLECTION, 'default');

      // Check if document exists
      const existing = await getDoc(docRef);
      const now = new Date();

      // Only store the active batch preference and metadata
      const configData = {
        activeBatch: config.activeBatch, // Only the default selection
        updatedBy: config.updatedBy,
        updatedAt: Timestamp.fromDate(now),
        createdAt: existing.exists()
          ? existing.data().createdAt
          : Timestamp.fromDate(now)
      };

      await setDoc(docRef, prepareForFirestore(configData));

      logger.info('Default batch preference saved:', { activeBatch: config.activeBatch, updatedBy: config.updatedBy });
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
      // NO LONGER NEEDED: getBatchConfig now dynamically fetches activated batches
      // This method is kept for backwards compatibility but does nothing
      logger.info('Batch configuration is now dynamic - no initialization needed');
    } catch (error) {
      logger.error('Error initializing batch configuration:', error);
      throw new Error('Failed to initialize batch configuration');
    }
  }

  // ========= Clean Stock Methods =========

  /**
   * Zero all stock for a specific batch across all SKUs and locations
   */
  async zeroStockForBatch(batchId: string, updatedBy: string): Promise<{ skusAffected: number; totalZeroed: number }> {
    try {
      const allocations = await this.getAllBatchAllocations();
      let skusAffected = 0;
      let totalZeroed = 0;

      const updatePromises = allocations.map(async (allocation) => {
        const batchQty = allocation.allocations[batchId];
        if (batchQty && batchQty > 0) {
          totalZeroed += batchQty;
          skusAffected++;

          // LAYER 2: Remove this batch from batch allocations
          const updatedAllocations = { ...allocation.allocations };
          delete updatedAllocations[batchId];

          const newTotal = Object.values(updatedAllocations).reduce((sum: number, qty) => sum + (qty as number), 0);

          const docId = `${allocation.sku}_${allocation.location}`;
          const batchDocRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);

          await updateDoc(batchDocRef, prepareForFirestore({
            allocations: updatedAllocations,
            totalAllocated: newTotal,
            lastUpdated: Timestamp.now()
          }));

          // LAYER 1: Subtract batch quantity from raw inventory
          const expectedDocRef = doc(db, 'expected_inventory', docId);
          const expectedSnap = await getDoc(expectedDocRef);

          if (expectedSnap.exists()) {
            const currentAmount = expectedSnap.data().amount || 0;
            const newAmount = Math.max(0, currentAmount - batchQty);

            await updateDoc(expectedDocRef, {
              amount: newAmount,
              timestamp: Timestamp.now()
            });

            logger.debug(`Updated raw inventory: ${allocation.sku} at ${allocation.location}: ${currentAmount} → ${newAmount}`);
          }
        }
      });

      await Promise.all(updatePromises);

      logger.info('Zeroed stock for batch', { batchId, skusAffected, totalZeroed, updatedBy });
      return { skusAffected, totalZeroed };
    } catch (error) {
      logger.error('Error zeroing stock for batch:', error);
      throw new Error('Failed to zero stock for batch');
    }
  }

  /**
   * Zero all stock that is not assigned to any batch (UNASSIGNED items)
   */
  async zeroUnassignedStock(updatedBy: string): Promise<{ skusAffected: number; totalZeroed: number }> {
    try {
      const allocations = await this.getAllBatchAllocations();
      let skusAffected = 0;
      let totalZeroed = 0;

      const updatePromises = allocations.map(async (allocation) => {
        const unassignedQty = allocation.allocations['UNASSIGNED'];
        if (unassignedQty && unassignedQty > 0) {
          totalZeroed += unassignedQty;
          skusAffected++;

          // LAYER 2: Remove UNASSIGNED from batch allocations
          const updatedAllocations = { ...allocation.allocations };
          delete updatedAllocations['UNASSIGNED'];

          const newTotal = Object.values(updatedAllocations).reduce((sum: number, qty) => sum + (qty as number), 0);

          const docId = `${allocation.sku}_${allocation.location}`;
          const batchDocRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);

          await updateDoc(batchDocRef, prepareForFirestore({
            allocations: updatedAllocations,
            totalAllocated: newTotal,
            lastUpdated: Timestamp.now()
          }));

          // LAYER 1: Subtract unassigned quantity from raw inventory
          const expectedDocRef = doc(db, 'expected_inventory', docId);
          const expectedSnap = await getDoc(expectedDocRef);

          if (expectedSnap.exists()) {
            const currentAmount = expectedSnap.data().amount || 0;
            const newAmount = Math.max(0, currentAmount - unassignedQty);

            await updateDoc(expectedDocRef, {
              amount: newAmount,
              timestamp: Timestamp.now()
            });

            logger.debug(`Updated raw inventory: ${allocation.sku} at ${allocation.location}: ${currentAmount} → ${newAmount}`);
          }
        }
      });

      await Promise.all(updatePromises);

      logger.info('Zeroed unassigned stock', { skusAffected, totalZeroed, updatedBy });
      return { skusAffected, totalZeroed };
    } catch (error) {
      logger.error('Error zeroing unassigned stock:', error);
      throw new Error('Failed to zero unassigned stock');
    }
  }

  /**
   * Zero ALL stock across all batches and locations
   */
  async zeroAllStock(updatedBy: string): Promise<{ skusAffected: number; totalZeroed: number }> {
    try {
      const allocations = await this.getAllBatchAllocations();
      let skusAffected = allocations.length;
      let totalZeroed = 0;

      const updatePromises = allocations.map(async (allocation) => {
        totalZeroed += allocation.totalAllocated;

        const docId = `${allocation.sku}_${allocation.location}`;

        // LAYER 2: Set all batch allocations to zero
        const batchDocRef = doc(db, BATCH_ALLOCATIONS_COLLECTION, docId);
        await updateDoc(batchDocRef, prepareForFirestore({
          allocations: {},
          totalAllocated: 0,
          lastUpdated: Timestamp.now()
        }));

        // LAYER 1: Set raw inventory to zero
        const expectedDocRef = doc(db, 'expected_inventory', docId);
        const expectedSnap = await getDoc(expectedDocRef);

        if (expectedSnap.exists()) {
          await updateDoc(expectedDocRef, {
            amount: 0,
            timestamp: Timestamp.now()
          });

          logger.debug(`Zeroed raw inventory: ${allocation.sku} at ${allocation.location}`);
        }
      });

      await Promise.all(updatePromises);

      logger.warn('ZEROED ALL STOCK', { skusAffected, totalZeroed, updatedBy });
      return { skusAffected, totalZeroed };
    } catch (error) {
      logger.error('Error zeroing all stock:', error);
      throw new Error('Failed to zero all stock');
    }
  }
}

export const batchAllocationService = new BatchAllocationService();