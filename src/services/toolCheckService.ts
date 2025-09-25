// Tool Check Service - Firebase operations for tool inventory checking
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ToolCheckConfig,
  ToolCheckSubmission,
  ToolCheckDashboardData,
  CreateToolCheckTaskRequest,
  ToolCheckItemResult
} from '../types';
import { taskService } from './taskService';
import { TaskType, TaskPriority, TaskAssignmentType, CreateTaskRequest } from '../types';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('ToolCheckService');
const TOOL_CHECK_CONFIGS_COLLECTION = 'toolCheckConfigs';
const TOOL_CHECK_SUBMISSIONS_COLLECTION = 'toolCheckSubmissions';

class ToolCheckService {
  
  // Create or update tool check configuration
  async saveToolCheckConfig(config: Omit<ToolCheckConfig, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string): Promise<string> {
    try {
      const now = new Date();
      const configId = `toolcheck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fullConfig = {
        ...config,
        id: configId,
        createdBy,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };

      // Remove undefined fields for Firestore
      const cleanConfig = Object.fromEntries(
        Object.entries(fullConfig).filter(([_, value]) => value !== undefined)
      );

      const docRef = doc(db, TOOL_CHECK_CONFIGS_COLLECTION, configId);
      await setDoc(docRef, cleanConfig);

      logger.info('Tool check config created', { configId, itemCount: config.items.length });
      return configId;
    } catch (error) {
      logger.error('Failed to save tool check config', error);
      throw new Error('Failed to save tool check configuration');
    }
  }

  // Get all tool check configurations
  async getToolCheckConfigs(): Promise<ToolCheckConfig[]> {
    try {
      const q = query(
        collection(db, TOOL_CHECK_CONFIGS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const configs = snapshot.docs.map(doc => 
        this.mapFirestoreToConfig(doc.id, doc.data())
      );

      logger.info('Tool check configs retrieved', { count: configs.length });
      return configs;
    } catch (error) {
      logger.error('Failed to retrieve tool check configs', error);
      throw new Error('Failed to retrieve tool check configurations');
    }
  }

  // Get specific tool check configuration
  async getToolCheckConfig(configId: string): Promise<ToolCheckConfig | null> {
    try {
      const docRef = doc(db, TOOL_CHECK_CONFIGS_COLLECTION, configId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.mapFirestoreToConfig(docSnap.id, docSnap.data());
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve tool check config', error);
      throw new Error('Failed to retrieve tool check configuration');
    }
  }

  // Create task instance from tool check config
  async createToolCheckTask(request: CreateToolCheckTaskRequest, createdBy: string): Promise<string> {
    try {
      const config = await this.getToolCheckConfig(request.configId);
      if (!config) {
        throw new Error('Tool check configuration not found');
      }

      // Create the task using existing task service
      const taskRequest: CreateTaskRequest = {
        config: {
          type: TaskType.DATA_COLLECTION,
          title: config.name,
          description: config.description + (request.note ? `\n\nNote: ${request.note}` : ''),
          assignmentType: TaskAssignmentType.ZONE_SPECIFIC,
          targetZones: request.targetZones?.map(z => z.toString()) || config.targetZones.map(z => z.toString()),
          priority: TaskPriority.NORMAL,
          requiresConfirmation: true,
          requiresManagerApproval: false,
          
          // Tool check specific data
          interactive: {
            dataFields: config.items.map(item => ({
              id: item.id,
              label: `${item.name} (Expected: ${item.expectedCount})`,
              type: 'number' as const,
              required: true,
              validation: { min: 0 }
            })),
            attachmentAllowed: false,
            photoRequired: false,
            signatureRequired: false
          },

          // Store reference to tool check config
          relatedEntities: {
            batchId: request.configId // Store config ID in batch field for reference
          }
        },
        assignToCurrentZone: true
      };

      const task = await taskService.createTask(taskRequest, createdBy);
      logger.info('Tool check task created', { taskId: task.id, configId: request.configId });
      
      return task.id;
    } catch (error) {
      logger.error('Failed to create tool check task', error);
      throw new Error('Failed to create tool check task');
    }
  }

  // Submit tool check results
  async submitToolCheck(
    taskId: string,
    configId: string,
    workerEmail: string,
    zone: number,
    itemResults: ToolCheckItemResult[]
  ): Promise<void> {
    try {
      const submissionId = `submission_${taskId}_${zone}_${Date.now()}`;
      const now = new Date();

      logger.info('Starting tool check submission', {
        submissionId, taskId, configId, workerEmail, zone, itemCount: itemResults.length
      });

      const submission: ToolCheckSubmission = {
        id: submissionId,
        taskId,
        configId,
        workerEmail,
        zone,
        items: itemResults,
        submittedAt: now,
        isComplete: true
      };

      // Save submission
      logger.info('Saving submission to Firestore');
      const docRef = doc(db, TOOL_CHECK_SUBMISSIONS_COLLECTION, submissionId);
      const firestoreData = this.prepareSubmissionForFirestore(submission);
      await setDoc(docRef, firestoreData);
      logger.info('Submission saved successfully');

      // Update task progress
      logger.info('Updating task progress');
      await taskService.interactWithTask({
        taskId,
        action: 'complete',
        progressData: {
          collectedData: itemResults.reduce((acc, item) => {
            acc[item.itemId] = item.actualCount;
            if (item.extraFieldValue) {
              acc[`${item.itemId}_extra`] = item.extraFieldValue;
            }
            return acc;
          }, {} as { [key: string]: any }),
          notes: `Tool check completed for zone ${zone}`
        }
      }, workerEmail);
      logger.info('Task progress updated successfully');

      logger.info('Tool check submitted successfully', { submissionId, taskId, zone });
    } catch (error) {
      logger.error('Failed to submit tool check', error);
      console.error('Tool check submission error details:', error);
      throw new Error('Failed to submit tool check');
    }
  }

  // Get tool check dashboard data for managers
  async getToolCheckDashboard(taskId: string): Promise<ToolCheckDashboardData | null> {
    try {
      // Get task details
      const task = await taskService.getTaskById(taskId);
      if (!task || !task.config.relatedEntities?.batchId) {
        return null;
      }

      const configId = task.config.relatedEntities.batchId;
      const config = await this.getToolCheckConfig(configId);
      if (!config) {
        return null;
      }

      // Get all submissions for this task
      const q = query(
        collection(db, TOOL_CHECK_SUBMISSIONS_COLLECTION),
        where('taskId', '==', taskId)
      );
      
      const snapshot = await getDocs(q);
      const submissions = snapshot.docs.map(doc => 
        this.mapFirestoreToSubmission(doc.id, doc.data())
      );

      // Build dashboard data
      const dashboardData = this.buildDashboardData(config, task.id, submissions);
      
      logger.info('Tool check dashboard data built', { taskId, submissionCount: submissions.length });
      return dashboardData;
    } catch (error) {
      logger.error('Failed to get tool check dashboard', error);
      throw new Error('Failed to get tool check dashboard');
    }
  }

  // Build dashboard aggregated data
  private buildDashboardData(
    config: ToolCheckConfig,
    taskId: string,
    submissions: ToolCheckSubmission[]
  ): ToolCheckDashboardData {
    const completionStatus: { [zoneId: number]: any } = {};
    const summaryGrid: { [itemId: string]: { [zoneId: number]: any } } = {};

    logger.info('Building dashboard data', {
      taskId,
      configItems: config.items.map(i => ({ id: i.id, name: i.name })),
      targetZones: config.targetZones,
      submissionCount: submissions.length
    });

    // Initialize grid structure
    config.items.forEach(item => {
      summaryGrid[item.id] = {};
      config.targetZones.forEach(zone => {
        summaryGrid[item.id][zone] = {
          actualCount: 0,
          expectedCount: item.expectedCount,
          status: 'pending' as const,
          extraFieldValue: undefined
        };
      });
    });

    // Initialize completion status
    config.targetZones.forEach(zone => {
      completionStatus[zone] = {
        completed: false
      };
    });

    // Process submissions
    submissions.forEach(submission => {
      logger.info('Processing submission', {
        zone: submission.zone,
        itemCount: submission.items.length,
        itemIds: submission.items.map(i => i.itemId)
      });

      // Mark zone as completed
      completionStatus[submission.zone] = {
        completed: true,
        workerEmail: submission.workerEmail,
        submittedAt: submission.submittedAt
      };

      // Fill in item results
      submission.items.forEach(itemResult => {
        // Check if the item ID exists in our config
        const configItem = config.items.find(item => item.id === itemResult.itemId);
        if (!configItem) {
          logger.warn('Item result has no matching config item', {
            itemId: itemResult.itemId,
            availableConfigItems: config.items.map(i => i.id)
          });
          return;
        }

        // Check if zone exists in target zones
        if (!config.targetZones.includes(submission.zone)) {
          logger.warn('Submission zone not in target zones', {
            zone: submission.zone,
            targetZones: config.targetZones
          });
          return;
        }

        // Ensure grid structure exists
        if (!summaryGrid[itemResult.itemId]) {
          logger.warn('Missing summaryGrid entry for item', { itemId: itemResult.itemId });
          summaryGrid[itemResult.itemId] = {};
        }

        if (!summaryGrid[itemResult.itemId][submission.zone]) {
          logger.warn('Missing summaryGrid entry for zone', {
            itemId: itemResult.itemId,
            zone: submission.zone
          });
          summaryGrid[itemResult.itemId][submission.zone] = {
            actualCount: 0,
            expectedCount: configItem.expectedCount,
            status: 'pending' as const,
            extraFieldValue: undefined
          };
        }

        // Update the grid cell with submission data
        const gridCell = summaryGrid[itemResult.itemId][submission.zone];
        gridCell.actualCount = itemResult.actualCount;
        gridCell.status = itemResult.status;
        gridCell.extraFieldValue = itemResult.extraFieldValue;

        logger.info('Updated grid cell', {
          itemId: itemResult.itemId,
          zone: submission.zone,
          status: itemResult.status,
          actualCount: itemResult.actualCount
        });
      });
    });

    const result = {
      configId: config.id,
      taskId,
      items: config.items,
      zones: config.targetZones,
      submissions,
      completionStatus,
      summaryGrid
    };

    logger.info('Dashboard data built successfully', {
      itemCount: result.items.length,
      zoneCount: result.zones.length,
      completedZones: Object.keys(completionStatus).filter(z => completionStatus[parseInt(z)].completed).length,
      summaryGridKeys: Object.keys(summaryGrid)
    });

    return result;
  }

  // Helper methods for Firestore conversion

  private prepareSubmissionForFirestore(submission: ToolCheckSubmission): any {
    const data: any = {
      ...submission,
      submittedAt: Timestamp.fromDate(submission.submittedAt)
    };

    // Clean items array to remove undefined fields
    if (data.items) {
      data.items = data.items.map((item: any) => {
        const cleanItem: any = {};
        Object.keys(item).forEach(key => {
          if (item[key] !== undefined) {
            cleanItem[key] = item[key];
          }
        });
        return cleanItem;
      });
    }

    // Remove undefined fields from top level
    const cleanData: any = {};
    Object.keys(data).forEach((key: string) => {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    });

    return cleanData;
  }

  private mapFirestoreToConfig(id: string, data: any): ToolCheckConfig {
    return {
      ...data,
      id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  private mapFirestoreToSubmission(id: string, data: any): ToolCheckSubmission {
    return {
      ...data,
      id,
      submittedAt: data.submittedAt?.toDate() || new Date()
    };
  }
}

// Export singleton instance
export const toolCheckService = new ToolCheckService();
export default toolCheckService;