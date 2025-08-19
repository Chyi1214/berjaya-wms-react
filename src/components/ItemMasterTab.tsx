// Item Master Tab - Manages the item catalog view and operations
import { useState } from 'react';
import { ItemMaster } from '../types';
import { itemMasterService } from '../services/itemMaster';
import { ItemForm } from './ItemForm';

interface ItemMasterTabProps {
  items: ItemMaster[];
  onDataChange: () => void;
  onExport: () => void;
  onExportAll: () => void;
  onGenerateMockData: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  hasAnyData: boolean;
}

export function ItemMasterTab({
  items,
  onDataChange,
  onExport,
  onExportAll,
  onGenerateMockData,
  isLoading,
  setIsLoading,
  hasAnyData
}: ItemMasterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Item CRUD operations
  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: ItemMaster) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (sku: string) => {
    if (!confirm(`Delete item "${sku}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      await itemMasterService.deleteItem(sku);
      await onDataChange();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleFormSave = async () => {
    setShowItemForm(false);
    setEditingItem(null);
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
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Quick Stats */}
          <div className="text-sm text-gray-500 mr-4">
            <span>
              {items.length} items total
              {items.length > 0 && (
                <span className="ml-2">
                  • {new Set(items.map(i => i.category)).size} categories
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
            
            {filteredItems.length > 0 && (
              <button
                onClick={onExport}
                disabled={isLoading}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                📥 Export Items
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
            onClick={handleAddItem}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-white font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
          >
            ➕ Add Item
          </button>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-6">📦</div>
          {items.length === 0 ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in your catalog yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first item or importing existing data</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  ➕ Add First Item
                </button>
                <button
                  onClick={onGenerateMockData}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                >
                  🎲 Load Sample Data
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items match your search</h3>
              <p className="text-gray-500">Try adjusting your search terms or browse all items</p>
            </div>
          )}
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

      {/* Item Form Modal */}
      {showItemForm && (
        <ItemForm
          item={editingItem}
          onClose={handleFormClose}
          onSave={handleFormSave}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}
    </>
  );
}