/**
 * Master Canvas Internationalization (i18n)
 * 支持英文/中文双语切换
 */

const translations = {
  en: {
    // 顶部栏
    'app.title': 'Master Canvas',
    'project.untitled': 'Untitled film project canvas',
    'project.loadDemo': 'Load demo',
    'project.open': 'Open…',
    'project.save': 'Save',
    'project.export': 'Export',
    'project.undo': 'Undo',
    'project.newCanvas': 'New',
    'project.templates': 'Templates',
    'project.bible': 'Bible',
    'project.shots': 'Modules',
    'project.find': 'Find',
    'project.batch': 'Batch',
    'project.history': 'History',
    'project.key': 'Help',
    'project.resetView': 'Reset View',

    // 工具栏
    'tool.select': 'Cursor mode: select, lasso, connect, and move cards',
    'tool.hand': 'Hand mode: pan around the canvas without selecting cards',
    'tool.workflow': 'Image to Video workflow card',
    'tool.imageWorkflow': 'Generate Image workflow card',
    'tool.shot': 'Shot card',
    'tool.character': 'Character reference card',
    'tool.scene': 'Scene reference card',
    'tool.section': 'Movable scene section frame',
    'tool.placeholder': 'Missing asset placeholder',
    'tool.inspiration': 'Inspiration / prompt fragment card',
    'tool.styleRef': 'Video style/tone reference area',
    'tool.musicRef': 'Music/audio reference area',
    'tool.note': 'Text note',
    'tool.linkRef': 'Add link reference',
    'tool.upload': 'Upload files',

    // 资源面板
    'assets.title': 'Assets',
    'assets.count': '0 items',
    'assets.search': 'Search assets',
    'assets.size': 'Size',
    'assets.inbox': 'Inbox',
    'assets.favorites': 'Favorites',
    'assets.filter.all': 'All',
    'assets.filter.storyboard': 'Storyboard Images',
    'assets.filter.video': 'Video Generations',
    'assets.filter.music': 'Music',
    'assets.filter.style': 'Style References',
    'assets.archived': 'Show archived assets',

    // 卡片类型
    'card.workflow': 'Workflow',
    'card.image': 'Image',
    'card.shot': 'Shot',
    'card.character': 'Character',
    'card.scene': 'Scene Reference',
    'card.section': 'Section',
    'card.placeholder': 'Placeholder',
    'card.inspiration': 'Inspiration',
    'card.styleRef': 'Style Reference',
    'card.musicRef': 'Music Reference',
    'card.note': 'Note',
    'card.link': 'Link Reference',

    // 对话框
    'dialog.confirm': 'Confirm',
    'dialog.cancel': 'Cancel',
    'dialog.delete': 'Delete',
    'dialog.save': 'Save',
    'dialog.discard': 'Discard',

    // Toast 消息
    'toast.saved': 'Project saved',
    'toast.exported': 'Export complete',
    'toast.copied': 'Copied to clipboard',
    'toast.error': 'An error occurred',

    // 帮助
    'help.title': 'Help',
    'help.shortcuts': 'Keyboard Shortcuts',
    'help.about': 'About Master Canvas',

    // 导出选项
    'export.title': 'Export Options',
    'export.markdown': 'Markdown',
    'export.json': 'JSON',
    'export.html': 'HTML Storyboard',
    'export.zip': 'ZIP Package',
    'export.includeAssets': 'Include assets',
    'export.includePrompts': 'Include prompts',

    // 版本历史
    'history.title': 'Version History',
    'history.save': 'Save checkpoint',
    'history.restore': 'Restore',
    'history.delete': 'Delete',
    'history.noVersions': 'No checkpoints yet',

    // 批处理
    'batch.title': 'Batch Edit',
    'batch.selected': 'selected cards',
    'batch.delete': 'Delete selected',
    'batch.move': 'Move to canvas',
    'batch.tag': 'Add tag',
  },

  zh: {
    // 顶部栏
    'app.title': 'Master Canvas｜影视项目总控创作画布',
    'project.untitled': '未命名影视项目画布',
    'project.loadDemo': '加载示例',
    'project.open': '打开',
    'project.save': '保存',
    'project.export': '导出',
    'project.undo': '撤销',
    'project.newCanvas': '新建',
    'project.templates': '模板',
    'project.bible': '圣经',
    'project.shots': '模块导航',
    'project.find': '查找',
    'project.batch': '批量编辑',
    'project.history': '历史',
    'project.key': '帮助',
    'project.resetView': '重置视图',

    // 工具栏
    'tool.select': '选择模式：选择、套索、连接和移动卡片',
    'tool.hand': '手型模式：在不选择卡片的情况下平移画布',
    'tool.workflow': '图生视频工作流卡片',
    'tool.imageWorkflow': '生图工作流卡片',
    'tool.shot': '镜头卡片',
    'tool.character': '角色参考卡片',
    'tool.scene': '场景参考卡片',
    'tool.section': '可移动场景分区框',
    'tool.placeholder': '缺失资产占位符',
    'tool.inspiration': '灵感/提示词碎片卡片',
    'tool.styleRef': '视频风格/调性参考区域',
    'tool.musicRef': '音乐/音频参考区域',
    'tool.note': '文本笔记',
    'tool.linkRef': '添加链接参考',
    'tool.upload': '上传文件',

    // 资源面板
    'assets.title': '资源',
    'assets.count': '0 个项目',
    'assets.search': '搜索资源',
    'assets.size': '大小',
    'assets.inbox': '收件箱',
    'assets.favorites': '收藏',
    'assets.filter.all': '全部',
    'assets.filter.storyboard': '分镜图片',
    'assets.filter.video': '视频生成',
    'assets.filter.music': '音乐',
    'assets.filter.style': '风格参考',
    'assets.archived': '显示归档资源',

    // 卡片类型
    'card.workflow': '工作流',
    'card.image': '图片',
    'card.shot': '镜头',
    'card.character': '角色',
    'card.scene': '场景参考',
    'card.section': '分区',
    'card.placeholder': '占位符',
    'card.inspiration': '灵感',
    'card.styleRef': '风格参考',
    'card.musicRef': '音乐参考',
    'card.note': '笔记',
    'card.link': '链接参考',

    // 对话框
    'dialog.confirm': '确认',
    'dialog.cancel': '取消',
    'dialog.delete': '删除',
    'dialog.save': '保存',
    'dialog.discard': '放弃',

    // Toast 消息
    'toast.saved': '项目已保存',
    'toast.exported': '导出完成',
    'toast.copied': '已复制到剪贴板',
    'toast.error': '发生错误',

    // 帮助
    'help.title': '帮助',
    'help.shortcuts': '快捷键',
    'help.about': '关于主画布',

    // 导出选项
    'export.title': '导出选项',
    'export.markdown': 'Markdown',
    'export.json': 'JSON',
    'export.html': 'HTML 故事板',
    'export.zip': 'ZIP 包',
    'export.includeAssets': '包含资源',
    'export.includePrompts': '包含提示词',

    // 版本历史
    'history.title': '版本历史',
    'history.save': '保存检查点',
    'history.restore': '恢复',
    'history.delete': '删除',
    'history.noVersions': '暂无检查点',

    // 批处理
    'batch.title': '批量编辑',
    'batch.selected': '已选卡片',
    'batch.delete': '删除选中',
    'batch.move': '移动到画布',
    'batch.tag': '添加标签',
  }
};

// 获取当前语言
function getCurrentLang() {
  return localStorage.getItem('master-canvas-lang') ||
         (navigator.language?.startsWith('zh') ? 'zh' : 'en');
}

// 设置语言
function setLang(lang) {
  localStorage.setItem('master-canvas-lang', lang);
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

// 翻译函数
function t(key) {
  const lang = getCurrentLang();
  return translations[lang]?.[key] || translations['en'][key] || key;
}

// 翻译所有带 data-i18n 属性的元素
function translatePage() {
  const lang = getCurrentLang();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang]?.[key]) {
      el.textContent = translations[lang][key];
    }
  });

  // 更新语言切换器状态
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

// 更新按钮文本
function updateButtonLabels() {
  const lang = getCurrentLang();
  const labels = {
    'loadDemoBtn': 'project.loadDemo',
    'openProjectBtn': 'project.open',
    'undoBtn': 'project.undo',
    'newCanvasBtn': 'project.newCanvas',
    'templatesBtn': 'project.templates',
    'continuityBtn': 'project.bible',
    'shotListBtn': 'project.shots',
    'searchCanvasBtn': 'project.find',
    'batchEditBtn': 'project.batch',
    'versionsBtn': 'project.history',
    'helpBtn': 'project.key',
    'saveProjectBtn': 'project.save',
    'exportBtn': 'project.export',
  };

  for (const [id, key] of Object.entries(labels)) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = t(key);
    }
  }
}

// 初始化 i18n
function initI18n() {
  // 监听语言变化
  window.addEventListener('langchange', () => {
    translatePage();
    updateButtonLabels();
  });

  // 默认设置为中文（强制）
  const savedLang = localStorage.getItem('master-canvas-lang');
  if (!savedLang || savedLang === 'en') {
    localStorage.setItem('master-canvas-lang', 'zh');
  }

  // 初始翻译
  translatePage();
  updateButtonLabels();
}

// 导出给全局使用
window.t = t;
window.setLang = setLang;
window.getCurrentLang = getCurrentLang;
window.initI18n = initI18n;
