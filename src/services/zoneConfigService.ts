// Zone Configuration Service - V8.1.0 Dynamic Zone Management
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from './costTracking/firestoreWrapper';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { ZoneConfig, ZoneType, CreateZoneConfigInput, UpdateZoneConfigInput } from '../types/zoneConfig';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ZoneConfigService');

class ZoneConfigService {
  private configsCollection = collection(db, 'zoneConfigs');

  // Get zone configuration by zone ID
  async getZoneConfig(zoneId: number): Promise<ZoneConfig | null> {
    try {
      const docRef = doc(this.configsCollection, zoneId.toString());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = this.convertTimestamps(docSnap.data());
        return data as ZoneConfig;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get zone config ${zoneId}:`, error);
      return null;
    }
  }

  // Get all zone configurations
  async getAllZoneConfigs(): Promise<ZoneConfig[]> {
    try {
      const q = query(this.configsCollection, orderBy('zoneId', 'asc'));
      const snapshot = await getDocs(q);

      const configs: ZoneConfig[] = [];
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        configs.push(data as ZoneConfig);
      });

      return configs;
    } catch (error) {
      logger.error('Failed to get all zone configs:', error);
      return [];
    }
  }

  // Get active zone configurations only
  async getActiveZoneConfigs(): Promise<ZoneConfig[]> {
    try {
      const q = query(
        this.configsCollection,
        where('active', '==', true),
        orderBy('zoneId', 'asc')
      );
      const snapshot = await getDocs(q);

      const configs: ZoneConfig[] = [];
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        configs.push(data as ZoneConfig);
      });

      return configs;
    } catch (error) {
      logger.error('Failed to get active zone configs:', error);
      return [];
    }
  }

  // Get production zones only
  async getProductionZoneConfigs(): Promise<ZoneConfig[]> {
    try {
      const q = query(
        this.configsCollection,
        where('type', '==', ZoneType.PRODUCTION),
        where('active', '==', true),
        orderBy('zoneId', 'asc')
      );
      const snapshot = await getDocs(q);

      const configs: ZoneConfig[] = [];
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        configs.push(data as ZoneConfig);
      });

      return configs;
    } catch (error) {
      logger.error('Failed to get production zone configs:', error);
      return [];
    }
  }

  // Get maintenance zones only
  async getMaintenanceZoneConfigs(): Promise<ZoneConfig[]> {
    try {
      const q = query(
        this.configsCollection,
        where('type', '==', ZoneType.MAINTENANCE),
        where('active', '==', true),
        orderBy('zoneId', 'asc')
      );
      const snapshot = await getDocs(q);

      const configs: ZoneConfig[] = [];
      snapshot.forEach((doc) => {
        const data = this.convertTimestamps(doc.data());
        configs.push(data as ZoneConfig);
      });

      return configs;
    } catch (error) {
      logger.error('Failed to get maintenance zone configs:', error);
      return [];
    }
  }

  // Create new zone configuration
  async createZoneConfig(input: CreateZoneConfigInput): Promise<number> {
    try {
      // Find next available zone ID
      const allConfigs = await this.getAllZoneConfigs();
      const maxZoneId = allConfigs.reduce((max, config) => Math.max(max, config.zoneId), 0);
      const newZoneId = maxZoneId + 1;

      const newConfig: ZoneConfig = {
        zoneId: newZoneId,
        displayName: input.displayName,
        type: input.type,
        logisticsLocation: input.logisticsLocation,
        active: true,
        description: input.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = doc(this.configsCollection, newZoneId.toString());
      const cleanedData = prepareForFirestore(newConfig);
      await setDoc(docRef, cleanedData);

      logger.info(`Created zone config ${newZoneId} (${input.displayName})`);
      return newZoneId;
    } catch (error) {
      logger.error('Failed to create zone config:', error);
      throw error;
    }
  }

  // Update zone configuration
  async updateZoneConfig(zoneId: number, input: UpdateZoneConfigInput): Promise<void> {
    try {
      const updates = {
        ...input,
        updatedAt: new Date(),
      };

      const docRef = doc(this.configsCollection, zoneId.toString());
      const cleanedUpdates = prepareForFirestore(updates);
      await updateDoc(docRef, cleanedUpdates);

      logger.info(`Updated zone config ${zoneId}`);
    } catch (error) {
      logger.error(`Failed to update zone config ${zoneId}:`, error);
      throw error;
    }
  }

  // Deactivate zone (soft delete)
  async deactivateZone(zoneId: number): Promise<void> {
    try {
      await this.updateZoneConfig(zoneId, { active: false });
      logger.info(`Deactivated zone ${zoneId}`);
    } catch (error) {
      logger.error(`Failed to deactivate zone ${zoneId}:`, error);
      throw error;
    }
  }

  // Reactivate zone
  async reactivateZone(zoneId: number): Promise<void> {
    try {
      await this.updateZoneConfig(zoneId, { active: true });
      logger.info(`Reactivated zone ${zoneId}`);
    } catch (error) {
      logger.error(`Failed to reactivate zone ${zoneId}:`, error);
      throw error;
    }
  }

  // Initialize default zone configurations (migration)
  async initializeDefaultZones(): Promise<void> {
    try {
      logger.info('Initializing default zone configurations...');

      const defaultZones: Omit<ZoneConfig, 'createdAt' | 'updatedAt'>[] = [
        // Production zones 1-23
        ...Array.from({ length: 23 }, (_, i) => ({
          zoneId: i + 1,
          displayName: String(i + 1),
          type: ZoneType.PRODUCTION,
          logisticsLocation: `Zone ${i + 1} Storage`,
          active: true,
          description: `Production Zone ${i + 1}`,
        })),
        // Maintenance zone 99 (CP7/CP8)
        {
          zoneId: 99,
          displayName: 'CP7/CP8',
          type: ZoneType.MAINTENANCE,
          logisticsLocation: 'Maintenance Bay',
          active: true,
          description: 'Maintenance Zone - CP7/CP8 Combined',
        },
      ];

      for (const zone of defaultZones) {
        const docRef = doc(this.configsCollection, zone.zoneId.toString());
        const docSnap = await getDoc(docRef);

        // Only create if doesn't exist
        if (!docSnap.exists()) {
          const zoneConfig: ZoneConfig = {
            ...zone,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const cleanedData = prepareForFirestore(zoneConfig);
          await setDoc(docRef, cleanedData);
          logger.info(`Initialized zone ${zone.zoneId} (${zone.displayName})`);
        }
      }

      logger.info('✅ Default zone configurations initialized');
    } catch (error) {
      logger.error('Failed to initialize default zones:', error);
      throw error;
    }
  }

  // Private: Convert Firestore Timestamps to Dates
  private convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result = { ...data };

    if (result.createdAt && result.createdAt instanceof Timestamp) {
      result.createdAt = result.createdAt.toDate();
    }
    if (result.updatedAt && result.updatedAt instanceof Timestamp) {
      result.updatedAt = result.updatedAt.toDate();
    }

    return result;
  }
}

// Export singleton instance
export const zoneConfigService = new ZoneConfigService();
export default zoneConfigService;
