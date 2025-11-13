// Zone Configuration Manager - V8.1.0 Dynamic Zone CRUD
import { useState, useEffect } from 'react';
import { zoneConfigService } from '../../services/zoneConfigService';
import { ZoneConfig, ZoneType, CreateZoneConfigInput } from '../../types/zoneConfig';

export function ZoneConfigManager() {
  const [zones, setZones] = useState<ZoneConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateZoneConfigInput>({
    displayName: '',
    type: ZoneType.PRODUCTION,
    logisticsLocation: '',
    description: '',
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      setError(null);
      const configs = await zoneConfigService.getAllZoneConfigs();
      setZones(configs);
    } catch (err) {
      console.error('Failed to load zones:', err);
      setError(`Failed to load zones: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.displayName || !formData.logisticsLocation) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await zoneConfigService.createZoneConfig(formData);
      setShowCreateForm(false);
      setFormData({
        displayName: '',
        type: ZoneType.PRODUCTION,
        logisticsLocation: '',
        description: '',
      });
      await loadZones();
      alert('✅ Zone created successfully!');
    } catch (err) {
      console.error('Failed to create zone:', err);
      alert(`Failed to create zone: ${err}`);
    }
  };

  const handleUpdate = async (zoneId: number) => {
    if (!editingZone) return;

    try {
      await zoneConfigService.updateZoneConfig(zoneId, {
        displayName: editingZone.displayName,
        type: editingZone.type,
        logisticsLocation: editingZone.logisticsLocation,
        description: editingZone.description,
      });
      setEditingZone(null);
      await loadZones();
      alert('✅ Zone updated successfully!');
    } catch (err) {
      console.error('Failed to update zone:', err);
      alert(`Failed to update zone: ${err}`);
    }
  };

  const handleToggleActive = async (zone: ZoneConfig) => {
    const action = zone.active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`${action} Zone ${zone.displayName}?`)) return;

    try {
      if (zone.active) {
        await zoneConfigService.deactivateZone(zone.zoneId);
      } else {
        await zoneConfigService.reactivateZone(zone.zoneId);
      }
      await loadZones();
      alert(`✅ Zone ${action}d successfully!`);
    } catch (err) {
      console.error(`Failed to ${action} zone:`, err);
      alert(`Failed to ${action} zone: ${err}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-2xl">🏭</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Zone Configuration</h3>
              <p className="text-sm text-gray-600">Manage production and maintenance zones</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ Add New Zone'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-gray-900">Create New Zone</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., 1.5, CP7, Paint Shop"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ZoneType })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ZoneType.PRODUCTION}>Production (Linked)</option>
                  <option value={ZoneType.MAINTENANCE}>Maintenance (Isolated)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logistics Location *
                </label>
                <input
                  type="text"
                  value={formData.logisticsLocation}
                  onChange={(e) => setFormData({ ...formData, logisticsLocation: e.target.value })}
                  placeholder="e.g., Zone 1.5 Storage"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Create Zone
            </button>
          </div>
        )}
      </div>

      {/* Zones Table */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Logistics Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {zones.map((zone) => (
                <tr key={zone.zoneId} className={!zone.active ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {zone.zoneId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingZone?.zoneId === zone.zoneId ? (
                      <input
                        type="text"
                        value={editingZone.displayName}
                        onChange={(e) => setEditingZone({ ...editingZone, displayName: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{zone.displayName}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingZone?.zoneId === zone.zoneId ? (
                      <select
                        value={editingZone.type}
                        onChange={(e) => setEditingZone({ ...editingZone, type: e.target.value as ZoneType })}
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                      >
                        <option value={ZoneType.PRODUCTION}>Production</option>
                        <option value={ZoneType.MAINTENANCE}>Maintenance</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        zone.type === ZoneType.PRODUCTION
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {zone.type === ZoneType.PRODUCTION ? '🔗 Production' : '🔧 Maintenance'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingZone?.zoneId === zone.zoneId ? (
                      <input
                        type="text"
                        value={editingZone.logisticsLocation}
                        onChange={(e) => setEditingZone({ ...editingZone, logisticsLocation: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{zone.logisticsLocation}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      zone.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {zone.active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {editingZone?.zoneId === zone.zoneId ? (
                      <>
                        <button
                          onClick={() => handleUpdate(zone.zoneId)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingZone(null)}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingZone(zone)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(zone)}
                          className={`font-medium ${
                            zone.active
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {zone.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {zones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No zones configured. Click "Add New Zone" to create one.</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{zones.length}</div>
            <div className="text-sm text-blue-800">Total Zones</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {zones.filter(z => z.active && z.type === ZoneType.PRODUCTION).length}
            </div>
            <div className="text-sm text-green-800">Active Production</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {zones.filter(z => z.active && z.type === ZoneType.MAINTENANCE).length}
            </div>
            <div className="text-sm text-orange-800">Active Maintenance</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZoneConfigManager;
