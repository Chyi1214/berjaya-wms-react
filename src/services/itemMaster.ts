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

  // Enhanced bulk import with update/replace modes
  async bulkImportItems(
    items: Omit<ItemMaster, 'createdAt' | 'updatedAt'>[], 
    mode: 'update' | 'replace' = 'update'
  ): Promise<{
    success: number;
    errors: string[];
    stats?: {
      totalRows: number;
      skippedRows: number;
      updated: number;
      created: number;
    };
  }> {
    logger.info('Starting bulk import', { itemCount: items.length, mode });
    
    const result = {
      success: 0,
      errors: [] as string[],
      stats: {
        totalRows: items.length,
        skippedRows: 0,
        updated: 0,
        created: 0
      }
    };
    
    try {
      if (mode === 'replace') {
        // Replace mode: clear all existing data first
        logger.info('Replace mode: clearing all existing items...');
        await this.clearAllItems();
      }
      
      const batch = writeBatch(db);
      const now = new Date();
      
      for (const item of items) {
        try {
          // Validate required fields
          if (!item.sku || !item.name) {
            result.errors.push(`Row: Missing required SKU or Name`);
            result.stats.skippedRows++;
            continue;
          }
          
          const existingItem = await this.getItemBySKU(item.sku);
          
          if (mode === 'update' && existingItem) {
            // Update mode: skip existing items
            logger.debug(`Skipping existing item: ${item.sku}`);
            result.stats.skippedRows++;
            continue;
          }
          
          // Prepare item data
          const itemData: ItemMaster = {
            ...item,
            sku: item.sku.toUpperCase(), // Normalize SKU
            createdAt: existingItem?.createdAt || now,
            updatedAt: now
          };
          
          const docRef = doc(db, ITEM_MASTER_COLLECTION, item.sku.toUpperCase());
          const firestoreData = mapItemMasterToFirestore(itemData);
          
          batch.set(docRef, firestoreData);
          
          if (existingItem) {
            result.stats.updated++;
          } else {
            result.stats.created++;
          }
          result.success++;
          
        } catch (error) {
          result.errors.push(`SKU ${item.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.stats.skippedRows++;
        }
      }
      
      // Commit all changes
      if (result.success > 0) {
        try {
          console.log(`🔄 Committing ${result.success} items to Firebase...`);
          await batch.commit();
          console.log(`✅ Firebase batch commit successful! ${result.success} items saved.`);
          
          logger.info('Bulk import completed', { 
            mode, 
            success: result.success, 
            errors: result.errors.length,
            stats: result.stats 
          });
        } catch (commitError) {
          console.error('❌ Firebase batch commit failed:', commitError);
          result.errors.push(`Batch commit failed: ${commitError instanceof Error ? commitError.message : 'Unknown error'}`);
          result.success = 0; // Reset success count since nothing was actually saved
        }
      } else {
        console.warn('⚠️ No items to commit - all items were skipped or invalid');
      }
      
      return result;
      
    } catch (error) {
      logger.error('Bulk import failed', error);
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
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