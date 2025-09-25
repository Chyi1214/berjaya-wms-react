// Table State Service - Cross-device sync for Expected & Yesterday tables
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
} from 'firebase/firestore';
import { db } from './firebase';
import { InventoryCountEntry } from '../types';

// Firestore collections
const EXPECTED_COLLECTION = 'expected_inventory';
const YESTERDAY_COLLECTION = 'yesterday_results';

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
    
    // Save all entries
    for (const entry of entries) {
      const docRef = doc(collection(db, EXPECTED_COLLECTION));
      const dataToSave = {
        ...entry,
        timestamp: Timestamp.fromDate(entry.timestamp),
        savedAt: Timestamp.now()
      };
      
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

  // Yesterday Results Methods
  async saveYesterdayResults(entries: InventoryCountEntry[]): Promise<void> {
    console.log('💾 Saving yesterday results to Firebase:', entries.length, 'entries');
    
    // Clear existing yesterday data
    await this.clearYesterdayResults();
    
    // Save all entries
    for (const entry of entries) {
      const docRef = doc(collection(db, YESTERDAY_COLLECTION));
      const dataToSave = {
        ...entry,
        timestamp: Timestamp.fromDate(entry.timestamp),
        savedAt: Timestamp.now()
      };
      
      await setDoc(docRef, dataToSave);
    }
    
    console.log('✅ Yesterday results saved to Firebase');
  }

  async getYesterdayResults(): Promise<InventoryCountEntry[]> {
    const yesterdayQuery = query(
      collection(db, YESTERDAY_COLLECTION),
      orderBy('sku')
    );
    
    const snapshot = await getDocs(yesterdayQuery);
    return snapshot.docs.map(doc => mapFirestoreToEntry(doc.id, doc.data()));
  }

  onYesterdayResultsChange(callback: (entries: InventoryCountEntry[]) => void): () => void {
    const yesterdayQuery = query(
      collection(db, YESTERDAY_COLLECTION),
      orderBy('sku')
    );
    
    return onSnapshot(yesterdayQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => mapFirestoreToEntry(doc.id, doc.data()));
      callback(entries);
    });
  }

  async clearYesterdayResults(): Promise<void> {
    const snapshot = await getDocs(collection(db, YESTERDAY_COLLECTION));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
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
    await Promise.all([
      this.clearExpectedInventory(),
      this.clearYesterdayResults()
    ]);
    console.log('✅ All table state cleared');
  }
}

export const tableStateService = new TableStateService();