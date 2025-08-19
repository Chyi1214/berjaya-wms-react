// Scan Lookup Service - Manage barcode to zone lookup data
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';
import { ScanLookup } from '../types';

class ScanLookupService {
  private lookupCollection = collection(db, 'scanLookups');

  // Get lookup data for a specific SKU
  async getLookupBySKU(sku: string): Promise<ScanLookup | null> {
    try {
      const docRef = doc(this.lookupCollection, sku.toUpperCase());
      console.log('🔍 Firestore lookup for SKU:', sku.toUpperCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ScanLookup;
        console.log('✅ Found lookup data:', data);
        return {
          ...data,
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)
        };
      }
      
      console.log('❌ No lookup found for SKU:', sku.toUpperCase());
      return null;
    } catch (error) {
      console.error('Failed to get lookup for SKU:', sku, error);
      return null;
    }
  }

  // Create or update lookup entry
  async saveLookup(lookup: Omit<ScanLookup, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const sku = lookup.sku.toUpperCase();
      const docRef = doc(this.lookupCollection, sku);
      
      // Check if document exists
      const existing = await getDoc(docRef);
      const now = new Date();
      
      // Clean data - remove undefined fields for Firestore
      const cleanData = Object.fromEntries(
        Object.entries({ ...lookup, sku }).filter(([_, value]) => value !== undefined)
      );

      if (existing.exists()) {
        // Update existing
        await updateDoc(docRef, {
          ...cleanData,
          updatedAt: now
        });
        console.log('✅ Updated lookup for SKU:', sku);
      } else {
        // Create new
        await setDoc(docRef, {
          ...cleanData,
          createdAt: now,
          updatedAt: now
        });
        console.log('✅ Created lookup for SKU:', sku);
      }
    } catch (error) {
      console.error('Failed to save lookup:', error);
      throw error;
    }
  }

  // Delete lookup entry
  async deleteLookup(sku: string): Promise<void> {
    try {
      await deleteDoc(doc(this.lookupCollection, sku.toUpperCase()));
      console.log('✅ Deleted lookup for SKU:', sku);
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
  async getLookupsByZone(zone: number): Promise<ScanLookup[]> {
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
      // Original simple SKUs
      { sku: 'A001', targetZone: 8, itemName: 'Engine Part A', expectedQuantity: 50, updatedBy: userEmail },
      { sku: 'A002', targetZone: 12, itemName: 'Engine Part B', expectedQuantity: 30, updatedBy: userEmail },
      { sku: 'B001', targetZone: 5, itemName: 'Body Panel A', expectedQuantity: 25, updatedBy: userEmail },
      { sku: 'B002', targetZone: 5, itemName: 'Body Panel B', expectedQuantity: 25, updatedBy: userEmail },
      { sku: 'E001', targetZone: 15, itemName: 'Electronic Module A', expectedQuantity: 100, updatedBy: userEmail },
      { sku: 'E002', targetZone: 15, itemName: 'Electronic Module B', expectedQuantity: 75, updatedBy: userEmail },
      { sku: 'F001', targetZone: 3, itemName: 'Frame Component A', expectedQuantity: 40, updatedBy: userEmail },
      { sku: 'F002', targetZone: 3, itemName: 'Frame Component B', expectedQuantity: 35, updatedBy: userEmail },
      
      // Complex QR code SKUs (realistic formats from multiple providers)
      { sku: 'F16-1301P05AA', targetZone: 2, itemName: 'Provider A Part', expectedQuantity: 20, updatedBy: userEmail },
      { sku: '25469-CX70P250401', targetZone: 7, itemName: 'Provider B Component', expectedQuantity: 15, updatedBy: userEmail },
      { sku: '2010.0577.1700', targetZone: 18, itemName: 'T1NRHD Right Lower Guard', expectedQuantity: 12, updatedBy: userEmail },
      { sku: '401005094AA', targetZone: 22, itemName: 'Specification Part', expectedQuantity: 8, updatedBy: userEmail }
    ];

    // Clean each lookup to remove any potential undefined values
    const cleanedLookups = testLookups.map(lookup => {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(lookup)) {
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
      return cleaned;
    });

    for (const lookup of cleanedLookups) {
      await this.saveLookup(lookup);
    }

    console.log('✅ Generated scanner test data');
  }
}

export const scanLookupService = new ScanLookupService();
export default scanLookupService;