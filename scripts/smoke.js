/**
 * Master Canvas smoke check.
 *
 * Starts the local Vite frontend, opens Edge/Chrome through CDP, loads the
 * Chinese film demo, validates key Chinese copy and object counts, then saves a
 * screenshot for visual confirmation. No Playwright dependency is required.
 */
import { spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import http from 'http';
import { join, resolve } from 'path';

const APP_PORT = Number(process.env.MASTER_CANVAS_SMOKE_APP_PORT || 5173);
const APP_URL = process.env.MASTER_CANVAS_SMOKE_URL || `http://127.0.0.1:${APP_PORT}`;
const DEBUG_PORT = Number(process.env.MASTER_CANVAS_SMOKE_CDP_PORT || 9347);
const OUTPUT_DIR = resolve('output', 'playwright');
const PROFILE_DIR = resolve('.playwright-cli', `master-canvas-smoke-${Date.now()}`);

const BROWSER_CANDIDATES = [
  process.env.MASTER_CANVAS_BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const npmCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const npmArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npm run dev -- --host 127.0.0.1 --port ${APP_PORT} --strictPort`]
  : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(APP_PORT), '--strictPort'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson({ hostname = '127.0.0.1', port, path, timeout = 2000 }) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname, port, path }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error(`Invalid JSON from ${path}: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error(`Timed out waiting for ${path}`)));
  });
}

function getText(url, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.get({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname || '/',
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error(`Timed out waiting for ${url}`)));
  });
}

async function waitForHttp(url, label) {
  const deadline = Date.now() + 20000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await getText(url);
      if (response.statusCode && response.statusCode < 500) return response;
      lastError = new Error(`${label} returned HTTP ${response.statusCode}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(300);
  }
  throw lastError || new Error(`${label} did not start`);
}

async function removeProfileDir(path) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 7) {
        console.warn(`无法立即删除临时浏览器目录，Windows 可能仍在释放文件锁：${path}`);
        return;
      }
      await sleep(400);
    }
  }
}

async function ensureDevServer() {
  try {
    const response = await getText(APP_URL, 800);
    if (response.statusCode && response.statusCode < 500 && response.body.includes('Master Canvas')) {
      return null;
    }
  } catch {
    // Start a local Vite server below.
  }

  const child = spawn(npmCommand, npmArgs, {
    cwd: process.cwd(),
    stdio: 'ignore',
    windowsHide: true,
  });
  await waitForHttp(APP_URL, 'Master Canvas dev server');
  return child;
}

async function waitForCdp() {
  const deadline = Date.now() + 10000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await getJson({ port: DEBUG_PORT, path: '/json/version' });
    } catch (err) {
      lastError = err;
      await sleep(250);
    }
  }
  throw lastError || new Error('CDP did not start');
}

function send(ws, method, params = {}) {
  const id = ++send.nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    send.pending.set(id, { resolve, reject });
  });
}
send.nextId = 0;
send.pending = new Map();

async function openCdpPage(wsUrl) {
  const ws = new WebSocket(wsUrl);
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id && send.pending.has(msg.id)) {
      const pending = send.pending.get(msg.id);
      send.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error.message));
      else pending.resolve(msg.result);
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  return ws;
}

async function waitForLoad(ws) {
  await new Promise(resolve => {
    const onMessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', onMessage);
        resolve();
      }
    };
    ws.addEventListener('message', onMessage);
  });
}

async function evaluate(ws, expression) {
  const result = await send(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails.exception?.description ||
      result.exceptionDetails.exception?.value ||
      result.exceptionDetails.text ||
      'Runtime evaluation failed';
    throw new Error(details);
  }
  return result.result.value;
}

async function runBrowserCheck() {
  const browser = BROWSER_CANDIDATES.find(existsSync);
  if (!browser) {
    throw new Error('未找到 Edge 或 Chrome。可设置 MASTER_CANVAS_BROWSER 指向浏览器可执行文件。');
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(PROFILE_DIR, { recursive: true });

  const browserProcess = spawn(browser, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await waitForCdp();
    const targets = await getJson({ port: DEBUG_PORT, path: '/json/list' });
    const page = targets.find(target => target.type === 'page' && target.webSocketDebuggerUrl);
    if (!page) throw new Error('未找到可调试浏览器页面。');

    const ws = await openCdpPage(page.webSocketDebuggerUrl);
    await send(ws, 'Page.enable');
    await send(ws, 'Runtime.enable');
    await send(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 920,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send(ws, 'Page.navigate', { url: APP_URL });
    await waitForLoad(ws);
    await sleep(800);

    await evaluate(ws, `(() => {
      localStorage.setItem('master-canvas-lang', 'zh');
      [
        'master-canvas-project-v1',
        'master-canvas-projects-v1',
        'master-canvas-active-project-v1'
      ].forEach(key => localStorage.removeItem(key));
      Object.keys(localStorage)
        .filter(key => key.startsWith('master-canvas-project-v1:') || key.startsWith('master-canvas-versions-v1:'))
        .forEach(key => localStorage.removeItem(key));
      return true;
    })()`);
    await send(ws, 'Page.navigate', { url: APP_URL });
    await waitForLoad(ws);
    await sleep(800);

    const state = await evaluate(ws, `(async () => {
      document.querySelector('#loadDemoBtn')?.click();
      await new Promise(resolve => setTimeout(resolve, 1200));
      document.querySelector('#shotListBtn')?.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      const smoke = window.__MASTER_CANVAS_SMOKE__?.() || {};
      const text = document.body.innerText;
      const domText = document.body.textContent || "";
      return {
        title: document.title,
        lang: localStorage.getItem('master-canvas-lang'),
        projectTitle: document.querySelector('#projectTitle')?.value,
        nodeCount: smoke.nodeCount,
        sectionCount: smoke.sectionCount,
        shotCount: smoke.shotCount,
        assetCount: smoke.assetCount,
        viewScale: smoke.view?.scale,
        hasDemoTitle: text.includes('最后一班地铁'),
        hasChineseNav: domText.includes('资源库') && domText.includes('模块导航') && domText.includes('连续性圣经'),
        hasModuleNavigator: text.includes('个制作模块') && text.includes('条工作流') && text.includes('交付节点与版本控制'),
        hasModuleColors: document.querySelectorAll('.canvas-node[class*="module-"]').length >= 20,
        hasShotHierarchy: domText.includes('叙事目的') && document.querySelectorAll('.shot-node-focus').length >= 2,
        hasLocalFirstCopy: text.includes('剧本不上云') || smoke.hasLocalFirstCopy,
        hasEnglishHelp: text.includes('Top Bar') || text.includes('Canvas menu') || text.includes('Load demo'),
        topbar: (() => {
          const app = document.querySelector('#app')?.getBoundingClientRect();
          const topbar = document.querySelector('.topbar')?.getBoundingClientRect();
          const actions = document.querySelector('.top-actions')?.getBoundingClientRect();
          const asset = document.querySelector('#assetDrawer')?.getBoundingClientRect();
          const viewport = document.querySelector('#canvasViewport')?.getBoundingClientRect();
          const buttons = [...document.querySelectorAll('.top-actions > *')]
            .map(el => el.getBoundingClientRect())
            .filter(rect => rect.width > 0 && rect.height > 0);
          const centers = buttons.map(rect => Math.round(rect.top + rect.height / 2));
          return {
            appRows: getComputedStyle(document.querySelector('#app')).gridTemplateRows,
            topbarHeight: Math.round(topbar?.height || 0),
            actionsHeight: Math.round(actions?.height || 0),
            wraps: centers.length ? Math.max(...centers) - Math.min(...centers) > 6 : true,
            coversAssetDrawer: topbar && asset ? topbar.bottom > asset.top + 1 : true,
            coversViewport: topbar && viewport ? topbar.bottom > viewport.top + 1 : true,
          };
        })(),
      };
    })()`);

    const screenshot = await send(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const screenshotPath = join(OUTPUT_DIR, 'master-canvas-demo-smoke.png');
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    ws.close();

    const failures = [];
    if (state.lang !== 'zh') failures.push('默认语言不是中文');
    if (!state.hasDemoTitle) failures.push('中文 demo 标题不可见');
    if (!state.hasChineseNav) failures.push('关键中文导航不可见');
    if (!state.hasModuleNavigator) failures.push('影视项目模块导航不可见');
    if (!state.hasModuleColors) failures.push('模块色彩系统未渲染');
    if (!state.hasShotHierarchy) failures.push('分镜卡视觉层级未渲染');
    if (!state.viewScale || state.viewScale < 0.28) failures.push(`demo 默认缩放过小：${state.viewScale}`);
    if (!state.hasLocalFirstCopy) failures.push('本地优先 / 剧本不上云定位不可见');
    if (state.hasEnglishHelp) failures.push('界面仍出现英文帮助或英文加载按钮');
    if (state.nodeCount < 20) failures.push(`demo 卡片数量不足：${state.nodeCount}`);
    if (state.sectionCount < 6) failures.push(`demo 模块数量不足：${state.sectionCount}`);
    if (state.shotCount < 4) failures.push(`demo 镜头/工作流数量不足：${state.shotCount}`);
    if (state.assetCount < 3) failures.push(`demo 资源数量不足：${state.assetCount}`);
    if (!state.topbar || state.topbar.wraps) failures.push('顶部操作栏发生换行');
    if (state.topbar?.coversAssetDrawer) failures.push('顶部栏覆盖资源库');
    if (state.topbar?.coversViewport) failures.push('顶部栏覆盖画布');

    console.log(JSON.stringify({ appUrl: APP_URL, screenshotPath, ...state }, null, 2));
    if (failures.length) throw new Error(`Smoke check failed: ${failures.join('; ')}`);
  } finally {
    browserProcess.kill();
    await new Promise(resolve => {
      browserProcess.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
    await removeProfileDir(PROFILE_DIR);
  }
}

async function main() {
  const devServer = await ensureDevServer();
  try {
    await runBrowserCheck();
  } finally {
    if (devServer) {
      devServer.kill();
      await sleep(300);
    }
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
