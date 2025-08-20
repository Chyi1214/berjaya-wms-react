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
    tip: 'টিপস'
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
    logistics: 'লজিস্টিক্স',
    production: 'উৎপাদন',
    manager: 'ম্যানেজার',
    transaction: 'লেনদেন',
    logisticsDesc: 'ইনভেন্টরি গণনা এবং ব্যবস্থাপনা',
    productionDesc: 'জোন-ভিত্তিক উৎপাদন ব্যবস্থাপনা',
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
    sku: 'এসকেইউ',
    itemName: 'পণ্যের নাম',
    partName: 'যন্ত্রাংশের নাম',
    amount: 'পরিমাণ',
    location: 'অবস্থান',
    quantity: 'পরিমাণ',
    countInventory: 'ইনভেন্টরি পরীক্ষা',
    inventoryCount: 'ইনভেন্টরি গণনা',
    recentCounts: 'সাম্প্রতিক গণনা',
    noItems: 'এখনও কোনো পণ্য গণনা করা হয়নি',
    enterAmount: 'পরিমাণ প্রবেশ করান',
    selectSKU: 'এসকেইউ নির্বাচন করুন বা টাইপ করুন',
    searchSKU: 'এসকেইউ বা যন্ত্রাংশের নাম খুঁজুন...',
    countDetails: 'গণনার বিস্তারিত',
    countedBy: 'গণনাকারী',
    selectedItem: 'নির্বাচিত পণ্য',
    startCounting: 'ইনভেন্টরি গণনা শুরু করতে উপরের ফর্ম ব্যবহার করুন',
    pieces: 'টি'
  },

  // BOM (Bill of Materials) - উপকরণের তালিকা
  bom: {
    title: 'উপকরণের তালিকা',
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
    title: 'লজিস্টিক্স - ইনভেন্টরি গণনা',
    description: 'লজিস্টিক্স এলাকায় ইনভেন্টরি পণ্য গণনা এবং ট্র্যাক করুন',
    role: 'লজিস্টিক্স ভূমিকা'
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
    role: 'উৎপাদন ভূমিকা'
  },

  // Manager
  manager: {
    title: 'ম্যানেজার ড্যাশবোর্ড',
    description: 'রিয়েল-টাইম ইনভেন্টরি ওভারভিউ এবং অ্যানালিটিক্স',
    role: 'ম্যানেজার ভূমিকা',
    inventoryDashboard: 'উন্নত ইনভেন্টরি ড্যাশবোর্ড',
    activeSKUs: 'সক্রিয় এসকেইউ',
    logisticsTotal: 'লজিস্টিক্স মোট',
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
    showZoneDetails: 'জোনের বিস্তারিত দেখান'
  },

  // Statistics
  stats: {
    countRecords: '{count} গণনার রেকর্ড',
    zones: '{count} জোন',
    items: '{count} পণ্য'
  },

  // Messages
  messages: {
    countSaved: 'ইনভেন্টরি গণনা সফলভাবে সংরক্ষিত হয়েছে',
    countFailed: 'ইনভেন্টরি গণনা সংরক্ষণে ব্যর্থ',
    dataCleared: 'সমস্ত ইনভেন্টরি ডেটা পরিষ্কার করা হয়েছে',
    clearFailed: 'ইনভেন্টরি ডেটা পরিষ্কার করতে ব্যর্থ',
    productionTip: 'উৎপাদন পরিবেশে, এই গণনাগুলি আপনাআপনি Firebase এ সিঙ্ক হবে',
    pleaseSelectSKU: 'অনুগ্রহ করে একটি এসকেইউ নির্বাচন করুন',
    pleaseEnterValidAmount: 'অনুগ্রহ করে একটি বৈধ পরিমাণ প্রবেশ করান',
    selectedItemNotFound: 'নির্বাচিত পণ্য পাওয়া যায়নি'
  },

  // Transactions
  transactions: {
    title: 'লেনদেন ব্যবস্থাপনা',
    description: 'ইনভেন্টরি লেনদেন ট্র্যাক এবং পরিচালনা করুন',
    role: 'লেনদেন ব্যবস্থাপনা',
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
    filterTransactions: 'লেনদেন ফিল্টার করুন',
    noTransactions: 'কোনো লেনদেন পাওয়া যায়নি',
    createTransaction: 'লেনদেন তৈরি করুন',
    viewDetails: 'বিস্তারিত দেখুন',
    approve: 'অনুমোদন',
    cancel: 'বাতিল',
    pending: 'বিচারাধীন',
    completed: 'সম্পন্ন',
    cancelled: 'বাতিল',
    count: 'স্টক গণনা',
    transferIn: 'স্থানান্তর ইন',
    transferOut: 'স্থানান্তর আউট',
    adjustment: 'সমন্বয়',
    initialStock: 'প্রারম্ভিক স্টক'
  },

  // Footer
  footer: {
    copyright: '© 2025 বর্জয়া অটোটেক - গুদাম ব্যবস্থাপনা সিস্টেম',
    version: 'v{version} - {feature}'
  }
};

export default bengaliTranslations;