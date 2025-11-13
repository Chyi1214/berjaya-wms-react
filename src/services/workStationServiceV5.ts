// Work Station Service V5.0 - Flying Car & Takt Time Production System
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from './costTracking/firestoreWrapper';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { WorkStation, ZoneStatus } from '../types/production';
import { productionSystemService } from './productionSystemService';
import { productionAttributionService } from './productionAttributionService';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('WorkStationServiceV5');

class WorkStationServiceV5 {
  private stationsCollection = collection(db, 'workStations');
  private readonly MAINTENANCE_ZONE_ID = 99; // CP7/CP8 combined maintenance zone

  // Get work station by zone ID
  async getWorkStation(zoneId: number): Promise<WorkStation | null> {
    try {
      const docRef = doc(this.stationsCollection, zoneId.toString());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = this.convertTimestamps(docSnap.data());
        return data as WorkStation;
      }

      // Create default station if doesn't exist
      return await this.createDefaultWorkStation(zoneId);
    } catch (error) {
      logger.error(`Failed to get work station ${zoneId}:`, error);
      return null;
    }
  }

  // Get all production zones (1-23, excludes maintenance)
  async getAllProductionZones(): Promise<WorkStation[]> {
    try {
      const stations: WorkStation[] = [];

      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        const station = await this.getWorkStation(zoneId);
        if (station) {
          stations.push(station);
        }
      }

      return stations;
    } catch (error) {
      logger.error('Failed to get all production zones:', error);
      return [];
    }
  }

  // Get maintenance zone
  async getMaintenanceZone(): Promise<WorkStation | null> {
    return this.getWorkStation(this.MAINTENANCE_ZONE_ID);
  }

  // START WORK - Worker accepts a car and begins work
  async startWork(
    zoneId: number,
    carVin: string,
    carType: string,
    carColor: string,
    workerEmail: string,
    workerName: string,
    fromFlyingCar: boolean = false // True if accepting flying car from previous zone
  ): Promise<void> {
    try {
      logger.info(`Starting work on ${carVin} in zone ${zoneId}`);

      // Check if zone already occupied
      const currentStation = await this.getWorkStation(zoneId);
      if (currentStation?.currentCar) {
        throw new Error(`Zone ${zoneId} is occupied by car ${currentStation.currentCar.vin}. Complete that car first before scanning a new one.`);
      }

      const now = new Date();

      // If accepting flying car from previous zone, clear it
      if (fromFlyingCar && zoneId > 1) {
        logger.info(`Accepting flying car from zone ${zoneId - 1}`);
        const previousZone = await this.getWorkStation(zoneId - 1);
        logger.info(`Previous zone ${zoneId - 1} flying car:`, previousZone?.flyingCar);
        if (previousZone?.flyingCar?.vin === carVin) {
          await this.clearFlyingCar(zoneId - 1);
          logger.info(`✅ Cleared flying car from zone ${zoneId - 1}`);
        } else {
          logger.warn(`VIN mismatch: expected ${carVin}, got ${previousZone?.flyingCar?.vin}`);
        }
      }

      const updates = {
        currentCar: {
          vin: carVin,
          type: carType,
          color: carColor,
          enteredAt: now,
          timeElapsed: 0,
        },
        currentWorker: {
          email: workerEmail,
          displayName: workerName,
          checkedInAt: now,
          timeWorking: 0,
        },
        status: ZoneStatus.WORK,
        lastUpdated: now,
      };

      await this.updateWorkStation(zoneId, updates);
      logger.info(`✅ Started work on ${carVin} in zone ${zoneId}`);

      // Zone statuses updated by ProductionLineView auto-refresh (every 30s)
      // Removed recalculation here for worker speed
    } catch (error) {
      logger.error('Failed to start work:', error);
      throw error;
    }
  }

  // COMPLETE WORK - Worker finishes work, car becomes "flying"
  async completeWork(zoneId: number, carVin: string): Promise<void> {
    try {
      logger.info(`Completing work on ${carVin} in zone ${zoneId}`);

      const station = await this.getWorkStation(zoneId);
      if (!station?.currentCar) {
        throw new Error(`No car found in Zone ${zoneId}. You need to scan a car into this zone first.`);
      }
      if (station.currentCar.vin !== carVin) {
        throw new Error(`VIN mismatch in Zone ${zoneId}. Expected ${carVin} but found ${station.currentCar.vin}. Please check the VIN.`);
      }

      const now = new Date();

      // Move car from currentCar to flyingCar
      const updates = {
        flyingCar: {
          vin: station.currentCar.vin,
          type: station.currentCar.type,
          color: station.currentCar.color,
          completedAt: now,
          flyingTime: 0,
        },
        currentCar: null as null,
        currentWorker: null as null,  // Clear worker when work is complete
        // Reset caused stop timer (work complete, start fresh)
        'causedStopTime.current': 0,
        'causedStopTime.lastResetAt': now,
        lastUpdated: now,
      };

      const docRef = doc(this.stationsCollection, zoneId.toString());
      const cleanedUpdates = prepareForFirestore(updates);
      await updateDoc(docRef, cleanedUpdates);

      logger.info(`✅ Work completed on ${carVin}, now flying in zone ${zoneId}`);
      logger.info(`Flying car data:`, updates.flyingCar);
      logger.info(`Cleaned updates written to Firestore:`, cleanedUpdates);

      // Zone statuses updated by ProductionLineView auto-refresh (every 30s)
      // Removed recalculation here for worker speed

      // Verify the update was written
      const verifyStation = await this.getWorkStation(zoneId);
      logger.info(`Verification - Zone ${zoneId} flying car:`, verifyStation?.flyingCar);
      logger.info(`Verification - Zone ${zoneId} current car:`, verifyStation?.currentCar);
    } catch (error) {
      logger.error('Failed to complete work:', error);
      throw error;
    }
  }

  // CLEAR FLYING CAR - Remove flying car (used when next zone accepts it)
  private async clearFlyingCar(zoneId: number): Promise<void> {
    try {
      const updates = {
        flyingCar: null as null,
        lastUpdated: new Date(),
      };

      const docRef = doc(this.stationsCollection, zoneId.toString());
      await updateDoc(docRef, updates);

      logger.info(`✅ Cleared flying car from zone ${zoneId}`);
    } catch (error) {
      logger.error('Failed to clear flying car:', error);
      throw error;
    }
  }

  // MOVE TO MAINTENANCE - Move car to maintenance zone
  async moveToMaintenance(
    fromZoneId: number,
    carVin: string,
    workerEmail: string,
    workerName: string
  ): Promise<void> {
    try {
      logger.info(`Moving ${carVin} from zone ${fromZoneId} to maintenance`);

      const fromZone = await this.getWorkStation(fromZoneId);
      if (!fromZone) {
        throw new Error(`Zone ${fromZoneId} not found`);
      }

      // Car can be in currentCar or flyingCar
      let carType = '';
      let carColor = '';

      if (fromZone.currentCar?.vin === carVin) {
        carType = fromZone.currentCar.type;
        carColor = fromZone.currentCar.color;
        await updateDoc(doc(this.stationsCollection, fromZoneId.toString()), {
          currentCar: null,
          lastUpdated: new Date(),
        });
      } else if (fromZone.flyingCar?.vin === carVin) {
        carType = fromZone.flyingCar.type;
        carColor = fromZone.flyingCar.color;
        await this.clearFlyingCar(fromZoneId);
      } else {
        throw new Error(`Car ${carVin} not found in zone ${fromZoneId}`);
      }

      // Add to maintenance zone
      await this.startWork(
        this.MAINTENANCE_ZONE_ID,
        carVin,
        carType,
        carColor,
        workerEmail,
        workerName,
        false
      );

      logger.info(`✅ Moved ${carVin} to maintenance zone`);
      await this.recalculateAllZoneStatuses();
    } catch (error) {
      logger.error('Failed to move to maintenance:', error);
      throw error;
    }
  }

  // RECALCULATE ALL ZONE STATUSES - Update work/starve/block status for all zones
  async recalculateAllZoneStatuses(): Promise<void> {
    try {
      const systemState = await productionSystemService.getSystemState();
      const allZones = await this.getAllProductionZones();
      const zoneMap = new Map<number, WorkStation>();

      allZones.forEach(zone => zoneMap.set(zone.zoneId, zone));

      // Calculate status for each zone
      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        const zone = zoneMap.get(zoneId);
        if (!zone) continue;

        const previousZone = zoneId > 1 ? (zoneMap.get(zoneId - 1) || null) : null;
        const newStatus = productionAttributionService.calculateZoneStatus(
          zone,
          previousZone,
          systemState.isOn
        );

        if (zone.status !== newStatus) {
          logger.info(`Zone ${zoneId}: ${zone.status} → ${newStatus} (prev zone flying car: ${previousZone?.flyingCar ? 'YES' : 'NO'})`);
          await updateDoc(doc(this.stationsCollection, zoneId.toString()), {
            status: newStatus,
            lastUpdated: new Date(),
          });
        }
      }

      logger.info('✅ Recalculated all zone statuses');
    } catch (error) {
      logger.error('Failed to recalculate zone statuses:', error);
    }
  }

  // UPDATE TIME ACCUMULATIONS - Called periodically (every 5 seconds)
  async updateTimeAccumulations(): Promise<void> {
    try {
      const systemState = await productionSystemService.getSystemState();
      if (!systemState.isOn) {
        // System is OFF, don't accumulate time
        return;
      }

      const allZones = await this.getAllProductionZones();
      const zoneMap = new Map<number, WorkStation>();
      allZones.forEach(zone => zoneMap.set(zone.zoneId, zone));

      const now = new Date();

      // Calculate attributions
      const attributions = productionAttributionService.calculateAllAttributions(zoneMap);

      // Update each zone
      for (const zone of allZones) {
        // Safe access with defaults for zones still initializing
        const lastCalculatedAt = zone.timeAccumulation?.lastCalculatedAt || now;
        const timeSinceLastUpdate = (now.getTime() - lastCalculatedAt.getTime()) / 1000;
        const minutesToAdd = timeSinceLastUpdate / 60;

        const updates: Record<string, any> = {
          'timeAccumulation.lastCalculatedAt': now,
          lastUpdated: now,
        };

        // Accumulate time based on status
        if (zone.status === ZoneStatus.WORK) {
          const currentWorkTime = zone.timeAccumulation?.workTime || 0;
          updates['timeAccumulation.workTime'] = currentWorkTime + minutesToAdd;

          // Update current car time elapsed
          if (zone.currentCar) {
            const timeElapsed = (zone.currentCar.timeElapsed || 0) + minutesToAdd;
            updates['currentCar.timeElapsed'] = timeElapsed;
          }
        } else if (zone.status === ZoneStatus.STARVE) {
          const currentStarveTime = zone.timeAccumulation?.starveTime || 0;
          updates['timeAccumulation.starveTime'] = currentStarveTime + minutesToAdd;
        } else if (zone.status === ZoneStatus.BLOCK) {
          const currentBlockTime = zone.timeAccumulation?.blockTime || 0;
          updates['timeAccumulation.blockTime'] = currentBlockTime + minutesToAdd;
        }

        // Update flying car time if exists
        if (zone.flyingCar) {
          const flyingTime = (zone.flyingCar.flyingTime || 0) + minutesToAdd;
          updates['flyingCar.flyingTime'] = flyingTime;
        }

        // Update caused stop time (attribution blame)
        const attribution = attributions.get(zone.zoneId);
        if (attribution && (attribution.starveCount > 0 || attribution.blockCount > 0)) {
          const causedMinutes = (attribution.starveCount + attribution.blockCount) * minutesToAdd;
          const currentCausedStop = zone.causedStopTime?.current || 0;
          const totalCausedStop = zone.causedStopTime?.total || 0;
          const newCurrent = currentCausedStop + causedMinutes;
          const newTotal = totalCausedStop + causedMinutes;

          updates['causedStopTime.current'] = newCurrent;
          updates['causedStopTime.total'] = newTotal;

          // Update blame breakdown
          if (attribution.starveCount > 0) {
            const currentStarveBlame = zone.causedStopTime?.starveTimeBlame || 0;
            updates['causedStopTime.starveTimeBlame'] =
              currentStarveBlame + (attribution.starveCount * minutesToAdd);
          }
          if (attribution.blockCount > 0) {
            const currentBlockBlame = zone.causedStopTime?.blockTimeBlame || 0;
            updates['causedStopTime.blockTimeBlame'] =
              currentBlockBlame + (attribution.blockCount * minutesToAdd);
          }
        }

        await updateDoc(doc(this.stationsCollection, zone.zoneId.toString()), updates);
      }

      logger.debug('✅ Updated time accumulations for all zones');
    } catch (error) {
      logger.error('Failed to update time accumulations:', error);
    }
  }

  // RESET ALL ZONES - For daily reset or system initialization
  async resetAllZones(): Promise<void> {
    try {
      logger.info('Resetting all production zones...');

      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        await this.createDefaultWorkStation(zoneId);
      }

      // Reset maintenance zone
      await this.createDefaultWorkStation(this.MAINTENANCE_ZONE_ID);

      logger.info('✅ Reset all zones');
    } catch (error) {
      logger.error('Failed to reset all zones:', error);
      throw error;
    }
  }

  // RESET STATISTICS - Reset processing time stats without clearing cars (Manager feature)
  async resetStatistics(): Promise<void> {
    try {
      logger.info('Resetting zone statistics...');
      const resetTime = new Date();

      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        await updateDoc(doc(this.stationsCollection, zoneId.toString()), {
          carsProcessedToday: 0,
          averageProcessingTime: 0,
          'timeAccumulation.workTime': 0,
          'timeAccumulation.starveTime': 0,
          'timeAccumulation.blockTime': 0,
          'causedStopTime.current': 0,
          'causedStopTime.lastResetAt': resetTime,
          lastUpdated: resetTime
        });
      }

      logger.info('✅ Reset statistics for all zones');
    } catch (error) {
      logger.error('Failed to reset statistics:', error);
      throw error;
    }
  }

  // INITIALIZE ALL STATIONS
  async initializeAllStations(): Promise<void> {
    try {
      const promises = [];

      // Initialize production zones 1-23
      for (let zoneId = 1; zoneId <= 23; zoneId++) {
        promises.push(this.createDefaultWorkStation(zoneId));
      }

      // Initialize maintenance zone
      promises.push(this.createDefaultWorkStation(this.MAINTENANCE_ZONE_ID));

      await Promise.all(promises);
      logger.info('✅ Initialized all work stations (1-23 + maintenance)');
    } catch (error) {
      logger.error('Failed to initialize work stations:', error);
      throw error;
    }
  }

  // CHECK IF SYSTEM IS INITIALIZED
  async isSystemInitialized(): Promise<boolean> {
    try {
      // Check if production system state exists
      const systemState = await productionSystemService.getSystemState();
      if (!systemState) return false;

      // Check if at least Zone 1 exists
      const zone1 = await this.getWorkStation(1);
      if (!zone1) return false;

      return true;
    } catch (error) {
      logger.error('Error checking system initialization:', error);
      return false;
    }
  }

  // Private: Create default work station
  private async createDefaultWorkStation(zoneId: number): Promise<WorkStation> {
    const defaultStation: WorkStation = {
      zoneId,
      status: ZoneStatus.PAUSED,
      causedStopTime: {
        current: 0,
        total: 0,
        starveTimeBlame: 0,
        blockTimeBlame: 0,
      },
      timeAccumulation: {
        workTime: 0,
        starveTime: 0,
        blockTime: 0,
        lastCalculatedAt: new Date(),
      },
      carsProcessedToday: 0,
      averageProcessingTime: 0,
      lastUpdated: new Date(),
    };

    const docRef = doc(this.stationsCollection, zoneId.toString());
    const cleanedData = prepareForFirestore(defaultStation);
    await setDoc(docRef, cleanedData);

    return defaultStation;
  }

  // Private: Update work station
  private async updateWorkStation(zoneId: number, updates: Partial<WorkStation>): Promise<void> {
    const docRef = doc(this.stationsCollection, zoneId.toString());
    const cleanedUpdates = prepareForFirestore(updates);
    await updateDoc(docRef, cleanedUpdates);
  }

  // Private: Convert Firestore Timestamps to Dates
  private convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result = { ...data };

    if (result.lastUpdated && result.lastUpdated instanceof Timestamp) {
      result.lastUpdated = result.lastUpdated.toDate();
    }

    if (result.currentCar?.enteredAt && result.currentCar.enteredAt instanceof Timestamp) {
      result.currentCar.enteredAt = result.currentCar.enteredAt.toDate();
    }

    if (result.flyingCar?.completedAt && result.flyingCar.completedAt instanceof Timestamp) {
      result.flyingCar.completedAt = result.flyingCar.completedAt.toDate();
    }

    if (result.currentWorker?.checkedInAt && result.currentWorker.checkedInAt instanceof Timestamp) {
      result.currentWorker.checkedInAt = result.currentWorker.checkedInAt.toDate();
    }

    if (result.causedStopTime?.lastResetAt && result.causedStopTime.lastResetAt instanceof Timestamp) {
      result.causedStopTime.lastResetAt = result.causedStopTime.lastResetAt.toDate();
    }

    if (result.timeAccumulation?.lastCalculatedAt && result.timeAccumulation.lastCalculatedAt instanceof Timestamp) {
      result.timeAccumulation.lastCalculatedAt = result.timeAccumulation.lastCalculatedAt.toDate();
    }

    if (result.averageResetAt && result.averageResetAt instanceof Timestamp) {
      result.averageResetAt = result.averageResetAt.toDate();
    }

    return result;
  }
}

// Export singleton instance
export const workStationServiceV5 = new WorkStationServiceV5();
export default workStationServiceV5;
