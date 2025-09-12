// Lazy service loader to reduce initial bundle size
// Firebase services are loaded on-demand only when needed

export const loadInventoryService = async () => {
  const module = await import('./inventory');
  return module.inventoryService;
};

export const loadTransactionService = async () => {
  const module = await import('./transactions');
  return module.transactionService;
};

export const loadTableStateService = async () => {
  const module = await import('./tableState');
  return module.tableStateService;
};

export const loadItemMasterService = async () => {
  const module = await import('./itemMaster');
  return module.itemMasterService;
};

// Cache loaded services to avoid re-importing
let inventoryServiceCache: any = null;
let transactionServiceCache: any = null;
let tableStateServiceCache: any = null;
let itemMasterServiceCache: any = null;

export const getInventoryService = async () => {
  if (!inventoryServiceCache) {
    inventoryServiceCache = await loadInventoryService();
  }
  return inventoryServiceCache;
};

export const getTransactionService = async () => {
  if (!transactionServiceCache) {
    transactionServiceCache = await loadTransactionService();
  }
  return transactionServiceCache;
};

export const getTableStateService = async () => {
  if (!tableStateServiceCache) {
    tableStateServiceCache = await loadTableStateService();
  }
  return tableStateServiceCache;
};

export const getItemMasterService = async () => {
  if (!itemMasterServiceCache) {
    itemMasterServiceCache = await loadItemMasterService();
  }
  return itemMasterServiceCache;
};