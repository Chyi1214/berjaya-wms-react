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
    tip: '提示',
    scanToAccess: '扫码访问网站'
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
    scanIn: '扫描入库',
    monitorInventory: '监控库存',
    wasteLostDefect: '浪费/丢失/缺陷'
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
    noValidSKUFound: '未找到有效的 SKU。已尝试: {attempts}',
    scanInInventory: '扫描入库',
    itemScannedSuccessfully: '物品扫描成功',
    enterQuantity: '输入数量:',
    enterQuantityPlaceholder: '输入数量...',
    processing: '处理中...',
    barcodeScanner: '条码扫描器',
    scanItemBarcode: '扫描物品条码以添加到库存',
    manualItemEntry: '手动输入物品',
    searchItemsWhenScannerNotAvailable: '当扫描器不可用时搜索和选择物品',
    processItem: '处理物品',
    scanNextItem: '扫描下一个物品',
    pleaseEnterValidQuantity: '请输入有效数量',
    skuNotFoundInItemMaster: 'SKU {sku} 在主物料表中未找到。请先添加。',
    addedToExpectedTable: '已添加 {quantity} x {name} 到预期表 (总计: {total})',
    failedToSaveInventory: '保存库存失败。请重试。',
    failedToProcessScannedItem: '处理扫描物品失败',
    scanResult: '扫描结果',
    enterBarcodeManually: '当扫描器不可用时手动输入条码',
    enterBarcodeOrQRPlaceholder: '输入条码或二维码内容...',
    processEntry: '处理输入',
    smartSearch: '智能搜索',
    searchItemsNotAvailable: '当扫描不可用时搜索物品',
    // New scanner translations
    actionRequired: '需要操作！',
    scanNotComplete: '扫描成功，但未完成。请输入数量并点击下方的"添加到批次"。',
    sku: 'SKU:',
    name: '名称:',
    category: '类别:',
    zoneInformation: '区域信息:',
    noZoneInfo: '无可用区域信息',
    addToInventory: '添加到库存',
    enterQuantityToAdd: '输入要添加的数量:',
    targetBatch: '目标批次:',
    addToBatch: '添加到批次',
    adding: '添加中...',
    newScan: '新扫描',
    startScanning: '开始扫描'
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
    role: '生产角色',

    // Zone interface (new additions)
    noCarCurrentlyInZone: '区域内当前无车辆',
    readyForNextCar: '准备下一辆车',
    clickToScanNewCar: '点击扫描新车',
    clickToMarkWorkComplete: '点击标记工作完成',
    loadingZoneStatus: '加载区域状态...',
    tryAgain: '重试',
    updated: '已更新',

    // Action buttons
    tasks: '任务',
    reportIssue: '报告问题',
    inventory: '库存',
    receive: '接收',
    wasteAndLost: '浪费和丢失',
    reportActive: '报告激活'
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
      compared: '对比',
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
      hr: '人力资源',
      operations: '运营'
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
    failedToReject: '拒绝事务失败。请重试。',

    // Transaction types (missing keys)
    count: '盘点',
    adjustment: '调整',
    transferIn: '转入',
    transferOut: '转出',
    initialStock: '初始库存',

    // Additional actions
    filterTransactions: '筛选交易',
    createTransaction: '创建交易',
    viewDetails: '查看详情',
    approve: '批准',
    cancel: '取消'
  },

  // Translation Chat System
  translationChat: {
    title: '翻译聊天',
    description: '多语言沟通频道',
    channels: '翻译频道',
    selectChannel: '选择频道',
    channel: '频道',
    participants: '参与者',
    available: '可用',
    occupied: '已占用 ({count}/2 用户)',
    full: '已满 (2/2 用户)',
    joinChannel: '加入频道',
    leaveChannel: '离开频道',
    noChannelsAvailable: '无可用频道',
    channelJoined: '成功加入 {channel}',
    channelLeft: '已离开 {channel}',
    failedToJoin: '加入频道失败',
    failedToLeave: '离开频道失败',

    // Chat interface
    chatRoom: '聊天室',
    typeMessage: '输入您的消息...',
    sendMessage: '发送消息',
    connecting: '连接中...',
    connected: '已连接',
    disconnected: '已断开连接',
    noMessages: '暂无消息。开始对话吧！',
    originalText: '原文',
    translatedText: '翻译',
    sendingMessage: '发送中...',
    messageSent: '消息已发送',
    failedToSend: '发送消息失败',

    // Languages
    languages: {
      English: '英语',
      Malay: '马来语',
      Chinese: '中文',
      Myanmar: '缅甸语',
      Bengali: '孟加拉语'
    },

    // Channel status
    waitingForUser: '等待其他用户加入...',
    userJoined: '{user} 加入了频道',
    userLeft: '{user} 离开了频道',
    channelDescription: '最多2位用户可以聊天，并在不同语言之间自动翻译'
  },

  // QA (Quality Assurance) Inspection
  qa: {
    title: '质量保证',
    carInspection: '汽车检查',
    selectPositionAndScan: '选择您的位置，然后扫描VIN开始检查',
    scanVIN: '扫描VIN',
    enterVIN: '输入VIN',
    enterVINNumber: '输入VIN号码...',
    enterVINOrUseScanner: '输入VIN或使用扫描仪',
    startInspection: '开始检查',
    start: '开始',
    completeInspection: '完成检查',
    completeSection: '完成部分',
    backToDashboard: '返回仪表板',
    selectYourPosition: '选择您的位置',
    scanVINNumber: '扫描VIN号码',
    openCameraScanner: '打开相机扫描仪',
    scanVINBarcode: '扫描VIN条形码',
    position: '位置',
    step: '步骤',
    instructions: '说明',
    tip: '提示',
    tipText: '使用上面的相机扫描仪按钮，或手动输入VIN',
    loading: '加载中...',
    points: '点',

    // Instructions list
    instructionsList: {
      step1: '选择您的位置（您将检查的区域）',
      step2: '使用相机扫描仪扫描VIN或手动输入',
      step3: '逐项检查清单并标记每个项目',
      step4: '当您部分中的所有项目都检查完毕后完成'
    },

    // Sections
    sections: {
      rightOutside: '右外侧',
      leftOutside: '左外侧',
      frontBack: '前后',
      interiorRight: '内部右侧',
      interiorLeft: '内部左侧'
    },

    // Status
    status: {
      notStarted: '未开始',
      inProgress: '进行中',
      completed: '已完成'
    },

    // Checklist view
    checklist: {
      title: '检查清单',
      progress: '进度',
      itemsChecked: '已检查项目',
      defectType: '缺陷类型',
      notes: '备注',
      photos: '照片',
      addPhoto: '添加照片',
      addNotes: '添加备注',
      markAsComplete: '标记为完成',
      markAsDefect: '标记为缺陷',
      saveAndNext: '保存并下一个',
      previous: '上一个',
      next: '下一个',
      itemDetails: '项目详情',
      noPhotos: '未添加照片',
      uploadPhoto: '上传照片',
      takePhoto: '拍照',
      removePhoto: '删除照片',
      enterNotes: '输入备注...',
      selectDefectType: '选择缺陷类型...',

      // Additional defects feature
      markExtraIssues: '标记额外问题',
      tapDefectLocation: '点击您看到缺陷的位置',
      selectRelatedItem: '此缺陷与哪个项目相关？',
      additionalDefectsAdded: '已添加 {count} 个额外缺陷'
    },

    // Defect types
    defects: {
      notInstalled: '未正确安装',
      scratches: '划痕',
      paintDefect: '油漆缺陷',
      dent: '凹痕',
      gap: '间隙',
      ok: '正常',
      missing: '缺失',
      broken: '损坏',
      dirty: '脏污',
      crack: '裂缝'
    },

    // Messages
    messages: {
      pleaseSelectSection: '请先选择您的检查位置',
      inspectionCreated: '检查已创建',
      inspectionUpdated: '检查已更新',
      failedToSave: '保存失败。请重试。',
      allItemsChecked: '所有项目已检查',
      sectionComplete: '部分完成',
      inspectionComplete: '检查完成',
      confirmComplete: '确认所有项目都已正确检查？',
      confirmCompleteSection: '确认完成此部分？',
      invalidVIN: 'VIN无效',
      vinRequired: '需要VIN号码',
      photoRequired: '缺陷项目需要照片',
      notesRequired: '缺陷项目需要备注'
    },

    // Inspection info
    inspectionInfo: {
      vin: 'VIN号码',
      carType: '汽车类型',
      inspector: '检查员',
      inspectionDate: '检查日期',
      section: '部分',
      status: '状态',
      totalDefects: '总缺陷数',
      completedBy: '完成人',
      completedDate: '完成日期'
    }
  },

  // Footer
  footer: {
    copyright: '© 2025 Berjaya Autotech - 仓库管理系统',
    version: 'v{version} - {feature}'
  },

  // 废品/丢失/缺陷报告
  wasteLostDefectReport: {
    title: '报告物品',
    itemStatus: '物品状态',
    waste: '废品',
    lost: '丢失',
    defect: '缺陷',
    unplanned_usage: '計劃外用料',
    searchForItem: '搜索物品',
    searchPlaceholder: '输入物品SKU或名称...',
    quantity: '数量',
    currentStock: '当前库存',
    quantityExceedsStock: '数量超过可用库存！',
    basicReason: '基本原因',
    reasonPlaceholder: '简要描述...',

    // 照片证据
    photoEvidence: '照片证据',
    photoEvidenceRequired: '提交前必须上传',
    photoInstructions: '上传一次照片 - 它们将附加到此批次提交的所有物品。',
    labelPhoto: '标签照片',
    damagePhoto: '损坏照片',
    takePhotoOrUpload: '拍照或上传图片',
    labelPhotoHelp: '物品标签/零件号码',
    damagePhotoHelp: '实际损坏/缺陷',
    imageCompressed: '图片已压缩并准备就绪',
    compressingImage: '正在压缩图片...',

    // 批次选择
    selectBatch: '选择批次',
    selectBatchPrompt: '-- 选择批次 --',
    batchDefault: '默认',
    unitsAvailable: '个可用',
    validBatch: '有效 - 批次有',
    units: '个',
    quantityExceedsBatch: '数量超过批次分配！',

    // 缺陷详情
    claimReportDetails: '索赔报告详情',
    totalLotQuantity: '总批次数量',
    totalReceived: '总接收',
    shift: '班次',
    shiftPlaceholder: '例如，早班，A班',
    reasonForRejection: '拒绝原因',
    rejectionReasons: {
      defect: '缺陷（划痕、凹陷、裂纹等）',
      wrongDimension: '尺寸错误/不符合规格',
      missingComponent: '缺少部件',
      contamination: '污染（油、污垢、锈蚀等）'
    },
    others: '其他',
    specifyOtherReason: '指定其他原因...',
    detectedBy: '检测人',
    detectedByPlaceholder: '姓名/部门',
    actionTaken: '采取的行动',
    selectAction: '选择行动...',
    actions: {
      rework: '返工',
      scrap: '报废',
      returnToSupplier: '退回供应商',
      holdForInspection: '暂扣待进一步检查'
    },

    // 按钮
    addWasteItem: '添加废品物品',
    addLostItem: '添加丢失物品',
    addDefectItem: '添加缺陷物品',
    reportItems: '报告{count}个物品',
    cancel: '取消',
    backTo: '返回{location}',

    // 物品列表
    itemsToReport: '待报告物品',

    // 验证消息
    pleaseAddItem: '请至少添加一个物品',
    missingFields: '请填写以下必填字段：',
    itemSelection: '物品选择',
    validQuantity: '有效数量（必须大于0）',
    reason: '原因',
    labelPhotoRequired: '标签照片（必需）',
    damagePhotoRequired: '损坏照片（必需）',
    bothPhotosRequired: '提交前必须上传标签照片和损坏照片。',
    batchSelection: '批次选择',
    atLeastOneRejectionReason: '至少一个拒绝原因（复选框或自定义原因）',
    insufficientStock: '{sku} - {itemName}库存不足。可用：{available}个，尝试报告：{quantity}个。请调整数量或验证库存水平。',
    insufficientBatchStock: '{batch}库存不足。可用：{available}，尝试报告：{quantity}',

    // 成功消息
    successfullyReported: '成功从{location}报告：',
    wasteItems: '{count}个废品',
    lostItems: '{count}个丢失',
    defectItems: '{count}个缺陷物品',

    // 错误消息
    failedToSubmit: '提交失败',
    failedToUploadImages: '上传图片失败。请重试。',
    invalidImage: '无效图片',
    fileMustBeImage: '文件必须是图片',
    imageTooLarge: '图片必须小于20 MB'
  }
};

export default chineseTranslations;