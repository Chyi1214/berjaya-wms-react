import { useState } from 'react';
import { scanLookupService } from '../../services/scanLookupService';
import { ScanLookup } from '../../types';

interface EditScannerEntryModalProps {
  lookup: ScanLookup;
  onSave: () => void;
  onCancel: () => void;
  userEmail: string;
}

export function EditScannerEntryModal({ lookup, onSave, onCancel, userEmail }: EditScannerEntryModalProps) {
  const [formData, setFormData] = useState({
    sku: lookup.sku,
    targetZone: lookup.targetZone.toString(),
    itemName: lookup.itemName || '',
    expectedQuantity: lookup.expectedQuantity?.toString() || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.targetZone.trim()) {
      newErrors.targetZone = 'Zone is required';
    }

    if (formData.expectedQuantity && isNaN(Number(formData.expectedQuantity))) {
      newErrors.expectedQuantity = 'Expected quantity must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Create updated lookup object
      const updatedLookup = {
        sku: formData.sku.toUpperCase(),
        targetZone: formData.targetZone,
        itemName: formData.itemName.trim() || undefined,
        expectedQuantity: formData.expectedQuantity ? Number(formData.expectedQuantity) : undefined,
        updatedBy: userEmail
      };

      // If zone changed, we need to delete old entry and create new one
      if (formData.targetZone !== lookup.targetZone.toString()) {
        // Delete old entry
        await scanLookupService.deleteLookup(lookup.sku, lookup.targetZone.toString());
        // Create new entry
        await scanLookupService.saveLookup(updatedLookup);
      } else {
        // Just update existing entry
        await scanLookupService.saveLookup(updatedLookup);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save scanner entry:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Edit Scanner Entry</h3>
          <p className="text-sm text-gray-500 mt-1">
            Modify the details for this SKU-to-zone mapping
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* SKU (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU
            </label>
            <input
              type="text"
              value={formData.sku}
              readOnly
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">SKU cannot be changed</p>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zone *
            </label>
            <input
              type="text"
              value={formData.targetZone}
              onChange={(e) => handleChange('targetZone', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 ${
                errors.targetZone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } focus:outline-none focus:ring-2`}
              placeholder="e.g., 8, DF02, Z001"
            />
            {errors.targetZone && (
              <p className="text-sm text-red-600 mt-1">{errors.targetZone}</p>
            )}
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => handleChange('itemName', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional item description"
            />
          </div>

          {/* Expected Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Quantity
            </label>
            <input
              type="number"
              value={formData.expectedQuantity}
              onChange={(e) => handleChange('expectedQuantity', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 ${
                errors.expectedQuantity ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } focus:outline-none focus:ring-2`}
              placeholder="Optional expected quantity"
              min="0"
            />
            {errors.expectedQuantity && (
              <p className="text-sm text-red-600 mt-1">{errors.expectedQuantity}</p>
            )}
          </div>

          {/* Last Updated Info */}
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-sm text-gray-600">
              <div>Last updated: {lookup.updatedAt.toLocaleString()}</div>
              <div>Updated by: {lookup.updatedBy || 'Unknown'}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}