// Report Service - v5.7 Worker Report Button System
import { collection, doc, addDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
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
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      })) as WorkerReport[];

      // Sort by timestamp in memory (most recent first)
      return reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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

  // Check if worker has active report in zone
  async hasActiveReport(zoneId: number, workerEmail: string): Promise<boolean> {
    try {
      const q = query(
        this.reportsCollection,
        where('status', '==', 'active'),
        where('zoneId', '==', zoneId),
        where('reportedBy', '==', workerEmail)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Failed to check active report:', error);
      return false;
    }
  }

  // Dismiss worker's own report
  async dismissOwnReport(zoneId: number, workerEmail: string): Promise<void> {
    try {
      const q = query(
        this.reportsCollection,
        where('status', '==', 'active'),
        where('zoneId', '==', zoneId),
        where('reportedBy', '==', workerEmail)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const reportDoc = snapshot.docs[0];
        const reportRef = doc(this.reportsCollection, reportDoc.id);
        await updateDoc(reportRef, {
          status: 'dismissed',
          dismissedBy: workerEmail,
          dismissedAt: new Date()
        });
        console.log('✅ Worker dismissed own report:', reportDoc.id);
      }
    } catch (error) {
      console.error('Failed to dismiss own report:', error);
      throw error;
    }
  }

  // Dismiss any active report in a zone (anyone can dismiss)
  async dismissAnyReportInZone(zoneId: number, dismissedBy: string): Promise<void> {
    try {
      const q = query(
        this.reportsCollection,
        where('status', '==', 'active'),
        where('zoneId', '==', zoneId)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Dismiss the first (most recent) active report in this zone
        const reportDoc = snapshot.docs[0];
        const reportRef = doc(this.reportsCollection, reportDoc.id);
        await updateDoc(reportRef, {
          status: 'dismissed',
          dismissedBy,
          dismissedAt: new Date()
        });
        console.log('✅ Report dismissed in zone:', zoneId, 'by:', dismissedBy);
      }
    } catch (error) {
      console.error('Failed to dismiss report in zone:', error);
      throw error;
    }
  }

  // Check if there are any active reports in zone (regardless of who reported)
  async hasAnyActiveReportInZone(zoneId: number): Promise<boolean> {
    try {
      const q = query(
        this.reportsCollection,
        where('status', '==', 'active'),
        where('zoneId', '==', zoneId)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Failed to check active reports in zone:', error);
      return false;
    }
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