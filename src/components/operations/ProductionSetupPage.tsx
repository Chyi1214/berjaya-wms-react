import { memo, useState, useEffect } from 'react';
import { bomService } from '../../services/bom';
import { batchManagementService } from '../../services/batchManagement';
import { BOM, CarType, ZoneBOMMapping } from '../../types/inventory';

interface ProductionSetupPageProps {
  user: { email: string } | null;
}

export const ProductionSetupPage = memo(function ProductionSetupPage({ user }: ProductionSetupPageProps) {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [zoneMappings, setZoneMappings] = useState<ZoneBOMMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Car Type form
  const [newCarType, setNewCarType] = useState({
    carCode: '',
    name: '',
    description: ''
  });

  // New Zone BOM Mapping form
  const [newMapping, setNewMapping] = useState({
    zoneId: '',
    carCode: '',
    bomCode: '',
    consumeOnCompletion: true
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [bomsData, carTypesData, mappingsData] = await Promise.all([
        bomService.getAllBOMs(),
        batchManagementService.getAllCarTypes(),
        batchManagementService.getZoneBOMMappings()
      ]);
      setBoms(bomsData);
      setCarTypes(carTypesData);
      setZoneMappings(mappingsData);
    } catch (error) {
      console.error('Failed to load production setup data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCarType = async () => {
    if (!newCarType.carCode || !newCarType.name || !user?.email) return;

    try {
      await batchManagementService.createCarType({
        carCode: newCarType.carCode,
        name: newCarType.name,
        description: newCarType.description
      });

      setNewCarType({ carCode: '', name: '', description: '' });
      await loadAllData();
      alert('Car Type created successfully!');
    } catch (error) {
      console.error('Failed to create car type:', error);
      alert('Failed to create car type');
    }
  };

  const handleDeleteCarType = async (carCode: string) => {
    if (!confirm(`Are you sure you want to delete car type "${carCode}"?\n\nThis will NOT delete associated batches or data.`)) {
      return;
    }

    try {
      await batchManagementService.deleteCarType(carCode);
      await loadAllData();
      alert(`Car type "${carCode}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete car type:', error);
      alert('Failed to delete car type');
    }
  };

  const handleCreateZoneMapping = async () => {
    if (!newMapping.zoneId || !newMapping.carCode || !newMapping.bomCode || !user?.email) return;

    try {
      await batchManagementService.createZoneBOMMapping({
        zoneId: newMapping.zoneId,
        carCode: newMapping.carCode,
        bomCode: newMapping.bomCode,
        consumeOnCompletion: newMapping.consumeOnCompletion
      });

      setNewMapping({ zoneId: '', carCode: '', bomCode: '', consumeOnCompletion: true });
      await loadAllData();
      alert('Zone BOM Mapping created successfully!');
    } catch (error) {
      console.error('Failed to create zone mapping:', error);
      alert('Failed to create zone mapping');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading production setup...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Car Types and Zone Mappings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Car Types Management */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Car Types ({carTypes.length})</h3>

          {/* Create New Car Type */}
          <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Car Type</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Car Code (e.g., TK1_Red_High)"
                value={newCarType.carCode}
                onChange={(e) => setNewCarType(prev => ({ ...prev, carCode: e.target.value }))}
                className="w-full px-2 py-1 text-sm border rounded"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newCarType.name}
                onChange={(e) => setNewCarType(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1 text-sm border rounded"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newCarType.description}
                onChange={(e) => setNewCarType(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-2 py-1 text-sm border rounded"
              />
              <button
                onClick={handleCreateCarType}
                disabled={!newCarType.carCode || !newCarType.name}
                className="w-full px-3 py-1 text-xs bg-green-600 text-white rounded disabled:bg-gray-400"
              >
                Add Car Type
              </button>
            </div>
          </div>

          {/* Car Types List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {carTypes.map((carType) => (
              <div key={carType.carCode} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{carType.carCode}</div>
                    <div className="text-xs text-gray-600">{carType.name}</div>
                    {carType.description && (
                      <div className="text-xs text-gray-500 mt-1">{carType.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCarType(carType.carCode)}
                    className="ml-2 text-red-600 hover:text-red-800 text-xs font-medium"
                    title="Delete car type"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {carTypes.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">No car types configured</p>
              </div>
            )}
          </div>
        </div>

        {/* Zone BOM Mappings */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Zone BOM Mappings ({zoneMappings.length})</h3>
          <p className="text-xs text-gray-600 mb-4">
            Define which BOMs are consumed when cars complete in specific zones.
          </p>

          {/* Create New Mapping */}
          <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Zone Mapping</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Zone ID (e.g., 1, 15, DF02)"
                value={newMapping.zoneId}
                onChange={(e) => setNewMapping(prev => ({ ...prev, zoneId: e.target.value }))}
                className="w-full px-2 py-1 text-sm border rounded"
              />
              <select
                value={newMapping.carCode}
                onChange={(e) => setNewMapping(prev => ({ ...prev, carCode: e.target.value }))}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                <option value="">Select Car Type</option>
                {carTypes.map(ct => (
                  <option key={ct.carCode} value={ct.carCode}>{ct.carCode}</option>
                ))}
              </select>
              <select
                value={newMapping.bomCode}
                onChange={(e) => setNewMapping(prev => ({ ...prev, bomCode: e.target.value }))}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                <option value="">Select BOM</option>
                {boms.map(bom => (
                  <option key={bom.bomCode} value={bom.bomCode}>{bom.bomCode}</option>
                ))}
              </select>
              <button
                onClick={handleCreateZoneMapping}
                disabled={!newMapping.zoneId || !newMapping.carCode || !newMapping.bomCode}
                className="w-full px-3 py-1 text-xs bg-green-600 text-white rounded disabled:bg-gray-400"
              >
                Add Mapping
              </button>
            </div>
          </div>

          {/* Mappings List */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {zoneMappings.map((mapping, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Zone {mapping.zoneId}</span> +
                    <span className="text-blue-600 mx-1">{mapping.carCode}</span> →
                    <span className="text-green-600 ml-1">{mapping.bomCode}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {mapping.consumeOnCompletion ? 'Auto-consume' : 'Manual'}
                  </div>
                </div>
              </div>
            ))}

            {zoneMappings.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">No zone mappings configured</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOMs List */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available BOMs ({boms.length})</h3>
        <p className="text-sm text-gray-600 mb-4">
          Bill of Materials define component requirements for production. Create BOMs in the Inventory tab.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {boms.map((bom) => (
            <div key={bom.bomCode} className="p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm">{bom.bomCode}</div>
                  <div className="text-xs text-gray-600">{bom.name}</div>
                  {bom.description && (
                    <div className="text-xs text-gray-500 mt-1">{bom.description}</div>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{bom.components.length} components</div>
                  <div>{bom.totalComponents} total units</div>
                </div>
              </div>

              {/* Component Details */}
              {bom.components.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Components:</div>
                  <div className="space-y-1">
                    {bom.components.map((component, idx) => (
                      <div key={idx} className="text-xs text-gray-600 flex items-center justify-between">
                        <span>
                          <span className="font-medium">{component.sku}</span>
                          {component.name && <span className="text-gray-500"> - {component.name}</span>}
                        </span>
                        <span className="text-gray-500">Qty: {component.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {boms.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm font-medium">No BOMs available</p>
              <p className="text-xs mt-1">Create BOMs in the Inventory tab first</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
