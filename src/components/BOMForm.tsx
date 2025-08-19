// BOM Form - Add/Edit BOM form component
import { useState, useEffect } from 'react';
import { BOM, BOMComponent, ItemMaster } from '../types';
import { bomService } from '../services/bom';

interface BOMFormProps {
  bom: BOM | null; // null for new BOM, BOM for editing
  items: ItemMaster[];
  onClose: () => void;
  onSave: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function BOMForm({ bom, items, onClose, onSave, isLoading, setIsLoading }: BOMFormProps) {
  const [bomForm, setBOMForm] = useState({
    bomCode: '',
    name: '',
    description: '',
    components: [] as BOMComponent[]
  });

  // Initialize form when BOM changes
  useEffect(() => {
    if (bom) {
      setBOMForm({
        bomCode: bom.bomCode,
        name: bom.name,
        description: bom.description || '',
        components: [...bom.components]
      });
    } else {
      setBOMForm({
        bomCode: '',
        name: '',
        description: '',
        components: []
      });
    }
  }, [bom]);

  const handleSave = async () => {
    if (!bomForm.bomCode.trim() || !bomForm.name.trim()) {
      alert('BOM Code and Name are required.');
      return;
    }

    if (bomForm.components.length === 0) {
      alert('At least one component is required.');
      return;
    }

    // Validate all components have required fields
    const invalidComponent = bomForm.components.find(c => !c.sku || !c.name || c.quantity <= 0);
    if (invalidComponent) {
      alert('All components must have SKU, name, and quantity > 0.');
      return;
    }

    setIsLoading(true);
    try {
      if (bom) {
        // Update existing BOM
        await bomService.updateBOM({
          bomCode: bomForm.bomCode,
          name: bomForm.name,
          description: bomForm.description || undefined,
          components: bomForm.components,
          totalComponents: bomForm.components.reduce((sum, c) => sum + c.quantity, 0),
          createdAt: bom.createdAt,
          updatedAt: new Date()
        });
        console.log('✅ BOM updated:', bomForm.bomCode);
      } else {
        // Add new BOM
        await bomService.addBOM({
          bomCode: bomForm.bomCode,
          name: bomForm.name,
          description: bomForm.description || undefined,
          components: bomForm.components
        });
        console.log('✅ BOM added:', bomForm.bomCode);
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save BOM:', error);
      alert(error instanceof Error ? error.message : 'Failed to save BOM');
    } finally {
      setIsLoading(false);
    }
  };

  // Component management
  const addBOMComponent = () => {
    const newComponent: BOMComponent = {
      sku: '',
      name: '',
      quantity: 1,
      unit: ''
    };
    setBOMForm(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
  };

  const updateBOMComponent = (index: number, component: BOMComponent) => {
    setBOMForm(prev => ({
      ...prev,
      components: prev.components.map((c, i) => i === index ? component : c)
    }));
  };

  const removeBOMComponent = (index: number) => {
    setBOMForm(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  // Auto-fill component name when SKU is selected
  const handleSKUChange = (index: number, sku: string) => {
    const selectedItem = items.find(item => item.sku === sku);
    const updatedComponent: BOMComponent = {
      ...bomForm.components[index],
      sku,
      name: selectedItem?.name || '',
      unit: selectedItem?.unit || ''
    };
    updateBOMComponent(index, updatedComponent);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {bom ? 'Edit BOM' : 'Add New BOM'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BOM Code *
              </label>
              <input
                type="text"
                value={bomForm.bomCode}
                onChange={(e) => setBOMForm(prev => ({ ...prev, bomCode: e.target.value }))}
                disabled={!!bom} // Can't change BOM code when editing
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                placeholder="e.g., BOM001"
              />
              {!!bom && (
                <p className="text-xs text-gray-500 mt-1">BOM Code cannot be changed when editing</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={bomForm.name}
                onChange={(e) => setBOMForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Basic Service Kit"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={bomForm.description}
              onChange={(e) => setBOMForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              placeholder="Optional description of this BOM"
              rows={2}
            />
          </div>
          
          {/* Components Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Components *
              </label>
              <button
                type="button"
                onClick={addBOMComponent}
                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm"
              >
                + Add Component
              </button>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {bomForm.components.map((component, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded">
                  {/* SKU Selection */}
                  <div className="col-span-3">
                    <select
                      value={component.sku}
                      onChange={(e) => handleSKUChange(index, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Select SKU...</option>
                      {items.map(item => (
                        <option key={item.sku} value={item.sku}>
                          {item.sku} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Name (auto-filled, can be edited) */}
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={component.name}
                      onChange={(e) => updateBOMComponent(index, { ...component, name: e.target.value })}
                      placeholder="Component name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={component.quantity}
                      onChange={(e) => updateBOMComponent(index, { ...component, quantity: Number(e.target.value) })}
                      min="1"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  {/* Unit */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={component.unit}
                      onChange={(e) => updateBOMComponent(index, { ...component, unit: e.target.value })}
                      placeholder="Unit"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  {/* Remove Button */}
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeBOMComponent(index)}
                      className="w-full p-1 text-red-600 hover:bg-red-100 rounded text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {bomForm.components.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No components added yet. Click "Add Component" to get started.
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}