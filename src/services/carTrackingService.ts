// Car Tracking Service - Version 4.0 Production Line Management
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
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
import { Car, CarStatus, ZoneEntry, CarMovement } from '../types';

class CarTrackingService {
  private carsCollection = collection(db, 'cars');
  private movementsCollection = collection(db, 'carMovements');

  // Get car by VIN
  async getCarByVIN(vin: string): Promise<Car | null> {
    try {
      const docRef = doc(this.carsCollection, vin.toUpperCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return this.convertTimestamps(data) as Car;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get car by VIN:', vin, error);
      return null;
    }
  }

  // Create new car in production system
  async createCar(carData: Omit<Car, 'createdAt' | 'zoneHistory'>): Promise<void> {
    try {
      const vin = carData.vin.toUpperCase();
      const docRef = doc(this.carsCollection, vin);
      
      // Check if car already exists
      const existing = await getDoc(docRef);
      if (existing.exists()) {
        throw new Error(`Car with VIN ${vin} already exists in system`);
      }
      
      const car: Car = {
        ...carData,
        vin,
        zoneHistory: [],
        createdAt: new Date(),
        status: CarStatus.IN_PRODUCTION
      };
      
      const cleanedData = prepareForFirestore(car);
      await setDoc(docRef, cleanedData);
      
      console.log('✅ Created new car:', vin);
    } catch (error) {
      console.error('Failed to create car:', error);
      throw error;
    }
  }

  // Scan car into zone
  async scanCarIntoZone(vin: string, zoneId: number, scannedBy: string): Promise<void> {
    try {
      const car = await this.getCarByVIN(vin);
      if (!car) {
        throw new Error(`Car with VIN ${vin} not found in system`);
      }

      // Check if car is already in a zone
      if (car.currentZone !== null) {
        throw new Error(`Car ${vin} is already in zone ${car.currentZone}`);
      }

      // Create new zone entry
      const zoneEntry: ZoneEntry = {
        zoneId,
        enteredAt: new Date(),
        enteredBy: scannedBy
      };

      // Update car record
      const updatedCar: Partial<Car> = {
        currentZone: zoneId,
        zoneHistory: [...car.zoneHistory, zoneEntry]
      };

      await this.updateCar(vin, updatedCar);

      // Log movement
      await this.logCarMovement({
        vin,
        fromZone: null,
        toZone: zoneId,
        movedAt: new Date(),
        movedBy: scannedBy,
        movementType: 'scan_in'
      });

      console.log('✅ Scanned car into zone:', vin, 'Zone:', zoneId);
    } catch (error) {
      console.error('Failed to scan car into zone:', error);
      throw error;
    }
  }

  // Complete work on car in zone
  async completeCarWork(vin: string, completedBy: string, notes?: string): Promise<void> {
    try {
      const car = await this.getCarByVIN(vin);
      if (!car) {
        throw new Error(`Car with VIN ${vin} not found in system`);
      }

      if (car.currentZone === null) {
        throw new Error(`Car ${vin} is not currently in any zone`);
      }

      // Find current zone entry and mark as completed
      const updatedHistory = car.zoneHistory.map((entry, index) => {
        if (index === car.zoneHistory.length - 1 && entry.zoneId === car.currentZone) {
          const exitedAt = new Date();
          const timeSpent = Math.floor((exitedAt.getTime() - entry.enteredAt.getTime()) / (1000 * 60));
          
          return {
            ...entry,
            exitedAt,
            completedBy,
            timeSpent,
            notes
          };
        }
        return entry;
      });

      // Update car - clear current zone, update history
      const updatedCar = {
        currentZone: null as null, // Explicitly type as null
        zoneHistory: updatedHistory,
        updatedAt: new Date()
      };

      console.log('🔧 Updating car with:', updatedCar);
      // Direct updateDoc to avoid any data processing that might convert null to undefined
      const docRef = doc(this.carsCollection, vin.toUpperCase());
      await updateDoc(docRef, updatedCar);
      console.log('✅ Car currentZone set to null:', vin);

      // Log movement
      await this.logCarMovement({
        vin,
        fromZone: car.currentZone,
        toZone: null,
        movedAt: new Date(),
        movedBy: completedBy,
        movementType: 'complete',
        timeInPreviousZone: updatedHistory[updatedHistory.length - 1].timeSpent,
        notes
      });

      console.log('✅ Completed work on car:', vin, 'Zone:', car.currentZone);
    } catch (error) {
      console.error('Failed to complete car work:', error);
      throw error;
    }
  }

  // Complete car production (all zones done)
  async completeCarProduction(vin: string, completedBy: string): Promise<void> {
    try {
      const car = await this.getCarByVIN(vin);
      if (!car) {
        throw new Error(`Car with VIN ${vin} not found in system`);
      }

      // Calculate total production time
      const totalTime = car.zoneHistory.reduce((total, entry) => {
        return total + (entry.timeSpent || 0);
      }, 0);

      const updatedCar: Partial<Car> = {
        status: CarStatus.COMPLETED,
        completedAt: new Date(),
        totalProductionTime: totalTime
      };

      // Log completion for audit trail
      console.log(`Car ${vin} completed by ${completedBy}`);

      await this.updateCar(vin, updatedCar);
      
      console.log('✅ Completed production for car:', vin, 'Total time:', totalTime, 'minutes');
    } catch (error) {
      console.error('Failed to complete car production:', error);
      throw error;
    }
  }

  // Get all cars with optional filters
  async getCars(filters?: {
    status?: CarStatus;
    currentZone?: number;
    type?: string;
    color?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Car[]> {
    try {
      let q = query(this.carsCollection, orderBy('createdAt', 'desc'));
      
      // Apply filters
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters?.currentZone !== undefined) {
        q = query(q, where('currentZone', '==', filters.currentZone));
      }
      if (filters?.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters?.color) {
        q = query(q, where('color', '==', filters.color));
      }

      const snapshot = await getDocs(q);
      const cars: Car[] = [];
      
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        cars.push(data as Car);
      });

      // Apply date filters in memory (Firestore limitation)
      let filteredCars = cars;
      if (filters?.dateFrom || filters?.dateTo) {
        filteredCars = cars.filter(car => {
          const carDate = car.createdAt;
          if (filters.dateFrom && carDate < filters.dateFrom) return false;
          if (filters.dateTo && carDate > filters.dateTo) return false;
          return true;
        });
      }
      
      return filteredCars;
    } catch (error) {
      console.error('Failed to get cars:', error);
      return [];
    }
  }

  // Get cars currently in production (in zones)
  async getCarsInProduction(): Promise<Car[]> {
    return this.getCars({ status: CarStatus.IN_PRODUCTION });
  }

  // Get cars in specific zone
  async getCarsInZone(zoneId: number): Promise<Car[]> {
    try {
      // Use simple query to avoid index requirements
      const q = query(this.carsCollection, where('currentZone', '==', zoneId));
      const snapshot = await getDocs(q);
      const cars: Car[] = [];
      
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        cars.push(data as Car);
      });
      
      return cars;
    } catch (error) {
      console.error('Failed to get cars in zone:', zoneId, error);
      return [];
    }
  }

  // Get today's cars (in production + completed today) for QA
  async getTodayCars(): Promise<Car[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all cars and filter by date in memory (Firestore limitation)
      const allCars = await this.getCars();
      
      return allCars.filter(car => {
        // Include cars created today or completed today
        const createdToday = car.createdAt >= today && car.createdAt < tomorrow;
        const completedToday = car.completedAt && car.completedAt >= today && car.completedAt < tomorrow;
        
        return createdToday || completedToday || car.status === CarStatus.IN_PRODUCTION;
      });
    } catch (error) {
      console.error('Failed to get today cars:', error);
      return [];
    }
  }

  // Get car movements for audit trail
  async getCarMovements(vin?: string, limit: number = 50): Promise<CarMovement[]> {
    try {
      let q = query(this.movementsCollection, orderBy('movedAt', 'desc'));
      
      if (vin) {
        q = query(q, where('vin', '==', vin.toUpperCase()));
      }

      const snapshot = await getDocs(q);
      const movements: CarMovement[] = [];
      
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        movements.push({ id: doc.id, ...data } as CarMovement);
      });
      
      return movements.slice(0, limit);
    } catch (error) {
      console.error('Failed to get car movements:', error);
      return [];
    }
  }

  // Private helper methods
  private async updateCar(vin: string, updates: Partial<Car>): Promise<void> {
    const docRef = doc(this.carsCollection, vin.toUpperCase());
    // Don't use prepareForFirestore to ensure null values are preserved
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date()
    };
    console.log('🔧 Direct updateDoc with:', updatesWithTimestamp);
    await updateDoc(docRef, updatesWithTimestamp);
  }

  private async logCarMovement(movement: Omit<CarMovement, 'id'>): Promise<void> {
    const cleanedData = prepareForFirestore(movement);
    await addDoc(this.movementsCollection, cleanedData);
  }

  private convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result = { ...data };
    
    // Convert Firestore Timestamps to Dates
    if (result.createdAt && result.createdAt instanceof Timestamp) {
      result.createdAt = result.createdAt.toDate();
    }
    if (result.completedAt && result.completedAt instanceof Timestamp) {
      result.completedAt = result.completedAt.toDate();
    }
    if (result.movedAt && result.movedAt instanceof Timestamp) {
      result.movedAt = result.movedAt.toDate();
    }
    
    // Convert zone history timestamps
    if (result.zoneHistory && Array.isArray(result.zoneHistory)) {
      result.zoneHistory = result.zoneHistory.map((entry: Record<string, any>) => ({
        ...entry,
        enteredAt: entry.enteredAt instanceof Timestamp ? entry.enteredAt.toDate() : entry.enteredAt,
        exitedAt: entry.exitedAt instanceof Timestamp ? entry.exitedAt.toDate() : entry.exitedAt
      }));
    }
    
    return result;
  }

  // Initialize with test data
  async initializeTestData(): Promise<void> {
    try {
      const testCars = [
        {
          vin: 'TEST2024RED001',
          type: 'Basic',
          color: 'Red',
          series: 'Standard',
          status: CarStatus.IN_PRODUCTION,
          currentZone: null
        },
        {
          vin: 'TEST2024BLU002',
          type: 'Premium', 
          color: 'Blue',
          series: 'Premium',
          status: CarStatus.IN_PRODUCTION,
          currentZone: null
        },
        {
          vin: 'TEST2024SIL003',
          type: 'Series3',
          color: 'Silver',
          series: 'Series3',
          status: CarStatus.IN_PRODUCTION,
          currentZone: null
        }
      ];

      for (const carData of testCars) {
        try {
          await this.createCar(carData);
        } catch (error) {
          // Car might already exist, skip
          console.log('Test car already exists:', carData.vin);
        }
      }
      
      console.log('✅ Test car data initialized');
    } catch (error) {
      console.error('Failed to initialize test data:', error);
    }
  }
}

// Export singleton instance
export const carTrackingService = new CarTrackingService();
export default carTrackingService;