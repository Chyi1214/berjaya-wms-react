// Work Station Service - Version 4.0 Zone Status Management
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  Timestamp,
  deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { WorkStation } from '../types';
import { carTrackingService } from './carTrackingService';

class WorkStationService {
  private stationsCollection = collection(db, 'workStations');

  // Get work station status by zone ID
  async getWorkStation(zoneId: number): Promise<WorkStation | null> {
    try {
      const docRef = doc(this.stationsCollection, zoneId.toString());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = this.convertTimestamps(docSnap.data());
        return data as WorkStation;
      }
      
      // If station doesn't exist, create default one
      return await this.createDefaultWorkStation(zoneId);
    } catch (error) {
      console.error('Failed to get work station:', zoneId, error);
      return null;
    }
  }

  // Update work station with current car information
  async updateStationWithCar(zoneId: number, carVin: string): Promise<void> {
    try {
      // Get car details
      const car = await carTrackingService.getCarByVIN(carVin);
      if (!car || car.currentZone !== zoneId) {
        throw new Error(`Car ${carVin} is not in zone ${zoneId}`);
      }

      // Find when car entered current zone
      const currentZoneEntry = car.zoneHistory.find(entry => 
        entry.zoneId === zoneId && !entry.exitedAt
      );
      
      if (!currentZoneEntry) {
        throw new Error(`No active zone entry found for car ${carVin} in zone ${zoneId}`);
      }

      // Calculate time elapsed
      const timeElapsed = Math.floor(
        (new Date().getTime() - currentZoneEntry.enteredAt.getTime()) / (1000 * 60)
      );

      const updates = {
        currentCar: {
          vin: car.vin,
          type: car.type,
          color: car.color,
          enteredAt: currentZoneEntry.enteredAt,
          timeElapsed
        },
        lastUpdated: new Date()
      };

      await this.updateWorkStation(zoneId, updates);
      console.log('✅ Updated work station with car:', zoneId, carVin);
    } catch (error) {
      console.error('Failed to update station with car:', error);
      throw error;
    }
  }

  // Clear car from work station
  async clearCarFromStation(zoneId: number): Promise<void> {
    try {
      // Get current station data to calculate stats
      const station = await this.getWorkStation(zoneId);
      if (!station?.currentCar) {
        return; // No car to clear
      }

      // Update daily stats - direct Firestore update to handle deleteField()
      const docRef = doc(this.stationsCollection, zoneId.toString());
      await updateDoc(docRef, {
        carsProcessedToday: station.carsProcessedToday + 1,
        averageProcessingTime: await this.calculateAverageProcessingTime(zoneId),
        currentCar: deleteField(), // Remove current car from Firestore
        lastUpdated: new Date()
      });
      console.log('✅ Cleared car from work station:', zoneId);
    } catch (error) {
      console.error('Failed to clear car from station:', error);
      throw error;
    }
  }

  // Check worker into station
  async checkWorkerIn(zoneId: number, workerEmail: string, workerName: string): Promise<void> {
    try {
      const station = await this.getWorkStation(zoneId);
      if (!station) {
        throw new Error(`Work station ${zoneId} not found`);
      }

      // Check if worker is already checked in
      if (station.currentWorker) {
        throw new Error(`Zone ${zoneId} already has worker ${station.currentWorker.email} checked in`);
      }

      const updates = {
        currentWorker: {
          email: workerEmail,
          displayName: workerName,
          checkedInAt: new Date(),
          timeWorking: 0
        },
        lastUpdated: new Date()
      };

      await this.updateWorkStation(zoneId, updates);
      console.log('✅ Checked worker into station:', zoneId, workerEmail);
    } catch (error) {
      console.error('Failed to check worker in:', error);
      throw error;
    }
  }

  // Check worker out of station
  async checkWorkerOut(zoneId: number): Promise<void> {
    try {
      const station = await this.getWorkStation(zoneId);
      if (!station?.currentWorker) {
        throw new Error(`No worker checked into zone ${zoneId}`);
      }

      const updates = {
        currentWorker: undefined,
        lastUpdated: new Date()
      };

      await this.updateWorkStation(zoneId, updates);
      console.log('✅ Checked worker out of station:', zoneId);
    } catch (error) {
      console.error('Failed to check worker out:', error);
      throw error;
    }
  }

  // Get all work stations
  async getAllWorkStations(): Promise<WorkStation[]> {
    try {
      const snapshot = await getDocs(this.stationsCollection);
      const stations: WorkStation[] = [];
      
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        stations.push(data as WorkStation);
      });
      
      // Sort by zone ID
      return stations.sort((a, b) => a.zoneId - b.zoneId);
    } catch (error) {
      console.error('Failed to get all work stations:', error);
      return [];
    }
  }

  // Get stations with active cars
  async getStationsWithCars(): Promise<WorkStation[]> {
    try {
      const q = query(this.stationsCollection, where('currentCar', '!=', null));
      const snapshot = await getDocs(q);
      const stations: WorkStation[] = [];
      
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        stations.push(data as WorkStation);
      });
      
      return stations.sort((a, b) => a.zoneId - b.zoneId);
    } catch (error) {
      console.error('Failed to get stations with cars:', error);
      return [];
    }
  }

  // Refresh station status (update time elapsed, etc.)
  async refreshStationStatus(zoneId: number): Promise<WorkStation | null> {
    try {
      const station = await this.getWorkStation(zoneId);
      if (!station) return null;

      let updates: Record<string, any> = {
        lastUpdated: new Date()
      };

      // Update current car time elapsed
      if (station.currentCar) {
        const timeElapsed = Math.floor(
          (new Date().getTime() - station.currentCar.enteredAt.getTime()) / (1000 * 60)
        );
        
        updates.currentCar = {
          ...station.currentCar,
          timeElapsed
        };
      }

      // Update current worker time
      if (station.currentWorker) {
        const timeWorking = Math.floor(
          (new Date().getTime() - station.currentWorker.checkedInAt.getTime()) / (1000 * 60)
        );
        
        updates.currentWorker = {
          ...station.currentWorker,
          timeWorking
        };
      }

      await this.updateWorkStation(zoneId, updates);
      
      // Return updated station
      return await this.getWorkStation(zoneId);
    } catch (error) {
      console.error('Failed to refresh station status:', error);
      return null;
    }
  }

  // Initialize all work stations (zones 1-23)
  async initializeAllStations(): Promise<void> {
    try {
      const promises = [];
      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        promises.push(this.createDefaultWorkStation(zoneId));
      }
      
      await Promise.all(promises);
      console.log('✅ Initialized all work stations (1-23)');
    } catch (error) {
      console.error('Failed to initialize work stations:', error);
    }
  }

  // Private helper methods
  private async createDefaultWorkStation(zoneId: number): Promise<WorkStation> {
    const defaultStation: WorkStation = {
      zoneId,
      carsProcessedToday: 0,
      averageProcessingTime: 0,
      lastUpdated: new Date()
    };

    const docRef = doc(this.stationsCollection, zoneId.toString());
    const cleanedData = prepareForFirestore(defaultStation);
    await setDoc(docRef, cleanedData);
    
    return defaultStation;
  }

  private async updateWorkStation(zoneId: number, updates: Partial<WorkStation>): Promise<void> {
    const docRef = doc(this.stationsCollection, zoneId.toString());
    const cleanedUpdates = prepareForFirestore(updates);
    await updateDoc(docRef, cleanedUpdates);
  }

  private async calculateAverageProcessingTime(zoneId: number): Promise<number> {
    try {
      // Get recent completed cars in this zone
      const cars = await carTrackingService.getCars();
      
      const zoneTimes = cars
        .flatMap(car => car.zoneHistory)
        .filter(entry => entry.zoneId === zoneId && entry.timeSpent)
        .map(entry => entry.timeSpent!)
        .slice(-10); // Last 10 cars for average
      
      if (zoneTimes.length === 0) return 0;
      
      return Math.round(zoneTimes.reduce((sum, time) => sum + time, 0) / zoneTimes.length);
    } catch (error) {
      console.error('Failed to calculate average processing time:', error);
      return 0;
    }
  }

  private convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result = { ...data };
    
    // Convert Firestore Timestamps to Dates
    if (result.lastUpdated && result.lastUpdated instanceof Timestamp) {
      result.lastUpdated = result.lastUpdated.toDate();
    }
    
    if (result.currentCar?.enteredAt && result.currentCar.enteredAt instanceof Timestamp) {
      result.currentCar.enteredAt = result.currentCar.enteredAt.toDate();
    }
    
    if (result.currentWorker?.checkedInAt && result.currentWorker.checkedInAt instanceof Timestamp) {
      result.currentWorker.checkedInAt = result.currentWorker.checkedInAt.toDate();
    }
    
    return result;
  }
}

// Export singleton instance
export const workStationService = new WorkStationService();
export default workStationService;