// QA Gate Service - Manage quality gates in Firebase

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch,
} from './costTracking/firestoreWrapper';
import { db } from './firebase';
import type { QAGate, CreateGateInput, UpdateGateInput } from '../types/gate';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('GateService');

const GATES_COLLECTION = 'qa_gates';

class GateService {
  /**
   * Get all gates, ordered by gateIndex
   */
  async getAllGates(): Promise<QAGate[]> {
    try {
      const gatesQuery = query(
        collection(db, GATES_COLLECTION),
        orderBy('gateIndex', 'asc')
      );
      const snapshot = await getDocs(gatesQuery);

      return snapshot.docs.map(doc => ({
        gateId: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as QAGate[];
    } catch (error) {
      logger.error('Failed to get gates:', error);
      throw error;
    }
  }

  /**
   * Get active gates only
   */
  async getActiveGates(): Promise<QAGate[]> {
    const allGates = await this.getAllGates();
    return allGates.filter(gate => gate.isActive);
  }

  /**
   * Get a single gate by ID
   */
  async getGate(gateId: string): Promise<QAGate | null> {
    try {
      const gateDoc = await getDoc(doc(db, GATES_COLLECTION, gateId));
      if (!gateDoc.exists()) {
        return null;
      }

      return {
        gateId: gateDoc.id,
        ...gateDoc.data(),
        createdAt: gateDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: gateDoc.data().updatedAt?.toDate() || new Date(),
      } as QAGate;
    } catch (error) {
      logger.error(`Failed to get gate ${gateId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new gate
   * Automatically assigns the next gateIndex
   */
  async createGate(input: CreateGateInput, userId?: string): Promise<string> {
    try {
      // Get current gates to determine next index
      const gates = await this.getAllGates();
      const nextIndex = gates.length > 0
        ? Math.max(...gates.map(g => g.gateIndex)) + 1
        : 1;

      const newGate = {
        gateIndex: nextIndex,
        gateName: input.gateName.trim(),
        description: input.description?.trim() || '',
        isActive: input.isActive ?? true,
        isPreVinGate: input.isPreVinGate ?? false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId || 'system',
      };

      const docRef = await addDoc(collection(db, GATES_COLLECTION), newGate);
      logger.info(`Created gate ${nextIndex}: ${input.gateName}`);

      return docRef.id;
    } catch (error) {
      logger.error('Failed to create gate:', error);
      throw error;
    }
  }

  /**
   * Update an existing gate
   */
  async updateGate(gateId: string, input: UpdateGateInput): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (input.gateName !== undefined) {
        updateData.gateName = input.gateName.trim();
      }
      if (input.description !== undefined) {
        updateData.description = input.description.trim();
      }
      if (input.isActive !== undefined) {
        updateData.isActive = input.isActive;
      }
      if (input.assignedUsers !== undefined) {
        updateData.assignedUsers = input.assignedUsers;
      }
      if (input.isPreVinGate !== undefined) {
        updateData.isPreVinGate = input.isPreVinGate;
      }

      await updateDoc(doc(db, GATES_COLLECTION, gateId), updateData);
      logger.info(`Updated gate ${gateId}`);
    } catch (error) {
      logger.error(`Failed to update gate ${gateId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a gate
   * Warning: This doesn't check if the gate is in use by inspections
   */
  async deleteGate(gateId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, GATES_COLLECTION, gateId));
      logger.info(`Deleted gate ${gateId}`);
    } catch (error) {
      logger.error(`Failed to delete gate ${gateId}:`, error);
      throw error;
    }
  }

  /**
   * Reorder gates - update gateIndex for multiple gates
   * Used when user drags to reorder
   */
  async reorderGates(gateIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      gateIds.forEach((gateId, index) => {
        const gateRef = doc(db, GATES_COLLECTION, gateId);
        batch.update(gateRef, {
          gateIndex: index + 1,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
      logger.info('Reordered gates');
    } catch (error) {
      logger.error('Failed to reorder gates:', error);
      throw error;
    }
  }

  /**
   * Initialize default gate if none exist
   */
  async initializeDefaultGates(): Promise<void> {
    try {
      const gates = await this.getAllGates();
      if (gates.length > 0) {
        logger.info('Gates already exist, skipping initialization');
        return;
      }

      // Create one default gate for users to start with
      await this.createGate({ gateName: 'Default', description: 'Default QA gate' });

      logger.info('Initialized default gate');
    } catch (error) {
      logger.error('Failed to initialize default gate:', error);
      throw error;
    }
  }
}

export const gateService = new GateService();
