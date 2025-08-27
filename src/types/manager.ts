// Manager-specific types for better type safety across components
export type ManagerTab = 'overview' | 'checked' | 'expected' | 'compared' | 'transaction' | 'yesterday' | 'itemmaster' | 'scanner' | 'hr' | 'production_line' | 'production_stats' | 'qa' | 'operations';
export type ManagerCategory = 'inventory' | 'production' | 'qa' | 'hr' | 'operations';
export type InventoryTab = 'overview' | 'checked' | 'expected' | 'compared' | 'transaction' | 'yesterday' | 'itemmaster' | 'scanner';
export type ProductionTab = 'production_line' | 'production_stats';
export type QATab = 'qa';
export type OperationsTab = 'operations';
export type ItemTab = 'items' | 'boms';

// Type guards for better runtime safety
export function isInventoryTab(tab: ManagerTab): tab is InventoryTab {
  return ['overview', 'checked', 'expected', 'compared', 'transaction', 'yesterday', 'itemmaster', 'scanner'].includes(tab);
}

export function isHRTab(tab: ManagerTab): tab is 'hr' {
  return tab === 'hr';
}

export function isQATab(tab: ManagerTab): tab is QATab {
  return tab === 'qa';
}

export function isProductionTab(tab: ManagerTab): tab is ProductionTab {
  return ['production_line', 'production_stats'].includes(tab);
}

export function isOperationsTab(tab: ManagerTab): tab is OperationsTab {
  return tab === 'operations';
}

// Helper to get the correct category for a tab
export function getCategoryForTab(tab: ManagerTab): ManagerCategory {
  if (isInventoryTab(tab)) return 'inventory';
  if (isProductionTab(tab)) return 'production';
  if (isQATab(tab)) return 'qa';
  if (isHRTab(tab)) return 'hr';
  if (isOperationsTab(tab)) return 'operations';
  return 'inventory'; // fallback
}