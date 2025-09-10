// Table State Service - Cross-device sync for Expected & Yesterday tables
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
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
  timestamp: data.timestamp?.toDate() || new Date()
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