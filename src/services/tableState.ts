// Table State Service - Cross-device sync for Expected inventory
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteDoc
} from './costTracking/firestoreWrapper';
import { db } from './firebase';
import { InventoryCountEntry } from '../types';

// Firestore collections
const EXPECTED_COLLECTION = 'expected_inventory';

// Convert Firestore document to InventoryCountEntry
const mapFirestoreToEntry = (_id: string, data: any): InventoryCountEntry => ({
  sku: data.sku,
  itemName: data.itemName,
  amount: data.amount,
  location: data.location,
  countedBy: data.countedBy,
  timestamp: data.timestamp?.toDate() || new Date(),
  notes: data.notes || undefined
});

class TableStateService {
  
  // Expected Inventory Methods
  async saveExpectedInventory(entries: InventoryCountEntry[]): Promise<void> {
    console.log('💾 Saving expected inventory to Firebase:', entries.length, 'entries');

    // Clear existing expected data
    await this.clearExpectedInventory();

    // Save all entries using deterministic document IDs so incremental syncs can target the same record
    for (const entry of entries) {
      const docId = `${entry.sku}_${entry.location}`;
      const docRef = doc(db, EXPECTED_COLLECTION, docId);

      // Remove undefined fields to avoid Firebase errors
      const dataToSave: any = {
        sku: entry.sku,
        itemName: entry.itemName,
        amount: entry.amount,
        location: entry.location,
        countedBy: entry.countedBy,
        timestamp: Timestamp.fromDate(entry.timestamp),
        savedAt: Timestamp.now()
      };

      // Only include notes if it's defined
      if (entry.notes !== undefined && entry.notes !== null) {
        dataToSave.notes = entry.notes;
      }

      await setDoc(docRef, dataToSave);
    }

    console.log('✅ Expected inventory saved to Firebase');
  }

  async getExpectedInventory(): Promise<InventoryCountEntry[]> {
    const expectedQuery = query(
      collection(db, EXPECTED_COLLECTION),
      orderBy('sku')
    );
    
    const snapshot = await getDocs(expectedQuery);
    return snapshot.docs.map(doc => mapFirestoreToEntry(doc.id, doc.data()));
  }

  onExpectedInventoryChange(callback: (entries: InventoryCountEntry[]) => void): () => void {
    const expectedQuery = query(
      collection(db, EXPECTED_COLLECTION),
      orderBy('sku')
    );
    
    return onSnapshot(expectedQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => mapFirestoreToEntry(doc.id, doc.data()));
      callback(entries);
    });
  }

  async clearExpectedInventory(): Promise<void> {
    const snapshot = await getDocs(collection(db, EXPECTED_COLLECTION));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }

  // Optimized method for adding to inventory count without loading all data
  async addToInventoryCount(
    sku: string, 
    itemName: string, 
    quantity: number, 
    location: string, 
    countedBy: string
  ): Promise<{ previousAmount: number; newAmount: number }> {
    console.log(`📦 Adding ${quantity} x ${sku} to ${location} inventory`);
    
    // Get current expected inventory - this is still needed but more efficient than loading all
    const currentExpected = await this.getExpectedInventory();
    const existingEntry = currentExpected.find(entry => 
      entry.sku === sku && entry.location === location
    );

    const previousAmount = existingEntry?.amount || 0;
    const newAmount = previousAmount + quantity;

    // Create new inventory entry
    const expectedEntry: InventoryCountEntry = {
      sku,
      itemName,
      amount: newAmount,
      location,
      countedBy,
      timestamp: new Date()
    };

    // Update inventory efficiently 
    const updatedExpected = existingEntry 
      ? currentExpected.map(entry => 
          (entry.sku === sku && entry.location === location) 
            ? expectedEntry 
            : entry
        )
      : [...currentExpected, expectedEntry];

    // Save updated inventory
    await this.saveExpectedInventory(updatedExpected);
    
    console.log(`✅ Updated ${sku} inventory: ${previousAmount} → ${newAmount}`);
    return { previousAmount, newAmount };
  }

  // NEW OPTIMIZED METHODS - Single Document Updates

  // Update a single inventory item directly by SKU+location
  async updateSingleInventoryItem(
    sku: string, 
    location: string, 
    newAmount: number,
    itemName: string,
    countedBy: string
  ): Promise<void> {
    const docId = `${sku}_${location}`;
    const docRef = doc(db, EXPECTED_COLLECTION, docId);
    
    console.log(`🎯 Direct update: ${sku} at ${location} → ${newAmount} units`);
    
    await setDoc(docRef, {
      sku,
      location,
      amount: newAmount,
      itemName,
      countedBy,
      timestamp: Timestamp.now()
    }, { merge: true });
    
    console.log(`✅ Direct update complete: ${docId}`);
  }

  // Super-fast inventory addition with automatic migration
  async addToInventoryCountOptimized(
    sku: string, 
    itemName: string, 
    quantity: number, 
    location: string, 
    countedBy: string
  ): Promise<{ previousAmount: number; newAmount: number }> {
    
    // Check if migration is needed (only on first call)
    const migrationNeeded = await this.needsMigration();
    if (migrationNeeded) {
      console.log('⚡ Auto-migration detected - upgrading inventory system for instant performance...');
      await this.migrateToCompositeIds();
      console.log('✅ Auto-migration complete! All future scans will be instant.');
    }
    
    const docId = `${sku}_${location}`;
    const docRef = doc(db, EXPECTED_COLLECTION, docId);
    
    console.log(`⚡ Fast add: ${quantity} x ${sku} to ${location}`);
    
    // Get only this specific document (not all inventory!)
    const docSnap = await getDoc(docRef);
    const previousAmount = docSnap.exists() ? (docSnap.data().amount || 0) : 0;
    const newAmount = previousAmount + quantity;

    // GUARD: Prevent negative inventory (v7.9.0 fix)
    if (newAmount < 0) {
      throw new Error(
        `Cannot create negative inventory for ${sku} at ${location}. ` +
        `Current: ${previousAmount}, Change: ${quantity}, Result would be: ${newAmount}`
      );
    }

    // Update only this document
    await setDoc(docRef, {
      sku,
      location,
      amount: newAmount,
      itemName,
      countedBy,
      timestamp: Timestamp.now()
    }, { merge: true });
    
    console.log(`✅ Fast add complete: ${previousAmount} → ${newAmount} (${docId})`);
    return { previousAmount, newAmount };
  }

  // Enhanced version with notes support for waste/lost/defect tracking
  async addToInventoryCountWithNotes(
    sku: string,
    itemName: string,
    quantity: number,
    location: string,
    countedBy: string,
    notes: string
  ): Promise<{ previousAmount: number; newAmount: number }> {

    // Check if migration is needed (only on first call)
    const migrationNeeded = await this.needsMigration();
    if (migrationNeeded) {
      console.log('⚡ Auto-migration detected - upgrading inventory system for instant performance...');
      await this.migrateToCompositeIds();
      console.log('✅ Auto-migration complete! All future scans will be instant.');
    }

    const docId = `${sku}_${location}`;
    const docRef = doc(db, EXPECTED_COLLECTION, docId);

    console.log(`⚡ Fast add with notes: ${quantity} x ${sku} to ${location} (${notes})`);

    // Get only this specific document (not all inventory!)
    const docSnap = await getDoc(docRef);
    const previousAmount = docSnap.exists() ? (docSnap.data().amount || 0) : 0;
    const newAmount = previousAmount + quantity;

    // GUARD: Prevent negative inventory (v7.9.0 fix)
    if (newAmount < 0) {
      throw new Error(
        `Cannot create negative inventory for ${sku} at ${location}. ` +
        `Current: ${previousAmount}, Change: ${quantity}, Result would be: ${newAmount}`
      );
    }

    // Update only this document with notes
    await setDoc(docRef, {
      sku,
      location,
      amount: newAmount,
      itemName,
      countedBy,
      timestamp: Timestamp.now(),
      notes: notes
    }, { merge: true });

    console.log(`✅ Fast add with notes complete: ${previousAmount} → ${newAmount} (${docId})`);
    return { previousAmount, newAmount };
  }

  // Check if migration to composite IDs is needed
  async needsMigration(): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, EXPECTED_COLLECTION));
      
      if (snapshot.empty) {
        console.log('📊 No inventory data found - no migration needed');
        return false;
      }
      
      // Check first few documents to see if they use composite IDs
      const sampleDocs = snapshot.docs.slice(0, 3);
      const hasCompositeIds = sampleDocs.some(doc => {
        const data = doc.data();
        const expectedId = `${data.sku}_${data.location}`;
        return doc.id === expectedId;
      });
      
      console.log(`🔍 Migration check: ${hasCompositeIds ? 'Already migrated' : 'Migration needed'}`);
      return !hasCompositeIds;
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return false;
    }
  }

  // Migration method - Run once to convert to composite IDs
  async migrateToCompositeIds(): Promise<void> {
    console.log('🔧 Starting automatic migration to composite IDs...');
    
    try {
      // Get all existing entries
      const entries = await this.getExpectedInventory();
      console.log(`📦 Found ${entries.length} existing entries to migrate`);
      
      // Clear the old collection
      console.log('🗑️ Clearing old auto-generated documents...');
      await this.clearExpectedInventory();
      
      // Re-save with composite IDs
      console.log('💾 Saving with new composite IDs...');
      for (const entry of entries) {
        const docId = `${entry.sku}_${entry.location}`;
        const docRef = doc(db, EXPECTED_COLLECTION, docId);
        
        await setDoc(docRef, {
          sku: entry.sku,
          itemName: entry.itemName,
          amount: entry.amount,
          location: entry.location,
          countedBy: entry.countedBy,
          timestamp: Timestamp.fromDate(entry.timestamp)
        });
      }
      
      console.log('✅ Migration complete! All documents now use composite IDs (SKU_LOCATION)');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }


  // Reset all quantities to zero while keeping items intact
  async resetAllQuantitiesToZero(): Promise<{ resetCount: number }> {
    console.log('🔄 Resetting all inventory quantities to zero...');

    // Get all expected inventory entries
    const entries = await this.getExpectedInventory();
    console.log(`📊 Found ${entries.length} inventory entries to reset`);

    let resetCount = 0;

    // Update each entry to have quantity 0
    for (const entry of entries) {
      if (entry.amount > 0) {
        const docId = `${entry.sku}_${entry.location}`;
        const docRef = doc(db, EXPECTED_COLLECTION, docId);

        await updateDoc(docRef, {
          amount: 0,
          timestamp: Timestamp.fromDate(new Date()),
          countedBy: 'SYSTEM_RESET'
        });

        resetCount++;
        console.log(`✅ Reset ${entry.sku} at ${entry.location}: ${entry.amount} → 0`);
      }
    }

    console.log(`✅ Reset complete! ${resetCount} entries set to zero`);
    return { resetCount };
  }

  // Get count of unboxed boxes (unique SKUs in logistics location)
  async getUnboxedBoxesCount(): Promise<number> {
    try {
      const inventory = await this.getExpectedInventory();

      // Count unique SKUs in logistics location (unboxed items)
      const unboxedItems = inventory.filter(item =>
        item.location === 'logistics'
      );

      // Count unique SKUs (boxes) rather than total quantities
      const uniqueSKUs = new Set(unboxedItems.map(item => item.sku));

      return uniqueSKUs.size;
    } catch (error) {
      console.error('Failed to get unboxed boxes count:', error);
      return 0;
    }
  }

  // Clear all table state data
  async clearAllTableState(): Promise<void> {
    console.log('🧹 Clearing all table state from Firebase...');
    await this.clearExpectedInventory();
    console.log('✅ All table state cleared');
  }

  // DATA RECONCILIATION - v7.11.0: Sync Layer 1 (expected_inventory) from Layer 2 (batch_allocations)
  async reconcileInventoryData(autoFix: boolean = false): Promise<{
    totalSKUs: number;
    matches: number;
    mismatches: Array<{
      sku: string;
      location: string;
      expectedAmount: number;
      calculatedAmount: number;
      diff: number;
    }>;
    fixed: boolean;
  }> {
    console.log('🔍 Starting inventory reconciliation...');

    // Import batchAllocationService dynamically to avoid circular dependency
    const { batchAllocationService } = await import('./batchAllocationService');

    // Get all batch allocations (Layer 2 - Source of Truth)
    const batchAllocations = await batchAllocationService.getAllBatchAllocations();
    console.log(`📊 Found ${batchAllocations.length} batch allocation records`);

    // Calculate what expected_inventory SHOULD be (sum of all batches per SKU+location)
    const calculatedExpected = new Map<string, { sku: string; location: string; amount: number; itemName: string }>();

    batchAllocations.forEach(allocation => {
      const key = `${allocation.sku}_${allocation.location}`;
      const totalForThisSKULocation = allocation.totalAllocated;

      calculatedExpected.set(key, {
        sku: allocation.sku,
        location: allocation.location,
        amount: totalForThisSKULocation,
        itemName: allocation.sku // Use SKU as itemName for now
      });
    });

    console.log(`📊 Calculated ${calculatedExpected.size} expected inventory records from batch allocations`);

    // Get current expected_inventory (Layer 1 - What's currently stored)
    const currentExpected = await this.getExpectedInventory();
    const currentExpectedMap = new Map<string, InventoryCountEntry>();
    currentExpected.forEach(entry => {
      const key = `${entry.sku}_${entry.location}`;
      currentExpectedMap.set(key, entry);
    });

    console.log(`📊 Found ${currentExpectedMap.size} current expected inventory records`);

    // Compare and find mismatches
    const mismatches: Array<{
      sku: string;
      location: string;
      expectedAmount: number;
      calculatedAmount: number;
      diff: number;
    }> = [];

    let matches = 0;

    // Check all calculated records
    calculatedExpected.forEach((calculated, key) => {
      const current = currentExpectedMap.get(key);

      if (!current) {
        // Missing in expected_inventory
        mismatches.push({
          sku: calculated.sku,
          location: calculated.location,
          expectedAmount: 0,
          calculatedAmount: calculated.amount,
          diff: calculated.amount
        });
      } else if (current.amount !== calculated.amount) {
        // Amount mismatch
        mismatches.push({
          sku: calculated.sku,
          location: calculated.location,
          expectedAmount: current.amount,
          calculatedAmount: calculated.amount,
          diff: calculated.amount - current.amount
        });
      } else {
        // Match!
        matches++;
      }
    });

    // Check for records in expected_inventory that don't exist in batch_allocations
    currentExpectedMap.forEach((current, key) => {
      if (!calculatedExpected.has(key)) {
        mismatches.push({
          sku: current.sku,
          location: current.location,
          expectedAmount: current.amount,
          calculatedAmount: 0,
          diff: -current.amount
        });
      }
    });

    console.log(`✅ Matches: ${matches}`);
    console.log(`⚠️  Mismatches: ${mismatches.length}`);

    if (mismatches.length > 0) {
      console.log('📋 Mismatches found:');
      mismatches.forEach(m => {
        console.log(`   ${m.sku} at ${m.location}: Expected=${m.expectedAmount}, Calculated=${m.calculatedAmount}, Diff=${m.diff >= 0 ? '+' : ''}${m.diff}`);
      });
    }

    // Auto-fix if requested
    let fixed = false;
    if (autoFix && mismatches.length > 0) {
      console.log('🔧 Auto-fixing mismatches...');

      // Rebuild expected_inventory from batch_allocations
      const rebuiltExpected: InventoryCountEntry[] = [];
      calculatedExpected.forEach(calculated => {
        rebuiltExpected.push({
          sku: calculated.sku,
          itemName: calculated.itemName,
          amount: calculated.amount,
          location: calculated.location,
          countedBy: 'SYSTEM_RECONCILIATION',
          timestamp: new Date()
        });
      });

      // Save the rebuilt expected inventory
      await this.saveExpectedInventory(rebuiltExpected);

      fixed = true;
      console.log(`✅ Reconciliation complete! Rebuilt expected_inventory with ${rebuiltExpected.length} records`);
    }

    return {
      totalSKUs: calculatedExpected.size,
      matches,
      mismatches,
      fixed
    };
  }

  // Helper: Sync single SKU+location's expected_inventory from batch_allocations
  // Optional: Pass correctAmount to avoid reading stale data
  async syncExpectedFromBatchAllocations(sku: string, location: string, correctAmount?: number): Promise<void> {
    const { batchAllocationService } = await import('./batchAllocationService');

    let finalAmount: number;

    // If correctAmount is provided, use it directly (avoids stale reads)
    if (correctAmount !== undefined) {
      finalAmount = correctAmount;
    } else {
      // Get batch allocation for this SKU+location with retry for eventual consistency
      let allocation = await batchAllocationService.getBatchAllocation(sku, location);

      // If first read shows 0, wait and retry once to account for Firestore propagation delay
      if (!allocation || allocation.totalAllocated === 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
        allocation = await batchAllocationService.getBatchAllocation(sku, location);
      }

      finalAmount = allocation?.totalAllocated || 0;
    }

    if (finalAmount > 0) {
      // Update ONLY this specific document (no full reload!)
      const docId = `${sku}_${location}`;
      const docRef = doc(db, EXPECTED_COLLECTION, docId);

      await setDoc(docRef, {
        sku,
        itemName: sku,
        amount: finalAmount,
        location,
        countedBy: 'SYSTEM_SYNC',
        timestamp: Timestamp.now()
      });
    } else {
      // No batch allocation or zero quantity - delete this specific document
      const docId = `${sku}_${location}`;
      const docRef = doc(db, EXPECTED_COLLECTION, docId);

      try {
        await deleteDoc(docRef);
        console.log(`✅ Removed ${sku} at ${location} from expected_inventory (no/zero allocation)`);
      } catch (error) {
        // Document might not exist, that's ok
        console.log(`ℹ️ Document ${docId} doesn't exist, skipping delete`);
      }
    }
  }
}

export const tableStateService = new TableStateService();
