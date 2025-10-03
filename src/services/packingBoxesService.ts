// Packing Boxes Service - minimal, maintainable box tracking per batch
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  deleteDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('PackingBoxesService');

export interface PackingBoxDoc {
  batchId: string;
  caseNo: string;
  expectedBySku: Record<string, number>;
  scannedBySku: Record<string, number>;
  totals: { expectedQty: number; scannedQty: number };
  status: 'not_started' | 'in_progress' | 'complete' | 'over_scanned';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ImportStats {
  boxes: number;
  totalRows: number;
  skippedRows: number;
  errors: string[];
}

const BOXES_COL = 'packingBoxes';

// Header normalization: case-insensitive, strip spaces and punctuation
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\uFEFF/g, '') // strip BOM if present
    .replace(/[^a-z0-9]/g, '');
}

function parseCSV(csv: string): string[][] {
  // Minimal CSV parser for simple comma-separated values; trims CRLF
  const lines = csv.replace(/\r\n?/g, '\n').split('\n');
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      line
        .split(',')
        .map((cell) => cell.trim().replace(/^"|"$/g, ''))
    );
}

function computeStatus(expectedBySku: Record<string, number>, scannedBySku: Record<string, number>): PackingBoxDoc['status'] {
  // Over-scanned check
  for (const sku of Object.keys(scannedBySku)) {
    const scanned = scannedBySku[sku] || 0;
    const expected = expectedBySku[sku] || 0;
    if (scanned > expected) return 'over_scanned';
  }
  const totalExpected = Object.values(expectedBySku).reduce((a, b) => a + b, 0);
  const totalScanned = Object.values(scannedBySku).reduce((a, b) => a + b, 0);
  if (totalScanned === 0) return 'not_started';
  if (totalScanned < totalExpected) return 'in_progress';
  // Complete when every sku meets expected exactly
  for (const sku of Object.keys(expectedBySku)) {
    if ((scannedBySku[sku] || 0) !== expectedBySku[sku]) return 'in_progress';
  }
  return 'complete';
}

export const packingBoxesService = {
  // Replace all packing boxes for a batch using a minimal CSV (CASE NO, PART NO, QTY)
  importPackingListForBatch: async (batchId: string, csvText: string): Promise<ImportStats> => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return { boxes: 0, totalRows: 0, skippedRows: 0, errors: ['Empty CSV'] };
    }

    const header = rows[0].map(normalizeHeader);
    const caseIdx = header.findIndex((h) => h === 'caseno');
    const skuIdx = header.findIndex((h) => h === 'partno');
    const qtyIdx = header.findIndex((h) => h === 'qty');
    if (caseIdx < 0 || skuIdx < 0 || qtyIdx < 0) {
      return {
        boxes: 0,
        totalRows: rows.length - 1,
        skippedRows: rows.length - 1,
        errors: ['Missing required headers: CASE NO, PART NO, QTY (case-insensitive)'],
      };
    }

    // Group by caseNo, sum expectedBySku
    const grouped = new Map<string, Record<string, number>>();
    let skipped = 0;
    const errors: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < Math.max(caseIdx, skuIdx, qtyIdx) + 1) {
        skipped++;
        continue;
      }
      const caseNo = row[caseIdx]?.trim();
      const sku = row[skuIdx]?.trim();
      const qtyRaw = row[qtyIdx]?.trim();
      const qty = parseInt(qtyRaw, 10);
      if (!caseNo || !sku || !Number.isFinite(qty) || qty <= 0) {
        skipped++;
        continue;
      }
      const box = grouped.get(caseNo) || {};
      box[sku] = (box[sku] || 0) + qty;
      grouped.set(caseNo, box);
    }

    // Replace: delete existing docs for batch
    const q = query(collection(db, BOXES_COL), where('batchId', '==', batchId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    const now = Timestamp.now();
    let expectedTotal = 0;
    // Create new docs
    for (const [caseNo, expectedBySku] of grouped.entries()) {
      const docId = `${batchId}_${caseNo}`;
      const totalsExpected = Object.values(expectedBySku).reduce((a, b) => a + b, 0);
      expectedTotal += totalsExpected;
      const data: PackingBoxDoc = {
        batchId,
        caseNo,
        expectedBySku,
        scannedBySku: {},
        totals: { expectedQty: totalsExpected, scannedQty: 0 },
        status: 'not_started',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, BOXES_COL, docId), data);
    }

    logger.info('Packing list imported', { batchId, boxes: grouped.size, expectedTotal });
    return { boxes: grouped.size, totalRows: rows.length - 1, skippedRows: skipped, errors };
  },

  listBoxes: async (batchId: string): Promise<PackingBoxDoc[]> => {
    const q = query(collection(db, BOXES_COL), where('batchId', '==', batchId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PackingBoxDoc);
  },

  getBox: async (batchId: string, caseNo: string): Promise<PackingBoxDoc | null> => {
    const docId = `${batchId}_${caseNo}`;
    const d = await getDoc(doc(db, BOXES_COL, docId));
    return d.exists() ? (d.data() as PackingBoxDoc) : null;
  },

  // Transactionally apply a scan to a box, enforcing expected limits
  applyScan: async (
    batchId: string,
    caseNo: string,
    sku: string,
    qty: number,
    userEmail: string
  ): Promise<PackingBoxDoc> => {
    const docId = `${batchId}_${caseNo}`;
    const ref = doc(db, BOXES_COL, docId);

    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error(`Box not found: ${caseNo}`);
      const data = snap.data() as PackingBoxDoc;
      const expected = data.expectedBySku[sku] || 0;
      if (expected <= 0) throw new Error(`SKU ${sku} not in box ${caseNo}`);
      const currentScanned = data.scannedBySku[sku] || 0;
      if (currentScanned + qty > expected) {
        throw new Error(
          `Exceeds expected for ${sku} in box ${caseNo}. Available: ${expected - currentScanned}, requested: ${qty}`
        );
      }

      const newScannedBySku = { ...data.scannedBySku, [sku]: currentScanned + qty };
      const newTotalsScanned = Object.values(newScannedBySku).reduce((a, b) => a + b, 0);
      const newStatus = computeStatus(data.expectedBySku, newScannedBySku);
      const updated: PackingBoxDoc = {
        ...data,
        scannedBySku: newScannedBySku,
        totals: { expectedQty: data.totals.expectedQty, scannedQty: newTotalsScanned },
        status: newStatus,
        updatedAt: Timestamp.now(),
      };
      tx.set(ref, updated);

      // Append scan event (best-effort outside transaction)
      try {
        const scansCol = collection(ref, 'scans');
        await setDoc(doc(scansCol), {
          sku,
          qty,
          userEmail,
          timestamp: Timestamp.now(),
          source: 'scanner',
        } as Record<string, unknown>);
      } catch (e) {
        logger.warn('Failed to append scan event', e);
      }

      return updated;
    });
  },
};

