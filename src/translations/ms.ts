// Malay translations
import { Translation } from '../contexts/LanguageContext';

const malayTranslations: Translation = {
  // Common
  common: {
    loading: 'Memuatkan...',
    back: 'Kembali',
    submit: 'Hantar',
    clear: 'Kosongkan',
    search: 'Cari',
    cancel: 'Batal',
    confirm: 'Sahkan',
    save: 'Simpan',
    delete: 'Padam',
    edit: 'Sunting',
    close: 'Tutup',
    yes: 'Ya',
    no: 'Tidak',
    total: 'Jumlah',
    logout: 'Log Keluar',
    tip: 'Petua'
  },

  // Authentication
  auth: {
    login: 'Log Masuk',
    loginWith: 'Log Masuk dengan Google',
    loggedInAs: 'Log Masuk sebagai',
    loggingIn: 'Sedang Log Masuk...'
  },

  // Roles
  roles: {
    selectRole: 'Pilih Peranan Anda',
    logistics: 'Logistik',
    production: 'Pengeluaran',
    qa: 'Kawalan Kualiti',
    manager: 'Pengurus',
    transaction: 'Transaksi',
    logisticsDesc: 'Pengiraan dan pengurusan inventori',
    productionDesc: 'Pengurusan pengeluaran berasaskan zon',
    qaDesc: 'Kawalan kualiti dan pemeriksaan',
    managerDesc: 'Papan pemuka dan pelaporan',
    transactionDesc: 'Pengurusan transaksi dan jejak audit'
  },

  // Navigation
  nav: {
    backToRoles: 'Kembali ke Pemilihan Peranan',
    goBack: 'Kembali'
  },

  // Inventory
  inventory: {
    sku: 'SKU',
    itemName: 'Nama Item',
    partName: 'Nama Bahagian',
    amount: 'Jumlah',
    location: 'Lokasi',
    quantity: 'Kuantiti',
    countInventory: 'Kira Inventori',
    checkInventory: 'Periksa Inventori',
    inventoryCount: 'Pengiraan Inventori',
    recentCounts: 'Pengiraan Terkini',
    noItems: 'Tiada item telah dikira lagi',
    enterAmount: 'Masukkan jumlah',
    selectSKU: 'Pilih SKU',
    searchSKU: 'Cari SKU atau nama bahagian...',
    countDetails: 'Butiran Kiraan',
    countedBy: 'Dikira oleh',
    selectedItem: 'Item Terpilih',
    startCounting: 'Gunakan borang di atas untuk mula mengira inventori',
    pieces: 'unit',
    overview: 'Gambaran Keseluruhan',
    checkedItems: 'Item yang Diperiksa',
    expected: 'Jangkaan',
    itemsCountedToday: 'Item dikira hari ini',
    calculatedExpected: 'Jangkaan yang dikira',
    totalTransactions: 'Jumlah transaksi',
    previousPeriod: 'Tempoh sebelumnya',
    itemsInCatalog: 'Item dalam katalog'
  },

  // BOM (Bill of Materials)
  bom: {
    title: 'Senarai Bahan (BOM)',
    bomCode: 'Kod BOM',
    bomName: 'Nama BOM',
    bomSelected: 'BOM Dipilih',
    bomQuantity: 'Kuantiti BOM',
    bomPreview: 'Pratonton BOM',
    bomExpansion: 'Pengembangan BOM',
    components: 'komponen',
    componentCount: '{count} komponen',
    willBeAdded: '{count} komponen akan ditambah',
    searchItems: 'Cari item atau BOM...',
    searchItemsBOMs: 'Cari item (A001, B002) atau BOM (BOM001)...',
    howManySets: 'Berapa set?',
    setsOf: 'Ini akan mencipta {count} set {name}',
    addBOM: 'Tambah BOM ({count} item)',
    expandedFrom: 'Dikembangkan dari BOM: {name}',
    viaBoM: 'melalui BOM: {code}'
  },

  // Logistics
  logistics: {
    title: 'Logistik - Kiraan Inventori',
    description: 'Kira dan jejak item inventori di kawasan logistik',
    role: 'Peranan Logistik',
    checkDescription: 'Pengiraan dan pengurusan inventori',
    inboundScanner: 'Pengimbas Masuk',
    scanDescription: 'Imbas kod bar untuk mencari zon sasaran',
    checkInventory: 'Periksa Inventori',
    sendItems: 'Hantar Item',
    scanIn: 'Imbas Masuk'
  },

  // Scanner
  scanner: {
    inboundScanner: 'Pengimbas Masuk',
    cameraScanner: 'Pengimbas Kamera',
    startScanner: 'Mula Pengimbas',
    stopScanner: 'Henti Pengimbas',
    scanning: 'Mengimbas...',
    cameraWillAppearHere: 'Kamera akan muncul di sini',
    cameraNotAvailable: 'Kamera tidak tersedia pada peranti ini',
    cameraPermissionDenied: 'Kebenaran kamera ditolak. Sila benarkan akses kamera dan cuba lagi.',
    cameraAccessRequired: 'Akses kamera diperlukan. Sila benarkan kebenaran kamera dalam tetapan pelayar anda.',
    failedToStartCamera: 'Gagal memulakan kamera. Sila cuba lagi.',
    scannerError: 'Ralat pengimbas',
    logisticsWorker: 'Pekerja Logistik',
    manualEntry: 'Kemasukan Manual',
    enterSKU: 'Masukkan SKU atau tampal kod QR penuh untuk ujian',
    enterSKUPlaceholder: 'Masukkan SKU (A001) atau tampal kod QR untuk ujian',
    exampleQR: 'Contoh QR: 10#F16-1301P05AA$11#2CR$17#2$18#25469-CX70P250401$19#3',
    processSKU: 'Proses (SKU atau Kod QR)',
    error: 'Ralat',
    failedToProcessEntry: 'Gagal memproses teks yang dimasukkan',
    noValidSKUFound: 'Tiada SKU yang sah ditemui. Cuba: {attempts}'
  },

  // Production
  production: {
    title: 'Pengeluaran - Pilih Zon',
    selectZone: 'Pemilihan Zon Pengeluaran',
    selectZoneDesc: 'Pilih zon pengeluaran untuk memulakan pengiraan inventori',
    zoneTitle: 'Zon Pengeluaran {zone} - Kiraan Inventori',
    zoneDesc: 'Kira dan jejak item inventori di zon pengeluaran {zone}',
    backToZones: 'Kembali ke Pemilihan Zon',
    zone: 'Zon',
    role: 'Peranan Pengeluaran'
  },

  // Manager
  manager: {
    title: 'Papan Pemuka Pengurus',
    header: 'Papan Pemuka Pengurus',
    description: 'Pandangan komprehensif operasi gudang',
    role: 'Peranan Pengurus',
    inventoryDashboard: 'Papan Pemuka Inventori Dipertingkat',
    fullDashboard: 'Papan Pemuka Penuh',
    activeSKUs: 'SKU Aktif',
    logisticsTotal: 'Jumlah Logistik',
    productionTotal: 'Jumlah Pengeluaran',
    activeZones: 'Zon Aktif',
    lastUpdated: 'Terakhir Dikemas kini',
    actions: 'Tindakan',
    showZones: 'Tunjukkan Zon',
    hideZones: 'Sembunyikan Zon',
    zoneBreakdown: 'Pecahan Zon Pengeluaran untuk {sku}',
    clearAllData: 'Kosongkan Semua Data',
    clearConfirm: 'Kosongkan semua kiraan inventori? Tindakan ini tidak boleh dibatalkan.',
    noData: 'Tiada Data Inventori',
    noResults: 'Tiada item ditemui yang sepadan dengan "{searchTerm}"',
    zoneDetails: 'Butiran Zon',
    hideZoneDetails: 'Sembunyikan Butiran Zon',
    showZoneDetails: 'Tunjukkan Butiran Zon',
    itemManagement: {
      title: 'Pengurusan Item',
      subtitle: 'Bagaimana Pengurusan Item Berfungsi',
      itemMasterListTitle: 'Senarai Induk Item',
      itemMasterListDesc: 'Katalog pusat semua item dengan SKU dan nama',
      bomsTitle: 'BOMs',
      bomsDesc: 'Resipi yang mengandungi pelbagai komponen dengan kuantiti',
      workflowTitle: 'Aliran Kerja',
      workflowDesc: 'Pekerja boleh memilih item individu atau keseluruhan BOM semasa mengira inventori'
    },
    tabs: {
      inventory: 'Inventori',
      hr: 'HR',
      operations: 'Operasi'
    },
    subTabs: {
      overview: 'Gambaran Keseluruhan',
      checked: 'Diperiksa',
      expected: 'Jangkaan',
      transactions: 'Transaksi',
      yesterday: 'Semalam',
      itemMaster: 'Induk Item',
      userManagement: 'Pengurusan Pengguna',
      scannerOperations: 'Pengimbas & Operasi'
    }
  },

  // Messages
  messages: {
    countSaved: 'Kiraan inventori berjaya disimpan',
    countFailed: 'Gagal menyimpan kiraan inventori',
    dataCleared: 'Semua data inventori telah dikosongkan',
    clearFailed: 'Gagal mengosongkan data inventori',
    productionTip: 'Dalam pengeluaran, kiraan ini akan disegerakkan ke Firebase secara automatik',
    pleaseSelectSKU: 'Sila pilih SKU',
    pleaseEnterValidAmount: 'Sila masukkan jumlah yang sah',
    selectedItemNotFound: 'Item yang dipilih tidak ditemui'
  },

  // Transactions
  transactions: {
    title: 'Pengurusan Transaksi',
    description: 'Jejak dan urus transaksi inventori',
    role: 'Pengurusan Transaksi',
    logisticsDescription: 'Pengurusan transaksi dan jejak audit',
    sendItemsToProduction: 'Hantar Item ke Pengeluaran',
    sendInventoryToProduction: 'Hantar inventori ke zon pengeluaran dengan pengesahan OTP',
    itemSKU: 'Item (SKU)',
    amount: 'Jumlah',
    maxAmount: '(Maks: {max})',
    sendToProductionZone: 'Hantar ke Zon Pengeluaran',
    selectDestinationZone: 'Pilih zon destinasi...',
    notesOptional: 'Nota (Pilihan)',
    addNotesAboutTransfer: 'Tambah sebarang nota mengenai pemindahan ini...',
    referenceOptional: 'Rujukan (Pilihan)',
    workOrderBatchNumber: 'Pesanan kerja, nombor kelompok, dll.',
    transactionSummary: 'Ringkasan Transaksi',
    item: 'Item',
    available: 'Tersedia',
    remainingAfterSend: 'Baki selepas hantar',
    units: 'unit',
    inStock: 'Dalam Stok',
    outOfStock: 'Kehabisan Stok',
    noItemsAvailable: 'Tiada item tersedia dalam inventori. Sila tambah kiraan inventori dahulu.',
    cannotSendMoreThan: 'Tidak boleh menghantar lebih daripada {max} unit (kuantiti tersedia)',
    youCanSendUpTo: 'Anda boleh menghantar sehingga {max} unit {sku}',
    sendAndGenerateOTP: 'Hantar & Jana OTP',
    pleaseFillAllFields: 'Sila isi semua medan yang diperlukan',
    failedToCreateTransaction: 'Gagal membuat transaksi. Sila cuba lagi.',
    newTransaction: 'Transaksi Baru',
    transactionHistory: 'Sejarah Transaksi',
    transactionType: 'Jenis Transaksi',
    fromLocation: 'Dari Lokasi',
    toLocation: 'Ke Lokasi',
    reference: 'Rujukan',
    notes: 'Nota',
    performedBy: 'Dilakukan Oleh',
    approvedBy: 'Diluluskan Oleh',
    previousAmount: 'Jumlah Sebelumnya',
    newAmount: 'Jumlah Baru',
    transactionDate: 'Tarikh Transaksi',
    transactionStatus: 'Status',
    pending: 'Menunggu',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    noTransactions: 'Tiada transaksi ditemui',
    confirmTransaction: 'Sahkan Transaksi',
    enterOTP: 'Masukkan OTP 4-digit',
    otpRequired: 'OTP diperlukan',
    otpInvalid: 'OTP tidak sah',
    transactionConfirmed: 'Transaksi berjaya disahkan',
    transactionRejected: 'Transaksi ditolak',
    waitingForConfirmation: 'Menunggu pengesahan...',
    sendTransaction: 'Hantar Transaksi',
    confirmTransactions: 'Sahkan Transaksi',
    confirmIncoming: 'Sahkan item masuk dari logistik dengan OTP',
    noPendingTransactions: 'Tiada Transaksi Menunggu',
    noItemsBeingSent: 'Tiada item sedang dihantar ke Zon {zone} sekarang.',
    whenLogisticsSends: 'Apabila logistik menghantar item ke zon anda, ia akan muncul di sini dengan OTP untuk pengesahan.',
    pleaseEnterOTP: 'Sila masukkan OTP',
    pleaseProvideReason: 'Sila berikan sebab penolakan',
    failedToConfirm: 'Gagal mengesahkan transaksi',
    failedToReject: 'Gagal menolak transaksi. Sila cuba lagi.'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - Sistem Pengurusan Gudang',
    version: 'v{version} - {feature}'
  }
};

export default malayTranslations;