// Task Service - Firebase operations for the Task Management System
import { 
  collection, 
  doc,
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskAssignmentType,
  CreateTaskRequest,
  TaskInteractionResult,
  TaskFilter,
  TaskStats,
  TaskHistoryEntry
} from '../types';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('TaskService');
const TASKS_COLLECTION = 'tasks';

class TaskService {
  
  // Create a new task
  async createTask(request: CreateTaskRequest, createdBy: string): Promise<Task> {
    try {
      const now = new Date();
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine assigned users based on assignment type
      let assignedTo: string[] = [];
      
      if (request.config.assignmentType === TaskAssignmentType.USER_SPECIFIC) {
        assignedTo = request.config.targetUsers || [];
      } else if (request.config.assignmentType === TaskAssignmentType.BROADCAST) {
        // For now, assign to all production users - later integrate with user system
        assignedTo = ['broadcast@system'];
      } else if (request.config.assignmentType === TaskAssignmentType.ZONE_SPECIFIC) {
        // For now, use zone-based assignment - later integrate with zone user mapping
        assignedTo = request.config.targetZones?.map(zone => `zone_${zone}@system`) || [];
      }

      const initialHistory: TaskHistoryEntry = {
        id: `hist_${Date.now()}`,
        timestamp: now,
        action: 'created',
        performedBy: createdBy,
        details: `Task created with type: ${request.config.type}`,
        newStatus: TaskStatus.CREATED
      };

      const task: Task = {
        id: taskId,
        config: request.config,
        status: TaskStatus.CREATED,
        createdBy,
        assignedTo,
        createdAt: now,
        updatedAt: now,
        history: [initialHistory]
      };

      // If task should be assigned immediately
      if (request.assignToCurrentZone !== false) {
        task.status = TaskStatus.ASSIGNED;
        task.assignedAt = now;
        
        task.history.push({
          id: `hist_${Date.now() + 1}`,
          timestamp: now,
          action: 'assigned',
          performedBy: createdBy,
          details: `Auto-assigned to ${assignedTo.join(', ')}`,
          oldStatus: TaskStatus.CREATED,
          newStatus: TaskStatus.ASSIGNED
        });
      }

      // Save to Firebase
      const docRef = doc(db, TASKS_COLLECTION, taskId);
      const firestoreData = this.prepareForFirestore(task);
      await setDoc(docRef, firestoreData);

      logger.info('Task created successfully', { taskId, type: task.config.type });
      return task;

    } catch (error) {
      logger.error('Failed to create task', error);
      throw new Error('Failed to create task');
    }
  }

  // Get all tasks (with optional filtering)
  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    try {
      let q = query(collection(db, TASKS_COLLECTION));

      // Apply filters
      if (filter?.status?.length) {
        q = query(q, where('status', 'in', filter.status));
      }
      if (filter?.priority?.length) {
        q = query(q, where('config.priority', 'in', filter.priority));
      }
      if (filter?.type?.length) {
        q = query(q, where('config.type', 'in', filter.type));
      }
      if (filter?.assignedTo) {
        q = query(q, where('assignedTo', 'array-contains', filter.assignedTo));
      }
      if (filter?.createdBy) {
        q = query(q, where('createdBy', '==', filter.createdBy));
      }

      // Always order by creation date (newest first)
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => this.mapFirestoreToTask(doc.id, doc.data()));

      logger.info('Tasks retrieved successfully', { count: tasks.length });
      return tasks;

    } catch (error) {
      logger.error('Failed to retrieve tasks', error);
      throw new Error('Failed to retrieve tasks');
    }
  }

  // Get tasks assigned to a specific user
  async getTasksForUser(userEmail: string, includeCompleted = false): Promise<Task[]> {
    try {
      const statusFilter = includeCompleted 
        ? [TaskStatus.ASSIGNED, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]
        : [TaskStatus.ASSIGNED, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS];

      return await this.getTasks({
        assignedTo: userEmail,
        status: statusFilter
      });
    } catch (error) {
      logger.error('Failed to retrieve user tasks', error);
      throw new Error('Failed to retrieve user tasks');
    }
  }

  // Get tasks assigned to a specific zone
  async getTasksForZone(zone: number, includeCompleted = false): Promise<Task[]> {
    try {
      const statusFilter = includeCompleted
        ? [TaskStatus.ASSIGNED, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]
        : [TaskStatus.ASSIGNED, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS];

      // Get zone-specific tasks
      const zoneAssignmentTarget = `zone_${zone}@system`;
      const zoneTasks = await this.getTasks({
        assignedTo: zoneAssignmentTarget,
        status: statusFilter
      });

      // Get broadcast tasks (assigned to all workers)
      const broadcastTasks = await this.getTasks({
        assignedTo: 'broadcast@system',
        status: statusFilter
      });

      // Combine and remove duplicates based on task ID
      const allTasks = [...zoneTasks, ...broadcastTasks];
      const uniqueTasks = allTasks.filter((task, index, self) =>
        index === self.findIndex(t => t.id === task.id)
      );

      // Sort by creation date (newest first)
      uniqueTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      logger.info('Zone tasks retrieved successfully', {
        zone,
        zoneTasksCount: zoneTasks.length,
        broadcastTasksCount: broadcastTasks.length,
        totalUniqueCount: uniqueTasks.length
      });

      return uniqueTasks;
    } catch (error) {
      logger.error('Failed to retrieve zone tasks', error);
      throw new Error('Failed to retrieve zone tasks');
    }
  }

  // Get a specific task by ID
  async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const docRef = doc(db, TASKS_COLLECTION, taskId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.mapFirestoreToTask(docSnap.id, docSnap.data());
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve task', error);
      throw new Error('Failed to retrieve task');
    }
  }

  // Update task with interaction result
  async interactWithTask(interaction: TaskInteractionResult, performedBy: string): Promise<Task> {
    try {
      const task = await this.getTaskById(interaction.taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const now = new Date();
      const updates: Partial<Task> = {
        updatedAt: now,
        progressData: interaction.progressData || task.progressData
      };

      let newStatus = task.status;
      let historyAction = interaction.action;

      // Handle different interaction types
      switch (interaction.action) {
        case 'acknowledge':
          if (task.status === TaskStatus.ASSIGNED) {
            newStatus = TaskStatus.ACKNOWLEDGED;
            updates.acknowledgedAt = now;
            updates.acknowledgedBy = performedBy;
          }
          break;

        case 'start':
          if ([TaskStatus.ACKNOWLEDGED, TaskStatus.ASSIGNED].includes(task.status)) {
            newStatus = TaskStatus.IN_PROGRESS;
            updates.startedAt = now;
            if (!task.acknowledgedBy) {
              updates.acknowledgedBy = performedBy;
              updates.acknowledgedAt = now;
            }
          }
          break;

        case 'complete':
          // Allow completing from ASSIGNED, ACKNOWLEDGED, or IN_PROGRESS status
          if ([TaskStatus.ASSIGNED, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS].includes(task.status)) {
            newStatus = task.config.requiresManagerApproval ? TaskStatus.COMPLETED : TaskStatus.APPROVED;
            updates.completedAt = now;
            updates.completedBy = performedBy;

            // Auto-acknowledge and start if not already done
            if (task.status === TaskStatus.ASSIGNED) {
              updates.acknowledgedAt = now;
              updates.acknowledgedBy = performedBy;
              updates.startedAt = now;
            } else if (task.status === TaskStatus.ACKNOWLEDGED) {
              updates.startedAt = now;
            }

            if (!task.config.requiresManagerApproval) {
              updates.approvedAt = now;
              updates.approvedBy = 'system';
            }
          }
          break;

        case 'update_progress':
          // Just update progress data, don't change status
          break;

        case 'cancel':
          newStatus = TaskStatus.CANCELLED;
          break;
      }

      updates.status = newStatus;

      // Add history entry
      const historyEntry: TaskHistoryEntry = {
        id: `hist_${Date.now()}`,
        timestamp: now,
        action: historyAction,
        performedBy,
        details: interaction.notes || `Task ${interaction.action}`,
        oldStatus: task.status,
        newStatus
      };

      updates.history = [...task.history, historyEntry];

      // Update in Firebase
      const docRef = doc(db, TASKS_COLLECTION, interaction.taskId);
      const firestoreUpdates = this.prepareForFirestore(updates);
      await updateDoc(docRef, firestoreUpdates);

      logger.info('Task interaction completed', { 
        taskId: interaction.taskId, 
        action: interaction.action,
        oldStatus: task.status,
        newStatus
      });

      // Return updated task
      return { ...task, ...updates };

    } catch (error) {
      logger.error('Failed to interact with task', error);
      throw new Error('Failed to interact with task');
    }
  }

  // Manager approve/reject task completion
  async managerAction(taskId: string, action: 'approve' | 'reject', performedBy: string, notes?: string): Promise<Task> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== TaskStatus.COMPLETED) {
        throw new Error('Task must be completed before manager action');
      }

      const now = new Date();
      const newStatus = action === 'approve' ? TaskStatus.APPROVED : TaskStatus.REJECTED;

      const updates: Partial<Task> = {
        status: newStatus,
        updatedAt: now
      };

      if (action === 'approve') {
        updates.approvedAt = now;
        updates.approvedBy = performedBy;
      }

      // Add history entry
      const historyEntry: TaskHistoryEntry = {
        id: `hist_${Date.now()}`,
        timestamp: now,
        action,
        performedBy,
        details: notes || `Task ${action}d by manager`,
        oldStatus: task.status,
        newStatus
      };

      updates.history = [...task.history, historyEntry];

      // Update in Firebase
      const docRef = doc(db, TASKS_COLLECTION, taskId);
      const firestoreUpdates = this.prepareForFirestore(updates);
      await updateDoc(docRef, firestoreUpdates);

      logger.info('Manager action completed', { taskId, action });

      return { ...task, ...updates };

    } catch (error) {
      logger.error('Failed to perform manager action', error);
      throw new Error('Failed to perform manager action');
    }
  }

  // Get task statistics
  async getTaskStats(): Promise<TaskStats> {
    try {
      const tasks = await this.getTasks();

      const stats: TaskStats = {
        totalTasks: tasks.length,
        byStatus: {} as any,
        byPriority: {} as any,
        byType: {} as any,
        avgCompletionTimeMinutes: 0,
        overdueCount: 0
      };

      // Initialize counters
      Object.values(TaskStatus).forEach(status => {
        stats.byStatus[status] = 0;
      });
      Object.values(TaskPriority).forEach(priority => {
        stats.byPriority[priority] = 0;
      });
      Object.values(TaskType).forEach(type => {
        stats.byType[type] = 0;
      });

      let totalCompletionMinutes = 0;
      let completedTaskCount = 0;
      const now = new Date();

      tasks.forEach(task => {
        // Count by status
        stats.byStatus[task.status]++;

        // Count by priority
        stats.byPriority[task.config.priority]++;

        // Count by type
        stats.byType[task.config.type]++;

        // Calculate completion time for completed tasks
        if (task.completedAt && task.startedAt) {
          const completionMinutes = Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60));
          totalCompletionMinutes += completionMinutes;
          completedTaskCount++;
        }

        // Count overdue tasks
        if (task.config.dueDate && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.APPROVED) {
          if (now > task.config.dueDate) {
            stats.overdueCount++;
          }
        }
      });

      // Calculate average completion time
      stats.avgCompletionTimeMinutes = completedTaskCount > 0 
        ? Math.round(totalCompletionMinutes / completedTaskCount) 
        : 0;

      return stats;

    } catch (error) {
      logger.error('Failed to calculate task stats', error);
      throw new Error('Failed to calculate task stats');
    }
  }

  // Listen for task changes (real-time updates)
  onTasksChange(callback: (tasks: Task[]) => void, filter?: TaskFilter): () => void {
    try {
      let q = query(collection(db, TASKS_COLLECTION));

      // Apply filters (simplified for real-time)
      if (filter?.assignedTo) {
        q = query(q, where('assignedTo', 'array-contains', filter.assignedTo));
      }

      q = query(q, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => this.mapFirestoreToTask(doc.id, doc.data()));
        callback(tasks);
      });

    } catch (error) {
      logger.error('Failed to set up task listener', error);
      throw new Error('Failed to set up task listener');
    }
  }

  // Helper: Convert Firestore document to Task
  private mapFirestoreToTask(id: string, data: any): Task {
    return {
      ...data,
      id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      assignedAt: data.assignedAt?.toDate(),
      acknowledgedAt: data.acknowledgedAt?.toDate(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      approvedAt: data.approvedAt?.toDate(),
      config: {
        ...data.config,
        dueDate: data.config?.dueDate?.toDate()
      },
      history: data.history?.map((entry: any) => ({
        ...entry,
        timestamp: entry.timestamp?.toDate() || new Date()
      })) || []
    };
  }

  // Helper: Prepare Task data for Firestore
  private prepareForFirestore(task: Partial<Task>): any {
    const data: any = { ...task };

    // Convert dates to Firestore Timestamps
    if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt);
    if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
    if (data.assignedAt) data.assignedAt = Timestamp.fromDate(data.assignedAt);
    if (data.acknowledgedAt) data.acknowledgedAt = Timestamp.fromDate(data.acknowledgedAt);
    if (data.startedAt) data.startedAt = Timestamp.fromDate(data.startedAt);
    if (data.completedAt) data.completedAt = Timestamp.fromDate(data.completedAt);
    if (data.approvedAt) data.approvedAt = Timestamp.fromDate(data.approvedAt);

    // Convert config dates
    if (data.config?.dueDate) {
      data.config = {
        ...data.config,
        dueDate: Timestamp.fromDate(data.config.dueDate)
      };
    }

    // Convert history timestamps
    if (data.history) {
      data.history = data.history.map((entry: TaskHistoryEntry) => ({
        ...entry,
        timestamp: Timestamp.fromDate(entry.timestamp)
      }));
    }

    // Remove undefined fields
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    return data;
  }

  // Delete a task (admin only)
  async deleteTask(taskId: string): Promise<void> {
    try {
      const docRef = doc(db, TASKS_COLLECTION, taskId);
      await deleteDoc(docRef);
      logger.info('Task deleted', { taskId });
    } catch (error) {
      logger.error('Failed to delete task', error);
      throw new Error('Failed to delete task');
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;