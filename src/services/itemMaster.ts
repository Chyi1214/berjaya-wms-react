// Item Master Service - Firebase operations for Item Master List (catalog)
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { ItemMaster, SearchableItem } from '../types';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ItemMasterService');

// Firestore collection name
const ITEM_MASTER_COLLECTION = 'item_master';

// Convert Firestore document to ItemMaster
const mapFirestoreToItemMaster = (_id: string, data: Record<string, any>): ItemMaster => ({
  sku: data.sku,
  name: data.name,
  category: data.category || undefined,
  unit: data.unit || undefined,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date()
});

// Convert ItemMaster to Firestore document
const mapItemMasterToFirestore = (item: ItemMaster) => ({
  sku: item.sku,
  name: item.name,
  ...(item.category && { category: item.category }),
  ...(item.unit && { unit: item.unit }),
  createdAt: Timestamp.fromDate(item.createdAt),
  updatedAt: Timestamp.fromDate(item.updatedAt)
});

class ItemMasterService {

  // Add new item to master list
  async addItem(item: Omit<ItemMaster, 'createdAt' | 'updatedAt'>): Promise<void> {
    logger.info('Adding item to master list', { sku: item.sku });
    
    // Check if SKU already exists
    const existingItem = await this.getItemBySKU(item.sku);
    if (existingItem) {
      throw new Error(`Item with SKU "${item.sku}" already exists. Use updateItem() to modify existing items.`);
    }
    
    const now = new Date();
    const newItem: ItemMaster = {
      ...item,
      createdAt: now,
      updatedAt: now
    };
    
    // Use SKU as document ID for easy lookups
    const docRef = doc(db, ITEM_MASTER_COLLECTION, item.sku);
    const firestoreData = mapItemMasterToFirestore(newItem);
    
    await setDoc(docRef, firestoreData);
    logger.info('Item added to master list', { sku: item.sku });
  }

  // Update existing item
  async updateItem(item: ItemMaster): Promise<void> {
    logger.info('Updating item in master list', { sku: item.sku });
    
    const updatedItem: ItemMaster = {
      ...item,
      updatedAt: new Date()
    };
    
    const docRef = doc(db, ITEM_MASTER_COLLECTION, item.sku);
    const firestoreData = mapItemMasterToFirestore(updatedItem);
    
    await setDoc(docRef, firestoreData);
    logger.info('Item updated in master list', { sku: item.sku });
  }

  // Get item by SKU
  async getItemBySKU(sku: string): Promise<ItemMaster | null> {
    try {
      const querySnapshot = await getDocs(query(collection(db, ITEM_MASTER_COLLECTION), where('sku', '==', sku)));
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const docData = querySnapshot.docs[0];
      return mapFirestoreToItemMaster(docData.id, docData.data());
    } catch (error) {
      console.error('❌ Error getting item by SKU:', error);
      return null;
    }
  }

  // Get all items
  async getAllItems(): Promise<ItemMaster[]> {
    try {
      const q = query(
        collection(db, ITEM_MASTER_COLLECTION),
        orderBy('sku', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const items: ItemMaster[] = [];
      
      snapshot.forEach((doc) => {
        const item = mapFirestoreToItemMaster(doc.id, doc.data());
        items.push(item);
      });
      
      logger.debug('Retrieved items from master list', { count: items.length });
      return items;
      
    } catch (error) {
      logger.error('Error getting all items', error);
      throw new Error('Failed to get items from master list');
    }
  }

  // Search items by name or SKU (for autocomplete)
  async searchItems(searchTerm: string, limit: number = 20): Promise<SearchableItem[]> {
    try {
      const items = await this.getAllItems();
      
      // Client-side search (Firebase doesn't support advanced text search)
      const filteredItems = items
        .filter(item => 
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, limit);
      
      // Convert to SearchableItem format
      const searchableItems: SearchableItem[] = filteredItems.map(item => ({
        type: 'item',
        code: item.sku,
        name: item.name,
        description: item.category ? `Category: ${item.category}` : undefined
      }));
      
      return searchableItems;
      
    } catch (error) {
      logger.error('Error searching items', error);
      return [];
    }
  }

  // Real-time listener for items
  onItemsChange(callback: (items: ItemMaster[]) => void): () => void {
    try {
      const q = query(
        collection(db, ITEM_MASTER_COLLECTION),
        orderBy('sku', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: ItemMaster[] = [];
        
        snapshot.forEach((doc) => {
          const item = mapFirestoreToItemMaster(doc.id, doc.data());
          items.push(item);
        });
        
        logger.debug('Real-time items update', { count: items.length });
        callback(items);
      });
      
      return unsubscribe;
      
    } catch (error) {
      logger.error('Error setting up items listener', error);
      throw new Error('Failed to setup items listener');
    }
  }

  // Delete item by SKU
  async deleteItem(sku: string): Promise<void> {
    logger.info('Deleting item from master list', { sku });
    
    const docRef = doc(db, ITEM_MASTER_COLLECTION, sku);
    await deleteDoc(docRef);
    
    logger.info('Item deleted from master list', { sku });
  }

  // Bulk import items (for CSV import)
  async bulkImportItems(items: Omit<ItemMaster, 'createdAt' | 'updatedAt'>[]): Promise<{
    success: number;
    failed: Array<{ sku: string; error: string }>;
  }> {
    logger.info('Starting bulk import', { itemCount: items.length });
    
    const batch = writeBatch(db);
    const now = new Date();
    const failed: Array<{ sku: string; error: string }> = [];
    let success = 0;
    
    // Check for duplicates first
    for (const item of items) {
      try {
        const existingItem = await this.getItemBySKU(item.sku);
        if (existingItem) {
          failed.push({
            sku: item.sku,
            error: `Duplicate SKU: Item "${item.sku}" already exists`
          });
          continue;
        }
        
        // Add to batch
        const newItem: ItemMaster = {
          ...item,
          createdAt: now,
          updatedAt: now
        };
        
        const docRef = doc(db, ITEM_MASTER_COLLECTION, item.sku);
        const firestoreData = mapItemMasterToFirestore(newItem);
        
        batch.set(docRef, firestoreData);
        success++;
        
      } catch (error) {
        failed.push({
          sku: item.sku,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // If any duplicates found, reject the entire import
    if (failed.length > 0) {
      throw new Error(`Import failed: ${failed.length} duplicate SKUs found. Fix duplicates and try again.`);
    }
    
    // Commit all at once
    await batch.commit();
    
    logger.info('Bulk import completed', { successCount: success });
    return { success, failed };
  }

  // Clear all items (for testing)
  async clearAllItems(): Promise<void> {
    logger.warn('Clearing all items from master list');
    
    const snapshot = await getDocs(collection(db, ITEM_MASTER_COLLECTION));
    const deletePromises: Promise<void>[] = [];
    
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    logger.warn('Cleared items from master list', { count: deletePromises.length });
  }

  // Get categories (unique list)
  async getCategories(): Promise<string[]> {
    try {
      const items = await this.getAllItems();
      const categories = [...new Set(items
        .map(item => item.category)
        .filter(category => category)
      )] as string[];
      
      return categories.sort();
    } catch (error) {
      logger.error('Error getting categories', error);
      return [];
    }
  }

  // Get items by category
  async getItemsByCategory(category: string): Promise<ItemMaster[]> {
    try {
      const items = await this.getAllItems();
      return items.filter(item => item.category === category);
    } catch (error) {
      logger.error('Error getting items by category', error);
      return [];
    }
  }
}

export const itemMasterService = new ItemMasterService();