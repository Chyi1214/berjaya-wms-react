// Scan Lookup Service - Manage barcode to zone lookup data
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { ScanLookup } from '../types';

class ScanLookupService {
  private lookupCollection = collection(db, 'scanLookups');

  // Get lookup data for a specific SKU and car type (returns first match for backward compatibility) - v7.19.0
  async getLookupBySKU(sku: string, carType: string): Promise<ScanLookup | null> {
    try {
      const lookups = await this.getAllLookupsBySKU(sku, carType);
      return lookups.length > 0 ? lookups[0] : null;
    } catch (error) {
      console.error('Failed to get lookup for SKU:', sku, error);
      return null;
    }
  }

  // Get ALL zones for a specific SKU and car type (supports multiple zones per component) - v7.19.0
  async getAllLookupsBySKU(sku: string, carType: string): Promise<ScanLookup[]> {
    try {
      const upperSKU = sku.toUpperCase();
      console.log('🔍 Firestore lookup for all zones of SKU:', upperSKU, 'Car Type:', carType);

      const querySnapshot = await getDocs(
        query(
          this.lookupCollection,
          where('sku', '==', upperSKU),
          where('carType', '==', carType),
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
        console.log(`✅ Found ${lookups.length} zones for SKU ${upperSKU} (${carType}):`, lookups.map(l => l.targetZone).join(', '));
      } else {
        console.log('❌ No lookups found for SKU:', upperSKU, 'Car Type:', carType);
      }

      return lookups;
    } catch (error) {
      console.error('Failed to get lookups for SKU:', sku, error);
      return [];
    }
  }

  // Create or update lookup entry (now supports multiple zones per SKU and car type) - v7.19.0
  async saveLookup(lookup: Omit<ScanLookup, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const sku = lookup.sku.toUpperCase();
      const zone = lookup.targetZone;
      const carType = lookup.carType;
      // Use CARTYPE_SKU_ZONE as document ID to support car-type-specific routing
      const docId = `${carType}_${sku}_${zone}`;
      const docRef = doc(this.lookupCollection, docId);

      // Check if document exists
      const existing = await getDoc(docRef);

      if (existing.exists()) {
        // Update existing
        const updateData = prepareForFirestore({ ...lookup, sku }, {
          addUpdatedAt: true
        });
        await updateDoc(docRef, updateData);
        console.log('✅ Updated lookup for CarType+SKU+Zone:', `${carType}/${sku} in ${zone}`);
      } else {
        // Create new
        const createData = prepareForFirestore({ ...lookup, sku }, {
          addCreatedAt: true,
          addUpdatedAt: true
        });
        await setDoc(docRef, createData);
        console.log('✅ Created lookup for CarType+SKU+Zone:', `${carType}/${sku} in ${zone}`);
      }
    } catch (error) {
      console.error('Failed to save lookup:', error);
      throw error;
    }
  }

  // Delete lookup entry (specific CarType+SKU+Zone combination) - v7.19.0
  async deleteLookup(sku: string, carType: string, zone?: string): Promise<void> {
    try {
      if (zone) {
        // Delete specific CarType+SKU+Zone combination
        const docId = `${carType}_${sku.toUpperCase()}_${zone}`;
        const docRef = doc(this.lookupCollection, docId);
        await deleteDoc(docRef);
        console.log('✅ Deleted lookup for CarType+SKU+Zone:', `${carType}/${sku} in ${zone}`);
      } else {
        // Delete all zones for this SKU and car type
        const allLookups = await this.getAllLookupsBySKU(sku, carType);
        const deletePromises = allLookups.map(lookup => {
          const docId = `${lookup.carType}_${lookup.sku}_${lookup.targetZone}`;
          const docRef = doc(this.lookupCollection, docId);
          return deleteDoc(docRef);
        });
        await Promise.all(deletePromises);
        console.log(`✅ Deleted all ${allLookups.length} zones for CarType+SKU:`, `${carType}/${sku}`);
      }
    } catch (error) {
      console.error('Failed to delete lookup:', error);
      throw error;
    }
  }

  // Get all lookup entries (optionally filtered by car type) - v7.19.0
  async getAllLookups(carType?: string): Promise<ScanLookup[]> {
    try {
      let lookupQuery = query(this.lookupCollection, orderBy('sku', 'asc'));

      if (carType) {
        // Filter by specific car type
        lookupQuery = query(this.lookupCollection, where('carType', '==', carType), orderBy('sku', 'asc'));
      }

      const querySnapshot = await getDocs(lookupQuery);

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

  // Bulk import from CSV data (car-type-specific) - v7.19.0
  async bulkImport(lookups: Array<Omit<ScanLookup, 'createdAt' | 'updatedAt' | 'carType'>>, carType: string, userEmail: string): Promise<{ success: number; errors: string[] }> {
    const results = {
      success: 0,
      errors: [] as string[]
    };

    for (const lookup of lookups) {
      try {
        await this.saveLookup({
          ...lookup,
          sku: lookup.sku.toUpperCase(),
          carType, // Add car type to all lookups
          updatedBy: userEmail
        });
        results.success++;
      } catch (error) {
        results.errors.push(`Failed to import SKU ${lookup.sku}: ${error}`);
      }
    }

    console.log(`✅ Bulk import completed for ${carType}: ${results.success} success, ${results.errors.length} errors`);
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

  // Generate test data (v7.19.0: TK1 car type)
  async generateTestData(userEmail: string): Promise<void> {
    const testLookups = [
      // Original simple SKUs (numeric zones) - all for TK1 car type
      { sku: 'A001', carType: 'TK1', targetZone: '8', itemName: 'Engine Part A', expectedQuantity: 50, updatedBy: userEmail },
      { sku: 'A002', carType: 'TK1', targetZone: '12', itemName: 'Engine Part B', expectedQuantity: 30, updatedBy: userEmail },
      { sku: 'B001', carType: 'TK1', targetZone: '5', itemName: 'Body Panel A', expectedQuantity: 25, updatedBy: userEmail },
      { sku: 'B002', carType: 'TK1', targetZone: '5', itemName: 'Body Panel B', expectedQuantity: 25, updatedBy: userEmail },
      { sku: 'E001', carType: 'TK1', targetZone: '15', itemName: 'Electronic Module A', expectedQuantity: 100, updatedBy: userEmail },
      { sku: 'E002', carType: 'TK1', targetZone: '15', itemName: 'Electronic Module B', expectedQuantity: 75, updatedBy: userEmail },
      { sku: 'F001', carType: 'TK1', targetZone: '3', itemName: 'Frame Component A', expectedQuantity: 40, updatedBy: userEmail },
      { sku: 'F002', carType: 'TK1', targetZone: '3', itemName: 'Frame Component B', expectedQuantity: 35, updatedBy: userEmail },

      // Complex QR code SKUs with diverse zone formats
      { sku: 'F16-1301P05AA', carType: 'TK1', targetZone: 'DF02', itemName: 'Distribution Floor Part', expectedQuantity: 20, updatedBy: userEmail },
      { sku: '25469-CX70P250401', carType: 'TK1', targetZone: 'Z001', itemName: 'Special Zone Component', expectedQuantity: 15, updatedBy: userEmail },
      { sku: '2010.0577.1700', carType: 'TK1', targetZone: 'A3', itemName: 'Assembly Area Guard', expectedQuantity: 12, updatedBy: userEmail },
      { sku: '401005094AA', carType: 'TK1', targetZone: 'WH-B7', itemName: 'Warehouse B Section 7', expectedQuantity: 8, updatedBy: userEmail }
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