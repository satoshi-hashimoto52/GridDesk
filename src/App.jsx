import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  FolderOpen,
  Pencil,
  Plus,
  Settings,
  Trash2
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LineIcon, { LINE_ICON_OPTIONS } from "./components/LineIcon.jsx";
import { hexToRgba } from "./utils/color.js";
import "./styles.css";

const api = window.gridDesk;
const WORK_MODES = {
  NORMAL: "normal",
  REGISTER: "register",
  DELETE_CELL: "deleteCell"
};

const defaultIconTypes = {
  folder: { label: "フォルダ", icon: "folder", strokeColor: "#f5c542", backgroundColor: "#20242a", backgroundOpacity: 0.9 },
  pdf: { label: "PDF", icon: "fileText", strokeColor: "#ef4444", backgroundColor: "#2a2020", backgroundOpacity: 0.9 },
  excel: { label: "Excel", icon: "table", strokeColor: "#22c55e", backgroundColor: "#1f2a24", backgroundOpacity: 0.9 },
  image: { label: "画像", icon: "image", strokeColor: "#38bdf8", backgroundColor: "#1f2730", backgroundOpacity: 0.9 },
  app: { label: "アプリ", icon: "appWindow", strokeColor: "#a78bfa", backgroundColor: "#262033", backgroundOpacity: 0.9 },
  link: { label: "リンク", icon: "link", strokeColor: "#60a5fa", backgroundColor: "#1f2733", backgroundOpacity: 0.9 },
  note: { label: "ノート", icon: "note", strokeColor: "#f59e0b", backgroundColor: "#302615", backgroundOpacity: 0.9 },
  default: { label: "ファイル", icon: "file", strokeColor: "#e5e7eb", backgroundColor: "#20242a", backgroundOpacity: 0.9 }
};

const defaultSettings = {
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
      borderRadius: 12,
      borderOpacity: 0.28
    }
  },
  system: {
    openAtLogin: false
  },
  iconTypes: defaultIconTypes
};

const itemTypes = [
  { value: "default", label: "Default" },
  { value: "folder", label: "Folder" },
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Spreadsheet" },
  { value: "image", label: "Image" },
  { value: "app", label: "App" },
  { value: "note", label: "Note" },
  { value: "link", label: "Link" }
];

const opacityFields = [
  ["appBackground", "背景透過度"],
  ["sidebar", "サイドバー"],
  ["panel", "パネル"],
  ["cell", "セル"],
  ["iconCard", "アイコンカード"]
];

const cellRangeFields = [
  ["width", "セル幅", 64, 160, 1, ""],
  ["height", "セル高さ", 64, 160, 1, ""],
  ["gap", "セル間隔", 4, 32, 1, ""],
  ["iconSize", "アイコンサイズ", 20, 72, 1, ""],
  ["labelFontSize", "ラベル文字サイズ", 6, 18, 1, ""],
  ["borderRadius", "セル角丸", 0, 28, 1, ""],
  ["borderOpacity", "セル枠線の濃さ", 0, 1, 0.01, "fixed2"]
];

const labelFontOptions = [
  ["system", "システム"],
  ["sans", "ゴシック"],
  ["serif", "明朝/Serif"],
  ["mono", "等幅"],
  ["rounded", "丸ゴシック風"]
];

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

function normalizeSettings(rawSettings) {
  const merged = mergeDeep(defaultSettings, rawSettings || {});
  const iconTypes = {};
  for (const [type, defaultIcon] of Object.entries(defaultIconTypes)) {
    const current = merged.iconTypes?.[type] || {};
    iconTypes[type] = {
      ...defaultIcon,
      ...current,
      icon: current.icon || defaultIcon.icon,
      strokeColor: current.strokeColor || current.color || defaultIcon.strokeColor,
      backgroundColor: current.backgroundColor || current.iconBackgroundColor || defaultIcon.backgroundColor,
      backgroundOpacity: current.backgroundOpacity ?? current.iconBackgroundOpacity ?? defaultIcon.backgroundOpacity
    };
    delete iconTypes[type].emoji;
    delete iconTypes[type].color;
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
    iconTypes
  };
}

function getIconTypeSetting(type, settings) {
  const iconTypes = settings?.iconTypes || {};
  return iconTypes[type] || iconTypes.default || defaultIconTypes.default;
}

function getLabelFontFamilyValue(fontFamily) {
  if (fontFamily === "sans") return `"Helvetica Neue", Arial, sans-serif`;
  if (fontFamily === "serif") return `Georgia, "Times New Roman", serif`;
  if (fontFamily === "mono") return `"SFMono-Regular", Consolas, "Liberation Mono", monospace`;
  if (fontFamily === "rounded") return `ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif`;
  return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function applyThemeVariables(settings) {
  const ui = settings?.ui || {};
  const opacity = ui.opacity || {};
  const blur = ui.blur || {};
  const cell = ui.cell || {};
  const root = document.documentElement;

  root.style.setProperty("--gd-app-bg-opacity", String(opacity.appBackground ?? 0.25));
  root.style.setProperty("--gd-sidebar-opacity", String(opacity.sidebar ?? 0.85));
  root.style.setProperty("--gd-panel-opacity", String(opacity.panel ?? 0.85));
  root.style.setProperty("--gd-cell-opacity", String(opacity.cell ?? 0.65));
  root.style.setProperty("--gd-icon-card-opacity", String(opacity.iconCard ?? 0.85));
  root.style.setProperty("--gd-blur-amount", `${blur.amount ?? 12}px`);
  root.style.setProperty("--gd-backdrop-blur", blur.enabled ? `blur(${blur.amount ?? 12}px)` : "none");
  root.style.setProperty(
    "--gd-background-blur",
    blur.backgroundEnabled ? `blur(${blur.backgroundAmount ?? blur.amount ?? 10}px)` : "none"
  );
  root.style.setProperty("--gd-cell-width", `${cell.width ?? 92}px`);
  root.style.setProperty("--gd-cell-height", `${cell.height ?? 92}px`);
  root.style.setProperty("--gd-cell-gap", `${cell.gap ?? 12}px`);
  root.style.setProperty("--gd-icon-size", `${cell.iconSize ?? 32}px`);
  root.style.setProperty("--gd-label-font-size", `${cell.labelFontSize ?? 12}px`);
  root.style.setProperty("--gd-label-font-family", getLabelFontFamilyValue(cell.labelFontFamily ?? "system"));
  root.style.setProperty("--gd-cell-radius", `${cell.borderRadius ?? 12}px`);
  root.style.setProperty("--gd-cell-border-opacity", String(cell.borderOpacity ?? 0.28));
}

function emptyForm(genreId = "") {
  return { genreId, name: "", path: "", itemType: "default", iconName: "file" };
}

function basename(targetPath) {
  if (!targetPath) return "";
  if (/^https?:\/\//i.test(targetPath)) {
    try {
      return new URL(targetPath).hostname;
    } catch {
      return targetPath;
    }
  }
  return targetPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || targetPath;
}

function getPathBaseName(targetPath = "") {
  const normalized = String(targetPath).replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || normalized;
}

function getExtensionLabel(item) {
  const targetPath = item?.path ?? "";
  const type = item?.item_type ?? item?.type ?? "";

  if (type === "folder") return "Folder";
  if (/^https?:\/\//i.test(targetPath)) return "URL";

  const base = getPathBaseName(targetPath);
  const match = base.match(/(\.[^.]+)$/);
  return match ? match[1] : "";
}

function getDisplayNameWithoutExtension(item) {
  const name = item?.name || getPathBaseName(item?.path ?? "");
  const type = item?.item_type ?? item?.type ?? "";

  if (type === "folder") return name;
  if (/^https?:\/\//i.test(item?.path ?? "")) return name;
  return String(name).replace(/\.[^.]+$/, "");
}

function pickType(targetPath) {
  if (/^https?:\/\//i.test(targetPath)) return "link";
  const ext = targetPath.toLowerCase().match(/\.[^.\\/]+$/)?.[0] || "";
  if (ext === ".pdf") return "pdf";
  if ([".xlsx", ".xls", ".xlsm", ".csv"].includes(ext)) return "excel";
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return "image";
  if ([".exe", ".bat", ".cmd", ".lnk", ".app"].includes(ext)) return "app";
  if (ext === ".md") return "note";
  return ext ? "default" : "folder";
}

function iconNameForType(type, settings) {
  return getIconTypeSetting(type, settings)?.icon || defaultIconTypes.default.icon;
}

function getWorkModeButtonLabel(workMode) {
  if (workMode === WORK_MODES.NORMAL) return "登録モードにする";
  if (workMode === WORK_MODES.REGISTER) return "セル削除モードにする";
  return "通常モードに戻す";
}

function getCurrentWorkModeLabel(workMode) {
  if (workMode === WORK_MODES.NORMAL) return "操作モード";
  if (workMode === WORK_MODES.REGISTER) return "登録モード";
  return "削除モード";
}

function App() {
  const [appState, setAppState] = useState({ recentWorkspaces: [] });
  const [workspace, setWorkspace] = useState(null);
  const [selectedGenreId, setSelectedGenreId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saveSettingsTimer = useRef(null);
  const sidebarRef = useRef(null);
  const genreListRef = useRef(null);
  const fitWindowTimer = useRef(null);
  const hoverPreviewRef = useRef(null);
  const hoverPreviewTimerRef = useRef(null);
  const hoverPreviewCloseTimerRef = useRef(null);
  const hoverPreviewCopiedTimerRef = useRef(null);
  const hoverPreviewRequestRef = useRef(0);
  const isHoveringIconRef = useRef(false);
  const isHoveringPreviewRef = useRef(false);
  const previewCacheRef = useRef(new Map());
  const [workMode, setWorkMode] = useState(WORK_MODES.REGISTER);
  const [dragTargetCell, setDragTargetCell] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [hoverPreview, setHoverPreview] = useState(null);
  const [hoverPreviewSelection, setHoverPreviewSelection] = useState("");
  const [hoverPreviewCopied, setHoverPreviewCopied] = useState(false);
  const [genreDraft, setGenreDraft] = useState({ name: "", cols: 6, rows: 3, accentColor: "#2f7d68", memo: "" });
  const [editGenreId, setEditGenreId] = useState("");
  const [itemForm, setItemForm] = useState(emptyForm());
  const cellSettings = settings?.ui?.cell || defaultSettings.ui.cell;

  useEffect(() => {
    api.getState().then(setAppState).catch(showError);
  }, []);

  useEffect(() => {
    return () => {
      if (saveSettingsTimer.current) clearTimeout(saveSettingsTimer.current);
      if (fitWindowTimer.current) clearTimeout(fitWindowTimer.current);
      if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
      if (hoverPreviewCloseTimerRef.current) clearTimeout(hoverPreviewCloseTimerRef.current);
      if (hoverPreviewCopiedTimerRef.current) clearTimeout(hoverPreviewCopiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const current = normalizeSettings(settings);
    applyThemeVariables(current);
    console.debug("Applied GridDesk theme variables", {
      appBackground: current?.ui?.opacity?.appBackground,
      sidebar: current?.ui?.opacity?.sidebar,
      panel: current?.ui?.opacity?.panel,
      cell: current?.ui?.opacity?.cell,
      iconCard: current?.ui?.opacity?.iconCard,
      blur: current?.ui?.blur,
      cellSettings: current?.ui?.cell
    });
  }, [settings]);

  useEffect(() => {
    if (!hoverPreview) return undefined;

    function handleDocumentMouseDown(event) {
      if (!hoverPreviewRef.current?.contains(event.target)) {
        clearHoverPreviewSelection();
      }
    }

    function handleDocumentKeyDown(event) {
      if (event.key === "Escape") {
        closeHoverPreview();
      }
    }

    function handleSelectionChange() {
      if (!window.getSelection?.()?.toString?.().trim()) {
        clearHoverPreviewSelection();
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [hoverPreview]);

  useEffect(() => {
    const firstGenre = workspace?.genres?.[0]?.id;
    if (firstGenre && !selectedGenreId) setSelectedGenreId(String(firstGenre));
  }, [workspace, selectedGenreId]);

  useEffect(() => {
    const genres = workspace?.genres || [];
    if (genres.length === 0) {
      setEditGenreId("");
      return;
    }
    setEditGenreId((current) => {
      if (current && genres.some((genre) => String(genre.id) === String(current))) return current;
      return String(genres[0].id);
    });
  }, [workspace?.genres]);

  useEffect(() => {
    if (!itemForm.genreId && selectedGenreId) {
      setItemForm((current) => ({ ...current, genreId: selectedGenreId }));
    }
  }, [selectedGenreId, itemForm.genreId]);

  useEffect(() => {
    scheduleFitWindowWidth();
  }, [
    workspace,
    settings.ui.sidebarCollapsed,
    settings.ui.autoFitWindowWidth,
    cellSettings.width,
    cellSettings.height,
    cellSettings.gap,
    cellSettings.iconSize,
    cellSettings.labelFontSize,
    cellSettings.labelFontFamily,
    cellSettings.showTypeBadge,
    cellSettings.showFileName
  ]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !genreListRef.current) return undefined;
    const observer = new ResizeObserver(() => scheduleFitWindowWidth());
    observer.observe(genreListRef.current);
    if (sidebarRef.current) observer.observe(sidebarRef.current);
    return () => observer.disconnect();
  }, [workspace, settings.ui.sidebarCollapsed]);

  const genresById = useMemo(() => {
    const map = new Map();
    for (const genre of workspace?.genres || []) map.set(String(genre.id), genre);
    return map;
  }, [workspace]);

  const itemsByGenre = useMemo(() => {
    const map = new Map();
    for (const item of workspace?.items || []) {
      const key = String(item.genre_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [workspace]);

  const disabledByGenre = useMemo(() => {
    const map = new Map();
    for (const cell of workspace?.disabledCells || []) {
      const key = String(cell.genre_id);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(`${cell.x}:${cell.y}`);
    }
    return map;
  }, [workspace]);

  const registerMode = workMode === WORK_MODES.REGISTER;
  const deleteCellMode = workMode === WORK_MODES.DELETE_CELL;

  function showError(error) {
    setMessage(error?.message || String(error));
  }

  function requestFitWindowWidth() {
    if (settings?.ui?.autoFitWindowWidth === false || !workspace) return;
    const sidebarWidth = sidebarRef.current?.getBoundingClientRect().width ?? 0;
    const genreListEl = genreListRef.current;
    if (!genreListEl) return;
    const rectWidth = genreListEl.getBoundingClientRect().width;
    const scrollWidth = genreListEl.scrollWidth;
    const genreWidth = Math.max(rectWidth, scrollWidth);
    if (!genreWidth) return;
    const outerPadding = 36;
    const collapsedMinWidth = 360;
    const expandedMinWidth = 520;
    const sidebarCollapsed = settings?.ui?.sidebarCollapsed === true;
    const minWidth = sidebarCollapsed ? collapsedMinWidth : expandedMinWidth;
    const maxWidth = Math.min(window.screen?.availWidth || 1800, 1800);
    const nextWidth = Math.round(Math.max(minWidth, Math.min(maxWidth, sidebarWidth + genreWidth + outerPadding)));
    console.debug("GridDesk fit window width", {
      sidebarCollapsed,
      sidebarWidth,
      rectWidth,
      scrollWidth,
      genreWidth,
      outerPadding,
      minWidth,
      nextWidth
    });
    api.setWindowWidth?.(nextWidth)?.catch?.(() => {});
  }

  function scheduleFitWindowWidth() {
    if (settings?.ui?.autoFitWindowWidth === false) return;
    if (fitWindowTimer.current) clearTimeout(fitWindowTimer.current);
    fitWindowTimer.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(requestFitWindowWidth);
      });
    }, 80);
  }

  function adoptWorkspace(data) {
    if (!data) return;
    const mergedSettings = normalizeSettings(data.settings || {});
    setWorkspace(data);
    setSettings(mergedSettings);
    setSelectedGenreId(String(data.genres?.[0]?.id || ""));
    setItemForm(emptyForm(String(data.genres?.[0]?.id || "")));
    api.getState().then(setAppState).catch(() => {});
    setMessage(`Workspace: ${data.workspacePath}`);
  }

  function scheduleSaveSettings(nextSettings) {
    if (!workspace) return;
    if (saveSettingsTimer.current) clearTimeout(saveSettingsTimer.current);
    saveSettingsTimer.current = setTimeout(() => {
      api.saveSettings(workspace.workspacePath, nextSettings).catch(showError);
    }, 250);
  }

  function updateSettings(partialSettings) {
    setSettings((prev) => {
      const next = normalizeSettings(mergeDeep(prev, partialSettings));
      setWorkspace((current) => current ? { ...current, settings: next } : current);
      scheduleSaveSettings(next);
      return next;
    });
  }

  function updateIconType(type, patch) {
    updateSettings({
      iconTypes: {
        [type]: {
          ...getIconTypeSetting(type, settings),
          ...patch
        }
      }
    });
  }

  function resetIconTypes() {
    updateSettings({ iconTypes: defaultIconTypes });
  }

  async function openWorkspace(action, workspacePath) {
    try {
      const data = workspacePath ? await api.openWorkspacePath(workspacePath) : await action();
      adoptWorkspace(data);
    } catch (error) {
      showError(error);
    }
  }

  async function createGenre() {
    if (!workspace || !genreDraft.name.trim()) return;
    try {
      const data = await api.createGenre(workspace.workspacePath, {
        ...genreDraft,
        cols: Number(genreDraft.cols) || 6,
        rows: Number(genreDraft.rows) || 3
      });
      adoptWorkspace(data);
      setGenreDraft((current) => ({ ...current, name: "", memo: "" }));
      setMessage("カテゴリを追加しました。");
    } catch (error) {
      showError(error);
    }
  }

  async function updateGenre(patch) {
    if (!workspace) return;
    const genre = genresById.get(String(patch.id || editGenreId));
    if (!genre) return;
    try {
      const data = await api.updateGenre(workspace.workspacePath, {
        id: genre.id,
        name: patch.name ?? genre.name,
        cols: Number(patch.cols ?? genre.cols),
        rows: Number(patch.rows ?? genre.rows),
        collapsed: patch.collapsed ?? genre.collapsed,
        accentColor: patch.accentColor ?? genre.accent_color ?? "#2f7d68",
        memo: patch.memo ?? genre.memo ?? ""
      });
      adoptWorkspace(data);
    } catch (error) {
      showError(error);
    }
  }

  async function deleteGenre() {
    if (!workspace || !editGenreId) return;
    const genre = genresById.get(editGenreId);
    if (!genre || !confirm(`「${genre.name}」を削除しますか？`)) return;
    try {
      const data = await api.deleteGenre(workspace.workspacePath, genre.id);
      adoptWorkspace(data);
      setMessage("カテゴリを削除しました。");
    } catch (error) {
      showError(error);
    }
  }

  function fillPath(targetPath) {
    const itemType = pickType(targetPath);
    setItemForm((current) => ({
      ...current,
      path: targetPath,
      name: current.name || basename(targetPath),
      itemType,
      iconName: current.iconName || iconNameForType(itemType, settings)
    }));
  }

  async function selectTarget() {
    try {
      const paths = await api.selectTarget();
      if (paths[0]) fillPath(paths[0]);
    } catch (error) {
      showError(error);
    }
  }

  async function readClipboard() {
    try {
      const text = (await api.readClipboardText()).trim();
      if (text) fillPath(text);
    } catch (error) {
      showError(error);
    }
  }

  async function saveItemAt(genreId, x, y, overridePath) {
    const pathValue = overridePath || itemForm.path.trim();
    if (!workspace || !pathValue) return;
    const disabled = disabledByGenre.get(String(genreId))?.has(`${x}:${y}`);
    const items = itemsByGenre.get(String(genreId)) || [];
    if (items.some((item) => item.x === x && item.y === y)) {
      setMessage("移動先セルには既にアイコンがあります。");
      return;
    }
    try {
      if (disabled) {
        await api.restoreCell(workspace.workspacePath, { genreId, x, y });
      }
      const data = await api.saveItem(workspace.workspacePath, {
        genreId,
        name: itemForm.name || basename(pathValue),
        path: pathValue,
        itemType: itemForm.itemType || pickType(pathValue),
        iconName: itemForm.iconName,
        x,
        y
      });
      adoptWorkspace(data);
      setMessage("アイコンを登録しました。");
    } catch (error) {
      showError(error);
    }
  }

  async function moveItem(item, genreId, x, y) {
    if (!workspace || !item) return;
    const disabled = disabledByGenre.get(String(genreId))?.has(`${x}:${y}`);
    const occupied = (itemsByGenre.get(String(genreId)) || []).find((candidate) => candidate.x === x && candidate.y === y);
    if (occupied && occupied.id !== item.id) {
      setMessage("移動先セルには既にアイコンがあります。");
      return;
    }
    try {
      if (disabled) {
        await api.restoreCell(workspace.workspacePath, { genreId, x, y });
      }
      const data = await api.moveItem(workspace.workspacePath, { id: item.id, genreId, x, y });
      adoptWorkspace(data);
    } catch (error) {
      showError(error);
    }
  }

  async function deleteItem(item) {
    if (!workspace || !confirm(`「${item.name}」を削除しますか？`)) return;
    try {
      const data = await api.deleteItem(workspace.workspacePath, item.id);
      adoptWorkspace(data);
      setSelectedItemId(null);
      setMessage("アイコンを削除しました。");
    } catch (error) {
      showError(error);
    }
  }

  async function updateItem(item, patch) {
    if (!workspace || !item) return;
    try {
      const data = await api.updateItem(workspace.workspacePath, { id: item.id, ...patch });
      adoptWorkspace(data);
      setMessage("アイコンを更新しました。");
    } catch (error) {
      showError(error);
    }
  }

  function cycleWorkMode() {
    setWorkMode((current) => {
      if (current === WORK_MODES.NORMAL) return WORK_MODES.REGISTER;
      if (current === WORK_MODES.REGISTER) return WORK_MODES.DELETE_CELL;
      return WORK_MODES.NORMAL;
    });
  }

  async function toggleCell(genreId, x, y, disabled) {
    if (!workspace) return;
    try {
      const data = disabled
        ? await api.restoreCell(workspace.workspacePath, { genreId, x, y })
        : await api.disableCell(workspace.workspacePath, { genreId, x, y });
      adoptWorkspace(data);
      setMessage(disabled ? "セルを復活しました。" : "セルを削除しました。");
    } catch (error) {
      showError(error);
    }
  }

  async function openTarget(target) {
    const targetPath = typeof target === "string" ? target : target?.path;
    if (!targetPath) {
      setMessage("パスが登録されていません。");
      return;
    }

    console.debug("GridDesk open path requested", { item: typeof target === "string" ? null : target, path: targetPath });

    try {
      const result = workspace && typeof target !== "string" && api.openTarget
        ? await api.openTarget(workspace.workspacePath, target)
        : api.openPath
          ? await api.openPath(targetPath)
          : { ok: false, error: "openPath API が見つかりません" };

      if (result?.ok === false) {
        setMessage(`起動できません: ${result.error || result.message || "開けませんでした"}`);
      }
    } catch (error) {
      showError(error);
    }
  }

  async function revealTarget(target) {
    const targetPath = typeof target === "string" ? target : target?.path;
    if (!targetPath) {
      setMessage("パスが登録されていません。");
      return;
    }

    try {
      const result = workspace && typeof target !== "string" && api.revealTarget
        ? await api.revealTarget(workspace.workspacePath, target)
        : api.revealPath
          ? await api.revealPath(targetPath)
          : { ok: false, error: "revealPath API が見つかりません" };

      if (result?.ok === false) {
        setMessage(`場所を開けません: ${result.error || result.message || "場所を開けませんでした"}`);
      }
    } catch (error) {
      showError(error);
    }
  }

  async function manualBackup() {
    if (!workspace) return;
    try {
      await api.backupWorkspace(workspace.workspacePath);
      setMessage("バックアップを作成しました。");
    } catch (error) {
      showError(error);
    }
  }

  function sidebarSectionOpen(key) {
    return settings.ui.sidebarSections?.[key] !== false;
  }

  function updateSidebarSection(key, open) {
    updateSettings({ ui: { sidebarSections: { [key]: open } } });
  }

  function categoryManageSectionOpen(key) {
    return settings.ui.categoryManageSections?.[key] !== false;
  }

  function updateCategoryManageSection(key, open) {
    updateSettings({ ui: { categoryManageSections: { [key]: open } } });
  }

  function clearHoverPreviewSelection() {
    setHoverPreviewSelection("");
    setHoverPreviewCopied(false);
    if (hoverPreviewCopiedTimerRef.current) {
      clearTimeout(hoverPreviewCopiedTimerRef.current);
      hoverPreviewCopiedTimerRef.current = null;
    }
  }

  function closeHoverPreview() {
    setHoverPreview(null);
    clearHoverPreviewSelection();
  }

  function scheduleCloseHoverPreview() {
    if (hoverPreviewCloseTimerRef.current) {
      clearTimeout(hoverPreviewCloseTimerRef.current);
    }

    hoverPreviewCloseTimerRef.current = window.setTimeout(() => {
      if (!isHoveringIconRef.current && !isHoveringPreviewRef.current) {
        closeHoverPreview();
      }
    }, 180);
  }

  function handleIconHoverStart(event, item) {
    isHoveringIconRef.current = true;
    if (hoverPreviewCloseTimerRef.current) {
      clearTimeout(hoverPreviewCloseTimerRef.current);
      hoverPreviewCloseTimerRef.current = null;
    }
    closeHoverPreview();
    if (!item?.path) return;
    const anchorRect = event.currentTarget.getBoundingClientRect();
    const requestId = hoverPreviewRequestRef.current + 1;
    hoverPreviewRequestRef.current = requestId;
    const previewPosition = {
      x: Math.max(14, Math.min(anchorRect.right + 10, window.innerWidth - 434)),
      y: Math.max(14, Math.min(anchorRect.top, window.innerHeight - 534))
    };
    if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
    hoverPreviewTimerRef.current = window.setTimeout(async () => {
      const targetPath = item.path;
      const cached = previewCacheRef.current.get(targetPath);
      if (cached) {
        if (cached.ok && hoverPreviewRequestRef.current === requestId && (isHoveringIconRef.current || isHoveringPreviewRef.current)) {
          clearHoverPreviewSelection();
          setHoverPreview({ ...previewPosition, item, ...cached });
        }
        return;
      }

      try {
        const result = await api.previewTextFile?.(targetPath);
        previewCacheRef.current.set(targetPath, result);
        if (result?.ok && hoverPreviewRequestRef.current === requestId && (isHoveringIconRef.current || isHoveringPreviewRef.current)) {
          clearHoverPreviewSelection();
          setHoverPreview({ ...previewPosition, item, ...result });
        }
      } catch (error) {
        console.debug("Text preview failed", error);
      }
    }, 400);
  }

  function handleIconHoverEnd() {
    isHoveringIconRef.current = false;
    if (hoverPreviewTimerRef.current) {
      clearTimeout(hoverPreviewTimerRef.current);
      hoverPreviewTimerRef.current = null;
    }
    scheduleCloseHoverPreview();
  }

  function handlePreviewHoverStart() {
    isHoveringPreviewRef.current = true;
    if (hoverPreviewCloseTimerRef.current) {
      clearTimeout(hoverPreviewCloseTimerRef.current);
      hoverPreviewCloseTimerRef.current = null;
    }
  }

  function handlePreviewHoverEnd() {
    isHoveringPreviewRef.current = false;
    scheduleCloseHoverPreview();
  }

  function isSelectionInsideHoverPreview() {
    const selection = window.getSelection?.();
    const root = hoverPreviewRef.current;
    if (!selection || !root || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    return root.contains(range.startContainer) || root.contains(range.endContainer);
  }

  function updateHoverPreviewSelection() {
    if (!isSelectionInsideHoverPreview()) {
      clearHoverPreviewSelection();
      return;
    }

    const selectedText = window.getSelection?.()?.toString?.() ?? "";
    if (!selectedText.trim()) {
      clearHoverPreviewSelection();
      return;
    }

    setHoverPreviewSelection(selectedText);
    setHoverPreviewCopied(false);
  }

  async function copyHoverPreviewSelection(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!hoverPreviewSelection) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hoverPreviewSelection);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = hoverPreviewSelection;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setHoverPreviewCopied(true);
      if (hoverPreviewCopiedTimerRef.current) clearTimeout(hoverPreviewCopiedTimerRef.current);
      hoverPreviewCopiedTimerRef.current = window.setTimeout(() => {
        setHoverPreviewCopied(false);
        hoverPreviewCopiedTimerRef.current = null;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy hover preview selection", error);
      alert("コピーに失敗しました");
    }
  }

  const selectedEditGenre = genresById.get(String(editGenreId));

  return (
    <div className="appShell">
      <div className="appBackgroundOverlay" />
      <div className="appContent">
      <header className="appHeader">
        <div className="appHeaderLeft">
          <button
            type="button"
            className="sidebarToggleInHeader"
            title={settings.ui.sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            aria-label={settings.ui.sidebarCollapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
            onClick={() => updateSettings({ ui: { sidebarCollapsed: !settings.ui.sidebarCollapsed } })}
          >
            {settings.ui.sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <span className="appHeaderTitle">GridDesk</span>
          <span className="appHeaderPath">{workspace ? workspace.workspacePath : "No workspace open"}</span>
        </div>
      </header>

      {!workspace ? (
        <main className="welcome">
          <section className="welcomePanel">
            <h1>GridDesk</h1>
            <p>ワークスペースフォルダを選択して、カテゴリ別のセルグリッドにファイル、フォルダ、URLを配置します。</p>
            <div className="welcomeActions">
              <button onClick={() => openWorkspace(api.createWorkspace)}><Plus size={18} />新規ワークスペース</button>
              <button onClick={() => openWorkspace(api.openWorkspace)}><FolderOpen size={18} />既存ワークスペース</button>
            </div>
            {appState.recentWorkspaces?.length > 0 && (
              <div className="recentList">
                <h2>最近開いたワークスペース</h2>
                {appState.recentWorkspaces.map((recent) => (
                  <button key={recent} onClick={() => openWorkspace(null, recent)}>{recent}</button>
                ))}
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className={`workspace ${settings.ui.sidebarCollapsed ? "sidebarCollapsed" : ""}`}>
          <aside className="sidePanel sidebar" ref={sidebarRef}>
            <div className="sidebarHeader">
              {!settings.ui.sidebarCollapsed && (
                <div className="sidebarTitle">
                  <LineIcon name="grid" size={18} />
                  <span className="sidebarHeaderTitle">GridDesk</span>
                </div>
              )}
            </div>

            {!settings.ui.sidebarCollapsed && (
              <div className="sidebarScroll">
                <details
                  className="sidebarSection"
                  open={sidebarSectionOpen("genreManager")}
                  onToggle={(event) => updateSidebarSection("genreManager", event.currentTarget.open)}
                >
                  <summary className="sidebarSectionHeader">
                    <div className="sidebarSectionTitle">
                      <LineIcon name="folderOpen" size={16} />
                      <span>カテゴリ管理</span>
                    </div>
                    <span className="sidebarSectionChevron">‹</span>
                  </summary>
                  <div className="sidebarSectionBody">
                    <div className="categoryManageSubsections">
                      <details
                        className="sidebarSubsection"
                        open={categoryManageSectionOpen("add")}
                        onToggle={(event) => updateCategoryManageSection("add", event.currentTarget.open)}
                      >
                        <summary className="sidebarSubsectionHeader">
                          <span>カテゴリ追加</span>
                          <span className="sidebarSectionChevron">›</span>
                        </summary>
                        <div className="sidebarSubsectionBody">
                          <label>
                            追加カテゴリ名
                            <input value={genreDraft.name} onChange={(event) => setGenreDraft({ ...genreDraft, name: event.target.value })} />
                          </label>
                          <button className="primary" onClick={createGenre}><Plus size={17} />カテゴリ追加</button>
                        </div>
                      </details>

                      <details
                        className="sidebarSubsection"
                        open={categoryManageSectionOpen("edit")}
                        onToggle={(event) => updateCategoryManageSection("edit", event.currentTarget.open)}
                      >
                        <summary className="sidebarSubsectionHeader">
                          <span>カテゴリ変更</span>
                          <span className="sidebarSectionChevron">›</span>
                        </summary>
                        <div className="sidebarSubsectionBody">
                          <label>
                            変更対象カテゴリ
                            <select value={editGenreId} onChange={(event) => setEditGenreId(event.target.value)}>
                              {workspace.genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
                            </select>
                          </label>
                          {selectedEditGenre && (
                            <>
                              <label>
                                カテゴリ名
                                <input value={selectedEditGenre.name} onChange={(event) => updateGenre({ id: selectedEditGenre.id, name: event.target.value })} />
                              </label>
                              <div className="fieldGrid">
                                <label>
                                  列数
                                  <input type="number" min="1" max="20" value={selectedEditGenre.cols} onChange={(event) => updateGenre({ id: selectedEditGenre.id, cols: event.target.value })} />
                                </label>
                                <label>
                                  行数
                                  <input type="number" min="1" max="20" value={selectedEditGenre.rows} onChange={(event) => updateGenre({ id: selectedEditGenre.id, rows: event.target.value })} />
                                </label>
                              </div>
                              <label>
                                タブ色
                                <input
                                  type="color"
                                  value={selectedEditGenre.accent_color || "#2f7d68"}
                                  onChange={(event) => updateGenre({ id: selectedEditGenre.id, accentColor: event.target.value })}
                                />
                              </label>
                              <div className="categoryDeleteArea">
                                <button className="danger categoryDeleteButton" onClick={deleteGenre}><Trash2 size={17} />カテゴリ削除</button>
                              </div>
                            </>
                          )}
                        </div>
                      </details>
                    </div>
                  </div>
                </details>

                <details
                  className="sidebarSection"
                  open={sidebarSectionOpen("cellRegister")}
                  onToggle={(event) => updateSidebarSection("cellRegister", event.currentTarget.open)}
                >
                  <summary className="sidebarSectionHeader">
                    <div className="sidebarSectionTitle">
                      <LineIcon name="grid" size={16} />
                      <span>セル登録</span>
                    </div>
                    <span className="sidebarSectionChevron">‹</span>
                  </summary>
                  <div className="sidebarSectionBody">
                    <div className="registerTopActions">
                      <button type="button" onClick={readClipboard}><Clipboard size={17} />Clipboard</button>
                      <button type="button" onClick={selectTarget}><FolderOpen size={17} />Select</button>
                    </div>
                    <label>
                      表示名
                      <input value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} />
                    </label>
                    <label>
                      パス / URL
                      <textarea rows="3" value={itemForm.path} onChange={(event) => setItemForm({ ...itemForm, path: event.target.value })} />
                    </label>
                    <label>
                      種類
                      <select value={itemForm.itemType} onChange={(event) => setItemForm({ ...itemForm, itemType: event.target.value })}>
                        {itemTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <label>
                      アイコン
                      <div className="iconSelectRow">
                        <select value={itemForm.iconName} onChange={(event) => setItemForm({ ...itemForm, iconName: event.target.value })}>
                          {LINE_ICON_OPTIONS.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
                        </select>
                        <span className="iconInlinePreview">
                          <LineIcon name={itemForm.iconName} size={20} />
                        </span>
                      </div>
                    </label>
                    <div className="workModePanel">
                      <button type="button" className={`workModeButton mode-${workMode}`} onClick={cycleWorkMode}>
                        <span className="workModeButtonMain">{getWorkModeButtonLabel(workMode)}</span>
                        <span className="workModeButtonSub">{getCurrentWorkModeLabel(workMode)}</span>
                      </button>
                    </div>
                  </div>
                </details>

                <details
                  className="sidebarSection"
                  open={sidebarSectionOpen("settings")}
                  onToggle={(event) => updateSidebarSection("settings", event.currentTarget.open)}
                >
                  <summary className="sidebarSectionHeader">
                    <div className="sidebarSectionTitle">
                      <Settings size={16} />
                      <span>設定</span>
                    </div>
                    <span className="sidebarSectionChevron">‹</span>
                  </summary>
                  <div className="sidebarSectionBody">
                    <button onClick={() => setSettingsOpen(true)}><Settings size={17} />設定を開く</button>
                    <div className="workspaceActionButtons">
                      <button type="button" onClick={() => openWorkspace(api.createWorkspace)}><Plus size={17} />New</button>
                      <button type="button" onClick={() => openWorkspace(api.openWorkspace)}><FolderOpen size={17} />Open</button>
                      <button type="button" onClick={manualBackup} disabled={!workspace}><Archive size={17} />Backup</button>
                      <button type="button" onClick={() => api.revealWorkspace(workspace.workspacePath)} disabled={!workspace}><ExternalLink size={17} />Reveal</button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </aside>

          <section className="gridArea mainContent">
            <div className="gridScroll">
              <div className="genreList" ref={genreListRef}>
                {workspace.genres.map((genre) => (
                  <GenreGrid
                    key={genre.id}
                    genre={genre}
                    items={itemsByGenre.get(String(genre.id)) || []}
                    disabledSet={disabledByGenre.get(String(genre.id)) || new Set()}
                    selectedItemId={selectedItemId}
                    registerMode={registerMode}
                    deleteCellMode={deleteCellMode}
                    dragTargetCell={dragTargetCell}
                    settings={settings}
                    onSelectGenre={() => {
                      setSelectedGenreId(String(genre.id));
                      setItemForm((current) => ({ ...current, genreId: String(genre.id) }));
                    }}
                    onToggleCollapsed={() => updateGenre({ id: genre.id, collapsed: genre.collapsed ? 0 : 1 })}
                    onCellClick={(x, y, disabled) => {
                      if (deleteCellMode) return toggleCell(genre.id, x, y, disabled);
                      if (registerMode) return saveItemAt(genre.id, x, y);
                    }}
                    onDropPath={(x, y, targetPath) => saveItemAt(genre.id, x, y, targetPath)}
                    onMoveItem={(item, x, y) => moveItem(item, genre.id, x, y)}
                    onDragTargetChange={setDragTargetCell}
                    onSelectItem={setSelectedItemId}
                    onOpenItem={openTarget}
                    onEditItem={setEditingItem}
                    onRenameItem={(item) => {
                      const nextName = prompt("表示名を入力してください", item.name);
                      if (nextName?.trim()) updateItem(item, { name: nextName.trim() });
                    }}
                    onDeleteItem={deleteItem}
                    onRevealItem={revealTarget}
                    onHoverItemStart={handleIconHoverStart}
                    onHoverItemEnd={handleIconHoverEnd}
                  />
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {workspace && settingsOpen && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onUpdateIconType={updateIconType}
          onResetIconTypes={resetIconTypes}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {workspace && editingItem && (
        <ItemEditDialog
          item={editingItem}
          settings={settings}
          onClose={() => setEditingItem(null)}
          onSave={async (patch) => {
            await updateItem(editingItem, patch);
            setEditingItem(null);
          }}
        />
      )}

      {message && <div className="toast" onClick={() => setMessage("")}>{message}</div>}
      {hoverPreview && createPortal(
        <div
          ref={hoverPreviewRef}
          className="textHoverPreview"
          style={{ left: hoverPreview.x, top: hoverPreview.y }}
          onMouseEnter={handlePreviewHoverStart}
          onMouseLeave={handlePreviewHoverEnd}
          onMouseUp={updateHoverPreviewSelection}
          onKeyUp={updateHoverPreviewSelection}
          onWheel={(event) => event.stopPropagation()}
        >
          <div className="textHoverPreviewTitle">
            <span className="textHoverPreviewTitleText">{hoverPreview.item?.name || hoverPreview.item?.path}</span>
            {hoverPreviewSelection && (
              <button
                type="button"
                className="textHoverPreviewCopyButton"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={copyHoverPreviewSelection}
              >
                {hoverPreviewCopied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <pre>{hoverPreview.text}</pre>
          {hoverPreview.truncated && <div className="textHoverPreviewFooter">先頭のみ表示しています</div>}
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}

function GenreGrid({
  genre,
  items,
  disabledSet,
  selectedItemId,
  registerMode,
  deleteCellMode,
  dragTargetCell,
  settings,
  onSelectGenre,
  onToggleCollapsed,
  onCellClick,
  onDropPath,
  onMoveItem,
  onDragTargetChange,
  onSelectItem,
  onOpenItem,
  onEditItem,
  onRenameItem,
  onDeleteItem,
  onRevealItem,
  onHoverItemStart,
  onHoverItemEnd
}) {
  const cells = [];
  for (let y = 0; y < genre.rows; y += 1) {
    for (let x = 0; x < genre.cols; x += 1) cells.push({ x, y });
  }
  const itemMap = new Map(items.map((item) => [`${item.x}:${item.y}`, item]));
  const itemCount = items.filter((item) => (item.enabled ?? 1) !== 0).length;

  return (
    <section
      className="genreBlock genreCard"
      style={{
        "--accent": genre.accent_color || "#2f7d68",
        "--category-accent-color": genre.accent_color || "#2f7d68"
      }}
      onMouseDown={onSelectGenre}
    >
      <header className="genreCompactHeader">
        <div className="genreAccentBar" />
        <div className="genreCompactInfo">
          <span className="genreCompactTitle">{genre.name}</span>
          <span className="genreCompactMeta">{genre.cols}×{genre.rows}</span>
          <span className="genreCompactMeta">{itemCount} items</span>
        </div>
        <button
          type="button"
          className="genreCollapseButton"
          onClick={onToggleCollapsed}
          aria-label={genre.collapsed ? "カテゴリを開く" : "カテゴリを閉じる"}
        >
          {genre.collapsed ? "+" : "−"}
        </button>
      </header>
      {!genre.collapsed && (
        <div className="cellGridWrap">
          <div
            className="cellGrid"
            style={{
              gridTemplateColumns: `repeat(${genre.cols}, var(--gd-cell-width, 92px))`,
              gridTemplateRows: `repeat(${genre.rows}, var(--gd-cell-height, 92px))`,
              gap: "var(--gd-cell-gap, 12px)"
            }}
          >
            {cells.map(({ x, y }) => {
              const key = `${x}:${y}`;
              const item = itemMap.get(key);
              const disabled = disabledSet.has(key);
              return (
                <Cell
                  key={key}
                  x={x}
                  y={y}
                  item={item}
                  disabled={disabled}
                  selected={item?.id === selectedItemId}
                  registerMode={registerMode}
                  deleteCellMode={deleteCellMode}
                  dragTarget={dragTargetCell?.genreId === genre.id && dragTargetCell?.x === x && dragTargetCell?.y === y}
                  settings={settings}
                  onClick={() => onCellClick(x, y, disabled)}
                  onDropPath={(targetPath) => onDropPath(x, y, targetPath)}
                  onMoveItem={(draggedItem) => onMoveItem(draggedItem, x, y)}
                  onDragTargetChange={(active) => onDragTargetChange(active ? { genreId: genre.id, x, y } : null)}
                  onSelectItem={onSelectItem}
                  onOpenItem={onOpenItem}
                  onEditItem={onEditItem}
                  onRenameItem={onRenameItem}
                  onDeleteItem={onDeleteItem}
                  onRevealItem={onRevealItem}
                  onHoverItemStart={onHoverItemStart}
                  onHoverItemEnd={onHoverItemEnd}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Cell({
  x,
  y,
  item,
  disabled,
  selected,
  registerMode,
  deleteCellMode,
  dragTarget,
  settings,
  onClick,
  onDropPath,
  onMoveItem,
  onDragTargetChange,
  onSelectItem,
  onOpenItem,
  onEditItem,
  onRenameItem,
  onDeleteItem,
  onRevealItem,
  onHoverItemStart,
  onHoverItemEnd
}) {
  const iconType = getIconTypeSetting(item?.item_type, settings);
  const iconName = item?.icon_name || iconType.icon;
  const iconColor = item?.icon_color || iconType.strokeColor;
  const iconBackground = item ? hexToRgba(
    item.icon_background_color || iconType.backgroundColor,
    item.icon_background_opacity ?? iconType.backgroundOpacity ?? 0.9
  ) : undefined;
  const extensionLabel = getExtensionLabel(item);
  const showTypeBadge = settings?.ui?.cell?.showTypeBadge ?? true;
  const showFileName = settings?.ui?.cell?.showFileName ?? true;
  const iconCardClassName = [
    "launcherItem",
    "iconCard",
    deleteCellMode ? "deleteMode" : "",
    showTypeBadge ? "hasTypeBadge" : "noTypeBadge",
    showFileName ? "hasFileName" : "noFileName"
  ].filter(Boolean).join(" ");
  const [menu, setMenu] = useState(null);

  function handleItemContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    console.debug("GridDesk context menu requested", {
      item,
      x: event.clientX,
      y: event.clientY
    });
    setMenu({ x: event.clientX, y: event.clientY });
  }

  function handleIconClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (deleteCellMode) {
      onDeleteItem(item);
      return;
    }

    onSelectItem(item.id);
  }

  function handleIconDoubleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (deleteCellMode || registerMode) return;

    onOpenItem(item);
  }

  function handleDrop(event) {
    event.preventDefault();
    onDragTargetChange(false);
    const itemJson = event.dataTransfer.getData("application/x-griddesk-item");
    if (itemJson) {
      onMoveItem(JSON.parse(itemJson));
      return;
    }
    const file = event.dataTransfer.files?.[0];
    const filePath = file?.path || event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (filePath) onDropPath(filePath.trim());
  }

  return (
    <div
      className={`cell gridCell ${disabled ? "disabled" : ""} ${selected ? "selected" : ""} ${registerMode ? "registerReady" : ""} ${deleteCellMode ? "deleteReady" : ""} ${dragTarget ? "dragTarget" : ""}`}
      onClick={onClick}
      onDragOver={(event) => {
        event.preventDefault();
        onDragTargetChange(true);
      }}
      onDragLeave={() => onDragTargetChange(false)}
      onDrop={handleDrop}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      {item && !disabled && (
        <button
          className={iconCardClassName}
          style={{ "--gd-item-icon-bg": iconBackground }}
          draggable
          onContextMenu={handleItemContextMenu}
          onClick={handleIconClick}
          onDoubleClick={handleIconDoubleClick}
          onMouseEnter={(event) => onHoverItemStart?.(event, item)}
          onMouseLeave={() => onHoverItemEnd?.()}
          onDragStart={(event) => {
            if (event.button === 2) {
              event.preventDefault();
              return;
            }
            event.dataTransfer.setData("application/x-griddesk-item", JSON.stringify(item));
          }}
          onDragEnd={() => onDragTargetChange(false)}
        >
          {showTypeBadge && extensionLabel && <span className="cellTypeBadge">{extensionLabel}</span>}
          <span className="launcherGlyph iconVisualWrap" aria-hidden="true">
            <LineIcon name={iconName} color={iconColor} size={30} />
          </span>
          {showFileName && <span className="itemName">{getDisplayNameWithoutExtension(item)}</span>}
        </button>
      )}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          item={item}
          disabled={disabled}
          onClose={() => setMenu(null)}
          onRegister={() => {
            setMenu(null);
            onClick();
          }}
          onOpen={() => {
            setMenu(null);
            onOpenItem(item);
          }}
          onReveal={() => {
            setMenu(null);
            onRevealItem(item);
          }}
          onEdit={() => {
            setMenu(null);
            onEditItem(item);
          }}
          onRename={() => {
            setMenu(null);
            onRenameItem(item);
          }}
          onDelete={() => {
            setMenu(null);
            onDeleteItem(item);
          }}
        />
      )}
    </div>
  );
}

function ContextMenu({ x, y, item, disabled, onClose, onRegister, onOpen, onReveal, onEdit, onRename, onDelete }) {
  useEffect(() => {
    function handlePointerDown() {
      onClose();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="contextMenu"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {item ? (
        <>
          <button type="button" onClick={onOpen}><ExternalLink size={15} />開く</button>
          <button type="button" onClick={onReveal}><FolderOpen size={15} />場所を開く</button>
          <button type="button" onClick={onEdit}><Pencil size={15} />アイコン変更</button>
          <button type="button" onClick={onRename}><Pencil size={15} />名前変更</button>
          <button type="button" className="danger" onClick={onDelete}><Trash2 size={15} />アイコン削除</button>
        </>
      ) : (
        <button type="button" onClick={onRegister} disabled={disabled}><Pencil size={15} />ここに登録</button>
      )}
    </div>,
    document.body
  );
}

function ItemEditDialog({ item, settings, onClose, onSave }) {
  const iconType = getIconTypeSetting(item?.item_type, settings);
  const [draft, setDraft] = useState({
    name: item?.name || "",
    path: item?.path || "",
    iconName: item?.icon_name || iconType.icon,
    iconColor: item?.icon_color || iconType.strokeColor,
    iconBackgroundColor: item?.icon_background_color || iconType.backgroundColor,
    iconBackgroundOpacity: item?.icon_background_opacity ?? iconType.backgroundOpacity ?? 0.9
  });

  return (
    <div className="settingsOverlay" role="presentation" onMouseDown={onClose}>
      <section className="itemEditModal" role="dialog" aria-modal="true" aria-label="アイコン編集" onMouseDown={(event) => event.stopPropagation()}>
        <header className="settingsHeader">
          <div>
            <h2><Pencil size={19} />アイコン編集</h2>
            <span>表示名、パス、アイコン表示を更新します</span>
          </div>
          <button onClick={onClose}>閉じる</button>
        </header>
        <div className="itemEditBody">
          <label>
            名前
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            パス / URL
            <textarea rows="3" value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} />
          </label>
          <label>
            アイコン名
            <div className="iconSelectRow">
              <select value={draft.iconName} onChange={(event) => setDraft({ ...draft, iconName: event.target.value })}>
                {LINE_ICON_OPTIONS.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
              </select>
              <span className="iconInlinePreview" style={{ background: hexToRgba(draft.iconBackgroundColor, draft.iconBackgroundOpacity) }}>
                <LineIcon name={draft.iconName} color={draft.iconColor} size={22} />
              </span>
            </div>
          </label>
          <div className="fieldGrid">
            <label>
              線色
              <input type="color" value={draft.iconColor} onChange={(event) => setDraft({ ...draft, iconColor: event.target.value })} />
            </label>
            <label>
              背景色
              <input type="color" value={draft.iconBackgroundColor} onChange={(event) => setDraft({ ...draft, iconBackgroundColor: event.target.value })} />
            </label>
          </div>
          <label className="rangeField itemEditRange">
            <span>背景透過</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draft.iconBackgroundOpacity}
              onChange={(event) => setDraft({ ...draft, iconBackgroundOpacity: Number(event.target.value) })}
            />
            <output>{Number(draft.iconBackgroundOpacity).toFixed(2)}</output>
          </label>
          <div className="buttonRow">
            <button
              className="primary"
              onClick={() => onSave({
                name: draft.name.trim() || item.name,
                path: draft.path.trim() || item.path,
                iconName: draft.iconName,
                iconColor: draft.iconColor,
                iconBackgroundColor: draft.iconBackgroundColor,
                iconBackgroundOpacity: Number(draft.iconBackgroundOpacity)
              })}
            >
              保存
            </button>
            <button onClick={onClose}>キャンセル</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({ settings, onUpdate, onUpdateIconType, onResetIconTypes, onClose }) {
  const current = normalizeSettings(settings || {});

  useEffect(() => {
    let cancelled = false;
    api.getOpenAtLogin?.().then((result) => {
      if (cancelled || !result?.ok) return;
      if (result.openAtLogin !== current.system.openAtLogin) {
        onUpdate({ system: { openAtLogin: result.openAtLogin } });
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function updateOpacity(key, value) {
    onUpdate({ ui: { opacity: { [key]: Number(value) } } });
  }

  function updateCell(key, value) {
    onUpdate({ ui: { cell: { [key]: value } } });
  }

  async function updateOpenAtLogin(enabled) {
    onUpdate({ system: { openAtLogin: enabled } });
    const result = await api.setOpenAtLogin?.(enabled);
    if (result?.ok === false) {
      onUpdate({ system: { openAtLogin: current.system.openAtLogin } });
      alert(result.error || "自動起動設定の変更に失敗しました");
      return;
    }
    if (result?.ok) onUpdate({ system: { openAtLogin: result.openAtLogin } });
  }

  function settingsSectionOpen(key) {
    return current.ui.settingsSections?.[key] !== false;
  }

  function updateSettingsSection(key, open) {
    onUpdate({ ui: { settingsSections: { [key]: open } } });
  }

  return (
    <div className="settingsOverlay" role="presentation" onMouseDown={onClose}>
      <section className="settingsModal" role="dialog" aria-modal="true" aria-label="設定" onMouseDown={(event) => event.stopPropagation()}>
        <header className="settingsHeader">
          <div>
            <h2><Settings size={19} />設定</h2>
            <span>ワークスペースごとに保存されます</span>
          </div>
          <button onClick={onClose}>閉じる</button>
        </header>

        <div className="settingsBody">
          <details
            className="settingsSection"
            open={settingsSectionOpen("display")}
            onToggle={(event) => updateSettingsSection("display", event.currentTarget.open)}
          >
            <summary className="settingsSectionHeader">
              <span>表示設定</span>
              <span className="settingsSectionChevron">›</span>
            </summary>
            <div className="settingsSectionBody">
            <p className="settingNote">背景透過度はアプリ全体の背景オーバーレイに適用されます。0にすると完全透明、1にすると不透明に近くなります。背景ブラーはデスクトップ背景に対して適用されます。</p>
            <label className="check settingCheck">
              <input
                type="checkbox"
                checked={current.ui.sidebarCollapsed}
                onChange={(event) => onUpdate({ ui: { sidebarCollapsed: event.target.checked } })}
              />
              サイドバーを折りたたむ
            </label>
            {opacityFields.map(([key, label]) => (
              <label className="rangeField" key={key}>
                <span>{label}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.ui.opacity[key]}
                  onChange={(event) => updateOpacity(key, event.target.value)}
                />
                <output>{Number(current.ui.opacity[key]).toFixed(2)}</output>
              </label>
            ))}
            </div>
          </details>

          <details
            className="settingsSection"
            open={settingsSectionOpen("background")}
            onToggle={(event) => updateSettingsSection("background", event.currentTarget.open)}
          >
            <summary className="settingsSectionHeader">
              <span>背景設定</span>
              <span className="settingsSectionChevron">›</span>
            </summary>
            <div className="settingsSectionBody">
            <label className="check settingCheck">
              <input
                type="checkbox"
                checked={current.ui.blur.enabled}
                onChange={(event) => onUpdate({ ui: { blur: { enabled: event.target.checked } } })}
              />
              ブラーを有効化
            </label>
            <label className="rangeField">
              <span>ブラー量</span>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={current.ui.blur.amount}
                onChange={(event) => onUpdate({ ui: { blur: { amount: Number(event.target.value) } } })}
              />
              <output>{current.ui.blur.amount}px</output>
            </label>
            <label className="check settingCheck">
              <input
                type="checkbox"
                checked={current.ui.blur.backgroundEnabled}
                onChange={(event) => onUpdate({ ui: { blur: { backgroundEnabled: event.target.checked } } })}
              />
              背景ブラーを有効化
            </label>
            <label className="rangeField">
              <span>背景ブラー量</span>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={current.ui.blur.backgroundAmount}
                onChange={(event) => onUpdate({ ui: { blur: { backgroundAmount: Number(event.target.value) } } })}
              />
              <output>{current.ui.blur.backgroundAmount}px</output>
            </label>
            </div>
          </details>

          <details
            className="settingsSection"
            open={settingsSectionOpen("icon")}
            onToggle={(event) => updateSettingsSection("icon", event.currentTarget.open)}
          >
            <summary className="settingsSectionHeader">
              <span>アイコン設定</span>
              <span className="settingsSectionChevron">›</span>
            </summary>
            <div className="settingsSectionBody">
            <div className="iconTypeTable">
              <div className="iconTypeHeader">
                <span>種類</span>
                <span>表示名</span>
                <span>アイコン</span>
                <span>線色</span>
                <span>背景色</span>
                <span>背景透過</span>
                <span>プレビュー</span>
              </div>
              {itemTypes.map(({ value }) => {
                const type = getIconTypeSetting(value, current);
                return (
                  <div className="iconTypeRow" key={value}>
                    <code>{value}</code>
                    <input value={type.label} onChange={(event) => onUpdateIconType(value, { label: event.target.value })} />
                    <select value={type.icon} onChange={(event) => onUpdateIconType(value, { icon: event.target.value })}>
                      {LINE_ICON_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <input type="color" value={type.strokeColor} onChange={(event) => onUpdateIconType(value, { strokeColor: event.target.value })} />
                    <input type="color" value={type.backgroundColor} onChange={(event) => onUpdateIconType(value, { backgroundColor: event.target.value })} />
                    <label className="miniRange">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={type.backgroundOpacity}
                        onChange={(event) => onUpdateIconType(value, { backgroundOpacity: Number(event.target.value) })}
                      />
                      <output>{Number(type.backgroundOpacity).toFixed(2)}</output>
                    </label>
                    <span
                      className="iconPreview"
                      style={{ background: hexToRgba(type.backgroundColor, type.backgroundOpacity ?? 0.9) }}
                    >
                      <LineIcon name={type.icon} color={type.strokeColor} size={28} />
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={onResetIconTypes}>アイコン設定を初期値に戻す</button>
            </div>
          </details>

          <details
            className="settingsSection"
            open={settingsSectionOpen("cell")}
            onToggle={(event) => updateSettingsSection("cell", event.currentTarget.open)}
          >
            <summary className="settingsSectionHeader">
              <span>セル設定</span>
              <span className="settingsSectionChevron">›</span>
            </summary>
            <div className="settingsSectionBody">
            {cellRangeFields.map(([key, label, min, max, step, format]) => (
              <label className="rangeField" key={key}>
                <span>{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={current.ui.cell[key]}
                  onChange={(event) => updateCell(key, Number(event.target.value))}
                />
                <output>{format === "fixed2" ? Number(current.ui.cell[key]).toFixed(2) : current.ui.cell[key]}</output>
              </label>
            ))}
            <label>
              ラベルフォント
              <select
                value={current.ui.cell.labelFontFamily ?? "system"}
                onChange={(event) => updateCell("labelFontFamily", event.target.value)}
              >
                {labelFontOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="check settingCheck">
              <input
                type="checkbox"
                checked={current.ui.cell.showTypeBadge}
                onChange={(event) => updateCell("showTypeBadge", event.target.checked)}
              />
              種別バッジ表示
            </label>
            <label className="check settingCheck">
              <input
                type="checkbox"
                checked={current.ui.cell.showFileName}
                onChange={(event) => updateCell("showFileName", event.target.checked)}
              />
              ファイル名表示
            </label>
            </div>
          </details>

          <details
            className="settingsSection"
            open={settingsSectionOpen("system")}
            onToggle={(event) => updateSettingsSection("system", event.currentTarget.open)}
          >
            <summary className="settingsSectionHeader">
              <span>システム設定</span>
              <span className="settingsSectionChevron">›</span>
            </summary>
            <div className="settingsSectionBody">
              <label className="check settingCheck">
                <input
                  type="checkbox"
                  checked={current.system.openAtLogin}
                  onChange={(event) => updateOpenAtLogin(event.target.checked)}
                />
                PC起動時に自動起動する
              </label>
            </div>
          </details>

          <details
            className="settingsSection compact"
            open={settingsSectionOpen("other")}
            onToggle={(event) => updateSettingsSection("other", event.currentTarget.open)}
          >
            <summary className="settingsSectionHeader">
              <span>その他</span>
              <span className="settingsSectionChevron">›</span>
            </summary>
            <div className="settingsSectionBody">
            <p>重複時の挙動、削除確認、リンク切れ警告の編集 UI は今後実装予定です。</p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

export default App;
