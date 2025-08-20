// English translations (default)
import { Translation } from '../contexts/LanguageContext';

const englishTranslations: Translation = {
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
    role: 'Production Role'
  },

  // Manager
  manager: {
    title: 'Manager Dashboard',
    description: 'Comprehensive view of warehouse operations',
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
    transactionStatus: 'Status',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noTransactions: 'No transactions found',
    confirmTransaction: 'Confirm Transaction',
    enterOTP: 'Enter 4-digit OTP',
    otpRequired: 'OTP is required',
    otpInvalid: 'Invalid OTP',
    transactionConfirmed: 'Transaction confirmed successfully',
    transactionRejected: 'Transaction rejected',
    waitingForConfirmation: 'Waiting for confirmation...',
    sendTransaction: 'Send Transaction'
  }
};

export default englishTranslations;