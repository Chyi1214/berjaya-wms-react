// QA Location Service - Version 7.39.0 QA Stock Management
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  addDoc,
  deleteDoc,
  onSnapshot
} from './costTracking/firestoreWrapper';
import { runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { QALocation, QALocationAssignment, Car } from '../types';
import { logger } from './logger';

class QALocationService {
  private locationsCollection = collection(db, 'qaLocations');
  private assignmentsCollection = collection(db, 'qaLocationAssignments');
  private carsCollection = collection(db, 'cars');

  // ============ LOCATION CONFIGURATION METHODS ============

  // Get all QA locations
  async getLocations(): Promise<QALocation[]> {
    try {
      const q = query(this.locationsCollection, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestamps({ id: doc.id, ...data }) as QALocation;
      });
    } catch (error) {
      logger.error('Failed to get QA locations:', { error });
      return [];
    }
  }

  // Get active QA locations only
  async getActiveLocations(): Promise<QALocation[]> {
    try {
      const locations = await this.getLocations();
      return locations.filter(loc => loc.isActive);
    } catch (error) {
      logger.error('Failed to get active QA locations:', { error });
      return [];
    }
  }

  // Create new QA location
  async createLocation(
    name: string,
    description: string | undefined,
    createdBy: string
  ): Promise<string> {
    try {
      // Check if location name already exists
      const existing = await this.getLocations();
      const duplicate = existing.find(loc =>
        loc.name.toLowerCase() === name.toLowerCase()
      );

      if (duplicate) {
        throw new Error(`Location with name "${name}" already exists`);
      }

      const location: Omit<QALocation, 'id'> = {
        name: name.trim(),
        description: description?.trim(),
        isActive: true,
        order: existing.length, // Add to end
        createdAt: new Date(),
        createdBy
      };

      const cleanedData = prepareForFirestore(location);
      const docRef = await addDoc(this.locationsCollection, cleanedData);

      logger.info('Created QA location:', { locationId: docRef.id, name });
      return docRef.id;
    } catch (error) {
      logger.error('Failed to create QA location:', { error });
      throw error;
    }
  }

  // Update QA location
  async updateLocation(
    locationId: string,
    updates: Partial<Omit<QALocation, 'id' | 'createdAt' | 'createdBy'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(this.locationsCollection, locationId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Location ${locationId} not found`);
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
        updatedBy
      };

      const cleanedData = prepareForFirestore(updateData);
      await updateDoc(docRef, cleanedData);

      logger.info('Updated QA location:', { locationId, updates });
    } catch (error) {
      logger.error('Failed to update QA location:', { locationId, error });
      throw error;
    }
  }

  // Delete QA location (only if no cars currently assigned)
  async deleteLocation(locationId: string): Promise<void> {
    try {
      // Check if any cars are currently in this location
      const cars = await this.getCarsInLocation(locationId);

      if (cars.length > 0) {
        throw new Error(
          `Cannot delete location: ${cars.length} car(s) currently assigned. ` +
          'Please move or remove cars first.'
        );
      }

      const docRef = doc(this.locationsCollection, locationId);
      await deleteDoc(docRef);

      logger.info('Deleted QA location:', { locationId });
    } catch (error) {
      logger.error('Failed to delete QA location:', { locationId, error });
      throw error;
    }
  }

  // Reorder locations
  async reorderLocations(locationIds: string[]): Promise<void> {
    try {
      const updates = locationIds.map((id, index) => ({
        id,
        order: index
      }));

      // Update all locations in parallel
      await Promise.all(
        updates.map(({ id, order }) => {
          const docRef = doc(this.locationsCollection, id);
          return updateDoc(docRef, { order });
        })
      );

      logger.info('Reordered QA locations:', { count: locationIds.length });
    } catch (error) {
      logger.error('Failed to reorder QA locations:', { error });
      throw error;
    }
  }

  // Subscribe to locations changes (real-time)
  subscribeToLocations(callback: (locations: QALocation[]) => void): () => void {
    const q = query(this.locationsCollection, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const locations = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestamps({ id: doc.id, ...data }) as QALocation;
      });
      callback(locations);
    }, (error) => {
      logger.error('QA locations subscription error:', { error });
    });

    return unsubscribe;
  }

  // ============ CAR LOCATION ASSIGNMENT METHODS ============

  // Assign car to QA location (atomic operation)
  async assignCarToLocation(
    vin: string,
    locationId: string,
    assignedBy: string,
    assignedByName: string,
    notes?: string
  ): Promise<void> {
    try {
      const vinUpper = vin.toUpperCase();

      await runTransaction(db, async (transaction) => {
        // Get car
        const carRef = doc(this.carsCollection, vinUpper);
        const carSnap = await transaction.get(carRef);

        if (!carSnap.exists()) {
          throw new Error(`Car with VIN ${vinUpper} not found`);
        }

        // Get location
        const locationRef = doc(this.locationsCollection, locationId);
        const locationSnap = await transaction.get(locationRef);

        if (!locationSnap.exists()) {
          throw new Error(`Location ${locationId} not found`);
        }

        const location = this.convertTimestamps(locationSnap.data()) as QALocation;

        if (!location.isActive) {
          throw new Error(`Location "${location.name}" is not active`);
        }

        // Create assignment record with auto-generated ID
        const newAssignmentId = doc(collection(db, 'qaLocationAssignments')).id;
        const assignmentRef = doc(db, 'qaLocationAssignments', newAssignmentId);
        const assignment: Omit<QALocationAssignment, 'id'> = {
          vin: vinUpper,
          locationId,
          locationName: location.name,
          assignedAt: new Date(),
          assignedBy,
          notes
        };

        const cleanedAssignment = prepareForFirestore(assignment);
        transaction.set(assignmentRef, cleanedAssignment);

        // Update car record
        const carUpdate = prepareForFirestore({
          qaLocation: location.name,
          qaLocationAssignedAt: new Date(),
          qaLocationAssignedBy: assignedBy,
          qaLocationAssignedByName: assignedByName
        });
        transaction.update(carRef, carUpdate);
      });

      logger.info('Assigned car to QA location:', { vin: vinUpper, locationId, assignedBy });
    } catch (error) {
      logger.error('Failed to assign car to QA location:', { vin, locationId, error });
      throw error;
    }
  }

  // Remove car from QA location
  async removeCarFromLocation(
    vin: string,
    removedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const vinUpper = vin.toUpperCase();

      await runTransaction(db, async (transaction) => {
        // Get car
        const carRef = doc(this.carsCollection, vinUpper);
        const carSnap = await transaction.get(carRef);

        if (!carSnap.exists()) {
          throw new Error(`Car with VIN ${vinUpper} not found`);
        }

        const car = this.convertTimestamps(carSnap.data()) as Car;

        if (!car.qaLocation) {
          throw new Error(`Car ${vinUpper} is not in a QA location`);
        }

        // Find active assignment
        const assignmentsQuery = query(
          this.assignmentsCollection,
          where('vin', '==', vinUpper),
          where('removedAt', '==', null)
        );
        const assignmentsSnap = await getDocs(assignmentsQuery);

        // Update assignment record to mark as removed
        if (!assignmentsSnap.empty) {
          const assignmentRef = assignmentsSnap.docs[0].ref;
          const assignmentUpdate = prepareForFirestore({
            removedAt: new Date(),
            removedBy,
            notes
          });
          transaction.update(assignmentRef, assignmentUpdate);
        }

        // Update car record to clear location
        const carUpdate = prepareForFirestore({
          qaLocation: null,
          qaLocationAssignedAt: null,
          qaLocationAssignedBy: null
        });
        transaction.update(carRef, carUpdate);
      });

      logger.info('Removed car from QA location:', { vin: vinUpper, removedBy });
    } catch (error) {
      logger.error('Failed to remove car from QA location:', { vin, error });
      throw error;
    }
  }

  // Get cars in a specific QA location
  async getCarsInLocation(locationId: string): Promise<Car[]> {
    try {
      // Get location to find its name
      const locationDoc = await getDoc(doc(this.locationsCollection, locationId));
      if (!locationDoc.exists()) {
        return [];
      }

      const location = this.convertTimestamps(locationDoc.data()) as QALocation;

      // Query cars by location name
      const q = query(
        this.carsCollection,
        where('qaLocation', '==', location.name)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestamps(data) as Car;
      });
    } catch (error) {
      logger.error('Failed to get cars in location:', { locationId, error });
      return [];
    }
  }

  // Get all cars currently in QA (have a qaLocation assigned)
  async getAllCarsInQA(): Promise<Car[]> {
    try {
      const q = query(
        this.carsCollection,
        where('qaLocation', '!=', null)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestamps(data) as Car;
      });
    } catch (error) {
      logger.error('Failed to get all cars in QA:', { error });
      return [];
    }
  }

  // Subscribe to cars in QA (real-time)
  subscribeToCarsInQA(callback: (cars: Car[]) => void): () => void {
    const q = query(
      this.carsCollection,
      where('qaLocation', '!=', null)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const cars = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestamps(data) as Car;
      });
      callback(cars);
    }, (error) => {
      logger.error('Cars in QA subscription error:', { error });
    });

    return unsubscribe;
  }

  // Get location assignment history for a car
  async getCarLocationHistory(vin: string): Promise<QALocationAssignment[]> {
    try {
      const vinUpper = vin.toUpperCase();
      const q = query(
        this.assignmentsCollection,
        where('vin', '==', vinUpper),
        orderBy('assignedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertTimestamps({ id: doc.id, ...data }) as QALocationAssignment;
      });
    } catch (error) {
      logger.error('Failed to get car location history:', { vin, error });
      return [];
    }
  }

  // ============ UTILITY METHODS ============

  // Convert Firestore Timestamps to JavaScript Dates
  private convertTimestamps(data: any): any {
    const converted = { ...data };

    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }

      // Handle nested arrays (like zoneHistory)
      if (Array.isArray(converted[key])) {
        converted[key] = converted[key].map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            return this.convertTimestamps(item);
          }
          return item;
        });
      }
    });

    return converted;
  }
}

// Export singleton instance
export const qaLocationService = new QALocationService();
