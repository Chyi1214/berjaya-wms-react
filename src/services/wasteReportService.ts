// Waste Report Service - Individual waste/lost/defect report tracking
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  updateDoc,
  doc
} from './costTracking/firestoreWrapper';
import { limit } from 'firebase/firestore';
import { db } from './firebase';
import { trackStorageDownload } from './costTracking/costTracker';

// Waste Report Interface
export interface WasteReport {
  id?: string;
  sku: string;
  itemName: string;
  quantity: number;
  location: string;
  locationDisplay: string; // "Logistics" or "Zone 5"
  type: 'WASTE' | 'LOST' | 'DEFECT' | 'UNPLANNED_USAGE';
  reason: string;
  detailedReason: string;

  // Batch tracking (v7.18.0)
  batchId?: string;           // Which batch this waste came from
  batchAllocation?: number;   // How much was in that batch at time of report

  // DEFECT-specific fields
  rejectionReasons?: string[];
  customReason?: string;
  totalLotQuantity?: number;
  shift?: string;
  detectedBy?: string;
  actionTaken?: string;

  // Image evidence (v7.38.2) - Required for waste/defect reports
  labelImageUrl?: string;     // Photo of item label/part number
  damageImageUrl?: string;    // Photo of actual damage/defect
  labelImageSize?: number;    // Size in bytes of label image
  damageImageSize?: number;   // Size in bytes of damage image

  // Metadata
  reportedBy: string;
  reportedAt: Date;

  // Approval (manager review)
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: Date;

  // Generated claim report (for DEFECT)
  claimReport?: string;
}

// Firestore collection
const WASTE_REPORTS_COLLECTION = 'waste_reports';

class WasteReportService {

  /**
   * Track image view when a single report is opened in modal
   * Call this when user clicks "View Details" to see images
   */
  trackReportImageView(report: WasteReport) {
    const ESTIMATED_IMAGE_SIZE = 200 * 1024; // 200KB fallback estimate

    let totalBytes = 0;

    // Use actual sizes if available, otherwise estimate
    if (report.labelImageUrl) {
      totalBytes += report.labelImageSize || ESTIMATED_IMAGE_SIZE;
    }
    if (report.damageImageUrl) {
      totalBytes += report.damageImageSize || ESTIMATED_IMAGE_SIZE;
    }

    if (totalBytes > 0) {
      // Track as storage download (view) - This is the expensive part!
      // Downloads cost $0.12 per GB while uploads are free
      trackStorageDownload('WasteReportService', 'viewReportImages', totalBytes);
      console.log(`📥 Image download tracked: ${(totalBytes / 1024).toFixed(2)} KB`);
    }
  }


  /**
   * Create a new individual waste report
   */
  async createWasteReport(report: Omit<WasteReport, 'id' | 'reportedAt'>): Promise<string> {
    try {
      const reportData = {
        ...report,
        reportedAt: Timestamp.now()
      };

      console.log('📝 Creating individual waste report:', reportData);
      const docRef = await addDoc(collection(db, WASTE_REPORTS_COLLECTION), reportData);

      console.log('✅ Waste report created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to create waste report:', error);
      throw error;
    }
  }

  /**
   * Get all waste reports with optional filtering
   */
  async getAllWasteReports(options?: {
    type?: 'WASTE' | 'LOST' | 'DEFECT' | 'ALL';
    location?: string;
    limit?: number;
  }): Promise<WasteReport[]> {
    try {
      let wasteQuery = query(
        collection(db, WASTE_REPORTS_COLLECTION),
        orderBy('reportedAt', 'desc')
      );

      // Add type filter
      if (options?.type && options.type !== 'ALL') {
        wasteQuery = query(wasteQuery, where('type', '==', options.type));
      }

      // Add location filter
      if (options?.location) {
        wasteQuery = query(wasteQuery, where('location', '==', options.location));
      }

      // Add limit
      if (options?.limit) {
        wasteQuery = query(wasteQuery, limit(options.limit));
      }

      const snapshot = await getDocs(wasteQuery);
      const reports: WasteReport[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reportedAt: doc.data().reportedAt?.toDate() || new Date()
      } as WasteReport));

      // DON'T track image views here - only track when modal opens
      // this.trackImageViews(reports);

      console.log(`📊 Retrieved ${reports.length} waste reports`);
      return reports;
    } catch (error) {
      console.error('❌ Failed to get waste reports:', error);
      throw error;
    }
  }

  /**
   * Get waste reports for a specific SKU
   */
  async getReportsBySKU(sku: string): Promise<WasteReport[]> {
    try {
      const wasteQuery = query(
        collection(db, WASTE_REPORTS_COLLECTION),
        where('sku', '==', sku),
        orderBy('reportedAt', 'desc')
      );

      const snapshot = await getDocs(wasteQuery);
      const reports: WasteReport[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        reportedAt: doc.data().reportedAt?.toDate() || new Date()
      } as WasteReport));

      // DON'T track image views here - only track when modal opens
      // this.trackImageViews(reports);

      return reports;
    } catch (error) {
      console.error('❌ Failed to get reports by SKU:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getWasteSummary(): Promise<{
    totalReports: number;
    totalQuantity: number;
    wasteCount: number;
    lostCount: number;
    defectCount: number;
    locationsCount: number;
  }> {
    try {
      const reports = await this.getAllWasteReports();

      const summary = {
        totalReports: reports.length,
        totalQuantity: reports.reduce((sum, report) => sum + report.quantity, 0),
        wasteCount: reports.filter(r => r.type === 'WASTE').length,
        lostCount: reports.filter(r => r.type === 'LOST').length,
        defectCount: reports.filter(r => r.type === 'DEFECT').length,
        locationsCount: new Set(reports.map(r => r.location)).size
      };

      return summary;
    } catch (error) {
      console.error('❌ Failed to get waste summary:', error);
      throw error;
    }
  }

  /**
   * Approve a waste report (manager action)
   */
  async approveWasteReport(reportId: string, approvedBy: string): Promise<void> {
    try {
      const reportRef = doc(db, WASTE_REPORTS_COLLECTION, reportId);
      await updateDoc(reportRef, {
        approved: true,
        approvedBy: approvedBy,
        approvedAt: Timestamp.now()
      });

      console.log('✅ Waste report approved:', reportId);
    } catch (error) {
      console.error('❌ Failed to approve waste report:', error);
      throw error;
    }
  }

  /**
   * Generate claim report text for DEFECT items
   */
  static generateClaimReport(report: WasteReport): string {
    if (report.type !== 'DEFECT') {
      return '';
    }

    const date = report.reportedAt.toLocaleDateString();
    const time = report.reportedAt.toLocaleTimeString();

    return `
REJECT PART LOG
Date: ${date} Shift / Time: ${report.shift || time}

Part Name / Description: ${report.itemName} Part Number / Code: ${report.sku}

Quantity Rejected: ${report.quantity} Total Lot Quantity: ${report.totalLotQuantity || ''}

Reason for Rejection:
${['Defect (scratch, dent, crack, etc.)', 'Wrong dimension / out of spec', 'Missing component', 'Contamination (oil, dirt, rust, etc.)'].map(reason =>
  `☐ ${report.rejectionReasons?.includes(reason) ? '✓' : ' '} ${reason}`
).join('\n')}
☐ ${report.customReason ? '✓' : ' '} Others: ${report.customReason || ''}

Detected By (Name / Dept.): ${report.detectedBy || report.reportedBy}
Action Taken: ${['Rework', 'Scrap', 'Return to supplier', 'Hold for further inspection'].map(action =>
  `☐ ${report.actionTaken === action ? '✓' : ' '} ${action}`
).join(' ')}
Checked / Verified By: ________________________ Signature: ________________________
    `.trim();
  }
}

// Export singleton instance
export const wasteReportService = new WasteReportService();
export default wasteReportService;