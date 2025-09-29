// Language Context - Multi-language support for 5 languages
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

// Supported languages
export type Language = 'en' | 'ms' | 'zh' | 'my' | 'bn';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

// Language definitions
export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' }
];

// Language context interface
interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: LanguageInfo[];
}

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation type
export interface Translation {
  [key: string]: string | Translation;
}

// Default translations (English)
const defaultTranslations: Translation = {
  // Common
  common: {
    loading: 'Loading...',
    back: 'Back',
    submit: 'Submit',
    clear: 'Clear',
    search: 'Search',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    total: 'Total',
    logout: 'Logout',
    tip: 'Tip'
  },

  // Authentication
  auth: {
    login: 'Login',
    loginWith: 'Login with Google',
    loggedInAs: 'Logged in as',
    loggingIn: 'Logging in...'
  },

  // Roles
  roles: {
    selectRole: 'Select Your Role',
    logistics: 'Logistics',
    production: 'Production',
    manager: 'Manager',
    transaction: 'Transactions',
    logisticsDesc: 'Inventory counting and management',
    productionDesc: 'Zone-based production management',
    managerDesc: 'Dashboard and reporting',
    transactionDesc: 'Transaction management and audit trail'
  },

  // Navigation
  nav: {
    backToRoles: 'Back to Role Selection',
    goBack: 'Go back'
  },

  // Inventory
  inventory: {
    sku: 'SKU',
    itemName: 'Item Name',
    partName: 'Part Name',
    amount: 'Amount',
    location: 'Location',
    quantity: 'Quantity',
    countInventory: 'Count Inventory',
    inventoryCount: 'Inventory Count',
    recentCounts: 'Recent Counts',
    noItems: 'No items have been counted yet',
    enterAmount: 'Enter amount',
    selectSKU: 'Select SKU',
    searchSKU: 'Search SKU or part name...',
    countDetails: 'Count Details',
    countedBy: 'Counted by',
    selectedItem: 'Selected Item',
    startCounting: 'Use the form above to start counting inventory',
    pieces: 'pcs'
  },

  // BOM (Bill of Materials)
  bom: {
    title: 'Bill of Materials',
    bomCode: 'BOM Code',
    bomName: 'BOM Name', 
    bomSelected: 'BOM Selected',
    bomQuantity: 'BOM Quantity',
    bomPreview: 'BOM Preview',
    bomExpansion: 'BOM Expansion',
    components: 'components',
    componentCount: '{count} components',
    willBeAdded: '{count} components will be added',
    searchItems: 'Search items or BOMs...',
    searchItemsBOMs: 'Search items (A001, B002) or BOMs (BOM001)...',
    howManySets: 'How many sets?',
    setsOf: 'This will create {count} set(s) of {name}',
    addBOM: 'Add BOM ({count} items)',
    expandedFrom: 'Expanded from BOM: {name}',
    viaBoM: 'via BOM: {code}'
  },

  // Logistics
  logistics: {
    title: 'Logistics - Inventory Count',
    description: 'Count and track inventory items in the logistics area',
    role: 'Logistics Role'
  },

  // Production
  production: {
    title: 'Production - Select Zone',
    selectZone: 'Production Zone Selection',
    selectZoneDesc: 'Select a production zone to start inventory counting',
    zoneTitle: 'Production Zone {zone} - Inventory Count',
    zoneDesc: 'Count and track inventory items in production zone {zone}',
    backToZones: 'Back to Zone Selection',
    zone: 'Zone',
    role: 'Production Role',

    // Zone status
    zoneStatus: 'Zone {zone} Status',
    currentCar: 'Current Car',
    noCarCurrentlyInZone: 'No car currently in zone',
    readyForNextCar: 'Ready for next car',
    clickToScanNewCar: 'Click to scan new car',
    clickToMarkWorkComplete: 'Click to mark work complete',
    vin: 'VIN',
    type: 'Type',
    color: 'Color',
    timeInZone: 'Time in zone',
    enteredAt: 'Entered at',
    updated: 'Updated',
    loadingZoneStatus: 'Loading zone status...',
    tryAgain: 'Try Again',
    none: 'None',
    available: 'Available',
    worker: 'Worker',
    checkedIn: 'Checked In',

    // Action buttons
    tasks: 'Tasks',
    reportIssue: 'Report Issue',
    inventory: 'Inventory',
    receive: 'Receive',
    wasteAndLost: 'Waste & Lost',
    reportActive: 'Report Active'
  },

  // Manager
  manager: {
    title: 'Manager Dashboard',
    description: 'Real-time inventory overview and analytics',
    role: 'Manager Role',
    inventoryDashboard: 'Enhanced Inventory Dashboard',
    activeSKUs: 'Active SKUs',
    logisticsTotal: 'Logistics Total',
    productionTotal: 'Production Total',
    activeZones: 'Active Zones',
    lastUpdated: 'Last Updated',
    actions: 'Actions',
    showZones: 'Show Zones',
    hideZones: 'Hide Zones',
    zoneBreakdown: 'Production Zone Breakdown for {sku}',
    clearAllData: 'Clear All Data',
    clearConfirm: 'Clear all inventory counts? This cannot be undone.',
    noData: 'No Inventory Data',
    noResults: 'No items found matching "{searchTerm}"',
    zoneDetails: 'Zone Details',
    hideZoneDetails: 'Hide Zone Details',
    showZoneDetails: 'Show Zone Details'
  },

  // Statistics
  stats: {
    countRecords: '{count} Count Records',
    zones: '{count} zones',
    items: '{count} items'
  },

  // Messages
  messages: {
    countSaved: 'Inventory count saved successfully',
    countFailed: 'Failed to save inventory count',
    dataCleared: 'All inventory data cleared',
    clearFailed: 'Failed to clear inventory data',
    productionTip: 'In production, these counts would sync to Firebase automatically',
    pleaseSelectSKU: 'Please select a SKU',
    pleaseEnterValidAmount: 'Please enter a valid amount',
    selectedItemNotFound: 'Selected item not found'
  },

  // Transactions
  transactions: {
    title: 'Transaction Management',
    description: 'Track and manage inventory transactions',
    role: 'Transaction Management',
    newTransaction: 'New Transaction',
    transactionHistory: 'Transaction History',
    transactionType: 'Transaction Type',
    fromLocation: 'From Location',
    toLocation: 'To Location',
    reference: 'Reference',
    notes: 'Notes',
    performedBy: 'Performed By',
    approvedBy: 'Approved By',
    previousAmount: 'Previous Amount',
    newAmount: 'New Amount',
    transactionDate: 'Transaction Date',
    filterTransactions: 'Filter Transactions',
    noTransactions: 'No transactions found',
    createTransaction: 'Create Transaction',
    viewDetails: 'View Details',
    approve: 'Approve',
    cancel: 'Cancel',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    count: 'Stock Count',
    transferIn: 'Transfer In',
    transferOut: 'Transfer Out',
    adjustment: 'Adjustment',
    initialStock: 'Initial Stock'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - Warehouse Management System',
    version: 'v{version} - {feature}'
  }
};

// Language Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translation>(defaultTranslations);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('berjaya-wms-language') as Language;
    if (savedLanguage && LANGUAGES.find(lang => lang.code === savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Import translation file dynamically for ALL languages including English
        const translationModule = await import(`../translations/${currentLanguage}.ts`);
        setTranslations(translationModule.default);
      } catch (error) {
        console.warn(`Failed to load translations for ${currentLanguage}, falling back to default`);
        setTranslations(defaultTranslations);
      }
    };

    loadTranslations();
  }, [currentLanguage]);

  // Set language and save to localStorage (memoized)
  const setLanguage = useCallback((language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('berjaya-wms-language', language);
  }, []);

  // Translation function (memoized for performance)
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;

    // Navigate through nested object
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key itself if translation not found
      }
    }

    let result = String(value);

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        result = result.replace(`{${paramKey}}`, String(paramValue));
      });
    }

    return result;
  }, [translations]);

  const contextValue = useMemo<LanguageContextType>(() => ({
    currentLanguage,
    setLanguage,
    t,
    languages: LANGUAGES
  }), [currentLanguage, setLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;