// Scan Lookup Service - Manage barcode to zone lookup data
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { ScanLookup } from '../types';

class ScanLookupService {
  private lookupCollection = collection(db, 'scanLookups');

  // Get lookup data for a specific SKU (returns first match for backward compatibility)
  async getLookupBySKU(sku: string): Promise<ScanLookup | null> {
    try {
      const lookups = await this.getAllLookupsBySKU(sku);
      return lookups.length > 0 ? lookups[0] : null;
    } catch (error) {
      console.error('Failed to get lookup for SKU:', sku, error);
      return null;
    }
  }

  // Get ALL zones for a specific SKU (supports multiple zones per component)
  async getAllLookupsBySKU(sku: string): Promise<ScanLookup[]> {
    try {
      const upperSKU = sku.toUpperCase();
      console.log('🔍 Firestore lookup for all zones of SKU:', upperSKU);
      
      const querySnapshot = await getDocs(
        query(
          this.lookupCollection,
          where('sku', '==', upperSKU),
          orderBy('targetZone', 'asc')
        )
      );
      
      const lookups: ScanLookup[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ScanLookup;
        lookups.push({
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)
        });
      });
      
      if (lookups.length > 0) {
        console.log(`✅ Found ${lookups.length} zones for SKU ${upperSKU}:`, lookups.map(l => l.targetZone).join(', '));
      } else {
        console.log('❌ No lookups found for SKU:', upperSKU);
      }
      
      return lookups;
    } catch (error) {
      console.error('Failed to get lookups for SKU:', sku, error);
      return [];
    }
  }

  // Create or update lookup entry (now supports multiple zones per SKU)
  async saveLookup(lookup: Omit<ScanLookup, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const sku = lookup.sku.toUpperCase();
      const zone = lookup.targetZone;
      // Use SKU_ZONE as document ID to support multiple zones per component
      const docId = `${sku}_${zone}`;
      const docRef = doc(this.lookupCollection, docId);
      
      // Check if document exists
      const existing = await getDoc(docRef);
      
      if (existing.exists()) {
        // Update existing
        const updateData = prepareForFirestore({ ...lookup, sku }, { 
          addUpdatedAt: true 
        });
        await updateDoc(docRef, updateData);
        console.log('✅ Updated lookup for SKU+Zone:', `${sku} in ${zone}`);
      } else {
        // Create new
        const createData = prepareForFirestore({ ...lookup, sku }, { 
          addCreatedAt: true, 
          addUpdatedAt: true 
        });
        await setDoc(docRef, createData);
        console.log('✅ Created lookup for SKU+Zone:', `${sku} in ${zone}`);
      }
    } catch (error) {
      console.error('Failed to save lookup:', error);
      throw error;
    }
  }

  // Delete lookup entry (specific SKU+Zone combination)
  async deleteLookup(sku: string, zone?: string): Promise<void> {
    try {
      if (zone) {
        // Delete specific SKU+Zone combination
        const docId = `${sku.toUpperCase()}_${zone}`;
        const docRef = doc(this.lookupCollection, docId);
        await deleteDoc(docRef);
        console.log('✅ Deleted lookup for SKU+Zone:', `${sku} in ${zone}`);
      } else {
        // Delete all zones for this SKU (backward compatibility)
        const allLookups = await this.getAllLookupsBySKU(sku);
        const deletePromises = allLookups.map(lookup => {
          const docId = `${lookup.sku}_${lookup.targetZone}`;
          const docRef = doc(this.lookupCollection, docId);
          return deleteDoc(docRef);
        });
        await Promise.all(deletePromises);
        console.log(`✅ Deleted all ${allLookups.length} zones for SKU:`, sku);
      }
    } catch (error) {
      console.error('Failed to delete lookup:', error);
      throw error;
    }
  }

  // Get all lookup entries
  async getAllLookups(): Promise<ScanLookup[]> {
    try {
      const querySnapshot = await getDocs(
        query(this.lookupCollection, orderBy('sku', 'asc'))
      );
      
      const lookups: ScanLookup[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ScanLookup;
        lookups.push({
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)
        });
      });
      
      return lookups;
    } catch (error) {
      console.error('Failed to get all lookups:', error);
      return [];
    }
  }

  // Get lookups for specific zone
  async getLookupsByZone(zone: string): Promise<ScanLookup[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          this.lookupCollection, 
          where('targetZone', '==', zone),
          orderBy('sku', 'asc')
        )
      );
      
      const lookups: ScanLookup[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as ScanLookup;
        lookups.push({
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)
        });
      });
      
      return lookups;
    } catch (error) {
      console.error('Failed to get lookups by zone:', error);
      return [];
    }
  }

  // Bulk import from CSV data
  async bulkImport(lookups: Array<Omit<ScanLookup, 'createdAt' | 'updatedAt'>>, userEmail: string): Promise<{ success: number; errors: string[] }> {
    const results = {
      success: 0,
      errors: [] as string[]
    };

    for (const lookup of lookups) {
      try {
        await this.saveLookup({
          ...lookup,
          sku: lookup.sku.toUpperCase(),
          updatedBy: userEmail
        });
        results.success++;
      } catch (error) {
        results.errors.push(`Failed to import SKU ${lookup.sku}: ${error}`);
      }
    }

    console.log(`✅ Bulk import completed: ${results.success} success, ${results.errors.length} errors`);
    return results;
  }

  // Clear all lookup data (for testing)
  async clearAllLookups(): Promise<void> {
    try {
      const querySnapshot = await getDocs(this.lookupCollection);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log('✅ Cleared all scan lookups');
    } catch (error) {
      console.error('Failed to clear lookups:', error);
      throw error;
    }
  }

  // Generate test data
  async generateTestData(userEmail: string): Promise<void> {
    const testLookups = [
      // Original simple SKUs (numeric zones)
      { sku: 'A001', targetZone: '8', itemName: 'Engine Part A', expectedQuantity: 50, updatedBy: userEmail },
      { sku: 'A002', targetZone: '12', itemName: 'Engine Part B', expectedQuantity: 30, updatedBy: userEmail },
      { sku: 'B001', targetZone: '5', itemName: 'Body Panel A', expectedQuantity: 25, updatedBy: userEmail },
      { sku: 'B002', targetZone: '5', itemName: 'Body Panel B', expectedQuantity: 25, updatedBy: userEmail },
      { sku: 'E001', targetZone: '15', itemName: 'Electronic Module A', expectedQuantity: 100, updatedBy: userEmail },
      { sku: 'E002', targetZone: '15', itemName: 'Electronic Module B', expectedQuantity: 75, updatedBy: userEmail },
      { sku: 'F001', targetZone: '3', itemName: 'Frame Component A', expectedQuantity: 40, updatedBy: userEmail },
      { sku: 'F002', targetZone: '3', itemName: 'Frame Component B', expectedQuantity: 35, updatedBy: userEmail },
      
      // Complex QR code SKUs with diverse zone formats
      { sku: 'F16-1301P05AA', targetZone: 'DF02', itemName: 'Distribution Floor Part', expectedQuantity: 20, updatedBy: userEmail },
      { sku: '25469-CX70P250401', targetZone: 'Z001', itemName: 'Special Zone Component', expectedQuantity: 15, updatedBy: userEmail },
      { sku: '2010.0577.1700', targetZone: 'A3', itemName: 'Assembly Area Guard', expectedQuantity: 12, updatedBy: userEmail },
      { sku: '401005094AA', targetZone: 'WH-B7', itemName: 'Warehouse B Section 7', expectedQuantity: 8, updatedBy: userEmail }
    ];

    // Clean each lookup to remove any potential undefined values
    const cleanedLookups = testLookups.map(lookup => {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(lookup)) {
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
      return cleaned as Omit<ScanLookup, 'createdAt' | 'updatedAt'>;
    });

    for (const lookup of cleanedLookups) {
      await this.saveLookup(lookup);
    }

    console.log('✅ Generated scanner test data');
  }
}

export const scanLookupService = new ScanLookupService();
export default scanLookupService;