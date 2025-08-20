// Chinese translations
import { Translation } from '../contexts/LanguageContext';

const chineseTranslations: Translation = {
  // Common
  common: {
    loading: '加载中',
    back: '返回',
    submit: '提交',
    clear: '清除全部',
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
    loginWith: '使用Google登录',
    loggedInAs: '登录身份',
    loggingIn: '正在登录...'
  },

  // Roles
  roles: {
    selectRole: '选择您的角色',
    logistics: '物流',
    production: '生产',
    manager: '管理员',
    transaction: '交易',
    logisticsDesc: '库存盘点和管理',
    productionDesc: '基于区域的生产管理',
    managerDesc: '仪表板和报告',
    transactionDesc: '交易管理和审计跟踪'
  },

  // Navigation
  nav: {
    backToRoles: '返回角色选择',
    goBack: '返回'
  },

  // Inventory
  inventory: {
    sku: '货号',
    itemName: '物品名称',
    partName: '零件名称',
    amount: '数量',
    location: '位置',
    quantity: '数量',
    countInventory: '盘点库存',
    inventoryCount: '库存盘点',
    recentCounts: '最近盘点',
    noItems: '尚未盘点任何物品',
    enterAmount: '输入数量',
    selectSKU: '选择货号',
    searchSKU: '搜索货号或零件名称...',
    countDetails: '盘点详情',
    countedBy: '盘点人',
    selectedItem: '选择的物品',
    startCounting: '请使用上方表单开始盘点库存',
    pieces: '件'
  },

  // BOM (Bill of Materials) - 物料清单
  bom: {
    title: '物料清单',
    bomCode: 'BOM代码',
    bomName: 'BOM名称',
    bomSelected: '已选BOM',
    bomQuantity: 'BOM数量',
    bomPreview: 'BOM预览',
    bomExpansion: 'BOM展开',
    components: '组件',
    componentCount: '{count}个组件',
    willBeAdded: '将添加{count}个组件',
    searchItems: '搜索物品或BOM...',
    searchItemsBOMs: '搜索物品 (A001, B002) 或 BOM (BOM001)...',
    howManySets: '多少套？',
    setsOf: '这将创建 {count} 套 {name}',
    addBOM: '添加BOM ({count}项)',
    expandedFrom: '从BOM展开: {name}',
    viaBoM: '通过BOM: {code}'
  },

  // Logistics
  logistics: {
    title: '物流 - 库存盘点',
    description: '统计和跟踪物流区域的库存物品',
    role: '物流角色'
  },

  // Production
  production: {
    title: '生产 - 选择区域',
    selectZone: '生产区域选择',
    selectZoneDesc: '选择生产区域开始库存盘点',
    zoneTitle: '生产区域{zone} - 库存盘点',
    zoneDesc: '统计和跟踪生产区域{zone}的库存物品',
    backToZones: '返回区域选择',
    zone: '区域',
    role: '生产角色'
  },

  // Manager
  manager: {
    title: '管理员仪表板',
    description: '实时库存概览和分析',
    role: '管理员角色',
    inventoryDashboard: '增强型库存仪表板',
    activeSKUs: '活跃货号',
    logisticsTotal: '物流总计',
    productionTotal: '生产总计',
    activeZones: '活跃区域',
    lastUpdated: '最后更新',
    actions: '操作',
    showZones: '显示区域',
    hideZones: '隐藏区域',
    zoneBreakdown: '{sku}的生产区域明细',
    clearAllData: '清除所有数据',
    clearConfirm: '清除所有库存盘点？此操作无法撤销。',
    noData: '无库存数据',
    noResults: '未找到匹配"{searchTerm}"的物品',
    zoneDetails: '区域详情',
    hideZoneDetails: '隐藏区域详情',
    showZoneDetails: '显示区域详情'
  },

  // Statistics
  stats: {
    countRecords: '{count}个盘点记录',
    zones: '{count}个区域',
    items: '{count}个物品'
  },

  // Messages
  messages: {
    countSaved: '库存盘点保存成功',
    countFailed: '库存盘点保存失败',
    dataCleared: '所有库存数据已清除',
    clearFailed: '清除库存数据失败',
    productionTip: '在生产环境中，这些盘点数据会自动同步到Firebase',
    pleaseSelectSKU: '请选择货号',
    pleaseEnterValidAmount: '请输入有效数量',
    selectedItemNotFound: '找不到选择的物品'
  },

  // Transactions
  transactions: {
    title: '交易管理',
    description: '跟踪和管理库存交易',
    role: '交易管理',
    newTransaction: '新交易',
    transactionHistory: '交易历史',
    transactionType: '交易类型',
    fromLocation: '源位置',
    toLocation: '目标位置',
    reference: '参考',
    notes: '备注',
    performedBy: '执行人',
    approvedBy: '审批人',
    previousAmount: '之前数量',
    newAmount: '新数量',
    transactionDate: '交易日期',
    filterTransactions: '筛选交易',
    noTransactions: '未找到交易',
    createTransaction: '创建交易',
    viewDetails: '查看详情',
    approve: '审批',
    cancel: '取消',
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消',
    count: '库存盘点',
    transferIn: '转入',
    transferOut: '转出',
    adjustment: '调整',
    initialStock: '初始库存'
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya汽车技术 - 仓库管理系统',
    version: 'v{version} - {feature}'
  }
};

export default chineseTranslations;