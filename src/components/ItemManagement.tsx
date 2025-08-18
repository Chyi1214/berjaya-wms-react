// Item Management Component - CRUD operations for Item Master List and BOMs
import { useState, useEffect } from 'react';
import { ItemMaster, BOM, BOMComponent } from '../types';
import { itemMasterService } from '../services/itemMaster';
import { bomService } from '../services/bom';

interface ItemManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ItemManagement({ isOpen, onClose }: ItemManagementProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'boms'>('items');
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Item form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    category: '',
    unit: ''
  });

  // BOM form state
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [bomForm, setBOMForm] = useState({
    bomCode: '',
    name: '',
    description: '',
    components: [] as BOMComponent[]
  });

  // Load data when component opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemsData, bomsData] = await Promise.all([
        itemMasterService.getAllItems(),
        bomService.getAllBOMs()
      ]);
      setItems(itemsData);
      setBOMs(bomsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items/BOMs based on search
  const filteredItems = items.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredBOMs = boms.filter(bom =>
    bom.bomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bom.description && bom.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Item CRUD operations
  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({ sku: '', name: '', category: '', unit: '' });
    setShowItemForm(true);
  };

  const handleEditItem = (item: ItemMaster) => {
    setEditingItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      category: item.category || '',
      unit: item.unit || ''
    });
    setShowItemForm(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.sku.trim() || !itemForm.name.trim()) {
      alert('SKU and Name are required.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        // Update existing item
        const updatedItem: ItemMaster = {
          ...editingItem,
          name: itemForm.name.trim(),
          category: itemForm.category.trim() || undefined,
          unit: itemForm.unit.trim() || undefined
        };
        await itemMasterService.updateItem(updatedItem);
      } else {
        // Add new item
        const newItem = {
          sku: itemForm.sku.trim(),
          name: itemForm.name.trim(),
          category: itemForm.category.trim() || undefined,
          unit: itemForm.unit.trim() || undefined
        };
        await itemMasterService.addItem(newItem);
      }
      
      setShowItemForm(false);
      await loadData(); // Reload data
      
    } catch (error) {
      console.error('Failed to save item:', error);
      alert(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (sku: string) => {
    if (!confirm(`Delete item "${sku}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await itemMasterService.deleteItem(sku);
      await loadData();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  // BOM CRUD operations
  const handleAddBOM = () => {
    setEditingBOM(null);
    setBOMForm({ bomCode: '', name: '', description: '', components: [] });
    setShowBOMForm(true);
  };

  const handleEditBOM = (bom: BOM) => {
    setEditingBOM(bom);
    setBOMForm({
      bomCode: bom.bomCode,
      name: bom.name,
      description: bom.description || '',
      components: [...bom.components]
    });
    setShowBOMForm(true);
  };

  const handleSaveBOM = async () => {
    if (!bomForm.bomCode.trim() || !bomForm.name.trim()) {
      alert('BOM Code and Name are required.');
      return;
    }

    if (bomForm.components.length === 0) {
      alert('BOM must have at least one component.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingBOM) {
        // Update existing BOM
        const updatedBOM: BOM = {
          ...editingBOM,
          name: bomForm.name.trim(),
          description: bomForm.description.trim() || undefined,
          components: bomForm.components
        };
        await bomService.updateBOM(updatedBOM);
      } else {
        // Add new BOM
        const newBOM = {
          bomCode: bomForm.bomCode.trim(),
          name: bomForm.name.trim(),
          description: bomForm.description.trim() || undefined,
          components: bomForm.components
        };
        await bomService.addBOM(newBOM);
      }
      
      setShowBOMForm(false);
      await loadData(); // Reload data
      
    } catch (error) {
      console.error('Failed to save BOM:', error);
      alert(error instanceof Error ? error.message : 'Failed to save BOM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBOM = async (bomCode: string) => {
    if (!confirm(`Delete BOM "${bomCode}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await bomService.deleteBOM(bomCode);
      await loadData();
    } catch (error) {
      console.error('Failed to delete BOM:', error);
      alert('Failed to delete BOM');
    } finally {
      setIsLoading(false);
    }
  };

  // Component management for BOM form
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📦 Item Management</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('items')}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏷️ Item Master List ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('boms')}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'boms'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 BOMs ({boms.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Search and Add Button */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder={`Search ${activeTab === 'items' ? 'items' : 'BOMs'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={activeTab === 'items' ? handleAddItem : handleAddBOM}
              disabled={isLoading}
              className={`ml-4 px-4 py-2 rounded text-white ${
                activeTab === 'items'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-purple-500 hover:bg-purple-600'
              } disabled:opacity-50`}
            >
              ➕ Add {activeTab === 'items' ? 'Item' : 'BOM'}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="text-2xl">⏳</div>
              <p className="text-gray-500">Loading...</p>
            </div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && !isLoading && (
            <div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📦</div>
                  <p>No items found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item) => (
                        <tr key={item.sku}>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{item.sku}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{item.category || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{item.unit || '-'}</td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.sku)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BOMs Tab */}
          {activeTab === 'boms' && !isLoading && (
            <div>
              {filteredBOMs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📋</div>
                  <p>No BOMs found</p>
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
                      
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Components ({bom.components.length}):
                        </p>
                        <div className="space-y-1">
                          {bom.components.slice(0, 3).map((component, index) => (
                            <div key={index} className="text-sm text-gray-600 flex justify-between">
                              <span>{component.sku} - {component.name}</span>
                              <span>{component.quantity} {component.unit || 'pcs'}</span>
                            </div>
                          ))}
                          {bom.components.length > 3 && (
                            <div className="text-sm text-gray-500">
                              ... and {bom.components.length - 3} more components
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Item Form Modal */}
        {showItemForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    disabled={!!editingItem}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="pcs, kg, liters, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowItemForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note: BOM form would be implemented here but is quite complex - will add in next iteration */}
        {showBOMForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingBOM ? 'Edit BOM' : 'Add New BOM'}
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
                      disabled={!!editingBOM}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    />
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
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Components
                    </label>
                    <button
                      type="button"
                      onClick={addBOMComponent}
                      className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded"
                    >
                      Add Component
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {bomForm.components.map((component, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center border p-2 rounded">
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="SKU"
                            value={component.sku}
                            onChange={(e) => updateBOMComponent(index, { ...component, sku: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Name"
                            value={component.name}
                            onChange={(e) => updateBOMComponent(index, { ...component, name: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={component.quantity}
                            onChange={(e) => updateBOMComponent(index, { ...component, quantity: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Unit"
                            value={component.unit || ''}
                            onChange={(e) => updateBOMComponent(index, { ...component, unit: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeBOMComponent(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowBOMForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBOM}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save BOM'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemManagement;