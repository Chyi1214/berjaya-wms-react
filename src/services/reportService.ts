// Report Service - v5.7 Worker Report Button System
import { collection, doc, addDoc, getDocs, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface WorkerReport {
  id?: string;
  zoneId: number;
  reportedBy: string;
  reportedByName: string;
  timestamp: Date;
  status: 'active' | 'dismissed';
  dismissedBy?: string;
  dismissedAt?: Date;
  type: 'general'; // Can expand later for specific report types
}

class ReportService {
  private reportsCollection = collection(db, 'workerReports');

  // Submit a new report from worker
  async submitReport(zoneId: number, reportedBy: string, reportedByName: string): Promise<string> {
    try {
      const reportData = {
        zoneId,
        reportedBy,
        reportedByName,
        timestamp: new Date(),
        status: 'active',
        type: 'general'
      };

      const docRef = await addDoc(this.reportsCollection, reportData);
      console.log('✅ Report submitted:', docRef.id, 'Zone:', zoneId);
      return docRef.id;
    } catch (error) {
      console.error('Failed to submit report:', error);
      throw error;
    }
  }

  // Get all active reports (for info board)
  async getActiveReports(): Promise<WorkerReport[]> {
    try {
      const q = query(
        this.reportsCollection,
        where('status', '==', 'active'),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      })) as WorkerReport[];

      return reports;
    } catch (error) {
      console.error('Failed to get active reports:', error);
      return [];
    }
  }

  // Dismiss a report (from info board)
  async dismissReport(reportId: string, dismissedBy: string): Promise<void> {
    try {
      const reportRef = doc(this.reportsCollection, reportId);
      await updateDoc(reportRef, {
        status: 'dismissed',
        dismissedBy,
        dismissedAt: new Date()
      });

      console.log('✅ Report dismissed:', reportId, 'by:', dismissedBy);
    } catch (error) {
      console.error('Failed to dismiss report:', error);
      throw error;
    }
  }

  // Helper method to convert Firestore timestamps
  private convertTimestamps(data: any): any {
    const converted = { ...data };
    
    if (data.timestamp?.toDate) {
      converted.timestamp = data.timestamp.toDate();
    }
    if (data.dismissedAt?.toDate) {
      converted.dismissedAt = data.dismissedAt.toDate();
    }
    
    return converted;
  }

  // Get report count by zone (for info board display)
  async getReportCountByZone(): Promise<Record<number, number>> {
    try {
      const activeReports = await this.getActiveReports();
      const countByZone: Record<number, number> = {};

      activeReports.forEach(report => {
        countByZone[report.zoneId] = (countByZone[report.zoneId] || 0) + 1;
      });

      return countByZone;
    } catch (error) {
      console.error('Failed to get report count by zone:', error);
      return {};
    }
  }
}

export const reportService = new ReportService();