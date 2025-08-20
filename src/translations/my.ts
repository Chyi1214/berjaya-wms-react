// Myanmar translations
import { Translation } from '../contexts/LanguageContext';

const myanmarTranslations: Translation = {
  // Common
  common: {
    loading: 'အချိန်ကန်လန်နေပါသည်...',
    back: 'နောက်သို့',
    submit: 'တင်သွင်းရန်',
    clear: 'ရှင်းလင်းရန်',
    search: 'ရှာဖွေရန်',
    cancel: 'ပယ်ဖျက်ရန်',
    confirm: 'အတည်ပြုရန်',
    save: 'သိမ်းဆည်းရန်',
    delete: 'ဖျက်ရန်',
    edit: 'တည်းဖြတ်ရန်',
    close: 'ပိတ်ရန်',
    yes: 'ဟုတ်',
    no: 'မဟုတ်',
    total: 'စုစုပေါင်း',
    logout: 'ထွက်ရန်',
    tip: 'အကြံပြုချက်'
  },

  // Authentication
  auth: {
    login: 'အကောင့်ဝင်ရန်',
    loginWith: 'Google ဖြင့် အကောင့်ဝင်ရန်',
    loggedInAs: 'အကောင့်ဝင်ထားသူ',
    loggingIn: 'အကောင့်ဝင်နေသည်...'
  },

  // Roles
  roles: {
    selectRole: 'သင်၏ အခန်းကဏ္ဍကို ရွေးချယ်ပါ',
    logistics: 'ထောက်ပံ့ရေး',
    production: 'ကုန်ထုတ်လုပ်မှု',
    manager: 'မန်နေဂျာ',
    transaction: 'အလွှပြေးမှု',
    logisticsDesc: 'ကုန်ပစ္စည်း ရေတွက်ခြင်းနှင့် စီမံခန့်ခွဲမှု',
    productionDesc: 'ဇုန်အခြေပြု ကုန်ထုတ်လုပ်မှု စီမံခန့်ခွဲမှု',
    managerDesc: 'ဒက်ရှ်ဘုတ်နှင့် အစီရင်ခံစာများ',
    transactionDesc: 'အလွှပြေးမှု စီမံခန့်ခွဲမှုနှင့် အောက်ခံသွားခြင်း'
  },

  // Navigation
  nav: {
    backToRoles: 'အခန်းကဏ္ဍ ရွေးချယ်မှုသို့ ပြန်သွားရန်',
    goBack: 'နောက်သို့ သွားရန်'
  },

  // Inventory
  inventory: {
    sku: 'SKU',
    itemName: 'ပစ္စည်းအမည်',
    partName: 'အစိတ်အပိုင်းအမည်',
    amount: 'အရေအတွက်',
    location: 'တည်နေရာ',
    quantity: 'ပမာဏ',
    countInventory: 'ကုန်ပစ္စည်း စစ်ဆေးရန်',
    inventoryCount: 'ကုန်ပစ္စည်း ရေတွက်ခြင်း',
    recentCounts: 'လတ်တလောရေတွက်မှုများ',
    noItems: 'မည်သည့်ပစ္စည်းကိုမှ မရေတွက်ရသေးပါ',
    enterAmount: 'အရေအတွက် ထည့်သွင်းပါ',
    selectSKU: 'SKU ရွေးချယ် သို့မဟုတ် ရိုက်ထည့်ပါ',
    searchSKU: 'SKU သို့မဟုတ် အစိတ်အပိုင်းအမည် ရှာဖွေပါ...',
    countDetails: 'ရေတွက်မှု အသေးစိတ်များ',
    countedBy: 'ရေတွက်သူ',
    selectedItem: 'ရွေးချယ်ထားသော ပစ္စည်း',
    startCounting: 'ကုန်ပစ္စည်း ရေတွက်ခြင်း စတင်ရန် အပေါ်မှ ဖောင်ကို အသုံးပြုပါ',
    pieces: 'လုံး'
  },

  // BOM (Bill of Materials) - ပစ္စည်းစာရင်း
  bom: {
    title: 'ပစ္စည်းစာရင်း',
    bomCode: 'BOM ကုတ်',
    bomName: 'BOM အမည်',
    bomSelected: 'ရွေးချယ်ထားသော BOM',
    bomQuantity: 'BOM အရေအတွက်',
    bomPreview: 'BOM အစမ်းကြည့်ခြင်း',
    bomExpansion: 'BOM ချဲ့ပြခြင်း',
    components: 'အစိတ်အပိုင်းများ',
    componentCount: '{count} အစိတ်အပိုင်း',
    willBeAdded: '{count} အစိတ်အပိုင်းများ ထည့်မည်',
    searchItems: 'ပစ္စည်းများ သို့မဟုတ် BOM များ ရှာရန်...',
    searchItemsBOMs: 'ပစ္စည်းများ (A001, B002) သို့မဟုတ် BOM (BOM001) ရှာရန်...',
    howManySets: 'မည်မျှ အစုံ?',
    setsOf: 'ဤသည် {name} ၏ {count} အစုံ ဖန်တီးမည်',
    addBOM: 'BOM ထည့်ရန် ({count} ပစ္စည်း)',
    expandedFrom: 'BOM မှ ချဲ့ပြခြင်း: {name}',
    viaBoM: 'BOM မှတဆင့်: {code}'
  },

  // Logistics
  logistics: {
    title: 'ထောက်ပံ့ရေး - ကုန်ပစ္စည်း ရေတွက်ခြင်း',
    description: 'ထောက်ပံ့ရေး နယ်ပယ်ရှိ ကုန်ပစ္စည်းများကို ရေတွက်ခြင်းနှင့် ခြေရာခံခြင်း',
    role: 'ထောက်ပံ့ရေး အခန်းကဏ္ဍ'
  },

  // Production
  production: {
    title: 'ကုန်ထုတ်လုပ်မှု - ဇုန်ရွေးချယ်ရန်',
    selectZone: 'ကုန်ထုတ်လုပ်မှု ဇုန်ရွေးချယ်မှု',
    selectZoneDesc: 'ကုန်ပစ္စည်း ရေတွက်ခြင်းစတင်ရန် ကုန်ထုတ်လုပ်မှု ဇုန်ကို ရွေးချယ်ပါ',
    zoneTitle: 'ကုန်ထုတ်လုပ်မှု ဇုန် {zone} - ကုန်ပစ္စည်း ရေတွက်ခြင်း',
    zoneDesc: 'ကုန်ထုတ်လုပ်မှု ဇုန် {zone} ရှိ ကုန်ပစ္စည်းများကို ရေတွက်ခြင်းနှင့် ခြေရာခံခြင်း',
    backToZones: 'ဇုန်ရွေးချယ်မှုသို့ ပြန်သွားရန်',
    zone: 'ဇုန်',
    role: 'ကုန်ထုတ်လုပ်မှု အခန်းကဏ္ဍ'
  },

  // Manager
  manager: {
    title: 'မန်နေဂျာ ဒက်ရှ်ဘုတ်',
    description: 'အချိန်နှင့်တပြေးညီ ကုန်ပစ္စည်း ခြုံငုံသုံးသပ်ချက်နှင့် ခွဲခြမ်းစိတ်ဖြာမှု',
    role: 'မန်နေဂျာ အခန်းကဏ္ဍ',
    inventoryDashboard: 'မြှင့်တင်ထားသော ကုန်ပစ္စည်း ဒက်ရှ်ဘုတ်',
    activeSKUs: 'အသုံးပြုနေသော SKU များ',
    logisticsTotal: 'ထောက်ပံ့ရေး စုစုပေါင်း',
    productionTotal: 'ကုန်ထုတ်လုပ်မှု စုစုပေါင်း',
    activeZones: 'အသုံးပြုနေသော ဇုန်များ',
    lastUpdated: 'နောက်ဆုံး အပ်ဒိတ်',
    actions: 'လုပ်ဆောင်ချက်များ',
    showZones: 'ဇုန်များ ပြရန်',
    hideZones: 'ဇုန်များ ဖုံးအုပ်ရန်',
    zoneBreakdown: '{sku} အတွက် ကုန်ထုတ်လုပ်မှု ဇုန် အသေးစိတ်',
    clearAllData: 'ဒေတာအားလုံး ရှင်းလင်းရန်',
    clearConfirm: 'ကုန်ပစ္စည်း ရေတွက်မှုအားလုံးကို ရှင်းလင်းမလား? ဒါကို ပြန်လည်ပြုပြင်လို့ မရပါ။',
    noData: 'ကုန်ပစ္စည်း ဒေတာ မရှိပါ',
    noResults: '"{searchTerm}" နှင့် ကိုက်ညီသော ပစ္စည်းများ မတွေ့ပါ',
    zoneDetails: 'ဇုန် အသေးစိတ်များ',
    hideZoneDetails: 'ဇုန် အသေးစိတ်များ ဖုံးအုပ်ရန်',
    showZoneDetails: 'ဇုန် အသေးစိတ်များ ပြရန်'
  },

  // Statistics
  stats: {
    countRecords: '{count} ရေတွက်မှု မှတ်တမ်းများ',
    zones: '{count} ဇုန်',
    items: '{count} ပစ္စည်း'
  },

  // Messages
  messages: {
    countSaved: 'ကုန်ပစ္စည်း ရေတွက်မှု အောင်မြင်စွာ သိမ်းဆည်းပြီး',
    countFailed: 'ကုန်ပစ္စည်း ရေတွက်မှု သိမ်းဆည်းခြင်း မအောင်မြင်',
    dataCleared: 'ကုန်ပစ္စည်း ဒေတာအားလုံး ရှင်းလင်းပြီး',
    clearFailed: 'ကုန်ပစ္စည်း ဒေတာ ရှင်းလင်းခြင်း မအောင်မြင်',
    productionTip: 'ကုန်ထုတ်လုပ်မှုတွင်၊ ဤရေတွက်မှုများကို Firebase သို့ အလိုအလျောက် ပြင်ဆင်သွားပါမည်',
    pleaseSelectSKU: 'ကျေးဇူးပြု၍ SKU ရွေးချယ်ပါ',
    pleaseEnterValidAmount: 'ကျေးဇူးပြု၍ မှန်ကန်သော အရေအတွက် ထည့်သွင်းပါ',
    selectedItemNotFound: 'ရွေးချယ်ထားသော ပစ္စည်း မတွေ့ပါ'
  },

  // Transactions
  transactions: {
    title: 'အလွှပြေးမှု စီမံခန့်ခွဲမှု',
    description: 'ကုန်ပစ္စည်း အလွှပြေးမှုကို ခြေရာခံခြင်းနှင့် စီမံခန့်ခွဲမှု',
    role: 'အလွှပြေးမှု စီမံခန့်ခွဲမှု',
    newTransaction: 'အလွှပြေးမှု အသစ်',
    transactionHistory: 'အလွှပြေးမှု ရှေးရာ',
    transactionType: 'အလွှပြေးမှု သားသား',
    fromLocation: 'တွဲနေရာ တည်နေရာ',
    toLocation: 'တုိင် တည်နေရာ',
    reference: 'ရှားအမှိ',
    notes: 'အကြံပြုချက်',
    performedBy: 'အစေအအုပ်ကို',
    approvedBy: 'အငေါ်းအပြင့်ရှေ',
    previousAmount: 'ရှားအရေတွက်',
    newAmount: 'အသစ် အရေတွက်',
    transactionDate: 'အလွှပြေးမှု ရက်စွဲ',
    filterTransactions: 'အလွှပြေးမှုများ ခြေရာပြားခြေရက်',
    noTransactions: 'အလွှပြေးမှုများ မတွေ့ပါ',
    createTransaction: 'အလွှပြေးမှု စားစုပါ',
    viewDetails: 'အသေးစိတ်များ ဆက်ပါ',
    approve: 'အငေါ်းအပြုပါ',
    cancel: 'ပယ်ဖျက်ရန်',
    pending: 'ပန့်အုပ်ပဲ့ရဲ့',
    completed: 'အောင်မြင်ပြေး',
    cancelled: 'ပယ်ဖျက်ဒါး',
    count: 'ကုန်ပစ္စည်း ရေတွက်ခြင်း',
    transferIn: 'တွဲချုပ်ပါ',
    transferOut: 'တွေ့ရာလုပ်ပါ',
    adjustment: 'လိုင်လမ်ပါ',
    initialStock: 'ဗဟုံ စတော်ကိုက်'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - သိုလှောင်ရုံ စီမံခန့်ခွဲမှု စနစ်',
    version: 'v{version} - {feature}'
  }
};

export default myanmarTranslations;