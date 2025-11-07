// Bengali translations
import { Translation } from '../contexts/LanguageContext';

const bengaliTranslations: Translation = {
  // Common
  common: {
    loading: 'লোড হচ্ছে...',
    back: 'পিছনে',
    submit: 'জমা দিন',
    clear: 'পরিষ্কার করুন',
    search: 'খুঁজুন',
    cancel: 'বাতিল',
    confirm: 'নিশ্চিত করুন',
    save: 'সংরক্ষণ করুন',
    delete: 'মুছুন',
    edit: 'সম্পাদনা করুন',
    close: 'বন্ধ করুন',
    yes: 'হ্যাঁ',
    no: 'না',
    total: 'মোট',
    logout: 'লগ আউট',
    tip: 'টিপস',
    scanToAccess: 'ওয়েবসাইট অ্যাক্সেস করতে স্ক্যান করুন'
  },

  // Authentication
  auth: {
    login: 'লগ ইন',
    loginWith: 'Google দিয়ে লগ ইন করুন',
    loggedInAs: 'লগ ইন হিসেবে',
    loggingIn: 'লগ ইন হচ্ছে...'
  },

  // Roles
  roles: {
    selectRole: 'আপনার ভূমিকা নির্বাচন করুন',
    logistics: 'লজিস্টিকস',
    production: 'উৎপাদন',
    qa: 'মান নিয়ন্ত্রণ',
    manager: 'ম্যানেজার',
    transaction: 'লেনদেন',
    logisticsDesc: 'ইনভেন্টরি গণনা এবং ব্যবস্থাপনা',
    productionDesc: 'জোন-ভিত্তিক উৎপাদন ব্যবস্থাপনা',
    qaDesc: 'মান নিয়ন্ত্রণ এবং পরিদর্শন',
    managerDesc: 'ড্যাশবোর্ড এবং রিপোর্টিং',
    transactionDesc: 'লেনদেন ব্যবস্থাপনা এবং অডিট ট্রেইল'
  },

  // Navigation
  nav: {
    backToRoles: 'ভূমিকা নির্বাচনে ফিরে যান',
    goBack: 'ফিরে যান'
  },

  // Inventory
  inventory: {
    sku: 'SKU',
    itemName: 'পণ্যের নাম',
    partName: 'যন্ত্রাংশের নাম',
    amount: 'পরিমাণ',
    location: 'অবস্থান',
    quantity: 'পরিমাণ',
    countInventory: 'ইনভেন্টরি গণনা করুন',
    checkInventory: 'ইনভেন্টরি পরীক্ষা করুন',
    inventoryCount: 'ইনভেন্টরি গণনা',
    recentCounts: 'সাম্প্রতিক গণনা',
    noItems: 'এখনও কোনো পণ্য গণনা করা হয়নি',
    enterAmount: 'পরিমাণ প্রবেশ করান',
    selectSKU: 'SKU নির্বাচন করুন',
    searchSKU: 'SKU বা যন্ত্রাংশের নাম খুঁজুন...',
    countDetails: 'গণনার বিস্তারিত',
    countedBy: 'গণনাকারী',
    selectedItem: 'নির্বাচিত পণ্য',
    startCounting: 'ইনভেন্টরি গণনা শুরু করতে উপরের ফর্ম ব্যবহার করুন',
    pieces: 'টি',
    overview: 'সংক্ষিপ্ত বিবরণ',
    checkedItems: 'পরীক্ষিত পণ্য',
    expected: 'প্রত্যাশিত',
    itemsCountedToday: 'আজ গণনা করা পণ্য',
    calculatedExpected: 'গণনাকৃত প্রত্যাশিত',
    totalTransactions: 'মোট লেনদেন',
    previousPeriod: 'পূর্ববর্তী সময়কাল',
    itemsInCatalog: 'ক্যাটালগে পণ্য'
  },

  // BOM (Bill of Materials)
  bom: {
    title: 'উপকরণের তালিকা (BOM)',
    bomCode: 'BOM কোড',
    bomName: 'BOM নাম',
    bomSelected: 'নির্বাচিত BOM',
    bomQuantity: 'BOM পরিমাণ',
    bomPreview: 'BOM পূর্বরূপ',
    bomExpansion: 'BOM সম্প্রসারণ',
    components: 'উপাদানসমূহ',
    componentCount: '{count}টি উপাদান',
    willBeAdded: '{count}টি উপাদান যোগ করা হবে',
    searchItems: 'আইটেম বা BOM খুঁজুন...',
    searchItemsBOMs: 'আইটেম (A001, B002) বা BOM (BOM001) খুঁজুন...',
    howManySets: 'কয়টি সেট?',
    setsOf: 'এটি {name} এর {count}টি সেট তৈরি করবে',
    addBOM: 'BOM যোগ করুন ({count}টি আইটেম)',
    expandedFrom: 'BOM থেকে সম্প্রসারিত: {name}',
    viaBoM: 'BOM এর মাধ্যমে: {code}'
  },

  // Logistics
  logistics: {
    title: 'লজিস্টিকস - ইনভেন্টরি গণনা',
    description: 'লজিস্টিকস এলাকায় ইনভেন্টরি পণ্য গণনা এবং ট্র্যাক করুন',
    role: 'লজিস্টিকস ভূমিকা',
    checkDescription: 'ইনভেন্টরি গণনা এবং ব্যবস্থাপনা',
    inboundScanner: 'ইনবাউন্ড স্ক্যানার',
    scanDescription: 'লক্ষ্য অঞ্চল খুঁজে পেতে বারকোড স্ক্যান করুন',
    checkInventory: 'ইনভেন্টরি পরীক্ষা করুন',
    sendItems: 'আইটেম পাঠান',
    scanIn: 'স্ক্যান ইন',
    monitorInventory: 'ইনভেন্টরি মনিটর করুন',
    wasteLostDefect: 'অপচয়/হারানো/ত্রুটি'
  },

  // Scanner
  scanner: {
    inboundScanner: 'ইনবাউন্ড স্ক্যানার',
    cameraScanner: 'ক্যামেরা স্ক্যানার',
    startScanner: 'স্ক্যানার চালু করুন',
    stopScanner: 'স্ক্যানার বন্ধ করুন',
    scanning: 'স্ক্যান করা হচ্ছে...',
    cameraWillAppearHere: 'ক্যামেরা এখানে প্রদর্শিত হবে',
    cameraNotAvailable: 'এই ডিভাইসে ক্যামেরা উপলব্ধ নেই',
    cameraPermissionDenied: 'ক্যামেরা অনুমতি প্রত্যাখ্যান করা হয়েছে। অনুগ্রহ করে ক্যামেরা অ্যাক্সেস সক্ষম করুন এবং আবার চেষ্টা করুন।',
    cameraAccessRequired: 'ক্যামেরা অ্যাক্সেস প্রয়োজন। অনুগ্রহ করে আপনার ব্রাউজার সেটিংসে ক্যামেরা অনুমতি সক্ষম করুন।',
    failedToStartCamera: 'ক্যামেরা চালু করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।',
    scannerError: 'স্ক্যানার ত্রুটি',
    logisticsWorker: 'লজিস্টিকস কর্মী',
    manualEntry: 'ম্যানুয়াল এন্ট্রি',
    enterSKU: 'SKU প্রবেশ করান বা পরীক্ষার জন্য সম্পূর্ণ QR কোড পেস্ট করুন',
    enterSKUPlaceholder: 'SKU (A001) প্রবেশ করান বা পরীক্ষার জন্য QR কোড পেস্ট করুন',
    exampleQR: 'QR উদাহরণ: 10#F16-1301P05AA$11#2CR$17#2$18#25469-CX70P250401$19#3',
    processSKU: 'প্রক্রিয়া করুন (SKU বা QR কোড)',
    error: 'ত্রুটি',
    failedToProcessEntry: 'প্রবেশ করানো পাঠ্য প্রক্রিয়া করতে ব্যর্থ',
    noValidSKUFound: 'কোনো বৈধ SKU পাওয়া যায়নি। চেষ্টা করা হয়েছে: {attempts}',
    scanInInventory: 'স্ক্যান ইন ইনভেন্টরি',
    itemScannedSuccessfully: 'আইটেম সফলভাবে স্ক্যান হয়েছে',
    enterQuantity: 'পরিমাণ প্রবেশ করান:',
    enterQuantityPlaceholder: 'পরিমাণ প্রবেশ করান...',
    processing: 'প্রক্রিয়াজাতকরণ...',
    barcodeScanner: 'বারকোড স্ক্যানার',
    scanItemBarcode: 'ইনভেন্টরিতে যোগ করতে আইটেম বারকোড স্ক্যান করুন',
    manualItemEntry: 'ম্যানুয়াল আইটেম এন্ট্রি',
    searchItemsWhenScannerNotAvailable: 'স্ক্যানার উপলব্ধ না থাকলে আইটেম খুঁজুন এবং নির্বাচন করুন',
    processItem: 'আইটেম প্রক্রিয়া করুন',
    scanNextItem: 'পরবর্তী আইটেম স্ক্যান করুন',
    pleaseEnterValidQuantity: 'দয়া করে একটি বৈধ পরিমাণ প্রবেশ করান',
    skuNotFoundInItemMaster: 'SKU {sku} আইটেম মাস্টারে পাওয়া যায়নি। দয়া করে প্রথমে যোগ করুন।',
    addedToExpectedTable: '{quantity} x {name} প্রত্যাশিত টেবিলে যোগ করা হয়েছে (মোট: {total})',
    failedToSaveInventory: 'ইনভেন্টরি সংরক্ষণ করতে ব্যর্থ। দয়া করে আবার চেষ্টা করুন।',
    failedToProcessScannedItem: 'স্ক্যান করা আইটেম প্রক্রিয়া করতে ব্যর্থ',
    scanResult: 'স্ক্যানের ফলাফল',
    enterBarcodeManually: 'স্ক্যানার উপলব্ধ না থাকলে ম্যানুয়ালি বারকোড প্রবেশ করান',
    enterBarcodeOrQRPlaceholder: 'বারকোড বা QR কোডের বিষয়বস্তু প্রবেশ করান...',
    processEntry: 'এন্ট্রি প্রক্রিয়া করুন',
    smartSearch: 'স্মার্ট অনুসন্ধান',
    searchItemsNotAvailable: 'স্ক্যানিং উপলব্ধ না থাকলে আইটেম খুঁজুন',
    // New scanner translations
    actionRequired: 'পদক্ষেপ প্রয়োজন!',
    scanNotComplete: 'স্ক্যান সফল, কিন্তু সম্পূর্ণ নয়। অনুগ্রহ করে পরিমাণ প্রবেশ করান এবং নিচে "ব্যাচে যোগ করুন" ক্লিক করুন।',
    sku: 'SKU:',
    name: 'নাম:',
    category: 'বিভাগ:',
    zoneInformation: 'জোন তথ্য:',
    noZoneInfo: 'কোনো জোন তথ্য উপলব্ধ নেই',
    addToInventory: 'ইনভেন্টরিতে যোগ করুন',
    enterQuantityToAdd: 'যোগ করার জন্য পরিমাণ প্রবেশ করান:',
    targetBatch: 'লক্ষ্য ব্যাচ:',
    addToBatch: 'ব্যাচে যোগ করুন',
    adding: 'যোগ করা হচ্ছে...',
    newScan: 'নতুন স্ক্যান',
    startScanning: 'স্ক্যান শুরু করুন'
  },

  // Production
  production: {
    title: 'উৎপাদন - জোন নির্বাচন',
    selectZone: 'উৎপাদন জোন নির্বাচন',
    selectZoneDesc: 'ইনভেন্টরি গণনা শুরু করতে একটি উৎপাদন জোন নির্বাচন করুন',
    zoneTitle: 'উৎপাদন জোন {zone} - ইনভেন্টরি গণনা',
    zoneDesc: 'উৎপাদন জোন {zone} এ ইনভেন্টরি পণ্য গণনা এবং ট্র্যাক করুন',
    backToZones: 'জোন নির্বাচনে ফিরে যান',
    zone: 'জোন',
    role: 'উৎপাদন ভূমিকা',

    // Zone interface (new additions)
    noCarCurrentlyInZone: 'জোনে এখন কোনো গাড়ি নেই',
    readyForNextCar: 'পরবর্তী গাড়ির জন্য প্রস্তুত',
    clickToScanNewCar: 'নতুন গাড়ি স্ক্যান করতে ক্লিক করুন',
    clickToMarkWorkComplete: 'কাজ সম্পন্ন চিহ্নিত করতে ক্লিক করুন',
    loadingZoneStatus: 'জোন স্ট্যাটাস লোড হচ্ছে...',
    tryAgain: 'আবার চেষ্টা করুন',
    updated: 'আপডেট হয়েছে',

    // Action buttons
    tasks: 'কার্যসমূহ',
    reportIssue: 'সমস্যা রিপোর্ট করুন',
    inventory: 'ইনভেন্টরি',
    receive: 'গ্রহণ',
    wasteAndLost: 'অপচয় ও হারানো',
    reportActive: 'রিপোর্ট সক্রিয়'
  },

  // Manager
  manager: {
    title: 'ম্যানেজার ড্যাশবোর্ড',
    header: 'ম্যানেজার ড্যাশবোর্ড',
    description: 'গুদাম অপারেশনের ব্যাপক দৃশ্য',
    role: 'ম্যানেজার ভূমিকা',
    inventoryDashboard: 'উন্নত ইনভেন্টরি ড্যাশবোর্ড',
    fullDashboard: 'সম্পূর্ণ ড্যাশবোর্ড',
    activeSKUs: 'সক্রিয় SKU',
    logisticsTotal: 'লজিস্টিকস মোট',
    productionTotal: 'উৎপাদন মোট',
    activeZones: 'সক্রিয় জোন',
    lastUpdated: 'শেষ আপডেট',
    actions: 'কর্মসূচি',
    showZones: 'জোন দেখান',
    hideZones: 'জোন লুকান',
    zoneBreakdown: '{sku} এর জন্য উৎপাদন জোন বিভাজন',
    clearAllData: 'সমস্ত ডেটা পরিষ্কার করুন',
    clearConfirm: 'সমস্ত ইনভেন্টরি গণনা পরিষ্কার করবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।',
    noData: 'কোনো ইনভেন্টরি ডেটা নেই',
    noResults: '"{searchTerm}" এর সাথে মেলে এমন কোনো পণ্য পাওয়া যায়নি',
    zoneDetails: 'জোনের বিস্তারিত',
    hideZoneDetails: 'জোনের বিস্তারিত লুকান',
    showZoneDetails: 'জোনের বিস্তারিত দেখান',
    itemManagement: {
      title: 'আইটেম ম্যানেজমেন্ট',
      subtitle: 'আইটেম ম্যানেজমেন্ট কিভাবে কাজ করে',
      itemMasterListTitle: 'আইটেম মাস্টার তালিকা',
      itemMasterListDesc: 'SKU এবং নাম সহ সমস্ত আইটেমের কেন্দ্রীয় ক্যাটালগ',
      bomsTitle: 'BOMs',
      bomsDesc: 'পরিমাণ সহ একাধিক উপাদান ধারণকারী রেসিপি',
      workflowTitle: 'কর্মপ্রবাহ',
      workflowDesc: 'কর্মীরা ইনভেন্টরি গণনা করার সময় পৃথক আইটেম বা পুরো BOM নির্বাচন করতে পারেন'
    },
    subTabs: {
      overview: 'সংক্ষিপ্ত',
      checked: 'পরীক্ষিত',
      expected: 'প্রত্যাশিত',
      compared: 'তুলনা',
      transactions: 'লেনদেন',
      yesterday: 'গতকাল',
      itemMaster: 'আইটেম',
      scanner: 'স্ক্যানার',
      userManagement: 'ব্যবহারকারী',
      scannerOperations: 'স্ক্যানার ও অপারেশনস'
    },
    tabs: {
      inventory: 'ইনভেন্টরি',
      productionLine: 'উৎপাদন লাইন',
      qa: 'মান নিয়ন্ত্রণ',
      hr: 'এইচআর',
      operations: 'অপারেশনস'
    }
  },

  // Messages
  messages: {
    countSaved: 'ইনভেন্টরি গণনা সফলভাবে সংরক্ষিত হয়েছে',
    countFailed: 'ইনভেন্টরি গণনা সংরক্ষণে ব্যর্থ',
    dataCleared: 'সমস্ত ইনভেন্টরি ডেটা পরিষ্কার করা হয়েছে',
    clearFailed: 'ইনভেন্টরি ডেটা পরিষ্কার করতে ব্যর্থ',
    productionTip: 'উৎপাদন পরিবেশে, এই গণনাগুলি আপনাআপনি Firebase এ সিঙ্ক হবে',
    pleaseSelectSKU: 'অনুগ্রহ করে একটি SKU নির্বাচন করুন',
    pleaseEnterValidAmount: 'অনুগ্রহ করে একটি বৈধ পরিমাণ প্রবেশ করান',
    selectedItemNotFound: 'নির্বাচিত পণ্য পাওয়া যায়নি'
  },

  // Transactions
  transactions: {
    title: 'লেনদেন ব্যবস্থাপনা',
    description: 'ইনভেন্টরি লেনদেন ট্র্যাক এবং পরিচালনা করুন',
    role: 'লেনদেন ব্যবস্থাপনা',
    logisticsDescription: 'লেনদেন ব্যবস্থাপনা এবং অডিট ট্রেইল',
    sendItemsToProduction: 'উৎপাদনের জন্য আইটেম পাঠান',
    sendInventoryToProduction: 'OTP নিশ্চিতকরণের মাধ্যমে উৎপাদন জোনে ইনভেন্টরি পাঠান',
    itemSKU: 'আইটেম (SKU)',
    amount: 'পরিমাণ',
    maxAmount: '(সর্বোচ্চ: {max})',
    sendToProductionZone: 'উৎপাদন জোনে পাঠান',
    selectDestinationZone: 'গন্তব্য জোন নির্বাচন করুন...',
    notesOptional: 'নোট (ঐচ্ছিক)',
    addNotesAboutTransfer: 'এই স্থানান্তর সম্পর্কে কোনো নোট যোগ করুন...',
    referenceOptional: 'রেফারেন্স (ঐচ্ছিক)',
    workOrderBatchNumber: 'ওয়ার্ক অর্ডার, ব্যাচ নম্বর, ইত্যাদি',
    transactionSummary: 'লেনদেনের সারসংক্ষেপ',
    item: 'আইটেম',
    available: 'উপলব্ধ',
    remainingAfterSend: 'পাঠানোর পরে অবশিষ্ট',
    units: 'একক',
    inStock: 'স্টকে আছে',
    outOfStock: 'স্টক নেই',
    noItemsAvailable: 'ইনভেন্টরিতে কোনো আইটেম উপলব্ধ নেই। প্রথমে ইনভেন্টরি গণনা যোগ করুন।',
    cannotSendMoreThan: '{max} এককের বেশি পাঠানো যাবে না (উপলব্ধ পরিমাণ)',
    youCanSendUpTo: 'আপনি {sku}-এর {max} একক পর্যন্ত পাঠাতে পারেন',
    sendAndGenerateOTP: 'পাঠান এবং OTP তৈরি করুন',
    pleaseFillAllFields: 'অনুগ্রহ করে সমস্ত প্রয়োজনীয় ক্ষেত্র পূরণ করুন',
    failedToCreateTransaction: 'লেনদেন তৈরি করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।',
    newTransaction: 'নতুন লেনদেন',
    transactionHistory: 'লেনদেন ইতিহাস',
    transactionType: 'লেনদেনের ধরন',
    fromLocation: 'উৎস অবস্থান',
    toLocation: 'গন্তব্য অবস্থান',
    reference: 'সন্দর্ভ',
    notes: 'মন্তব্য',
    performedBy: 'সম্পাদনকারী',
    approvedBy: 'অনুমোদনকারী',
    previousAmount: 'আগের পরিমাণ',
    newAmount: 'নতুন পরিমাণ',
    transactionDate: 'লেনদেনের তারিখ',
    transactionStatus: 'স্থিতি',
    pending: 'বিচারাধীন',
    completed: 'সম্পন্ন',
    cancelled: 'বাতিল',
    noTransactions: 'কোনো লেনদেন পাওয়া যায়নি',
    confirmTransaction: 'লেনদেন নিশ্চিত করুন',
    enterOTP: '4-সংখ্যার OTP লিখুন',
    otpRequired: 'OTP আবশ্যক',
    otpInvalid: 'অবৈধ OTP',
    transactionConfirmed: 'লেনদেন সফলভাবে নিশ্চিত হয়েছে',
    transactionRejected: 'লেনদেন প্রত্যাখ্যান করা হয়েছে',
    waitingForConfirmation: 'নিশ্চিতকরণের জন্য অপেক্ষা করা হচ্ছে...',
    sendTransaction: 'লেনদেন পাঠান',
    confirmTransactions: 'লেনদেন নিশ্চিত করুন',
    confirmIncoming: 'OTP দিয়ে লজিস্টিক্স থেকে আগত পণ্য নিশ্চিত করুন',
    noPendingTransactions: 'কোনো বিচারাধীন লেনদেন নেই',
    noItemsBeingSent: 'এই মুহূর্তে জোন {zone} এ কোনো পণ্য পাঠানো হচ্ছে না।',
    whenLogisticsSends: 'যখন লজিস্টিক্স আপনার জোনে পণ্য পাঠাবে, তখন সেগুলি এখানে OTP সহ নিশ্চিতকরণের জন্য দেখা যাবে।',
    pleaseEnterOTP: 'অনুগ্রহ করে OTP লিখুন',
    pleaseProvideReason: 'অনুগ্রহ করে প্রত্যাখ্যানের কারণ দিন',
    failedToConfirm: 'লেনদেন নিশ্চিত করতে ব্যর্থ',
    failedToReject: 'লেনদেন প্রত্যাখ্যান করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।',

    // Transaction types (missing keys)
    count: 'গণনা',
    adjustment: 'সমন্বয়',
    transferIn: 'স্থানান্তর ইন',
    transferOut: 'স্থানান্তর আউট',
    initialStock: 'প্রাথমিক স্টক',

    // Additional actions
    filterTransactions: 'লেনদেন ফিল্টার করুন',
    createTransaction: 'লেনদেন তৈরি করুন',
    viewDetails: 'বিস্তারিত দেখুন',
    approve: 'অনুমোদন করুন',
    cancel: 'বাতিল করুন'
  },

  // Translation Chat System
  translationChat: {
    title: 'অনুবাদ চ্যাট',
    description: 'বহুভাষিক যোগাযোগ চ্যানেল',
    channels: 'অনুবাদ চ্যানেল',
    selectChannel: 'একটি চ্যানেল নির্বাচন করুন',
    channel: 'চ্যানেল',
    participants: 'অংশগ্রহণকারী',
    available: 'উপলব্ধ',
    occupied: 'দখলে ({count}/2 ব্যবহারকারী)',
    full: 'পূর্ণ (2/2 ব্যবহারকারী)',
    joinChannel: 'চ্যানেলে যোগ দিন',
    leaveChannel: 'চ্যানেল ছেড়ে দিন',
    noChannelsAvailable: 'কোনো চ্যানেল উপলব্ধ নেই',
    channelJoined: 'সফলভাবে {channel} এ যোগ দিয়েছেন',
    channelLeft: '{channel} ছেড়ে দিয়েছেন',
    failedToJoin: 'চ্যানেলে যোগ দিতে ব্যর্থ',
    failedToLeave: 'চ্যানেল ছেড়ে দিতে ব্যর্থ',

    // Chat interface
    chatRoom: 'চ্যাট রুম',
    typeMessage: 'আপনার বার্তা টাইপ করুন...',
    sendMessage: 'বার্তা পাঠান',
    connecting: 'সংযোগ করা হচ্ছে...',
    connected: 'সংযুক্ত',
    disconnected: 'সংযোগ বিচ্ছিন্ন',
    noMessages: 'এখনো কোনো বার্তা নেই। কথোপকথন শুরু করুন!',
    originalText: 'মূল',
    translatedText: 'অনূদিত',
    sendingMessage: 'পাঠানো হচ্ছে...',
    messageSent: 'বার্তা পাঠানো হয়েছে',
    failedToSend: 'বার্তা পাঠাতে ব্যর্থ',

    // Languages
    languages: {
      English: 'ইংরেজি',
      Malay: 'মালয়',
      Chinese: 'চীনা',
      Myanmar: 'মিয়ানমার',
      Bengali: 'বাংলা'
    },

    // Channel status
    waitingForUser: 'অন্য ব্যবহারকারীর যোগ দেওয়ার অপেক্ষায়...',
    userJoined: '{user} চ্যানেলে যোগ দিয়েছেন',
    userLeft: '{user} চ্যানেল ছেড়ে দিয়েছেন',
    channelDescription: 'সর্বোচ্চ ২ জন ব্যবহারকারী বিভিন্ন ভাষার মধ্যে স্বয়ংক্রিয় অনুবাদ সহ চ্যাট করতে পারেন'
  },

  // QA (Quality Assurance) Inspection
  qa: {
    title: 'গুণমান নিশ্চিতকরণ',
    carInspection: 'গাড়ি পরিদর্শন',
    selectPositionAndScan: 'আপনার অবস্থান নির্বাচন করুন, তারপর পরিদর্শন শুরু করতে VIN স্ক্যান করুন',
    scanVIN: 'VIN স্ক্যান করুন',
    enterVIN: 'VIN লিখুন',
    enterVINNumber: 'VIN নম্বর লিখুন...',
    enterVINOrUseScanner: 'VIN লিখুন বা স্ক্যানার ব্যবহার করুন',
    startInspection: 'পরিদর্শন শুরু করুন',
    start: 'শুরু করুন',
    completeInspection: 'পরিদর্শন সম্পূর্ণ করুন',
    completeSection: 'বিভাগ সম্পূর্ণ করুন',
    backToDashboard: 'ড্যাশবোর্ডে ফিরে যান',
    selectYourPosition: 'আপনার অবস্থান নির্বাচন করুন',
    scanVINNumber: 'VIN নম্বর স্ক্যান করুন',
    openCameraScanner: 'ক্যামেরা স্ক্যানার খুলুন',
    scanVINBarcode: 'VIN বারকোড স্ক্যান করুন',
    position: 'অবস্থান',
    step: 'ধাপ',
    instructions: 'নির্দেশাবলী',
    tip: 'পরামর্শ',
    tipText: 'উপরের ক্যামেরা স্ক্যানার বোতাম ব্যবহার করুন, অথবা ম্যানুয়ালি VIN টাইপ করুন',
    loading: 'লোড হচ্ছে...',
    points: 'পয়েন্ট',

    // Instructions list
    instructionsList: {
      step1: 'আপনার অবস্থান নির্বাচন করুন (আপনি যে এলাকা পরিদর্শন করবেন)',
      step2: 'ক্যামেরা স্ক্যানার ব্যবহার করে VIN স্ক্যান করুন বা ম্যানুয়ালি টাইপ করুন',
      step3: 'চেকলিস্ট দিয়ে যান এবং প্রতিটি আইটেম চিহ্নিত করুন',
      step4: 'আপনার বিভাগের সমস্ত আইটেম পরীক্ষা করা হলে সম্পূর্ণ করুন'
    },

    // Sections
    sections: {
      rightOutside: 'ডান বাহিরে',
      leftOutside: 'বাম বাহিরে',
      frontBack: 'সামনে এবং পিছনে',
      interiorRight: 'অভ্যন্তর ডান',
      interiorLeft: 'অভ্যন্তর বাম'
    },

    // Status
    status: {
      notStarted: 'শুরু হয়নি',
      inProgress: 'চলছে',
      completed: 'সম্পন্ন'
    },

    // Checklist view
    checklist: {
      title: 'চেকলিস্ট',
      progress: 'অগ্রগতি',
      itemsChecked: 'পরীক্ষিত আইটেম',
      defectType: 'ত্রুটির ধরন',
      notes: 'নোট',
      photos: 'ফটো',
      addPhoto: 'ফটো যোগ করুন',
      addNotes: 'নোট যোগ করুন',
      markAsComplete: 'সম্পূর্ণ হিসাবে চিহ্নিত করুন',
      markAsDefect: 'ত্রুটি হিসাবে চিহ্নিত করুন',
      saveAndNext: 'সংরক্ষণ করুন এবং পরবর্তী',
      previous: 'পূর্ববর্তী',
      next: 'পরবর্তী',
      itemDetails: 'আইটেম বিবরণ',
      noPhotos: 'কোন ফটো যোগ করা হয়নি',
      uploadPhoto: 'ফটো আপলোড করুন',
      takePhoto: 'ফটো তুলুন',
      removePhoto: 'ফটো সরান',
      enterNotes: 'নোট লিখুন...',
      selectDefectType: 'ত্রুটির ধরন নির্বাচন করুন...',

      // Additional defects feature
      markExtraIssues: 'অতিরিক্ত সমস্যা চিহ্নিত করুন',
      tapDefectLocation: 'আপনি যেখানে ত্রুটি দেখছেন সেখানে আলতো চাপুন',
      selectRelatedItem: 'এই ত্রুটিটি কোন আইটেমের সাথে সম্পর্কিত?',
      additionalDefectsAdded: '{count} টি অতিরিক্ত ত্রুটি যোগ করা হয়েছে'
    },

    // Defect types
    defects: {
      notInstalled: 'সঠিকভাবে ইনস্টল করা হয়নি',
      scratches: 'আঁচড়',
      paintDefect: 'রং ত্রুটি',
      dent: 'দাগ',
      gap: 'ফাঁক',
      ok: 'ঠিক আছে',
      missing: 'নেই',
      broken: 'ভাঙা',
      dirty: 'নোংরা',
      crack: 'ফাটল'
    },

    // Messages
    messages: {
      pleaseSelectSection: 'প্রথমে আপনার পরিদর্শন অবস্থান নির্বাচন করুন',
      inspectionCreated: 'পরিদর্শন তৈরি হয়েছে',
      inspectionUpdated: 'পরিদর্শন আপডেট হয়েছে',
      failedToSave: 'সংরক্ষণ করতে ব্যর্থ। আবার চেষ্টা করুন।',
      allItemsChecked: 'সমস্ত আইটেম পরীক্ষা করা হয়েছে',
      sectionComplete: 'বিভাগ সম্পূর্ণ',
      inspectionComplete: 'পরিদর্শন সম্পূর্ণ',
      confirmComplete: 'নিশ্চিত করুন যে সমস্ত আইটেম সঠিকভাবে পরীক্ষা করা হয়েছে?',
      confirmCompleteSection: 'এই বিভাগটি সম্পূর্ণ করার বিষয়ে নিশ্চিত?',
      invalidVIN: 'অবৈধ VIN',
      vinRequired: 'VIN নম্বর প্রয়োজন',
      photoRequired: 'ত্রুটি আইটেমের জন্য ফটো প্রয়োজন',
      notesRequired: 'ত্রুটি আইটেমের জন্য নোট প্রয়োজন'
    },

    // Inspection info
    inspectionInfo: {
      vin: 'VIN নম্বর',
      carType: 'গাড়ির ধরন',
      inspector: 'পরিদর্শক',
      inspectionDate: 'পরিদর্শনের তারিখ',
      section: 'বিভাগ',
      status: 'অবস্থা',
      totalDefects: 'মোট ত্রুটি',
      completedBy: 'সম্পন্নকারী',
      completedDate: 'সম্পন্নের তারিখ'
    }
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - গুদাম ব্যবস্থাপনা সিস্টেম',
    version: 'v{version} - {feature}'
  },

  // বর্জ্য/হারিয়ে/ত্রুটি রিপোর্ট
  wasteLostDefectReport: {
    title: 'আইটেম রিপোর্ট করুন',
    itemStatus: 'আইটেম স্ট্যাটাস',
    waste: 'বর্জ্য',
    lost: 'হারিয়ে',
    defect: 'ত্রুটি',
    unplanned_usage: 'অপরিকল্পিত ব্যবহার',
    searchForItem: 'আইটেম খুঁজুন',
    searchPlaceholder: 'আইটেম SKU বা নাম টাইপ করুন...',
    quantity: 'পরিমাণ',
    currentStock: 'বর্তমান স্টক',
    quantityExceedsStock: 'পরিমাণ উপলব্ধ স্টক অতিক্রম করেছে!',
    basicReason: 'মূল কারণ',
    reasonPlaceholder: 'সংক্ষিপ্ত বর্ণনা...',

    // ছবির প্রমাণ
    photoEvidence: 'ছবির প্রমাণ',
    photoEvidenceRequired: 'জমা দেওয়ার আগে প্রয়োজন',
    photoInstructions: 'একবার ছবি আপলোড করুন - এটি এই ব্যাচ জমার সমস্ত আইটেমের সাথে সংযুক্ত হবে।',
    labelPhoto: 'লেবেল ছবি',
    damagePhoto: 'ক্ষতির ছবি',
    takePhotoOrUpload: 'ছবি তুলুন বা ছবি আপলোড করুন',
    labelPhotoHelp: 'আইটেম লেবেল/পার্ট নম্বর',
    damagePhotoHelp: 'প্রকৃত ক্ষতি/ত্রুটি',
    imageCompressed: 'ছবি সংকুচিত এবং প্রস্তুত',
    compressingImage: 'ছবি সংকুচিত করা হচ্ছে...',

    // ব্যাচ নির্বাচন
    selectBatch: 'ব্যাচ নির্বাচন করুন',
    selectBatchPrompt: '-- একটি ব্যাচ নির্বাচন করুন --',
    batchDefault: 'ডিফল্ট',
    unitsAvailable: 'ইউনিট উপলব্ধ',
    validBatch: 'বৈধ - ব্যাচে আছে',
    units: 'ইউনিট',
    quantityExceedsBatch: 'পরিমাণ ব্যাচ বরাদ্দ অতিক্রম করেছে!',

    // ত্রুটির বিবরণ
    claimReportDetails: 'দাবি রিপোর্ট বিবরণ',
    totalLotQuantity: 'মোট লট পরিমাণ',
    totalReceived: 'মোট প্রাপ্ত',
    shift: 'শিফট',
    shiftPlaceholder: 'যেমন, সকাল, A-শিফট',
    reasonForRejection: 'প্রত্যাখ্যানের কারণ',
    rejectionReasons: {
      defect: 'ত্রুটি (স্ক্র্যাচ, ডেন্ট, ক্র্যাক, ইত্যাদি)',
      wrongDimension: 'ভুল মাত্রা / স্পেসিফিকেশনের বাইরে',
      missingComponent: 'কম্পোনেন্ট অনুপস্থিত',
      contamination: 'দূষণ (তেল, ময়লা, মরিচা, ইত্যাদি)'
    },
    others: 'অন্যান্য',
    specifyOtherReason: 'অন্য কারণ নির্দিষ্ট করুন...',
    detectedBy: 'সনাক্তকারী',
    detectedByPlaceholder: 'নাম / বিভাগ',
    actionTaken: 'গৃহীত পদক্ষেপ',
    selectAction: 'পদক্ষেপ নির্বাচন করুন...',
    actions: {
      rework: 'পুনরায় কাজ',
      scrap: 'বাতিল',
      returnToSupplier: 'সরবরাহকারীর কাছে ফেরত',
      holdForInspection: 'আরও পরিদর্শনের জন্য আটকে রাখুন'
    },

    // বাটন
    addWasteItem: 'বর্জ্য আইটেম যোগ করুন',
    addLostItem: 'হারিয়ে আইটেম যোগ করুন',
    addDefectItem: 'ত্রুটি আইটেম যোগ করুন',
    reportItems: '{count} আইটেম রিপোর্ট করুন',
    cancel: 'বাতিল',
    backTo: '{location} এ ফিরে যান',

    // আইটেম তালিকা
    itemsToReport: 'রিপোর্ট করার আইটেম',

    // যাচাইকরণ বার্তা
    pleaseAddItem: 'অনুগ্রহ করে কমপক্ষে একটি আইটেম যোগ করুন',
    missingFields: 'অনুগ্রহ করে নিম্নলিখিত প্রয়োজনীয় ক্ষেত্রগুলি পূরণ করুন:',
    itemSelection: 'আইটেম নির্বাচন',
    validQuantity: 'বৈধ পরিমাণ (০ এর চেয়ে বড় হতে হবে)',
    reason: 'কারণ',
    labelPhotoRequired: 'লেবেল ছবি (প্রয়োজনীয়)',
    damagePhotoRequired: 'ক্ষতির ছবি (প্রয়োজনীয়)',
    bothPhotosRequired: 'জমা দেওয়ার আগে লেবেল ছবি এবং ক্ষতির ছবি উভয়ই প্রয়োজন।',
    batchSelection: 'ব্যাচ নির্বাচন',
    atLeastOneRejectionReason: 'কমপক্ষে একটি প্রত্যাখ্যানের কারণ (চেকবক্স বা কাস্টম কারণ)',
    insufficientStock: '{sku} - {itemName} এর জন্য অপর্যাপ্ত স্টক। উপলব্ধ: {available} ইউনিট, রিপোর্ট করার চেষ্টা: {quantity} ইউনিট। অনুগ্রহ করে পরিমাণ সামঞ্জস্য করুন বা স্টক স্তর যাচাই করুন।',
    insufficientBatchStock: '{batch} এ অপর্যাপ্ত স্টক। উপলব্ধ: {available}, রিপোর্ট করার চেষ্টা: {quantity}',

    // সফলতার বার্তা
    successfullyReported: '{location} থেকে সফলভাবে রিপোর্ট করা হয়েছে:',
    wasteItems: '{count} বর্জ্য',
    lostItems: '{count} হারিয়ে',
    defectItems: '{count} ত্রুটি আইটেম',

    // ত্রুটি বার্তা
    failedToSubmit: 'জমা দিতে ব্যর্থ',
    failedToUploadImages: 'ছবি আপলোড করতে ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।',
    invalidImage: 'অবৈধ ছবি',
    fileMustBeImage: 'ফাইল অবশ্যই একটি ছবি হতে হবে',
    imageTooLarge: 'ছবি অবশ্যই ২০ MB এর চেয়ে ছোট হতে হবে'
  }
};

export default bengaliTranslations;