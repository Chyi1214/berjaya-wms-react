// QA Locations Configuration Component - Manager interface for configuring QA bay/zone names
import { useState, useEffect } from 'react';
import { qaLocationService } from '../../../services/qaLocationService';
import type { QALocation } from '../../../types/production';
import { createModuleLogger } from '../../../services/logger';
import { useAuth } from '../../../contexts/AuthContext';

const logger = createModuleLogger('QALocationsConfig');

export default function QALocationsConfig() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<QALocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<QALocation | null>(null);

  // Form state
  const [locationName, setLocationName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');

  // Load locations
  useEffect(() => {
    loadLocations();
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
          Configure physical locations/bays in the QA area where cars are assigned.
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className={!location.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{location.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {location.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      location.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {location.createdBy.split('@')[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => startEdit(location)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(location)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {location.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About QA Locations</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• QA workers can scan cars and assign them to these physical locations</li>
          <li>• Active locations appear in the location dropdown when assigning cars</li>
          <li>• Inactive locations are hidden but preserved for historical records</li>
          <li>• You cannot delete a location that has cars currently assigned to it</li>
        </ul>
      </div>
    </div>
  );
}
