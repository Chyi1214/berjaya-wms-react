// Chinese translations
import { Translation } from '../contexts/LanguageContext';

const chineseTranslations: Translation = {
  // Common
  common: {
    loading: '加载中...',
    back: '返回',
    submit: '提交',
    clear: '清除',
    search: '搜索',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    yes: '是',
    no: '否',
    total: '总计',
    logout: '登出',
    tip: '提示'
  },

  // Authentication
  auth: {
    login: '登录',
    loginWith: '使用 Google 登录',
    loggedInAs: '登录为',
    loggingIn: '登录中...'
  },

  // Roles
  roles: {
    selectRole: '请选择您的角色',
    logistics: '物流',
    production: '生产',
    qa: '质量保证',
    manager: '经理',
    transaction: '事务',
    logisticsDesc: '库存盘点与管理',
    productionDesc: '各区域生产管理',
    qaDesc: '质量控制与检查',
    managerDesc: '仪表盘与报告',
    transactionDesc: '事务管理与审计'
  },

  // Navigation
  nav: {
    backToRoles: '返回角色选择',
    goBack: '返回'
  },

  // Inventory
  inventory: {
    sku: 'SKU',
    itemName: '物料名称',
    partName: '零件名称',
    amount: '数量',
    location: '位置',
    quantity: '数量',
    countInventory: '盘点库存',
    checkInventory: '盘点库存',
    inventoryCount: '库存盘点',
    recentCounts: '最近盘点',
    noItems: '暂无盘点记录',
    enterAmount: '输入数量',
    selectSKU: '选择 SKU',
    searchSKU: '搜索 SKU 或零件名称...',
    countDetails: '盘点详情',
    countedBy: '盘点人',
    selectedItem: '已选物料',
    startCounting: '请使用上方表格开始盘点库存',
    pieces: '件',
    overview: '总览',
    checkedItems: '已盘点项',
    expected: '预期',
    itemsCountedToday: '今日已盘点',
    calculatedExpected: '计算出的预期',
    totalTransactions: '总事务数',
    previousPeriod: '上一时期',
    itemsInCatalog: '目录中的项目'
  },

  // BOM (Bill of Materials)
  bom: {
    title: '物料清单 (BOM)',
    bomCode: 'BOM 代码',
    bomName: 'BOM 名称',
    bomSelected: '已选 BOM',
    bomQuantity: 'BOM 数量',
    bomPreview: 'BOM 预览',
    bomExpansion: 'BOM 展开',
    components: '组件',
    componentCount: '{count} 个组件',
    willBeAdded: '将添加 {count} 个组件',
    searchItems: '搜索物料或 BOM...',
    searchItemsBOMs: '搜索物料 (A001, B002) 或 BOM (BOM001)...',
    howManySets: '多少套？',
    setsOf: '这将创建 {count} 套 {name}',
    addBOM: '添加 BOM ({count} 个物料)',
    expandedFrom: '从 BOM 展开: {name}',
    viaBoM: '通过 BOM: {code}'
  },

  // Logistics
  logistics: {
    title: '物流 - 库存盘点',
    description: '盘点并追踪物流区的库存物料',
    role: '物流角色',
    checkDescription: '库存盘点与管理',
    inboundScanner: '入库扫描器',
    scanDescription: '扫描条形码以查找目标区域',
    checkInventory: '检查库存',
    sendItems: '发送物料',
    scanIn: '扫描入库'
  },

  // Scanner
  scanner: {
    inboundScanner: '入库扫描器',
    cameraScanner: '摄像头扫描器',
    startScanner: '开始扫描',
    stopScanner: '停止扫描',
    scanning: '扫描中...',
    cameraWillAppearHere: '摄像头将在此处显示',
    cameraNotAvailable: '此设备上无摄像头',
    cameraPermissionDenied: '摄像头权限被拒绝。请启用摄像头访问权限后重试。',
    cameraAccessRequired: '需要摄像头访问权限。请在浏览器设置中启用摄像头权限。',
    failedToStartCamera: '无法启动摄像头。请重试。',
    scannerError: '扫描器错误',
    logisticsWorker: '物流员工',
    manualEntry: '手动输入',
    enterSKU: '输入 SKU 或粘贴完整的 QR 码进行测试',
    enterSKUPlaceholder: '输入 SKU (A001) 或粘贴 QR 码进行测试',
    exampleQR: 'QR 示例: 10#F16-1301P05AA$11#2CR$17#2$18#25469-CX70P250401$19#3',
    processSKU: '处理 (SKU 或 QR 码)',
    error: '错误',
    failedToProcessEntry: '处理输入的文本失败',
    noValidSKUFound: '未找到有效的 SKU。已尝试: {attempts}'
  },

  // Production
  production: {
    title: '生产 - 选择区域',
    selectZone: '生产区域选择',
    selectZoneDesc: '选择一个生产区域以开始库存盘点',
    zoneTitle: '生产区 {zone} - 库存盘点',
    zoneDesc: '盘点并追踪生产区 {zone} 的库存物料',
    backToZones: '返回区域选择',
    zone: '区域',
    role: '生产角色'
  },

  // Manager
  manager: {
    title: '经理仪表盘',
    header: '经理仪表盘',
    description: '仓库运营综合视图',
    role: '经理角色',
    inventoryDashboard: '增强型库存仪表盘',
    fullDashboard: '完整仪表板',
    activeSKUs: '活跃 SKU',
    logisticsTotal: '物流总数',
    productionTotal: '生产总数',
    activeZones: '活跃区域',
    lastUpdated: '最后更新',
    actions: '操作',
    showZones: '显示区域',
    hideZones: '隐藏区域',
    zoneBreakdown: '{sku} 的生产区域明细',
    clearAllData: '清除所有数据',
    clearConfirm: '要清除所有库存盘点吗？此操作无法撤销。',
    noData: '无库存数据',
    noResults: '未找到与 "{searchTerm}" 匹配的物料',
    zoneDetails: '区域详情',
    hideZoneDetails: '隐藏区域详情',
    showZoneDetails: '显示区域详情',
    itemManagement: {
      title: '物料管理',
      subtitle: '物料管理如何运作',
      itemMasterListTitle: '物料主列表',
      itemMasterListDesc: '包含所有物料及其SKU和名称的中央目录',
      bomsTitle: 'BOMs',
      bomsDesc: '包含多个组件及其数量的配方',
      workflowTitle: '工作流程',
      workflowDesc: '工人在盘点库存时可以选择单个物料或整个BOM'
    },
    subTabs: {
      overview: '总览',
      checked: '已盘点',
      expected: '预期',
      transactions: '事务',
      yesterday: '昨天',
      itemMaster: '物料',
      scanner: '扫描器',
      userManagement: '用户',
      scannerOperations: '扫描器与运营'
    },
    tabs: {
      inventory: '库存',
      productionLine: '生产线',
      qa: '质量保证',
      hr: '人力资源'
    }
  },

  // Messages
  messages: {
    countSaved: '库存盘点已成功保存',
    countFailed: '保存库存盘点失败',
    dataCleared: '所有库存数据已清除',
    clearFailed: '清除库存数据失败',
    productionTip: '在生产环境中，这些盘点将自动同步到 Firebase',
    pleaseSelectSKU: '请选择一个 SKU',
    pleaseEnterValidAmount: '请输入有效数量',
    selectedItemNotFound: '未找到所选物料'
  },

  // Transactions
  transactions: {
    title: '事务管理',
    description: '追踪和管理库存事务',
    role: '事务管理',
    logisticsDescription: '事务管理与审计',
    sendItemsToProduction: '发送物料到生产区',
    sendInventoryToProduction: '通过 OTP 确认将库存发送到生产区',
    itemSKU: '物料 (SKU)',
    amount: '数量',
    maxAmount: '(最大: {max})',
    sendToProductionZone: '发送到生产区',
    selectDestinationZone: '选择目标区域...',
    notesOptional: '备注 (可选)',
    addNotesAboutTransfer: '添加关于此次转移的任何备注...',
    referenceOptional: '参考 (可选)',
    workOrderBatchNumber: '工单、批号等',
    transactionSummary: '事务摘要',
    item: '物料',
    available: '可用',
    remainingAfterSend: '发送后剩余',
    units: '单位',
    inStock: '有货',
    outOfStock: '缺货',
    noItemsAvailable: '库存中无可用物料。请先添加库存盘点。',
    cannotSendMoreThan: '不能发送超过 {max} 单位 (可用数量)',
    youCanSendUpTo: '您最多可以发送 {max} 单位的 {sku}',
    sendAndGenerateOTP: '发送并生成 OTP',
    pleaseFillAllFields: '请填写所有必填字段',
    failedToCreateTransaction: '创建事务失败。请重试。',
    newTransaction: '新事务',
    transactionHistory: '事务历史',
    transactionType: '事务类型',
    fromLocation: '来源位置',
    toLocation: '目标位置',
    reference: '参考',
    notes: '备注',
    performedBy: '执行人',
    approvedBy: '批准人',
    previousAmount: '先前数量',
    newAmount: '新数量',
    transactionDate: '事务日期',
    transactionStatus: '状态',
    pending: '待定',
    completed: '已完成',
    cancelled: '已取消',
    noTransactions: '未找到任何事务',
    confirmTransaction: '确认事务',
    enterOTP: '输入 4 位 OTP',
    otpRequired: '需要 OTP',
    otpInvalid: 'OTP 无效',
    transactionConfirmed: '事务已成功确认',
    transactionRejected: '事务已被拒绝',
    waitingForConfirmation: '等待确认中...',
    sendTransaction: '发送事务',
    confirmTransactions: '确认事务',
    confirmIncoming: '使用 OTP 确认来自物流的物料',
    noPendingTransactions: '无待处理的事务',
    noItemsBeingSent: '目前没有物料发送到区域 {zone}。',
    whenLogisticsSends: '当物流向您的区域发送物料时，它们将在此处显示并需要 OTP 确认。',
    pleaseEnterOTP: '请输入 OTP',
    pleaseProvideReason: '请输入拒绝原因',
    failedToConfirm: '确认事务失败',
    failedToReject: '拒绝事务失败。请重试。'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - 仓库管理系统',
    version: 'v{version} - {feature}'
  }
};

export default chineseTranslations;