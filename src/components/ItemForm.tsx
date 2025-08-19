// Item Form - Add/Edit item form component
import { useState, useEffect } from 'react';
import { ItemMaster } from '../types';
import { itemMasterService } from '../services/itemMaster';

interface ItemFormProps {
  item: ItemMaster | null; // null for new item, ItemMaster for editing
  onClose: () => void;
  onSave: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ItemForm({ item, onClose, onSave, isLoading, setIsLoading }: ItemFormProps) {
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    category: '',
    unit: ''
  });

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setItemForm({
        sku: item.sku,
        name: item.name,
        category: item.category || '',
        unit: item.unit || ''
      });
    } else {
      setItemForm({
        sku: '',
        name: '',
        category: '',
        unit: ''
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!itemForm.sku.trim() || !itemForm.name.trim()) {
      alert('SKU and Name are required.');
      return;
    }

    setIsLoading(true);
    try {
      if (item) {
        // Update existing item
        await itemMasterService.updateItem({
          sku: itemForm.sku,
          name: itemForm.name,
          category: itemForm.category || undefined,
          unit: itemForm.unit || undefined,
          createdAt: item.createdAt,
          updatedAt: new Date()
        });
        console.log('✅ Item updated:', itemForm.sku);
      } else {
        // Add new item
        await itemMasterService.addItem({
          sku: itemForm.sku,
          name: itemForm.name,
          category: itemForm.category || undefined,
          unit: itemForm.unit || undefined
        });
        console.log('✅ Item added:', itemForm.sku);
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save item:', error);
      alert(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          {item ? 'Edit Item' : 'Add New Item'}
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
              disabled={!!item} // Can't change SKU when editing
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="e.g., F001"
            />
            {!!item && (
              <p className="text-xs text-gray-500 mt-1">SKU cannot be changed when editing</p>
            )}
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
              placeholder="e.g., Engine Oil Filter"
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
              placeholder="e.g., Filters"
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
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}