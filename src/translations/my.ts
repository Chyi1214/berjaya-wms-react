// Myanmar translations
import { Translation } from '../contexts/LanguageContext';

const myanmarTranslations: Translation = {
  // Common
  common: {
    loading: 'လုပ်ဆောင်နေသည်...',
    back: 'နောက်သို့',
    submit: 'တင်သွင်းမည်',
    clear: 'ရှင်းလင်းမည်',
    search: 'ရှာဖွေမည်',
    cancel: 'ပယ်ဖျက်မည်',
    confirm: 'အတည်ပြုမည်',
    save: 'သိမ်းဆည်းမည်',
    delete: 'ဖျက်မည်',
    edit: 'ပြင်ဆင်မည်',
    close: 'ပိတ်မည်',
    yes: 'ဟုတ်ကဲ့',
    no: 'မဟုတ်ပါ',
    total: 'စုစုပေါင်း',
    logout: 'ထွက်မည်',
    tip: 'အကြံပြုချက်'
  },

  // Authentication
  auth: {
    login: 'ဝင်ရောက်မည်',
    loginWith: 'Google ဖြင့် ဝင်ရောက်မည်',
    loggedInAs: 'အဖြစ် ဝင်ရောက်ထားသည်',
    loggingIn: 'ဝင်ရောက်နေသည်...'
  },

  // Roles
  roles: {
    selectRole: 'သင်၏အခန်းကဏ္ဍကို ရွေးချယ်ပါ',
    logistics: 'ထောက်ပံ့ပို့ဆောင်ရေး',
    production: 'ထုတ်လုပ်ရေး',
    qa: 'အရည်အသွေး ထိန်းချုပ်ရေး',
    manager: 'မန်နေဂျာ',
    transaction: 'ငွေလွှဲခြင်း',
    logisticsDesc: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်ခြင်းနှင့် စီမံခန့်ခွဲခြင်း',
    productionDesc: 'ဇုန်အလိုက် ထုတ်လုပ်မှု စီမံခန့်ခွဲခြင်း',
    qaDesc: 'အရည်အသွေး ထိန်းချုပ်ရေးနှင့် စစ်ဆေးခြင်း',
    managerDesc: 'ဒိုင်ခွက်နှင့် အစီရင်ခံစာများ',
    transactionDesc: 'ငွေလွှဲခြင်း စီမံခန့်ခွဲမှုနှင့် စာရင်းစစ်ဆေးခြင်း'
  },

  // Navigation
  nav: {
    backToRoles: 'အခန်းကဏ္ဍ ရွေးချယ်မှုသို့ ပြန်သွားရန်',
    goBack: 'နောက်သို့ပြန်သွားပါ'
  },

  // Inventory
  inventory: {
    sku: 'SKU',
    itemName: 'ပစ္စည်းအမည်',
    partName: 'အစိတ်အပိုင်းအမည်',
    amount: 'အရေအတွက်',
    location: 'တည်နေရာ',
    quantity: 'အရေအတွက်',
    countInventory: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်ပါ',
    checkInventory: 'ကုန်ပစ္စည်းစာရင်း စစ်ဆေးပါ',
    inventoryCount: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်ခြင်း',
    recentCounts: 'မကြာသေးမီက ရေတွက်မှုများ',
    noItems: 'မည်သည့်ပစ္စည်းမှ ရေတွက်ရသေးခြင်း မရှိပါ',
    enterAmount: 'အရေအတွက် ထည့်ပါ',
    selectSKU: 'SKU ရွေးပါ',
    searchSKU: 'SKU သို့မဟုတ် အစိတ်အပိုင်းအမည် ရှာပါ...',
    countDetails: 'ရေတွက်မှု အသေးစိတ်',
    countedBy: 'ရေတွက်သူ',
    selectedItem: 'ရွေးချယ်ထားသော ပစ္စည်း',
    startCounting: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်ရန် အပေါ်က ဖောင်ကို သုံးပါ',
    pieces: 'ခု',
    overview: 'ခြုံငုံသုံးသပ်ချက်',
    checkedItems: 'စစ်ဆေးပြီး ပစ္စည်းများ',
    expected: 'မျှော်မှန်းထားသည်',
    itemsCountedToday: 'ယနေ့ ရေတွက်ခဲ့သော ပစ္စည်းများ',
    calculatedExpected: 'တွက်ချက်ထားသော မျှော်မှန်းချက်',
    totalTransactions: 'စုစုပေါင်း ငွေလွှဲမှုများ',
    previousPeriod: 'ယခင်ကာလ',
    itemsInCatalog: 'ကတ်တလောက်ရှိ ပစ္စည်းများ'
  },

  // BOM (Bill of Materials)
  bom: {
    title: 'ပစ္စည်းစာရင်း (BOM)',
    bomCode: 'BOM ကုဒ်',
    bomName: 'BOM အမည်',
    bomSelected: 'BOM ရွေးချယ်ထားသည်',
    bomQuantity: 'BOM အရေအတွက်',
    bomPreview: 'BOM အစမ်းကြည့်ရှုခြင်း',
    bomExpansion: 'BOM ချဲ့ထွင်ခြင်း',
    components: 'အစိတ်အပိုင်းများ',
    componentCount: '{count} ခု အစိတ်အပိုင်းများ',
    willBeAdded: '{count} ခု အစိတ်အပိုင်းများကို ထည့်သွင်းပါမည်',
    searchItems: 'ပစ္စည်းများ သို့မဟုတ် BOM များ ရှာပါ...',
    searchItemsBOMs: 'ပစ္စည်းများ (A001, B002) သို့မဟုတ် BOMs (BOM001) ရှာပါ...',
    howManySets: 'ဘယ်နှစ်စုံလဲ?',
    setsOf: 'ဤသည်က {name} ၏ {count} စုံကို ဖန်တီးပေးပါမည်',
    addBOM: 'BOM ထည့်ပါ ({count} ပစ္စည်းများ)',
    expandedFrom: 'BOM မှ ချဲ့ထွင်ထားသည်: {name}',
    viaBoM: 'BOM မှတဆင့်: {code}'
  },

  // Logistics
  logistics: {
    title: 'ထောက်ပံ့ပို့ဆောင်ရေး - ကုန်ပစ္စည်းစာရင်း ရေတွက်ခြင်း',
    description: 'ထောက်ပံ့ပို့ဆောင်ရေး ဧရိယာရှိ ကုန်ပစ္စည်းများကို ရေတွက်ပြီး ခြေရာခံပါ',
    role: 'ထောက်ပံ့ပို့ဆောင်ရေး အခန်းကဏ္ဍ',
    checkDescription: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်ခြင်းနှင့် စီမံခန့်ခွဲခြင်း',
    inboundScanner: 'အဝင် စကင်နာ',
    scanDescription: 'ပစ်မှတ်ဇုန်များ ရှာဖွေရန် ဘားကုဒ်များကို စကင်ဖတ်ပါ',
    checkInventory: 'ကုန်ပစ္စည်းစာရင်း စစ်ဆေးပါ',
    sendItems: 'ပစ္စည်းများကို ပို့ပါ',
    scanIn: 'အဝင် စကင်ဖတ်ပါ'
  },

  // Scanner
  scanner: {
    inboundScanner: 'အဝင် စကင်နာ',
    cameraScanner: 'ကင်မရာ စကင်နာ',
    startScanner: 'စကင်နာ စတင်ပါ',
    stopScanner: 'စကင်နာ ရပ်ပါ',
    scanning: 'စကင်ဖတ်နေသည်...',
    cameraWillAppearHere: 'ကင်မရာ ဤနေရာတွင် ပေါ်လာပါမည်',
    cameraNotAvailable: 'ဤစက်တွင် ကင်မရာ မရနိုင်ပါ',
    cameraPermissionDenied: 'ကင်မရာ ခွင့်ပြုချက်ကို ငြင်းပယ်ထားသည်။ ကျေးဇူးပြု၍ ကင်မရာအသုံးပြုခွင့်ကို ဖွင့်ပြီး ထပ်ကြိုးစားပါ။',
    cameraAccessRequired: 'ကင်မရာ အသုံးပြုခွင့် လိုအပ်သည်။ ကျေးဇူးပြု၍ သင်၏ ဘရောက်ဆာ ဆက်တင်များတွင် ကင်မရာခွင့်ပြုချက်များကို ဖွင့်ပါ။',
    failedToStartCamera: 'ကင်မရာ စတင်ရန် မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။',
    scannerError: 'စကင်နာ အမှား',
    logisticsWorker: 'ထောက်ပံ့ပို့ဆောင်ရေး ဝန်ထမ်း',
    manualEntry: 'ကိုယ်တိုင်ထည့်သွင်းခြင်း',
    enterSKU: 'SKU ထည့်ပါ သို့မဟုတ် စမ်းသပ်ရန်အတွက် QR ကုဒ်အပြည့်အစုံကို ကူးထည့်ပါ',
    enterSKUPlaceholder: 'SKU (A001) ထည့်ပါ သို့မဟုတ် စမ်းသပ်ရန်အတွက် QR ကုဒ်ကို ကူးထည့်ပါ',
    exampleQR: 'QR ဥပမာ: 10#F16-1301P05AA$11#2CR$17#2$18#25469-CX70P250401$19#3',
    processSKU: 'လုပ်ဆောင်ပါ (SKU သို့မဟုတ် QR ကုဒ်)',
    error: 'အမှား',
    failedToProcessEntry: 'ထည့်သွင်းထားသော စာသားကို လုပ်ဆောင်ရန် မအောင်မြင်ပါ',
    noValidSKUFound: 'မှန်ကန်သော SKU မတွေ့ပါ။ ကြိုးစားခဲ့သည်: {attempts}'
  },

  // Production
  production: {
    title: 'ထုတ်လုပ်ရေး - ဇုန်ရွေးပါ',
    selectZone: 'ထုတ်လုပ်ရေး ဇုန်ရွေးချယ်ခြင်း',
    selectZoneDesc: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်ခြင်း စတင်ရန် ထုတ်လုပ်ရေး ဇုန်တစ်ခု ရွေးချယ်ပါ',
    zoneTitle: 'ထုတ်လုပ်ရေး ဇုန် {zone} - ကုန်ပစ္စည်းစာရင်း ရေတွက်ခြင်း',
    zoneDesc: 'ထုတ်လုပ်ရေး ဇုန် {zone} ရှိ ကုန်ပစ္စည်းများကို ရေတွက်ပြီး ခြေရာခံပါ',
    backToZones: 'ဇုန်ရွေးချယ်မှုသို့ ပြန်သွားရန်',
    zone: 'ဇုန်',
    role: 'ထုတ်လုပ်ရေး အခန်းကဏ္ဍ'
  },

  // Manager
  manager: {
    title: 'မန်နေဂျာ ဒိုင်ခွက်',
    header: 'မန်နေဂျာ ဒိုင်ခွက်',
    description: 'ကုန်လှောင်ရုံ လုပ်ငန်းဆောင်တာများ၏ ကျယ်ပြန့်သော မြင်ကွင်း',
    role: 'မန်နေဂျာ အခန်းကဏ္ဍ',
    inventoryDashboard: 'အဆင့်မြှင့်ထားသော ကုန်ပစ္စည်းစာရင်း ဒိုင်ခွက်',
    fullDashboard: 'ဒိုင်ခွက် အပြည့်အစုံ',
    activeSKUs: 'အသက်ဝင်သော SKU များ',
    logisticsTotal: 'ထောက်ပံ့ပို့ဆောင်ရေး စုစုပေါင်း',
    productionTotal: 'ထုတ်လုပ်ရေး စုစုပေါင်း',
    activeZones: 'အသက်ဝင်သော ဇုန်များ',
    lastUpdated: 'နောက်ဆုံး အပ်ဒိတ်လုပ်ထားသည်',
    actions: 'လုပ်ဆောင်ချက်များ',
    showZones: 'ဇုန်များ ပြပါ',
    hideZones: 'ဇုန်များ ဝှက်ပါ',
    zoneBreakdown: '{sku} အတွက် ထုတ်လုပ်ရေး ဇုန်အလိုက် ခွဲခြမ်းစိတ်ဖြာချက်',
    clearAllData: 'ဒေတာအားလုံး ရှင်းလင်းပါ',
    clearConfirm: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်မှုအားလုံးကို ရှင်းလင်းမှာလား? ဤလုပ်ဆောင်ချက်ကို နောက်ပြန်လှည့်၍မရပါ။',
    noData: 'ကုန်ပစ္စည်းစာရင်း ဒေတာ မရှိပါ',
    noResults: '"{searchTerm}" နှင့် ကိုက်ညီသော ပစ္စည်းများ မတွေ့ပါ',
    zoneDetails: 'ဇုန် အသေးစိတ်',
    hideZoneDetails: 'ဇုန် အသေးစိတ် ဝှက်ပါ',
    showZoneDetails: 'ဇုန် အသေးစိတ် ပြပါ',
    itemManagement: {
      title: 'ပစ္စည်း စီမံခန့်ခွဲမှု',
      subtitle: 'ပစ္စည်း စီမံခန့်ခွဲမှု ဘယ်လိုအလုပ်လုပ်သလဲ',
      itemMasterListTitle: 'ပစ္စည်း မာစတာစာရင်း',
      itemMasterListDesc: 'SKU နှင့် အမည်ပါသော ပစ္စည်းအားလုံး၏ ဗဟိုကတ်တလောက်',
      bomsTitle: 'BOMs',
      bomsDesc: 'အရေအတွက်နှင့်အတူ အစိတ်အပိုင်းများစွာပါဝင်သော ချက်ပြုတ်နည်းများ',
      workflowTitle: 'လုပ်ငန်းအသွားအလာ',
      workflowDesc: 'အလုပ်သမားများသည် ကုန်ပစ္စည်းစာရင်းရေတွက်သည့်အခါ တစ်ခုချင်းစီ သို့မဟုတ် BOM တစ်ခုလုံးကို ရွေးချယ်နိုင်သည်'
    },
    tabs: {
      inventory: 'ကုန်ပစ္စည်းစာရင်း',
      hr: 'HR',
      operations: 'လုပ်ငန်းဆောင်တာများ'
    },
    subTabs: {
      overview: 'ခြုံငုံသုံးသပ်ချက်',
      checked: 'စစ်ဆေးပြီး',
      expected: 'မျှော်မှန်းထားသည်',
      transactions: 'ငွေလွှဲခြင်းများ',
      yesterday: 'မနေ့က',
      itemMaster: 'ပစ္စည်း မာစတာ',
      userManagement: 'အသုံးပြုသူ စီမံခန့်ခွဲမှု',
      scannerOperations: 'စကင်နာနှင့် လုပ်ငန်းဆောင်တာများ'
    }
  },

  // Messages
  messages: {
    countSaved: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်မှု အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ',
    countFailed: 'ကုန်ပစ္စည်းစာရင်း ရေတွက်မှု သိမ်းဆည်းရန် မအောင်မြင်ပါ',
    dataCleared: 'ကုန်ပစ္စည်းစာရင်း ဒေတာအားလုံး ရှင်းလင်းပြီးပါပြီ',
    clearFailed: 'ကုန်ပစ္စည်းစာရင်း ဒေတာ ရှင်းလင်းရန် မအောင်မြင်ပါ',
    productionTip: 'ထုတ်လုပ်ရေးတွင်၊ ဤရေတွက်မှုများသည် Firebase သို့ အလိုအလျောက် هم وقت ပါလိမ့်မည်',
    pleaseSelectSKU: 'ကျေးဇူးပြု၍ SKU ရွေးချယ်ပါ',
    pleaseEnterValidAmount: 'ကျေးဇူးပြု၍ မှန်ကန်သော အရေအတွက် ထည့်သွင်းပါ',
    selectedItemNotFound: 'ရွေးချယ်ထားသော ပစ္စည်း မတွေ့ပါ'
  },

  // Transactions
  transactions: {
    title: 'ငွေလွှဲခြင်း စီမံခန့်ခွဲမှု',
    description: 'ကုန်ပစ္စည်းစာရင်း ငွေလွှဲမှုများကို ခြေရာခံပြီး စီမံခန့်ခွဲပါ',
    role: 'ငွေလွှဲခြင်း စီမံခန့်ခွဲမှု',
    logisticsDescription: 'ငွေလွှဲခြင်း စီမံခန့်ခွဲမှုနှင့် စာရင်းစစ်ဆေးခြင်း',
    sendItemsToProduction: 'ပစ္စည်းများကို ထုတ်လုပ်ရေးသို့ ပို့ပါ',
    sendInventoryToProduction: 'OTP အတည်ပြုချက်ဖြင့် ကုန်ပစ္စည်းစာရင်းကို ထုတ်လုပ်ရေးဇုန်များသို့ ပို့ပါ',
    itemSKU: 'ပစ္စည်း (SKU)',
    amount: 'အရေအတွက်',
    maxAmount: '(အများဆုံး: {max})',
    sendToProductionZone: 'ထုတ်လုပ်ရေး ဇုန်သို့ ပို့ပါ',
    selectDestinationZone: 'သွားမည့်နေရာ ဇုန်ရွေးပါ...',
    notesOptional: 'မှတ်စုများ (ရွေးချယ်နိုင်သည်)',
    addNotesAboutTransfer: 'ဤလွှဲပြောင်းမှုအကြောင်း မှတ်စုများ ထည့်ပါ...',
    referenceOptional: 'ကိုးကား (ရွေးချယ်နိုင်သည်)',
    workOrderBatchNumber: 'အလုပ်အမှာစာ၊ အသုတ်နံပါတ် စသည်တို့',
    transactionSummary: 'ငွေလွှဲခြင်း အကျဉ်းချုပ်',
    item: 'ပစ္စည်း',
    available: 'ရရှိနိုင်သည်',
    remainingAfterSend: 'ပို့ပြီးနောက် ကျန်ရှိသည်',
    units: 'ခု',
    inStock: 'စတော့တွင် ရှိသည်',
    outOfStock: 'စတော့ကုန်နေသည်',
    noItemsAvailable: 'ကုန်ပစ္စည်းစာရင်းတွင် ပစ္စည်းများ မရှိပါ။ ကျေးဇူးပြု၍ ကုန်ပစ္စည်းစာရင်း ရေတွက်မှုများကို ဦးစွာထည့်ပါ။',
    cannotSendMoreThan: '{max} ခုထက် ပိုမပို့နိုင်ပါ (ရရှိနိုင်သော အရေအတွက်)',
    youCanSendUpTo: 'သင် {sku} ၏ {max} ခုအထိ ပို့နိုင်သည်',
    sendAndGenerateOTP: 'ပို့ပြီး OTP ထုတ်လုပ်ပါ',
    pleaseFillAllFields: 'ကျေးဇူးပြု၍ လိုအပ်သော အကွက်အားလုံးကို ဖြည့်ပါ',
    failedToCreateTransaction: 'ငွေလွှဲခြင်း ဖန်တီးရန် မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။',
    newTransaction: 'ငွေလွှဲခြင်း အသစ်',
    transactionHistory: 'ငွေလွှဲခြင်း မှတ်တမ်း',
    transactionType: 'ငွေလွှဲခြင်း အမျိုးအစား',
    fromLocation: 'မှ တည်နေရာ',
    toLocation: 'သို့ တည်နေရာ',
    reference: 'ကိုးကား',
    notes: 'မှတ်စုများ',
    performedBy: 'လုပ်ဆောင်သူ',
    approvedBy: 'အတည်ပြုသူ',
    previousAmount: 'ယခင် အရေအတွက်',
    newAmount: 'အရေအတွက် အသစ်',
    transactionDate: 'ငွေလွှဲသည့် ရက်စွဲ',
    transactionStatus: 'အခြေအနေ',
    pending: 'ဆိုင်းငံ့ထားသည်',
    completed: 'ပြီးစီးသည်',
    cancelled: 'ပယ်ဖျက်သည်',
    noTransactions: 'ငွေလွှဲခြင်းများ မတွေ့ပါ',
    confirmTransaction: 'ငွေလွှဲခြင်း အတည်ပြုပါ',
    enterOTP: '4-ဂဏန်း OTP ထည့်ပါ',
    otpRequired: 'OTP လိုအပ်သည်',
    otpInvalid: 'OTP မမှန်ကန်ပါ',
    transactionConfirmed: 'ငွေလွှဲခြင်း အောင်မြင်စွာ အတည်ပြုပြီးပါပြီ',
    transactionRejected: 'ငွေလွှဲခြင်းကို ပယ်ချလိုက်သည်',
    waitingForConfirmation: 'အတည်ပြုချက်ကို စောင့်နေသည်...',
    sendTransaction: 'ငွေလွှဲခြင်း ပို့ပါ',
    confirmTransactions: 'ငွေလွှဲခြင်းများ အတည်ပြုပါ',
    confirmIncoming: 'OTP ဖြင့် ထောက်ပံ့ပို့ဆောင်ရေးမှ ရောက်လာသော ပစ္စည်းများကို အတည်ပြုပါ',
    noPendingTransactions: 'ဆိုင်းငံ့ထားသော ငွေလွှဲခြင်းများ မရှိပါ',
    noItemsBeingSent: 'ယခုအချိန်တွင် ဇုန် {zone} သို့ ပစ္စည်းများ ပို့မထားပါ',
    whenLogisticsSends: 'ထောက်ပံ့ပို့ဆောင်ရေးမှ သင့်ဇုန်သို့ ပစ္စည်းများ ပို့သည့်အခါ၊ ၎င်းတို့သည် OTP ဖြင့် အတည်ပြုရန် ဤနေရာတွင် ပေါ်လာပါမည်။',
    pleaseEnterOTP: 'ကျေးဇူးပြု၍ OTP ထည့်ပါ',
    pleaseProvideReason: 'ကျေးဇူးပြု၍ ငြင်းပယ်ရသည့် အကြောင်းရင်းကို ဖော်ပြပါ',
    failedToConfirm: 'ငွေလွှဲခြင်း အတည်ပြုရန် မအောင်မြင်ပါ',
    failedToReject: 'ငွေလွှဲခြင်းကို ငြင်းပယ်ရန် မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - ကုန်လှောင်ရုံ စီမံခန့်ခွဲမှုစနစ်',
    version: 'v{version} - {feature}'
  }
};

export default myanmarTranslations;