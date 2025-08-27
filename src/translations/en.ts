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
    qa: 'Quality Assurance',
    manager: 'Manager',
    transaction: 'Transactions',
    logisticsDesc: 'Inventory counting and management',
    productionDesc: 'Zone-based production management',
    qaDesc: 'Quality control and inspection',
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
    checkInventory: 'Check Inventory',
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
    pieces: 'pcs',
    overview: 'Overview',
    checkedItems: 'Checked Items',
    expected: 'Expected',
    itemsCountedToday: 'Items counted today',
    calculatedExpected: 'Calculated expected',
    totalTransactions: 'Total transactions',
    previousPeriod: 'Previous period',
    itemsInCatalog: 'Items in catalog'
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
    role: 'Logistics Role',
    checkDescription: 'Inventory counting and management',
    inboundScanner: 'Inbound Scanner',
    scanDescription: 'Scan barcodes to find target zones',
    checkInventory: 'Check Inventory',
    sendItems: 'Send Items',
    scanIn: 'Scan In'
  },

  // Scanner
  scanner: {
    inboundScanner: 'Inbound Scanner',
    cameraScanner: 'Camera Scanner',
    startScanner: 'Start Scanner',
    stopScanner: 'Stop Scanner',
    scanning: 'Scanning...', 
    cameraWillAppearHere: 'Camera will appear here',
    cameraNotAvailable: 'Camera not available on this device',
    cameraPermissionDenied: 'Camera permission denied. Please enable camera access and try again.',
    cameraAccessRequired: 'Camera access required. Please enable camera permissions in your browser settings.',
    failedToStartCamera: 'Failed to start camera. Please try again.',
    scannerError: 'Scanner error',
    logisticsWorker: 'Logistics Worker',
    manualEntry: 'Manual Entry',
    enterSKU: 'Enter SKU or paste full QR code for testing',
    enterSKUPlaceholder: 'Enter SKU (A001) or paste QR code for testing',
    exampleQR: 'Example QR: 10#F16-1301P05AA$11#2CR$17#2$18#25469-CX70P250401$19#3',
    processSKU: 'Process (SKU or QR Code)',
    error: 'Error',
    failedToProcessEntry: 'Failed to process entered text',
    noValidSKUFound: 'No valid SKU found. Tried: {attempts}'
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

  // Quality Assurance
  qa: {
    title: 'Quality Assurance',
    description: 'Inspect cars and ensure quality standards',
    role: 'Quality Assurance Role',
    carsForInspection: 'Cars for Inspection',
    notInspected: 'Not Inspected',
    inspectionInProgress: 'In Progress',
    inspectionPassed: 'Passed',
    inspectionFailed: 'Failed',
    inspectCar: 'Inspect Car',
    startInspection: 'Start Inspection',
    completeInspection: 'Complete Inspection',
    inspectionStatus: 'Inspection Status',
    checklist: 'Checklist',
    checksPassed: 'Checks Passed',
    checksFailed: 'Checks Failed',
    requiredChecks: 'Required Checks',
    optionalChecks: 'Optional Checks',
    passCheck: 'Pass',
    failCheck: 'Fail',
    skipCheck: 'Skip',
    addNotes: 'Add notes (optional)',
    noCarsAvailable: 'No cars available for inspection',
    inspectionComplete: 'Inspection Complete',
    noChecklistAvailable: 'No quality checklist available for this car type'
  },

  // Manager
  manager: {
    title: 'Manager Dashboard',
    header: 'Manager Dashboard',
    description: 'Comprehensive view of warehouse operations',
    role: 'Manager Role',
    inventoryDashboard: 'Enhanced Inventory Dashboard',
    fullDashboard: 'Full Dashboard',
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
    showZoneDetails: 'Show Zone Details',
    itemManagement: {
      title: 'Item Management',
      subtitle: 'How Item Management Works',
      itemMasterListTitle: 'Item Master List',
      itemMasterListDesc: 'Central catalog of all items with SKU and name',
      bomsTitle: 'BOMs',
      bomsDesc: 'Recipes that contain multiple components with quantities',
      workflowTitle: 'Workflow',
      workflowDesc: 'Workers can select individual items or entire BOMs when counting inventory'
    },
    subTabs: {
      overview: 'Overview',
      checked: 'Checked',
      expected: 'Expected',
      transactions: 'Trans',
      yesterday: 'Yester',
      itemMaster: 'Items',
      scanner: 'Scanner',
      userManagement: 'Users',
      scannerOperations: 'Scanner & Operations'
    },
    tabs: {
      inventory: 'Inventory',
      productionLine: 'Production Line', 
      qa: 'QA',
      hr: 'HR',
      operations: 'Operations'
    }
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
    logisticsDescription: 'Transaction management and audit trail',
    sendItemsToProduction: 'Send Items to Production',
    sendInventoryToProduction: 'Send inventory to production zones with OTP confirmation',
    itemSKU: 'Item (SKU)',
    amount: 'Amount',
    maxAmount: '(Max: {max})',
    sendToProductionZone: 'Send to Production Zone',
    selectDestinationZone: 'Select destination zone...', 
    notesOptional: 'Notes (Optional)',
    referenceOptional: 'Reference (Optional)',
    addNotesAboutTransfer: 'Add any notes about this transfer...',
    workOrderBatchNumber: 'Work order, batch number, etc.',
    transactionSummary: 'Transaction Summary',
    item: 'Item',
    available: 'Available',
    remainingAfterSend: 'Remaining after send',
    units: 'units',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    noItemsAvailable: 'No items available in inventory. Please add inventory counts first.',
    cannotSendMoreThan: 'Cannot send more than {max} units (available quantity)',
    youCanSendUpTo: 'You can send up to {max} units of {sku}',
    sendAndGenerateOTP: 'Send & Generate OTP',
    pleaseFillAllFields: 'Please fill in all required fields',
    failedToCreateTransaction: 'Failed to create transaction. Please try again.',
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
    sendTransaction: 'Send Transaction',
    confirmTransactions: 'Confirm Transactions',
    confirmIncoming: 'Confirm incoming items from logistics with OTP',
    noPendingTransactions: 'No Pending Transactions',
    noItemsBeingSent: 'No items are being sent to Zone {zone} right now.',
    whenLogisticsSends: 'When logistics sends items to your zone, they\'ll appear here with an OTP for confirmation.',
    pleaseEnterOTP: 'Please enter the OTP',
    pleaseProvideReason: 'Please provide a reason for rejection',
    failedToConfirm: 'Failed to confirm transaction',
    failedToReject: 'Failed to reject transaction. Please try again.'
  },
  footer: {
    copyright: '© 2025 Berjaya Autotech - Warehouse Management System',
    version: 'v{version} - {feature}'
  },

  // Version 4.0 - Production Line Management
  productionLine: {
    scanCar: 'Scan Car',
    scanCarDescription: 'Scan VIN to register car in zone',
    complete: 'Complete',
    completeDescription: 'Mark work complete',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    clockInDescription: 'Track work time',
    checkedIn: 'Checked In',
    checkedInDescription: 'Manage time',
    
    // Car scanning
    scanCarTitle: 'Scan Car VIN',
    scanCarVinDescription: 'Scan the car\'s VIN barcode or QR code to register it in Zone {zone}',
    enterVinManually: 'Enter VIN Manually',
    processVin: 'Process VIN',
    invalidVinFormat: 'Invalid VIN format. VINs must be 17 characters.',
    carSuccessfullyScanned: 'Car {vin} successfully scanned into Zone {zone}',
    carAlreadyInZone: 'Car {vin} is already in zone {zone}',
    
    // Car details form
    newCarDetails: 'New Car Details - VIN: {vin}',
    carType: 'Car Type',
    selectType: 'Select Type',
    color: 'Color',
    selectColor: 'Select Color',
    series: 'Series',
    selectSeries: 'Select Series',
    createCarAndScan: 'Create Car & Scan Into Zone',
    
    // Work completion
    completeCarWork: 'Complete Car Work',
    markWorkComplete: 'Mark your work as complete on the current car in Zone {zone}',
    currentCarInZone: 'Current Car in Zone {zone}',
    carInformation: 'Car Information',
    timeTracking: 'Time Tracking',
    timeInZone: 'Time in Zone',
    scannedBy: 'Scanned by',
    enteredAt: 'Entered at',
    completionNotes: 'Completion Notes (Optional)',
    completionNotesPlaceholder: 'Add any notes about the work completed, issues encountered, or quality checks performed...',
    completeWork: 'Complete Work',
    completing: 'Completing Work...',
    workCompleted: 'Work completed on car {vin} in Zone {zone}',
    noCarInZone: 'No Car in Zone {zone}',
    noCarInZoneDescription: 'There is no car currently being worked on in this zone. You need to scan a car into the zone first.',
    
    // Worker check-in/out
    workerCheckIn: 'Clock Into Zone {zone}',
    workerCheckInDescription: 'Track your work time and productivity by checking in to this zone',
    workerInformation: 'Worker Information',
    checkInToZone: 'Check In to Zone {zone}',
    currentlyCheckedIn: 'Currently Checked In',
    currentlyCheckedInDescription: 'You are currently working in Zone {zone}',
    currentSession: 'Current Session',
    timeWorking: 'Time working',
    currentCar: 'Current car',
    checkOutNotes: 'Check-Out Notes (Optional)',
    checkOutNotesPlaceholder: 'Add any notes about work completed, issues encountered, or handover information...',
    checkOut: 'Check Out',
    checkingOut: 'Checking Out...',
    checkingIn: 'Checking In...',
    continueWorking: 'Continue Working',
    
    // Zone status
    zoneStatus: 'Zone {zone} Status',
    zoneStatusDescription: 'Real-time zone information',
    workerStatus: 'Worker Status',
    todaysStatistics: 'Today\'s Statistics',
    carsProcessed: 'Cars processed',
    averageTimePerCar: 'Avg. time per car',
    refreshStatus: 'Refresh status',
    none: 'None',
    available: 'Available',
    
    // Manager dashboard
    productionLineOverview: 'Production Line Overview',
    productionStatistics: 'Production Statistics',
    realTimeMonitoring: 'Real-time production monitoring and analytics',
    carsToday: 'Cars Today',
    completed: 'Completed',
    inProgress: 'In Progress',
    averageTime: 'Avg Time',
    zoneStatusOverview: 'Zone Status Overview',
    recentCars: 'Recent Cars',
    workerPerformanceToday: 'Worker Performance Today',
    worker: 'Worker',
    hoursWorked: 'Hours Worked',
    carsWorkedOn: 'Cars Worked On',
    zonePerformance: 'Zone Performance',
    occupied: 'Occupied',
    carDetails: 'Car Details',
    zoneHistory: 'Zone History',
    
    // Test data
    productionTestData: 'Production Line Test Data',
    productionTestDescription: 'Creates test cars, work stations, and worker activities',
    generateProductionTest: 'Generate Production Test'
  }
};

export default englishTranslations;
