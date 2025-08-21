// Worker Activity Service - Version 4.0 Clock In/Out Management
import { 
  collection, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  orderBy, 
  where,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { WorkerActivity } from '../types';
import { workStationService } from './workStationService';

class WorkerActivityService {
  private activitiesCollection = collection(db, 'workerActivities');

  // Check worker into zone
  async checkWorkerIn(
    workerEmail: string, 
    workerName: string, 
    zoneId: number, 
    carVin?: string
  ): Promise<string> {
    try {
      // Check if worker is already checked in somewhere
      const existingActivity = await this.getActiveWorkerActivity(workerEmail);
      if (existingActivity) {
        throw new Error(`Worker ${workerEmail} is already checked into zone ${existingActivity.zoneId}`);
      }

      // Create new activity record
      const activity: Omit<WorkerActivity, 'id'> = {
        workerEmail,
        workerName,
        zoneId,
        checkedInAt: new Date(),
        createdAt: new Date(),
        ...(carVin && {
          workedOnCar: {
            vin: carVin,
            carType: 'Unknown', // Will be updated when car details are available
            workCompleted: false
          }
        })
      };

      const cleanedData = prepareForFirestore(activity);
      const docRef = await addDoc(this.activitiesCollection, cleanedData);

      // Update work station with worker info
      await workStationService.checkWorkerIn(zoneId, workerEmail, workerName);

      console.log('✅ Checked worker in:', workerEmail, 'Zone:', zoneId, 'Activity ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Failed to check worker in:', error);
      throw error;
    }
  }

  // Check worker out of zone
  async checkWorkerOut(workerEmail: string, notes?: string): Promise<void> {
    try {
      // Find active worker activity
      const activity = await this.getActiveWorkerActivity(workerEmail);
      if (!activity) {
        throw new Error(`Worker ${workerEmail} is not checked into any zone`);
      }

      // Calculate time worked
      const checkedOutAt = new Date();
      const totalMinutes = Math.floor(
        (checkedOutAt.getTime() - activity.checkedInAt.getTime()) / (1000 * 60)
      );

      // Update activity record
      const updates = {
        checkedOutAt,
        totalMinutes,
        ...(notes && { notes })
      };

      await this.updateWorkerActivity(activity.id, updates);

      // Update work station to remove worker
      await workStationService.checkWorkerOut(activity.zoneId);

      console.log('✅ Checked worker out:', workerEmail, 'Total minutes:', totalMinutes);
    } catch (error) {
      console.error('Failed to check worker out:', error);
      throw error;
    }
  }

  // Update worker activity with car completion
  async markCarWorkCompleted(workerEmail: string, carVin: string): Promise<void> {
    try {
      const activity = await this.getActiveWorkerActivity(workerEmail);
      if (!activity) {
        throw new Error(`Worker ${workerEmail} is not currently checked in`);
      }

      if (!activity.workedOnCar || activity.workedOnCar.vin !== carVin) {
        // Add or update car information
        const updates = {
          workedOnCar: {
            vin: carVin,
            carType: 'Completed', // Can be updated with actual car type later
            workCompleted: true
          }
        };
        
        await this.updateWorkerActivity(activity.id, updates);
      } else {
        // Just mark as completed - use direct Firestore update for nested field
        const docRef = doc(this.activitiesCollection, activity.id);
        await updateDoc(docRef, {
          'workedOnCar.workCompleted': true
        });
      }

      console.log('✅ Marked car work completed:', workerEmail, carVin);
    } catch (error) {
      console.error('Failed to mark car work completed:', error);
      throw error;
    }
  }

  // Get active worker activity (currently checked in)
  async getActiveWorkerActivity(workerEmail: string): Promise<WorkerActivity | null> {
    try {
      const q = query(
        this.activitiesCollection,
        where('workerEmail', '==', workerEmail),
        where('checkedOutAt', '==', null)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = this.convertTimestamps(doc.data());
      return { id: doc.id, ...data } as WorkerActivity;
    } catch (error) {
      console.error('Failed to get active worker activity:', error);
      return null;
    }
  }

  // Get worker activities with filters
  async getWorkerActivities(filters?: {
    workerEmail?: string;
    zoneId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    activeOnly?: boolean;
  }): Promise<WorkerActivity[]> {
    try {
      let q = query(this.activitiesCollection, orderBy('checkedInAt', 'desc'));
      
      // Apply filters
      if (filters?.workerEmail) {
        q = query(q, where('workerEmail', '==', filters.workerEmail));
      }
      if (filters?.zoneId) {
        q = query(q, where('zoneId', '==', filters.zoneId));
      }
      if (filters?.activeOnly) {
        q = query(q, where('checkedOutAt', '==', null));
      }

      const snapshot = await getDocs(q);
      const activities: WorkerActivity[] = [];
      
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        activities.push({ id: doc.id, ...data } as WorkerActivity);
      });

      // Apply date filters in memory (Firestore limitation with multiple where clauses)
      let filteredActivities = activities;
      if (filters?.dateFrom || filters?.dateTo) {
        filteredActivities = activities.filter(activity => {
          const activityDate = activity.checkedInAt;
          if (filters.dateFrom && activityDate < filters.dateFrom) return false;
          if (filters.dateTo && activityDate > filters.dateTo) return false;
          return true;
        });
      }
      
      return filteredActivities;
    } catch (error) {
      console.error('Failed to get worker activities:', error);
      return [];
    }
  }

  // Get all active workers
  async getActiveWorkers(): Promise<WorkerActivity[]> {
    return this.getWorkerActivities({ activeOnly: true });
  }

  // Get worker activities for a specific zone
  async getZoneWorkerActivities(zoneId: number, activeOnly: boolean = false): Promise<WorkerActivity[]> {
    return this.getWorkerActivities({ zoneId, activeOnly });
  }

  // Get worker productivity stats
  async getWorkerProductivityStats(
    workerEmail: string, 
    dateFrom?: Date, 
    dateTo?: Date
  ): Promise<{
    totalHours: number;
    totalSessions: number;
    averageSessionLength: number;
    carsWorkedOn: number;
    carsCompleted: number;
    zonesWorked: number[];
  }> {
    try {
      const activities = await this.getWorkerActivities({ 
        workerEmail, 
        dateFrom, 
        dateTo 
      });

      const completedActivities = activities.filter(a => a.checkedOutAt && a.totalMinutes);
      
      const totalMinutes = completedActivities.reduce((sum, a) => sum + (a.totalMinutes || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      
      const carsWorkedOn = new Set(
        activities
          .filter(a => a.workedOnCar)
          .map(a => a.workedOnCar!.vin)
      ).size;
      
      const carsCompleted = activities.filter(
        a => a.workedOnCar?.workCompleted
      ).length;
      
      const zonesWorked = [...new Set(activities.map(a => a.zoneId))].sort((a, b) => a - b);
      
      const averageSessionLength = completedActivities.length > 0 
        ? Math.round((totalMinutes / completedActivities.length) * 100) / 100
        : 0;

      return {
        totalHours,
        totalSessions: completedActivities.length,
        averageSessionLength,
        carsWorkedOn,
        carsCompleted,
        zonesWorked
      };
    } catch (error) {
      console.error('Failed to get worker productivity stats:', error);
      return {
        totalHours: 0,
        totalSessions: 0,
        averageSessionLength: 0,
        carsWorkedOn: 0,
        carsCompleted: 0,
        zonesWorked: []
      };
    }
  }

  // Get daily productivity summary for all workers
  async getDailyProductivitySummary(date: Date): Promise<Array<{
    workerEmail: string;
    workerName: string;
    hoursWorked: number;
    carsWorkedOn: number;
    zonesWorked: number;
  }>> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const activities = await this.getWorkerActivities({
        dateFrom: startOfDay,
        dateTo: endOfDay
      });

      // Group by worker
      const workerMap = new Map<string, {
        workerName: string;
        totalMinutes: number;
        cars: Set<string>;
        zones: Set<number>;
      }>();

      activities.forEach(activity => {
        const email = activity.workerEmail;
        
        if (!workerMap.has(email)) {
          workerMap.set(email, {
            workerName: activity.workerName,
            totalMinutes: 0,
            cars: new Set(),
            zones: new Set()
          });
        }

        const worker = workerMap.get(email)!;
        worker.totalMinutes += activity.totalMinutes || 0;
        worker.zones.add(activity.zoneId);
        
        if (activity.workedOnCar) {
          worker.cars.add(activity.workedOnCar.vin);
        }
      });

      // Convert to summary format
      const summary = Array.from(workerMap.entries()).map(([email, data]) => ({
        workerEmail: email,
        workerName: data.workerName,
        hoursWorked: Math.round((data.totalMinutes / 60) * 100) / 100,
        carsWorkedOn: data.cars.size,
        zonesWorked: data.zones.size
      }));

      return summary.sort((a, b) => b.hoursWorked - a.hoursWorked);
    } catch (error) {
      console.error('Failed to get daily productivity summary:', error);
      return [];
    }
  }

  // Force check out all workers (emergency function)
  async forceCheckOutAllWorkers(): Promise<void> {
    try {
      const activeWorkers = await this.getActiveWorkers();
      
      const promises = activeWorkers.map(worker => 
        this.checkWorkerOut(worker.workerEmail, 'Force checkout - system maintenance')
      );
      
      await Promise.all(promises);
      console.log(`✅ Force checked out ${activeWorkers.length} workers`);
    } catch (error) {
      console.error('Failed to force check out workers:', error);
    }
  }

  // Private helper methods
  private async updateWorkerActivity(id: string, updates: Partial<WorkerActivity>): Promise<void> {
    const docRef = doc(this.activitiesCollection, id);
    const cleanedUpdates = prepareForFirestore(updates);
    await updateDoc(docRef, cleanedUpdates);
  }

  private convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result = { ...data };
    
    // Convert Firestore Timestamps to Dates
    if (result.checkedInAt && result.checkedInAt instanceof Timestamp) {
      result.checkedInAt = result.checkedInAt.toDate();
    }
    if (result.checkedOutAt && result.checkedOutAt instanceof Timestamp) {
      result.checkedOutAt = result.checkedOutAt.toDate();
    }
    if (result.createdAt && result.createdAt instanceof Timestamp) {
      result.createdAt = result.createdAt.toDate();
    }
    
    return result;
  }
}

// Export singleton instance
export const workerActivityService = new WorkerActivityService();
export default workerActivityService;