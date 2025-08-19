// Item BOM Section Component - Manages Item Master and BOM tabs within inventory
import { Suspense, lazy } from 'react';
import { ItemMaster, BOM } from '../../types';
import { ItemTab } from '../../types/manager';

// Lazy load heavy components
const ItemMasterTab = lazy(() => import('../ItemMasterTab').then(module => ({ default: module.ItemMasterTab })));
const BOMTab = lazy(() => import('../BOMTab').then(module => ({ default: module.BOMTab })));

interface ItemBOMSectionProps {
  activeItemTab: ItemTab;
  items: ItemMaster[];
  boms: BOM[];
  itemsLoading: boolean;
  setActiveItemTab: React.Dispatch<React.SetStateAction<ItemTab>>;
  loadItemsAndBOMs: () => Promise<void>;
  handleExportItems: () => void;
  handleExportBOMs: () => void;
  handleExportAllItemData: () => void;
  handleGenerateItemMockData: () => Promise<void>;
  setItemsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ItemBOMSection({
  activeItemTab,
  items,
  boms,
  itemsLoading,
  setActiveItemTab,
  loadItemsAndBOMs,
  handleExportItems,
  handleExportBOMs,
  handleExportAllItemData,
  handleGenerateItemMockData,
  setItemsLoading
}: ItemBOMSectionProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          📦 Item Master Management
        </h3>
        <span className="text-sm text-gray-500">
          Manage catalog items and Bill of Materials
        </span>
      </div>

      {/* Sub-tabs for Items and BOMs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Item Management Tabs">
            <button
              onClick={() => setActiveItemTab('items')}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                activeItemTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏷️ Items ({items.length})
            </button>
            <button
              onClick={() => setActiveItemTab('boms')}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                activeItemTab === 'boms'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 BOMs ({boms.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Item Management Content */}
      {activeItemTab === 'items' ? (
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-500">Loading Item Master...</p>
            </div>
          </div>
        }>
          <ItemMasterTab
            items={items}
            onDataChange={loadItemsAndBOMs}
            onExport={handleExportItems}
            onExportAll={handleExportAllItemData}
            onGenerateMockData={handleGenerateItemMockData}
            isLoading={itemsLoading}
            setIsLoading={setItemsLoading}
            hasAnyData={items.length > 0 || boms.length > 0}
          />
        </Suspense>
      ) : (
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-500">Loading BOM Management...</p>
            </div>
          </div>
        }>
          <BOMTab
            boms={boms}
            items={items}
            onDataChange={loadItemsAndBOMs}
            onExport={handleExportBOMs}
            onExportAll={handleExportAllItemData}
            onGenerateMockData={handleGenerateItemMockData}
            isLoading={itemsLoading}
            setIsLoading={setItemsLoading}
            hasAnyData={items.length > 0 || boms.length > 0}
          />
        </Suspense>
      )}
    </div>
  );
}