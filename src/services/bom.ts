// BOM Service - Firebase operations for Bill of Materials
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
import { BOM, BOMComponent, SearchableItem, InventoryCountEntry } from '../types';
import { itemMasterService } from './itemMaster';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('BOMService');

// Firestore collection name
const BOM_COLLECTION = 'boms';

// Convert Firestore document to BOM
const mapFirestoreToBOM = (_id: string, data: Record<string, any>): BOM => ({
  bomCode: data.bomCode,
  name: data.name,
  description: data.description || undefined,
  components: data.components || [],
  totalComponents: data.totalComponents || 0,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date()
});

// Convert BOM to Firestore document
const mapBOMToFirestore = (bom: BOM) => ({
  bomCode: bom.bomCode,
  name: bom.name,
  ...(bom.description && { description: bom.description }),
  components: bom.components,
  totalComponents: bom.totalComponents,
  createdAt: Timestamp.fromDate(bom.createdAt),
  updatedAt: Timestamp.fromDate(bom.updatedAt)
});

class BOMService {

  // Validate BOM components against Item Master
  private async validateComponents(components: BOMComponent[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const component of components) {
      // Check if SKU exists in Item Master
      const item = await itemMasterService.getItemBySKU(component.sku);
      if (!item) {
        errors.push(`Component SKU "${component.sku}" not found in Item Master List`);
        continue;
      }
      
      // Validate quantity
      if (component.quantity <= 0) {
        errors.push(`Component "${component.sku}" must have quantity greater than 0`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Calculate total components quantity
  private calculateTotalComponents(components: BOMComponent[]): number {
    return components.reduce((total, component) => total + component.quantity, 0);
  }

  // Add new BOM
  async addBOM(bom: Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>): Promise<void> {
    logger.info('Adding BOM', { bomCode: bom.bomCode });
    
    // Check if BOM code already exists
    const existingBOM = await this.getBOMByCode(bom.bomCode);
    if (existingBOM) {
      throw new Error(`BOM with code "${bom.bomCode}" already exists. Use updateBOM() to modify existing BOMs.`);
    }
    
    // Validate components
    const validation = await this.validateComponents(bom.components);
    if (!validation.valid) {
      throw new Error(`BOM validation failed:\n${validation.errors.join('\n')}`);
    }
    
    const now = new Date();
    const newBOM: BOM = {
      ...bom,
      totalComponents: this.calculateTotalComponents(bom.components),
      createdAt: now,
      updatedAt: now
    };
    
    // Use bomCode as document ID for easy lookups
    const docRef = doc(db, BOM_COLLECTION, bom.bomCode);
    const firestoreData = mapBOMToFirestore(newBOM);
    
    await setDoc(docRef, firestoreData);
    logger.info('BOM added', { bomCode: bom.bomCode });
  }

  // Update existing BOM
  async updateBOM(bom: BOM): Promise<void> {
    logger.info('Updating BOM', { bomCode: bom.bomCode });
    
    // Validate components
    const validation = await this.validateComponents(bom.components);
    if (!validation.valid) {
      throw new Error(`BOM validation failed:\n${validation.errors.join('\n')}`);
    }
    
    const updatedBOM: BOM = {
      ...bom,
      totalComponents: this.calculateTotalComponents(bom.components),
      updatedAt: new Date()
    };
    
    const docRef = doc(db, BOM_COLLECTION, bom.bomCode);
    const firestoreData = mapBOMToFirestore(updatedBOM);
    
    await setDoc(docRef, firestoreData);
    logger.info('BOM updated', { bomCode: bom.bomCode });
  }

  // Get BOM by code
  async getBOMByCode(bomCode: string): Promise<BOM | null> {
    try {
      const querySnapshot = await getDocs(query(collection(db, BOM_COLLECTION), where('bomCode', '==', bomCode)));
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const docData = querySnapshot.docs[0];
      return mapFirestoreToBOM(docData.id, docData.data());
    } catch (error) {
      console.error('❌ Error getting BOM by code:', error);
      return null;
    }
  }

  // Get all BOMs
  async getAllBOMs(): Promise<BOM[]> {
    try {
      const q = query(
        collection(db, BOM_COLLECTION),
        orderBy('bomCode', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const boms: BOM[] = [];
      
      snapshot.forEach((doc) => {
        const bom = mapFirestoreToBOM(doc.id, doc.data());
        boms.push(bom);
      });
      
      logger.debug('Retrieved BOMs', { count: boms.length });
      return boms;
      
    } catch (error) {
      console.error('❌ Error getting all BOMs:', error);
      throw new Error('Failed to get BOMs');
    }
  }

  // Search BOMs by name or code (for autocomplete)
  async searchBOMs(searchTerm: string, limit: number = 20): Promise<SearchableItem[]> {
    try {
      const boms = await this.getAllBOMs();
      
      // Client-side search
      const filteredBOMs = boms
        .filter(bom => 
          bom.bomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bom.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, limit);
      
      // Convert to SearchableItem format
      const searchableItems: SearchableItem[] = filteredBOMs.map(bom => ({
        type: 'bom',
        code: bom.bomCode,
        name: bom.name,
        description: bom.description,
        componentCount: bom.components.length
      }));
      
      return searchableItems;
      
    } catch (error) {
      console.error('❌ Error searching BOMs:', error);
      return [];
    }
  }

  // Real-time listener for BOMs
  onBOMsChange(callback: (boms: BOM[]) => void): () => void {
    try {
      const q = query(
        collection(db, BOM_COLLECTION),
        orderBy('bomCode', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const boms: BOM[] = [];
        
        snapshot.forEach((doc) => {
          const bom = mapFirestoreToBOM(doc.id, doc.data());
          boms.push(bom);
        });
        
        logger.debug('Real-time BOMs update', { count: boms.length });
        callback(boms);
      });
      
      return unsubscribe;
      
    } catch (error) {
      console.error('❌ Error setting up BOMs listener:', error);
      throw new Error('Failed to setup BOMs listener');
    }
  }

  // Delete BOM by code
  async deleteBOM(bomCode: string): Promise<void> {
    logger.info('Deleting BOM', { bomCode });
    
    const docRef = doc(db, BOM_COLLECTION, bomCode);
    await deleteDoc(docRef);
    
    logger.info('BOM deleted', { bomCode });
  }


  // Bulk import BOMs (for CSV import)
  async bulkImportBOMs(boms: Omit<BOM, 'createdAt' | 'updatedAt' | 'totalComponents'>[]): Promise<{
    success: number;
    failed: Array<{ bomCode: string; error: string }>;
  }> {
    logger.info('Starting bulk BOM import', { bomCount: boms.length });
    
    const batch = writeBatch(db);
    const now = new Date();
    const failed: Array<{ bomCode: string; error: string }> = [];
    let success = 0;
    
    // Validate and check for duplicates first
    for (const bom of boms) {
      try {
        // Check for duplicates
        const existingBOM = await this.getBOMByCode(bom.bomCode);
        if (existingBOM) {
          failed.push({
            bomCode: bom.bomCode,
            error: `Duplicate BOM code: "${bom.bomCode}" already exists`
          });
          continue;
        }
        
        // Validate components
        const validation = await this.validateComponents(bom.components);
        if (!validation.valid) {
          failed.push({
            bomCode: bom.bomCode,
            error: `Validation failed: ${validation.errors.join(', ')}`
          });
          continue;
        }
        
        // Add to batch
        const newBOM: BOM = {
          ...bom,
          totalComponents: this.calculateTotalComponents(bom.components),
          createdAt: now,
          updatedAt: now
        };
        
        const docRef = doc(db, BOM_COLLECTION, bom.bomCode);
        const firestoreData = mapBOMToFirestore(newBOM);
        
        batch.set(docRef, firestoreData);
        success++;
        
      } catch (error) {
        failed.push({
          bomCode: bom.bomCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // If any duplicates or validation errors found, reject the entire import
    if (failed.length > 0) {
      throw new Error(`Import failed: ${failed.length} BOMs with errors. Fix issues and try again.`);
    }
    
    // Commit all at once
    await batch.commit();
    
    logger.info('Bulk BOM import completed', { successCount: success });
    return { success, failed };
  }

  // Clear all BOMs (for testing)
  async clearAllBOMs(): Promise<void> {
    logger.warn('Clearing all BOMs');
    
    const snapshot = await getDocs(collection(db, BOM_COLLECTION));
    const deletePromises: Promise<void>[] = [];
    
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    logger.warn('Cleared BOMs', { count: deletePromises.length });
  }

  // Expand BOM to individual inventory entries (Phase 3)
  async expandBOMToInventoryEntries(
    bomCode: string, 
    bomQuantity: number,
    location: string,
    countedBy: string,
    additionalNotes?: string
  ): Promise<InventoryCountEntry[]> {
    logger.debug('Expanding BOM to inventory entries', { bomCode, bomQuantity });
    
    // Get the BOM
    const bom = await this.getBOMByCode(bomCode);
    if (!bom) {
      throw new Error(`BOM "${bomCode}" not found`);
    }
    
    const entries: InventoryCountEntry[] = [];
    const timestamp = new Date();
    
    // Create inventory entry for each component
    for (const component of bom.components) {
      const totalQuantity = component.quantity * bomQuantity;
      
      const entry: InventoryCountEntry = {
        sku: component.sku,
        itemName: component.name,
        amount: totalQuantity,
        location,
        countedBy: `${countedBy} (via BOM: ${bomCode})`,
        timestamp,
        bomOrigin: {
          bomCode: bom.bomCode,
          bomName: bom.name,
          bomQuantity: bomQuantity,
          componentOriginalQty: component.quantity
        },
        notes: additionalNotes
      };
      
      entries.push(entry);
    }
    
    logger.debug('BOM expanded to inventory entries', { bomCode, entryCount: entries.length });
    return entries;
  }

  // Preview BOM expansion without creating entries (for UI preview)
  async previewBOMExpansion(bomCode: string, quantity: number = 1): Promise<{
    bom: BOM;
    previewEntries: Array<{
      sku: string;
      itemName: string;
      originalQty: number;
      expandedQty: number;
    }>;
    totalEntries: number;
  }> {
    const bom = await this.getBOMByCode(bomCode);
    if (!bom) {
      throw new Error(`BOM "${bomCode}" not found`);
    }

    const previewEntries = bom.components.map(component => ({
      sku: component.sku,
      itemName: component.name,
      originalQty: component.quantity,
      expandedQty: component.quantity * quantity
    }));

    return {
      bom,
      previewEntries,
      totalEntries: previewEntries.length
    };
  }

  // Get all BOMs that contain a specific component SKU
  async getBOMsContainingSKU(sku: string): Promise<BOM[]> {
    try {
      const allBOMs = await this.getAllBOMs();
      return allBOMs.filter(bom => 
        bom.components.some(component => component.sku === sku)
      );
    } catch (error) {
      console.error('❌ Error finding BOMs containing SKU:', error);
      return [];
    }
  }

  // Get BOM usage statistics
  async getBOMStatistics(): Promise<{
    totalBOMs: number;
    averageComponents: number;
    mostComplexBOM: { code: string; name: string; componentCount: number } | null;
    totalUniqueComponents: number;
  }> {
    try {
      const boms = await this.getAllBOMs();
      
      if (boms.length === 0) {
        return {
          totalBOMs: 0,
          averageComponents: 0,
          mostComplexBOM: null,
          totalUniqueComponents: 0
        };
      }
      
      const totalComponents = boms.reduce((sum, bom) => sum + bom.components.length, 0);
      const averageComponents = Math.round(totalComponents / boms.length * 10) / 10;
      
      const mostComplex = boms.reduce((max, bom) => 
        bom.components.length > max.components.length ? bom : max
      );
      
      // Get unique component SKUs across all BOMs
      const allComponentSKUs = new Set<string>();
      boms.forEach(bom => {
        bom.components.forEach(component => {
          allComponentSKUs.add(component.sku);
        });
      });
      
      return {
        totalBOMs: boms.length,
        averageComponents,
        mostComplexBOM: {
          code: mostComplex.bomCode,
          name: mostComplex.name,
          componentCount: mostComplex.components.length
        },
        totalUniqueComponents: allComponentSKUs.size
      };
      
    } catch (error) {
      console.error('❌ Error getting BOM statistics:', error);
      throw new Error('Failed to get BOM statistics');
    }
  }
}

export const bomService = new BOMService();