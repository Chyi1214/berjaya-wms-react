// QA Locations Configuration Component - Manager interface for configuring QA bay/zone names
import { useState, useEffect } from 'react';
import { qaLocationService } from '../../../services/qaLocationService';
import type { QALocation } from '../../../types/production';
import { createModuleLogger } from '../../../services/logger';
import { useAuth } from '../../../contexts/AuthContext';
import { userManagementService } from '../../../services/userManagement';
import type { UserRecord } from '../../../types/user';

const logger = createModuleLogger('QALocationsConfig');

export default function QALocationsConfig() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<QALocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<QALocation | null>(null);

  // User management
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);

  // Assignment states
  const [assigningLocationId, setAssigningLocationId] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');

  // Form state
  const [locationName, setLocationName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');

  // Load locations and users
  useEffect(() => {
    loadLocations();
    loadUsers();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await qaLocationService.getLocations();
      setLocations(data);
    } catch (error) {
      logger.error('Failed to load locations:', error);
      setStatusMessage('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await userManagementService.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      logger.error('Failed to load users:', error);
    }
  };

  // Add new location
  const handleAddLocation = async () => {
    if (!locationName.trim()) {
      setStatusMessage('❌ Location name is required');
      return;
    }

    if (!user?.email) {
      setStatusMessage('❌ User not authenticated');
      return;
    }

    try {
      await qaLocationService.createLocation(
        locationName,
        locationDescription || undefined,
        user.email
      );
      setStatusMessage('✅ Location added successfully');
      setLocationName('');
      setLocationDescription('');
      setShowAddModal(false);
      await loadLocations();
    } catch (error) {
      logger.error('Failed to add location:', error);
      setStatusMessage(`❌ ${error instanceof Error ? error.message : 'Failed to add location'}`);
    }
  };

  // Update location
  const handleUpdateLocation = async () => {
    if (!editingLocation) return;
    if (!locationName.trim()) {
      setStatusMessage('❌ Location name is required');
      return;
    }

    if (!user?.email) {
      setStatusMessage('❌ User not authenticated');
      return;
    }

    try {
      await qaLocationService.updateLocation(
        editingLocation.id,
        {
          name: locationName,
          description: locationDescription || undefined
        },
        user.email
      );
      setStatusMessage('✅ Location updated successfully');
      setEditingLocation(null);
      setLocationName('');
      setLocationDescription('');
      await loadLocations();
    } catch (error) {
      logger.error('Failed to update location:', error);
      setStatusMessage(`❌ ${error instanceof Error ? error.message : 'Failed to update location'}`);
    }
  };

  // Toggle active status
  const handleToggleActive = async (location: QALocation) => {
    if (!user?.email) {
      setStatusMessage('❌ User not authenticated');
      return;
    }

    try {
      await qaLocationService.updateLocation(
        location.id,
        { isActive: !location.isActive },
        user.email
      );
      setStatusMessage(`✅ Location ${location.isActive ? 'deactivated' : 'activated'}`);
      await loadLocations();
    } catch (error) {
      logger.error('Failed to toggle location status:', error);
      setStatusMessage(`❌ Failed to update location`);
    }
  };

  // Delete location
  const handleDeleteLocation = async (location: QALocation) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await qaLocationService.deleteLocation(location.id);
      setStatusMessage('✅ Location deleted successfully');
      await loadLocations();
    } catch (error) {
      logger.error('Failed to delete location:', error);
      setStatusMessage(`❌ ${error instanceof Error ? error.message : 'Failed to delete location'}`);
    }
  };

  // User assignment functions
  const handleAddUser = async (locationId: string) => {
    const email = newUserEmail.trim().toLowerCase();
    if (!email) {
      setStatusMessage('❌ Please enter a user email');
      return;
    }

    // Find user to verify they exist
    const userExists = allUsers.some(u => u.email.toLowerCase() === email);
    if (!userExists) {
      setStatusMessage('❌ User not found in system');
      return;
    }

    if (!user?.email) {
      setStatusMessage('❌ User not authenticated');
      return;
    }

    try {
      const location = locations.find(l => l.id === locationId);
      if (!location) return;

      const currentUsers = location.assignedUsers || [];
      if (currentUsers.includes(email)) {
        setStatusMessage('❌ User already assigned to this location');
        return;
      }

      await qaLocationService.updateLocation(
        locationId,
        { assignedUsers: [...currentUsers, email] },
        user.email
      );

      await loadLocations();
      setNewUserEmail('');
      setStatusMessage('✅ User assigned successfully');
    } catch (error) {
      logger.error('Failed to assign user:', error);
      setStatusMessage('❌ Failed to assign user');
    }
  };

  const handleRemoveUser = async (locationId: string, userEmail: string) => {
    if (!confirm(`Remove ${userEmail} from this location?`)) {
      return;
    }

    if (!user?.email) {
      setStatusMessage('❌ User not authenticated');
      return;
    }

    try {
      const location = locations.find(l => l.id === locationId);
      if (!location) return;

      const currentUsers = location.assignedUsers || [];
      await qaLocationService.updateLocation(
        locationId,
        { assignedUsers: currentUsers.filter(email => email !== userEmail) },
        user.email
      );

      await loadLocations();
      setStatusMessage('✅ User removed successfully');
    } catch (error) {
      logger.error('Failed to remove user:', error);
      setStatusMessage('❌ Failed to remove user');
    }
  };

  const getUserDisplayName = (email: string): string => {
    const user = allUsers.find(u => u.email === email);
    return user?.displayName || email;
  };

  // Start editing location
  const startEdit = (location: QALocation) => {
    setEditingLocation(location);
    setLocationName(location.name);
    setLocationDescription(location.description || '');
    setShowAddModal(true);
  };

  // Cancel edit/add
  const handleCancel = () => {
    setShowAddModal(false);
    setEditingLocation(null);
    setLocationName('');
    setLocationDescription('');
    setStatusMessage('');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">QA Location Configuration</h2>
        <p className="text-gray-600">
          Configure physical locations/bays in the QA area and assign workers.
        </p>
      </div>

      {/* Add Location Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Location
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-lg ${
          statusMessage.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {statusMessage}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Bay-A1, Zone-B2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="Optional description of this location"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={editingLocation ? handleUpdateLocation : handleAddLocation}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {editingLocation ? 'Update' : 'Add'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading locations...</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No QA locations configured yet.</p>
          <p className="text-sm text-gray-500">Click "Add Location" to create your first QA bay/zone.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`bg-white rounded-lg shadow border border-gray-200 overflow-hidden ${
                !location.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Location Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      location.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(location)}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-lg"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(location)}
                      className={`px-3 py-1.5 text-sm rounded-lg ${
                        location.isActive
                          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      {location.isActive ? '🔒 Deactivate' : '🔓 Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location)}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {location.description && (
                  <p className="text-sm text-gray-600 mb-2">{location.description}</p>
                )}

                <p className="text-xs text-gray-500">Created by: {location.createdBy.split('@')[0]}</p>
              </div>

              {/* Assigned Users Section */}
              <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h6 className="text-sm font-semibold text-gray-700">
                    Assigned Workers ({(location.assignedUsers || []).length})
                  </h6>
                  <button
                    onClick={() => setAssigningLocationId(assigningLocationId === location.id ? null : location.id)}
                    className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs rounded"
                  >
                    {assigningLocationId === location.id ? '✕ Cancel' : '➕ Assign Worker'}
                  </button>
                </div>

                {/* Add User Form */}
                {assigningLocationId === location.id && (
                  <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      User Email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddUser(location.id);
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="worker@example.com"
                      />
                      <button
                        onClick={() => handleAddUser(location.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Only assigned workers can scan items to this location.
                    </p>
                  </div>
                )}

                {/* Assigned Users List */}
                {location.assignedUsers && location.assignedUsers.length > 0 ? (
                  <div className="space-y-1">
                    {location.assignedUsers.map(email => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-2 bg-white rounded text-sm"
                      >
                        <span className="text-gray-700">
                          {getUserDisplayName(email)}
                        </span>
                        <button
                          onClick={() => handleRemoveUser(location.id, email)}
                          className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    No workers assigned. Managers can scan to any location.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How Worker Assignment Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Assign workers to specific locations to restrict their access</li>
          <li>• Workers assigned to 1 location: Auto-assigned, no dropdown shown when scanning</li>
          <li>• Workers assigned to multiple locations: Can choose from their assigned locations only</li>
          <li>• Managers and unassigned workers: Can scan to any active location</li>
          <li>• Inactive locations won't appear in any selection list</li>
          <li>• You cannot delete a location that has cars currently assigned to it</li>
        </ul>
      </div>
    </div>
  );
}
