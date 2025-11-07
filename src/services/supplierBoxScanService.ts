// Supplier Box Scan Service - Track QR codes to prevent double-counting
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc
} from './costTracking/firestoreWrapper';
import { serverTimestamp, limit } from 'firebase/firestore';
import { db } from './firebase';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('SupplierBoxScanService');

const SCANS_COLLECTION = 'supplierBoxScans';

export interface SupplierBoxScanRecord {
  id?: string;
  supplierBoxQR: string;      // Raw QR code from supplier box
  batchId: string;             // Which batch it was scanned for
  scannedAt: Date;             // When it was scanned
  scannedBy: string;           // Worker email
  sku: string;                 // What SKU was in the box
  quantity: number;            // How many items worker counted
  caseNo: string | null;       // Internal packing box (null for DEFAULT batch)
  transactionId: string;       // Link to inventory transaction
}

class SupplierBoxScanService {
  /**
   * Check if a QR code has already been scanned for a specific batch
   * Returns the existing scan record if found, null otherwise
   */
  async checkDuplicate(
    qrCode: string,
    batchId: string
  ): Promise<SupplierBoxScanRecord | null> {
    try {
      const q = query(
        collection(db, SCANS_COLLECTION),
        where('supplierBoxQR', '==', qrCode),
        where('batchId', '==', batchId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        supplierBoxQR: data.supplierBoxQR,
        batchId: data.batchId,
        scannedAt: data.scannedAt?.toDate() || new Date(),
        scannedBy: data.scannedBy,
        sku: data.sku,
        quantity: data.quantity,
        caseNo: data.caseNo || null,
        transactionId: data.transactionId
      };
    } catch (error) {
      logger.error('Error checking duplicate QR code:', error);
      throw new Error('Failed to check for duplicate scan');
    }
  }

  /**
   * Record a new supplier box scan
   */
  async recordScan(data: Omit<SupplierBoxScanRecord, 'id' | 'scannedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, SCANS_COLLECTION), {
        supplierBoxQR: data.supplierBoxQR,
        batchId: data.batchId,
        scannedAt: serverTimestamp(),
        scannedBy: data.scannedBy,
        sku: data.sku,
        quantity: data.quantity,
        caseNo: data.caseNo || null,
        transactionId: data.transactionId
      });

      logger.info('Supplier box scan recorded:', {
        scanId: docRef.id,
        qrCode: data.supplierBoxQR,
        batchId: data.batchId
      });

      return docRef.id;
    } catch (error) {
      logger.error('Error recording supplier box scan:', error);
      throw new Error('Failed to record scan');
    }
  }

  /**
   * Get all scans for a specific batch
   * Used by manager view to review scan history
   */
  async getScansByBatch(batchId: string, limitCount: number = 100): Promise<SupplierBoxScanRecord[]> {
    try {
      const q = query(
        collection(db, SCANS_COLLECTION),
        where('batchId', '==', batchId),
        orderBy('scannedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const scans: SupplierBoxScanRecord[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        scans.push({
          id: doc.id,
          supplierBoxQR: data.supplierBoxQR,
          batchId: data.batchId,
          scannedAt: data.scannedAt?.toDate() || new Date(),
          scannedBy: data.scannedBy,
          sku: data.sku,
          quantity: data.quantity,
          caseNo: data.caseNo || null,
          transactionId: data.transactionId
        });
      });

      logger.debug('Retrieved supplier box scans:', { batchId, count: scans.length });
      return scans;
    } catch (error) {
      logger.error('Error getting scans by batch:', error);
      throw new Error('Failed to get scans');
    }
  }

  /**
   * Find duplicate scans across all batches
   * Helps identify QR codes that were scanned multiple times
   */
  async findDuplicates(batchId: string): Promise<Map<string, SupplierBoxScanRecord[]>> {
    try {
      const scans = await this.getScansByBatch(batchId, 1000);

      // Group by QR code
      const groupedByQR = new Map<string, SupplierBoxScanRecord[]>();

      scans.forEach((scan) => {
        const existing = groupedByQR.get(scan.supplierBoxQR) || [];
        existing.push(scan);
        groupedByQR.set(scan.supplierBoxQR, existing);
      });

      // Filter to only duplicates (more than 1 scan)
      const duplicates = new Map<string, SupplierBoxScanRecord[]>();

      groupedByQR.forEach((scans, qrCode) => {
        if (scans.length > 1) {
          duplicates.set(qrCode, scans);
        }
      });

      logger.info('Found duplicate QR scans:', {
        batchId,
        duplicateCount: duplicates.size
      });

      return duplicates;
    } catch (error) {
      logger.error('Error finding duplicates:', error);
      throw new Error('Failed to find duplicates');
    }
  }

  /**
   * Delete a scan record
   * Used by managers to correct mistakes
   */
  async deleteScan(scanId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, SCANS_COLLECTION, scanId));

      logger.info('Supplier box scan deleted:', { scanId });
    } catch (error) {
      logger.error('Error deleting scan:', error);
      throw new Error('Failed to delete scan');
    }
  }

  /**
   * Delete all scans for a specific batch
   * Used by managers to clear scan history for a completed/cancelled batch
   */
  async deleteAllScansForBatch(batchId: string): Promise<number> {
    try {
      logger.info('Deleting all scans for batch:', batchId);

      // Get all scans for this batch (no limit)
      const q = query(
        collection(db, SCANS_COLLECTION),
        where('batchId', '==', batchId)
      );

      const snapshot = await getDocs(q);
      const totalScans = snapshot.size;

      if (totalScans === 0) {
        logger.info('No scans found for batch:', batchId);
        return 0;
      }

      // Delete all scans in parallel
      const deletions = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletions);

      logger.info('All scans deleted for batch:', { batchId, count: totalScans });
      return totalScans;
    } catch (error) {
      logger.error('Error deleting all scans for batch:', error);
      throw new Error('Failed to delete all scans for batch');
    }
  }

  /**
   * Get a specific scan by ID
   */
  async getScanById(scanId: string): Promise<SupplierBoxScanRecord | null> {
    try {
      const snapshot = await getDocs(query(collection(db, SCANS_COLLECTION), where('__name__', '==', scanId), limit(1)));

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        supplierBoxQR: data.supplierBoxQR,
        batchId: data.batchId,
        scannedAt: data.scannedAt?.toDate() || new Date(),
        scannedBy: data.scannedBy,
        sku: data.sku,
        quantity: data.quantity,
        caseNo: data.caseNo || null,
        transactionId: data.transactionId
      };
    } catch (error) {
      logger.error('Error getting scan by ID:', error);
      return null;
    }
  }
}

export const supplierBoxScanService = new SupplierBoxScanService();
