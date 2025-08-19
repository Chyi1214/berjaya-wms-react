// BOM Tab - Manages Bill of Materials view and operations
import { useState } from 'react';
import { BOM, ItemMaster } from '../types';
import { bomService } from '../services/bom';
import { BOMForm } from './BOMForm';

interface BOMTabProps {
  boms: BOM[];
  items: ItemMaster[];
  onDataChange: () => void;
  onExport: () => void;
  onExportAll: () => void;
  onGenerateMockData: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  hasAnyData: boolean;
}

export function BOMTab({
  boms,
  items,
  onDataChange,
  onExport,
  onExportAll,
  onGenerateMockData,
  isLoading,
  setIsLoading,
  hasAnyData
}: BOMTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);

  // Filter BOMs based on search
  const filteredBOMs = boms.filter(bom =>
    bom.bomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bom.description && bom.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // BOM CRUD operations
  const handleAddBOM = () => {
    setEditingBOM(null);
    setShowBOMForm(true);
  };

  const handleEditBOM = (bom: BOM) => {
    setEditingBOM(bom);
    setShowBOMForm(true);
  };

  const handleDeleteBOM = async (bomCode: string) => {
    if (!confirm(`Delete BOM "${bomCode}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await bomService.deleteBOM(bomCode);
      await onDataChange();
    } catch (error) {
      console.error('Failed to delete BOM:', error);
      alert('Failed to delete BOM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowBOMForm(false);
    setEditingBOM(null);
  };

  const handleFormSave = async () => {
    setShowBOMForm(false);
    setEditingBOM(null);
    await onDataChange();
  };

  return (
    <>
      {/* Action Bar */}
      <div className="flex flex-col space-y-4 mb-6">
        {/* Search and Quick Stats */}
        <div className="flex justify-between items-center">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search BOMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          {/* Quick Stats */}
          <div className="text-sm text-gray-500 mr-4">
            <span>
              {boms.length} BOMs total
              {boms.length > 0 && (
                <span className="ml-2">
                  • {boms.reduce((sum, bom) => sum + bom.totalComponents, 0)} total components
                </span>
              )}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Data Actions */}
          <div className="flex items-center space-x-2">
            {!hasAnyData && (
              <button
                onClick={onGenerateMockData}
                disabled={isLoading}
                className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                🎲 Generate Test Data
              </button>
            )}
            
            {filteredBOMs.length > 0 && (
              <button
                onClick={onExport}
                disabled={isLoading}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                📥 Export BOMs
              </button>
            )}
            
            {hasAnyData && (
              <button
                onClick={onExportAll}
                disabled={isLoading}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                📥 Export All
              </button>
            )}
          </div>
          
          {/* Spacer */}
          <div className="flex-1"></div>
          
          {/* Primary Action */}
          <button
            onClick={handleAddBOM}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-white font-medium bg-purple-500 hover:bg-purple-600 disabled:opacity-50"
          >
            ➕ Add BOM
          </button>
        </div>
      </div>

      {/* BOMs List */}
      {filteredBOMs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-6">📋</div>
          {boms.length === 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No BOMs defined yet</h3>
              <p className="text-gray-500 mb-6">Create your first Bill of Materials to group related items</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleAddBOM}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                >
                  ➕ Create First BOM
                </button>
                <button
                  onClick={onGenerateMockData}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                >
                  🎲 Load Sample BOMs
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No BOMs match your search</h3>
              <p className="text-gray-500">Try adjusting your search terms or browse all BOMs</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBOMs.map((bom) => (
            <div key={bom.bomCode} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{bom.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">Code: {bom.bomCode}</p>
                  {bom.description && (
                    <p className="text-sm text-gray-600 mt-1">{bom.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditBOM(bom)}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBOM(bom.bomCode)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {/* Components List */}
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Components ({bom.totalComponents} total):
                </p>
                <div className="space-y-1">
                  {bom.components.map((component, index) => (
                    <div key={index} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                      <span className="font-mono text-gray-600">{component.sku}</span>
                      <span className="text-gray-800">{component.name}</span>
                      <span className="text-gray-600">
                        {component.quantity} {component.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOM Form Modal */}
      {showBOMForm && (
        <BOMForm
          bom={editingBOM}
          items={items}
          onClose={handleFormClose}
          onSave={handleFormSave}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}
    </>
  );
}