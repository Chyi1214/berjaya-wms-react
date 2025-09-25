// Task Management View - Manager interface for task oversight and creation
import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType, CreateTaskRequest, TaskAssignmentType } from '../../types';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../contexts/AuthContext';
import { toolCheckService } from '../../services/toolCheckService';
import { ToolCheckConfig } from './ToolCheckConfig';
import { ToolCheckDashboard } from './ToolCheckDashboard';

interface TaskManagementViewProps {
  onRefresh?: () => void;
}

export function TaskManagementView({ onRefresh }: TaskManagementViewProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'toolcheck' | 'dashboard'>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<{ [taskId: string]: { completed: number; total: number; allComplete: boolean } }>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load all tasks
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await taskService.getTasks();
      setTasks(allTasks);

      // Load progress for tool check tasks
      const progressData: { [taskId: string]: { completed: number; total: number; allComplete: boolean } } = {};
      for (const task of allTasks) {
        if (task.config.type === TaskType.DATA_COLLECTION && task.config.relatedEntities?.batchId) {
          try {
            const progress = await toolCheckService.getToolCheckProgress(task.id);
            if (progress) {
              progressData[task.id] = progress;
            }
          } catch (error) {
            console.error(`Failed to load progress for task ${task.id}:`, error);
          }
        }
      }
      setTaskProgress(progressData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskRequest: CreateTaskRequest) => {
    try {
      if (!user) {
        console.error('No user available to create task');
        return;
      }
      await taskService.createTask(taskRequest, user.email);
      await loadTasks(); // Refresh task list
      setShowCreateForm(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This will permanently remove all task data and submissions.')) {
      return;
    }

    try {
      setDeleting(taskId);
      await taskService.deleteTask(taskId);
      await loadTasks(); // Refresh task list
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (activeView === 'toolcheck') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => setActiveView('overview')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tasks
          </button>
        </div>
        <ToolCheckConfig onRefresh={onRefresh} />
      </div>
    );
  }

  if (activeView === 'dashboard' && selectedTaskId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => {
              setActiveView('overview');
              setSelectedTaskId(null);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tasks
          </button>
        </div>
        <ToolCheckDashboard
          taskId={selectedTaskId}
          onClose={() => {
            setActiveView('overview');
            setSelectedTaskId(null);
          }}
          onTaskDeleted={() => {
            // Refresh the task list after deletion
            loadTasks();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📋 Task Management</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage tasks for production workers
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveView('toolcheck')}
            className="btn-secondary"
          >
            🔧 Tool Check Config
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            ➕ Create Task
          </button>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {tasks.filter(t => t.status === TaskStatus.ASSIGNED).length}
          </div>
          <div className="text-sm text-gray-600">Assigned Tasks</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {tasks.filter(t => t.status === TaskStatus.COMPLETED).length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {tasks.filter(t => t.config.priority === TaskPriority.URGENT || t.config.priority === TaskPriority.CRITICAL).length}
          </div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <h4 className="font-medium text-gray-900 mb-4">All Tasks ({tasks.length})</h4>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium">No tasks created yet</h3>
              <p>Create your first task to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.config.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          task.config.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          task.config.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.config.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.config.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'acknowledged' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {task.config.type.replace('_', ' ').toUpperCase()}
                        </span>
                        {/* Progress badge for tool check tasks */}
                        {task.config.type === TaskType.DATA_COLLECTION && task.config.relatedEntities?.batchId && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            taskProgress[task.id]?.allComplete ? 'bg-green-100 text-green-800' :
                            taskProgress[task.id] ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {taskProgress[task.id] ? (
                              taskProgress[task.id].allComplete ? (
                                '✅ All Zones Complete'
                              ) : (
                                `${taskProgress[task.id].completed}/${taskProgress[task.id].total} zones`
                              )
                            ) : (
                              'Loading progress...'
                            )}
                          </span>
                        )}
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-1">{task.config.title}</h5>
                      <p className="text-gray-600 text-sm mb-2">{task.config.description}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Created: {task.createdAt.toLocaleString()}</div>
                        <div>Assigned to: {task.assignedTo.join(', ')}</div>
                        {task.acknowledgedBy && (
                          <div>Acknowledged by: {task.acknowledgedBy}</div>
                        )}
                        {task.completedBy && (
                          <div>Completed by: {task.completedBy}</div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          if (task.config.type === TaskType.DATA_COLLECTION && task.config.relatedEntities?.batchId) {
                            setSelectedTaskId(task.id);
                            setActiveView('dashboard');
                          }
                        }}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        {task.config.type === TaskType.DATA_COLLECTION && task.config.relatedEntities?.batchId ?
                          '📊 Dashboard' : 'View Details'}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={deleting === task.id}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === task.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white inline-block mr-1"></div>
                            Deleting...
                          </>
                        ) : (
                          '🗑️ Delete'
                        )}
                      </button>
                      {task.status === TaskStatus.COMPLETED && task.config.requiresManagerApproval && (
                        <div className="flex space-x-1">
                          <button className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Approve
                          </button>
                          <button className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateForm && (
        <CreateTaskModal
          onClose={() => setShowCreateForm(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}

// Simple Create Task Modal Component
interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (request: CreateTaskRequest) => void;
}

function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.ACTION_ITEM);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [assignmentType, setAssignmentType] = useState<TaskAssignmentType>(TaskAssignmentType.BROADCAST);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Generate zone options (1-30 production zones)
  const zoneOptions = Array.from({ length: 30 }, (_, i) => i + 1);

  const toggleZone = (zone: number) => {
    setSelectedZones(prev =>
      prev.includes(zone)
        ? prev.filter(z => z !== zone)
        : [...prev, zone]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for zone-specific assignment
    if (assignmentType === TaskAssignmentType.ZONE_SPECIFIC && selectedZones.length === 0) {
      alert('Please select at least one zone for zone-specific assignment.');
      return;
    }

    // Validation for user-specific assignment
    if (assignmentType === TaskAssignmentType.USER_SPECIFIC && selectedUsers.length === 0) {
      alert('Please enter at least one user email for user-specific assignment.');
      return;
    }

    const request: CreateTaskRequest = {
      config: {
        type,
        title,
        description,
        assignmentType,
        priority,
        requiresConfirmation: true,
        requiresManagerApproval: false,
        // Add target zones and users based on assignment type
        ...(assignmentType === TaskAssignmentType.ZONE_SPECIFIC && selectedZones.length > 0 && {
          targetZones: selectedZones.map(zone => zone.toString())
        }),
        ...(assignmentType === TaskAssignmentType.USER_SPECIFIC && selectedUsers.length > 0 && {
          targetUsers: selectedUsers
        }),
      },
      assignToCurrentZone: true
    };

    onCreate(request);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value={TaskType.NOTIFICATION}>Notification</option>
                <option value={TaskType.ACTION_ITEM}>Action Item</option>
                <option value={TaskType.CHECKLIST}>Checklist</option>
                <option value={TaskType.DATA_COLLECTION}>Data Collection</option>
                <option value={TaskType.INSPECTION}>Inspection</option>
                <option value={TaskType.MAINTENANCE}>Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.NORMAL}>Normal</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
                <option value={TaskPriority.CRITICAL}>Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignment
            </label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value as TaskAssignmentType)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={TaskAssignmentType.BROADCAST}>All Workers</option>
              <option value={TaskAssignmentType.ZONE_SPECIFIC}>Specific Zones</option>
              <option value={TaskAssignmentType.USER_SPECIFIC}>Specific Users</option>
            </select>
          </div>

          {/* Zone Selection */}
          {assignmentType === TaskAssignmentType.ZONE_SPECIFIC && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Zones ({selectedZones.length} selected)
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                <div className="grid grid-cols-6 gap-1">
                  {zoneOptions.map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleZone(zone)}
                      className={`px-2 py-1 text-xs rounded ${
                        selectedZones.includes(zone)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
              {selectedZones.length === 0 && (
                <p className="text-xs text-red-600 mt-1">Please select at least one zone</p>
              )}
            </div>
          )}

          {/* User Selection */}
          {assignmentType === TaskAssignmentType.USER_SPECIFIC && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Emails (comma-separated)
              </label>
              <textarea
                value={selectedUsers.join(', ')}
                onChange={(e) => setSelectedUsers(e.target.value.split(',').map(u => u.trim()).filter(u => u))}
                placeholder="user1@example.com, user2@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={2}
              />
              {selectedUsers.length === 0 && (
                <p className="text-xs text-red-600 mt-1">Please enter at least one user email</p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}