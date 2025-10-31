import { useState } from 'react';
import { scanLookupService } from '../../services/scanLookupService';

interface AddScannerEntryFormProps {
  onAdd: () => void;
  userEmail: string;
  existingSKUs?: string[];
}

export function AddScannerEntryForm({ onAdd, userEmail, existingSKUs: _existingSKUs }: AddScannerEntryFormProps) {
  // Note: existingSKUs parameter reserved for future duplicate checking optimization
  const [formData, setFormData] = useState({
    sku: '',
    targetZone: '',
    itemName: '',
    expectedQuantity: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [expanded, setExpanded] = useState(false);

  // Validation
  const validateForm = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else {
      // Check for duplicate SKU+Zone combination (v7.19.0: default to TK1 for legacy forms)
      const existingLookups = await scanLookupService.getAllLookupsBySKU(formData.sku.toUpperCase(), 'TK1');
      const duplicateExists = existingLookups.some(lookup =>
        lookup.targetZone.toString() === formData.targetZone
      );

      if (duplicateExists) {
        newErrors.sku = `SKU ${formData.sku.toUpperCase()} already exists in zone ${formData.targetZone}`;
      }
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

  const handleAdd = async () => {
    if (!(await validateForm())) {
      return;
    }

    try {
      setLoading(true);

      const newLookup = {
        sku: formData.sku.toUpperCase(),
        carType: 'TK1', // v7.19.0: Default to TK1 for legacy forms
        targetZone: formData.targetZone,
        itemName: formData.itemName.trim() || undefined,
        expectedQuantity: formData.expectedQuantity ? Number(formData.expectedQuantity) : undefined,
        updatedBy: userEmail
      };

      await scanLookupService.saveLookup(newLookup);

      // Reset form
      setFormData({
        sku: '',
        targetZone: '',
        itemName: '',
        expectedQuantity: ''
      });
      setErrors({});
      setExpanded(false);

      onAdd();
    } catch (error) {
      console.error('Failed to add scanner entry:', error);
      alert('Failed to add entry. Please try again.');
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

  const handleCancel = () => {
    setFormData({
      sku: '',
      targetZone: '',
      itemName: '',
      expectedQuantity: ''
    });
    setErrors({});
    setExpanded(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Collapsed State - Quick Add Button */}
      {!expanded && (
        <div className="p-4">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <span className="text-xl">➕</span>
            <span>Add New Scanner Entry</span>
          </button>
          <p className="text-sm text-gray-500 mt-1">
            Quickly add new SKU-to-zone mappings
          </p>
        </div>
      )}

      {/* Expanded State - Full Form */}
      {expanded && (
        <>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Add New Scanner Entry</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create a new SKU-to-zone mapping for the barcode scanner
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                  className={`w-full border rounded-md px-3 py-2 ${
                    errors.sku ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2`}
                  placeholder="e.g., A001, B002"
                />
                {errors.sku && (
                  <p className="text-sm text-red-600 mt-1">{errors.sku}</p>
                )}
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
                  placeholder="Optional description"
                />
              </div>

              {/* Expected Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Qty
                </label>
                <input
                  type="number"
                  value={formData.expectedQuantity}
                  onChange={(e) => handleChange('expectedQuantity', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 ${
                    errors.expectedQuantity ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2`}
                  placeholder="Optional"
                  min="0"
                />
                {errors.expectedQuantity && (
                  <p className="text-sm text-red-600 mt-1">{errors.expectedQuantity}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {loading ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}