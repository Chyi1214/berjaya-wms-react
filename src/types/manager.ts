// Manager-specific types for better type safety across components
export type ManagerTab = 'overview' | 'checked' | 'expected' | 'transaction' | 'yesterday' | 'itemmaster' | 'hr' | 'operations' | 'production_line' | 'production_stats';
export type ManagerCategory = 'inventory' | 'hr' | 'operations' | 'production';
export type InventoryTab = 'overview' | 'checked' | 'expected' | 'transaction' | 'yesterday' | 'itemmaster';
export type ProductionTab = 'production_line' | 'production_stats';
export type ItemTab = 'items' | 'boms';

// Type guards for better runtime safety
export function isInventoryTab(tab: ManagerTab): tab is InventoryTab {
  return ['overview', 'checked', 'expected', 'transaction', 'yesterday', 'itemmaster'].includes(tab);
}

export function isHRTab(tab: ManagerTab): tab is 'hr' {
  return tab === 'hr';
}

export function isOperationsTab(tab: ManagerTab): tab is 'operations' {
  return tab === 'operations';
}

export function isProductionTab(tab: ManagerTab): tab is ProductionTab {
  return ['production_line', 'production_stats'].includes(tab);
}

// Helper to get the correct category for a tab
export function getCategoryForTab(tab: ManagerTab): ManagerCategory {
  if (isInventoryTab(tab)) return 'inventory';
  if (isHRTab(tab)) return 'hr';
  if (isOperationsTab(tab)) return 'operations';
  if (isProductionTab(tab)) return 'production';
  return 'inventory'; // fallback
}