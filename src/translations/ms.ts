// Malay translations
import { Translation } from '../contexts/LanguageContext';

const malayTranslations: Translation = {
  // Common
  common: {
    loading: 'Memuatkan...',
    back: 'Kembali',
    submit: 'Hantar',
    clear: 'Padam',
    search: 'Cari',
    cancel: 'Batal',
    confirm: 'Sahkan',
    save: 'Simpan',
    delete: 'Hapus',
    edit: 'Edit',
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
    loggedInAs: 'Log masuk sebagai',
    loggingIn: 'Sedang log masuk...'
  },

  // Roles
  roles: {
    selectRole: 'Pilih Peranan Anda',
    logistics: 'Logistik',
    production: 'Pengeluaran',
    manager: 'Pengurus',
    transaction: 'Transaksi',
    logisticsDesc: 'Pengiraan dan pengurusan inventori',
    productionDesc: 'Pengurusan pengeluaran berasaskan zon',
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
    itemName: 'Nama Barang',
    partName: 'Nama Bahagian',
    amount: 'Jumlah',
    location: 'Lokasi',
    quantity: 'Kuantiti',
    countInventory: 'Semak Inventori',
    inventoryCount: 'Kiraan Inventori',
    recentCounts: 'Kiraan Terkini',
    noItems: 'Tiada barang yang telah dikira lagi',
    enterAmount: 'Masukkan jumlah',
    selectSKU: 'Pilih atau taip SKU',
    searchSKU: 'Cari SKU atau nama bahagian...',
    countDetails: 'Butiran Kiraan',
    countedBy: 'Dikira oleh',
    selectedItem: 'Barang Dipilih',
    startCounting: 'Gunakan borang di atas untuk mula mengira inventori',
    pieces: 'keping'
  },

  // Logistics
  logistics: {
    title: 'Logistik - Kiraan Inventori',
    description: 'Kira dan jejaki barang inventori di kawasan logistik',
    role: 'Peranan Logistik'
  },

  // Production
  production: {
    title: 'Pengeluaran - Pilih Zon',
    selectZone: 'Pemilihan Zon Pengeluaran',
    selectZoneDesc: 'Pilih zon pengeluaran untuk mula mengira inventori',
    zoneTitle: 'Zon Pengeluaran {zone} - Kiraan Inventori',
    zoneDesc: 'Kira dan jejaki barang inventori di zon pengeluaran {zone}',
    backToZones: 'Kembali ke Pemilihan Zon',
    zone: 'Zon',
    role: 'Peranan Pengeluaran'
  },

  // Manager
  manager: {
    title: 'Papan Pemuka Pengurus',
    description: 'Gambaran keseluruhan inventori masa nyata dan analitik',
    role: 'Peranan Pengurus',
    inventoryDashboard: 'Papan Pemuka Inventori Dipertingkat',
    activeSKUs: 'SKU Aktif',
    logisticsTotal: 'Jumlah Logistik',
    productionTotal: 'Jumlah Pengeluaran',
    activeZones: 'Zon Aktif',
    lastUpdated: 'Terakhir Dikemas Kini',
    actions: 'Tindakan',
    showZones: 'Tunjuk Zon',
    hideZones: 'Sembunyikan Zon',
    zoneBreakdown: 'Pecahan Zon Pengeluaran untuk {sku}',
    clearAllData: 'Padam Semua Data',
    clearConfirm: 'Padam semua kiraan inventori? Ini tidak boleh dibuat asal.',
    noData: 'Tiada Data Inventori',
    noResults: 'Tiada barang ditemui yang sepadan "{searchTerm}"',
    zoneDetails: 'Butiran Zon',
    hideZoneDetails: 'Sembunyikan Butiran Zon',
    showZoneDetails: 'Tunjuk Butiran Zon'
  },

  // Statistics
  stats: {
    countRecords: '{count} Rekod Kiraan',
    zones: '{count} zon',
    items: '{count} barang'
  },

  // Messages
  messages: {
    countSaved: 'Kiraan inventori berjaya disimpan',
    countFailed: 'Gagal menyimpan kiraan inventori',
    dataCleared: 'Semua data inventori telah dipadam',
    clearFailed: 'Gagal memadamkan data inventori',
    productionTip: 'Dalam pengeluaran, kiraan ini akan disegerakkan ke Firebase secara automatik',
    pleaseSelectSKU: 'Sila pilih SKU',
    pleaseEnterValidAmount: 'Sila masukkan jumlah yang sah',
    selectedItemNotFound: 'Barang yang dipilih tidak ditemui'
  },

  // Transactions
  transactions: {
    title: 'Pengurusan Transaksi',
    description: 'Jejaki dan urus transaksi inventori',
    role: 'Pengurusan Transaksi',
    newTransaction: 'Transaksi Baru',
    transactionHistory: 'Sejarah Transaksi',
    transactionType: 'Jenis Transaksi',
    fromLocation: 'Dari Lokasi',
    toLocation: 'Ke Lokasi',
    reference: 'Rujukan',
    notes: 'Nota',
    performedBy: 'Dilakukan Oleh',
    approvedBy: 'Diluluskan Oleh',
    previousAmount: 'Jumlah Sebelum',
    newAmount: 'Jumlah Baru',
    transactionDate: 'Tarikh Transaksi',
    filterTransactions: 'Tapis Transaksi',
    noTransactions: 'Tiada transaksi dijumpai',
    createTransaction: 'Cipta Transaksi',
    viewDetails: 'Lihat Butiran',
    approve: 'Lulus',
    cancel: 'Batal',
    pending: 'Menunggu',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    count: 'Kiraan Stok',
    transferIn: 'Pindah Masuk',
    transferOut: 'Pindah Keluar',
    adjustment: 'Pelarasan',
    initialStock: 'Stok Awal'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - Sistem Pengurusan Gudang',
    version: 'v{version} - {feature}'
  }
};

export default malayTranslations;