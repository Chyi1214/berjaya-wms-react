// Inventory Section Component - Handles all inventory-related tabs and content
import { InventoryCountEntry, Transaction, ItemMaster, BOM } from '../../types';
import { InventoryTab, ItemTab } from '../../types/manager';
import {
  CheckedItemTab,
  ExpectedItemTab,
  TransactionLogTab
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
  };
  transactions: Transaction[];
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

export function InventorySection({
  activeTab,
  activeItemTab,
  tableData,
  transactions,
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
}: InventorySectionProps) {
  return (
    <div className="p-6">
      {activeTab === 'checked' && (
        <CheckedItemTab tableData={tableData.checked} />
      )}

      {activeTab === 'expected' && (
        <ExpectedItemTab tableData={tableData.expected} />
      )}

      {activeTab === 'transaction' && (
        <TransactionLogTab transactions={transactions} />
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