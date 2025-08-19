// Item Management Dialog - Main container with tabs and shared state
import { useState, useEffect } from 'react';
import { ItemMaster, BOM } from '../types';
import { itemMasterService } from '../services/itemMaster';
import { bomService } from '../services/bom';
import { csvExportService } from '../services/csvExport';
import { mockDataService } from '../services/mockData';
import { ItemMasterTab } from './ItemMasterTab';
import { BOMTab } from './BOMTab';

interface ItemManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ItemManagementDialog({ isOpen, onClose }: ItemManagementDialogProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'boms'>('items');
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Export functions
  const handleExportItems = () => {
    csvExportService.exportItemMaster(items);
  };

  const handleExportBOMs = () => {
    csvExportService.exportBOMs(boms);
  };

  const handleExportAll = () => {
    csvExportService.exportAllItemData(items, boms);
  };

  // Mock data generation
  const handleGenerateMockData = async () => {
    if (!confirm('Generate mock data? This will add test items and BOMs.')) return;
    
    setIsLoading(true);
    try {
      await mockDataService.generateItemAndBOMTestData();
      await loadData(); // Reload to show new data
      alert('Mock data generated successfully! 30 items and 8 BOMs added.');
    } catch (error) {
      console.error('Failed to generate mock data:', error);
      alert('Failed to generate mock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="text-2xl">⏳</div>
              <p className="text-gray-500">Loading...</p>
            </div>
          )}

          {/* Tab Content */}
          {!isLoading && (
            <>
              {activeTab === 'items' && (
                <ItemMasterTab
                  items={items}
                  onDataChange={loadData}
                  onExport={handleExportItems}
                  onExportAll={handleExportAll}
                  onGenerateMockData={handleGenerateMockData}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  hasAnyData={items.length > 0 || boms.length > 0}
                />
              )}
              
              {activeTab === 'boms' && (
                <BOMTab
                  boms={boms}
                  items={items}
                  onDataChange={loadData}
                  onExport={handleExportBOMs}
                  onExportAll={handleExportAll}
                  onGenerateMockData={handleGenerateMockData}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  hasAnyData={items.length > 0 || boms.length > 0}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}