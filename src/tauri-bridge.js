/**
 * Master Canvas - Tauri Bridge
 *
 * Optional desktop integration. Browser mode stays localStorage-first; Tauri
 * mode uses the global API injected by the desktop shell, so the release build
 * does not depend on browser-only module resolution.
 */

const TauriBridge = (() => {
  let isTauri = false;
  let invoke = null;
  let initPromise = null;

  function tauriGlobal() {
    return window.__TAURI__ || null;
  }

  async function resolveInvoke() {
    if (tauriGlobal()?.core?.invoke) return tauriGlobal().core.invoke;
    throw new Error("Tauri global API is unavailable");
  }

  async function init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        invoke = await resolveInvoke();
        await invoke("get_app_data_dir");
        isTauri = true;
        console.log("Master Canvas: Running in Tauri mode");
        return true;
      } catch (error) {
        invoke = null;
        isTauri = false;
        console.log("Master Canvas: Running in browser mode");
        return false;
      }
    })();

    return initPromise;
  }

  async function ensureReady() {
    if (isTauri && invoke) return true;
    return await init();
  }

  function isAvailable() {
    return isTauri || Boolean(tauriGlobal()?.core?.invoke);
  }

  async function call(command, args, fallback = null) {
    if (!(await ensureReady()) || !invoke) return fallback;
    try {
      return await invoke(command, args);
    } catch (error) {
      console.error(`Failed to invoke ${command}:`, error);
      return fallback;
    }
  }

  function getAppDataDir() {
    return call("get_app_data_dir");
  }

  function getProjectsDir() {
    return call("get_projects_dir");
  }

  function listProjects() {
    return call("list_projects", undefined, []);
  }

  function loadProject(id) {
    return call("load_project", { id });
  }

  function saveProject(project) {
    return call("save_project", { project });
  }

  function createProject(name) {
    return call("create_project", { name });
  }

  async function deleteProject(id) {
    return Boolean(await call("delete_project", { id }, false));
  }

  function exportProject(projectId, outputPath) {
    return call("export_project", { projectId, outputPath });
  }

  function importProject(inputPath) {
    return call("import_project", { inputPath });
  }

  function readTextFile(filePath) {
    return call("read_text_file", { filePath });
  }

  function writeTextFile(filePath, content) {
    return call("write_text_file", { filePath, content });
  }

  function takePendingOpenFile() {
    return call("take_pending_open_file", undefined, null);
  }

  async function listen(event, handler) {
    if (!(await ensureReady())) return null;
    const eventApi = tauriGlobal()?.event;
    if (!eventApi?.listen) return null;
    try {
      return await eventApi.listen(event, handler);
    } catch (error) {
      console.error(`Failed to listen for ${event}:`, error);
      return null;
    }
  }

  function onOpenProjectFile(handler) {
    return listen("master-canvas://open-project-file", (event) => handler(event?.payload));
  }

  async function showSaveDialog(options) {
    if (!(await ensureReady()) || !invoke) return null;
    try {
      return await invoke("plugin:dialog|save", { options: options || {} });
    } catch (error) {
      console.error("Failed to show save dialog:", error);
      return null;
    }
  }

  async function showOpenDialog(options) {
    if (!(await ensureReady()) || !invoke) return null;
    try {
      return await invoke("plugin:dialog|open", { options: options || {} });
    } catch (error) {
      console.error("Failed to show open dialog:", error);
      return null;
    }
  }

  async function openExternal(url) {
    if (!(await ensureReady()) || !invoke) {
      window.open(url, "_blank");
      return;
    }
    try {
      await invoke("plugin:shell|open", { path: url });
    } catch (error) {
      console.error("Failed to open external URL:", error);
      window.open(url, "_blank");
    }
  }

  return {
    init,
    isAvailable,
    isTauri: () => isTauri,
    getAppDataDir,
    getProjectsDir,
    listProjects,
    loadProject,
    saveProject,
    createProject,
    deleteProject,
    exportProject,
    importProject,
    readTextFile,
    writeTextFile,
    takePendingOpenFile,
    onOpenProjectFile,
    showSaveDialog,
    showOpenDialog,
    openExternal,
  };
})();

window.TauriBridge = TauriBridge;
TauriBridge.init();
