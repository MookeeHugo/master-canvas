const STORAGE_KEY = "master-canvas-project-v1";
const PROJECTS_KEY = "master-canvas-projects-v1";
const ACTIVE_PROJECT_KEY = "master-canvas-active-project-v1";
const PROJECT_KEY_PREFIX = "master-canvas-project-v1:";
const HELP_POSITION_KEY = "master-canvas-help-position-v1";
const PANEL_LAYOUT_KEY = "master-canvas-panel-layout-v1";
const ASSET_SIZE_KEY = "master-canvas-asset-size-v1";
const ACTIVE_TOOL_KEY = "master-canvas-active-tool-v1";
const VERSIONS_KEY_PREFIX = "master-canvas-versions-v1:";
const DB_NAME = "master-canvas-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";
const UNDO_LIMIT = 60;

const els = {
  projectTitle: document.querySelector("#projectTitle"),
  canvasSelect: document.querySelector("#canvasSelect"),
  loadDemoBtn: document.querySelector("#loadDemoBtn"),
  openProjectBtn: document.querySelector("#openProjectBtn"),
  projectOpenInput: document.querySelector("#projectOpenInput"),
  undoBtn: document.querySelector("#undoBtn"),
  newCanvasBtn: document.querySelector("#newCanvasBtn"),
  templatesBtn: document.querySelector("#templatesBtn"),
  continuityBtn: document.querySelector("#continuityBtn"),
  shotListBtn: document.querySelector("#shotListBtn"),
  searchCanvasBtn: document.querySelector("#searchCanvasBtn"),
  batchEditBtn: document.querySelector("#batchEditBtn"),
  versionsBtn: document.querySelector("#versionsBtn"),
  helpBtn: document.querySelector("#helpBtn"),
  saveProjectBtn: document.querySelector("#saveProjectBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  resetViewBtn: document.querySelector("#resetViewBtn"),
  addReferenceBtn: document.querySelector("#addReferenceBtn"),
  openFileBtn: document.querySelector("#openFileBtn"),
  fileInput: document.querySelector("#fileInput"),
  nodeFileInput: document.querySelector("#nodeFileInput"),
  assetSearch: document.querySelector("#assetSearch"),
  assetGrid: document.querySelector("#assetGrid"),
  assetTypeFilters: document.querySelector("#assetTypeFilters"),
  assetSizeBtn: document.querySelector("#assetSizeBtn"),
  assetResizeHandle: document.querySelector("#assetResizeHandle"),
  assetCount: document.querySelector("#assetCount"),
  showInboxBtn: document.querySelector("#showInboxBtn"),
  showFavoritesBtn: document.querySelector("#showFavoritesBtn"),
  toggleArchivedBtn: document.querySelector("#toggleArchivedBtn"),
  viewport: document.querySelector("#canvasViewport"),
  world: document.querySelector("#canvasWorld"),
  nodeLayer: document.querySelector("#nodeLayer"),
  linkLayer: document.querySelector("#linkLayer"),
  lassoBox: document.querySelector("#lassoBox"),
  minimap: document.querySelector("#minimap"),
  minimapSvg: document.querySelector("#minimapSvg"),
  inspector: document.querySelector("#inspector"),
  inspectorResizeHandle: document.querySelector("#inspectorResizeHandle"),
  shotListPanel: document.querySelector("#shotListPanel"),
  shotListCloseBtn: document.querySelector("#shotListCloseBtn"),
  shotListContent: document.querySelector("#shotListContent"),
  searchPanel: document.querySelector("#searchPanel"),
  searchCloseBtn: document.querySelector("#searchCloseBtn"),
  canvasSearchInput: document.querySelector("#canvasSearchInput"),
  clearCanvasSearchBtn: document.querySelector("#clearCanvasSearchBtn"),
  exportDialog: document.querySelector("#exportDialog"),
  helpPanel: document.querySelector("#helpPanel"),
  helpDragHandle: document.querySelector("#helpDragHandle"),
  helpCloseBtn: document.querySelector("#helpCloseBtn"),
  exportText: document.querySelector("#exportText"),
  downloadMarkdownBtn: document.querySelector("#downloadMarkdownBtn"),
  downloadStoryboardBtn: document.querySelector("#downloadStoryboardBtn"),
  downloadStoryboardPdfBtn: document.querySelector("#downloadStoryboardPdfBtn"),
  downloadJsonBtn: document.querySelector("#downloadJsonBtn"),
  downloadHandoffZipBtn: document.querySelector("#downloadHandoffZipBtn"),
  continuityDialog: document.querySelector("#continuityDialog"),
  continuityCharacters: document.querySelector("#continuityCharacters"),
  continuityWardrobe: document.querySelector("#continuityWardrobe"),
  continuityLocations: document.querySelector("#continuityLocations"),
  continuityProps: document.querySelector("#continuityProps"),
  continuityStyleRules: document.querySelector("#continuityStyleRules"),
  continuityNeverChange: document.querySelector("#continuityNeverChange"),
  saveContinuityBtn: document.querySelector("#saveContinuityBtn"),
  templatesDialog: document.querySelector("#templatesDialog"),
  templatesList: document.querySelector("#templatesList"),
  referenceDialog: document.querySelector("#referenceDialog"),
  referenceType: document.querySelector("#referenceType"),
  referenceTitle: document.querySelector("#referenceTitle"),
  referenceUrl: document.querySelector("#referenceUrl"),
  referenceNotes: document.querySelector("#referenceNotes"),
  saveReferenceBtn: document.querySelector("#saveReferenceBtn"),
  batchDialog: document.querySelector("#batchDialog"),
  batchCountLabel: document.querySelector("#batchCountLabel"),
  batchStatus: document.querySelector("#batchStatus"),
  batchTags: document.querySelector("#batchTags"),
  applyBatchBtn: document.querySelector("#applyBatchBtn"),
  versionsDialog: document.querySelector("#versionsDialog"),
  versionName: document.querySelector("#versionName"),
  saveVersionBtn: document.querySelector("#saveVersionBtn"),
  versionsList: document.querySelector("#versionsList"),
};

const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

let db;
let saveTimer;
let state = createDefaultProject();
let projects = [];
let allAssets = [];
let dragState = null;
let panState = null;
let lassoState = null;
let helpDragState = null;
let connectState = null;
let pendingNodeFileId = "";
let undoStack = [];
let resizeState = null;
let suppressNextNodeClick = false;
let isSpacePanning = false;
let inspectorOpen = true;
let panelLayout = { assetWidth: 360, inspectorWidth: 380 };
let assetSizeMode = ["small", "medium", "large"].includes(localStorage.getItem(ASSET_SIZE_KEY)) ? localStorage.getItem(ASSET_SIZE_KEY) : "medium";
let activeTool = ["select", "hand"].includes(localStorage.getItem(ACTIVE_TOOL_KEY)) ? localStorage.getItem(ACTIVE_TOOL_KEY) : "select";
let canvasSearch = "";
let assetFilters = {
  search: "",
  type: "all",
  favoritesOnly: false,
  inboxOnly: false,
  showArchived: false,
};

const STATUS_LABELS = {
  draft: "草稿",
  ready: "可执行",
  review: "待审",
  approved: "已通过",
  blocked: "阻塞",
  candidate: "候选",
  winner: "最终版",
  rejected: "废弃",
  "needs revision": "需修改",
};

const NEED_LABELS = {
  image: "图片",
  video: "视频",
  music: "音乐",
  sound: "声音",
  style: "风格",
  text: "文案",
  approval: "审批",
};

const MODULE_NAV_LABELS = {
  script: "剧本",
  character: "角色",
  scene: "场景",
  storyboard: "分镜",
  schedule: "拍摄",
  sound: "声音",
  delivery: "交付",
  general: "总控",
};

const NAVIGABLE_NODE_TYPES = new Set([
  "section",
  "note",
  "scene",
  "shot",
  "workflow",
  "imageWorkflow",
  "character",
  "placeholder",
  "inspiration",
  "styleRef",
  "musicRef",
  "media",
]);

function statusLabel(value = "draft") {
  return STATUS_LABELS[value] || value || "草稿";
}

function needLabel(value = "") {
  return NEED_LABELS[value] || value || "待补";
}

function safeFileName(value = "master-canvas-project") {
  return String(value || "master-canvas-project")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "master-canvas-project";
}

function createDefaultProject() {
  return {
    id: uid("project"),
    title: "未命名影视项目画布",
    createdAt: now(),
    updatedAt: now(),
    view: { x: 520, y: 230, scale: 0.9 },
    selectedNodeId: null,
    selectedNodeIds: [],
    selectedAssetId: null,
    continuity: defaultContinuity(),
    assets: [],
    nodes: [],
  };
}

function defaultContinuity() {
  return {
    characters: "",
    wardrobe: "",
    locations: "",
    props: "",
    styleRules: "",
    neverChange: "",
  };
}

function seedProject() {
  state.nodes = [
    makeNode("note", -420, -110, {
      title: "项目脊柱",
      notes: "把剧本节拍、关键参考、导演决策和待交付节点集中到这张画布上。",
    }),
    makeNode("character", -80, -180, {
      title: "角色参考",
      notes: "记录角色脸部、服装、表演状态和连续性注意事项。",
      tags: "角色, 连续性",
    }),
    makeNode("scene", -80, 80, {
      title: "场景参考",
      notes: "收集地点、色彩、灯光、镜头和调度参考。",
      tags: "场景, 视觉开发",
    }),
    makeNode("workflow", 340, -40, {
      title: "图生视频工作流",
      prompt: "固定机位，人物在画面中完成动作，保持角色与场景连续性。",
      status: "ready",
      tags: "镜头, 动态",
    }),
  ];
  setSelectedNodeIds([state.nodes[3].id]);
}

function makeNode(type, x, y, overrides = {}) {
  const defaultWidth =
    type === "section" ? 760 :
    type === "workflow" || type === "imageWorkflow" || type === "shot" ? 330 :
    type === "placeholder" || type === "character" || type === "scene" || type === "styleRef" || type === "musicRef" ? 300 :
    290;
  const base = {
    id: uid("node"),
    type,
    x,
    y,
    w: defaultWidth,
    h: type === "section" ? 440 : 180,
    title: nodeTypeLabel(type),
    notes: "",
    tags: "",
    status: type === "workflow" || type === "imageWorkflow" ? "ready" : "draft",
    provider: type === "imageWorkflow" ? "ComfyUI" : "Kling",
    model: type === "imageWorkflow" ? "SDXL / Flux" : "Kling 3.0 Pro",
    aspectRatio: "16:9",
    resolution: "1080p",
    duration: "10s",
    seed: "",
    prompt: "",
    negativePrompt: "",
    startAssetId: "",
    endAssetId: "",
    assetId: "",
    referenceAssetId: "",
    referenceUrl: "",
    sourceNodeId: "",
    neededFor: "",
    assignedSectionId: "",
    linkSourceSide: "right",
    linkTargetSide: "left",
    overallPrompt: "",
    stylePrompt: "",
    musicPrompt: "",
    shotSize: "",
    cameraAngle: "",
    cameraMovement: "",
    subjectAction: "",
    location: "",
    mood: "",
    lighting: "",
    lensFeel: "",
    priority: "normal",
    shotOrderLabel: "",
    shotBeatTitle: "",
    globalShotOrder: "",
    influenceColor: "",
    influencePacing: "",
    influenceCamera: "",
    influenceLighting: "",
    influenceUse: "",
    influenceStrength: "medium",
    doNotCopy: "",
    reviewOwner: "",
    reviewDecision: "",
    reviewNotes: "",
    attempts: [],
    createdAt: now(),
    updatedAt: now(),
  };
  return { ...base, ...overrides };
}

function nodeTypeLabel(type) {
  const labels = {
    workflow: "图生视频",
    imageWorkflow: "生图工作流",
    shot: "镜头卡",
    character: "角色卡",
    scene: "场景卡",
    section: "制作模块",
    placeholder: "待补项",
    inspiration: "灵感卡",
    styleRef: "影像风格参考",
    musicRef: "音乐 / 声音参考",
    note: "文字备注",
    media: "素材",
  };
  return labels[type] || "卡片";
}

function isWorkflowNode(node) {
  return node && (node.type === "workflow" || node.type === "imageWorkflow");
}

function versionStorageKey(projectId = state.id) {
  return `${VERSIONS_KEY_PREFIX}${projectId}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbTransaction(mode = "readonly") {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function getAllAssets() {
  return new Promise((resolve, reject) => {
    const request = dbTransaction().getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function putAsset(asset) {
  return new Promise((resolve, reject) => {
    const request = dbTransaction("readwrite").put(asset);
    request.onsuccess = () => resolve(asset);
    request.onerror = () => reject(request.error);
  });
}

async function boot() {
  db = await openDb();
  allAssets = await getAllAssets();
  state.assets = allAssets;
  migrateLegacyProject();
  projects = readProjectsIndex();
  const importUrl = new URLSearchParams(window.location.search).get("import");
  if (importUrl) {
    await importPackageFromManifest(importUrl);
    history.replaceState(null, "", window.location.pathname);
  } else if (projects.length) {
    loadProject(localStorage.getItem(ACTIVE_PROJECT_KEY) || projects[0].id);
  } else if (!state.nodes.length) {
    seedProject();
    persistProjectState();
  }
  els.projectTitle.value = state.title;
  restorePanelLayout();
  wireEvents();
  window.initI18n?.();
  setActiveTool(activeTool, false);
  restoreHelpPanelPosition();
  render();
  const openedStartupFile = await wireDesktopOpenFileHandlers();
  exposeSmokeState();
  if (!openedStartupFile) toast("本地画布已就绪");
}

function readProjectsIndex() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeProjectsIndex(nextProjects = projects) {
  projects = nextProjects
    .filter((project) => project && project.id)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function projectStorageKey(id) {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

function migrateLegacyProject() {
  if (localStorage.getItem(PROJECTS_KEY) || !localStorage.getItem(STORAGE_KEY)) return;
  try {
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const migrated = {
      ...createDefaultProject(),
      ...legacy,
      id: legacy.id || uid("project"),
      updatedAt: legacy.updatedAt || now(),
    };
    localStorage.setItem(projectStorageKey(migrated.id), JSON.stringify(serializeProject(migrated)));
    writeProjectsIndex([{ id: migrated.id, title: migrated.title, updatedAt: migrated.updatedAt }]);
    localStorage.setItem(ACTIVE_PROJECT_KEY, migrated.id);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadProject(projectId) {
  const saved = localStorage.getItem(projectStorageKey(projectId));
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved);
    const loaded = { ...createDefaultProject(), ...parsed, id: parsed.id || projectId };
    loaded.continuity = { ...defaultContinuity(), ...(parsed.continuity || {}) };
    loaded.nodes = (loaded.nodes || []).map(normalizeNode);
    state = loaded;
    allAssets = mergeAssets(parsed.assets || [], allAssets);
    state.assets = allAssets;
    localStorage.setItem(ACTIVE_PROJECT_KEY, state.id);
    return true;
  } catch {
    return false;
  }
}

function normalizeNode(node) {
  return {
    ...makeNode(node.type || "note", node.x || 0, node.y || 0),
    ...node,
    attempts: Array.isArray(node.attempts) ? node.attempts : [],
  };
}

function getSceneKey(node, visited = new Set()) {
  if (!node || visited.has(node.id)) return "";
  visited.add(node.id);
  const direct = extractSceneKey(node);
  if (direct) return direct;
  if (node.sourceNodeId) {
    const source = state.nodes.find((item) => item.id === node.sourceNodeId);
    const sourceKey = getSceneKey(source, visited);
    if (sourceKey) return sourceKey;
  }
  const headers = state.nodes
    .filter((item) => item.type === "scene" || item.type === "shot" || item.type === "section")
    .sort((a, b) => b.y - a.y || b.x - a.x);
  return headers.find((header) => header.y <= node.y + 80)?.title || "";
}

function extractSceneKey(node) {
  const text = `${node.title || ""} ${node.tags || ""}`.trim();
  const sceneMatch = text.match(/\bscene\s*0*(\d+)\b/i);
  if (sceneMatch) return `Scene ${Number(sceneMatch[1])}`;
  if (node.type === "scene" || node.type === "shot" || node.type === "section") return node.title || "";
  return "";
}

function sortNodesByCanvasOrder(a, b) {
  const rowA = Math.round((a.y || 0) / 80);
  const rowB = Math.round((b.y || 0) / 80);
  return rowA - rowB || (a.x || 0) - (b.x || 0);
}

function sceneNumberFromKey(sceneKey) {
  const match = String(sceneKey).match(/Scene\s+(\d+)/i);
  return match ? match[1] : "";
}

async function manifestExists(manifestUrl) {
  try {
    const response = await fetch(manifestUrl, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function clearAssetsStore() {
  return new Promise((resolve, reject) => {
    const request = dbTransaction("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function importPackageFromManifest(manifestUrl) {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Could not load import manifest: ${manifestUrl}`);
  const manifest = await response.json();
  state = createDefaultProject();
  state.title = manifest.title || "导入的影视项目前期画布";
  state.view = manifest.view || { x: 140, y: 140, scale: 0.62 };
  state.assets = allAssets;
  state.nodes = [];

  const importedByUrl = new Map();
  for (const group of manifest.groups || []) {
    for (const item of group.files || []) {
      let asset = allAssets.find((existing) => existing.name === item.name);
      if (!asset) {
        asset = await createAssetFromUrl(item.url, {
          name: item.name,
          tags: [group.name, item.role, item.tags].filter(Boolean).join(", "),
        });
        await putAsset(asset);
        allAssets.push(asset);
      }
      importedByUrl.set(item.url, asset);
    }
  }
  state.assets = allAssets;

  layoutImportedPackage(manifest, importedByUrl);
  persistProjectState();
}

async function createAssetFromUrl(url, meta = {}) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not import asset: ${url}`);
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    id: uid("asset"),
    name: meta.name || decodeURIComponent(url.split("/").pop() || "导入素材"),
    type: blob.type.startsWith("video/") ? "video" : "image",
    mime: blob.type || "application/octet-stream",
    size: blob.size,
    dataUrl,
    createdAt: now(),
    updatedAt: now(),
        favorite: false,
        archived: false,
        inbox: false,
        tags: meta.tags || "",
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function layoutImportedPackage(manifest, importedByUrl) {
  const rowGap = 420;
  const cardW = 250;
  const mediaW = 250;
  const mediaH = 178;
  let y = -760;
  let lastSceneNodeId = "";

  for (const group of manifest.groups || []) {
    const groupAssets = (group.files || []).map((item) => importedByUrl.get(item.url)).filter(Boolean);
    const isTextCard = group.type === "text-card";
    const header = makeNode(isTextCard ? "shot" : "scene", -1180, y, {
      title: group.name,
      notes: group.notes || "",
      status: isTextCard ? "ready" : "draft",
      tags: group.type || "scene",
      w: cardW,
    });
    state.nodes.push(header);

    const mediaNodes = [];
    groupAssets.forEach((asset, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const node = makeNode("media", -860 + col * 285, y + row * 215, {
        title: asset.name,
        assetId: asset.id,
        notes: asset.tags,
        tags: group.name,
        w: mediaW,
        h: mediaH,
        sourceNodeId: header.id,
      });
      state.nodes.push(node);
      mediaNodes.push(node);
    });

    if (isTextCard && mediaNodes[0]) {
      const note = group.name.includes("Ending") ? "Ending title card" : "Text card between Scene 4 and Scene 5";
      const workflow = makeNode("workflow", 360, y + 18, {
        title: `${group.name} Hold`,
        sourceNodeId: mediaNodes[0].id,
        startAssetId: mediaNodes[0].assetId,
        prompt: "Hold on the text card long enough to read clearly. Keep the composition stable and preserve the typography.",
        notes: note,
        tags: "text card, title",
        duration: group.name.includes("Ending") ? "5s" : "4s",
        status: "ready",
      });
      state.nodes.push(workflow);
      lastSceneNodeId = workflow.id;
    } else if (mediaNodes.length) {
      const workflow = makeNode("workflow", 360, y + 18, {
        title: `${group.name} Image to Video`,
        sourceNodeId: mediaNodes[0].id,
        startAssetId: mediaNodes[0].assetId,
        endAssetId: mediaNodes.at(-1)?.assetId || "",
        prompt: group.prompt || "Animate this scene with clean continuity, stable character identity, and motivated camera movement.",
        notes: `Primary workflow placeholder for ${group.name}.`,
        tags: `${group.name}, image-to-video`,
        status: "ready",
      });
      state.nodes.push(workflow);
      lastSceneNodeId = workflow.id;
    }

    y += rowGap + Math.max(0, Math.ceil(groupAssets.length / 4) - 1) * 215;
  }

  const summary = makeNode("note", 740, -760, {
    title: "素材包已导入",
    notes: `已从 ${manifest.title} 导入 ${state.assets.length} 项素材。场景按从上到下排列，每行包含素材卡和可继续填写的图生视频工作流占位卡。`,
    tags: "import, guide",
    status: "ready",
    w: 310,
    sourceNodeId: lastSceneNodeId,
  });
  state.nodes.push(summary);
  setSelectedNodeIds([summary.id]);
}

function saveProject(showToast = false) {
  state.title = els.projectTitle.value.trim() || "未命名影视项目画布";
  state.updatedAt = now();
  persistProjectState();
  if (showToast) {
    toast("已保存到本机项目库");
    void saveProjectFile();
  }
}

function persistProjectState() {
  state.updatedAt = state.updatedAt || now();
  localStorage.setItem(projectStorageKey(state.id), JSON.stringify(serializeProject(state)));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeProject(state)));
  localStorage.setItem(ACTIVE_PROJECT_KEY, state.id);
  upsertProjectIndex(state);
  renderProjectSelect();
}

function serializeProject(project) {
  return {
    ...project,
    assets: (project.assets || []).map(({ dataUrl, ...asset }) => asset),
  };
}

function mergeAssets(projectAssets = [], indexedAssets = allAssets) {
  const merged = new Map();
  indexedAssets.forEach((asset) => {
    if (asset?.id) merged.set(asset.id, asset);
  });
  projectAssets.forEach((asset) => {
    if (!asset?.id) return;
    const backing = merged.get(asset.id) || {};
    merged.set(asset.id, {
      ...backing,
      ...asset,
      dataUrl: asset.dataUrl || backing.dataUrl || "",
    });
  });
  return [...merged.values()];
}

async function saveProjectFile() {
  const payload = JSON.stringify(exportProject(), null, 2);
  const filename = `${safeFileName(state.title)}.mastercanvas`;
  const bridge = window.TauriBridge;

  if (bridge && (await bridge.init?.())) {
    const outputPath = await bridge.showSaveDialog?.({
      title: "保存 Master Canvas 项目",
      defaultPath: filename,
      filters: [
        { name: "Master Canvas 项目", extensions: ["mastercanvas"] },
        { name: "JSON 项目", extensions: ["json"] },
      ],
    });
    if (!outputPath) return;
    const savedPath = await bridge.writeTextFile?.(outputPath, payload);
    toast(savedPath ? `项目文件已保存：${savedPath}` : "项目文件保存失败");
    return;
  }

  downloadText(payload, filename, "application/json");
  toast("项目文件已下载，可离线备份或转交给协作者");
}

async function openProjectFile() {
  const bridge = window.TauriBridge;
  if (bridge && (await bridge.init?.())) {
    const selected = await bridge.showOpenDialog?.({
      title: "打开 Master Canvas 项目",
      multiple: false,
      filters: [
        { name: "Master Canvas 项目", extensions: ["mastercanvas", "mcproject", "json"] },
      ],
    });
    const filePath = Array.isArray(selected) ? selected[0] : selected;
    if (!filePath) return;
    const content = await bridge.readTextFile?.(filePath);
    if (!content) {
      toast("无法读取项目文件");
      return;
    }
    importProjectFromText(content, filePath);
    return;
  }

  els.projectOpenInput?.click();
}

async function wireDesktopOpenFileHandlers() {
  const bridge = window.TauriBridge;
  if (!bridge?.init || !(await bridge.init())) return false;

  await bridge.onOpenProjectFile?.((filePath) => {
    void openDesktopProjectPath(filePath);
  });

  const pendingPath = await bridge.takePendingOpenFile?.();
  if (!pendingPath) return false;
  await openDesktopProjectPath(pendingPath);
  return true;
}

async function openDesktopProjectPath(filePath) {
  const bridge = window.TauriBridge;
  if (!filePath || !bridge?.readTextFile) return false;
  const content = await bridge.readTextFile(filePath);
  if (!content) {
    toast("无法读取关联的项目文件");
    return false;
  }
  importProjectFromText(content, filePath);
  return true;
}

async function openBrowserProjectFile() {
  const file = els.projectOpenInput?.files?.[0];
  if (!file) return;
  try {
    importProjectFromText(await file.text(), file.name);
  } finally {
    els.projectOpenInput.value = "";
  }
}

function importProjectFromText(content, sourceLabel = "项目文件") {
  try {
    const parsed = JSON.parse(String(content || "").replace(/^\uFEFF/, ""));
    saveProject(false);
    state = normalizeImportedProject(parsed);
    allAssets = mergeAssets(state.assets, allAssets);
    state.assets = allAssets;
    undoStack = [];
    setSelectedNodeIds([state.nodes[0]?.id].filter(Boolean));
    state.selectedAssetId = null;
    els.projectTitle.value = state.title;
    persistProjectState();
    render();
    toast(`已打开：${sourceLabel}`);
  } catch (error) {
    console.error(error);
    toast("无法打开项目文件：请确认是 Master Canvas JSON");
  }
}

function normalizeImportedProject(parsed) {
  if (Array.isArray(parsed.nodes)) {
    const project = {
      ...createDefaultProject(),
      ...parsed,
      id: parsed.id || uid("project"),
      title: parsed.title || parsed.name || "导入的影视项目画布",
      createdAt: parsed.createdAt || now(),
      updatedAt: now(),
      continuity: { ...defaultContinuity(), ...(parsed.continuity || {}) },
      assets: Array.isArray(parsed.assets) ? parsed.assets.map(normalizeAsset) : [],
      nodes: parsed.nodes.map(normalizeNode),
    };
    return project;
  }

  if (Array.isArray(parsed.canvases)) {
    const canvas = parsed.canvases.find((item) => item.id === parsed.activeCanvasId) || parsed.canvases[0] || {};
    const cards = Array.isArray(canvas.cards) ? canvas.cards : [];
    return {
      ...createDefaultProject(),
      id: parsed.id || uid("project"),
      title: parsed.name || canvas.name || "导入的影视项目画布",
      createdAt: parsed.createdAt || now(),
      updatedAt: now(),
      view: {
        x: Number(canvas.panX ?? canvas.pan_x ?? 520),
        y: Number(canvas.panY ?? canvas.pan_y ?? 230),
        scale: Number(canvas.zoom || 0.9),
      },
      nodes: cards.map((card, index) =>
        makeNode(card.cardType || card.card_type || card.type || "note", Number(card.x || index * 320), Number(card.y || 0), {
          title: card.title || `导入卡片 ${index + 1}`,
          notes: card.content || card.notes || "",
          prompt: card.prompt || "",
          negativePrompt: card.negativePrompt || card.negative_prompt || "",
          tags: Array.isArray(card.tags) ? card.tags.join(", ") : card.tags || "",
          w: Number(card.width || card.w || 270),
          h: Number(card.height || card.h || 180),
          metadata: card.metadata || {},
        }),
      ),
    };
  }

  throw new Error("Unsupported project shape");
}

function normalizeAsset(asset) {
  return {
    id: asset.id || uid("asset"),
    name: asset.name || "未命名资源",
    type: asset.type || "reference-link",
    mime: asset.mime || "application/octet-stream",
    size: Number(asset.size || 0),
    dataUrl: asset.dataUrl || "",
    externalUrl: asset.externalUrl || "",
    createdAt: asset.createdAt || now(),
    updatedAt: asset.updatedAt || now(),
    favorite: Boolean(asset.favorite),
    archived: Boolean(asset.archived),
    inbox: Boolean(asset.inbox),
    tags: asset.tags || "",
    notes: asset.notes || "",
  };
}

function upsertProjectIndex(project) {
  const withoutCurrent = projects.filter((item) => item.id !== project.id);
  writeProjectsIndex([
    { id: project.id, title: project.title, updatedAt: project.updatedAt || now() },
    ...withoutCurrent,
  ]);
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveProject(false), 220);
}

function recordUndo() {
  undoStack.push(JSON.stringify(serializeProject(state)));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  updateUndoButton();
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  clearTimeout(saveTimer);
  const parsed = JSON.parse(snapshot);
  state = { ...createDefaultProject(), ...parsed, id: parsed.id || state.id };
  state.continuity = { ...defaultContinuity(), ...(parsed.continuity || {}) };
  state.nodes = (state.nodes || []).map(normalizeNode);
  state.assets = allAssets;
  els.projectTitle.value = state.title;
  persistProjectState();
  render();
  updateUndoButton();
  toast("已撤销上一步");
}

function updateUndoButton() {
  if (!els.undoBtn) return;
  els.undoBtn.disabled = undoStack.length === 0;
}

function restorePanelLayout() {
  try {
    panelLayout = { ...panelLayout, ...JSON.parse(localStorage.getItem(PANEL_LAYOUT_KEY) || "{}") };
  } catch {
    panelLayout = { assetWidth: 360, inspectorWidth: 380 };
  }
  panelLayout.assetWidth = clamp(panelLayout.assetWidth, 240, 640);
  panelLayout.inspectorWidth = clamp(panelLayout.inspectorWidth, 300, 720);
  inspectorOpen = panelLayout.inspectorOpen !== false;
  applyPanelLayout();
}

function savePanelLayout() {
  localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify({ ...panelLayout, inspectorOpen }));
}

function applyPanelLayout() {
  const app = document.querySelector("#app");
  app?.style.setProperty("--asset-panel-width", `${panelLayout.assetWidth}px`);
  app?.style.setProperty("--inspector-panel-width", inspectorOpen ? `${panelLayout.inspectorWidth}px` : "0px");
  app?.classList.toggle("inspector-collapsed", !inspectorOpen);
}

function openInspectorPanel() {
  if (inspectorOpen) return;
  inspectorOpen = true;
  applyPanelLayout();
  savePanelLayout();
}

function closeInspectorPanel() {
  inspectorOpen = false;
  applyPanelLayout();
  savePanelLayout();
  renderMinimap();
}

function wireEvents() {
  els.projectTitle.addEventListener("input", queueSave);
  els.canvasSelect.addEventListener("change", () => {
    const requestedProjectId = els.canvasSelect.value;
    if (!requestedProjectId || requestedProjectId === state.id) return;
    saveProject(false);
    if (loadProject(requestedProjectId)) {
      undoStack = [];
      updateUndoButton();
      els.projectTitle.value = state.title;
      render();
      toast(`已打开：${state.title}`);
    }
  });
  els.loadDemoBtn?.addEventListener("click", () => void loadChineseDemoProject());
  els.openProjectBtn?.addEventListener("click", () => void openProjectFile());
  els.projectOpenInput?.addEventListener("change", () => void openBrowserProjectFile());
  els.undoBtn.addEventListener("click", undoLastChange);
  els.newCanvasBtn.addEventListener("click", createNewCanvas);
  els.templatesBtn.addEventListener("click", openTemplatesDialog);
  els.templatesList.addEventListener("click", onTemplateListClick);
  els.continuityBtn.addEventListener("click", openContinuityDialog);
  els.saveContinuityBtn.addEventListener("click", saveContinuity);
  els.shotListBtn.addEventListener("click", toggleShotListPanel);
  els.shotListCloseBtn.addEventListener("click", closeShotListPanel);
  els.shotListContent.addEventListener("click", onShotListClick);
  els.searchCanvasBtn.addEventListener("click", toggleSearchPanel);
  els.searchCloseBtn.addEventListener("click", closeSearchPanel);
  els.canvasSearchInput.addEventListener("input", () => {
    canvasSearch = els.canvasSearchInput.value.trim().toLowerCase();
    renderNodes();
  });
  els.clearCanvasSearchBtn.addEventListener("click", clearCanvasSearch);
  els.batchEditBtn.addEventListener("click", openBatchDialog);
  els.applyBatchBtn.addEventListener("click", applyBatchEdit);
  els.versionsBtn.addEventListener("click", openVersionsDialog);
  els.saveVersionBtn.addEventListener("click", saveCheckpoint);
  els.versionsList.addEventListener("click", onVersionListClick);
  els.helpBtn.addEventListener("click", toggleHelpPanel);
  els.helpCloseBtn.addEventListener("click", closeHelpPanel);
  els.helpDragHandle.addEventListener("pointerdown", onHelpPointerDown);
  els.saveProjectBtn.addEventListener("click", () => saveProject(true));
  els.exportBtn.addEventListener("click", openExportDialog);
  els.resetViewBtn.addEventListener("click", fitView);
  els.addReferenceBtn.addEventListener("click", openReferenceDialog);
  els.saveReferenceBtn.addEventListener("click", saveReferenceLink);
  els.openFileBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", async () => {
    await importFiles([...els.fileInput.files], viewportCenterWorld());
    els.fileInput.value = "";
  });
  els.nodeFileInput.addEventListener("change", async () => {
    await attachFileToSelectedReference([...els.nodeFileInput.files][0]);
    els.nodeFileInput.value = "";
  });
  els.assetSearch.addEventListener("input", () => {
    assetFilters.search = els.assetSearch.value.trim().toLowerCase();
    renderAssets();
  });
  els.assetTypeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset-filter]");
    if (!button) return;
    assetFilters.type = button.dataset.assetFilter || "all";
    renderAssets();
  });
  els.assetSizeBtn.addEventListener("click", cycleAssetSizeMode);
  els.showInboxBtn.addEventListener("click", () => {
    assetFilters.inboxOnly = !assetFilters.inboxOnly;
    els.showInboxBtn.classList.toggle("primary", assetFilters.inboxOnly);
    renderAssets();
  });
  els.showFavoritesBtn.addEventListener("click", () => {
    assetFilters.favoritesOnly = !assetFilters.favoritesOnly;
    els.showFavoritesBtn.classList.toggle("primary", assetFilters.favoritesOnly);
    renderAssets();
  });
  els.toggleArchivedBtn.addEventListener("click", () => {
    assetFilters.showArchived = !assetFilters.showArchived;
    els.toggleArchivedBtn.classList.toggle("primary", assetFilters.showArchived);
    renderAssets();
  });

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addNodeFromToolbar(button.dataset.add));
  });
  document.querySelectorAll(".tool-button[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setActiveTool(button.dataset.tool));
  });

  els.viewport.addEventListener("wheel", onWheel, { passive: false });
  els.viewport.addEventListener("pointerdown", onViewportPointerDown);
  els.minimap.addEventListener("pointerdown", onMinimapPointerDown);
  els.minimap.addEventListener("keydown", onMinimapKeyDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointermove", onHelpPointerMove);
  window.addEventListener("pointermove", onPanelResizeMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointerup", onHelpPointerUp);
  window.addEventListener("pointerup", onPanelResizeEnd);
  els.assetResizeHandle.addEventListener("pointerdown", (event) => startPanelResize(event, "asset"));
  els.inspectorResizeHandle.addEventListener("pointerdown", (event) => startPanelResize(event, "inspector"));
  els.nodeLayer.addEventListener("pointerdown", onNodePointerDown);
  els.nodeLayer.addEventListener("click", onNodeClick);
  els.assetGrid.addEventListener("click", onAssetGridClick);
  els.assetGrid.addEventListener("dragstart", onAssetDragStart);
  els.viewport.addEventListener("dragover", (event) => event.preventDefault());
  els.viewport.addEventListener("drop", onCanvasDrop);
  els.inspector.addEventListener("input", onInspectorInput);
  els.inspector.addEventListener("change", onInspectorInput);
  els.inspector.addEventListener("click", onInspectorClick);
  els.downloadMarkdownBtn.addEventListener("click", () => downloadText(exportMarkdown(), "master-canvas-shot-package.md", "text/markdown"));
  els.downloadStoryboardBtn.addEventListener("click", () => downloadText(exportStoryboardHtml(), "master-canvas-storyboard.html", "text/html"));
  els.downloadStoryboardPdfBtn.addEventListener("click", exportStoryboardPdf);
  els.downloadJsonBtn.addEventListener("click", () => downloadText(JSON.stringify(exportProject(), null, 2), "master-canvas-project.json", "application/json"));
  els.downloadHandoffZipBtn.addEventListener("click", exportHandoffZip);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", renderMinimap);
  window.addEventListener("resize", keepHelpPanelInBounds);
}

function cycleAssetSizeMode() {
  const modes = ["small", "medium", "large"];
  const currentIndex = modes.indexOf(assetSizeMode);
  assetSizeMode = modes[(currentIndex + 1) % modes.length];
  localStorage.setItem(ASSET_SIZE_KEY, assetSizeMode);
  renderAssets();
}

function setActiveTool(tool, announce = true) {
  activeTool = tool === "hand" ? "hand" : "select";
  localStorage.setItem(ACTIVE_TOOL_KEY, activeTool);
  document.querySelectorAll(".tool-button[data-tool]").forEach((button) => {
    const isActive = button.dataset.tool === activeTool;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  els.viewport.dataset.tool = activeTool;
  els.viewport.classList.toggle("is-hand-tool", activeTool === "hand");
  els.viewport.classList.toggle("is-select-tool", activeTool === "select");
  if (announce) toast(activeTool === "hand" ? "平移模式：拖动画布" : "选择模式：可选中和框选");
}

function assetSizeLabel() {
  return { small: "S", medium: "M", large: "L" }[assetSizeMode] || "M";
}

function toggleShotListPanel() {
  els.shotListPanel.classList.toggle("is-hidden");
  els.shotListBtn.classList.toggle("primary", !els.shotListPanel.classList.contains("is-hidden"));
  renderShotList();
}

function closeShotListPanel() {
  els.shotListPanel.classList.add("is-hidden");
  els.shotListBtn.classList.remove("primary");
}

function toggleSearchPanel() {
  els.searchPanel.classList.toggle("is-hidden");
  els.searchCanvasBtn.classList.toggle("primary", !els.searchPanel.classList.contains("is-hidden"));
  if (!els.searchPanel.classList.contains("is-hidden")) els.canvasSearchInput.focus();
}

function closeSearchPanel() {
  els.searchPanel.classList.add("is-hidden");
  els.searchCanvasBtn.classList.remove("primary");
}

function clearCanvasSearch() {
  canvasSearch = "";
  els.canvasSearchInput.value = "";
  renderNodes();
}

function nodeSearchText(node) {
  const asset = assetById(node.assetId) || assetById(node.referenceAssetId);
  return [
    node.title,
    nodeTypeLabel(node.type),
    node.status,
    node.tags,
    node.notes,
    node.prompt,
    node.negativePrompt,
    node.overallPrompt,
    node.stylePrompt,
    node.musicPrompt,
    node.referenceUrl,
    node.neededFor,
    node.shotSize,
    node.cameraAngle,
    node.cameraMovement,
    node.subjectAction,
    node.location,
    node.mood,
    node.lighting,
    node.lensFeel,
    node.priority,
    node.influenceUse,
    node.doNotCopy,
    node.reviewOwner,
    node.reviewDecision,
    node.reviewNotes,
    ...(node.attempts || []).flatMap((attempt) => [attempt.label, attempt.status, attempt.notes, attempt.outputUrl]),
    asset?.name,
    asset?.tags,
    asset?.externalUrl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function nodeMatchesCanvasSearch(node) {
  return !canvasSearch || nodeSearchText(node).includes(canvasSearch);
}

function readinessForNode(node) {
  const checks = [];
  const add = (label, pass) => checks.push({ label, pass: Boolean(pass) });
  const readyStatus = ["ready", "approved"].includes(node.status);

  if (isWorkflowNode(node)) {
    add("起始帧 / 来源", node.startAssetId || node.sourceNodeId);
    add("生成提示词", node.prompt?.trim());
    add("状态可执行", readyStatus);
  } else if (node.type === "section" || node.type === "scene" || node.type === "shot") {
    add("场景描述", node.overallPrompt?.trim() || node.notes?.trim());
    add("风格方向", node.stylePrompt?.trim() || node.tags?.toLowerCase().includes("style"));
    add("音乐 / 声音方向", node.musicPrompt?.trim() || node.tags?.toLowerCase().includes("music"));
  } else if (node.type === "placeholder") {
    add("需求已说明", node.notes?.trim() || node.prompt?.trim() || node.neededFor?.trim());
    add("已解决", readyStatus || node.assetId || node.referenceAssetId || node.referenceUrl);
  } else if (node.type === "styleRef") {
    add("已附参考", node.referenceUrl || node.referenceAssetId || node.notes?.trim());
    add("风格方向", node.stylePrompt?.trim() || node.notes?.trim());
  } else if (node.type === "musicRef") {
    add("已附参考", node.referenceUrl || node.referenceAssetId || node.notes?.trim());
    add("声音方向", node.musicPrompt?.trim() || node.notes?.trim());
  } else if (node.type === "media") {
    add("素材已关联", node.assetId);
    add("提示词或备注", node.prompt?.trim() || node.notes?.trim());
  } else {
    add("备注", node.notes?.trim() || node.prompt?.trim());
  }

  const done = checks.filter((check) => check.pass).length;
  return { done, total: checks.length, items: checks };
}

function renderShotList() {
  if (!els.shotListContent || els.shotListPanel.classList.contains("is-hidden")) return;
  const items = state.nodes
    .filter((node) => NAVIGABLE_NODE_TYPES.has(node.type))
    .sort(sortNodesByCanvasOrder);
  const sections = state.nodes.filter((node) => node.type === "section").sort(sortNodesByCanvasOrder);
  const groupedIds = new Set(sections.map((section) => section.id));
  const groups = sections.map((section) => {
    const children = items
      .filter((node) => node.id !== section.id && moduleForNode(node)?.id === section.id)
      .sort(sortNodesByCanvasOrder);
    children.forEach((node) => groupedIds.add(node.id));
    return { section, children };
  });
  const ungrouped = items.filter((node) => !groupedIds.has(node.id));
  const totalReady = items.reduce((sum, node) => sum + readinessForNode(node).done, 0);
  const totalChecks = items.reduce((sum, node) => sum + readinessForNode(node).total, 0);

  els.shotListContent.innerHTML = items.length
    ? `
        <div class="nav-overview" aria-label="项目导航概览">
          <span><strong>${sections.length}</strong> 个制作模块</span>
          <span><strong>${state.nodes.filter((node) => node.type === "shot").length}</strong> 张分镜</span>
          <span><strong>${state.nodes.filter((node) => isWorkflowNode(node)).length}</strong> 条工作流</span>
          <span><strong>${totalReady}/${totalChecks}</strong> 就绪项</span>
          <p>本地优先 · 无需账号 · 剧本不上云</p>
        </div>
        ${groups.map(({ section, children }) => renderModuleNavGroup(section, children)).join("")}
        ${ungrouped.length ? `
          <div class="nav-module-group">
            <div class="nav-module-title">未归入模块</div>
            <div class="nav-module-items">
              ${ungrouped.map((node) => renderShotListButton(node, true)).join("")}
            </div>
          </div>
        ` : ""}
      `
    : `<p class="help-text">添加剧本、场景、镜头、工作流或待补项后，这里会形成导航。</p>`;
}

function renderModuleNavGroup(section, children) {
  const moduleKey = moduleColorKey(section);
  const stats = [
    [children.filter((node) => node.type === "shot").length, "分镜"],
    [children.filter((node) => isWorkflowNode(node)).length, "工作流"],
    [children.filter((node) => node.type === "character").length, "角色"],
    [children.filter((node) => node.type === "styleRef" || node.type === "musicRef").length, "参考"],
    [children.filter((node) => node.type === "placeholder").length, "待补"],
  ].filter(([count]) => count > 0);
  const label = MODULE_NAV_LABELS[moduleKey] || MODULE_NAV_LABELS.general;
  return `
    <div class="nav-module-group module-${esc(moduleKey)}">
      <div class="nav-module-title">
        <span>${esc(label)}</span>
        <small>${stats.length ? stats.map(([count, name]) => `${count} ${name}`).join(" / ") : "等待补充卡片"}</small>
      </div>
      ${renderShotListButton(section, false, `${children.length} 张关联卡片`)}
      ${children.length ? `
        <div class="nav-module-items">
          ${children.map((node) => renderShotListButton(node, true)).join("")}
        </div>
      ` : `<p class="nav-empty">这个模块还没有关联卡片。</p>`}
    </div>
  `;
}

function renderShotListButton(node, compact = false, extra = "") {
  const ready = readinessForNode(node);
  const nav = nodeNavigationMeta(node.type);
  const status = statusLabel(node.status || "draft");
  const readyRatio = ready.total ? Math.round((ready.done / ready.total) * 100) : 100;
  const moduleKey = moduleColorKey(node);
  const kind = nodeTypeLabel(node.type);
  const subtitle = [kind === nav.label ? "" : kind, status, `${ready.done}/${ready.total} 已就绪`, extra].filter(Boolean).join(" · ");
  return `
    <button class="shot-list-item nav-${esc(nav.key)} module-${esc(moduleKey)} ${compact ? "is-child" : "is-module"}" type="button" data-node-id="${node.id}">
      <span class="nav-item-meta">
        <b>${esc(nav.label)}</b>
        <em>${readyRatio}%</em>
      </span>
      <strong>${esc(node.title)}</strong>
      <span>${esc(subtitle)}</span>
    </button>
  `;
}

function moduleForNode(node) {
  if (!node) return null;
  if (node.type === "section") return node;
  const sections = state.nodes.filter((item) => item.type === "section");
  let cursor = node;
  const visited = new Set();
  while (cursor?.sourceNodeId && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    const source = nodeById(cursor.sourceNodeId);
    if (source?.type === "section") return source;
    cursor = source;
  }
  return sections
    .filter((section) => nodesInsideSection(section).some((item) => item.id === node.id))
    .sort((a, b) => (a.w * a.h) - (b.w * b.h))[0] || null;
}

function moduleColorKey(node) {
  const module = node?.type === "section" ? node : moduleForNode(node);
  const text = `${module?.title || node?.title || ""} ${module?.tags || node?.tags || ""}`;
  if (/剧本|主题|故事|节拍/.test(text)) return "script";
  if (/角色|表演|服装|造型/.test(text)) return "character";
  if (/场景|空间|美术|地点/.test(text)) return "scene";
  if (/分镜|镜头|工作流|生成/.test(text)) return "storyboard";
  if (/拍摄|计划|现场|制片|通告/.test(text)) return "schedule";
  if (/声音|音乐|后期|广播/.test(text)) return "sound";
  if (/交付|版本|审阅|平台规格/.test(text)) return "delivery";
  return "general";
}

function onShotListClick(event) {
  const id = event.target.closest("[data-node-id]")?.dataset.nodeId;
  if (!id) return;
  jumpToNode(id);
}

function nodeNavigationMeta(type = "note") {
  if (type === "section") return { key: "section", label: "制作模块" };
  if (type === "note") return { key: "note", label: "备注" };
  if (type === "scene") return { key: "scene", label: "场景" };
  if (type === "shot") return { key: "shot", label: "分镜" };
  if (type === "workflow" || type === "imageWorkflow") return { key: "workflow", label: "生成工作流" };
  if (type === "character") return { key: "character", label: "角色" };
  if (type === "placeholder") return { key: "placeholder", label: "待补任务" };
  if (type === "styleRef") return { key: "reference", label: "风格参考" };
  if (type === "musicRef") return { key: "reference", label: "声音参考" };
  if (type === "media") return { key: "media", label: "素材" };
  return { key: "note", label: "卡片" };
}

function jumpToNode(id) {
  const node = nodeById(id);
  if (!node) return;
  const rect = els.viewport.getBoundingClientRect();
  const preferredScale = node.type === "section" ? 0.56 : 0.78;
  state.view.scale = clamp(Math.max(state.view.scale, preferredScale), 0.28, node.type === "section" ? 0.7 : 1.1);
  state.view.x = rect.width / 2 - (node.x + node.w / 2) * state.view.scale;
  state.view.y = rect.height / 2 - (node.y + node.h / 2) * state.view.scale;
  setSelectedNodeIds([node.id]);
  state.selectedAssetId = null;
  openInspectorPanel();
  queueSave();
  render();
}

function onKeyUp(event) {
  if (event.code !== "Space") return;
  isSpacePanning = false;
  els.viewport.classList.remove("space-pan");
}

function toggleHelpPanel() {
  if (els.helpPanel.classList.contains("is-hidden")) {
    openHelpPanel();
  } else {
    closeHelpPanel();
  }
}

function openHelpPanel() {
  els.helpPanel.classList.remove("is-hidden");
  els.helpBtn.classList.add("primary");
  keepHelpPanelInBounds();
}

function closeHelpPanel() {
  els.helpPanel.classList.add("is-hidden");
  els.helpBtn.classList.remove("primary");
}

function restoreHelpPanelPosition() {
  const fallback = defaultHelpPanelPosition();
  let position = fallback;
  try {
    position = { ...fallback, ...JSON.parse(localStorage.getItem(HELP_POSITION_KEY) || "{}") };
  } catch {
    position = fallback;
  }
  setHelpPanelPosition(position.x, position.y);
}

function defaultHelpPanelPosition() {
  const width = Math.min(460, Math.max(300, window.innerWidth - 96));
  return {
    x: Math.max(72, window.innerWidth - width - 400),
    y: 72,
  };
}

function setHelpPanelPosition(x, y) {
  const width = els.helpPanel.offsetWidth || Math.min(460, window.innerWidth - 96);
  const height = els.helpPanel.offsetHeight || Math.min(640, window.innerHeight - 88);
  const nextX = clamp(x, 8, Math.max(8, window.innerWidth - width - 8));
  const nextY = clamp(y, 8, Math.max(8, window.innerHeight - height - 8));
  els.helpPanel.style.left = `${nextX}px`;
  els.helpPanel.style.top = `${nextY}px`;
  els.helpPanel.style.right = "auto";
}

function keepHelpPanelInBounds() {
  if (els.helpPanel.classList.contains("is-hidden")) return;
  const rect = els.helpPanel.getBoundingClientRect();
  setHelpPanelPosition(rect.left || defaultHelpPanelPosition().x, rect.top || defaultHelpPanelPosition().y);
}

function onHelpPointerDown(event) {
  if (event.target.closest("button")) return;
  const rect = els.helpPanel.getBoundingClientRect();
  helpDragState = {
    startX: event.clientX,
    startY: event.clientY,
    panelX: rect.left,
    panelY: rect.top,
  };
  els.helpPanel.classList.add("is-dragging");
  els.helpDragHandle.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

function onHelpPointerMove(event) {
  if (!helpDragState) return;
  setHelpPanelPosition(
    helpDragState.panelX + event.clientX - helpDragState.startX,
    helpDragState.panelY + event.clientY - helpDragState.startY,
  );
}

function onHelpPointerUp() {
  if (!helpDragState) return;
  helpDragState = null;
  els.helpPanel.classList.remove("is-dragging");
  const rect = els.helpPanel.getBoundingClientRect();
  localStorage.setItem(HELP_POSITION_KEY, JSON.stringify({ x: Math.round(rect.left), y: Math.round(rect.top) }));
}

function startPanelResize(event, panel) {
  if (panel === "inspector" && !inspectorOpen) return;
  resizeState = {
    panel,
    startX: event.clientX,
    assetWidth: panelLayout.assetWidth,
    inspectorWidth: panelLayout.inspectorWidth,
  };
  document.body.classList.add("is-resizing-panel");
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function onPanelResizeMove(event) {
  if (!resizeState) return;
  const delta = event.clientX - resizeState.startX;
  if (resizeState.panel === "asset") {
    panelLayout.assetWidth = clamp(resizeState.assetWidth + delta, 240, Math.min(640, window.innerWidth - 760));
  } else {
    panelLayout.inspectorWidth = clamp(resizeState.inspectorWidth - delta, 300, Math.min(720, window.innerWidth - 760));
  }
  applyPanelLayout();
  renderMinimap();
}

function onPanelResizeEnd() {
  if (!resizeState) return;
  resizeState = null;
  document.body.classList.remove("is-resizing-panel");
  savePanelLayout();
}

function createNewCanvas() {
  saveProject(false);
  undoStack = [];
  updateUndoButton();
  state = createDefaultProject();
  state.title = nextUntitledTitle();
  state.assets = allAssets;
  state.nodes = [];
  setSelectedNodeIds([]);
  state.selectedAssetId = null;
  els.projectTitle.value = state.title;
  persistProjectState();
  render();
  exposeSmokeState();
  toast("已新建空白影视画布");
}

async function loadChineseDemoProject() {
  saveProject(false);
  const demoAssets = createChineseDemoAssets();
  for (const asset of demoAssets) {
    try {
      await putAsset(asset);
    } catch (error) {
      console.warn("Demo asset was not written to IndexedDB:", error);
    }
  }

  allAssets = mergeAssets(demoAssets, allAssets);
  undoStack = [];
  state = createDefaultProject();
  state.title = nextDemoTitle();
  state.view = { x: 760, y: 440, scale: 0.62 };
  state.assets = allAssets;
  state.continuity = {
    characters: "林岚：28 岁，剪辑师，夜班后赶末班地铁；始终戴一只旧银色耳机。周远：35 岁，地铁维修员，沉默但观察细节。小雨：9 岁，只通过广播和手写便签出现。",
    wardrobe: "林岚：灰蓝色风衣、白色帆布包、银色耳机；周远：深绿维修夹克、反光条、安全帽。服装颜色不随场景漂移。",
    locations: "主要空间为末班地铁车厢、站台、监控室、出站口雨夜街道；空间关系保持从车厢向控制室再到出口推进。",
    props: "银色耳机、折角车票、红色信号灯、手写便签、站台电子钟。耳机和车票是贯穿线索。",
    styleRules: "本地现实主义质感；低饱和青绿色夜景；手持轻微呼吸感；镜头尽量克制，悬疑点靠声音和空间调度推进。",
    neverChange: "林岚的耳机、风衣和白色帆布包不能变；地铁线路名固定为 17 号线；电子钟时间从 23:47 推进到 00:12。",
  };
  state.nodes = createChineseDemoNodes(demoAssets);
  setSelectedNodeIds([state.nodes[0]?.id].filter(Boolean));
  state.selectedAssetId = demoAssets[0]?.id || null;
  els.projectTitle.value = state.title;
  panelLayout = { ...panelLayout, assetWidth: 320, inspectorWidth: 360 };
  inspectorOpen = false;
  applyPanelLayout();
  savePanelLayout();
  persistProjectState();
  focusChineseDemoOpeningView();
  persistProjectState();
  exposeSmokeState();
  toast("已加载中文示例：短片/微短剧项目总控台");
}

function focusChineseDemoOpeningView() {
  const focusTitles = ["项目总览", "剧本与主题", "角色与表演", "分镜与生成工作流"];
  const focusNodes = state.nodes.filter((node) => focusTitles.some((title) => node.title?.includes(title)));
  fitViewToNodes(focusNodes.length ? focusNodes : state.nodes, {
    padding: 44,
    minScale: 0.38,
    maxScale: 0.64,
    persist: false,
  });
}

function nextDemoTitle() {
  const base = "短片/微短剧项目总控台｜《最后一班地铁》";
  const existing = new Set(projects.map((project) => project.title));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function createChineseDemoAssets() {
  const base = [
    {
      name: "影像参考｜雨夜地铁冷绿色调",
      type: "video-link",
      externalUrl: "https://example.com/master-canvas/demo/subway-night-look",
      tags: "风格参考, 夜景, 地铁, 冷绿色",
      notes: "用于色彩、反光、车厢荧光灯和站台纵深参考；不上传任何剧本或素材。",
    },
    {
      name: "声音参考｜末班车广播与低频环境",
      type: "music-link",
      externalUrl: "https://example.com/master-canvas/demo/last-train-sound",
      tags: "声音设计, 广播, 低频, 环境声",
      notes: "用于站台广播、车门蜂鸣、轨道低频和远处雨声的声音方向。",
    },
    {
      name: "交付参考｜导演审阅版分镜包",
      type: "reference-link",
      externalUrl: "https://example.com/master-canvas/demo/storyboard-handoff",
      tags: "交付, 分镜, 审阅",
      notes: "用于说明最终需要交给导演/制片/生成执行的材料结构。",
    },
  ];
  return base.map((asset) => normalizeAsset({
    ...asset,
    id: uid("asset"),
    mime: "text/uri-list",
    size: 0,
    createdAt: now(),
    updatedAt: now(),
    favorite: true,
    archived: false,
    inbox: false,
  }));
}

function createChineseDemoNodes(demoAssets) {
  const assetsByName = new Map(demoAssets.map((asset) => [asset.name, asset]));
  const styleAsset = assetsByName.get("影像参考｜雨夜地铁冷绿色调");
  const soundAsset = assetsByName.get("声音参考｜末班车广播与低频环境");
  const deliveryAsset = assetsByName.get("交付参考｜导演审阅版分镜包");
  const nodes = [];
  const add = (type, x, y, overrides = {}) => {
    const node = makeNode(type, x, y, overrides);
    nodes.push(node);
    return node;
  };

  const overview = add("note", -1320, -820, {
    title: "项目总览｜《最后一班地铁》",
    notes: "10 分钟短片 / 竖屏微短剧试制项目。Master Canvas 作为影视项目总控创作画布：剧本、角色、场景、分镜、拍摄计划、声音、交付节点全部在本机整理，无需账号、无需 API 密钥、剧本不上云。",
    tags: "项目总控, 本地优先, 中文影视创作",
    status: "ready",
    w: 380,
  });

  const script = add("section", -1220, -560, {
    title: "剧本与主题",
    overallPrompt: "女剪辑师林岚在末班地铁上听见一段本不该出现的儿童广播，她必须在列车停运前找到广播来源。",
    stylePrompt: "现实主义悬疑，不靠怪力乱神，重点是空间压迫、声音线索和人物选择。",
    musicPrompt: "前半段保留环境声；转折处加入极低频脉冲；结尾只留下雨声和远处车门提示音。",
    tags: "剧本, 主题, 故事核",
    status: "ready",
    w: 860,
    h: 380,
  });
  add("note", -1110, -385, {
    title: "故事梗概",
    notes: "林岚发现广播里的女孩小雨可能曾在这条线路失踪。维修员周远阻止她进入封闭车厢，却在监控里看到小雨留下的新便签。",
    tags: "梗概, logline",
    status: "ready",
    sourceNodeId: script.id,
  });
  add("shot", -760, -385, {
    title: "核心节拍",
    overallPrompt: "1. 末班车空车厢；2. 广播异常；3. 维修通道追查；4. 监控室确认便签；5. 雨夜出口开放式结尾。",
    stylePrompt: "每个节拍都有明确空间推进：车厢 -> 站台 -> 维修通道 -> 监控室 -> 出口。",
    musicPrompt: "声音线索先于视觉线索出现，广播内容逐步从噪声变成可辨认句子。",
    tags: "节拍, 剧本",
    status: "ready",
    sourceNodeId: script.id,
  });

  const characters = add("section", -260, -560, {
    title: "角色与表演",
    overallPrompt: "控制角色身份、表演层次、服装和情绪连续性，避免生成或执行中人物漂移。",
    stylePrompt: "表演克制，惊恐不外放；通过停顿、眼神和手部动作推进心理变化。",
    musicPrompt: "角色情绪不靠配乐煽动，更多用呼吸、衣料摩擦和远处广播承压。",
    tags: "角色, 表演, 连续性",
    status: "ready",
    w: 860,
    h: 380,
    sourceNodeId: script.id,
  });
  const lin = add("character", -150, -385, {
    title: "角色｜林岚",
    notes: "28 岁剪辑师。外表冷静，习惯把情绪压进工作流程。她对声音异常极度敏感，因为母亲曾在地铁事故中失联。",
    tags: "主角, 林岚, 连续性",
    status: "ready",
    sourceNodeId: characters.id,
  });
  add("character", 210, -385, {
    title: "角色｜周远",
    notes: "35 岁地铁维修员。知道线路旧事故的真相，但不相信林岚能承受后果。表演重点是克制和回避。",
    tags: "配角, 周远, 连续性",
    status: "ready",
    sourceNodeId: characters.id,
  });

  const scenes = add("section", -1220, -80, {
    title: "场景与空间",
    overallPrompt: "把所有场景按空间关系铺开：车厢、站台、维修通道、监控室、出口雨夜。",
    stylePrompt: "空间应有真实地铁站逻辑，灯光方向和电子钟时间连续。",
    musicPrompt: "每个空间有独立环境声：车厢空调、电轨低频、通道风声、监控室电流声、雨声。",
    tags: "场景, 空间, 美术",
    status: "ready",
    w: 860,
    h: 430,
    sourceNodeId: overview.id,
  });
  const scene1 = add("scene", -1110, 95, {
    title: "场景 01｜末班车空车厢",
    overallPrompt: "林岚独自坐在车厢末端，电子钟 23:47，车窗反射出空座位和她的旧银色耳机。",
    stylePrompt: "冷白顶灯、玻璃反射、低饱和青绿色，镜头从中景慢慢收紧。",
    musicPrompt: "空调低频、轨道规律震动，广播先是噪声。",
    tags: "车厢, 开场",
    status: "ready",
    sourceNodeId: scenes.id,
  });
  const scene2 = add("scene", -760, 95, {
    title: "场景 02｜封闭站台",
    overallPrompt: "列车误停在不开放站台，站名牌一半熄灭，林岚看到手写便签贴在玻璃门内侧。",
    stylePrompt: "站台纵深强，红色信号灯成为唯一暖色。",
    musicPrompt: "广播变清晰，女孩说：别让他关灯。",
    tags: "站台, 转折",
    status: "ready",
    sourceNodeId: scene1.id,
  });
  const scene3 = add("scene", -410, 95, {
    title: "场景 03｜监控室与雨夜出口",
    overallPrompt: "周远带林岚进监控室，屏幕显示小雨在几分钟前经过；结尾出口打开，雨夜中传来同一句广播。",
    stylePrompt: "监控屏冷光与出口雨夜反光对照，结尾不解释过度。",
    musicPrompt: "去掉旋律，只保留雨声、呼吸和远处车门提示。",
    tags: "监控室, 结尾",
    status: "review",
    sourceNodeId: scene2.id,
  });

  const storyboard = add("section", -260, -80, {
    title: "分镜与生成工作流",
    overallPrompt: "把关键镜头拆成可执行的镜头卡和图生视频卡，用于导演审阅、拍摄参考或 AI 视频生成交接。",
    stylePrompt: "分镜优先服务叙事和空间，不堆砌奇观。",
    musicPrompt: "每条工作流保留声音意图，方便后续声音设计和剪辑对齐。",
    tags: "分镜, 镜头, 工作流",
    status: "ready",
    w: 980,
    h: 520,
    sourceNodeId: scenes.id,
  });
  const shot1 = add("shot", -150, 100, {
    title: "分镜 01｜空车厢慢推",
    overallPrompt: "林岚坐在车厢末端，镜头从空座位慢慢推向她，广播噪声开始出现。",
    shotSize: "medium",
    cameraAngle: "eye-level",
    cameraMovement: "慢推",
    subjectAction: "林岚摘下一侧耳机，确认声音不是来自手机。",
    location: "末班车车厢",
    mood: "克制、压迫",
    lighting: "冷白顶灯，窗面反射",
    lensFeel: "35mm 轻微广角",
    priority: "must-have",
    tags: "分镜, 开场",
    status: "ready",
    sourceNodeId: storyboard.id,
  });
  add("workflow", 205, 90, {
    title: "工作流 01｜车厢开场图生视频",
    prompt: "固定到轻微慢推，空车厢冷白灯，女剪辑师林岚摘下一侧银色耳机，听见广播噪声，表演克制，保持风衣、耳机、帆布包一致。",
    negativePrompt: "夸张恐怖表情、变脸、车厢结构错乱、多余乘客、赛博朋克过度霓虹",
    shotSize: "medium",
    cameraAngle: "eye-level",
    cameraMovement: "慢推",
    duration: "6s",
    status: "ready",
    tags: "图生视频, 开场",
    sourceNodeId: shot1.id,
  });
  const shot2 = add("shot", -150, 290, {
    title: "分镜 02｜红色信号灯与便签",
    overallPrompt: "林岚走到站台玻璃门前，红色信号灯闪烁，便签上的字被雨水和反光遮住一半。",
    shotSize: "close-up",
    cameraAngle: "over-the-shoulder",
    cameraMovement: "手持轻微呼吸",
    subjectAction: "她抬手擦玻璃，读出第一句便签。",
    location: "封闭站台",
    mood: "发现线索",
    lighting: "冷绿环境中只有红色信号灯",
    lensFeel: "50mm",
    priority: "high",
    tags: "分镜, 道具, 便签",
    status: "ready",
    sourceNodeId: storyboard.id,
  });
  add("workflow", 205, 280, {
    title: "工作流 02｜站台线索图生视频",
    prompt: "过肩近景，林岚站在封闭站台玻璃门前，红色信号灯闪烁，手写便签贴在玻璃另一侧。动作缓慢，重点是她擦玻璃读字。",
    negativePrompt: "鬼影、血迹、夸张惊吓、文字乱码、角色换装",
    shotSize: "close-up",
    cameraAngle: "over-the-shoulder",
    cameraMovement: "手持轻微呼吸",
    duration: "6s",
    status: "review",
    tags: "图生视频, 线索",
    sourceNodeId: shot2.id,
    attempts: [
      {
        id: uid("attempt"),
        label: "导演审阅 v1",
        status: "candidate",
        outputUrl: "",
        seed: "seed 1847 / motion 0.42",
        notes: "红色信号灯有效，但便签字太清楚；下一版让文字只露出关键词。",
        createdAt: now(),
      },
    ],
  });

  const schedule = add("section", -1220, 520, {
    title: "拍摄计划与现场任务",
    overallPrompt: "把拍摄日、场地、道具、部门任务和风险集中管理，方便小团队开拍前对齐。",
    stylePrompt: "现场执行优先：能否拍到、谁负责、什么时候确认。",
    musicPrompt: "现场收音需要采集车厢空调、站台广播、车门蜂鸣和雨声 wild track。",
    tags: "拍摄计划, 制片, 现场",
    status: "ready",
    w: 860,
    h: 410,
    sourceNodeId: scenes.id,
  });
  add("note", -1110, 690, {
    title: "拍摄日程",
    notes: "D1 22:00-02:00：车厢与站台；D2 20:00-23:30：监控室与出口雨夜；D3 预留补拍 / 道具特写。",
    tags: "通告, 排期",
    status: "ready",
    sourceNodeId: schedule.id,
  });
  add("placeholder", -760, 690, {
    title: "待补｜地铁站授权与封控范围",
    neededFor: "approval",
    prompt: "确认末班车车厢、封闭站台、监控室、出站口的拍摄许可和安全边界。",
    notes: "制片负责人：待定；最晚锁定时间：开拍前 5 天。",
    tags: "审批, 场地",
    status: "blocked",
    sourceNodeId: schedule.id,
  });
  add("placeholder", -410, 690, {
    title: "待补｜关键道具清单",
    neededFor: "image",
    prompt: "旧银色耳机、折角车票、手写便签、红色信号灯贴纸、白色帆布包。",
    notes: "道具需要拍摄标准参考照，进入连续性圣经。",
    tags: "道具, 连续性",
    status: "review",
    sourceNodeId: schedule.id,
  });

  const sound = add("section", -260, 560, {
    title: "声音设计与音乐",
    overallPrompt: "声音是叙事线索，不只是氛围。广播、低频、雨声和静默承担悬疑推进。",
    stylePrompt: "避免常规恐怖音效，采用真实环境声的节奏变化制造不安。",
    musicPrompt: "音乐只在片尾前出现 12 秒，使用低频脉冲和单音钢琴，不盖过广播。",
    tags: "声音, 音乐, 后期",
    status: "ready",
    w: 860,
    h: 410,
    sourceNodeId: script.id,
  });
  add("musicRef", -150, 735, {
    title: "声音参考｜末班车广播",
    notes: "广播从不可辨识噪声逐步变成儿童声音；结尾再次模糊化，保留开放性。",
    musicPrompt: "车门蜂鸣 2 次后进入 38Hz 低频；广播女声需像站内系统而非旁白。",
    referenceAssetId: soundAsset?.id || "",
    tags: "广播, 环境声, 低频",
    status: "ready",
    sourceNodeId: sound.id,
  });
  add("styleRef", 205, 735, {
    title: "影像参考｜冷绿色夜景",
    notes: "用于统一车厢、站台和监控室的冷绿色调；红色信号灯只在转折点出现。",
    stylePrompt: "低饱和青绿、轻微颗粒、真实镜头呼吸，避免过度赛博霓虹。",
    referenceAssetId: styleAsset?.id || "",
    influenceUse: "色彩、灯光、空间纵深、反光",
    influenceStrength: "medium",
    doNotCopy: "不照搬参考构图，不使用品牌或真实站名。",
    tags: "视觉风格, 参考",
    status: "ready",
    sourceNodeId: sound.id,
  });

  const delivery = add("section", 760, -560, {
    title: "交付节点与版本控制",
    overallPrompt: "把每次给导演、制片、剪辑、生成执行的输出物定义清楚，避免只剩一堆散乱提示词。",
    stylePrompt: "交付物按版本冻结，修改走检查点，不覆盖上版。",
    musicPrompt: "声音参考和音乐方向必须随分镜一起导出。",
    tags: "交付, 版本, 审阅",
    status: "ready",
    w: 820,
    h: 500,
    sourceNodeId: overview.id,
  });
  add("note", 880, -375, {
    title: "交付 01｜导演审阅包",
    notes: "导出 Markdown + 分镜 HTML/PDF：包含故事梗概、角色规则、关键镜头、声音方向、待补项。",
    tags: "导演审阅, 分镜",
    status: "ready",
    sourceNodeId: delivery.id,
    referenceAssetId: deliveryAsset?.id || "",
  });
  add("note", 1220, -375, {
    title: "交付 02｜生成执行包",
    notes: "导出 Handoff ZIP：包含 shot-package.md、storyboard.html、shot_order.csv、场景 bins、图生视频提示词。",
    tags: "生成执行, Handoff ZIP",
    status: "ready",
    sourceNodeId: delivery.id,
  });
  add("placeholder", 880, -185, {
    title: "待补｜客户 / 平台规格",
    neededFor: "approval",
    prompt: "确认横屏 16:9、竖屏 9:16、字幕安全区、片尾 logo、交付码率和文件命名规则。",
    tags: "交付规格, 审批",
    status: "review",
    sourceNodeId: delivery.id,
  });

  return nodes;
}

function openContinuityDialog() {
  const continuity = { ...defaultContinuity(), ...(state.continuity || {}) };
  els.continuityCharacters.value = continuity.characters;
  els.continuityWardrobe.value = continuity.wardrobe;
  els.continuityLocations.value = continuity.locations;
  els.continuityProps.value = continuity.props;
  els.continuityStyleRules.value = continuity.styleRules;
  els.continuityNeverChange.value = continuity.neverChange;
  els.continuityDialog.showModal();
}

function saveContinuity() {
  recordUndo();
  state.continuity = {
    characters: els.continuityCharacters.value.trim(),
    wardrobe: els.continuityWardrobe.value.trim(),
    locations: els.continuityLocations.value.trim(),
    props: els.continuityProps.value.trim(),
    styleRules: els.continuityStyleRules.value.trim(),
    neverChange: els.continuityNeverChange.value.trim(),
  };
  queueSave();
  renderInspector();
  els.continuityDialog.close();
  toast("连续性圣经已保存");
}

const TEMPLATE_DEFS = [
  {
    id: "music-video",
    title: "音乐短片",
    description: "表演段落、叙事插入、音乐方向、风格参考与生成尝试。",
    nodes: [
      ["section", -1080, -520, { title: "表演视觉", overallPrompt: "主表演空间、灯光、服装和摄影语言。", status: "draft" }],
      ["placeholder", -990, -360, { title: "待补｜主视觉表演图", neededFor: "image", prompt: "缺少主表演段落的英雄图 / 参考图。" }],
      ["shot", -650, -360, { title: "开场钩子镜头", shotSize: "close-up", cameraMovement: "推近", priority: "high" }],
      ["workflow", -270, -370, { title: "开场钩子 I2V", prompt: "描述前 3 秒动作、摄影动机和表演能量。" }],
      ["section", -1080, 40, { title: "叙事插入", overallPrompt: "故事插入、象征画面和转场瞬间。", status: "draft" }],
      ["musicRef", -250, 110, { title: "音乐方向", musicPrompt: "速度、剪辑节奏、乐器和情绪备注。" }],
      ["styleRef", 120, 110, { title: "影像风格参考", stylePrompt: "色彩、节奏、构图和可借鉴参考。" }],
    ],
  },
  {
    id: "short-film",
    title: "短片 / 微短剧",
    description: "角色连续性、场景分区、镜头卡、道具和审阅交付。",
    nodes: [
      ["character", -1120, -540, { title: "主角连续性", tags: "角色, 连续性", notes: "脸部、服装、姿态和情绪范围。" }],
      ["section", -1080, -260, { title: "场景 1 建立", overallPrompt: "我们在哪里，发生什么变化，哪些必须保持一致。" }],
      ["shot", -960, -100, { title: "建立镜头", shotSize: "wide", cameraAngle: "eye-level", cameraMovement: "慢移" }],
      ["workflow", -590, -110, { title: "场景 1 I2V", prompt: "保持角色身份和地点连续性。" }],
      ["section", -1080, 300, { title: "场景 2 转折", overallPrompt: "主要情绪转折和视觉升级。" }],
      ["placeholder", -960, 460, { title: "待补｜道具参考", neededFor: "style", prompt: "需要保持一致的道具或物件参考。" }],
      ["note", -590, 470, { title: "审阅备注", notes: "记录导演 / 剪辑 / 客户决定。" }],
    ],
  },
  {
    id: "product-video",
    title: "产品视频",
    description: "产品英雄镜头、物件连续性、卖点、证明点和最终 CTA。",
    nodes: [
      ["section", -1080, -420, { title: "产品身份", overallPrompt: "产品形态、材质、比例、品牌质感和物件连续性。" }],
      ["placeholder", -960, -260, { title: "待补｜产品干净参考", neededFor: "image", prompt: "上传或生成最干净的产品参考。" }],
      ["shot", -610, -260, { title: "英雄揭示", shotSize: "medium", cameraMovement: "环绕", lighting: "可控棚拍光泽", priority: "high" }],
      ["workflow", -240, -270, { title: "英雄揭示 I2V", prompt: "优雅产品揭示，保持物体几何和高级灯光一致。" }],
      ["section", -1080, 140, { title: "功能 / 利益点", overallPrompt: "功能卡、证明点和支撑画面。" }],
      ["shot", -960, 300, { title: "功能细节", shotSize: "macro", cameraAngle: "low angle", lensFeel: "商业微距镜头" }],
      ["note", -610, 300, { title: "CTA / 片尾卡", notes: "最终文案、logo、权益和锁定版式。" }],
    ],
  },
  {
    id: "social-ad",
    title: "信息流广告",
    description: "钩子、证明点、优惠、CTA、画幅版本和平台备注。",
    nodes: [
      ["section", -1040, -360, { title: "钩子", overallPrompt: "第一秒画面和信息。" }],
      ["shot", -910, -190, { title: "停留开场", shotSize: "close-up", priority: "high", duration: "4s" }],
      ["workflow", -540, -200, { title: "钩子 I2V", aspectRatio: "9:16", duration: "4s", prompt: "立即进入动作，视觉前提清楚。" }],
      ["section", -1040, 140, { title: "证明 / 优惠 / CTA", overallPrompt: "证明画面、优惠卡和最终结束帧。" }],
      ["placeholder", -910, 310, { title: "待补｜优惠文案", neededFor: "text", prompt: "最终优惠、免责声明和行动号召文案。" }],
      ["styleRef", -540, 310, { title: "平台风格参考", influenceUse: "节奏、构图、字幕密度" }],
    ],
  },
  {
    id: "character-continuity",
    title: "角色连续性",
    description: "角色圣经、服装、表情、场景和一致性测试。",
    nodes: [
      ["character", -960, -410, { title: "核心角色", tags: "角色, 连续性", notes: "标准脸部和身份规则。" }],
      ["placeholder", -620, -410, { title: "待补｜表情表", neededFor: "image", prompt: "中性、开心、紧张、侧面、四分之三侧。" }],
      ["section", -1020, -120, { title: "连续性测试", overallPrompt: "测试角色在不同灯光、场景和服装中的一致性。" }],
      ["workflow", -900, 50, { title: "灯光测试 I2V", prompt: "同一角色身份在不同灯光下保持一致。" }],
      ["workflow", -540, 50, { title: "服装测试 I2V", prompt: "同一角色身份和服装连续性。" }],
      ["styleRef", -180, 50, { title: "标准风格", stylePrompt: "应用到所有角色生成的风格规则。" }],
    ],
  },
];

function openTemplatesDialog() {
  els.templatesList.innerHTML = TEMPLATE_DEFS.map(
    (template) => `
      <button class="template-card" type="button" data-template-id="${template.id}">
        <strong>${esc(template.title)}</strong>
        <span>${esc(template.description)}</span>
      </button>
    `,
  ).join("");
  els.templatesDialog.showModal();
}

function onTemplateListClick(event) {
  const templateId = event.target.closest("[data-template-id]")?.dataset.templateId;
  if (!templateId) return;
  const template = TEMPLATE_DEFS.find((item) => item.id === templateId);
  if (!template) return;
  saveProject(false);
  undoStack = [];
  state = createDefaultProject();
  state.title = nextTemplateTitle(template.title);
  state.assets = allAssets;
  state.view = { x: 760, y: 420, scale: 0.72 };
  state.nodes = template.nodes.map(([type, x, y, overrides]) => makeNode(type, x, y, { ...referenceNodeDefaults(type), ...overrides }));
  const workflows = state.nodes.filter(isWorkflowNode);
  workflows.forEach((workflow) => {
    const nearest = state.nodes
      .filter((node) => node.id !== workflow.id && !isWorkflowNode(node))
      .sort((a, b) => Math.abs(a.x - workflow.x) + Math.abs(a.y - workflow.y) - (Math.abs(b.x - workflow.x) + Math.abs(b.y - workflow.y)))[0];
    if (nearest) workflow.sourceNodeId = nearest.id;
  });
  setSelectedNodeIds([state.nodes[0]?.id].filter(Boolean));
  state.selectedAssetId = null;
  els.projectTitle.value = state.title;
  persistProjectState();
  render();
  els.templatesDialog.close();
  toast(`已创建模板画布：${template.title}`);
}

function nextTemplateTitle(title) {
  const base = `${title}画布`;
  const existing = new Set(projects.map((project) => project.title));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function mergeTags(existing = "", added = "") {
  const parts = [...existing.split(","), ...added.split(",")]
    .map((tag) => tag.trim())
    .filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function openBatchDialog() {
  const ids = selectedNodeIds();
  if (!ids.length) {
    toast("请先选择卡片");
    return;
  }
  els.batchCountLabel.textContent = `已选 ${ids.length} 张卡片`;
  els.batchStatus.value = "";
  els.batchTags.value = "";
  els.batchDialog.showModal();
}

function applyBatchEdit() {
  const ids = selectedNodeIds();
  if (!ids.length) return;
  const status = els.batchStatus.value;
  const tags = els.batchTags.value.trim();
  if (!status && !tags) {
    toast("请选择状态或追加标签");
    return;
  }
  recordUndo();
  ids.forEach((id) => {
    const node = nodeById(id);
    if (!node) return;
    if (status) node.status = status;
    if (tags) node.tags = mergeTags(node.tags, tags);
    node.updatedAt = now();
  });
  queueSave();
  render();
  els.batchDialog.close();
  toast(`已更新 ${ids.length} 张卡片`);
}

function readVersions(projectId = state.id) {
  try {
    return JSON.parse(localStorage.getItem(versionStorageKey(projectId)) || "[]");
  } catch {
    return [];
  }
}

function writeVersions(versions, projectId = state.id) {
  localStorage.setItem(versionStorageKey(projectId), JSON.stringify(versions.slice(0, 30)));
}

function openVersionsDialog() {
  els.versionName.value = "";
  renderVersionsList();
  els.versionsDialog.showModal();
}

function saveCheckpoint() {
  saveProject(false);
  const versions = readVersions();
  const label = els.versionName.value.trim() || `检查点 ${versions.length + 1}`;
  versions.unshift({
    id: uid("version"),
    name: label,
    createdAt: now(),
    project: serializeProject(state),
  });
  writeVersions(versions);
  els.versionName.value = "";
  renderVersionsList();
  toast("检查点已保存");
}

function renderVersionsList() {
  const versions = readVersions();
  els.versionsList.innerHTML = versions.length
    ? versions
        .map(
          (version) => `
            <article class="version-row">
              <div>
                <strong>${esc(version.name)}</strong>
                <span>${new Date(version.createdAt).toLocaleString()}</span>
              </div>
              <div class="version-actions">
                <button class="button compact" type="button" data-version-action="restore" data-version-id="${version.id}">恢复</button>
                <button class="button compact" type="button" data-version-action="delete" data-version-id="${version.id}">删除</button>
              </div>
            </article>
          `,
        )
        .join("")
    : `<p class="help-text">当前画布还没有保存检查点。</p>`;
}

function onVersionListClick(event) {
  const button = event.target.closest("[data-version-action]");
  if (!button) return;
  const action = button.dataset.versionAction;
  const id = button.dataset.versionId;
  const versions = readVersions();
  const version = versions.find((item) => item.id === id);
  if (!version) return;
  if (action === "delete") {
    writeVersions(versions.filter((item) => item.id !== id));
    renderVersionsList();
    toast("检查点已删除");
    return;
  }
  if (action === "restore") {
    recordUndo();
    const restored = { ...createDefaultProject(), ...version.project, id: version.project.id || state.id };
    restored.continuity = { ...defaultContinuity(), ...(version.project.continuity || {}) };
    restored.nodes = (restored.nodes || []).map(normalizeNode);
    state = restored;
    allAssets = mergeAssets(version.project.assets || [], allAssets);
    state.assets = allAssets;
    els.projectTitle.value = state.title;
    persistProjectState();
    render();
    els.versionsDialog.close();
    toast(`已恢复：${version.name}`);
  }
}

function nextUntitledTitle() {
  const base = "未命名影视画布";
  const existing = new Set(projects.map((project) => project.title));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function addNodeFromToolbar(kind) {
  const center = viewportCenterWorld();
  const selected = selectedNode();
  const type = kind === "imageWorkflow" ? "imageWorkflow" : kind;
  const sidecarOffset = type === "styleRef" ? { x: 430, y: -210 } : type === "musicRef" ? { x: 430, y: 35 } : type === "section" ? { x: -380, y: -220 } : { x: -150, y: -90 };
  recordUndo();
  const node = makeNode(type, center.x + sidecarOffset.x, center.y + sidecarOffset.y, referenceNodeDefaults(type));
  if (kind === "workflow" && selected && !isWorkflowNode(selected)) {
    node.sourceNodeId = selected.id;
    if (selected.assetId) node.startAssetId = selected.assetId;
  }
  state.nodes.push(node);
  openInspectorPanel();
  setSelectedNodeIds([node.id]);
  state.selectedAssetId = null;
  queueSave();
  render();
}

function referenceNodeDefaults(type) {
  if (type === "section") {
    const sectionCount = state.nodes.filter((node) => node.type === "section").length + 1;
    return {
      title: `Scene Section ${sectionCount}`,
      notes: "Use this frame to gather related shots, prompts, references, and placeholders.",
      tags: "section, scene",
      status: "draft",
      w: 760,
      h: 440,
    };
  }
  if (type === "placeholder") {
    return {
      title: "Missing Asset",
      notes: "Describe the image, reference, prompt, or audio you still need.",
      tags: "placeholder, missing",
      status: "blocked",
      neededFor: "image",
      w: 300,
    };
  }
  if (type === "inspiration") {
    return {
      title: "Inspiration",
      notes: "Store reusable style notes, prompt fragments, camera language, palette ideas, or handoff reminders.",
      tags: "inspiration, prompt-fragment",
      status: "ready",
      w: 310,
    };
  }
  if (type === "styleRef") {
    return {
      title: "Video Style References",
      notes: "Drop video files here or add links that define style, tone, pacing, camera language, color, or editing rhythm.",
      tags: "style, tone, video-reference",
      status: "ready",
      w: 310,
    };
  }
  if (type === "musicRef") {
    return {
      title: "Music References",
      notes: "Drop audio files here or add links for music direction, tempo, mood, instrumentation, and final track ideas.",
      tags: "music, audio-reference",
      status: "ready",
      w: 310,
    };
  }
  return {};
}

function selectedNode() {
  return state.nodes.find((node) => node.id === state.selectedNodeId) || null;
}

function selectedNodeIds() {
  if (Array.isArray(state.selectedNodeIds) && state.selectedNodeIds.length) {
    return state.selectedNodeIds.filter((id) => nodeById(id));
  }
  return state.selectedNodeId && nodeById(state.selectedNodeId) ? [state.selectedNodeId] : [];
}

function isNodeSelected(id) {
  return selectedNodeIds().includes(id);
}

function setSelectedNodeIds(ids) {
  const unique = [...new Set(ids)].filter((id) => nodeById(id));
  state.selectedNodeIds = unique;
  state.selectedNodeId = unique.at(-1) || null;
}

function toggleNodeSelection(id) {
  const ids = selectedNodeIds();
  if (ids.includes(id)) {
    setSelectedNodeIds(ids.filter((item) => item !== id));
  } else {
    setSelectedNodeIds([...ids, id]);
  }
}

function selectedAsset() {
  return state.assets.find((asset) => asset.id === state.selectedAssetId) || null;
}

function assetById(id) {
  return state.assets.find((asset) => asset.id === id) || null;
}

function nodeById(id) {
  return state.nodes.find((node) => node.id === id) || null;
}

function nodesInsideSection(section) {
  if (!section || section.type !== "section") return [];
  return state.nodes.filter(
    (node) =>
      node.id !== section.id &&
      node.x >= section.x &&
      node.y >= section.y &&
      node.x + node.w <= section.x + section.w &&
      node.y + Math.max(154, node.h) <= section.y + section.h,
  );
}

function viewportCenterWorld() {
  const rect = els.viewport.getBoundingClientRect();
  return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function screenToWorld(clientX, clientY) {
  const rect = els.viewport.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.view.x) / state.view.scale,
    y: (clientY - rect.top - state.view.y) / state.view.scale,
  };
}

function worldToScreen(x, y) {
  return {
    x: x * state.view.scale + state.view.x,
    y: y * state.view.scale + state.view.y,
  };
}

function onWheel(event) {
  event.preventDefault();
  const before = screenToWorld(event.clientX, event.clientY);
  const nextScale = clamp(state.view.scale * (event.deltaY < 0 ? 1.08 : 0.92), 0.22, 2.3);
  state.view.scale = nextScale;
  const rect = els.viewport.getBoundingClientRect();
  state.view.x = event.clientX - rect.left - before.x * nextScale;
  state.view.y = event.clientY - rect.top - before.y * nextScale;
  applyView();
  renderLinks();
  renderMinimap();
  queueSave();
}

function onViewportPointerDown(event) {
  if (event.target !== els.viewport && event.target !== els.world && event.target !== els.nodeLayer && event.target !== els.linkLayer) return;
  if (event.button !== 0) return;
  if (activeTool === "hand") {
    startPan(event);
    return;
  }
  if (event.shiftKey || event.altKey || isSpacePanning) {
    startPan(event);
    return;
  }
  startLasso(event);
}

function startPan(event) {
  panState = {
    startX: event.clientX,
    startY: event.clientY,
    viewX: state.view.x,
    viewY: state.view.y,
  };
  els.viewport.classList.add("is-panning");
  event.preventDefault();
}

function onNodePointerDown(event) {
  if (activeTool === "hand" && !event.target.closest("button,input,textarea,select,a,audio,video")) {
    startPan(event);
    event.stopPropagation();
    return;
  }
  const handle = event.target.closest("[data-connection-handle]");
  if (handle) {
    startNodeConnection(event, handle);
    return;
  }
  const nodeEl = event.target.closest(".canvas-node");
  if (!nodeEl || event.target.closest("button,input,textarea,select,a,audio,video")) return;
  const node = nodeById(nodeEl.dataset.nodeId);
  if (!node) return;
  openInspectorPanel();
  if (event.shiftKey || event.metaKey || event.ctrlKey) {
    toggleNodeSelection(node.id);
  } else if (!isNodeSelected(node.id)) {
    setSelectedNodeIds([node.id]);
  }
  state.selectedAssetId = null;
  const dragIds =
    node.type === "section" && selectedNodeIds().length <= 1
      ? [node.id, ...nodesInsideSection(node).map((item) => item.id)]
      : selectedNodeIds();
  dragState = {
    id: node.id,
    ids: dragIds,
    startX: event.clientX,
    startY: event.clientY,
    nodePositions: dragIds.map((id) => {
      const item = nodeById(id);
      return { id, x: item.x, y: item.y };
    }),
    undoRecorded: false,
    moved: false,
  };
  nodeEl.setPointerCapture?.(event.pointerId);
  render();
}

function onPointerMove(event) {
  if (connectState) {
    updateConnectionPreview(event.clientX, event.clientY);
    return;
  }
  if (lassoState) {
    updateLasso(event.clientX, event.clientY);
    return;
  }
  if (dragState) {
    const dx = (event.clientX - dragState.startX) / state.view.scale;
    const dy = (event.clientY - dragState.startY) / state.view.scale;
    if (Math.abs(event.clientX - dragState.startX) + Math.abs(event.clientY - dragState.startY) > 3) dragState.moved = true;
    if (!dragState.undoRecorded) {
      recordUndo();
      dragState.undoRecorded = true;
    }
    dragState.nodePositions.forEach((position) => {
      const node = nodeById(position.id);
      if (!node) return;
      node.x = position.x + dx;
      node.y = position.y + dy;
      node.updatedAt = now();
    });
    renderNodes();
    renderLinks();
    renderMinimap();
    queueSave();
    return;
  }
  if (panState) {
    state.view.x = panState.viewX + event.clientX - panState.startX;
    state.view.y = panState.viewY + event.clientY - panState.startY;
    applyView();
    renderLinks();
    renderMinimap();
    queueSave();
  }
}

function onPointerUp(event) {
  if (connectState) {
    finishNodeConnection(event);
    return;
  }
  if (lassoState) {
    finishLasso(event);
    return;
  }
  if (dragState?.moved) suppressNextNodeClick = true;
  dragState = null;
  panState = null;
  els.viewport.classList.remove("is-panning");
}

function startLasso(event) {
  const rect = els.viewport.getBoundingClientRect();
  lassoState = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: event.clientX - rect.left,
    startY: event.clientY - rect.top,
  };
  els.viewport.classList.add("is-lassoing");
  updateLasso(event.clientX, event.clientY);
  event.preventDefault();
}

function updateLasso(clientX, clientY) {
  const rect = els.viewport.getBoundingClientRect();
  const currentX = clientX - rect.left;
  const currentY = clientY - rect.top;
  const left = Math.min(lassoState.startX, currentX);
  const top = Math.min(lassoState.startY, currentY);
  const width = Math.abs(currentX - lassoState.startX);
  const height = Math.abs(currentY - lassoState.startY);
  els.lassoBox.hidden = false;
  els.lassoBox.style.left = `${left}px`;
  els.lassoBox.style.top = `${top}px`;
  els.lassoBox.style.width = `${width}px`;
  els.lassoBox.style.height = `${height}px`;
}

function finishLasso(event) {
  const moved = Math.abs(event.clientX - lassoState.startClientX) + Math.abs(event.clientY - lassoState.startClientY) > 8;
  if (moved) {
    const rect = els.lassoBox.getBoundingClientRect();
    const selectedIds = state.nodes
      .filter((node) => {
        const nodeEl = els.nodeLayer.querySelector(`[data-node-id="${node.id}"]`);
        if (!nodeEl) return false;
        const nodeRect = nodeEl.getBoundingClientRect();
        return rect.left <= nodeRect.right && rect.right >= nodeRect.left && rect.top <= nodeRect.bottom && rect.bottom >= nodeRect.top;
      })
      .map((node) => node.id);
    setSelectedNodeIds(selectedIds);
    state.selectedAssetId = null;
    if (selectedIds.length) openInspectorPanel();
    render();
    if (selectedIds.length) toast(`已选择 ${selectedIds.length} 张卡片`);
  } else {
    setSelectedNodeIds([]);
    state.selectedAssetId = null;
    render();
  }
  lassoState = null;
  els.lassoBox.hidden = true;
  els.viewport.classList.remove("is-lassoing");
}

function startNodeConnection(event, handle) {
  const nodeEl = handle.closest(".canvas-node");
  const node = nodeEl ? nodeById(nodeEl.dataset.nodeId) : null;
  if (!node) return;
  connectState = {
    sourceNodeId: node.id,
    sourceSide: handle.dataset.side || "right",
    previewId: "connection-preview",
  };
  setSelectedNodeIds([node.id]);
  state.selectedAssetId = null;
  updateConnectionPreview(event.clientX, event.clientY);
  renderInspector();
  event.preventDefault();
  event.stopPropagation();
}

function updateConnectionPreview(clientX, clientY) {
  const source = nodeById(connectState.sourceNodeId);
  if (!source) return;
  const end = screenToWorld(clientX, clientY);
  const start = connectionPoint(source, connectState.sourceSide);
  const targetSide = targetSideFromPoint(clientX, clientY) || (end.x < start.x ? "right" : "left");
  const pathData = connectionPath(start, end, connectState.sourceSide, targetSide);
  const existing = els.linkLayer.querySelector(`#${connectState.previewId}`);
  const path = existing || document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.id = connectState.previewId;
  path.classList.add("connection-preview");
  path.setAttribute("d", pathData);
  if (!existing) els.linkLayer.append(path);
}

function finishNodeConnection(event) {
  const sourceId = connectState.sourceNodeId;
  const sourceSide = connectState.sourceSide;
  const targetEl = document.elementFromPoint(event.clientX, event.clientY)?.closest(".canvas-node");
  const target = targetEl ? nodeById(targetEl.dataset.nodeId) : null;
  const targetSide = targetSideFromPoint(event.clientX, event.clientY) || "left";
  els.linkLayer.querySelector(`#${connectState.previewId}`)?.remove();
  connectState = null;
  dragState = null;
  panState = null;
  els.viewport.classList.remove("is-panning");
  if (!target || target.id === sourceId) {
    renderLinks();
    return;
  }
  recordUndo();
  target.sourceNodeId = sourceId;
  target.linkSourceSide = sourceSide;
  target.linkTargetSide = targetSide;
  target.updatedAt = now();
  setSelectedNodeIds([target.id]);
  state.selectedAssetId = null;
  queueSave();
  render();
  toast("卡片已连接");
}

function targetSideFromPoint(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  const handle = element?.closest("[data-connection-handle]");
  if (handle?.dataset.side) return handle.dataset.side;
  const nodeEl = element?.closest(".canvas-node");
  if (!nodeEl) return "";
  const rect = nodeEl.getBoundingClientRect();
  return clientX < rect.left + rect.width / 2 ? "left" : "right";
}

function onMinimapPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();
  jumpToMinimapPoint(event.clientX, event.clientY);
}

function onMinimapKeyDown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  fitView();
}

function jumpToMinimapPoint(clientX, clientY) {
  const geometry = getMinimapGeometry();
  if (!geometry) return;
  const rect = els.minimapSvg.getBoundingClientRect();
  const localX = ((clientX - rect.left) / rect.width) * 180;
  const localY = ((clientY - rect.top) / rect.height) * 180;
  const worldX = (localX - geometry.offsetX) / geometry.scale + geometry.bounds.minX;
  const worldY = (localY - geometry.offsetY) / geometry.scale + geometry.bounds.minY;
  const viewport = els.viewport.getBoundingClientRect();
  state.view.x = viewport.width / 2 - worldX * state.view.scale;
  state.view.y = viewport.height / 2 - worldY * state.view.scale;
  applyView();
  renderLinks();
  renderMinimap();
  queueSave();
}

function onNodeClick(event) {
  if (activeTool === "hand") return;
  if (suppressNextNodeClick) {
    suppressNextNodeClick = false;
    return;
  }
  const nodeEl = event.target.closest(".canvas-node");
  if (!nodeEl) return;
  openInspectorPanel();
  if (event.shiftKey || event.metaKey || event.ctrlKey) {
    toggleNodeSelection(nodeEl.dataset.nodeId);
  } else {
    setSelectedNodeIds([nodeEl.dataset.nodeId]);
  }
  state.selectedAssetId = null;
  render();
}

function onKeyDown(event) {
  if (event.target.matches("input,textarea,select")) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undoLastChange();
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    isSpacePanning = true;
    els.viewport.classList.add("space-pan");
    return;
  }
  const ids = selectedNodeIds();
  if ((event.key === "Backspace" || event.key === "Delete") && ids.length) {
    deleteNodes(ids);
  }
}

async function onCanvasDrop(event) {
  event.preventDefault();
  const world = screenToWorld(event.clientX, event.clientY);
  const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/"));
  if (files.length) {
    await importFiles(files, world);
    return;
  }
  const assetId = event.dataTransfer.getData("text/asset-id");
  if (assetId) addMediaNode(assetId, world.x, world.y);
}

async function importFiles(files, origin) {
  if (!files.length) return;
  recordUndo();
  const imported = [];
  for (const file of files) {
    const asset = await createAssetFromFile(file);
    await putAsset(asset);
    state.assets.unshift(asset);
    imported.push(asset);
  }
  imported.forEach((asset, index) => {
    addMediaNode(asset.id, origin.x + index * 300, origin.y + (index % 2) * 28, false);
  });
  setSelectedNodeIds([state.nodes[state.nodes.length - 1]?.id].filter(Boolean));
  state.selectedAssetId = imported[0]?.id || null;
  queueSave();
  render();
  toast(`已导入 ${imported.length} 项资源`);
}

function createAssetFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: uid("asset"),
        name: file.name,
        type: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
        mime: file.type,
        size: file.size,
        dataUrl: reader.result,
        createdAt: now(),
        updatedAt: now(),
        favorite: false,
        archived: false,
        inbox: true,
        tags: "",
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function addMediaNode(assetId, x, y, rerender = true) {
  const asset = assetById(assetId);
  if (rerender) recordUndo();
  const node = makeNode("media", x, y, {
    title: asset?.name || "素材",
    assetId,
    w: 300,
    notes: asset?.tags || "",
    tags: asset?.tags || "",
  });
  state.nodes.push(node);
  openInspectorPanel();
  setSelectedNodeIds([node.id]);
  state.selectedAssetId = assetId;
  if (rerender) {
    queueSave();
    render();
  }
  return node;
}

function onAssetDragStart(event) {
  const card = event.target.closest(".asset-card");
  if (!card) return;
  event.dataTransfer.setData("text/asset-id", card.dataset.assetId);
  event.dataTransfer.effectAllowed = "copy";
}

async function onAssetGridClick(event) {
  const button = event.target.closest("button");
  const card = event.target.closest(".asset-card");
  if (!card) return;
  const asset = assetById(card.dataset.assetId);
  if (!asset) return;
  openInspectorPanel();
  setSelectedNodeIds([]);
  state.selectedAssetId = asset.id;
  if (button?.dataset.assetAction === "favorite") {
    asset.favorite = !asset.favorite;
    asset.updatedAt = now();
    await putAsset(asset);
    queueSave();
    render();
    return;
  }
  if (button?.dataset.assetAction === "archive") {
    asset.archived = !asset.archived;
    asset.updatedAt = now();
    await putAsset(asset);
    queueSave();
    render();
    return;
  }
  if (button?.dataset.assetAction === "inbox") {
    asset.inbox = !asset.inbox;
    asset.updatedAt = now();
    await putAsset(asset);
    queueSave();
    render();
    return;
  }
  if (button?.dataset.assetAction === "add") {
    addMediaNode(asset.id, viewportCenterWorld().x - 140, viewportCenterWorld().y - 80);
    return;
  }
  renderInspector();
}

function onInspectorInput(event) {
  const target = event.target;
  const field = target.dataset.field;
  if (!field) return;
  const node = selectedNode();
  if (!node) return;
  node[field] = target.value;
  node.updatedAt = now();
  if (field === "title" || field === "prompt" || field === "overallPrompt" || field === "stylePrompt" || field === "musicPrompt" || field === "referenceUrl" || field === "neededFor" || field === "tags" || field === "notes" || field === "shotSize" || field === "cameraAngle" || field === "cameraMovement" || field === "priority" || field === "reviewDecision") {
    renderNodes();
    renderShotList();
  }
  if (field === "startAssetId" || field === "endAssetId" || field === "sourceNodeId" || field === "linkSourceSide" || field === "linkTargetSide" || field === "status" || field === "referenceAssetId") {
    renderNodes();
    renderLinks();
    renderMinimap();
  }
  queueSave();
}

function onInspectorClick(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const node = selectedNode();
  if (action === "close-inspector") {
    closeInspectorPanel();
    return;
  }
  if (action === "delete-node" && node) deleteNodes(isNodeSelected(node.id) ? selectedNodeIds() : [node.id]);
  if (action === "duplicate-node" && node) duplicateNode(node.id);
  if (action === "upload-reference-file" && node) {
    pendingNodeFileId = node.id;
    els.nodeFileInput.accept = node.type === "musicRef" ? "audio/*,video/*" : "video/*,image/*";
    els.nodeFileInput.click();
  }
  if (action === "add-attempt" && node && isWorkflowNode(node)) {
    addAttemptFromInspector(node);
  }
  if (action === "mark-attempt-winner" && node && isWorkflowNode(node)) {
    markAttemptWinner(node, event.target.closest("[data-attempt-id]")?.dataset.attemptId);
  }
  if (action === "delete-attempt" && node && isWorkflowNode(node)) {
    deleteAttempt(node, event.target.closest("[data-attempt-id]")?.dataset.attemptId);
  }
  if (action === "add-selected-asset") {
    const asset = selectedAsset();
    if (asset) addMediaNode(asset.id, viewportCenterWorld().x - 140, viewportCenterWorld().y - 80);
  }
  if (action === "workflow-from-asset") {
    const asset = selectedAsset();
    if (!asset) return;
    recordUndo();
    const center = viewportCenterWorld();
    const mediaNode = addMediaNode(asset.id, center.x - 330, center.y - 70, false);
    const workflow = makeNode("workflow", center.x + 20, center.y - 80, {
      startAssetId: asset.id,
      sourceNodeId: mediaNode.id,
      title: "Image to Video",
      prompt: "Describe the motion, camera, continuity, and final frame.",
    });
    state.nodes.push(workflow);
    setSelectedNodeIds([workflow.id]);
    queueSave();
    render();
  }
}

function inspectorAttemptValue(field) {
  return els.inspector.querySelector(`[data-attempt-field="${field}"]`)?.value.trim() || "";
}

function addAttemptFromInspector(node) {
  const outputUrl = inspectorAttemptValue("outputUrl");
  const notes = inspectorAttemptValue("notes");
  const label = inspectorAttemptValue("label") || `生成尝试 ${(node.attempts || []).length + 1}`;
  if (!outputUrl && !notes) {
    toast("请填写输出链接或备注");
    return;
  }
  recordUndo();
  node.attempts = Array.isArray(node.attempts) ? node.attempts : [];
  node.attempts.unshift({
    id: uid("attempt"),
    label,
    status: inspectorAttemptValue("status") || "candidate",
    outputUrl,
    seed: inspectorAttemptValue("seed"),
    notes,
    createdAt: now(),
  });
  node.updatedAt = now();
  queueSave();
  renderInspector();
  renderNodes();
  toast("生成尝试已记录");
}

function markAttemptWinner(node, attemptId) {
  if (!attemptId) return;
  recordUndo();
  node.attempts = (node.attempts || []).map((attempt) => ({
    ...attempt,
    status: attempt.id === attemptId ? "winner" : attempt.status === "winner" ? "candidate" : attempt.status,
  }));
  node.updatedAt = now();
  queueSave();
  renderInspector();
  toast("已标记为最终版");
}

function deleteAttempt(node, attemptId) {
  if (!attemptId) return;
  recordUndo();
  node.attempts = (node.attempts || []).filter((attempt) => attempt.id !== attemptId);
  node.updatedAt = now();
  queueSave();
  renderInspector();
  toast("生成尝试已删除");
}

async function attachFileToSelectedReference(file) {
  const node = nodeById(pendingNodeFileId);
  pendingNodeFileId = "";
  if (!file || !node) return;
  const valid =
    node.type === "musicRef"
      ? file.type.startsWith("audio/") || file.type.startsWith("video/")
      : file.type.startsWith("video/") || file.type.startsWith("image/");
  if (!valid) {
    toast(node.type === "musicRef" ? "声音参考请使用音频或视频" : "风格参考请使用视频或图片");
    return;
  }
  const asset = await createAssetFromFile(file);
  asset.tags = node.type === "musicRef" ? "音乐, 声音参考" : "风格, 调性, 影像参考";
  asset.inbox = false;
  await putAsset(asset);
  recordUndo();
  state.assets.unshift(asset);
  allAssets = state.assets;
  node.referenceAssetId = asset.id;
  node.updatedAt = now();
  setSelectedNodeIds([node.id]);
  state.selectedAssetId = asset.id;
  queueSave();
  render();
  toast("文件已关联到卡片");
}

function openReferenceDialog() {
  els.referenceType.value = "video-link";
  els.referenceTitle.value = "";
  els.referenceUrl.value = "";
  els.referenceNotes.value = "";
  els.referenceDialog.showModal();
}

async function saveReferenceLink() {
  const externalUrl = els.referenceUrl.value.trim();
  if (!externalUrl) {
    toast("请先填写 URL");
    return;
  }
  const type = els.referenceType.value;
  const title = els.referenceTitle.value.trim() || inferReferenceTitle(externalUrl, type);
  const tags = type === "video-link" ? "风格, 调性, 影像参考" : type === "music-link" ? "音乐, 声音参考" : "参考";
  const asset = {
    id: uid("asset"),
    name: title,
    type,
    mime: "text/uri-list",
    size: 0,
    dataUrl: "",
    externalUrl,
    createdAt: now(),
    updatedAt: now(),
    favorite: false,
    archived: false,
    inbox: false,
    tags,
    notes: els.referenceNotes.value.trim(),
  };
  await putAsset(asset);
  recordUndo();
  allAssets.unshift(asset);
  state.assets = allAssets;
  const center = viewportCenterWorld();
  const isSideReference = type === "video-link" || type === "music-link";
  const node = addMediaNode(asset.id, center.x + (isSideReference ? 430 : -150), center.y + (type === "music-link" ? 35 : isSideReference ? -210 : -90), false);
  node.notes = asset.notes || asset.tags;
  node.prompt = asset.notes;
  setSelectedNodeIds([node.id]);
  state.selectedAssetId = asset.id;
  persistProjectState();
  render();
  els.referenceDialog.close();
  toast("参考链接已添加");
}

function inferReferenceTitle(url, type) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (type === "video-link") return `Video reference - ${host}`;
    if (type === "music-link") return `Music reference - ${host}`;
    return `Reference - ${host}`;
  } catch {
    return type === "music-link" ? "Music reference" : "Video reference";
  }
}

function deleteNode(id) {
  deleteNodes([id]);
}

function deleteNodes(ids) {
  const deleteIds = [...new Set(ids)].filter((id) => nodeById(id));
  if (!deleteIds.length) return;
  recordUndo();
  state.nodes = state.nodes.filter((node) => !deleteIds.includes(node.id));
  state.nodes.forEach((node) => {
    if (deleteIds.includes(node.sourceNodeId)) node.sourceNodeId = "";
  });
  setSelectedNodeIds([]);
  queueSave();
  render();
}

function duplicateNode(id) {
  const node = nodeById(id);
  if (!node) return;
  recordUndo();
  const copy = {
    ...node,
    id: uid("node"),
    x: node.x + 34,
    y: node.y + 34,
    title: `${node.title} copy`,
    createdAt: now(),
    updatedAt: now(),
  };
  state.nodes.push(copy);
  setSelectedNodeIds([copy.id]);
  queueSave();
  render();
}

function fitView(options = {}) {
  fitViewToNodes(state.nodes, options);
}

function fitViewToNodes(nodes, options = {}) {
  const { padding = 120, minScale = 0.25, maxScale = 1.15, persist = true } = options;
  if (!nodes.length) {
    state.view = { x: 520, y: 230, scale: 0.9 };
    render();
    return;
  }
  const rect = els.viewport.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + node.w),
      maxY: Math.max(acc.maxY, node.y + node.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const availableWidth = Math.max(1, rect.width - padding);
  const availableHeight = Math.max(1, rect.height - padding);
  const scale = clamp(Math.min(availableWidth / width, availableHeight / height), minScale, maxScale);
  state.view.scale = scale;
  state.view.x = (rect.width - width * scale) / 2 - bounds.minX * scale;
  state.view.y = (rect.height - height * scale) / 2 - bounds.minY * scale;
  if (persist) queueSave();
  render();
}

function render() {
  renderProjectSelect();
  updateUndoButton();
  applyPanelLayout();
  applyView();
  renderAssets();
  renderNodes();
  renderLinks();
  renderMinimap();
  renderShotList();
  renderInspector();
}

function renderProjectSelect() {
  if (!els.canvasSelect) return;
  els.canvasSelect.innerHTML = projects
    .map((project) => `<option value="${project.id}" ${project.id === state.id ? "selected" : ""}>${esc(project.title)}</option>`)
    .join("");
}

function applyView() {
  els.world.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
}

function renderAssets() {
  els.assetGrid.dataset.size = assetSizeMode;
  els.assetSizeBtn.textContent = `尺寸：${assetSizeLabel()}`;
  els.assetSizeBtn.setAttribute("aria-label", `资源卡片尺寸 ${assetSizeMode}`);
  renderAssetTypeFilters();
  const filtered = state.assets.filter((asset) => {
    if (!assetFilters.showArchived && asset.archived) return false;
    if (assetFilters.favoritesOnly && !asset.favorite) return false;
    if (assetFilters.inboxOnly && !asset.inbox) return false;
    if (!assetMatchesTypeFilter(asset, assetFilters.type)) return false;
    const haystack = `${asset.name} ${asset.tags} ${asset.notes || ""}`.toLowerCase();
    return !assetFilters.search || haystack.includes(assetFilters.search);
  });
  els.assetCount.textContent = `${filtered.length} 项资源`;
  els.assetGrid.innerHTML = filtered
    .map((asset) => {
      const media = renderAssetMedia(asset, "asset-thumb");
      return `
        <article class="asset-card" draggable="true" data-asset-id="${asset.id}">
          ${media}
          <div class="asset-meta">
            <span class="asset-name" title="${esc(asset.name)}">${esc(asset.name)}</span>
            <button class="mini-button ${asset.favorite ? "is-on" : ""}" type="button" data-asset-action="favorite" title="标记收藏" data-tip="标记收藏">★</button>
            <button class="mini-button" type="button" data-asset-action="add" title="添加到画布" data-tip="添加到画布">+</button>
            <button class="mini-button ${asset.inbox ? "is-on" : ""}" type="button" data-asset-action="inbox" title="${asset.inbox ? "标记已整理" : "放入收件箱"}" data-tip="${asset.inbox ? "标记已整理" : "放入收件箱"}">收</button>
            <button class="mini-button ${asset.archived ? "is-on" : ""}" type="button" data-asset-action="archive" title="归档资源" data-tip="归档资源">归</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAssetTypeFilters() {
  els.assetTypeFilters.querySelectorAll("[data-asset-filter]").forEach((button) => {
    const isActive = (button.dataset.assetFilter || "all") === assetFilters.type;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function assetMatchesTypeFilter(asset, filterType = "all") {
  if (filterType === "all") return true;
  const haystack = `${asset.name || ""} ${asset.tags || ""} ${asset.notes || ""} ${asset.type || ""}`.toLowerCase();
  if (filterType === "storyboard") {
    return asset.type === "image" && !haystack.includes("style-reference") && !haystack.includes("music") && !haystack.includes("audio") && !haystack.includes("风格") && !haystack.includes("音乐") && !haystack.includes("声音");
  }
  if (filterType === "video") {
    return asset.type === "video" || haystack.includes("video generation") || haystack.includes("generated video") || haystack.includes("render") || haystack.includes("视频") || haystack.includes("生成");
  }
  if (filterType === "music") {
    return asset.type === "audio" || asset.type === "music-link" || haystack.includes("music") || haystack.includes("audio") || haystack.includes("音乐") || haystack.includes("声音") || haystack.includes("音频");
  }
  if (filterType === "style") {
    return (
      asset.type === "video-link" ||
      asset.type === "reference-link" ||
      haystack.includes("style") ||
      haystack.includes("tone") ||
      haystack.includes("visual reference") ||
      haystack.includes("video-reference") ||
      haystack.includes("风格") ||
      haystack.includes("调性") ||
      haystack.includes("影像参考")
    ) && asset.type !== "music-link" && !haystack.includes("music") && !haystack.includes("音乐") && !haystack.includes("声音");
  }
  return true;
}

function renderNodes() {
  els.nodeLayer.innerHTML = state.nodes.map(renderNode).join("");
}

function renderNode(node) {
  const classes = [
    "canvas-node",
    `module-${moduleColorKey(node)}`,
    isNodeSelected(node.id) ? "is-selected" : "",
    node.type === "section" ? "is-section-node" : "",
    node.type === "scene" ? "is-scene-node" : "",
    node.type === "shot" ? "is-shot-node" : "",
    isWorkflowNode(node) ? "is-workflow-node" : "",
    node.type === "placeholder" ? "is-placeholder-node" : "",
    node.type === "inspiration" ? "is-inspiration-node" : "",
    canvasSearch && nodeMatchesCanvasSearch(node) ? "is-search-match" : "",
    canvasSearch && !nodeMatchesCanvasSearch(node) ? "is-search-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <article class="${classes}" data-node-id="${node.id}" style="--node-width:${node.w}px; --node-height:${node.h}px; transform: translate(${node.x}px, ${node.y}px);">
      <button class="connect-handle connect-left" type="button" data-connection-handle="source" data-side="left" title="从左侧圆点拖出连接卡片" data-tip="从左侧圆点拖出连接卡片" aria-label="从左侧连接"></button>
      <button class="connect-handle connect-right" type="button" data-connection-handle="source" data-side="right" title="从右侧圆点拖出连接卡片" data-tip="从右侧圆点拖出连接卡片" aria-label="从右侧连接"></button>
      <header class="node-head">
        <span class="node-title">${esc(node.title)}</span>
        ${node.shotOrderLabel ? `<span class="node-order-badge">${esc(node.shotOrderLabel)}</span>` : ""}
        <span class="node-kind">${esc(shortKind(node.type))}</span>
      </header>
      <section class="node-body">${renderNodeBody(node)}</section>
    </article>
  `;
}

function shortKind(type) {
  return {
    workflow: "I2V",
    imageWorkflow: "生图",
    shot: "镜头",
    character: "角色",
    scene: "场景",
    section: "模块",
    placeholder: "待补",
    inspiration: "灵感",
    styleRef: "风格",
    musicRef: "声音",
    note: "备注",
    media: "素材",
  }[type] || "卡片";
}

function renderNodeBody(node) {
  if (node.type === "section") {
    const ready = readinessForNode(node);
    const children = nodesInsideSection(node);
    return `
      <div class="section-summary">
        <p class="node-note">${esc(node.overallPrompt || node.notes || "把相关镜头、提示词、参考和待补项集中在这个模块里。")}</p>
        <div class="status-row">
          <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status))}</span>
          <span class="tag">${children.length} 张卡片</span>
          <span class="tag">${ready.done}/${ready.total} 已就绪</span>
        </div>
      </div>
    `;
  }
  if (node.type === "placeholder") {
    const ready = readinessForNode(node);
    return `
      <div class="placeholder-card">
        <strong>${esc(needLabel(node.neededFor))}</strong>
        <p class="node-note">${esc(node.prompt || node.notes || "描述还缺少的素材、提示词、参考、声音或审批。")}</p>
        <div class="status-row">
          <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status || "blocked"))}</span>
          <span class="tag">${ready.done}/${ready.total} 已解决</span>
        </div>
      </div>
    `;
  }
  if (node.type === "inspiration") {
    return `
      <div class="inspiration-card">
        <p class="node-note">${esc(node.prompt || node.stylePrompt || node.overallPrompt || node.notes || "放入可复用提示词、镜头想法、剪辑备注或调性参考。")}</p>
        <div class="status-row">
          <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status || "ready"))}</span>
          ${node.tags ? node.tags.split(",").slice(0, 3).map((tag) => `<span class="tag">${esc(tag.trim())}</span>`).join("") : ""}
        </div>
      </div>
    `;
  }
  if (node.type === "shot") {
    const meta = [
      ["景别", node.shotSize],
      ["机位", node.cameraAngle],
      ["运动", node.cameraMovement],
      ["地点", node.location],
      ["镜头感", node.lensFeel],
      ["优先级", node.priority],
    ].filter(([, value]) => value);
    return `
      <div class="shot-node-summary">
        <div class="shot-node-focus">
          <span>叙事目的</span>
          <p>${esc(node.overallPrompt || node.subjectAction || node.prompt || "描述这个镜头的叙事目的、动作和画面重点。")}</p>
        </div>
        ${node.subjectAction ? `<p class="shot-node-action">动作：${esc(node.subjectAction)}</p>` : ""}
        <div class="shot-node-meta">
          ${meta.map(([label, value]) => `<span><b>${esc(label)}</b>${esc(value)}</span>`).join("")}
        </div>
        <div class="status-row">
          <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status || "draft"))}</span>
          ${node.tags ? node.tags.split(",").slice(0, 3).map((tag) => `<span class="tag">${esc(tag.trim())}</span>`).join("") : ""}
        </div>
      </div>
    `;
  }
  if (node.type === "media") {
    const asset = assetById(node.assetId);
    if (!asset) return `<p class="node-note">素材缺失</p>`;
    const meta = [node.globalShotOrder ? `#${node.globalShotOrder}` : "", node.shotSize, node.cameraMovement, node.lensFeel].filter(Boolean).join(" / ");
    return `
      ${renderAssetMedia(asset, "node-media")}
      <div class="shot-card-summary">
        <strong>${esc(node.shotBeatTitle || node.shotOrderLabel || "镜头")}</strong>
        ${meta ? `<span>${esc(meta)}</span>` : ""}
      </div>
      <p class="node-note compact-note">${esc(node.subjectAction || node.notes || asset.tags || asset.name)}</p>
    `;
  }
  if (node.type === "styleRef" || node.type === "musicRef") {
    const asset = assetById(node.referenceAssetId);
    return `
      ${asset ? renderAssetMedia(asset, "node-media") : ""}
      ${node.referenceUrl ? renderReferenceUrl(node.referenceUrl, node.type) : ""}
      <div class="status-row">
        <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status || "draft"))}</span>
        ${node.tags ? node.tags.split(",").slice(0, 3).map((tag) => `<span class="tag">${esc(tag.trim())}</span>`).join("") : ""}
        ${node.influenceUse ? `<span class="tag">${esc(node.influenceUse)}</span>` : ""}
      </div>
      <p class="node-note">${esc(node.stylePrompt || node.musicPrompt || node.notes || "在检查器里添加链接或上传参考文件。")}</p>
    `;
  }
  if (isWorkflowNode(node)) {
    const start = assetById(node.startAssetId);
    const end = assetById(node.endAssetId);
    return `
      <div class="workflow-summary">
        <div class="workflow-strip">
          ${start ? renderAssetMedia(start, "workflow-frame") : `<div class="placeholder-frame">起始帧</div>`}
          <span class="workflow-arrow">-&gt;</span>
          ${end ? renderAssetMedia(end, "workflow-frame") : `<div class="placeholder-frame">结束帧</div>`}
        </div>
        <div class="status-row">
          <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status || "draft"))}</span>
          <span class="tag">${esc(node.model || "模型")}</span>
          <span class="tag">${esc(node.duration || node.resolution || "")}</span>
          ${node.priority && node.priority !== "normal" ? `<span class="tag">${esc(node.priority)}</span>` : ""}
          ${(node.attempts || []).some((attempt) => attempt.status === "winner") ? `<span class="tag">已有最终版</span>` : ""}
        </div>
        <p class="node-note">${esc(node.prompt || node.subjectAction || node.notes || "待填写提示词")}</p>
      </div>
    `;
  }
  return `
    <div class="status-row">
      <span class="status-pill ${esc(node.status)}">${esc(statusLabel(node.status || "draft"))}</span>
      ${node.tags ? node.tags.split(",").slice(0, 3).map((tag) => `<span class="tag">${esc(tag.trim())}</span>`).join("") : ""}
      ${node.shotSize ? `<span class="tag">${esc(node.shotSize)}</span>` : ""}
      ${node.reviewDecision ? `<span class="tag">${esc(node.reviewDecision)}</span>` : ""}
    </div>
    <p class="node-note">${esc(node.overallPrompt || node.stylePrompt || node.musicPrompt || node.prompt || node.notes || "暂无备注。")}</p>
  `;
}

function renderReferenceUrl(url, type) {
  const label = type === "musicRef" ? "声音链接" : "影像链接";
  return `<a class="node-media asset-placeholder link-placeholder reference-url-card" href="${esc(url)}" target="_blank" rel="noreferrer"><strong>${label}</strong><span>${esc(url)}</span></a>`;
}

function renderAssetMedia(asset, className) {
  if (asset.type === "video") return `<video class="${className}" src="${asset.dataUrl}" muted playsinline controls></video>`;
  if (asset.type === "audio") {
    return `<div class="${className} asset-placeholder audio-placeholder"><strong>音频</strong><span>${esc(asset.name)}</span><audio src="${asset.dataUrl}" controls></audio></div>`;
  }
  if (asset.type === "video-link" || asset.type === "music-link" || asset.type === "reference-link") {
    const label = asset.type === "video-link" ? "影像参考" : asset.type === "music-link" ? "声音参考" : "参考";
    return `<a class="${className} asset-placeholder link-placeholder" href="${esc(asset.externalUrl)}" target="_blank" rel="noreferrer"><strong>${label}</strong><span>${esc(asset.name)}</span><small>${esc(asset.externalUrl)}</small></a>`;
  }
  return `<img class="${className}" src="${asset.dataUrl}" alt="${esc(asset.name)}" />`;
}

function renderLinks() {
  const paths = [];
  for (const node of state.nodes) {
    if (!node.sourceNodeId) continue;
    const source = nodeById(node.sourceNodeId);
    if (!source) continue;
    const sourceSide = node.linkSourceSide || "right";
    const targetSide = node.linkTargetSide || "left";
    const a = connectionPoint(source, sourceSide);
    const b = connectionPoint(node, targetSide);
    paths.push(`<path d="${connectionPath(a, b, sourceSide, targetSide)}" />`);
  }
  els.linkLayer.innerHTML = paths.join("");
}

function connectionPoint(node, side = "right") {
  return {
    x: side === "left" ? node.x : node.x + node.w,
    y: node.y + Math.max(70, node.h / 2),
  };
}

function connectionPath(start, end, sourceSide = "right", targetSide = "left") {
  const distance = Math.abs(end.x - start.x);
  const tension = Math.max(80, distance / 2);
  const sourceDirection = sourceSide === "left" ? -1 : 1;
  const targetDirection = targetSide === "left" ? -1 : 1;
  const c1 = start.x + sourceDirection * tension;
  const c2 = end.x + targetDirection * tension;
  return `M ${start.x} ${start.y} C ${c1} ${start.y}, ${c2} ${end.y}, ${end.x} ${end.y}`;
}

function getNodeBounds(padding = 220) {
  if (!state.nodes.length) return null;
  const raw = state.nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + node.w),
      maxY: Math.max(acc.maxY, node.y + node.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  return {
    minX: raw.minX - padding,
    minY: raw.minY - padding,
    maxX: raw.maxX + padding,
    maxY: raw.maxY + padding,
  };
}

function getMinimapGeometry() {
  const bounds = getNodeBounds();
  if (!bounds) return null;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(160 / width, 160 / height);
  return {
    bounds,
    scale,
    offsetX: (180 - width * scale) / 2,
    offsetY: (180 - height * scale) / 2,
  };
}

function mapToMinimap(value, min, scale, offset) {
  return (value - min) * scale + offset;
}

function renderMinimap() {
  if (!els.minimapSvg) return;
  const geometry = getMinimapGeometry();
  if (!geometry) {
    els.minimapSvg.innerHTML = `<text x="90" y="94" text-anchor="middle" class="minimap-empty">Empty canvas</text>`;
    return;
  }

  const { bounds, scale, offsetX, offsetY } = geometry;
  const nodes = state.nodes
    .map((node) => {
      const x = mapToMinimap(node.x, bounds.minX, scale, offsetX);
      const y = mapToMinimap(node.y, bounds.minY, scale, offsetY);
      const width = Math.max(3, node.w * scale);
      const height = Math.max(3, node.h * scale);
      const classes = [
        "minimap-node",
        isWorkflowNode(node) ? "is-workflow" : "",
        isNodeSelected(node.id) ? "is-selected" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<rect class="${classes}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="1" />`;
    })
    .join("");

  const viewport = els.viewport.getBoundingClientRect();
  const viewWorld = {
    x: -state.view.x / state.view.scale,
    y: -state.view.y / state.view.scale,
    w: viewport.width / state.view.scale,
    h: viewport.height / state.view.scale,
  };
  const viewX = mapToMinimap(viewWorld.x, bounds.minX, scale, offsetX);
  const viewY = mapToMinimap(viewWorld.y, bounds.minY, scale, offsetY);
  const viewW = Math.max(6, viewWorld.w * scale);
  const viewH = Math.max(6, viewWorld.h * scale);
  els.minimapSvg.innerHTML = `
    ${nodes}
    <rect class="minimap-view" x="${viewX.toFixed(2)}" y="${viewY.toFixed(2)}" width="${viewW.toFixed(2)}" height="${viewH.toFixed(2)}" rx="2" />
  `;
}

function renderInspector() {
  if (!inspectorOpen) return;
  if (selectedNodeIds().length > 1) {
    els.inspector.innerHTML = renderMultiNodeInspector(selectedNodeIds());
    return;
  }
  const node = selectedNode();
  if (node) {
    els.inspector.innerHTML = renderNodeInspector(node);
    return;
  }
  const asset = selectedAsset();
  if (asset) {
    els.inspector.innerHTML = renderAssetInspector(asset);
    return;
  }
  els.inspector.innerHTML = `
    <section class="inspector-empty">
      <div class="inspector-head">
        <div>
          <h2>画布总览</h2>
          <p>${state.nodes.length} 张卡片，${state.assets.length} 项资源</p>
        </div>
        <button class="icon-button" type="button" data-action="close-inspector" title="关闭检查器" data-tip="关闭检查器" aria-label="关闭检查器">X</button>
      </div>
      <button class="button primary" type="button" data-action="workflow-from-asset">从资源创建工作流</button>
    </section>
  `;
}

function renderMultiNodeInspector(ids) {
  return `
    <section class="inspector-section">
      <div class="panel-head inspector-head">
        <div>
          <h2>已选 ${ids.length} 张卡片</h2>
          <span>拖动任意选中卡片即可整体移动。</span>
        </div>
        <div class="inspector-actions">
          <button class="icon-button" type="button" data-action="close-inspector" title="关闭检查器" data-tip="关闭检查器" aria-label="关闭检查器">-</button>
          <button class="icon-button danger" type="button" data-action="delete-node" title="删除选中卡片" data-tip="删除选中卡片" aria-label="删除选中卡片">X</button>
        </div>
      </div>
      <p class="help-text">选中卡片：${ids.map((id) => nodeById(id)?.title || id).map(esc).join(", ")}</p>
    </section>
  `;
}

function renderNodeInspector(node) {
  const typeOptions = ["draft", "ready", "review", "approved", "blocked"]
    .map((status) => `<option value="${status}" ${node.status === status ? "selected" : ""}>${statusLabel(status)}</option>`)
    .join("");
  return `
    <section class="inspector-section">
      <div class="panel-head inspector-head">
        <div>
          <h2>${esc(nodeTypeLabel(node.type))}</h2>
          <span>${esc(node.id)}</span>
        </div>
        <div class="inspector-actions">
          <button class="icon-button" type="button" data-action="close-inspector" title="关闭检查器" data-tip="关闭检查器" aria-label="关闭检查器">-</button>
          <button class="icon-button danger" type="button" data-action="delete-node" title="删除这张卡片" data-tip="删除这张卡片" aria-label="删除">X</button>
        </div>
      </div>
      <div class="field">
        <label>标题</label>
        <input data-field="title" value="${esc(node.title)}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>状态</label>
          <select data-field="status">${typeOptions}</select>
        </div>
        <div class="field">
          <label>标签</label>
          <input data-field="tags" value="${esc(node.tags)}" placeholder="镜头, 重点, v1" />
        </div>
      </div>
    </section>
    ${renderReadinessPanel(node)}
    ${isWorkflowNode(node) ? renderWorkflowFields(node) : renderPromptFields(node)}
    ${isWorkflowNode(node) ? "" : renderConnectionFields(node)}
    ${isWorkflowNode(node) ? renderAttemptsPanel(node) : ""}
    ${renderReviewPanel(node)}
    <section class="inspector-section">
      <div class="field">
        <label>备注</label>
        <textarea data-field="notes">${esc(node.notes)}</textarea>
      </div>
      <button class="button" type="button" data-action="duplicate-node" title="复制这张卡片" data-tip="复制这张卡片">复制</button>
    </section>
  `;
}

function renderReadinessPanel(node) {
  const ready = readinessForNode(node);
  return `
    <section class="inspector-section readiness-panel">
      <h3>交付就绪度</h3>
      <div class="readiness-meter" style="--ready:${ready.total ? ready.done / ready.total : 0}">
        <span></span>
      </div>
      <ul class="readiness-list">
        ${ready.items
          .map((item) => `<li class="${item.pass ? "is-done" : "is-missing"}">${item.pass ? "完成" : "待补"} ${esc(item.label)}</li>`)
          .join("")}
      </ul>
    </section>
  `;
}

function renderReviewPanel(node) {
  return `
    <section class="inspector-section">
      <h3>审阅备注</h3>
      <div class="field-row">
        <div class="field">
          <label>负责人</label>
          <input data-field="reviewOwner" value="${esc(node.reviewOwner || "")}" placeholder="我, 剪辑, 导演, 客户" />
        </div>
        <div class="field">
          <label>决定</label>
          <select data-field="reviewDecision">
            ${[
              ["", "无"],
              ["needs review", "待审"],
              ["revise", "需修改"],
              ["approved", "已通过"],
              ["hold", "暂缓"],
              ["regenerate", "重生成"],
            ].map(([value, label]) => `<option value="${value}" ${(node.reviewDecision || "") === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field">
        <label>备注</label>
        <textarea data-field="reviewNotes" placeholder="导演 / 剪辑 / 客户意见、决定和下一步动作。">${esc(node.reviewNotes || "")}</textarea>
      </div>
    </section>
  `;
}

function renderAttemptsPanel(node) {
  const attempts = Array.isArray(node.attempts) ? node.attempts : [];
  return `
    <section class="inspector-section">
      <h3>生成尝试</h3>
      <div class="field-row">
        <div class="field">
          <label>标签</label>
          <input data-attempt-field="label" placeholder="v1, v2, 可灵测试" />
        </div>
        <div class="field">
          <label>状态</label>
          <select data-attempt-field="status">
            <option value="candidate">候选</option>
            <option value="winner">最终版</option>
            <option value="rejected">废弃</option>
            <option value="needs revision">需修改</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>输出链接</label>
          <input data-attempt-field="outputUrl" placeholder="https://..." />
        </div>
        <div class="field">
          <label>Seed / 设置</label>
          <input data-attempt-field="seed" placeholder="seed, cfg, motion strength" />
        </div>
      </div>
      <div class="field">
        <label>尝试备注</label>
        <textarea data-attempt-field="notes" placeholder="哪里有效、哪里失败、下一版要改什么。"></textarea>
      </div>
      <button class="button primary" type="button" data-action="add-attempt">记录尝试</button>
      <div class="attempt-list">
        ${
          attempts.length
            ? attempts
                .map(
                  (attempt) => `
                    <article class="attempt-row">
                      <div>
                        <strong>${esc(attempt.label || "生成尝试")}</strong>
                        <span>${esc(statusLabel(attempt.status || "candidate"))}${attempt.seed ? ` / ${esc(attempt.seed)}` : ""}</span>
                        ${attempt.outputUrl ? `<a href="${esc(attempt.outputUrl)}" target="_blank" rel="noreferrer">${esc(attempt.outputUrl)}</a>` : ""}
                        ${attempt.notes ? `<p>${esc(attempt.notes)}</p>` : ""}
                      </div>
                      <div class="version-actions">
                        <button class="button compact" type="button" data-action="mark-attempt-winner" data-attempt-id="${attempt.id}">设为最终</button>
                        <button class="button compact" type="button" data-action="delete-attempt" data-attempt-id="${attempt.id}">删除</button>
                      </div>
                    </article>
                  `,
                )
                .join("")
            : `<p class="help-text">还没有记录生成输出。</p>`
        }
      </div>
    </section>
  `;
}

function renderConnectionFields(node) {
  return `
    <section class="inspector-section">
      <h3>连接关系</h3>
      <div class="field">
        <label>来源卡片</label>
        <select data-field="sourceNodeId">
          <option value="">无</option>
          ${state.nodes
            .filter((item) => item.id !== node.id)
            .map((item) => `<option value="${item.id}" ${node.sourceNodeId === item.id ? "selected" : ""}>${esc(item.title)}</option>`)
            .join("")}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>来源侧</label>
          <select data-field="linkSourceSide">
            ${[["left", "左"], ["right", "右"]].map(([side, label]) => `<option value="${side}" ${(node.linkSourceSide || "right") === side ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>本卡侧</label>
          <select data-field="linkTargetSide">
            ${[["left", "左"], ["right", "右"]].map(([side, label]) => `<option value="${side}" ${(node.linkTargetSide || "left") === side ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
    </section>
  `;
}

function renderPromptFields(node) {
  if (node.type === "media") {
    return `
      <section class="inspector-section">
        <h3>图片 / 参考提示词</h3>
        <div class="field">
          <label>此素材提示词</label>
          <textarea data-field="prompt" placeholder="此素材对应的画面、动作、风格或声音说明。">${esc(node.prompt)}</textarea>
        </div>
        <div class="field">
          <label>负面提示词</label>
          <textarea data-field="negativePrompt">${esc(node.negativePrompt)}</textarea>
        </div>
      </section>
    `;
  }
  if (node.type === "section" || node.type === "scene" || node.type === "shot") {
    return `
      ${node.type === "section" ? "" : renderShotMetadataFields(node)}
      <section class="inspector-section">
        <h3>${node.type === "section" ? "模块规划" : "场景提示词"}</h3>
        <div class="field">
          <label>${node.type === "section" ? "模块说明" : "整体场景描述"}</label>
          <textarea data-field="overallPrompt" placeholder="这个场景/模块应该是什么感觉？包括故事动作、调性、摄影、角色连续性和视觉优先级。">${esc(node.overallPrompt)}</textarea>
        </div>
        <div class="field">
          <label>风格方向</label>
          <textarea data-field="stylePrompt" placeholder="参考风格、灯光、色彩、镜头、节奏或剪辑语言。">${esc(node.stylePrompt)}</textarea>
        </div>
        <div class="field">
          <label>音乐 / 声音方向</label>
          <textarea data-field="musicPrompt" placeholder="音乐情绪、速度、乐器、参考或本场声音备注。">${esc(node.musicPrompt)}</textarea>
        </div>
      </section>
    `;
  }
  if (node.type === "placeholder") {
    return `
      <section class="inspector-section">
        <h3>待补项</h3>
        <div class="field-row">
          <div class="field">
            <label>需要补什么</label>
            <select data-field="neededFor">
              ${["image", "video", "music", "sound", "style", "text", "approval"].map((value) => `<option value="${value}" ${node.neededFor === value ? "selected" : ""}>${needLabel(value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>由资源解决</label>
            <select data-field="referenceAssetId">${assetOptions(node.referenceAssetId, "无")}</select>
          </div>
        </div>
        <div class="field">
          <label>需求简报 / 提示词</label>
          <textarea data-field="prompt" placeholder="描述缺少的图片、片段、参考、音乐、声音或决策。">${esc(node.prompt)}</textarea>
        </div>
      </section>
    `;
  }
  if (node.type === "inspiration") {
    return `
      <section class="inspector-section">
        <h3>灵感</h3>
        <div class="field">
          <label>提示词片段 / 想法</label>
          <textarea data-field="prompt" placeholder="可复用措辞、摄影语言、节奏备注、色彩或调性想法。">${esc(node.prompt)}</textarea>
        </div>
        <div class="field">
          <label>风格方向</label>
          <textarea data-field="stylePrompt" placeholder="这个想法可延展出的风格说明。">${esc(node.stylePrompt)}</textarea>
        </div>
      </section>
    `;
  }
  if (node.type === "styleRef" || node.type === "musicRef") {
    return `
      <section class="inspector-section">
        <h3>${node.type === "styleRef" ? "影像风格参考" : "音乐 / 声音参考"}</h3>
        <div class="field">
          <label>${node.type === "styleRef" ? "影像 / 风格链接" : "音乐 / 声音链接"}</label>
          <input data-field="referenceUrl" value="${esc(node.referenceUrl || "")}" placeholder="${node.type === "styleRef" ? "https://video-reference..." : "https://music-reference..."}" />
        </div>
        <div class="field">
          <label>关联文件 / 资源</label>
          <select data-field="referenceAssetId">${referenceAssetOptions(node)}</select>
        </div>
        <button class="button" type="button" data-action="upload-reference-file" title="上传文件到这张卡片" data-tip="上传文件到这张卡片">${node.type === "styleRef" ? "上传视频/图片" : "上传音乐/音频"}</button>
      </section>
      <section class="inspector-section">
        <h3>${node.type === "styleRef" ? "风格方向" : "音乐 / 声音方向"}</h3>
        <div class="field">
          <label>${node.type === "styleRef" ? "风格 / 调性提示词" : "音乐 / 声音提示词"}</label>
          <textarea data-field="${node.type === "styleRef" ? "stylePrompt" : "musicPrompt"}">${esc(node.type === "styleRef" ? node.stylePrompt : node.musicPrompt)}</textarea>
        </div>
      </section>
      ${renderReferenceIntelligenceFields(node)}
    `;
  }
  return "";
}

function renderShotMetadataFields(node) {
  return `
    <section class="inspector-section">
      <h3>镜头元数据</h3>
      <div class="field-row">
        <div class="field">
          <label>景别</label>
          <select data-field="shotSize">
            ${[
              ["", "无"],
              ["extreme wide", "大全景"],
              ["wide", "全景"],
              ["medium", "中景"],
              ["close-up", "特写"],
              ["extreme close-up", "大特写"],
              ["macro", "微距"],
            ].map(([value, label]) => `<option value="${value}" ${(node.shotSize || "") === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>机位角度</label>
          <select data-field="cameraAngle">
            ${[
              ["", "无"],
              ["eye-level", "平视"],
              ["low angle", "低角度"],
              ["high angle", "高角度"],
              ["overhead", "俯拍"],
              ["dutch angle", "倾斜构图"],
              ["profile", "侧面"],
              ["over-the-shoulder", "过肩"],
            ].map(([value, label]) => `<option value="${value}" ${(node.cameraAngle || "") === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>摄影机运动</label>
          <input data-field="cameraMovement" value="${esc(node.cameraMovement || "")}" placeholder="推近、环绕、手持、固定" />
        </div>
        <div class="field">
          <label>优先级</label>
          <select data-field="priority">
            ${[["low", "低"], ["normal", "普通"], ["high", "高"], ["must-have", "必拍"]].map(([value, label]) => `<option value="${value}" ${(node.priority || "normal") === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field">
        <label>画面动作</label>
        <input data-field="subjectAction" value="${esc(node.subjectAction || "")}" placeholder="画面中发生什么？" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>地点</label>
          <input data-field="location" value="${esc(node.location || "")}" />
        </div>
        <div class="field">
          <label>情绪</label>
          <input data-field="mood" value="${esc(node.mood || "")}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>灯光</label>
          <input data-field="lighting" value="${esc(node.lighting || "")}" />
        </div>
        <div class="field">
          <label>镜头质感</label>
          <input data-field="lensFeel" value="${esc(node.lensFeel || "")}" placeholder="微距、变形宽银幕、长焦" />
        </div>
      </div>
    </section>
  `;
}

function renderReferenceIntelligenceFields(node) {
  return `
    <section class="inspector-section">
      <h3>参考拆解</h3>
      <div class="field">
        <label>用于影响</label>
        <input data-field="influenceUse" value="${esc(node.influenceUse || "")}" placeholder="色彩、节奏、摄影、灯光、服装、剪辑律动" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>影响强度</label>
          <select data-field="influenceStrength">
            ${[["light", "轻"], ["medium", "中"], ["strong", "强"], ["exact mood only", "只取情绪"]].map(([value, label]) => `<option value="${value}" ${(node.influenceStrength || "medium") === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>色彩备注</label>
          <input data-field="influenceColor" value="${esc(node.influenceColor || "")}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>节奏备注</label>
          <input data-field="influencePacing" value="${esc(node.influencePacing || "")}" />
        </div>
        <div class="field">
          <label>摄影备注</label>
          <input data-field="influenceCamera" value="${esc(node.influenceCamera || "")}" />
        </div>
      </div>
      <div class="field">
        <label>灯光备注</label>
        <input data-field="influenceLighting" value="${esc(node.influenceLighting || "")}" />
      </div>
      <div class="field">
        <label>不要照搬</label>
        <textarea data-field="doNotCopy" placeholder="哪些东西不要过度照搬参考。">${esc(node.doNotCopy || "")}</textarea>
      </div>
    </section>
  `;
}

function referenceAssetOptions(node) {
  const allowedTypes = node.type === "musicRef" ? ["audio", "video"] : ["video", "image"];
  return `
    <option value="">无</option>
    ${state.assets
      .filter((asset) => !asset.archived && allowedTypes.includes(asset.type))
      .map((asset) => `<option value="${asset.id}" ${node.referenceAssetId === asset.id ? "selected" : ""}>${esc(asset.name)}</option>`)
      .join("")}
  `;
}

function renderWorkflowFields(node) {
  return `
    ${renderShotMetadataFields(node)}
    <section class="inspector-section">
      <h3>工作流</h3>
      <div class="field-row">
        <div class="field">
          <label>平台 / 工具</label>
          <input data-field="provider" value="${esc(node.provider)}" />
        </div>
        <div class="field">
          <label>模型</label>
          <input data-field="model" value="${esc(node.model)}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>画幅</label>
          <select data-field="aspectRatio">
            ${["16:9", "9:16", "1:1", "4:5", "2.39:1"].map((value) => `<option ${node.aspectRatio === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>分辨率</label>
          <select data-field="resolution">
            ${["720p", "1080p", "1440p", "4K"].map((value) => `<option ${node.resolution === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>时长</label>
          <select data-field="duration">
            ${["4s", "5s", "6s", "8s", "10s", "12s"].map((value) => `<option ${node.duration === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Seed</label>
          <input data-field="seed" value="${esc(node.seed)}" />
        </div>
      </div>
      <div class="field">
        <label>来源卡片</label>
        <select data-field="sourceNodeId">
          <option value="">无</option>
          ${state.nodes
            .filter((item) => item.id !== node.id)
            .map((item) => `<option value="${item.id}" ${node.sourceNodeId === item.id ? "selected" : ""}>${esc(item.title)}</option>`)
            .join("")}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>来源侧</label>
          <select data-field="linkSourceSide">
            ${[["left", "左"], ["right", "右"]].map(([side, label]) => `<option value="${side}" ${(node.linkSourceSide || "right") === side ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>本卡侧</label>
          <select data-field="linkTargetSide">
            ${[["left", "左"], ["right", "右"]].map(([side, label]) => `<option value="${side}" ${(node.linkTargetSide || "left") === side ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>起始帧</label>
          <select data-field="startAssetId">${assetOptions(node.startAssetId, "无")}</select>
        </div>
        <div class="field">
          <label>结束帧</label>
          <select data-field="endAssetId">${assetOptions(node.endAssetId, "可选")}</select>
        </div>
      </div>
      <div class="field">
        <label>提示词</label>
        <textarea data-field="prompt" placeholder="描述运动、摄影、连续性和最终画面。">${esc(node.prompt)}</textarea>
      </div>
      <div class="field">
        <label>负面提示词</label>
        <textarea data-field="negativePrompt">${esc(node.negativePrompt)}</textarea>
      </div>
    </section>
  `;
}

function assetOptions(selectedId, emptyLabel) {
  return `
    <option value="">${emptyLabel}</option>
    ${state.assets
      .filter((asset) => !asset.archived && (asset.type === "image" || asset.type === "video"))
      .map((asset) => `<option value="${asset.id}" ${selectedId === asset.id ? "selected" : ""}>${esc(asset.name)}</option>`)
      .join("")}
  `;
}

function renderAssetInspector(asset) {
  return `
    <section class="inspector-section">
      <div class="panel-head inspector-head">
        <div>
          <h2>资源</h2>
          <span>${esc(asset.type)} / ${formatBytes(asset.size)}</span>
        </div>
        <button class="icon-button" type="button" data-action="close-inspector" title="关闭检查器" data-tip="关闭检查器" aria-label="关闭检查器">-</button>
      </div>
      ${renderAssetMedia(asset, "node-media")}
      <div class="field">
        <label>名称</label>
        <input value="${esc(asset.name)}" readonly />
      </div>
      ${asset.externalUrl ? `
        <div class="field">
          <label>URL</label>
          <input value="${esc(asset.externalUrl)}" readonly />
        </div>
      ` : ""}
      <div class="field">
        <label>标签</label>
        <input value="${esc(asset.tags)}" readonly />
      </div>
      <div class="status-row">
        ${asset.inbox ? `<span class="tag">收件箱</span>` : `<span class="tag">已整理</span>`}
        ${asset.favorite ? `<span class="tag">收藏</span>` : ""}
      </div>
      ${asset.notes ? `
        <div class="field">
          <label>参考备注</label>
          <textarea readonly>${esc(asset.notes)}</textarea>
        </div>
      ` : ""}
      <button class="button" type="button" data-action="add-selected-asset" title="把资源作为卡片加入画布" data-tip="把资源作为卡片加入画布">添加到画布</button>
      <button class="button primary" type="button" data-action="workflow-from-asset" title="从此资源创建图生视频工作流" data-tip="从此资源创建图生视频工作流">创建工作流</button>
    </section>
  `;
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openExportDialog() {
  els.exportText.value = exportMarkdown();
  els.exportDialog.showModal();
}

function exportProject() {
  return {
    ...state,
    assets: state.assets.map(({ dataUrl, ...asset }) => asset),
  };
}

function exportMarkdown() {
  const lines = [];
  lines.push(`# ${state.title}`);
  lines.push("");
  lines.push(`更新时间：${new Date(state.updatedAt).toLocaleString()}`);
  lines.push("");
  lines.push("## 连续性圣经");
  const continuity = { ...defaultContinuity(), ...(state.continuity || {}) };
  const continuityRows = [
    ["角色", continuity.characters],
    ["服装 / 造型", continuity.wardrobe],
    ["场景 / 地点", continuity.locations],
    ["道具 / 物件", continuity.props],
    ["风格规则", continuity.styleRules],
    ["绝不能漂移", continuity.neverChange],
  ].filter(([, value]) => value);
  if (!continuityRows.length) {
    lines.push("");
    lines.push("暂无连续性规则。");
  }
  continuityRows.forEach(([label, value]) => {
    lines.push(`- ${label}: ${value.replaceAll("\n", " ")}`);
  });
  lines.push("");
  lines.push("## 交付就绪度");
  const handoffNodes = state.nodes
    .filter((node) => ["section", "scene", "shot", "workflow", "imageWorkflow", "placeholder", "styleRef", "musicRef"].includes(node.type))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (!handoffNodes.length) {
    lines.push("");
    lines.push("暂无可交付卡片。");
  }
  handoffNodes.forEach((node) => {
    const ready = readinessForNode(node);
    const missing = ready.items.filter((item) => !item.pass).map((item) => item.label);
    lines.push(`- ${node.title} (${nodeTypeLabel(node.type)}): ${ready.done}/${ready.total} 已就绪${missing.length ? `；待补 ${missing.join(", ")}` : ""}`);
  });
  lines.push("");
  lines.push("## 制作模块");
  const sections = state.nodes.filter((node) => node.type === "section").sort((a, b) => a.y - b.y || a.x - b.x);
  if (!sections.length) {
    lines.push("");
    lines.push("暂无制作模块。");
  }
  sections.forEach((section) => {
    const children = nodesInsideSection(section).sort((a, b) => a.y - b.y || a.x - b.x);
    lines.push("");
    lines.push(`### ${section.title}`);
    if (section.overallPrompt || section.notes) lines.push(`- 说明: ${(section.overallPrompt || section.notes).replaceAll("\n", " ")}`);
    if (section.stylePrompt) lines.push(`- 影像风格: ${section.stylePrompt.replaceAll("\n", " ")}`);
    if (section.musicPrompt) lines.push(`- 音乐 / 声音: ${section.musicPrompt.replaceAll("\n", " ")}`);
    lines.push(`- 包含卡片: ${children.length ? children.map((node) => node.title).join(", ") : "暂无卡片"}`);
  });
  lines.push("");
  lines.push("## 待补项");
  const placeholders = state.nodes.filter((node) => node.type === "placeholder").sort((a, b) => a.y - b.y || a.x - b.x);
  if (!placeholders.length) {
    lines.push("");
    lines.push("暂无待补项。");
  }
  placeholders.forEach((node) => {
    const asset = assetById(node.referenceAssetId);
    lines.push("");
    lines.push(`- ${node.title}`);
    lines.push(`  用途: ${needLabel(node.neededFor)}`);
    lines.push(`  状态: ${statusLabel(node.status)}`);
    if (node.prompt || node.notes) lines.push(`  说明: ${(node.prompt || node.notes).replaceAll("\n", " ")}`);
    if (asset) lines.push(`  已关联: ${asset.name}`);
  });
  lines.push("");
  lines.push("## 场景与镜头提示词");
  const promptNodes = state.nodes
    .filter((node) => (node.type === "section" || node.type === "scene" || node.type === "shot") && (node.overallPrompt || node.stylePrompt || node.musicPrompt || node.notes))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (!promptNodes.length) {
    lines.push("");
    lines.push("暂无场景提示词卡。");
  }
  promptNodes.forEach((node) => {
    lines.push("");
    lines.push(`### ${node.title}`);
    if (node.overallPrompt) lines.push(`- 整体意图: ${node.overallPrompt.replaceAll("\n", " ")}`);
    if (node.shotSize || node.cameraAngle || node.cameraMovement || node.subjectAction || node.location || node.mood || node.lighting || node.lensFeel || node.priority) {
      lines.push(`- 镜头元数据: ${[
        node.shotSize && `景别 ${node.shotSize}`,
        node.cameraAngle && `角度 ${node.cameraAngle}`,
        node.cameraMovement && `运动 ${node.cameraMovement}`,
        node.subjectAction && `动作 ${node.subjectAction}`,
        node.location && `地点 ${node.location}`,
        node.mood && `情绪 ${node.mood}`,
        node.lighting && `光线 ${node.lighting}`,
        node.lensFeel && `镜头感 ${node.lensFeel}`,
        node.priority && `优先级 ${node.priority}`,
      ].filter(Boolean).join("; ")}`);
    }
    if (node.stylePrompt) lines.push(`- 影像风格: ${node.stylePrompt.replaceAll("\n", " ")}`);
    if (node.musicPrompt) lines.push(`- 音乐 / 声音: ${node.musicPrompt.replaceAll("\n", " ")}`);
    if (node.notes) lines.push(`- 备注: ${node.notes.replaceAll("\n", " ")}`);
  });
  lines.push("");
  lines.push("## 参考资料");
  const referenceAssets = state.assets
    .filter((asset) => asset.type === "video-link" || asset.type === "music-link" || asset.type === "reference-link" || asset.type === "audio")
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (!referenceAssets.length) {
    lines.push("");
    lines.push("暂无风格、声音或链接参考。");
  }
  referenceAssets.forEach((asset) => {
    lines.push("");
    lines.push(`- ${asset.name}`);
    lines.push(`  类型: ${asset.type}`);
    if (asset.externalUrl) lines.push(`  URL: ${asset.externalUrl}`);
    if (asset.tags) lines.push(`  标签: ${asset.tags}`);
    if (asset.notes) lines.push(`  备注: ${asset.notes.replaceAll("\n", " ")}`);
  });
  state.nodes
    .filter((node) => (node.type === "styleRef" || node.type === "musicRef") && (node.referenceUrl || node.referenceAssetId || node.stylePrompt || node.musicPrompt))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((node) => {
      const asset = assetById(node.referenceAssetId);
      lines.push("");
      lines.push(`- ${node.title}`);
      lines.push(`  类型: ${node.type === "musicRef" ? "声音参考卡" : "影像风格参考卡"}`);
      if (node.referenceUrl) lines.push(`  URL: ${node.referenceUrl}`);
      if (asset) lines.push(`  关联素材: ${asset.name}`);
      if (node.influenceUse) lines.push(`  用途: ${node.influenceUse}`);
      if (node.influenceStrength) lines.push(`  影响强度: ${node.influenceStrength}`);
      if (node.influenceColor) lines.push(`  色彩备注: ${node.influenceColor}`);
      if (node.influencePacing) lines.push(`  节奏备注: ${node.influencePacing}`);
      if (node.influenceCamera) lines.push(`  摄影备注: ${node.influenceCamera}`);
      if (node.influenceLighting) lines.push(`  灯光备注: ${node.influenceLighting}`);
      if (node.doNotCopy) lines.push(`  不要照搬: ${node.doNotCopy.replaceAll("\n", " ")}`);
      if (node.stylePrompt) lines.push(`  风格提示词: ${node.stylePrompt.replaceAll("\n", " ")}`);
      if (node.musicPrompt) lines.push(`  声音提示词: ${node.musicPrompt.replaceAll("\n", " ")}`);
    });
  lines.push("");
  lines.push("## 素材提示词");
  const mediaPromptNodes = state.nodes
    .filter((node) => node.type === "media" && (node.prompt || node.negativePrompt))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (!mediaPromptNodes.length) {
    lines.push("");
    lines.push("暂无单素材提示词。");
  }
  mediaPromptNodes.forEach((node) => {
    const asset = assetById(node.assetId);
    lines.push("");
    lines.push(`### ${node.title}`);
    lines.push(`- 素材: ${asset?.name || ""}`);
    if (asset?.externalUrl) lines.push(`- URL: ${asset.externalUrl}`);
    if (node.prompt) {
      lines.push("");
      lines.push("提示词:");
      lines.push("```");
      lines.push(node.prompt);
      lines.push("```");
    }
    if (node.negativePrompt) {
      lines.push("");
      lines.push("反向提示词:");
      lines.push("```");
      lines.push(node.negativePrompt);
      lines.push("```");
    }
  });
  lines.push("");
  lines.push("## 镜头工作流包");
  const workflows = state.nodes
    .filter(isWorkflowNode)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (!workflows.length) {
    lines.push("");
    lines.push("暂无工作流卡。");
  }
  workflows.forEach((node, index) => {
    const start = assetById(node.startAssetId);
    const end = assetById(node.endAssetId);
    const source = nodeById(node.sourceNodeId);
    lines.push("");
    lines.push(`### ${index + 1}. ${node.title}`);
    lines.push(`- 状态: ${statusLabel(node.status || "draft")}`);
    lines.push(`- 平台: ${node.provider || ""}`);
    lines.push(`- 模型: ${node.model || ""}`);
    lines.push(`- 画幅 / 分辨率 / 时长: ${node.aspectRatio || ""} / ${node.resolution || ""} / ${node.duration || ""}`);
    lines.push(`- Seed: ${node.seed || ""}`);
    lines.push(`- 景别 / 角度 / 运动: ${node.shotSize || ""} / ${node.cameraAngle || ""} / ${node.cameraMovement || ""}`);
    lines.push(`- 动作 / 地点 / 情绪: ${node.subjectAction || ""} / ${node.location || ""} / ${node.mood || ""}`);
    lines.push(`- 灯光 / 镜头 / 优先级: ${node.lighting || ""} / ${node.lensFeel || ""} / ${node.priority || ""}`);
    lines.push(`- 来源卡片: ${source?.title || ""}`);
    lines.push(`- 起始帧: ${start?.name || ""}`);
    lines.push(`- 结束帧: ${end?.name || ""}`);
    lines.push(`- 标签: ${node.tags || ""}`);
    lines.push("");
    lines.push("提示词:");
    lines.push("```");
    lines.push(node.prompt || "");
    lines.push("```");
    if (node.negativePrompt) {
      lines.push("");
      lines.push("反向提示词:");
      lines.push("```");
      lines.push(node.negativePrompt);
      lines.push("```");
    }
    if (node.notes) {
      lines.push("");
      lines.push(`备注: ${node.notes}`);
    }
    if ((node.attempts || []).length) {
      lines.push("");
      lines.push("生成尝试:");
      node.attempts.forEach((attempt) => {
        lines.push(`- ${attempt.label || "尝试"} / ${statusLabel(attempt.status || "candidate")}${attempt.seed ? ` / ${attempt.seed}` : ""}${attempt.outputUrl ? ` / ${attempt.outputUrl}` : ""}${attempt.notes ? ` - ${attempt.notes.replaceAll("\n", " ")}` : ""}`);
      });
    }
    if (node.reviewDecision || node.reviewOwner || node.reviewNotes) {
      lines.push("");
      lines.push(`审阅: ${[node.reviewDecision, node.reviewOwner, node.reviewNotes?.replaceAll("\n", " ")].filter(Boolean).join(" / ")}`);
    }
  });
  lines.push("");
  lines.push("## 审阅备注");
  const reviewNodes = state.nodes
    .filter((node) => node.reviewDecision || node.reviewOwner || node.reviewNotes)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  if (!reviewNodes.length) {
    lines.push("");
    lines.push("暂无审阅备注。");
  }
  reviewNodes.forEach((node) => {
    lines.push(`- ${node.title}: ${[node.reviewDecision, node.reviewOwner, node.reviewNotes?.replaceAll("\n", " ")].filter(Boolean).join(" / ")}`);
  });
  lines.push("");
  lines.push("## 画布备注");
  state.nodes
    .filter((node) => !isWorkflowNode(node))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((node) => {
      lines.push(`- ${nodeTypeLabel(node.type)}: ${node.title}${node.notes ? ` - ${node.notes.replaceAll("\n", " ")}` : ""}`);
    });
  return lines.join("\n");
}

function exportStoryboardHtml() {
  const ordered = storyboardExportNodes();
  const continuity = { ...defaultContinuity(), ...(state.continuity || {}) };
  const continuityItems = [
    ["角色", continuity.characters],
    ["服装 / 造型", continuity.wardrobe],
    ["场景 / 地点", continuity.locations],
    ["道具 / 物件", continuity.props],
    ["风格规则", continuity.styleRules],
    ["绝不能漂移", continuity.neverChange],
  ].filter(([, value]) => value);
  const cards = ordered
    .map((node, index) => {
      const asset = assetById(node.assetId || node.startAssetId || node.referenceAssetId);
      const media = asset?.dataUrl
        ? asset.type === "video"
          ? `<video src="${asset.dataUrl}" controls muted playsinline></video>`
          : asset.type === "audio"
            ? `<audio src="${asset.dataUrl}" controls></audio>`
            : `<img src="${asset.dataUrl}" alt="${esc(asset.name)}" />`
        : `<div class="empty">暂无可视素材</div>`;
      const attempts = (node.attempts || []).map((attempt) => `<li>${esc(attempt.label || "尝试")} / ${esc(statusLabel(attempt.status || "candidate"))}${attempt.outputUrl ? ` / <a href="${esc(attempt.outputUrl)}">${esc(attempt.outputUrl)}</a>` : ""}</li>`).join("");
      return `
        <article class="card">
          <div class="media">${media}</div>
          <div class="meta">
            <span>${index + 1}. ${esc(nodeTypeLabel(node.type))}</span>
            <h2>${esc(node.title)}</h2>
            <p>${esc(node.overallPrompt || node.prompt || node.stylePrompt || node.musicPrompt || node.notes || "")}</p>
            <dl>
              ${node.status ? `<dt>状态</dt><dd>${esc(statusLabel(node.status))}</dd>` : ""}
              ${node.shotSize || node.cameraAngle || node.cameraMovement ? `<dt>镜头</dt><dd>${esc([node.shotSize, node.cameraAngle, node.cameraMovement].filter(Boolean).join(" / "))}</dd>` : ""}
              ${node.subjectAction ? `<dt>动作</dt><dd>${esc(node.subjectAction)}</dd>` : ""}
              ${node.location || node.mood ? `<dt>地点 / 情绪</dt><dd>${esc([node.location, node.mood].filter(Boolean).join(" / "))}</dd>` : ""}
              ${node.lighting || node.lensFeel ? `<dt>灯光 / 镜头感</dt><dd>${esc([node.lighting, node.lensFeel].filter(Boolean).join(" / "))}</dd>` : ""}
              ${node.reviewDecision || node.reviewNotes ? `<dt>审阅</dt><dd>${esc([node.reviewDecision, node.reviewNotes].filter(Boolean).join(" / "))}</dd>` : ""}
            </dl>
            ${attempts ? `<h3>生成尝试</h3><ul>${attempts}</ul>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(state.title)} 分镜交付</title>
  <style>
    body { margin: 0; font-family: Arial, "Microsoft YaHei", "PingFang SC", sans-serif; color: #171717; background: #f6f3ec; }
    header { padding: 28px; border-bottom: 2px solid #171717; background: #fffcf5; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .section { padding: 22px 28px; border-bottom: 1px solid #d4ccc0; }
    .continuity { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .continuity div, .card { border: 1px solid #171717; background: #fffcf5; }
    .continuity div { padding: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; padding: 22px 28px; }
    .card { display: grid; grid-template-rows: auto 1fr; break-inside: avoid; }
    .media { min-height: 190px; display: grid; place-items: center; background: #eee8dc; border-bottom: 1px solid #171717; }
    img, video { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
    audio { width: 92%; }
    .empty { color: #6d6a62; font-weight: 700; }
    .meta { padding: 12px; }
    .meta span { color: #287d8e; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    h2 { margin: 4px 0 8px; font-size: 18px; }
    h3 { margin: 12px 0 6px; font-size: 13px; text-transform: uppercase; }
    p { color: #4f4c45; line-height: 1.45; white-space: pre-wrap; }
    dl { display: grid; grid-template-columns: 100px 1fr; gap: 5px 10px; font-size: 13px; }
    dt { font-weight: 800; color: #6d6a62; }
    dd { margin: 0; }
    @media print { body { background: white; } .card { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>${esc(state.title)}</h1>
    <div>分镜交付导出时间：${new Date().toLocaleString()}</div>
  </header>
  <section class="section">
    <h2>连续性圣经</h2>
    <div class="continuity">
      ${
        continuityItems.length
          ? continuityItems.map(([label, value]) => `<div><strong>${esc(label)}</strong><p>${esc(value)}</p></div>`).join("")
          : "<p>暂无连续性规则。</p>"
      }
    </div>
  </section>
  <main class="grid">${cards || "<p>暂无分镜卡片。</p>"}</main>
</body>
</html>`;
}

function storyboardExportNodes() {
  return state.nodes
    .filter((node) => ["section", "scene", "shot", "workflow", "imageWorkflow", "media", "placeholder", "styleRef", "musicRef"].includes(node.type))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

async function exportStoryboardPdf() {
  const button = els.downloadStoryboardPdfBtn;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "正在生成 PDF...";
  try {
    const pages = await renderStoryboardPdfPages();
    const pdfBlob = buildPdfFromJpegPages(pages);
    downloadBlob(pdfBlob, `${safeSlug(state.title || "master-canvas")}-storyboard.pdf`);
    toast("分镜 PDF 已导出");
  } catch (error) {
    console.error(error);
    toast("无法导出分镜 PDF");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function renderStoryboardPdfPages() {
  const ordered = storyboardExportNodes();
  const continuity = { ...defaultContinuity(), ...(state.continuity || {}) };
  const continuityItems = [
    ["角色", continuity.characters],
    ["服装 / 造型", continuity.wardrobe],
    ["场景 / 地点", continuity.locations],
    ["道具 / 物件", continuity.props],
    ["风格规则", continuity.styleRules],
    ["绝不能漂移", continuity.neverChange],
  ].filter(([, value]) => value);
  const pages = [];
  pages.push(await renderStoryboardPdfCover(continuityItems));

  const cardsPerPage = 4;
  for (let start = 0; start < ordered.length; start += cardsPerPage) {
    pages.push(await renderStoryboardPdfCardPage(ordered.slice(start, start + cardsPerPage), start + 1, ordered.length));
  }
  return pages;
}

async function renderStoryboardPdfCover(continuityItems) {
  const { canvas, ctx } = createPdfCanvas();
  paintPdfPage(ctx);
  ctx.fillStyle = "#171717";
  ctx.font = "800 28px Arial";
  drawWrappedText(ctx, state.title || "分镜交付", 34, 58, 544, 34, 2);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#4f4c45";
  ctx.fillText(`分镜 PDF 导出时间 ${new Date().toLocaleString()}`, 34, 112);
  ctx.fillText(`${state.nodes.length} 张卡片 / ${state.assets.length} 项资源`, 34, 132);
  drawPdfRule(ctx, 34, 154, 544);

  ctx.font = "800 17px Arial";
  ctx.fillStyle = "#171717";
  ctx.fillText("连续性圣经", 34, 192);
  let y = 218;
  const boxW = 260;
  const boxGap = 16;
  continuityItems.slice(0, 6).forEach(([label, value], index) => {
    const x = 34 + (index % 2) * (boxW + boxGap);
    if (index && index % 2 === 0) y += 145;
    drawPdfCardBox(ctx, x, y, boxW, 122);
    ctx.font = "800 10px Arial";
    ctx.fillStyle = "#287d8e";
    ctx.fillText(label.toUpperCase(), x + 12, y + 22);
    ctx.font = "11px Arial";
    ctx.fillStyle = "#4f4c45";
    drawWrappedText(ctx, value, x + 12, y + 43, boxW - 24, 14, 5);
  });

  ctx.font = "800 14px Arial";
  ctx.fillStyle = "#171717";
  ctx.fillText("如何阅读这份 PDF", 34, 690);
  ctx.font = "11px Arial";
  ctx.fillStyle = "#4f4c45";
  drawWrappedText(
    ctx,
    "卡片顺序与画布一致：从上到下、从左到右。完整提示词、反向提示词、检查点和交付结构仍保留在 Markdown、JSON 与交付 ZIP 中。",
    34,
    714,
    544,
    15,
    4,
  );
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function renderStoryboardPdfCardPage(nodes, firstIndex, total) {
  const { canvas, ctx } = createPdfCanvas();
  paintPdfPage(ctx);
  ctx.fillStyle = "#171717";
  ctx.font = "800 16px Arial";
  ctx.fillText(state.title || "分镜交付", 34, 35);
  ctx.font = "10px Arial";
  ctx.fillStyle = "#6d6a62";
  ctx.fillText(`卡片 ${firstIndex}-${Math.min(firstIndex + nodes.length - 1, total)} / ${total}`, 430, 35);
  drawPdfRule(ctx, 34, 48, 544);

  const positions = [
    [34, 70],
    [312, 70],
    [34, 420],
    [312, 420],
  ];
  for (let index = 0; index < nodes.length; index += 1) {
    await drawStoryboardPdfCard(ctx, nodes[index], firstIndex + index, positions[index][0], positions[index][1], 266, 320);
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function drawStoryboardPdfCard(ctx, node, order, x, y, w, h) {
  drawPdfCardBox(ctx, x, y, w, h);
  const asset = assetById(node.assetId || node.startAssetId || node.referenceAssetId);
  const mediaH = 140;
  ctx.fillStyle = "#eee8dc";
  ctx.fillRect(x + 1, y + 1, w - 2, mediaH);
  if (asset?.dataUrl && asset.type === "image") {
    const image = await loadPdfImage(asset.dataUrl);
    drawImageCover(ctx, image, x + 1, y + 1, w - 2, mediaH);
  } else {
    ctx.fillStyle = "#6d6a62";
    ctx.font = "800 12px Arial";
    ctx.fillText(asset?.type === "video" ? "已关联视频" : asset?.type === "audio" ? "已关联音频" : "暂无可视素材", x + 16, y + 74);
  }
  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + mediaH);
  ctx.lineTo(x + w, y + mediaH);
  ctx.stroke();

  const badge = node.shotOrderLabel || String(order).padStart(2, "0");
  ctx.fillStyle = "#f7c948";
  ctx.fillRect(x + 12, y + mediaH + 12, Math.min(86, Math.max(48, badge.length * 8 + 16)), 21);
  ctx.strokeStyle = "#171717";
  ctx.strokeRect(x + 12, y + mediaH + 12, Math.min(86, Math.max(48, badge.length * 8 + 16)), 21);
  ctx.fillStyle = "#171717";
  ctx.font = "900 10px Arial";
  ctx.fillText(badge, x + 20, y + mediaH + 27);

  ctx.fillStyle = "#287d8e";
  ctx.font = "800 10px Arial";
  ctx.fillText(`${order}. ${nodeTypeLabel(node.type).toUpperCase()}`, x + 108, y + mediaH + 27);
  ctx.fillStyle = "#171717";
  ctx.font = "800 14px Arial";
  drawWrappedText(ctx, node.shotBeatTitle || node.title, x + 12, y + mediaH + 54, w - 24, 17, 2);

  ctx.fillStyle = "#4f4c45";
  ctx.font = "10px Arial";
  const metadata = [node.shotSize, node.cameraAngle, node.cameraMovement, node.lensFeel].filter(Boolean).join(" / ");
  drawWrappedText(ctx, metadata || node.title, x + 12, y + mediaH + 96, w - 24, 13, 2);
  const summary = node.subjectAction || node.overallPrompt || node.prompt || node.stylePrompt || node.musicPrompt || node.notes || "";
  drawWrappedText(ctx, summary, x + 12, y + mediaH + 130, w - 24, 13, 5);
}

function createPdfCanvas() {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = 612 * scale;
  canvas.height = 792 * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

function paintPdfPage(ctx) {
  ctx.fillStyle = "#f6f3ec";
  ctx.fillRect(0, 0, 612, 792);
}

function drawPdfCardBox(ctx, x, y, w, h) {
  ctx.fillStyle = "#fffcf5";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawPdfRule(ctx, x, y, w) {
  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function drawWrappedText(ctx, text = "", x, y, maxWidth, lineHeight, maxLines = 10) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return y;
  let line = "";
  let lines = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines += 1;
      if (lines >= maxLines) {
        ctx.fillText(`${line.replace(/\.*$/, "")}...`, x, y);
        return y + lineHeight;
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function loadPdfImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawImageCover(ctx, image, x, y, w, h) {
  const imageRatio = image.width / image.height;
  const boxRatio = w / h;
  const sw = imageRatio > boxRatio ? image.height * boxRatio : image.width;
  const sh = imageRatio > boxRatio ? image.height : image.width / boxRatio;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function buildPdfFromJpegPages(pageDataUrls) {
  const imageBytes = pageDataUrls.map(bytesFromDataUrl);
  const pageWidth = 612;
  const pageHeight = 792;
  const objectParts = [];
  const pageRefs = [];
  let objectNumber = 3;

  imageBytes.forEach((bytes, index) => {
    const pageObj = objectNumber;
    const imageObj = objectNumber + 1;
    const contentObj = objectNumber + 2;
    const imageName = `Im${index + 1}`;
    pageRefs.push(`${pageObj} 0 R`);
    objectParts.push([
      pageObj,
      asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /${imageName} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`),
    ]);
    objectParts.push([
      imageObj,
      [
        asciiBytes(`<< /Type /XObject /Subtype /Image /Width 1224 /Height 1584 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),
        bytes,
        asciiBytes("\nendstream"),
      ],
    ]);
    const stream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/${imageName} Do\nQ`;
    objectParts.push([
      contentObj,
      asciiBytes(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
    ]);
    objectNumber += 3;
  });

  const objects = [
    [1, asciiBytes("<< /Type /Catalog /Pages 2 0 R >>")],
    [2, asciiBytes(`<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`)],
    ...objectParts,
  ];
  return buildPdfBlob(objects, 1);
}

function buildPdfBlob(objects, rootObjectNumber) {
  const parts = [asciiBytes("%PDF-1.4\n%\xff\xff\xff\xff\n")];
  const offsets = [0];
  let byteOffset = parts[0].length;
  objects.forEach(([number, content]) => {
    offsets[number] = byteOffset;
    const start = asciiBytes(`${number} 0 obj\n`);
    const body = Array.isArray(content) ? content : [content];
    const end = asciiBytes("\nendobj\n");
    parts.push(start, ...body, end);
    byteOffset += start.length + body.reduce((sum, part) => sum + part.length, 0) + end.length;
  });
  const xrefOffset = byteOffset;
  const maxObject = Math.max(...objects.map(([number]) => number));
  const xrefRows = ["xref", `0 ${maxObject + 1}`, "0000000000 65535 f "];
  for (let number = 1; number <= maxObject; number += 1) {
    xrefRows.push(`${String(offsets[number] || 0).padStart(10, "0")} 00000 n `);
  }
  const trailer = `${xrefRows.join("\n")}\ntrailer\n<< /Size ${maxObject + 1} /Root ${rootObjectNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(asciiBytes(trailer));
  return new Blob(parts, { type: "application/pdf" });
}

function asciiBytes(text) {
  return new TextEncoder().encode(text);
}

async function exportHandoffZip() {
  const button = els.downloadHandoffZipBtn;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "正在生成 ZIP...";
  try {
    const files = await buildHandoffPackageFiles();
    const zipBlob = buildZip(files);
    downloadBlob(zipBlob, `${safeSlug(state.title || "master-canvas")}-handoff-package.zip`);
    toast("交付 ZIP 已导出");
  } catch (error) {
    console.error(error);
    toast("无法导出交付 ZIP");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function buildHandoffPackageFiles() {
  const files = [];
  const packageData = buildHandoffData();
  const manifest = packageData.manifest;
  const assetPathById = new Map();
  const usedAssetIds = new Set();

  manifest.scenes.forEach((scene) => {
    scene.shots.forEach((shot) => {
      if (shot.assetId) usedAssetIds.add(shot.assetId);
    });
  });
  manifest.references.forEach((reference) => {
    if (reference.assetId) usedAssetIds.add(reference.assetId);
  });
  manifest.workflows.forEach((workflow) => {
    if (workflow.startAssetId) usedAssetIds.add(workflow.startAssetId);
    if (workflow.endAssetId) usedAssetIds.add(workflow.endAssetId);
    if (workflow.referenceAssetId) usedAssetIds.add(workflow.referenceAssetId);
  });

  state.assets
    .filter((asset) => usedAssetIds.has(asset.id) && asset.dataUrl)
    .forEach((asset) => {
      const sceneKey = sceneKeyForAsset(asset.id) || "references";
      const sceneFolder = sceneFolderName(sceneKey);
      const shot = manifest.shots.find((item) => item.assetId === asset.id);
      const basename = shot ? `${shot.orderLabel || `shot-${shot.globalOrder}`}-${safeSlug(asset.name)}` : `${asset.id}-${safeSlug(asset.name)}`;
      const path = shot ? `assets/${sceneFolder}/${basename}${assetExtension(asset)}` : `assets/references/${basename}${assetExtension(asset)}`;
      assetPathById.set(asset.id, path);
      files.push({ path, data: bytesFromDataUrl(asset.dataUrl) });
    });

  const hydratedManifest = hydrateHandoffAssetPaths(manifest, assetPathById);
  files.push({ path: "README.md", data: buildRootHandoffReadme(hydratedManifest) });
  files.push({ path: "master-canvas-project.json", data: JSON.stringify(exportProject(), null, 2) });
  files.push({ path: "project_manifest.json", data: JSON.stringify(hydratedManifest, null, 2) });
  files.push({ path: "storyboard.html", data: exportStoryboardHtml() });
  files.push({ path: "shot-package.md", data: exportMarkdown() });
  files.push({ path: "timeline/shot_order.csv", data: buildShotOrderCsv(hydratedManifest) });
  files.push({ path: "timeline/scene_bins.json", data: JSON.stringify(buildSceneBins(hydratedManifest), null, 2) });

  files.push({ path: "hermes-agent/README_FOR_HERMES.md", data: buildHermesReadme(hydratedManifest) });
  files.push({ path: "hermes-agent/hermes_job.json", data: JSON.stringify(buildHermesJob(hydratedManifest), null, 2) });
  files.push({ path: "hermes-agent/shot_order.csv", data: buildShotOrderCsv(hydratedManifest) });
  files.push({ path: "hermes-agent/asset_inventory.csv", data: buildAssetInventoryCsv(hydratedManifest) });

  files.push({ path: "comfyui/README_COMFYUI_LTX23.md", data: buildComfyReadme(hydratedManifest) });
  files.push({ path: "comfyui/shot_manifest_ltx23.json", data: JSON.stringify(buildComfyManifest(hydratedManifest), null, 2) });
  files.push({ path: "comfyui/workflow_templates/ltx23_adapter_template.json", data: JSON.stringify(buildComfyAdapterTemplate(), null, 2) });
  hydratedManifest.shots.forEach((shot) => {
    files.push({
      path: `comfyui/jobs/${sceneFolderName(shot.sceneKey)}/${shot.orderLabel || `shot-${shot.globalOrder}`}.json`,
      data: JSON.stringify(buildComfyShotJob(shot, hydratedManifest), null, 2),
    });
  });

  files.push({ path: "kling-veo/README_KLING_VEO.md", data: buildKlingVeoReadme(hydratedManifest) });
  files.push({ path: "kling-veo/shot_checklist.csv", data: buildShotOrderCsv(hydratedManifest) });
  hydratedManifest.shots.forEach((shot) => {
    const folder = `kling-veo/prompts/${sceneFolderName(shot.sceneKey)}`;
    files.push({ path: `${folder}/${shot.orderLabel || `shot-${shot.globalOrder}`}_prompt.txt`, data: buildOperatorPromptText(shot) });
    files.push({ path: `${folder}/${shot.orderLabel || `shot-${shot.globalOrder}`}_negative.txt`, data: shot.negativePrompt || "" });
  });

  files.push({ path: "deliverables/bin_plan.json", data: JSON.stringify(buildDeliverableBinPlan(hydratedManifest), null, 2) });
  return files;
}

function buildHandoffData() {
  const continuity = { ...defaultContinuity(), ...(state.continuity || {}) };
  const sceneKeys = orderedSceneKeysForExport();
  const scenes = sceneKeys.map((sceneKey) => {
    const sceneNode = state.nodes
      .filter((node) => getSceneKey(node) === sceneKey && (node.type === "scene" || node.type === "shot" || node.type === "section"))
      .sort(sortNodesByCanvasOrder)[0];
    const mediaNodes = state.nodes
      .filter((node) => node.type === "media" && getSceneKey(node) === sceneKey)
      .sort(sortNodesByCanvasOrder);
    return {
      sceneKey,
      sceneNumber: sceneNumberFromKey(sceneKey) || "",
      title: sceneNode?.title || sceneKey,
      orderLabel: sceneNode?.shotOrderLabel || sceneKey,
      description: sceneNode?.overallPrompt || sceneNode?.notes || "",
      stylePrompt: sceneNode?.stylePrompt || "",
      musicPrompt: sceneNode?.musicPrompt || "",
      notes: sceneNode?.notes || "",
      shots: mediaNodes.map((node, index) => buildHandoffShot(node, sceneKey, index)),
    };
  });
  const shots = scenes.flatMap((scene) => scene.shots);
  shots.forEach((shot, index) => {
    shot.globalOrder = index + 1;
    shot.globalOrderLabel = String(index + 1).padStart(2, "0");
  });
  const workflows = state.nodes.filter(isWorkflowNode).sort(sortNodesByCanvasOrder).map(buildHandoffWorkflow);
  const references = buildHandoffReferences();
  return {
    manifest: {
      schema: "master-canvas-handoff-v1",
      title: state.title,
      projectId: state.id,
      exportedAt: now(),
      intent:
        "Self-contained pre-production handoff for Hermes Agent, ComfyUI LTX 2.3, Kling, Veo, and human operators. Preserve shot order, scene bins, assets, prompts, negative prompts, references, and continuity.",
      targetGeneration: {
        primary: "ComfyUI with LTX 2.3",
        alternates: ["Veo", "Kling"],
        minimumResolution: "1080p",
        aspectRatio: "16:9",
        delivery: "Organize outputs into bins by scene number and return best takes plus notes.",
      },
      continuity,
      scenes,
      shots,
      workflows,
      references,
      assets: state.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        mime: asset.mime,
        size: asset.size,
        tags: asset.tags || "",
        notes: asset.notes || "",
        externalUrl: asset.externalUrl || "",
      })),
    },
  };
}

function buildHandoffShot(node, sceneKey, index) {
  const asset = assetById(node.assetId);
  const label = node.shotOrderLabel || `${sceneKey.replace(/\s+/g, "")}-${String(index + 1).padStart(2, "0")}`;
  return {
    id: node.id,
    nodeId: node.id,
    assetId: node.assetId || "",
    assetName: asset?.name || "",
    sceneKey,
    sceneNumber: sceneNumberFromKey(sceneKey) || "",
    shotNumber: index + 1,
    orderLabel: label,
    beatTitle: node.shotBeatTitle || label,
    title: node.title,
    status: node.status || "",
    prompt: node.prompt || "",
    negativePrompt: node.negativePrompt || "",
    notes: node.notes || "",
    tags: node.tags || "",
    shotSize: node.shotSize || "",
    cameraAngle: node.cameraAngle || "",
    cameraMovement: node.cameraMovement || "",
    subjectAction: node.subjectAction || "",
    location: node.location || "",
    mood: node.mood || "",
    lighting: node.lighting || "",
    lensFeel: node.lensFeel || "",
    provider: node.provider || "",
    model: node.model || "",
    aspectRatio: node.aspectRatio || "16:9",
    resolution: normalizeResolution(node.resolution || "1080p"),
    duration: node.duration || defaultDurationForScene(sceneKey),
    seed: node.seed || "",
    reviewDecision: node.reviewDecision || "",
    reviewNotes: node.reviewNotes || "",
    sourcePath: "",
    outputBin: `renders/${sceneFolderName(sceneKey)}`,
  };
}

function buildHandoffWorkflow(node) {
  return {
    id: node.id,
    title: node.title,
    sceneKey: getSceneKey(node) || "",
    status: node.status || "",
    provider: node.provider || "",
    model: node.model || "",
    prompt: node.prompt || "",
    negativePrompt: node.negativePrompt || "",
    startAssetId: node.startAssetId || "",
    endAssetId: node.endAssetId || "",
    referenceAssetId: node.referenceAssetId || "",
    aspectRatio: node.aspectRatio || "",
    resolution: normalizeResolution(node.resolution || "1080p"),
    duration: node.duration || "",
    seed: node.seed || "",
    notes: node.notes || "",
  };
}

function buildHandoffReferences() {
  const assetRefs = state.assets
    .filter((asset) => asset.type === "video-link" || asset.type === "music-link" || asset.type === "reference-link" || asset.type === "audio" || asset.type === "video")
    .map((asset) => ({
      id: asset.id,
      assetId: asset.id,
      title: asset.name,
      type: asset.type,
      externalUrl: asset.externalUrl || "",
      tags: asset.tags || "",
      notes: asset.notes || "",
      sourcePath: "",
    }));
  const cardRefs = state.nodes
    .filter((node) => node.type === "styleRef" || node.type === "musicRef")
    .map((node) => {
      const asset = assetById(node.referenceAssetId);
      return {
        id: node.id,
        assetId: asset?.id || "",
        title: node.title,
        type: node.type,
        externalUrl: node.referenceUrl || asset?.externalUrl || "",
        sourcePath: "",
        influenceUse: node.influenceUse || "",
        influenceStrength: node.influenceStrength || "",
        color: node.influenceColor || "",
        pacing: node.influencePacing || "",
        camera: node.influenceCamera || "",
        lighting: node.influenceLighting || "",
        doNotCopy: node.doNotCopy || "",
        prompt: node.stylePrompt || node.musicPrompt || "",
        notes: node.notes || "",
      };
    });
  return [...assetRefs, ...cardRefs];
}

function hydrateHandoffAssetPaths(manifest, assetPathById) {
  const cloned = JSON.parse(JSON.stringify(manifest));
  cloned.shots.forEach((shot) => {
    shot.sourcePath = assetPathById.get(shot.assetId) || "";
  });
  cloned.scenes.forEach((scene) => {
    scene.shots.forEach((shot) => {
      shot.sourcePath = assetPathById.get(shot.assetId) || "";
    });
  });
  cloned.workflows.forEach((workflow) => {
    workflow.startAssetPath = assetPathById.get(workflow.startAssetId) || "";
    workflow.endAssetPath = assetPathById.get(workflow.endAssetId) || "";
    workflow.referenceAssetPath = assetPathById.get(workflow.referenceAssetId) || "";
  });
  cloned.references.forEach((reference) => {
    reference.sourcePath = assetPathById.get(reference.assetId) || "";
  });
  cloned.assets.forEach((asset) => {
    asset.sourcePath = assetPathById.get(asset.id) || "";
  });
  return cloned;
}

function orderedSceneKeysForExport() {
  const discovered = [...new Set(state.nodes.map((node) => getSceneKey(node)).filter(Boolean))];
  return discovered.sort((a, b) => {
    const aNode = state.nodes.find((node) => getSceneKey(node) === a);
    const bNode = state.nodes.find((node) => getSceneKey(node) === b);
    return sortNodesByCanvasOrder(aNode || {}, bNode || {});
  });
}

function buildRootHandoffReadme(manifest) {
  return `# ${manifest.title} - 交付包

导出时间：${manifest.exportedAt}

这个包用于把 Master Canvas 项目交给导演、剪辑、生成执行或自动化代理。它包含本地画布中的结构化事实来源：

- \`project_manifest.json\`：完整结构化项目事实来源
- \`assets/\`：镜头卡使用的图片、视频和音频参考
- \`timeline/shot_order.csv\`：剪辑和生成执行用的场景/镜头顺序
- \`hermes-agent/\`：给 Hermes Agent 的任务说明和 JSON job
- \`comfyui/\`：LTX 2.3 ComfyUI 镜头清单和逐镜头 job
- \`kling-veo/\`：Kling / Veo 人工执行提示词与检查清单
- \`storyboard.html\`：可视化分镜交付
- \`shot-package.md\`：可读的中文提示词包

推荐目标：ComfyUI + LTX 2.3，最低 1080p。

重要规则：保持场景顺序与镜头顺序。输出应按场景编号入 bins，并随最佳版本、废弃版本、seed/设置和备注一起回传。`;
}

function buildHermesReadme(manifest) {
  return `# Hermes Agent Brief

You are receiving a Master Canvas handoff package. Use the files here as the complete context for the project.

Goal:
Generate all shots using ComfyUI with LTX 2.3 at minimum 1080p quality, preserving the exact story order, prompts, negative prompts, image references, continuity bible, style direction, music/sound references, and scene bins.

Instructions:
1. Read \`../project_manifest.json\` first.
2. Read \`hermes_job.json\` for the task plan.
3. Use \`../comfyui/shot_manifest_ltx23.json\` and \`../comfyui/jobs/\` as the ComfyUI import/batch plan.
4. For every shot, use the listed source image path, prompt, negative prompt, lens, lighting, camera movement, action, duration, and resolution.
5. Generate at 1080p minimum. Prefer higher quality if the local ComfyUI setup supports it.
6. Organize rendered outputs into bins exactly like \`renders/scene-01\`, \`renders/scene-02\`, etc.
7. Return best takes plus generation settings, seeds, notes, and any manual adjustments needed.

Do not reinterpret the concept into a different story. Use the Master Canvas as the source of truth.`;
}

function buildHermesJob(manifest) {
  return {
    agent: "Hermes",
    source: "Master Canvas handoff package",
    task: "Generate all shots in ComfyUI using LTX 2.3 and return organized scene bins.",
    qualityFloor: manifest.targetGeneration.minimumResolution,
    primaryEngine: manifest.targetGeneration.primary,
    continuity: manifest.continuity,
    inputs: {
      projectManifest: "../project_manifest.json",
      comfyManifest: "../comfyui/shot_manifest_ltx23.json",
      shotOrderCsv: "shot_order.csv",
      assetInventoryCsv: "asset_inventory.csv",
    },
    requiredOutputBins: buildDeliverableBinPlan(manifest),
    shots: manifest.shots.map((shot) => ({
      sceneKey: shot.sceneKey,
      orderLabel: shot.orderLabel,
      sourcePath: shot.sourcePath,
      prompt: shot.prompt,
      negativePrompt: shot.negativePrompt,
      lensFeel: shot.lensFeel,
      lighting: shot.lighting,
      cameraMovement: shot.cameraMovement,
      duration: shot.duration,
      resolution: shot.resolution,
      outputBin: shot.outputBin,
    })),
  };
}

function buildComfyReadme(manifest) {
  return `# ComfyUI LTX 2.3 Handoff

This folder is built for a ComfyUI operator or agent. Because ComfyUI node graphs differ by installed custom nodes, the included files are adapter jobs rather than a hardcoded graph that assumes one local setup.

Use:
- \`shot_manifest_ltx23.json\` for the full batch plan.
- \`jobs/scene-XX/*.json\` for one job per shot.
- \`workflow_templates/ltx23_adapter_template.json\` as the mapping contract for an LTX 2.3 image-to-video graph.

Recommended setup:
- Model: LTX 2.3 image-to-video
- Resolution: 1920x1080 or higher
- Aspect: 16:9
- Use source image as first/reference frame
- Preserve prompt and negative prompt exactly unless a manual quality adjustment is needed
- Save outputs to the outputBin listed for each shot

If a local graph uses different node names, map fields from each job JSON into the matching nodes.`;
}

function buildComfyManifest(manifest) {
  return {
    engine: "ComfyUI",
    model: "LTX 2.3 image-to-video",
    resolution: "1920x1080",
    aspectRatio: "16:9",
    scenes: manifest.scenes.map((scene) => ({
      sceneKey: scene.sceneKey,
      sceneNumber: scene.sceneNumber,
      outputBin: `renders/${sceneFolderName(scene.sceneKey)}`,
      description: scene.description,
      stylePrompt: scene.stylePrompt,
      musicPrompt: scene.musicPrompt,
      shots: scene.shots.map((shot) => buildComfyShotJob(shot, manifest)),
    })),
  };
}

function buildComfyShotJob(shot, manifest) {
  return {
    engine: "ComfyUI",
    model: "LTX 2.3 image-to-video",
    projectTitle: manifest.title,
    sceneKey: shot.sceneKey,
    sceneNumber: shot.sceneNumber,
    shotNumber: shot.shotNumber,
    orderLabel: shot.orderLabel,
    sourceImage: shot.sourcePath,
    outputBin: shot.outputBin,
    outputName: `${shot.orderLabel || `shot-${shot.globalOrderLabel}`}-${safeSlug(shot.beatTitle || shot.title)}`,
    settings: {
      aspectRatio: shot.aspectRatio || "16:9",
      resolution: normalizeResolution(shot.resolution || "1080p"),
      duration: shot.duration,
      seed: shot.seed || "auto",
      fps: 24,
      qualityTarget: "1080p minimum, prefer higher if stable",
    },
    prompt: shot.prompt,
    negativePrompt: shot.negativePrompt,
    camera: {
      shotSize: shot.shotSize,
      angle: shot.cameraAngle,
      movement: shot.cameraMovement,
      lens: shot.lensFeel,
      lighting: shot.lighting,
      action: shot.subjectAction,
    },
    continuity: manifest.continuity,
    notes: shot.notes,
  };
}

function buildComfyAdapterTemplate() {
  return {
    name: "LTX 2.3 image-to-video adapter template",
    purpose: "Map each comfyui/jobs/* shot JSON into the installed local LTX 2.3 ComfyUI graph.",
    requiredInputs: {
      sourceImage: "LoadImage or equivalent first-frame/reference-image input",
      prompt: "Positive prompt text node",
      negativePrompt: "Negative prompt text node",
      resolution: "Width/height or preset node, 1920x1080 recommended",
      duration: "Frame count or seconds field depending on local LTX node",
      seed: "Seed field, auto allowed unless retrying",
      outputName: "SaveVideo/SaveImage filename prefix",
      outputBin: "Output folder/bin target",
    },
    recommendedDefaults: {
      fps: 24,
      aspectRatio: "16:9",
      resolution: "1920x1080",
      guidance: "Use local LTX 2.3 best-practice defaults, then adjust motion strength per shot.",
    },
  };
}

function buildKlingVeoReadme(manifest) {
  return `# Kling / Veo Operator Package

Use this folder if a person is generating clips manually in Kling or Veo.

Workflow:
1. Open \`shot_checklist.csv\`.
2. Work in order from the top down.
3. For each shot, upload the source image listed in the CSV.
4. Paste the matching prompt from \`prompts/scene-XX/\`.
5. Paste the matching negative prompt where the tool supports it. If the tool has no negative prompt field, use it as an avoid/quality checklist.
6. Generate at 1080p or better.
7. Save outputs into scene bins using the output bin in the CSV.
8. Log which take wins and what settings were used.

The operator should preserve the prompts unless a manual adjustment is needed to improve accuracy or quality.`;
}

function buildOperatorPromptText(shot) {
  return `Shot: ${shot.orderLabel} - ${shot.beatTitle || shot.title}
Scene: ${shot.sceneKey}
Source image: ${shot.sourcePath}
Output bin: ${shot.outputBin}
Resolution: ${shot.resolution}
Duration: ${shot.duration}

Prompt:
${shot.prompt}

Lens: ${shot.lensFeel}
Lighting: ${shot.lighting}
Camera movement: ${shot.cameraMovement}
Action: ${shot.subjectAction}
Sound/dialogue: included in prompt if needed.`;
}

function buildShotOrderCsv(manifest) {
  const rows = [
    [
      "global_order",
      "scene",
      "scene_number",
      "shot_number",
      "order_label",
      "beat_title",
      "source_path",
      "output_bin",
      "duration",
      "resolution",
      "lens",
      "lighting",
      "camera_movement",
      "prompt_path",
      "negative_prompt_path",
    ],
  ];
  manifest.shots.forEach((shot) => {
    rows.push([
      shot.globalOrderLabel || String(shot.globalOrder || ""),
      shot.sceneKey,
      shot.sceneNumber,
      shot.shotNumber,
      shot.orderLabel,
      shot.beatTitle,
      shot.sourcePath,
      shot.outputBin,
      shot.duration,
      shot.resolution,
      shot.lensFeel,
      shot.lighting,
      shot.cameraMovement,
      `kling-veo/prompts/${sceneFolderName(shot.sceneKey)}/${shot.orderLabel}_prompt.txt`,
      `kling-veo/prompts/${sceneFolderName(shot.sceneKey)}/${shot.orderLabel}_negative.txt`,
    ]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildAssetInventoryCsv(manifest) {
  const rows = [["asset_id", "name", "type", "mime", "source_path", "tags", "notes", "external_url"]];
  manifest.assets.forEach((asset) => {
    rows.push([asset.id, asset.name, asset.type, asset.mime, asset.sourcePath, asset.tags, asset.notes, asset.externalUrl]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildSceneBins(manifest) {
  return manifest.scenes.map((scene) => ({
    sceneKey: scene.sceneKey,
    sceneNumber: scene.sceneNumber,
    bin: `renders/${sceneFolderName(scene.sceneKey)}`,
    shots: scene.shots.map((shot) => shot.orderLabel),
  }));
}

function buildDeliverableBinPlan(manifest) {
  return {
    root: "renders",
    bins: buildSceneBins(manifest),
    expectedFiles: manifest.shots.map((shot) => ({
      orderLabel: shot.orderLabel,
      sceneKey: shot.sceneKey,
      bin: shot.outputBin,
      filenamePrefix: `${shot.orderLabel}-${safeSlug(shot.beatTitle || shot.title)}`,
    })),
  };
}

function sceneKeyForAsset(assetId) {
  const node = state.nodes.find((item) => item.type === "media" && item.assetId === assetId);
  return node ? getSceneKey(node) : "";
}

function sceneFolderName(sceneKey = "scene") {
  if (sceneNumberFromKey(sceneKey)) return `scene-${String(sceneNumberFromKey(sceneKey)).padStart(2, "0")}`;
  return safeSlug(sceneKey || "references");
}

function defaultDurationForScene(sceneKey) {
  if (sceneKey === "Text Card - Between Scene 4 and 5") return "4s";
  if (sceneKey === "Ending Text Card") return "5s";
  return "6s";
}

function normalizeResolution(value = "1080p") {
  if (String(value).toLowerCase() === "1080p") return "1920x1080";
  if (String(value).toLowerCase() === "720p") return "1280x720";
  if (String(value).toLowerCase() === "4k") return "3840x2160";
  return value;
}

function assetExtension(asset) {
  const fromName = String(asset.name || "").match(/\.[a-z0-9]{2,5}$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  if (asset.mime?.includes("png")) return ".png";
  if (asset.mime?.includes("jpeg") || asset.mime?.includes("jpg")) return ".jpg";
  if (asset.mime?.includes("webp")) return ".webp";
  if (asset.mime?.includes("mp4")) return ".mp4";
  if (asset.mime?.includes("mpeg")) return ".mp3";
  if (asset.mime?.includes("wav")) return ".wav";
  return ".bin";
}

function safeSlug(value = "item") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "item";
}

function csvCell(value = "") {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function bytesFromDataUrl(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function buildZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.path);
    const data = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, zipTime(), true);
    localView.setUint16(12, zipDate(), true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, zipTime(), true);
    centralView.setUint16(14, zipDate(), true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[index]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function zipTime() {
  const date = new Date();
  return (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
}

function zipDate() {
  const date = new Date();
  return ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
}

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toast(message) {
  const existing = document.querySelector(".toast");
  existing?.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => node.remove(), 1800);
}

function exposeSmokeState() {
  window.__MASTER_CANVAS_SMOKE__ = () => ({
    title: state.title,
    nodeCount: state.nodes.length,
    assetCount: state.assets.length,
    sectionCount: state.nodes.filter((node) => node.type === "section").length,
    shotCount: state.nodes.filter((node) => node.type === "shot" || isWorkflowNode(node)).length,
    view: { ...state.view },
    hasLocalFirstCopy: document.body.innerText.includes("剧本不上云") || state.nodes.some((node) => String(node.notes || "").includes("剧本不上云")),
    nodeTitles: state.nodes.map((node) => node.title),
  });
}

boot().catch((error) => {
  console.error(error);
  toast("无法启动本地画布，请打开开发者工具查看错误");
});
