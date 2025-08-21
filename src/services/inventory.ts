// Firebase Inventory Service - Real-time inventory data management
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
import { createModuleLogger } from './logger';

const logger = createModuleLogger('InventoryService');

// Firestore collection name
const INVENTORY_COLLECTION = 'inventory_counts';

// Convert Firestore document to InventoryCountEntry
const mapFirestoreToEntry = (_id: string, data: Record<string, any>): InventoryCountEntry => ({
  sku: data.sku,
  itemName: data.itemName,
  amount: data.amount,
  location: data.location,
  countedBy: data.countedBy,
  timestamp: data.timestamp.toDate() // Convert Firestore Timestamp to Date
});

// Convert InventoryCountEntry to Firestore document
const mapEntryToFirestore = (entry: InventoryCountEntry) => ({
  sku: entry.sku,
  itemName: entry.itemName,
  amount: entry.amount,
  location: entry.location,
  countedBy: entry.countedBy,
  timestamp: Timestamp.fromDate(entry.timestamp),
  lastUpdated: Timestamp.now()
});

export const inventoryService = {
  // Add or update inventory count (latest count per SKU per location)
  async saveInventoryCount(entry: InventoryCountEntry): Promise<void> {
    try {
      // Document ID: sku_location (e.g., "a001_logistics", "b002_production_zone_5")
      const docId = `${entry.sku}_${entry.location}`;
      const docRef = doc(db, INVENTORY_COLLECTION, docId);
      
      const firestoreData = mapEntryToFirestore(entry);
      
      await setDoc(docRef, firestoreData);
      logger.info('Inventory count saved', { docId, amount: entry.amount });
      
    } catch (error) {
      logger.error('Error saving inventory count', error);
      throw new Error('Failed to save inventory count');
    }
  },

  // Get all current inventory counts
  async getAllInventoryCounts(): Promise<InventoryCountEntry[]> {
    try {
      const q = query(
        collection(db, INVENTORY_COLLECTION),
        orderBy('lastUpdated', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const counts: InventoryCountEntry[] = [];
      
      snapshot.forEach((doc) => {
        const entry = mapFirestoreToEntry(doc.id, doc.data());
        counts.push(entry);
      });
      
      logger.debug('Retrieved inventory counts from Firebase', { count: counts.length });
      return counts;
      
    } catch (error) {
      logger.error('Error getting inventory counts', error);
      throw new Error('Failed to get inventory counts');
    }
  },

  // Real-time listener for inventory counts (for Manager dashboard)
  onInventoryCountsChange(callback: (counts: InventoryCountEntry[]) => void): () => void {
    try {
      const q = query(
        collection(db, INVENTORY_COLLECTION),
        orderBy('lastUpdated', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const counts: InventoryCountEntry[] = [];
        
        snapshot.forEach((doc) => {
          const entry = mapFirestoreToEntry(doc.id, doc.data());
          counts.push(entry);
        });
        
        logger.debug('Real-time inventory counts update', { count: counts.length });
        callback(counts);
      });
      
      return unsubscribe;
      
    } catch (error) {
      logger.error('Error setting up real-time listener', error);
      throw new Error('Failed to setup real-time listener');
    }
  },

  // Clear all inventory data (for testing)
  async clearAllInventory(): Promise<void> {
    try {
      const snapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
      const deletePromises: Promise<void>[] = [];
      
      snapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      logger.warn('Cleared inventory records', { count: deletePromises.length });
      
    } catch (error) {
      logger.error('Error clearing inventory', error);
      throw new Error('Failed to clear inventory');
    }
  },

  // Get inventory count for specific SKU and location
  async getInventoryCount(sku: string, location: string): Promise<InventoryCountEntry | null> {
    try {
      const docId = `${sku}_${location}`;
      const docSnap = await getDocs(query(collection(db, INVENTORY_COLLECTION)));
      
      // Find the document
      let foundEntry: InventoryCountEntry | null = null;
      docSnap.forEach((doc) => {
        if (doc.id === docId) {
          foundEntry = mapFirestoreToEntry(doc.id, doc.data());
        }
      });
      
      return foundEntry;
      
    } catch (error) {
      logger.error('Error getting inventory count', error);
      return null;
    }
  }
};

export default inventoryService;