// Custom hook for managing overall manager state
import { useState, useEffect } from 'react';
import { ItemMaster, BOM } from '../../../types';
import { ManagerTab, ManagerCategory, ItemTab, getCategoryForTab, isInventoryTab } from '../../../types/manager';
import { itemMasterService } from '../../../services/itemMaster';
import { bomService } from '../../../services/bom';
import { csvExportService } from '../../../services/csvExport';
import { mockDataService } from '../../../services/mockData';

interface UseManagerStateReturn {
  // Navigation state
  activeTab: ManagerTab;
  activeCategory: ManagerCategory;
  activeItemTab: ItemTab;
  setActiveTab: (tab: ManagerTab) => void;
  handleTabChange: (tab: ManagerTab) => void;
  handleCategoryChange: (category: ManagerCategory) => void;
  setActiveItemTab: React.Dispatch<React.SetStateAction<ItemTab>>;
  
  // Loading states
  isLoading: boolean;
  itemsLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setItemsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Dialog states
  showComparison: boolean;
  showImportDialog: boolean;
  setShowComparison: React.Dispatch<React.SetStateAction<boolean>>;
  setShowImportDialog: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Item/BOM data
  items: ItemMaster[];
  boms: BOM[];
  setItems: React.Dispatch<React.SetStateAction<ItemMaster[]>>;
  setBOMs: React.Dispatch<React.SetStateAction<BOM[]>>;
  
  // Functions
  loadItemsAndBOMs: () => Promise<void>;
  handleExportItems: () => void;
  handleExportBOMs: () => void;
  handleExportAllItemData: () => void;
  handleGenerateItemMockData: () => Promise<void>;
}

export function useManagerState(): UseManagerStateReturn {
  // Navigation state
  const [activeTab, setActiveTab] = useState<ManagerTab>('overview');
  const [activeCategory, setActiveCategory] = useState<ManagerCategory>('inventory');
  const [activeItemTab, setActiveItemTab] = useState<ItemTab>('items');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  
  // Dialog states
  const [showComparison, setShowComparison] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Item Master and BOM state
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [boms, setBOMs] = useState<BOM[]>([]);

  // Tab management now handled by centralized type guards

  const handleTabChange = (tab: ManagerTab) => {
    setActiveTab(tab);
    // Auto-switch category based on tab using type-safe helper
    setActiveCategory(getCategoryForTab(tab));
  };

  const handleCategoryChange = (category: ManagerCategory) => {
    setActiveCategory(category);
    // Switch to first tab of the category using type-safe logic
    if (category === 'inventory' && !isInventoryTab(activeTab)) {
      setActiveTab('overview');
    } else if (category === 'hr' && activeTab !== 'hr') {
      setActiveTab('hr');
    }
  };

  // Load items and BOMs when Item Master tab is accessed
  useEffect(() => {
    if (activeTab === 'itemmaster') {
      loadItemsAndBOMs();
    }
  }, [activeTab]);

  const loadItemsAndBOMs = async () => {
    setItemsLoading(true);
    try {
      const [itemsData, bomsData] = await Promise.all([
        itemMasterService.getAllItems(),
        bomService.getAllBOMs()
      ]);
      setItems(itemsData);
      setBOMs(bomsData);
    } catch (error) {
      console.error('Failed to load items and BOMs:', error);
      alert('Failed to load items and BOMs. Please try again.');
    } finally {
      setItemsLoading(false);
    }
  };

  // Item Management export functions
  const handleExportItems = () => {
    csvExportService.exportItemMaster(items);
  };

  const handleExportBOMs = () => {
    csvExportService.exportBOMs(boms);
  };

  const handleExportAllItemData = () => {
    csvExportService.exportAllItemData(items, boms);
  };

  const handleGenerateItemMockData = async () => {
    if (!confirm('Generate mock data? This will add test items and BOMs.')) return;
    
    setItemsLoading(true);
    try {
      await mockDataService.generateItemAndBOMTestData();
      await loadItemsAndBOMs(); // Reload to show new data
      alert('Mock data generated successfully! 30 items and 8 BOMs added.');
    } catch (error) {
      console.error('Failed to generate mock data:', error);
      alert('Failed to generate mock data. Please try again.');
    } finally {
      setItemsLoading(false);
    }
  };

  return {
    // Navigation state
    activeTab,
    activeCategory,
    activeItemTab,
    setActiveTab,
    handleTabChange,
    handleCategoryChange,
    setActiveItemTab,
    
    // Loading states
    isLoading,
    itemsLoading,
    setIsLoading,
    setItemsLoading,
    
    // Dialog states
    showComparison,
    showImportDialog,
    setShowComparison,
    setShowImportDialog,
    
    // Item/BOM data
    items,
    boms,
    setItems,
    setBOMs,
    
    // Functions
    loadItemsAndBOMs,
    handleExportItems,
    handleExportBOMs,
    handleExportAllItemData,
    handleGenerateItemMockData
  };
}