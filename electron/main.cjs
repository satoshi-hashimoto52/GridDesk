const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const TEXT_PREVIEW_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".log",
  ".ini",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".sql",
  ".bat",
  ".cmd",
  ".ps1"
]);

const isDev = !app.isPackaged;
const appStatePath = () => path.join(app.getPath("userData"), "state.json");

const defaultSettings = {
  theme: "system",
  window: { width: 1200, height: 800, x: null, y: null, maximized: false },
  grid: { cellWidth: 92, cellHeight: 92, gap: 12, showCellNumber: true },
  ui: {
    windowTransparent: true,
    sidebarCollapsed: false,
    autoFitWindowWidth: true,
    sidebarSections: {
      genreManager: true,
      cellRegister: true,
      settings: true
    },
    categoryManageSections: {
      add: true,
      edit: true
    },
    settingsSections: {
      display: true,
      background: true,
      system: true,
      icon: true,
      cell: true,
      other: true
    },
    opacity: {
      appBackground: 0.25,
      sidebar: 0.85,
      panel: 0.85,
      cell: 0.65,
      iconCard: 0.85
    },
    blur: {
      enabled: true,
      amount: 12,
      backgroundEnabled: true,
      backgroundAmount: 10
    },
    cell: {
      width: 92,
      height: 92,
      gap: 12,
      iconSize: 32,
      labelFontSize: 12,
      labelFontFamily: "system",
      showTypeBadge: true,
      showFileName: true,
      borderRadius: 8,
      borderOpacity: 0.28
    }
  },
  system: {
    openAtLogin: false
  },
  extensionIconTypes: {},
  iconTypes: {
    folder: { label: "フォルダ", icon: "folder", strokeColor: "#f5c542", backgroundColor: "#20242a", backgroundOpacity: 0.9 },
    pdf: { label: "PDF", icon: "fileText", strokeColor: "#ef4444", backgroundColor: "#2a2020", backgroundOpacity: 0.9 },
    excel: { label: "Excel", icon: "table", strokeColor: "#22c55e", backgroundColor: "#1f2a24", backgroundOpacity: 0.9 },
    image: { label: "画像", icon: "image", strokeColor: "#38bdf8", backgroundColor: "#1f2730", backgroundOpacity: 0.9 },
    app: { label: "アプリ", icon: "appWindow", strokeColor: "#a78bfa", backgroundColor: "#262033", backgroundOpacity: 0.9 },
    link: { label: "リンク", icon: "link", strokeColor: "#60a5fa", backgroundColor: "#1f2733", backgroundOpacity: 0.9 },
    note: { label: "ノート", icon: "note", strokeColor: "#f59e0b", backgroundColor: "#302615", backgroundOpacity: 0.9 },
    default: { label: "ファイル", icon: "file", strokeColor: "#e5e7eb", backgroundColor: "#20242a", backgroundOpacity: 0.9 }
  },
  behavior: {
    doubleClickToOpen: true,
    singleClickSelect: true,
    confirmDelete: true,
    warnBrokenLinks: true,
    duplicateMode: "cancel"
  },
  backup: { enabled: true, maxGenerations: 30 }
};

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function normalizeExtensionKey(value) {
  return String(value || "").trim().toLowerCase().replace(/^\.+/, "");
}

function normalizeExtensionIconTypes(rawExtensionIconTypes) {
  const extensionIconTypes = {};
  for (const [extension, setting] of Object.entries(rawExtensionIconTypes || {})) {
    const key = normalizeExtensionKey(extension);
    if (!key) continue;
    const current = setting || {};
    extensionIconTypes[key] = {
      label: key,
      icon: current.icon || defaultSettings.iconTypes.default.icon,
      strokeColor: current.strokeColor || current.color || "#000000",
      backgroundColor: current.backgroundColor || current.iconBackgroundColor || "#000000",
      backgroundOpacity: current.backgroundOpacity ?? current.iconBackgroundOpacity ?? 0
    };
  }
  return extensionIconTypes;
}

function normalizeSettings(rawSettings) {
  const merged = mergeDeep(defaultSettings, rawSettings || {});
  const normalizedIconTypes = {};
  for (const [type, defaultIcon] of Object.entries(defaultSettings.iconTypes)) {
    const current = merged.iconTypes?.[type] || {};
    normalizedIconTypes[type] = {
      ...defaultIcon,
      ...current,
      icon: current.icon || defaultIcon.icon,
      strokeColor: current.strokeColor || current.color || defaultIcon.strokeColor,
      backgroundColor: current.backgroundColor || current.iconBackgroundColor || defaultIcon.backgroundColor,
      backgroundOpacity: current.backgroundOpacity ?? current.iconBackgroundOpacity ?? defaultIcon.backgroundOpacity
    };
    delete normalizedIconTypes[type].emoji;
    delete normalizedIconTypes[type].color;
  }
  return {
    ...merged,
    ui: {
      ...defaultSettings.ui,
      ...(merged.ui || {}),
      opacity: {
        ...defaultSettings.ui.opacity,
        ...(merged.ui?.opacity || {})
      },
      sidebarSections: {
        ...defaultSettings.ui.sidebarSections,
        ...(merged.ui?.sidebarSections || {})
      },
      categoryManageSections: {
        ...defaultSettings.ui.categoryManageSections,
        ...(merged.ui?.categoryManageSections || {})
      },
      settingsSections: {
        ...defaultSettings.ui.settingsSections,
        ...(merged.ui?.settingsSections || {})
      },
      blur: {
        ...defaultSettings.ui.blur,
        ...(merged.ui?.blur || {})
      },
      cell: {
        ...defaultSettings.ui.cell,
        ...(merged.ui?.cell || {})
      }
    },
    extensionIconTypes: normalizeExtensionIconTypes(merged.extensionIconTypes),
    iconTypes: normalizedIconTypes
  };
}

function readSettings(workspacePath) {
  const paths = workspacePaths(workspacePath);
  return normalizeSettings(readJson(paths.settings, {}));
}

function saveSettings(workspacePath, settings) {
  const normalized = normalizeSettings(settings);
  writeJson(workspacePaths(workspacePath).settings, normalized);
  return normalized;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "_",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds())
  ].join("");
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runSql(dbPath, sql, { json = false } = {}) {
  return new Promise((resolve, reject) => {
    const args = json ? ["-json", dbPath, sql] : [dbPath, sql];
    execFile("sqlite3", args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      if (!json) {
        resolve(stdout);
        return;
      }
      const text = stdout.trim();
      resolve(text ? JSON.parse(text) : []);
    });
  });
}

function workspacePaths(workspacePath) {
  return {
    root: workspacePath,
    db: path.join(workspacePath, "launcher.db"),
    settings: path.join(workspacePath, "settings.json"),
    aliases: path.join(workspacePath, "path_aliases.json"),
    icons: path.join(workspacePath, "icons"),
    backups: path.join(workspacePath, "backups"),
    exports: path.join(workspacePath, "exports")
  };
}

async function ensureWorkspace(workspacePath) {
  const paths = workspacePaths(workspacePath);
  fs.mkdirSync(paths.root, { recursive: true });
  fs.mkdirSync(paths.icons, { recursive: true });
  fs.mkdirSync(paths.backups, { recursive: true });
  fs.mkdirSync(paths.exports, { recursive: true });

  saveSettings(workspacePath, readJson(paths.settings, {}));
  if (!fs.existsSync(paths.aliases)) {
    writeJson(paths.aliases, {
      "{Documents}": path.join(os.homedir(), "Documents"),
      "{Desktop}": path.join(os.homedir(), "Desktop"),
      "{OneDrive}": path.join(os.homedir(), "OneDrive"),
      "{ProjectRoot}": path.join(os.homedir(), "Projects")
    });
  }

  await runSql(paths.db, `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cols INTEGER NOT NULL DEFAULT 6,
  rows INTEGER NOT NULL DEFAULT 3,
  collapsed INTEGER NOT NULL DEFAULT 0,
  accent_color TEXT,
  memo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  path_type TEXT NOT NULL DEFAULT 'absolute',
  item_type TEXT NOT NULL DEFAULT 'default',
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  icon_path TEXT,
  memo TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS disabled_cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_id INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (genre_id, x, y),
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS path_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT NOT NULL UNIQUE,
  real_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_genre_cell
ON items (genre_id, x, y)
WHERE enabled = 1;
`);

  const itemColumns = await runSql(paths.db, "PRAGMA table_info(items);", { json: true });
  const columnNames = new Set(itemColumns.map((column) => column.name));
  const iconColumns = [
    ["icon_emoji", "TEXT"],
    ["icon_color", "TEXT"],
    ["icon_background_color", "TEXT"],
    ["icon_name", "TEXT"],
    ["icon_background_opacity", "REAL"]
  ];
  for (const [name, type] of iconColumns) {
    if (!columnNames.has(name)) {
      await runSql(paths.db, `ALTER TABLE items ADD COLUMN ${name} ${type};`);
    }
  }

  const genres = await runSql(paths.db, "SELECT COUNT(*) AS count FROM genres;", { json: true });
  if ((genres[0]?.count || 0) === 0) {
    const ts = nowIso();
    await runSql(
      paths.db,
      `INSERT INTO genres (name, sort_order, cols, rows, accent_color, memo, created_at, updated_at)
       VALUES ('General', 0, 6, 3, '#2f7d68', '', ${sqlValue(ts)}, ${sqlValue(ts)});`
    );
  }

  await backupWorkspace(workspacePath, "startup");
  rememberWorkspace(workspacePath);
  return getWorkspaceData(workspacePath);
}

function rememberWorkspace(workspacePath) {
  const state = readJson(appStatePath(), { recentWorkspaces: [] });
  const recentWorkspaces = [
    workspacePath,
    ...(state.recentWorkspaces || []).filter((item) => item !== workspacePath)
  ].slice(0, 8);
  writeJson(appStatePath(), { ...state, recentWorkspaces });
}

async function getWorkspaceData(workspacePath) {
  const paths = workspacePaths(workspacePath);
  const [genres, items, disabledCells] = await Promise.all([
    runSql(paths.db, "SELECT * FROM genres ORDER BY sort_order ASC, name COLLATE NOCASE ASC;", { json: true }),
    runSql(paths.db, "SELECT * FROM items WHERE enabled = 1 ORDER BY name COLLATE NOCASE ASC;", { json: true }),
    runSql(paths.db, "SELECT * FROM disabled_cells;", { json: true })
  ]);
  return {
    workspacePath,
    settings: readSettings(workspacePath),
    aliases: readJson(paths.aliases, {}),
    genres,
    items,
    disabledCells
  };
}

async function backupWorkspace(workspacePath, reason = "manual") {
  const paths = workspacePaths(workspacePath);
  const settings = readSettings(workspacePath);
  if (!settings.backup?.enabled) return { skipped: true };
  fs.mkdirSync(paths.backups, { recursive: true });
  const suffix = `${stamp()}_${reason}`;
  const targets = [
    [paths.db, path.join(paths.backups, `launcher_${suffix}.db`)],
    [paths.settings, path.join(paths.backups, `settings_${suffix}.json`)],
    [paths.aliases, path.join(paths.backups, `path_aliases_${suffix}.json`)]
  ];
  for (const [from, to] of targets) {
    if (fs.existsSync(from)) fs.copyFileSync(from, to);
  }

  const max = settings.backup?.maxGenerations || 30;
  for (const prefix of ["launcher_", "settings_", "path_aliases_"]) {
    const files = fs
      .readdirSync(paths.backups)
      .filter((file) => file.startsWith(prefix))
      .map((file) => ({ file, time: fs.statSync(path.join(paths.backups, file)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    for (const oldFile of files.slice(max)) fs.unlinkSync(path.join(paths.backups, oldFile.file));
  }
  return { ok: true };
}

function classifyPath(rawPath) {
  const target = rawPath.trim();
  if (/^https?:\/\//i.test(target)) return { pathType: "url", itemType: "link" };
  const ext = path.extname(target).toLowerCase();
  if (!ext && fs.existsSync(target) && fs.statSync(target).isDirectory()) return { pathType: "absolute", itemType: "folder" };
  if ([".pdf"].includes(ext)) return { pathType: "absolute", itemType: "pdf" };
  if ([".xlsx", ".xls", ".xlsm", ".csv"].includes(ext)) return { pathType: "absolute", itemType: "excel" };
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return { pathType: "absolute", itemType: "image" };
  if ([".exe", ".bat", ".cmd", ".lnk", ".app"].includes(ext)) return { pathType: "absolute", itemType: "app" };
  if (ext === ".md") return { pathType: "absolute", itemType: "note" };
  if (/^\{[^}]+\}/.test(target)) return { pathType: "alias", itemType: "default" };
  if (!path.isAbsolute(target)) return { pathType: "relative", itemType: "default" };
  return { pathType: "absolute", itemType: ext ? "default" : "folder" };
}

function defaultNameForPath(rawPath) {
  if (/^https?:\/\//i.test(rawPath)) {
    try {
      return new URL(rawPath).hostname;
    } catch {
      return rawPath;
    }
  }
  return path.basename(rawPath.replace(/[\\/]+$/, "")) || rawPath;
}

function resolveTarget(workspacePath, targetPath, pathType) {
  if (pathType === "url" || /^https?:\/\//i.test(targetPath)) return targetPath;
  if (pathType === "relative") return path.join(workspacePath, targetPath);
  if (pathType === "alias") {
    const aliases = readJson(workspacePaths(workspacePath).aliases, {});
    const alias = Object.keys(aliases).find((key) => targetPath.startsWith(key));
    if (alias) return path.join(aliases[alias], targetPath.slice(alias.length));
  }
  return targetPath;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 260,
    minHeight: 260,
    title: "GridDesk",
    backgroundColor: "#00000000",
    transparent: true,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    trafficLightPosition: process.platform === "darwin" ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("app:getState", () => readJson(appStatePath(), { recentWorkspaces: [] }));

ipcMain.handle("system:getOpenAtLogin", async () => {
  const loginSettings = app.getLoginItemSettings();
  return { ok: true, openAtLogin: Boolean(loginSettings.openAtLogin) };
});

ipcMain.handle("system:setOpenAtLogin", async (_event, enabled) => {
  try {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    const loginSettings = app.getLoginItemSettings();
    return { ok: true, openAtLogin: Boolean(loginSettings.openAtLogin) };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle("file:previewText", async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== "string") return { ok: false, error: "パスが空です" };
    if (/^https?:\/\//i.test(targetPath)) return { ok: false, skipped: true, reason: "URLは対象外です" };

    const ext = path.extname(targetPath).toLowerCase();
    if (!TEXT_PREVIEW_EXTENSIONS.has(ext)) {
      return { ok: false, skipped: true, reason: "テキストプレビュー対象外です" };
    }

    const stat = await fsp.stat(targetPath);
    if (!stat.isFile()) return { ok: false, skipped: true, reason: "ファイルではありません" };

    const maxBytes = 16 * 1024;
    const handle = await fsp.open(targetPath, "r");
    try {
      const buffer = Buffer.alloc(Math.min(maxBytes, stat.size));
      const result = await handle.read(buffer, 0, buffer.length, 0);
      const chunk = buffer.subarray(0, result.bytesRead);
      if (chunk.includes(0)) return { ok: false, skipped: true, reason: "バイナリファイルの可能性があります" };

      const text = chunk.toString("utf8");
      return {
        ok: true,
        text,
        truncated: stat.size > maxBytes,
        size: stat.size,
        ext
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle("file:saveText", async (_event, payload) => {
  try {
    const targetPath = payload?.path;
    const text = payload?.text;

    if (!targetPath || typeof targetPath !== "string") return { ok: false, error: "パスが空です" };
    if (typeof text !== "string") return { ok: false, error: "保存するテキストが不正です" };
    if (/^https?:\/\//i.test(targetPath)) return { ok: false, error: "URLは編集できません" };

    const ext = path.extname(targetPath).toLowerCase();
    if (!TEXT_PREVIEW_EXTENSIONS.has(ext)) return { ok: false, error: "編集対象外のファイルです" };

    const stat = await fsp.stat(targetPath);
    if (!stat.isFile()) return { ok: false, error: "ファイルではありません" };

    await fsp.writeFile(targetPath, text, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle("file:readPdfPreview", async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== "string") return { ok: false, error: "パスが空です" };
    if (/^https?:\/\//i.test(targetPath)) return { ok: false, skipped: true, reason: "URLは対象外です" };

    const ext = path.extname(targetPath).toLowerCase();
    if (ext !== ".pdf") return { ok: false, skipped: true, reason: "PDFではありません" };

    const stat = await fsp.stat(targetPath);
    if (!stat.isFile()) return { ok: false, skipped: true, reason: "ファイルではありません" };

    const buffer = await fsp.readFile(targetPath);
    return {
      ok: true,
      data: Array.from(buffer),
      size: stat.size,
      name: path.basename(targetPath)
    };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle("window:setWidth", async (event, width) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  if (!browserWindow) return { ok: false, error: "BrowserWindow not found" };
  const bounds = browserWindow.getBounds();
  const minAutoFitWidth = 260;
  const maxAutoFitWidth = Math.min(1800, screen.getPrimaryDisplay().workAreaSize.width);
  const safeWidth = Math.max(minAutoFitWidth, Math.min(Number(width) || bounds.width, maxAutoFitWidth));
  console.log("GridDesk window:setWidth", {
    requested: width,
    applied: safeWidth,
    currentBounds: bounds
  });
  browserWindow.setBounds({ ...bounds, width: safeWidth });
  return { ok: true, width: safeWidth };
});

ipcMain.handle("window:setBounds", async (event, boundsPatch) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  if (!browserWindow) return { ok: false, error: "BrowserWindow not found" };

  const current = browserWindow.getBounds();
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const minAutoFitWidth = 260;
  const minAutoFitHeight = 260;
  const maxAutoFitWidth = Math.min(1800, workArea.width);
  const maxAutoFitHeight = Math.min(1200, workArea.height);
  const width = Math.max(
    minAutoFitWidth,
    Math.min(Number(boundsPatch?.width) || current.width, maxAutoFitWidth)
  );
  const height = Math.max(
    minAutoFitHeight,
    Math.min(Number(boundsPatch?.height) || current.height, maxAutoFitHeight)
  );

  browserWindow.setBounds({ ...current, width, height });
  return { ok: true, width, height };
});

ipcMain.handle("workspace:create", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Create or choose a GridDesk workspace folder",
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return ensureWorkspace(result.filePaths[0]);
});

ipcMain.handle("workspace:open", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open GridDesk workspace",
    properties: ["openDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return ensureWorkspace(result.filePaths[0]);
});

ipcMain.handle("workspace:openPath", async (_event, workspacePath) => ensureWorkspace(workspacePath));
ipcMain.handle("workspace:reveal", (_event, workspacePath) => shell.openPath(workspacePath));
ipcMain.handle("workspace:backup", (_event, workspacePath) => backupWorkspace(workspacePath, "manual"));
ipcMain.handle("settings:get", (_event, workspacePath) => readSettings(workspacePath));
ipcMain.handle("settings:save", (_event, workspacePath, settings) => saveSettings(workspacePath, settings));
ipcMain.handle("settings:update", (_event, workspacePath, partialSettings) => {
  const current = readSettings(workspacePath);
  return saveSettings(workspacePath, mergeDeep(current, partialSettings || {}));
});

ipcMain.handle("dialog:selectTarget", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select file or folder",
    properties: ["openFile", "openDirectory", "multiSelections"]
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle("clipboard:readText", () => require("electron").clipboard.readText());

ipcMain.handle("genre:create", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_genre_create");
  const ts = nowIso();
  const max = await runSql(paths.db, "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM genres;", { json: true });
  await runSql(
    paths.db,
    `INSERT INTO genres (name, sort_order, cols, rows, accent_color, memo, created_at, updated_at)
     VALUES (${sqlValue(input.name)}, ${sqlValue(max[0]?.next || 0)}, ${sqlValue(input.cols)}, ${sqlValue(input.rows)}, ${sqlValue(input.accentColor || "#2f7d68")}, ${sqlValue(input.memo || "")}, ${sqlValue(ts)}, ${sqlValue(ts)});`
  );
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("genre:update", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_genre_update");
  await runSql(
    paths.db,
    `UPDATE genres
     SET name = ${sqlValue(input.name)}, cols = ${sqlValue(input.cols)}, rows = ${sqlValue(input.rows)},
         collapsed = ${sqlValue(input.collapsed)}, accent_color = ${sqlValue(input.accentColor)}, memo = ${sqlValue(input.memo || "")},
         updated_at = ${sqlValue(nowIso())}
     WHERE id = ${sqlValue(input.id)};`
  );
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("genre:delete", async (_event, workspacePath, genreId) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_genre_delete");
  await runSql(paths.db, `DELETE FROM genres WHERE id = ${sqlValue(genreId)};`);
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("item:save", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_item_save");
  const classified = classifyPath(input.path);
  const ts = nowIso();
  const name = input.name?.trim() || defaultNameForPath(input.path);
  await runSql(
    paths.db,
    `DELETE FROM disabled_cells WHERE genre_id = ${sqlValue(input.genreId)} AND x = ${sqlValue(input.x)} AND y = ${sqlValue(input.y)};`
  );
  const existing = await runSql(
    paths.db,
    `SELECT id FROM items WHERE path = ${sqlValue(input.path)} AND enabled = 1 LIMIT 1;`,
    { json: true }
  );
  if (existing[0]?.id) {
    await runSql(
      paths.db,
      `UPDATE items
       SET genre_id = ${sqlValue(input.genreId)}, name = ${sqlValue(name)}, path_type = ${sqlValue(classified.pathType)},
           item_type = ${sqlValue(input.itemType || classified.itemType)}, x = ${sqlValue(input.x)}, y = ${sqlValue(input.y)},
           icon_name = ${sqlValue(input.iconName || null)},
           updated_at = ${sqlValue(ts)}
       WHERE id = ${sqlValue(existing[0].id)};`
    );
  } else {
    await runSql(
      paths.db,
      `INSERT INTO items (genre_id, name, path, path_type, item_type, x, y, icon_path, icon_name, memo, enabled, created_at, updated_at)
       VALUES (${sqlValue(input.genreId)}, ${sqlValue(name)}, ${sqlValue(input.path)}, ${sqlValue(classified.pathType)},
       ${sqlValue(input.itemType || classified.itemType)}, ${sqlValue(input.x)}, ${sqlValue(input.y)}, NULL, ${sqlValue(input.iconName || null)}, ${sqlValue(input.memo || "")}, 1, ${sqlValue(ts)}, ${sqlValue(ts)});`
    );
  }
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("item:update", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_item_update");
  const assignments = [];
  const allowed = {
    name: "name",
    path: "path",
    itemType: "item_type",
    iconName: "icon_name",
    iconColor: "icon_color",
    iconBackgroundColor: "icon_background_color",
    iconBackgroundOpacity: "icon_background_opacity"
  };
  for (const [inputKey, columnName] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      assignments.push(`${columnName} = ${sqlValue(input[inputKey])}`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, "path")) {
    const classified = classifyPath(input.path);
    assignments.push(`path_type = ${sqlValue(classified.pathType)}`);
    if (!Object.prototype.hasOwnProperty.call(input, "itemType")) {
      assignments.push(`item_type = ${sqlValue(classified.itemType)}`);
    }
  }
  if (assignments.length === 0) return getWorkspaceData(workspacePath);
  assignments.push(`updated_at = ${sqlValue(nowIso())}`);
  await runSql(
    paths.db,
    `UPDATE items SET ${assignments.join(", ")} WHERE id = ${sqlValue(input.id)} AND enabled = 1;`
  );
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("item:move", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_item_move");
  const current = await runSql(paths.db, `SELECT genre_id FROM items WHERE id = ${sqlValue(input.id)} LIMIT 1;`, { json: true });
  const genreId = input.genreId ?? current[0]?.genre_id;
  if (genreId !== undefined && genreId !== null) {
    await runSql(
      paths.db,
      `DELETE FROM disabled_cells WHERE genre_id = ${sqlValue(genreId)} AND x = ${sqlValue(input.x)} AND y = ${sqlValue(input.y)};`
    );
  }
  await runSql(
    paths.db,
    `UPDATE items SET genre_id = ${sqlValue(genreId)}, x = ${sqlValue(input.x)}, y = ${sqlValue(input.y)}, updated_at = ${sqlValue(nowIso())}
     WHERE id = ${sqlValue(input.id)};`
  );
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("item:delete", async (_event, workspacePath, itemId) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_item_delete");
  await runSql(paths.db, `UPDATE items SET enabled = 0, updated_at = ${sqlValue(nowIso())} WHERE id = ${sqlValue(itemId)};`);
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("cell:disable", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_cell_disable");
  await runSql(
    paths.db,
    `INSERT OR IGNORE INTO disabled_cells (genre_id, x, y, created_at)
     VALUES (${sqlValue(input.genreId)}, ${sqlValue(input.x)}, ${sqlValue(input.y)}, ${sqlValue(nowIso())});`
  );
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("cell:restore", async (_event, workspacePath, input) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_cell_restore");
  await runSql(
    paths.db,
    `DELETE FROM disabled_cells WHERE genre_id = ${sqlValue(input.genreId)} AND x = ${sqlValue(input.x)} AND y = ${sqlValue(input.y)};`
  );
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("cell:restoreAll", async (_event, workspacePath) => {
  const paths = workspacePaths(workspacePath);
  await backupWorkspace(workspacePath, "before_cell_restore_all");
  await runSql(paths.db, "DELETE FROM disabled_cells;");
  return getWorkspaceData(workspacePath);
});

ipcMain.handle("path:open", async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== "string") {
      return { ok: false, error: "パスが空です" };
    }

    console.log("GridDesk path:open", targetPath);

    if (/^https?:\/\//i.test(targetPath)) {
      await shell.openExternal(targetPath);
      return { ok: true };
    }

    const errorMessage = await shell.openPath(targetPath);
    return errorMessage ? { ok: false, error: errorMessage } : { ok: true };
  } catch (error) {
    console.error("path:open failed", error);
    return { ok: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle("path:reveal", async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== "string") {
      return { ok: false, error: "パスが空です" };
    }

    console.log("GridDesk path:reveal", targetPath);
    shell.showItemInFolder(targetPath);
    return { ok: true };
  } catch (error) {
    console.error("path:reveal failed", error);
    return { ok: false, error: String(error?.message ?? error) };
  }
});

ipcMain.handle("target:open", async (_event, workspacePath, item) => {
  try {
    const targetPath = typeof item === "string" ? item : item?.path;
    if (!targetPath || typeof targetPath !== "string") {
      return { ok: false, error: "パスが空です", message: "パスが空です" };
    }

    const resolved = typeof item === "string" ? targetPath : resolveTarget(workspacePath, targetPath, item.path_type);
    console.log("GridDesk path:open", resolved);

    if (/^https?:\/\//i.test(resolved)) {
      await shell.openExternal(resolved);
      return { ok: true };
    }

    const message = await shell.openPath(resolved);
    return message ? { ok: false, error: message, message } : { ok: true };
  } catch (error) {
    console.error("target:open failed", error);
    const message = String(error?.message ?? error);
    return { ok: false, error: message, message };
  }
});

ipcMain.handle("target:reveal", async (_event, workspacePath, item) => {
  try {
    const targetPath = typeof item === "string" ? item : item?.path;
    if (!targetPath || typeof targetPath !== "string") {
      return { ok: false, error: "パスが空です", message: "パスが空です" };
    }

    const resolved = typeof item === "string" ? targetPath : resolveTarget(workspacePath, targetPath, item.path_type);
    console.log("GridDesk path:reveal", resolved);

    if (fs.existsSync(resolved)) {
      shell.showItemInFolder(resolved);
      return { ok: true };
    }
    return { ok: false, error: "Path does not exist", message: "Path does not exist" };
  } catch (error) {
    console.error("target:reveal failed", error);
    const message = String(error?.message ?? error);
    return { ok: false, error: message, message };
  }
});
