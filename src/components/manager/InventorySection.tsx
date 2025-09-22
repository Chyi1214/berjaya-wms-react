// Inventory Section Component - Handles all inventory-related tabs and content
import { InventoryCountEntry, Transaction, ItemMaster, BOM } from '../../types';
import { InventoryTab, ItemTab } from '../../types/manager';
import { 
  OverviewTab,
  CheckedItemTab,
  ExpectedItemTab,
  ComparedItemTab,
  TransactionLogTab,
  YesterdayResultTab
} from '../manager/inventory';
import { ItemBOMSection } from './ItemBOMSection';
import { ScannerSection } from './ScannerSection';
import { WasteInventoryTab } from './WasteInventoryTab';

interface InventorySectionProps {
  activeTab: InventoryTab;
  activeItemTab: ItemTab;
  tableData: {
    checked: InventoryCountEntry[];
    expected: InventoryCountEntry[];
    yesterday: InventoryCountEntry[];
  };
  transactions: Transaction[];
  items: ItemMaster[];
  boms: BOM[];
  showComparison: boolean;
  itemsLoading: boolean;
  setActiveItemTab: React.Dispatch<React.SetStateAction<ItemTab>>;
  loadItemsAndBOMs: () => Promise<void>;
  handleExportItems: () => void;
  handleExportBOMs: () => void;
  handleExportAllItemData: () => void;
  handleGenerateItemMockData: () => Promise<void>;
  handleGenerateInventoryMockData?: () => Promise<void>;
  setItemsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  // Add handlers for Overview subtab
  onConcludeToday?: () => void;
  onClearAllData?: () => void;
  onResetAllQuantities?: () => void;
}

export function InventorySection({
  activeTab,
  activeItemTab,
  tableData,
  transactions,
  items,
  boms,
  showComparison,
  itemsLoading,
  setActiveItemTab,
  loadItemsAndBOMs,
  handleExportItems,
  handleExportBOMs,
  handleExportAllItemData,
  handleGenerateItemMockData,
  handleGenerateInventoryMockData,
  setItemsLoading,
  onConcludeToday,
  onClearAllData,
  onResetAllQuantities
}: InventorySectionProps) {
  return (
    <div className="p-6">
      {activeTab === 'overview' && (
        <OverviewTab
          onGenerateMockData={handleGenerateInventoryMockData || handleGenerateItemMockData}
          onConcludeToday={onConcludeToday}
          onClearAllData={onClearAllData}
          onResetAllQuantities={onResetAllQuantities}
          isLoading={itemsLoading}
        />
      )}

      {activeTab === 'checked' && (
        <CheckedItemTab tableData={tableData.checked} />
      )}

      {activeTab === 'expected' && (
        <ExpectedItemTab tableData={tableData.expected} />
      )}

      {activeTab === 'compared' && (
        <ComparedItemTab 
          expectedData={tableData.expected} 
          checkedData={tableData.checked}
          onConcludeToday={onConcludeToday}
        />
      )}

      {activeTab === 'transaction' && (
        <TransactionLogTab transactions={transactions} />
      )}

      {activeTab === 'yesterday' && (
        <YesterdayResultTab 
          tableData={tableData.yesterday} 
          showComparison={showComparison} 
        />
      )}

      {activeTab === 'itemmaster' && (
        <ItemBOMSection
          activeItemTab={activeItemTab}
          items={items}
          boms={boms}
          itemsLoading={itemsLoading}
          setActiveItemTab={setActiveItemTab}
          loadItemsAndBOMs={loadItemsAndBOMs}
          handleExportItems={handleExportItems}
          handleExportBOMs={handleExportBOMs}
          handleExportAllItemData={handleExportAllItemData}
          handleGenerateItemMockData={handleGenerateItemMockData}
          setItemsLoading={setItemsLoading}
        />
      )}

      {activeTab === 'scanner' && (
        <ScannerSection />
      )}

      {activeTab === 'waste' && (
        <WasteInventoryTab />
      )}
    </div>
  );
}