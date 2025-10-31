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
  orderBy,
  limit,
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

export interface SkippedRowDetail {
  rowNumber: number;
  rowData: string[];
  reason: string;
  extractedValues?: {
    caseNo: string;
    partNo: string;
    qty: string;
  };
}

export interface ImportStats {
  boxes: number;
  totalRows: number;
  skippedRows: number;
  errors: string[];
  skippedDetails?: SkippedRowDetail[];
}

export interface ColumnPreview {
  columnIndex: number;
  header: string;
  sampleData: string[];
  suggestedMapping: 'caseNo' | 'partNo' | 'qty' | 'ignore';
}

export interface ColumnMapping {
  caseNoIndex: number;
  partNoIndex: number;
  qtyIndex: number;
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
  // RFC 4180 compliant CSV parser that handles quoted fields with commas
  const lines = csv.replace(/\r\n?/g, '\n').split('\n');

  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote ("") inside quoted field
            currentCell += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }

      // Add last cell
      cells.push(currentCell.trim());

      return cells;
    });
}

// OBSOLETE: computeStatus function removed in v7.8.0 - status is now computed inline in applyScan
// Flexible mode doesn't enforce strict validation, status reflects reality not expectations

// Smart column mapping suggestion
function suggestColumnMapping(header: string): 'caseNo' | 'partNo' | 'qty' | 'ignore' {
  const normalized = normalizeHeader(header);

  if (normalized.includes('case')) return 'caseNo';
  if (normalized.includes('part') && !normalized.includes('name')) return 'partNo';
  if (normalized.includes('qty') || normalized.includes('quantity')) return 'qty';

  return 'ignore';
}

export const packingBoxesService = {
  // NEW: Generate column preview with smart suggestions for mapping
  generateColumnPreview: (csvText: string): ColumnPreview[] => {
    const rows = parseCSV(csvText);
    if (rows.length === 0) return [];

    // Find the header row - look for row that contains case/part/qty keywords
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowText = rows[i].join(' ').toLowerCase();
      if (rowText.includes('case') || rowText.includes('part') || rowText.includes('qty')) {
        headerRowIndex = i;
        break;
      }
    }

    const headerRow = rows[headerRowIndex];
    const dataStartIndex = headerRowIndex + 1;

    // Generate preview for each column
    const previews: ColumnPreview[] = headerRow.map((header, index) => {
      const sampleData: string[] = [];

      // Collect up to 3 sample data rows
      for (let i = dataStartIndex; i < Math.min(dataStartIndex + 3, rows.length); i++) {
        const value = rows[i][index] || '';
        if (value.trim()) {
          sampleData.push(value.trim());
        }
      }

      return {
        columnIndex: index,
        header: header.trim(),
        sampleData,
        suggestedMapping: suggestColumnMapping(header)
      };
    });

    return previews;
  },

  // NEW: Import with custom column mapping
  importPackingListWithMapping: async (
    batchId: string,
    csvText: string,
    mapping: ColumnMapping
  ): Promise<ImportStats> => {
    // Check if batch is locked (activated)
    const { batchManagementService } = await import('./batchManagement');
    const batch = await batchManagementService.getBatchById(batchId);

    if (batch && batch.status === 'in_progress') {
      return {
        boxes: 0,
        totalRows: 0,
        skippedRows: 0,
        errors: ['❌ Batch is activated and locked. Cannot modify packing list after activation.']
      };
    }

    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return { boxes: 0, totalRows: 0, skippedRows: 0, errors: ['Empty CSV'] };
    }

    // Find header row
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowText = rows[i].join(' ').toLowerCase();
      if (rowText.includes('case') || rowText.includes('part') || rowText.includes('qty')) {
        headerRowIndex = i;
        break;
      }
    }

    const dataStartIndex = headerRowIndex + 1;

    // Validate column indices
    const maxIndex = Math.max(mapping.caseNoIndex, mapping.partNoIndex, mapping.qtyIndex);

    // Group by caseNo, sum expectedBySku
    const grouped = new Map<string, Record<string, number>>();
    let skipped = 0;
    const errors: string[] = [];
    const skippedDetails: SkippedRowDetail[] = [];

    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1; // 1-based row number for user display

      if (!row || row.length <= maxIndex) {
        skipped++;
        skippedDetails.push({
          rowNumber,
          rowData: row || [],
          reason: 'Row is empty or has insufficient columns'
        });
        continue;
      }

      const caseNo = row[mapping.caseNoIndex]?.trim() || '';
      const sku = row[mapping.partNoIndex]?.trim() || '';
      const qtyRaw = row[mapping.qtyIndex]?.trim() || '';
      const qty = parseInt(qtyRaw, 10);

      if (!caseNo || !sku || !Number.isFinite(qty) || qty <= 0) {
        skipped++;
        let reason = 'Invalid data: ';
        if (!caseNo) reason += 'Missing CASE NO. ';
        if (!sku) reason += 'Missing PART NO. ';
        if (!Number.isFinite(qty) || qty <= 0) reason += `Invalid QTY "${qtyRaw}".`;

        skippedDetails.push({
          rowNumber,
          rowData: row,
          reason: reason.trim(),
          extractedValues: {
            caseNo: caseNo || '(empty)',
            partNo: sku || '(empty)',
            qty: qtyRaw || '(empty)'
          }
        });
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

    logger.info('Packing list imported with custom mapping', {
      batchId,
      boxes: grouped.size,
      expectedTotal,
      mapping,
      skipped
    });

    return {
      boxes: grouped.size,
      totalRows: rows.length - dataStartIndex,
      skippedRows: skipped,
      errors,
      skippedDetails
    };
  },

  // LEGACY: Replace all packing boxes for a batch using a minimal CSV (CASE NO, PART NO, QTY)
  importPackingListForBatch: async (batchId: string, csvText: string): Promise<ImportStats> => {
    // Check if batch is locked (activated)
    const { batchManagementService } = await import('./batchManagement');
    const batch = await batchManagementService.getBatchById(batchId);

    if (batch && batch.status === 'in_progress') {
      return {
        boxes: 0,
        totalRows: 0,
        skippedRows: 0,
        errors: ['❌ Batch is activated and locked. Cannot modify packing list after activation.']
      };
    }

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
  // List recent scans for a box (most recent first)
  listScans: async (
    batchId: string,
    caseNo: string,
    max: number = 50
  ): Promise<Array<{ sku: string; qty: number; userEmail: string; timestamp: Date }>> => {
    const ref = doc(db, BOXES_COL, `${batchId}_${caseNo}`);
    const scansCol = collection(ref, 'scans');
    const snap = await getDocs(query(scansCol, orderBy('timestamp', 'desc'), limit(max)));
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        sku: data.sku,
        qty: data.qty,
        userEmail: data.userEmail,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      };
    });
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

      // FLEXIBLE MODE: Create box if doesn't exist, track actual reality
      let data: PackingBoxDoc;
      if (!snap.exists()) {
        // Auto-create box for flexible scanning
        data = {
          batchId,
          caseNo,
          expectedBySku: {},  // No expectations in flexible mode
          scannedBySku: {},
          totals: { expectedQty: 0, scannedQty: 0 },
          status: 'in_progress' as any,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
      } else {
        data = snap.data() as PackingBoxDoc;
      }

      // NO VALIDATION - just track what actually happened
      const currentScanned = data.scannedBySku[sku] || 0;
      const newScannedBySku = { ...data.scannedBySku, [sku]: currentScanned + qty };
      const newTotalsScanned = Object.values(newScannedBySku).reduce((a, b) => a + b, 0);
      const expectedTotal = Object.values(data.expectedBySku).reduce((a, b) => a + b, 0);

      // Status reflects reality, not validation
      let newStatus: string;
      if (newTotalsScanned === 0) {
        newStatus = 'not_started';
      } else if (expectedTotal > 0 && newTotalsScanned >= expectedTotal) {
        newStatus = 'complete';
      } else if (newTotalsScanned > expectedTotal) {
        newStatus = 'over_scanned';
      } else {
        newStatus = 'in_progress';
      }

      const updated: PackingBoxDoc = {
        ...data,
        scannedBySku: newScannedBySku,
        totals: { expectedQty: expectedTotal, scannedQty: newTotalsScanned },
        status: newStatus as any,
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
