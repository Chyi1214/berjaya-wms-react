import { memo, useState, useEffect } from 'react';
import { batchManagementService } from '../../services/batchManagement';
import { bomService } from '../../services/bom';
import { BatchConfigCard } from './BatchConfigCard';
import { CarType, BOM, ZoneBOMMapping } from '../../types/inventory';

interface BatchSetupPageProps {
  user: { email: string } | null;
}

export const BatchSetupPage = memo(function BatchSetupPage({ user }: BatchSetupPageProps) {
  const [carTypes, setCarTypes] = useState<CarType[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
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
      const [carTypesData, bomsData, mappingsData] = await Promise.all([
        batchManagementService.getAllCarTypes(),
        bomService.getAllBOMs(),
        batchManagementService.getZoneBOMMappings()
      ]);
      
      setCarTypes(carTypesData);
      setBoms(bomsData);
      setZoneMappings(mappingsData);
    } catch (error) {
      console.error('Failed to load setup data:', error);
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

  const handleCreateSampleSetup = async () => {
    if (!user?.email) return;
    
    try {
      setIsLoading(true);
      console.log('🔧 Creating consistent sample setup data...');
      
      // Create Car Types
      await batchManagementService.createCarType({
        carCode: 'TK1_Red_High',
        name: 'Truck Model 1 - Red High Spec',
        description: 'Premium red truck with high-end features'
      });
      
      // Create BOM for TK1_Red_High (must match batch 603 components)
      await bomService.addBOM({
        bomCode: 'BOM_TK1_RED_HIGH',
        name: 'TK1 Red High Components',
        description: 'All components needed for TK1_Red_High car',
        components: [
          { sku: 'A001', name: 'Engine Part A', quantity: 50 }, // Matches batch 603
          { sku: 'B001', name: 'Body Panel B', quantity: 25 },   // Matches batch 603
          { sku: 'C001', name: 'Control Module C', quantity: 10 } // Matches batch 603
        ]
      });
      
      // Create Zone BOM Mappings (link car type to BOM in specific zones)
      await batchManagementService.createZoneBOMMapping({
        zoneId: '1',
        carCode: 'TK1_Red_High',
        bomCode: 'BOM_TK1_RED_HIGH',
        consumeOnCompletion: true
      });
      
      await batchManagementService.createZoneBOMMapping({
        zoneId: '15',
        carCode: 'TK1_Red_High',
        bomCode: 'BOM_TK1_RED_HIGH',
        consumeOnCompletion: true
      });
      
      await loadAllData();
      console.log('✅ Sample setup data created successfully');
      alert('Sample setup created! Now health checks can calculate material requirements.');
    } catch (error) {
      console.error('Failed to create sample setup:', error);
      alert('Failed to create sample setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">⏳ Loading setup data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🔧 Batch Management Setup</h2>
        <p className="text-sm text-gray-600">
          Configure car types, BOMs, and zone mappings. This is required for batch health calculations.
        </p>
        
        <div className="mt-4">
          <button
            onClick={handleCreateSampleSetup}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            🚀 Create Sample Setup Data
          </button>
        </div>
      </div>

      {/* Batch Allocation Configuration */}
      <BatchConfigCard user={user} onRefresh={loadAllData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Car Types Management */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🚗 Car Types ({carTypes.length})</h3>
          
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
                ➕ Add Car Type
              </button>
            </div>
          </div>
          
          {/* Car Types List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {carTypes.map((carType) => (
              <div key={carType.carCode} className="p-3 border rounded-lg">
                <div className="font-medium text-sm">{carType.carCode}</div>
                <div className="text-xs text-gray-600">{carType.name}</div>
                {carType.description && (
                  <div className="text-xs text-gray-500 mt-1">{carType.description}</div>
                )}
              </div>
            ))}
            
            {carTypes.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                <div className="text-lg mb-1">🚗</div>
                <p className="text-sm">No car types configured</p>
              </div>
            )}
          </div>
        </div>

        {/* BOMs List */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Available BOMs ({boms.length})</h3>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {boms.map((bom) => (
              <div key={bom.bomCode} className="p-3 border rounded-lg">
                <div className="font-medium text-sm">{bom.bomCode}</div>
                <div className="text-xs text-gray-600">{bom.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {bom.components.length} components, {bom.totalComponents} total units
                </div>
              </div>
            ))}
            
            {boms.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                <div className="text-lg mb-1">📄</div>
                <p className="text-sm">No BOMs available</p>
                <p className="text-xs">Create BOMs in the Inventory tab first</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone BOM Mappings */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🏢 Zone BOM Mappings ({zoneMappings.length})</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define which BOMs are consumed when cars complete in specific zones.
        </p>
        
        {/* Create New Mapping */}
        <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Zone Mapping</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Zone ID (e.g., 1, 15, DF02)"
              value={newMapping.zoneId}
              onChange={(e) => setNewMapping(prev => ({ ...prev, zoneId: e.target.value }))}
              className="px-2 py-1 text-sm border rounded"
            />
            <select
              value={newMapping.carCode}
              onChange={(e) => setNewMapping(prev => ({ ...prev, carCode: e.target.value }))}
              className="px-2 py-1 text-sm border rounded"
            >
              <option value="">Select Car Type</option>
              {carTypes.map(ct => (
                <option key={ct.carCode} value={ct.carCode}>{ct.carCode}</option>
              ))}
            </select>
            <select
              value={newMapping.bomCode}
              onChange={(e) => setNewMapping(prev => ({ ...prev, bomCode: e.target.value }))}
              className="px-2 py-1 text-sm border rounded"
            >
              <option value="">Select BOM</option>
              {boms.map(bom => (
                <option key={bom.bomCode} value={bom.bomCode}>{bom.bomCode}</option>
              ))}
            </select>
            <button
              onClick={handleCreateZoneMapping}
              disabled={!newMapping.zoneId || !newMapping.carCode || !newMapping.bomCode}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded disabled:bg-gray-400"
            >
              ➕ Add Mapping
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
                  {mapping.consumeOnCompletion ? '✅ Auto-consume' : '⚪ Manual'}
                </div>
              </div>
            </div>
          ))}
          
          {zoneMappings.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              <div className="text-lg mb-1">🏢</div>
              <p className="text-sm">No zone mappings configured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});