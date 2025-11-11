// Production System Service - Manages ON/OFF state and takt time tracking
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from './costTracking/firestoreWrapper';
import { db } from './firebase';
import { prepareForFirestore } from '../utils/firestore';
import { ProductionSystemState } from '../types/production';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ProductionSystemService');

class ProductionSystemService {
  private systemDocRef = doc(db, 'productionSystem', 'state');

  // Get current production system state
  async getSystemState(): Promise<ProductionSystemState> {
    try {
      const docSnap = await getDoc(this.systemDocRef);

      if (docSnap.exists()) {
        const data = this.convertTimestamps(docSnap.data());
        return data as ProductionSystemState;
      }

      // Initialize default state if doesn't exist
      return await this.initializeSystemState();
    } catch (error) {
      logger.error('Failed to get system state:', error);
      throw error;
    }
  }

  // Toggle production system ON/OFF
  async toggleSystem(
    turnOn: boolean,
    userEmail: string,
    userName: string
  ): Promise<ProductionSystemState> {
    try {
      const currentState = await this.getSystemState();

      if (currentState.isOn === turnOn) {
        logger.warn(`System already ${turnOn ? 'ON' : 'OFF'}`);
        return currentState;
      }

      const now = new Date();
      const lastToggleTime = currentState.lastToggledAt;

      // Calculate time elapsed since last toggle
      const elapsedMinutes = Math.floor(
        (now.getTime() - lastToggleTime.getTime()) / (1000 * 60)
      );

      // Update ON/OFF time accumulation
      const updates: Partial<ProductionSystemState> = {
        isOn: turnOn,
        lastToggledAt: now,
        lastToggledBy: userEmail,
        lastToggledByName: userName,
      };

      if (currentState.isOn) {
        // Was ON, now turning OFF
        updates.todayOnTime = currentState.todayOnTime + elapsedMinutes;
      } else {
        // Was OFF, now turning ON
        updates.todayOffTime = currentState.todayOffTime + elapsedMinutes;
      }

      // Add to history
      const newHistoryEntry = {
        timestamp: now,
        action: (turnOn ? 'turn_on' : 'turn_off') as 'turn_on' | 'turn_off',
        by: userEmail,
        byName: userName,
      };

      updates.onOffHistory = [
        ...currentState.onOffHistory,
        newHistoryEntry,
      ];

      // Update Firestore
      const cleanedUpdates = prepareForFirestore(updates);
      await updateDoc(this.systemDocRef, cleanedUpdates);

      logger.info(`System turned ${turnOn ? 'ON' : 'OFF'} by ${userName}`);

      return await this.getSystemState();
    } catch (error) {
      logger.error('Failed to toggle system:', error);
      throw error;
    }
  }

  // Reset daily counters (called at start of day)
  async resetDailyCounters(): Promise<void> {
    try {
      const updates = {
        todayOnTime: 0,
        todayOffTime: 0,
        onOffHistory: [],
        lastUpdated: new Date(),
      };

      const cleanedUpdates = prepareForFirestore(updates);
      await updateDoc(this.systemDocRef, cleanedUpdates);

      logger.info('Reset daily ON/OFF counters');
    } catch (error) {
      logger.error('Failed to reset daily counters:', error);
      throw error;
    }
  }

  // Initialize system state (can be called from UI)
  async initializeSystemState(): Promise<ProductionSystemState> {
    const defaultState: ProductionSystemState = {
      isOn: false, // Start in OFF state for safety
      lastToggledAt: new Date(),
      lastToggledBy: 'system',
      lastToggledByName: 'System',
      todayOnTime: 0,
      todayOffTime: 0,
      onOffHistory: [],
    };

    const cleanedData = prepareForFirestore(defaultState);
    await setDoc(this.systemDocRef, cleanedData);

    logger.info('Initialized production system state');
    return defaultState;
  }

  // Convert Firestore Timestamps to Dates
  private convertTimestamps(data: Record<string, any>): Record<string, any> {
    const result = { ...data };

    if (result.lastToggledAt && result.lastToggledAt instanceof Timestamp) {
      result.lastToggledAt = result.lastToggledAt.toDate();
    }

    if (result.onOffHistory && Array.isArray(result.onOffHistory)) {
      result.onOffHistory = result.onOffHistory.map((entry: any) => ({
        ...entry,
        timestamp: entry.timestamp instanceof Timestamp
          ? entry.timestamp.toDate()
          : entry.timestamp,
      }));
    }

    return result;
  }
}

// Export singleton instance
export const productionSystemService = new ProductionSystemService();
export default productionSystemService;
