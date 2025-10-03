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
  addDoc,
  runTransaction
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

  // Scan car into zone (DEPRECATED - Use scanCarIntoZoneAtomic instead)
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

  // Atomic car scan-in - prevents ghost cars by using Firestore transaction
  async scanCarIntoZoneAtomic(vin: string, zoneId: number, scannedBy: string): Promise<void> {
    try {
      console.log('🔧 Starting atomic car scan-in:', vin, 'Zone:', zoneId);

      await runTransaction(db, async (transaction) => {
        // Step 1: Read both collections
        const carRef = doc(this.carsCollection, vin.toUpperCase());
        const stationRef = doc(collection(db, 'workStations'), zoneId.toString());

        const carDoc = await transaction.get(carRef);
        const stationDoc = await transaction.get(stationRef);

        // Step 2: Validate state before making changes
        if (!carDoc.exists()) {
          throw new Error(`Car with VIN ${vin} not found in system`);
        }

        const carData = carDoc.data();
        const car = this.convertTimestamps(carData) as Car;

        // Check if car is already in a zone
        if (car.currentZone !== null) {
          throw new Error(`Car ${vin} is already in zone ${car.currentZone}`);
        }

        // Check if zone already has a different car
        if (stationDoc.exists()) {
          const station = stationDoc.data();
          if (station.currentCar && station.currentCar.vin !== vin) {
            throw new Error(`Zone ${zoneId} already has car: ${station.currentCar.vin}`);
          }
        }

        // Step 3: Prepare car updates
        const enteredAt = new Date();
        const zoneEntry: ZoneEntry = {
          zoneId,
          enteredAt,
          enteredBy: scannedBy
        };

        // Clean zone history to remove any undefined values
        const cleanedZoneHistory = car.zoneHistory.map(entry => prepareForFirestore(entry));
        const newZoneHistory = [...cleanedZoneHistory, zoneEntry];

        const carUpdates = prepareForFirestore({
          currentZone: zoneId,
          zoneHistory: newZoneHistory,
          updatedAt: enteredAt
        });

        // Step 4: Prepare workStation updates
        const timeElapsed = 0; // Just entered
        const currentCarData = prepareForFirestore({
          vin: car.vin,
          type: car.type || 'Standard',
          color: car.color || 'Unknown',
          enteredAt,
          timeElapsed
        });

        const stationUpdates = prepareForFirestore({
          currentCar: currentCarData,
          lastUpdated: enteredAt
        });

        // Step 5: Atomic updates - both succeed or both fail
        transaction.update(carRef, carUpdates);

        if (stationDoc.exists()) {
          transaction.update(stationRef, stationUpdates);
        } else {
          // Create workStation if it doesn't exist
          const newStationData = prepareForFirestore({
            zoneId,
            carsProcessedToday: 0,
            averageProcessingTime: 0,
            currentCar: currentCarData,
            lastUpdated: enteredAt
          });
          transaction.set(stationRef, newStationData);
        }

        console.log('✅ Atomic scan-in transaction prepared for:', vin, 'Zone:', zoneId);
      });

      // Step 6: Log movement after transaction succeeds
      await this.logCarMovement({
        vin,
        fromZone: null,
        toZone: zoneId,
        movedAt: new Date(),
        movedBy: scannedBy,
        movementType: 'scan_in'
      });

      console.log('✅ Atomic car scan-in succeeded:', vin, 'Zone:', zoneId);
    } catch (error) {
      console.error('❌ Failed atomic car scan-in:', error);
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
          
          // Build entry with conditionally included notes to avoid undefined values
          const completedEntry = {
            ...entry,
            exitedAt,
            completedBy,
            timeSpent
          };
          
          // Only add notes if it has a value (not undefined)
          if (notes !== undefined && notes.trim() !== '') {
            completedEntry.notes = notes;
          }
          
          return completedEntry;
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

  // Atomic car completion - prevents ghost cars by using Firestore transaction
  async completeCarWorkAtomic(vin: string, zoneId: number, completedBy: string, notes?: string): Promise<void> {
    try {
      console.log('🔧 Starting atomic car completion:', vin, 'Zone:', zoneId);

      await runTransaction(db, async (transaction) => {
        // Step 1: Read both collections
        const carRef = doc(this.carsCollection, vin.toUpperCase());
        const stationRef = doc(collection(db, 'workStations'), zoneId.toString());

        const carDoc = await transaction.get(carRef);
        const stationDoc = await transaction.get(stationRef);

        // Step 2: Validate state before making changes
        if (!carDoc.exists()) {
          throw new Error(`Car with VIN ${vin} not found in system`);
        }

        const carData = carDoc.data();
        // CRITICAL: Convert Firestore Timestamps to Dates before using the data
        const car = this.convertTimestamps(carData) as Car;

        if (car.currentZone !== zoneId) {
          throw new Error(`Car ${vin} is not in zone ${zoneId} (currently in zone ${car.currentZone})`);
        }

        if (car.currentZone === null) {
          throw new Error(`Car ${vin} is not currently in any zone`);
        }

        // Validate workStation consistency
        if (stationDoc.exists()) {
          const station = stationDoc.data();
          if (station.currentCar && station.currentCar.vin !== vin) {
            throw new Error(`Zone ${zoneId} shows different car: ${station.currentCar.vin}`);
          }
        }

        // Step 3: Prepare car updates
        const updatedHistory = car.zoneHistory.map((entry, index) => {
          if (index === car.zoneHistory.length - 1 && entry.zoneId === car.currentZone) {
            const exitedAt = new Date();
            const timeSpent = Math.floor((exitedAt.getTime() - entry.enteredAt.getTime()) / (1000 * 60));

            const completedEntry = {
              ...entry,
              exitedAt,
              completedBy,
              timeSpent
            };

            if (notes !== undefined && notes.trim() !== '') {
              completedEntry.notes = notes;
            }

            return prepareForFirestore(completedEntry);
          }
          return prepareForFirestore(entry);
        });

        const carUpdates = prepareForFirestore({
          currentZone: null,
          zoneHistory: updatedHistory,
          updatedAt: new Date()
        });

        // Step 4: Prepare workStation updates (if station exists)
        let stationUpdates = null;
        if (stationDoc.exists()) {
          const station = stationDoc.data();
          stationUpdates = {
            carsProcessedToday: (station.carsProcessedToday || 0) + 1,
            currentCar: null,
            lastUpdated: new Date()
          };
        }

        // Step 5: Atomic updates - both succeed or both fail
        transaction.update(carRef, carUpdates);

        if (stationUpdates) {
          transaction.update(stationRef, stationUpdates);
        }

        console.log('✅ Atomic transaction prepared for:', vin, 'Zone:', zoneId);
      });

      // Step 6: Log movement after transaction succeeds
      const currentZoneEntry = await this.getCurrentZoneEntry(vin, zoneId);
      await this.logCarMovement({
        vin,
        fromZone: zoneId,
        toZone: null,
        movedAt: new Date(),
        movedBy: completedBy,
        movementType: 'complete',
        timeInPreviousZone: currentZoneEntry?.timeSpent,
        notes
      });

      console.log('✅ Atomic car completion succeeded:', vin, 'Zone:', zoneId);
    } catch (error) {
      console.error('Failed atomic car completion:', error);
      throw error;
    }
  }

  // Helper method to get current zone entry
  private async getCurrentZoneEntry(vin: string, zoneId: number): Promise<ZoneEntry | null> {
    const car = await this.getCarByVIN(vin);
    if (!car) return null;

    return car.zoneHistory.find(entry =>
      entry.zoneId === zoneId && entry.exitedAt
    ) || null;
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

  // Get car movements for audit trail with enhanced filtering
  async getCarMovements(options?: {
    vin?: string;
    zoneId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<CarMovement[]> {
    try {
      const limit = options?.limit || 50;

      // Strategy: Use different query approaches based on available filters
      let movements: CarMovement[] = [];

      if (options?.vin) {
        // VIN-specific query: Use simple where without orderBy to avoid index requirement
        console.log('🔍 Querying movements for VIN:', options.vin);
        const vinQuery = query(
          this.movementsCollection,
          where('vin', '==', options.vin.toUpperCase())
        );

        const snapshot = await getDocs(vinQuery);
        snapshot.forEach((doc) => {
          const data = this.convertTimestamps(doc.data());
          movements.push({ id: doc.id, ...data } as CarMovement);
        });

        // Sort in memory since we can't use orderBy with where clause without index
        movements.sort((a, b) => b.movedAt.getTime() - a.movedAt.getTime());

      } else {
        // General query: Use orderBy when no VIN filter
        const generalQuery = query(this.movementsCollection, orderBy('movedAt', 'desc'));
        const snapshot = await getDocs(generalQuery);

        snapshot.forEach((doc) => {
          const data = this.convertTimestamps(doc.data());
          movements.push({ id: doc.id, ...data } as CarMovement);
        });
      }

      console.log('📋 Raw movements found:', movements.length);

      // Apply additional filters in memory
      if (options?.zoneId !== undefined) {
        movements = movements.filter(movement =>
          movement.fromZone === options.zoneId || movement.toZone === options.zoneId
        );
        console.log('🏭 After zone filter:', movements.length);
      }

      if (options?.dateFrom || options?.dateTo) {
        movements = movements.filter(movement => {
          const movementDate = movement.movedAt;
          if (options.dateFrom && movementDate < options.dateFrom) return false;
          if (options.dateTo && movementDate > options.dateTo) return false;
          return true;
        });
        console.log('📅 After date filter:', movements.length);
      }

      const result = movements.slice(0, limit);
      console.log('✅ Final movements returned:', result.length);
      return result;

    } catch (error) {
      console.error('❌ Failed to get car movements:', error);
      return [];
    }
  }

  // Get today's car movements
  async getTodayCarMovements(limit: number = 100): Promise<CarMovement[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getCarMovements({
      dateFrom: today,
      dateTo: tomorrow,
      limit
    });
  }

  // Get movements for a specific zone
  async getZoneMovements(zoneId: number, options?: {
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<CarMovement[]> {
    return this.getCarMovements({
      zoneId,
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      limit: options?.limit || 50
    });
  }

  // Get user display name for showing in UI instead of email
  async getUserDisplayName(email: string): Promise<string> {
    try {
      const userDoc = await getDoc(doc(collection(db, 'users'), email));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Use display name if available and enabled, otherwise fall back to email
        if (userData.useDisplayName && userData.displayName) {
          return userData.displayName;
        }
      }
      // Fall back to email if no display name found
      return email;
    } catch (error) {
      console.error('Failed to get user display name:', error);
      return email; // Fallback to email on error
    }
  }

  // Get movements with display names for UI
  async getCarMovementsWithNames(options?: {
    vin?: string;
    zoneId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<(CarMovement & { movedByName: string })[]> {
    try {
      const movements = await this.getCarMovements(options);

      // Get display names for all unique users
      const uniqueEmails = [...new Set(movements.map(m => m.movedBy))];
      const emailToNameMap = new Map<string, string>();

      for (const email of uniqueEmails) {
        const displayName = await this.getUserDisplayName(email);
        emailToNameMap.set(email, displayName);
      }

      // Add display names to movements
      return movements.map(movement => ({
        ...movement,
        movedByName: emailToNameMap.get(movement.movedBy) || movement.movedBy
      }));
    } catch (error) {
      console.error('Failed to get car movements with names:', error);
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

  // Fix ghost cars - force clear a specific car from a zone
  async forceRemoveCarFromZone(vin: string, reason: string = 'Ghost car cleanup'): Promise<void> {
    try {
      console.log('🧹 Force removing ghost car from zone:', vin);

      const car = await this.getCarByVIN(vin);
      if (!car) {
        console.log('❌ Car not found:', vin);
        return;
      }

      console.log('🔍 Current car state:', {
        vin: car.vin,
        currentZone: car.currentZone,
        status: car.status
      });

      const currentZone = car.currentZone;

      // 1. Force update car to remove from current zone
      const docRef = doc(this.carsCollection, vin.toUpperCase());
      await updateDoc(docRef, {
        currentZone: null,
        updatedAt: new Date()
      });

      // 2. Also clear the car from the workStation (avoid circular import)
      if (currentZone) {
        try {
          const { workStationService } = await import('./workStationService');
          await workStationService.clearStationCar(currentZone, reason);
        } catch (error) {
          console.error('Failed to clear car from workStation:', error);
        }
      }

      // 3. Log the forced removal
      if (currentZone) {
        await this.logCarMovement({
          vin,
          fromZone: currentZone,
          toZone: null,
          movedAt: new Date(),
          movedBy: 'system',
          movementType: 'force_remove',
          notes: `Force removed: ${reason}`
        });
      }

      console.log('✅ Ghost car removed from both cars and workStations:', vin);
    } catch (error) {
      console.error('Failed to force remove car from zone:', error);
      throw error;
    }
  }

  // Clean up all ghost cars - find inconsistencies and fix them
  async cleanupGhostCars(): Promise<{ fixed: number; issues: string[] }> {
    try {
      console.log('🧹 Starting comprehensive ghost car cleanup...');

      const results = { fixed: 0, issues: [] as string[] };

      // PHASE 1: Fix duplicate cars in same zone
      const carsInProduction = await this.getCarsInProduction();

      for (const car of carsInProduction) {
        if (car.currentZone !== null) {
          // Check if this is the only car claiming to be in this zone
          const carsInSameZone = await this.getCarsInZone(car.currentZone);

          if (carsInSameZone.length > 1) {
            // Multiple cars in same zone - fix all but the first one
            const duplicates = carsInSameZone.slice(1);
            for (const duplicate of duplicates) {
              await this.forceRemoveCarFromZone(duplicate.vin, 'Multiple cars in same zone');
              results.fixed++;
              results.issues.push(`Fixed duplicate in Zone ${car.currentZone}: ${duplicate.vin}`);
            }
          }
        }
      }

      // PHASE 2: Fix workStation-car inconsistencies
      try {
        const { workStationService } = await import('./workStationService');
        const inconsistencies = await workStationService.findStationCarInconsistencies();

        for (const inconsistency of inconsistencies) {
          // Clear the car from the workStation since the car doesn't think it's there
          await workStationService.clearStationCar(
            inconsistency.zoneId,
            'Station-car data inconsistency'
          );

          results.fixed++;
          results.issues.push(
            `Fixed workStation inconsistency in Zone ${inconsistency.zoneId}: cleared ${inconsistency.carInStation} (car was not in zone)`
          );
        }
      } catch (error) {
        console.error('Failed to check workStation inconsistencies:', error);
        results.issues.push('Failed to check workStation inconsistencies');
      }

      console.log('✅ Comprehensive ghost car cleanup completed:', results);
      return results;
    } catch (error) {
      console.error('Failed to cleanup ghost cars:', error);
      return { fixed: 0, issues: [`Error: ${error instanceof Error ? error.message : String(error)}`] };
    }
  }
}

// Export singleton instance
export const carTrackingService = new CarTrackingService();
export default carTrackingService;