import {
  Archive,
  ChevronDown,
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
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import LineIcon, { LINE_ICON_GROUPS, LINE_ICON_OPTIONS } from "./components/LineIcon.jsx";
import { hexToRgba } from "./utils/color.js";
import "./styles.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const api = window.gridDesk;
const SORTED_LINE_ICON_OPTIONS = [...LINE_ICON_OPTIONS].sort((left, right) => left.localeCompare(right));
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
      borderRadius: 8,
      borderOpacity: 0.28
    }
  },
  system: {
    openAtLogin: false
  },
  extensionIconTypes: {},
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
    extensionIconTypes: normalizeExtensionIconTypes(merged.extensionIconTypes),
    iconTypes
  };
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
      icon: current.icon || defaultIconTypes.default.icon,
      strokeColor: current.strokeColor || current.color || "#000000",
      backgroundColor: current.backgroundColor || current.iconBackgroundColor || "#000000",
      backgroundOpacity: current.backgroundOpacity ?? current.iconBackgroundOpacity ?? 0
    };
  }
  return extensionIconTypes;
}

function normalizeHexColor(value) {
  const raw = String(value || "").trim();
  if (raw === "") return "";
  const withoutHash = raw.startsWith("#") ? raw.slice(1) : raw;
  if (/^[0-9a-fA-F]{3}$/.test(withoutHash)) {
    return `#${withoutHash
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(withoutHash)) return `#${withoutHash.toUpperCase()}`;
  return null;
}

function getIconTypeSetting(type, settings) {
  const iconTypes = settings?.iconTypes || {};
  return iconTypes[type] || iconTypes.default || defaultIconTypes.default;
}

function getExtensionKeyFromPath(targetPath = "") {
  if (/^https?:\/\//i.test(targetPath)) return "";
  const match = getPathBaseName(targetPath).match(/\.([^.]+)$/);
  return match ? normalizeExtensionKey(match[1]) : "";
}

function getExtensionIconSetting(targetPath, settings) {
  const extension = getExtensionKeyFromPath(targetPath);
  if (!extension) return null;
  return settings?.extensionIconTypes?.[extension] || null;
}

function getItemIconSetting(item, settings) {
  const itemType = item?.item_type ?? item?.type;
  if (itemType === "folder" || item?.isDirectory) return getIconTypeSetting("folder", settings);
  return getExtensionIconSetting(item?.path ?? "", settings) || getIconTypeSetting(itemType, settings);
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
  root.style.setProperty("--gd-cell-radius", `${cell.borderRadius ?? 8}px`);
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

function canPreviewPdf(item) {
  if (!item?.path) return false;
  if (/^https?:\/\//i.test(item.path)) return false;
  return /\.pdf$/i.test(item.path);
}

function isMarkdownItem(item) {
  return /\.md$/i.test(item?.path ?? "");
}

function createFloatingPreviewId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePathKey(path) {
  return String(path ?? "").trim().toLowerCase();
}

function normalizeRegisteredPath(path) {
  return String(path ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

function getFloatingCategoryId(preview) {
  const item = preview?.item;
  return item?.genre_id ?? item?.genreId ?? item?.category_id ?? item?.categoryId;
}

function renderInlineMarkdown(text, keyPrefix) {
  const parts = String(text ?? "").split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^`[^`]+`$/.test(part)) {
      return <code key={`${keyPrefix}-code-${index}`}>{part.slice(1, -1)}</code>;
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={`${keyPrefix}-strong-${index}`}>{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\([^)]+\)$/);
    if (linkMatch) {
      return <span key={`${keyPrefix}-link-${index}`}>{linkMatch[1]}</span>;
    }
    return <React.Fragment key={`${keyPrefix}-text-${index}`}>{part}</React.Fragment>;
  });
}

function MarkdownCodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  async function copyCode(event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Failed to copy code block", error);
      alert("コピーに失敗しました");
    }
  }

  return (
    <div className="mdCodeBlockWrap">
      <div className="mdCodeBlockHeader">
        <span>code</span>
        <button type="button" onClick={copyCode}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mdCodeBlock">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownPreview({ text, onToggleCheckbox }) {
  const lines = String(text ?? "").split(/\r?\n/);
  const elements = [];
  let inCodeBlock = false;
  let codeLines = [];

  function pushCodeBlock(key) {
    elements.push(
      <MarkdownCodeBlock key={key} code={codeLines.join("\n")} />
    );
    codeLines = [];
  }

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        pushCodeBlock(`code-${index}`);
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const horizontalRuleMatch = line.trim().match(/^[-*]{3,}$/);
    if (horizontalRuleMatch) {
      elements.push(<hr key={index} className="mdHorizontalRule" />);
      return;
    }

    const checkboxMatch = line.match(/^(\s*)[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (checkboxMatch) {
      const checked = checkboxMatch[2].toLowerCase() === "x";
      const indent = checkboxMatch[1].replace(/\t/g, "    ").length;
      elements.push(
        <label key={index} className="mdCheckboxLine" style={{ "--md-indent": `${indent * 8}px` }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleCheckbox?.(index)}
          />
          <span>{renderInlineMarkdown(checkboxMatch[3], `checkbox-${index}`)}</span>
        </label>
      );
      return;
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (quoteMatch) {
      elements.push(
        <blockquote key={index} className="mdQuote">
          {renderInlineMarkdown(quoteMatch[1], `quote-${index}`)}
        </blockquote>
      );
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const Tag = `h${headingMatch[1].length + 1}`;
      elements.push(
        <Tag key={index}>
          {renderInlineMarkdown(headingMatch[2], `heading-${index}`)}
        </Tag>
      );
      return;
    }

    const orderedMatch = line.match(/^(\s*)(\d+\.)\s+(.+)$/);
    if (orderedMatch) {
      const indent = orderedMatch[1].replace(/\t/g, "    ").length;
      elements.push(
        <div key={index} className="mdOrderedItem" style={{ "--md-indent": `${indent * 8}px` }}>
          <span className="mdListMarker">{orderedMatch[2]}</span>
          <span>{renderInlineMarkdown(orderedMatch[3], `ordered-${index}`)}</span>
        </div>
      );
      return;
    }

    const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (unorderedMatch) {
      const indent = unorderedMatch[1].replace(/\t/g, "    ").length;
      elements.push(
        <div key={index} className="mdListItem" style={{ "--md-indent": `${indent * 8}px` }}>
          <span className="mdListMarker">•</span>
          <span>{renderInlineMarkdown(unorderedMatch[2], `list-${index}`)}</span>
        </div>
      );
      return;
    }

    if (!line.trim()) {
      elements.push(<div key={index} className="mdBlankLine" />);
      return;
    }

    elements.push(
      <p key={index} className="mdParagraph">
        {renderInlineMarkdown(line, `paragraph-${index}`)}
      </p>
    );
  });

  if (inCodeBlock) {
    pushCodeBlock("code-open");
  }

  return <div className="markdownPreview">{elements}</div>;
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

function iconNameForTarget(targetPath, type, settings) {
  return (getExtensionIconSetting(targetPath, settings) || getIconTypeSetting(type, settings))?.icon || defaultIconTypes.default.icon;
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

function SidebarChevron({ open }) {
  return (
    <span className="sidebarSectionChevron" aria-hidden="true">
      {open ? <ChevronDown size={13} strokeWidth={2.4} /> : <ChevronLeft size={13} strokeWidth={2.4} />}
    </span>
  );
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
  const pinnedPreviewRef = useRef(null);
  const searchInputRef = useRef(null);
  const itemElementRefs = useRef(new Map());
  const hoverPdfCanvasRef = useRef(null);
  const pinnedPdfCanvasLeftRef = useRef(null);
  const pinnedPdfCanvasRightRef = useRef(null);
  const hoverPreviewTimerRef = useRef(null);
  const hoverPreviewCloseTimerRef = useRef(null);
  const hoverPreviewCopiedTimerRef = useRef(null);
  const hoverPdfPreviewTimerRef = useRef(null);
  const hoverPdfPreviewCloseTimerRef = useRef(null);
  const pdfSearchTimerRef = useRef(null);
  const pinnedPreviewCopiedTimerRef = useRef(null);
  const pinnedDragRef = useRef(null);
  const pinnedResizeRef = useRef(null);
  const pinnedPdfDragRef = useRef(null);
  const pinnedPdfResizeRef = useRef(null);
  const hoverPreviewRequestRef = useRef(0);
  const hoverPdfPreviewRequestRef = useRef(0);
  const floatingZIndexRef = useRef(1000);
  const isHoveringIconRef = useRef(false);
  const isHoveringPreviewRef = useRef(false);
  const isHoveringPdfIconRef = useRef(false);
  const isHoveringPdfPreviewRef = useRef(false);
  const previewCacheRef = useRef(new Map());
  const pdfDocumentCacheRef = useRef(new Map());
  const pdfBindingDirectionRef = useRef(new Map());
  const [workMode, setWorkMode] = useState(WORK_MODES.REGISTER);
  const [dragTargetCell, setDragTargetCell] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [hoverPreview, setHoverPreview] = useState(null);
  const [hoverPreviewSelection, setHoverPreviewSelection] = useState("");
  const [hoverPreviewCopied, setHoverPreviewCopied] = useState(false);
  const [pinnedTextPreviews, setPinnedTextPreviews] = useState([]);
  const [pinnedPreviewSelection, setPinnedPreviewSelection] = useState("");
  const [pinnedPreviewSelectionId, setPinnedPreviewSelectionId] = useState("");
  const [pinnedPreviewCopied, setPinnedPreviewCopied] = useState(false);
  const [hoverPdfPreview, setHoverPdfPreview] = useState(null);
  const [pinnedPdfPreview, setPinnedPdfPreview] = useState(null);
  const [, setFloatingZIndexSeed] = useState(1000);
  const [pathCheckResults, setPathCheckResults] = useState({});
  const [pathCheckRunning, setPathCheckRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
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
      if (hoverPdfPreviewTimerRef.current) clearTimeout(hoverPdfPreviewTimerRef.current);
      if (hoverPdfPreviewCloseTimerRef.current) clearTimeout(hoverPdfPreviewCloseTimerRef.current);
      if (pdfSearchTimerRef.current) clearTimeout(pdfSearchTimerRef.current);
      if (pinnedPreviewCopiedTimerRef.current) clearTimeout(pinnedPreviewCopiedTimerRef.current);
      for (const doc of pdfDocumentCacheRef.current.values()) {
        try {
          doc?.destroy?.();
        } catch {}
      }
      pdfDocumentCacheRef.current.clear();
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
    if (!pinnedTextPreviews.length) return undefined;

    function handleDocumentMouseDown(event) {
      if (!event.target?.closest?.(".pinnedTextPreview")) {
        clearPinnedPreviewSelection();
      }
    }

    function handleSelectionChange() {
      if (!window.getSelection?.()?.toString?.().trim()) {
        clearPinnedPreviewSelection();
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [pinnedTextPreviews.length]);

  useEffect(() => {
    function handleResize() {
      setPinnedTextPreviews((prev) => prev.map((preview) => clampPinnedPreviewBounds(preview)));
      setPinnedPdfPreview((prev) => prev ? clampPinnedPdfBounds(prev) : prev);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!hoverPdfPreview || !hoverPdfCanvasRef.current) return;

    renderPdfPageToCanvas({
      item: hoverPdfPreview.item,
      pageNumber: 1,
      canvas: hoverPdfCanvasRef.current,
      containerWidth: hoverPdfPreview.width - 20,
      containerHeight: hoverPdfPreview.height - 72
    });
  }, [hoverPdfPreview]);

  useEffect(() => {
    if (!pinnedPdfPreview) return;

    const headerHeight = 30;
    const searchHeight = pinnedPdfPreview.searchOpen ? 34 : 0;
    const padding = 20;
    const areaWidth = pinnedPdfPreview.width - padding;
    const areaHeight = pinnedPdfPreview.height - headerHeight - searchHeight - padding;

    if (pinnedPdfPreview.spreadMode === "single") {
      clearPdfCanvas(pinnedPdfCanvasRightRef.current);
      if (pinnedPdfCanvasLeftRef.current) {
        renderPdfPageToCanvas({
          item: pinnedPdfPreview.item,
          pageNumber: pinnedPdfPreview.pageNumber,
          canvas: pinnedPdfCanvasLeftRef.current,
          containerWidth: areaWidth,
          containerHeight: areaHeight
        });
      }
      return;
    }

    const pageWidth = (areaWidth - 10) / 2;
    const leftPageNumber = pinnedPdfPreview.bindingDirection === "right"
      ? pinnedPdfPreview.pageNumber + 1
      : pinnedPdfPreview.pageNumber;
    const rightPageNumber = pinnedPdfPreview.bindingDirection === "right"
      ? pinnedPdfPreview.pageNumber
      : pinnedPdfPreview.pageNumber + 1;
    if (pinnedPdfCanvasLeftRef.current) {
      if (leftPageNumber <= pinnedPdfPreview.pageCount) {
        renderPdfPageToCanvas({
          item: pinnedPdfPreview.item,
          pageNumber: leftPageNumber,
          canvas: pinnedPdfCanvasLeftRef.current,
          containerWidth: pageWidth,
          containerHeight: areaHeight
        });
      } else {
        clearPdfCanvas(pinnedPdfCanvasLeftRef.current);
      }
    }

    if (pinnedPdfCanvasRightRef.current && rightPageNumber <= pinnedPdfPreview.pageCount) {
      renderPdfPageToCanvas({
        item: pinnedPdfPreview.item,
        pageNumber: rightPageNumber,
        canvas: pinnedPdfCanvasRightRef.current,
        containerWidth: pageWidth,
        containerHeight: areaHeight
      });
    } else {
      clearPdfCanvas(pinnedPdfCanvasRightRef.current);
    }
  }, [
    pinnedPdfPreview?.item?.path,
    pinnedPdfPreview?.pageNumber,
    pinnedPdfPreview?.spreadMode,
    pinnedPdfPreview?.bindingDirection,
    pinnedPdfPreview?.width,
    pinnedPdfPreview?.height,
    pinnedPdfPreview?.searchOpen
  ]);

  useEffect(() => {
    function handlePdfSearchShortcut(event) {
      if (!pinnedPdfPreview) return;
      const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
      if (!isSearchShortcut) return;

      event.preventDefault();
      event.stopPropagation();
      setPinnedPdfPreview((prev) => prev ? { ...prev, searchOpen: true } : prev);
    }

    window.addEventListener("keydown", handlePdfSearchShortcut, true);
    return () => {
      window.removeEventListener("keydown", handlePdfSearchShortcut, true);
    };
  }, [pinnedPdfPreview]);

  useEffect(() => {
    function handleGlobalSearchShortcut(event) {
      const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f";
      if (!isSearchShortcut || pinnedPdfPreview) return;
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
    window.addEventListener("keydown", handleGlobalSearchShortcut, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalSearchShortcut, true);
    };
  }, [pinnedPdfPreview]);

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

  function getItemCategoryId(item) {
    return item?.genre_id ?? item?.genreId ?? item?.category_id ?? item?.categoryId;
  }

  function getItemCategory(item) {
    const categoryId = getItemCategoryId(item);
    if (categoryId === undefined || categoryId === null) return null;
    return genresById.get(String(categoryId)) || null;
  }

  function getItemCategoryAccentColor(item) {
    const category = getItemCategory(item);
    return category?.accent_color ?? category?.accentColor ?? category?.color ?? "#60a5fa";
  }

  function findExistingItemByPath(targetPath, excludeItemId = null) {
    const targetKey = normalizeRegisteredPath(targetPath);
    if (!targetKey) return null;

    return (workspace?.items || []).find((item) => {
      if ((item.enabled ?? 1) === 0) return false;
      if (excludeItemId && String(item.id) === String(excludeItemId)) return false;
      return normalizeRegisteredPath(item.path) === targetKey;
    }) || null;
  }

  function getItemCategoryName(item) {
    return getItemCategory(item)?.name ?? "不明なカテゴリ";
  }

  function confirmMoveExistingItem(existingItem) {
    const categoryName = getItemCategoryName(existingItem);
    const currentX = existingItem.x ?? existingItem.col ?? existingItem.column ?? "?";
    const currentY = existingItem.y ?? existingItem.row ?? "?";
    const displayName =
      existingItem.name ??
      existingItem.display_name ??
      existingItem.displayName ??
      existingItem.path ??
      "";

    return window.confirm(
      [
        "このファイルは既に登録されています。",
        "",
        `カテゴリ: ${categoryName}`,
        `座標: x=${currentX}, y=${currentY}`,
        `表示名: ${displayName}`,
        `パス: ${existingItem.path}`,
        "",
        "既存の登録を削除し、現在選択したセルへ移動しますか？"
      ].join("\n")
    );
  }

  const itemsByGenre = useMemo(() => {
    const map = new Map();
    for (const item of workspace?.items || []) {
      const key = String(item.genre_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [workspace]);

  const highlightedItemId = searchResults[activeSearchIndex]?.item?.id ?? null;
  const brokenPathCount = Object.values(pathCheckResults).filter((result) => result.exists === false).length;
  const checkedPathCount = Object.keys(pathCheckResults).length;

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

  function normalizeSearchText(value) {
    return String(value ?? "").toLowerCase();
  }

  function getItemSearchText(item) {
    const category = genresById.get(String(item?.genre_id ?? item?.category_id ?? ""));
    return [
      item?.name,
      item?.display_name,
      getPathBaseName(item?.path ?? ""),
      item?.path,
      getExtensionLabel(item),
      item?.item_type,
      item?.type,
      category?.name
    ].map(normalizeSearchText).join(" ");
  }

  function activateSearchResult(result) {
    const categoryId = result?.categoryId;
    if (categoryId) {
      const genre = genresById.get(String(categoryId));
      if (genre?.collapsed) updateGenre({ id: categoryId, collapsed: 0 });
    }
    window.setTimeout(() => scrollToSearchResult(result), 90);
  }

  function scrollToSearchResult(result) {
    const itemId = result?.item?.id;
    if (!itemId) return;
    window.requestAnimationFrame(() => {
      const element = itemElementRefs.current.get(String(itemId));
      element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  }

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setActiveSearchIndex(0);
      return;
    }
    const results = (workspace?.items || [])
      .filter((item) => (item.enabled ?? 1) !== 0)
      .filter((item) => getItemSearchText(item).includes(q))
      .map((item) => ({
        item,
        categoryId: item.genre_id ?? item.category_id,
        x: item.x,
        y: item.y
      }));
    setSearchResults(results);
    setActiveSearchIndex(0);
    if (results[0]) activateSearchResult(results[0]);
  }

  function goNextSearchResult() {
    if (!searchResults.length) return;
    const nextIndex = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIndex);
    activateSearchResult(searchResults[nextIndex]);
  }

  function goPrevSearchResult() {
    if (!searchResults.length) return;
    const nextIndex = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(nextIndex);
    activateSearchResult(searchResults[nextIndex]);
  }

  async function runPathCheck() {
    const checkTargets = (workspace?.items || []).filter((item) => {
      if (!item?.path) return false;
      if (/^https?:\/\//i.test(item.path)) return false;
      return (item.enabled ?? 1) !== 0;
    });
    setPathCheckRunning(true);
    try {
      const result = await api.checkPathExistsBulk?.(checkTargets.map((item) => item.path));
      if (!result?.ok) {
        alert(result?.error || "リンク切れチェックに失敗しました");
        return;
      }
      const checkedAt = Date.now();
      const next = {};
      checkTargets.forEach((item, index) => {
        const check = result.results?.[index];
        next[item.id] = {
          exists: Boolean(check?.exists),
          skipped: Boolean(check?.skipped),
          error: check?.error ?? "",
          checkedAt
        };
      });
      setPathCheckResults(next);
    } finally {
      setPathCheckRunning(false);
    }
  }

  function requestFitWindowSize() {
    if (settings?.ui?.autoFitWindowWidth === false || !workspace) return;
    const sidebarWidth = sidebarRef.current?.getBoundingClientRect().width ?? 0;
    const sidebarHeight = settings?.ui?.sidebarCollapsed === true ? 0 : (sidebarRef.current?.scrollHeight ?? 0);
    const genreListEl = genreListRef.current;
    if (!genreListEl) return;
    const rectWidth = genreListEl.getBoundingClientRect().width;
    const rectHeight = genreListEl.getBoundingClientRect().height;
    const scrollWidth = genreListEl.scrollWidth;
    const scrollHeight = genreListEl.scrollHeight;
    const genreWidth = Math.max(rectWidth, scrollWidth);
    const genreHeight = Math.max(rectHeight, scrollHeight);
    if (!genreWidth) return;
    const outerPaddingX = 24;
    const outerPaddingY = 30;
    const collapsedMinWidth = 260;
    const expandedMinWidth = 360;
    const minHeight = 260;
    const sidebarCollapsed = settings?.ui?.sidebarCollapsed === true;
    const minWidth = sidebarCollapsed ? collapsedMinWidth : expandedMinWidth;
    const maxWidth = Math.min(window.screen?.availWidth || 1800, 1800);
    const maxHeight = Math.min(window.screen?.availHeight || 1200, 1200);
    const nextWidth = Math.round(Math.max(minWidth, Math.min(maxWidth, sidebarWidth + genreWidth + outerPaddingX)));
    const nextHeight = Math.round(Math.max(minHeight, Math.min(maxHeight, Math.max(genreHeight, sidebarHeight) + outerPaddingY)));
    console.debug("GridDesk fit window size", {
      sidebarCollapsed,
      sidebarWidth,
      sidebarHeight,
      rectWidth,
      rectHeight,
      scrollWidth,
      scrollHeight,
      genreWidth,
      genreHeight,
      outerPaddingX,
      outerPaddingY,
      minWidth,
      minHeight,
      nextWidth,
      nextHeight
    });
    if (api.setWindowBounds) {
      api.setWindowBounds({ width: nextWidth, height: nextHeight })?.catch?.(() => {});
      return;
    }
    api.setWindowWidth?.(nextWidth)?.catch?.(() => {});
  }

  function scheduleFitWindowWidth() {
    if (settings?.ui?.autoFitWindowWidth === false) {
      if (fitWindowTimer.current) {
        clearTimeout(fitWindowTimer.current);
        fitWindowTimer.current = null;
      }
      return;
    }
    if (fitWindowTimer.current) clearTimeout(fitWindowTimer.current);
    fitWindowTimer.current = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(requestFitWindowSize);
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
      const merged = mergeDeep(prev, partialSettings);
      if (Object.prototype.hasOwnProperty.call(partialSettings || {}, "extensionIconTypes")) {
        merged.extensionIconTypes = partialSettings.extensionIconTypes || {};
      }
      const next = normalizeSettings(merged);
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

  function updateExtensionIconType(extension, patch) {
    const key = normalizeExtensionKey(extension);
    if (!key) return;
    const current = settings.extensionIconTypes?.[key] || {
      label: key,
      icon: defaultIconTypes.default.icon,
      strokeColor: "#000000",
      backgroundColor: "#000000",
      backgroundOpacity: 0
    };
    updateSettings({
      extensionIconTypes: {
        ...(settings.extensionIconTypes || {}),
        [key]: {
          ...current,
          label: key,
          ...patch
        }
      }
    });
  }

  function addExtensionIconTypes(rawExtensions) {
    const keys = Array.from(new Set(
      String(rawExtensions || "")
        .split(",")
        .map(normalizeExtensionKey)
        .filter(Boolean)
    ));
    if (keys.length === 0) return false;

    const next = { ...(settings.extensionIconTypes || {}) };
    let changed = false;
    for (const key of keys) {
      if (next[key]) continue;
      next[key] = {
        label: key,
        icon: defaultIconTypes.default.icon,
        strokeColor: "#000000",
        backgroundColor: "#000000",
        backgroundOpacity: 0
      };
      changed = true;
    }
    if (changed) updateSettings({ extensionIconTypes: next });
    return true;
  }

  function deleteExtensionIconType(extension) {
    const key = normalizeExtensionKey(extension);
    if (!key) return;
    const next = { ...(settings.extensionIconTypes || {}) };
    delete next[key];
    updateSettings({ extensionIconTypes: next });
  }

  function resetIconTypes() {
    updateSettings({ extensionIconTypes: {} });
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
      iconName: iconNameForTarget(targetPath, itemType, settings)
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
    const existingItem = findExistingItemByPath(pathValue);
    const occupied = items.find((item) => item.x === x && item.y === y);

    if (occupied && occupied.id !== existingItem?.id) {
      setMessage("移動先セルには既にアイコンがあります。");
      return;
    }

    if (existingItem && !confirmMoveExistingItem(existingItem)) {
      setMessage("登録をキャンセルしました。");
      return;
    }

    try {
      const itemType = itemForm.itemType || pickType(pathValue);
      if (existingItem) {
        await api.deleteItem(workspace.workspacePath, existingItem.id);
      }
      if (disabled) {
        await api.restoreCell(workspace.workspacePath, { genreId, x, y });
      }
      const data = await api.saveItem(workspace.workspacePath, {
        genreId,
        name: itemForm.name || basename(pathValue),
        path: pathValue,
        itemType,
        iconName: overridePath ? iconNameForTarget(pathValue, itemType, settings) : (itemForm.iconName || iconNameForTarget(pathValue, itemType, settings)),
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

  function clearPinnedPreviewSelection() {
    setPinnedPreviewSelection("");
    setPinnedPreviewSelectionId("");
    setPinnedPreviewCopied(false);
    if (pinnedPreviewCopiedTimerRef.current) {
      clearTimeout(pinnedPreviewCopiedTimerRef.current);
      pinnedPreviewCopiedTimerRef.current = null;
    }
  }

  function closeHoverPreview() {
    setHoverPreview(null);
    clearHoverPreviewSelection();
  }

  function closePinnedTextPreview(id) {
    setPinnedTextPreviews((prev) => prev.filter((preview) => preview.id !== id));
    clearPinnedPreviewSelection();
  }

  function clampPinnedPreviewBounds(next) {
    const padding = 8;
    const width = Math.max(280, Math.min(next.width ?? 420, window.innerWidth - padding * 2));
    const height = Math.max(180, Math.min(next.height ?? 360, window.innerHeight - padding * 2));
    const x = Math.max(padding, Math.min(next.x ?? padding, window.innerWidth - width - padding));
    const y = Math.max(padding, Math.min(next.y ?? padding, window.innerHeight - height - padding));
    return { ...next, x, y, width, height };
  }

  function clampPinnedPdfBounds(next) {
    const padding = 8;
    const width = Math.max(360, Math.min(next.width ?? 640, window.innerWidth - padding * 2));
    const height = Math.max(260, Math.min(next.height ?? 520, window.innerHeight - padding * 2));
    const x = Math.max(padding, Math.min(next.x ?? padding, window.innerWidth - width - padding));
    const y = Math.max(padding, Math.min(next.y ?? padding, window.innerHeight - height - padding));
    return { ...next, x, y, width, height };
  }

  function takeNextFloatingZIndex() {
    floatingZIndexRef.current += 1;
    return floatingZIndexRef.current;
  }

  function getNextFloatingZIndex() {
    takeNextFloatingZIndex();
    setFloatingZIndexSeed(floatingZIndexRef.current);
    return floatingZIndexRef.current;
  }

  function updatePinnedTextPreview(id, patchOrUpdater) {
    setPinnedTextPreviews((prev) =>
      prev.map((preview) => {
        if (preview.id !== id) return preview;
        if (typeof patchOrUpdater === "function") return patchOrUpdater(preview);
        return { ...preview, ...patchOrUpdater };
      })
    );
  }

  function findPinnedTextPreviewByPath(path) {
    const key = normalizePathKey(path);
    if (!key) return null;
    return pinnedTextPreviews.find((preview) => normalizePathKey(preview.item?.path) === key) || null;
  }

  function isPinnedPdfPreviewPath(path) {
    return Boolean(pinnedPdfPreview && normalizePathKey(pinnedPdfPreview.item?.path) === normalizePathKey(path));
  }

  function bringFloatingToFront(kind, id) {
    const next = getNextFloatingZIndex();
    if (kind === "pinnedText") {
      updatePinnedTextPreview(id, { zIndex: next });
    } else if (kind === "pinnedPdf") {
      setPinnedPdfPreview((prev) => prev ? { ...prev, zIndex: next } : prev);
    } else if (kind === "hoverText") {
      setHoverPreview((prev) => prev ? { ...prev, zIndex: next } : prev);
    } else if (kind === "hoverPdf") {
      setHoverPdfPreview((prev) => prev ? { ...prev, zIndex: next } : prev);
    }
  }

  function bringCategoryFloatingPreviewsToFront(categoryId) {
    const targetCategoryId = String(categoryId);

    setPinnedTextPreviews((prev) =>
      prev.map((preview) => (
        String(getFloatingCategoryId(preview)) === targetCategoryId
          ? { ...preview, zIndex: takeNextFloatingZIndex() }
          : preview
      ))
    );

    setPinnedPdfPreview((prev) => (
      prev && String(getFloatingCategoryId(prev)) === targetCategoryId
        ? { ...prev, zIndex: takeNextFloatingZIndex() }
        : prev
    ));

    setHoverPreview((prev) => (
      prev && String(getFloatingCategoryId(prev)) === targetCategoryId
        ? { ...prev, zIndex: takeNextFloatingZIndex() }
        : prev
    ));

    setHoverPdfPreview((prev) => (
      prev && String(getFloatingCategoryId(prev)) === targetCategoryId
        ? { ...prev, zIndex: takeNextFloatingZIndex() }
        : prev
    ));

    setFloatingZIndexSeed(floatingZIndexRef.current);
  }

  function rememberPdfDocument(targetPath, doc) {
    const cache = pdfDocumentCacheRef.current;
    if (cache.has(targetPath)) cache.delete(targetPath);
    cache.set(targetPath, doc);

    while (cache.size > 3) {
      const firstKey = cache.keys().next().value;
      const firstDoc = cache.get(firstKey);
      try {
        firstDoc?.destroy?.();
      } catch {}
      cache.delete(firstKey);
    }
  }

  async function loadPdfDocument(item) {
    const targetPath = item?.path;
    if (!targetPath) return null;

    const cache = pdfDocumentCacheRef.current;
    if (cache.has(targetPath)) return cache.get(targetPath);

    const result = await api.readPdfPreview?.(targetPath);
    if (!result?.ok) {
      console.debug("PDF preview skipped/failed", result);
      return null;
    }

    let data = result.data;
    if (Array.isArray(data)) {
      data = new Uint8Array(data);
    } else if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    } else if (data?.buffer) {
      data = new Uint8Array(data.buffer);
    }

    const loadingTask = pdfjsLib.getDocument({ data });
    const doc = await loadingTask.promise;
    rememberPdfDocument(targetPath, doc);
    return doc;
  }

  function clearPdfCanvas(canvas) {
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.width = "0px";
    canvas.style.height = "0px";
  }

  async function renderPdfPageToCanvas({ item, pageNumber, canvas, containerWidth, containerHeight }) {
    const doc = await loadPdfDocument(item);
    if (!doc || !canvas || pageNumber < 1 || pageNumber > doc.numPages) return;

    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(containerWidth / baseViewport.width, containerHeight / baseViewport.height);
    const viewport = page.getViewport({ scale: Math.max(0.1, scale) });
    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
  }

  async function searchPdfText(item, query) {
    const doc = await loadPdfDocument(item);
    if (!doc || !query.trim()) return [];
    if (doc.numPages >= 50) console.debug("PDF search may take some time", { pages: doc.numPages });

    const normalizedQuery = query.trim().toLowerCase();
    const results = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((entry) => entry.str ?? "").join(" ").toLowerCase();
      if (text.includes(normalizedQuery)) results.push({ pageNumber });
    }
    return results;
  }

  function pinHoverPreview(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!hoverPreview) return;

    const existing = findPinnedTextPreviewByPath(hoverPreview.item?.path);
    if (existing) {
      bringFloatingToFront("pinnedText", existing.id);
      closeHoverPreview();
      return;
    }

    const id = createFloatingPreviewId();
    setPinnedTextPreviews((prev) => [...prev, clampPinnedPreviewBounds({
      id,
      x: hoverPreview.x,
      y: hoverPreview.y,
      width: 420,
      height: 360,
      zIndex: getNextFloatingZIndex(),
      item: hoverPreview.item,
      text: hoverPreview.text,
      truncated: hoverPreview.truncated,
      isEditing: false,
      draftText: hoverPreview.text,
      ext: hoverPreview.ext
    })]);
    clearPinnedPreviewSelection();
    closeHoverPreview();
  }

  function pinHoverPdfPreview(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!hoverPdfPreview) return;
    const targetPath = hoverPdfPreview.item?.path || "";

    if (isPinnedPdfPreviewPath(targetPath)) {
      bringFloatingToFront("pinnedPdf", pinnedPdfPreview.id);
      setHoverPdfPreview(null);
      return;
    }

    setPinnedPdfPreview(clampPinnedPdfBounds({
      id: createFloatingPreviewId(),
      x: hoverPdfPreview.x,
      y: hoverPdfPreview.y,
      width: 640,
      height: 520,
      zIndex: getNextFloatingZIndex(),
      item: hoverPdfPreview.item,
      pageNumber: 1,
      pageCount: hoverPdfPreview.pageCount,
      spreadMode: "single",
      bindingDirection: pdfBindingDirectionRef.current.get(targetPath) || "left",
      searchOpen: false,
      searchQuery: "",
      searchResults: [],
      searchIndex: 0
    }));
    setHoverPdfPreview(null);
  }

  function scheduleCloseHoverPdfPreview() {
    if (hoverPdfPreviewCloseTimerRef.current) {
      clearTimeout(hoverPdfPreviewCloseTimerRef.current);
    }

    hoverPdfPreviewCloseTimerRef.current = window.setTimeout(() => {
      if (!isHoveringPdfIconRef.current && !isHoveringPdfPreviewRef.current) {
        setHoverPdfPreview(null);
      }
    }, 180);
  }

  function handlePdfHoverStart(event, item) {
    if (isPinnedPdfPreviewPath(item?.path)) {
      bringFloatingToFront("pinnedPdf", pinnedPdfPreview.id);
      setHoverPdfPreview(null);
      return;
    }

    isHoveringPdfIconRef.current = true;
    if (hoverPdfPreviewCloseTimerRef.current) {
      clearTimeout(hoverPdfPreviewCloseTimerRef.current);
      hoverPdfPreviewCloseTimerRef.current = null;
    }
    closeHoverPreview();
    setHoverPdfPreview(null);

    const anchorRect = event.currentTarget.getBoundingClientRect();
    const requestId = hoverPdfPreviewRequestRef.current + 1;
    hoverPdfPreviewRequestRef.current = requestId;
    if (hoverPdfPreviewTimerRef.current) clearTimeout(hoverPdfPreviewTimerRef.current);
    hoverPdfPreviewTimerRef.current = window.setTimeout(async () => {
      try {
        const doc = await loadPdfDocument(item);
        if (!doc || hoverPdfPreviewRequestRef.current !== requestId || !isHoveringPdfIconRef.current) return;

        setHoverPdfPreview({
          x: Math.max(14, Math.min(anchorRect.right + 10, window.innerWidth - 380)),
          y: Math.max(14, Math.min(anchorRect.top, window.innerHeight - 500)),
          zIndex: getNextFloatingZIndex(),
          item,
          pageNumber: 1,
          pageCount: doc.numPages,
          width: 360,
          height: 480
        });
      } catch (error) {
        console.debug("PDF hover preview failed", error);
      }
    }, 400);
  }

  function handlePdfHoverEnd() {
    isHoveringPdfIconRef.current = false;
    if (hoverPdfPreviewTimerRef.current) {
      clearTimeout(hoverPdfPreviewTimerRef.current);
      hoverPdfPreviewTimerRef.current = null;
    }
    scheduleCloseHoverPdfPreview();
  }

  function handlePdfPreviewHoverStart() {
    isHoveringPdfPreviewRef.current = true;
    if (hoverPdfPreviewCloseTimerRef.current) {
      clearTimeout(hoverPdfPreviewCloseTimerRef.current);
      hoverPdfPreviewCloseTimerRef.current = null;
    }
  }

  function handlePdfPreviewHoverEnd() {
    isHoveringPdfPreviewRef.current = false;
    scheduleCloseHoverPdfPreview();
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
    if (canPreviewPdf(item)) {
      handlePdfHoverStart(event, item);
      return;
    }

    const existing = findPinnedTextPreviewByPath(item?.path);
    if (existing) {
      bringFloatingToFront("pinnedText", existing.id);
      closeHoverPreview();
      return;
    }

    handlePdfHoverEnd();
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
          setHoverPreview({ ...previewPosition, zIndex: getNextFloatingZIndex(), item, ...cached });
        }
        return;
      }

      try {
        const result = await api.previewTextFile?.(targetPath);
        previewCacheRef.current.set(targetPath, result);
        if (result?.ok && hoverPreviewRequestRef.current === requestId && (isHoveringIconRef.current || isHoveringPreviewRef.current)) {
          clearHoverPreviewSelection();
          setHoverPreview({ ...previewPosition, zIndex: getNextFloatingZIndex(), item, ...result });
        }
      } catch (error) {
        console.debug("Text preview failed", error);
      }
    }, 400);
  }

  function handleIconHoverEnd() {
    if (hoverPdfPreview || hoverPdfPreviewTimerRef.current) {
      handlePdfHoverEnd();
      return;
    }

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

  function isSelectionInsidePinnedPreview() {
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const startElement = range.startContainer?.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer?.parentElement;
    const endElement = range.endContainer?.nodeType === Node.ELEMENT_NODE
      ? range.endContainer
      : range.endContainer?.parentElement;
    return Boolean(
      startElement?.closest?.(".pinnedTextPreview") ||
      endElement?.closest?.(".pinnedTextPreview")
    );
  }

  function updatePinnedPreviewSelection() {
    if (!isSelectionInsidePinnedPreview()) {
      clearPinnedPreviewSelection();
      return;
    }

    const selectedText = window.getSelection?.()?.toString?.() ?? "";
    if (!selectedText.trim()) {
      clearPinnedPreviewSelection();
      return;
    }

    const selection = window.getSelection?.();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const startElement = range?.startContainer?.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range?.startContainer?.parentElement;
    const root = startElement?.closest?.(".pinnedTextPreview");
    const previewId = root?.dataset?.previewId || "";
    const preview = pinnedTextPreviews.find((entry) => entry.id === previewId);
    if (!preview || preview.isEditing) {
      clearPinnedPreviewSelection();
      return;
    }

    setPinnedPreviewSelection(selectedText);
    setPinnedPreviewSelectionId(previewId);
    setPinnedPreviewCopied(false);
  }

  async function copyPinnedPreviewSelection(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!pinnedPreviewSelection) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pinnedPreviewSelection);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = pinnedPreviewSelection;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setPinnedPreviewCopied(true);
      if (pinnedPreviewCopiedTimerRef.current) clearTimeout(pinnedPreviewCopiedTimerRef.current);
      pinnedPreviewCopiedTimerRef.current = window.setTimeout(() => {
        setPinnedPreviewCopied(false);
        pinnedPreviewCopiedTimerRef.current = null;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy pinned preview selection", error);
      alert("コピーに失敗しました");
    }
  }

  function canEditPinnedPreview(preview) {
    const targetPath = preview?.item?.path;
    return Boolean(targetPath && !/^https?:\/\//i.test(targetPath) && preview?.ext);
  }

  function startPinnedPreviewEdit(id) {
    updatePinnedTextPreview(id, (prev) => {
      if (!prev || !canEditPinnedPreview(prev)) return prev;
      return {
        ...prev,
        isEditing: true,
        draftText: prev.text ?? ""
      };
    });
    clearPinnedPreviewSelection();
  }

  async function savePinnedPreviewEdit(id) {
    const preview = pinnedTextPreviews.find((entry) => entry.id === id);
    if (!preview) return;

    const targetPath = preview.item?.path;
    if (!targetPath) {
      alert("保存先パスがありません");
      return;
    }

    try {
      const nextText = preview.draftText ?? "";
      if (!api.saveTextFile) {
        alert("保存機能が利用できません");
        return;
      }

      const result = await api.saveTextFile({ path: targetPath, text: nextText });
      if (result?.ok === false) {
        alert(result.error || "保存に失敗しました");
        return;
      }

      previewCacheRef.current.set(targetPath, {
        ok: true,
        text: nextText,
        truncated: false,
        size: new Blob([nextText]).size,
        ext: preview.ext || ""
      });

      updatePinnedTextPreview(id, (prev) => prev ? {
        ...prev,
        text: prev.draftText ?? "",
        truncated: false,
        isEditing: false
      } : prev);
      clearPinnedPreviewSelection();
    } catch (error) {
      console.error("Failed to save pinned preview edit", error);
      alert("保存に失敗しました");
    }
  }

  function handlePinnedEditorScroll(event) {
    const lineNumbers = event.currentTarget.previousElementSibling;
    if (lineNumbers) {
      lineNumbers.scrollTop = event.currentTarget.scrollTop;
    }
  }

  function togglePinnedMarkdownCheckbox(previewId, lineIndex) {
    updatePinnedTextPreview(previewId, (preview) => {
      const source = preview.isEditing
        ? preview.draftText ?? ""
        : preview.text ?? "";
      const lines = source.split(/\r?\n/);
      const line = lines[lineIndex] ?? "";

      if (/\[ \]/.test(line)) {
        lines[lineIndex] = line.replace(/\[ \]/, "[x]");
      } else if (/\[x\]/i.test(line)) {
        lines[lineIndex] = line.replace(/\[x\]/i, "[ ]");
      }

      const nextText = lines.join("\n");
      return {
        ...preview,
        text: nextText,
        draftText: nextText
      };
    });
  }

  function handlePinnedPreviewDragStart(event, preview) {
    if (!preview) return;
    event.preventDefault();
    event.stopPropagation();
    bringFloatingToFront("pinnedText", preview.id);
    pinnedDragRef.current = {
      id: preview.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: preview.x,
      originY: preview.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePinnedPreviewDragMove(event) {
    const drag = pinnedDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    updatePinnedTextPreview(drag.id, (prev) => prev ? clampPinnedPreviewBounds({ ...prev, x: nextX, y: nextY }) : prev);
  }

  function handlePinnedPreviewDragEnd(event) {
    if (pinnedDragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pinnedDragRef.current = null;
    }
  }

  function handlePinnedPreviewResizeStart(event, preview) {
    if (!preview) return;
    event.preventDefault();
    event.stopPropagation();
    bringFloatingToFront("pinnedText", preview.id);
    pinnedResizeRef.current = {
      id: preview.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: preview.width,
      originHeight: preview.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePinnedPreviewResizeMove(event) {
    const resize = pinnedResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const nextWidth = resize.originWidth + event.clientX - resize.startX;
    const nextHeight = resize.originHeight + event.clientY - resize.startY;
    updatePinnedTextPreview(resize.id, (prev) => prev ? {
      ...clampPinnedPreviewBounds({ ...prev, width: nextWidth, height: nextHeight })
    } : prev);
  }

  function handlePinnedPreviewResizeEnd(event) {
    if (pinnedResizeRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pinnedResizeRef.current = null;
    }
  }

  function handlePinnedPdfDragStart(event) {
    if (!pinnedPdfPreview) return;
    event.preventDefault();
    event.stopPropagation();
    bringFloatingToFront("pinnedPdf", pinnedPdfPreview.id);
    pinnedPdfDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pinnedPdfPreview.x,
      originY: pinnedPdfPreview.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePinnedPdfDragMove(event) {
    const drag = pinnedPdfDragRef.current;
    if (!drag || !pinnedPdfPreview || drag.pointerId !== event.pointerId) return;
    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    setPinnedPdfPreview((prev) => prev ? clampPinnedPdfBounds({ ...prev, x: nextX, y: nextY }) : prev);
  }

  function handlePinnedPdfDragEnd(event) {
    if (pinnedPdfDragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pinnedPdfDragRef.current = null;
    }
  }

  function handlePinnedPdfResizeStart(event) {
    if (!pinnedPdfPreview) return;
    event.preventDefault();
    event.stopPropagation();
    bringFloatingToFront("pinnedPdf", pinnedPdfPreview.id);
    pinnedPdfResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: pinnedPdfPreview.width,
      originHeight: pinnedPdfPreview.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePinnedPdfResizeMove(event) {
    const resize = pinnedPdfResizeRef.current;
    if (!resize || !pinnedPdfPreview || resize.pointerId !== event.pointerId) return;
    const nextWidth = resize.originWidth + event.clientX - resize.startX;
    const nextHeight = resize.originHeight + event.clientY - resize.startY;
    setPinnedPdfPreview((prev) => prev ? clampPinnedPdfBounds({ ...prev, width: nextWidth, height: nextHeight }) : prev);
  }

  function handlePinnedPdfResizeEnd(event) {
    if (pinnedPdfResizeRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pinnedPdfResizeRef.current = null;
    }
  }

  function togglePdfSpreadMode() {
    setPinnedPdfPreview((prev) => prev ? {
      ...prev,
      spreadMode: prev.spreadMode === "single" ? "double" : "single"
    } : prev);
  }

  function togglePdfBindingDirection() {
    setPinnedPdfPreview((prev) => {
      if (!prev) return prev;
      const nextDirection = prev.bindingDirection === "right" ? "left" : "right";
      const targetPath = prev.item?.path;
      if (targetPath) pdfBindingDirectionRef.current.set(targetPath, nextDirection);
      return { ...prev, bindingDirection: nextDirection };
    });
  }

  function goPrevPdfPage() {
    setPinnedPdfPreview((prev) => {
      if (!prev) return prev;
      const step = prev.spreadMode === "double" ? 2 : 1;
      return { ...prev, pageNumber: Math.max(1, prev.pageNumber - step) };
    });
  }

  function goNextPdfPage() {
    setPinnedPdfPreview((prev) => {
      if (!prev) return prev;
      const step = prev.spreadMode === "double" ? 2 : 1;
      return { ...prev, pageNumber: Math.min(prev.pageCount, prev.pageNumber + step) };
    });
  }

  function updatePdfSearchQuery(query) {
    setPinnedPdfPreview((prev) => prev ? { ...prev, searchQuery: query } : prev);
    if (pdfSearchTimerRef.current) clearTimeout(pdfSearchTimerRef.current);

    const item = pinnedPdfPreview?.item;
    pdfSearchTimerRef.current = window.setTimeout(async () => {
      const results = await searchPdfText(item, query);
      setPinnedPdfPreview((prev) => prev ? {
        ...prev,
        searchResults: results,
        searchIndex: 0,
        pageNumber: results[0]?.pageNumber ?? prev.pageNumber
      } : prev);
    }, 300);
  }

  function goNextPdfSearchResult() {
    setPinnedPdfPreview((prev) => {
      if (!prev || !prev.searchResults.length) return prev;
      const nextIndex = (prev.searchIndex + 1) % prev.searchResults.length;
      return { ...prev, searchIndex: nextIndex, pageNumber: prev.searchResults[nextIndex].pageNumber };
    });
  }

  function goPrevPdfSearchResult() {
    setPinnedPdfPreview((prev) => {
      if (!prev || !prev.searchResults.length) return prev;
      const nextIndex = (prev.searchIndex - 1 + prev.searchResults.length) % prev.searchResults.length;
      return { ...prev, searchIndex: nextIndex, pageNumber: prev.searchResults[nextIndex].pageNumber };
    });
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
                <div className="searchPanel">
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearchQuery(value);
                      runSearch(value);
                    }}
                    placeholder="検索"
                  />
                  <span className="searchMeta">
                    {searchResults.length ? `${activeSearchIndex + 1} / ${searchResults.length}` : "0 / 0"}
                  </span>
                  <button type="button" onClick={goPrevSearchResult} disabled={!searchResults.length}>↑</button>
                  <button type="button" onClick={goNextSearchResult} disabled={!searchResults.length}>↓</button>
                </div>
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
                    <SidebarChevron open={sidebarSectionOpen("genreManager")} />
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
                          <SidebarChevron open={categoryManageSectionOpen("add")} />
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
                          <SidebarChevron open={categoryManageSectionOpen("edit")} />
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
                    <SidebarChevron open={sidebarSectionOpen("cellRegister")} />
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
                          {SORTED_LINE_ICON_OPTIONS.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
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
                    <SidebarChevron open={sidebarSectionOpen("settings")} />
                  </summary>
                  <div className="sidebarSectionBody">
                    <button onClick={() => setSettingsOpen(true)}><Settings size={17} />設定を開く</button>
                    <button type="button" onClick={runPathCheck} disabled={pathCheckRunning}>
                      {pathCheckRunning ? "チェック中..." : "リンク切れチェック"}
                    </button>
                    {checkedPathCount > 0 && (
                      <div className="pathCheckSummary">リンク切れ: {brokenPathCount} 件</div>
                    )}
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
                    pathCheckResults={pathCheckResults}
                    highlightedItemId={highlightedItemId}
                    itemElementRefs={itemElementRefs}
                    onSelectGenre={() => {
                      setSelectedGenreId(String(genre.id));
                      setItemForm((current) => ({ ...current, genreId: String(genre.id) }));
                    }}
                    onCategoryHeaderClick={() => bringCategoryFloatingPreviewsToFront(genre.id)}
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
          onAddExtensionIconTypes={addExtensionIconTypes}
          onUpdateIconType={updateIconType}
          onUpdateExtensionIconType={updateExtensionIconType}
          onDeleteExtensionIconType={deleteExtensionIconType}
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
          style={{
            left: hoverPreview.x,
            top: hoverPreview.y,
            zIndex: hoverPreview.zIndex ?? 1000,
            "--preview-accent-color": getItemCategoryAccentColor(hoverPreview.item)
          }}
          onPointerDown={() => bringFloatingToFront("hoverText")}
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
            <button
              type="button"
              className="textHoverPreviewPinButton"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={pinHoverPreview}
            >
              Pin
            </button>
          </div>
          {isMarkdownItem(hoverPreview.item) ? (
            <div className="textHoverPreviewBody markdownBody">
              <MarkdownPreview text={hoverPreview.text} />
            </div>
          ) : (
            <pre>{hoverPreview.text}</pre>
          )}
          {hoverPreview.truncated && <div className="textHoverPreviewFooter">先頭のみ表示しています</div>}
        </div>,
        document.body
      )}
      {hoverPdfPreview && createPortal(
        <div
          className="pdfHoverPreview"
          style={{
            left: hoverPdfPreview.x,
            top: hoverPdfPreview.y,
            width: hoverPdfPreview.width,
            height: hoverPdfPreview.height,
            zIndex: hoverPdfPreview.zIndex ?? 1000,
            "--preview-accent-color": getItemCategoryAccentColor(hoverPdfPreview.item)
          }}
          onPointerDown={() => bringFloatingToFront("hoverPdf")}
          onMouseEnter={handlePdfPreviewHoverStart}
          onMouseLeave={handlePdfPreviewHoverEnd}
        >
          <div className="pdfPreviewHeader">
            <span className="pdfPreviewTitle">{hoverPdfPreview.item?.name || hoverPdfPreview.item?.path}</span>
            <button
              type="button"
              className="pdfPreviewPinButton"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={pinHoverPdfPreview}
            >
              Pin
            </button>
          </div>
          <div className="pdfHoverCanvasWrap">
            <canvas ref={hoverPdfCanvasRef} />
          </div>
          <div className="pdfPreviewFooter">1 / {hoverPdfPreview.pageCount}</div>
        </div>,
        document.body
      )}
      {pinnedTextPreviews.map((preview) => createPortal(
        <div
          key={preview.id}
          ref={pinnedPreviewRef}
          className="pinnedTextPreview"
          data-preview-id={preview.id}
          style={{
            left: preview.x,
            top: preview.y,
            width: preview.width,
            height: preview.height,
            zIndex: preview.zIndex ?? 1000,
            "--preview-accent-color": getItemCategoryAccentColor(preview.item)
          }}
          onPointerDown={() => bringFloatingToFront("pinnedText", preview.id)}
          onMouseUp={updatePinnedPreviewSelection}
          onKeyUp={updatePinnedPreviewSelection}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            className="pinnedTextPreviewHeader"
            onPointerDown={(event) => handlePinnedPreviewDragStart(event, preview)}
            onPointerMove={handlePinnedPreviewDragMove}
            onPointerUp={handlePinnedPreviewDragEnd}
            onPointerCancel={handlePinnedPreviewDragEnd}
          >
            <span className="pinnedTextPreviewTitle">{preview.item?.name || preview.item?.path}</span>
            <div className="pinnedTextPreviewActions">
              {pinnedPreviewSelection && pinnedPreviewSelectionId === preview.id && !preview.isEditing && (
                <button
                  type="button"
                  className="pinnedTextPreviewCopyButton"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={copyPinnedPreviewSelection}
                >
                  {pinnedPreviewCopied ? "Copied" : "Copy"}
                </button>
              )}
              <button
                type="button"
                className="pinnedTextPreviewEditButton"
                disabled={!preview.isEditing && !canEditPinnedPreview(preview)}
                title={preview.isEditing ? "保存して閲覧に戻る" : "編集する"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (preview.isEditing) {
                    savePinnedPreviewEdit(preview.id);
                  } else {
                    startPinnedPreviewEdit(preview.id);
                  }
                }}
              >
                {preview.isEditing ? <LineIcon name="note" size={14} /> : <Pencil size={14} />}
              </button>
              <button
                type="button"
                className="pinnedTextPreviewCloseButton"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => closePinnedTextPreview(preview.id)}
              >
                ×
              </button>
            </div>
          </div>
          {preview.isEditing ? (
            <div className="pinnedTextEditor">
              <div className="pinnedTextEditorLineNumbers">
                {(preview.draftText ?? "").split(/\r?\n/).map((_, index) => (
                  <div key={index}>{index + 1}</div>
                ))}
              </div>
              <textarea
                className="pinnedTextEditorTextarea"
                value={preview.draftText ?? ""}
                spellCheck={false}
                onScroll={handlePinnedEditorScroll}
                onChange={(event) => {
                  const nextText = event.target.value;
                  updatePinnedTextPreview(preview.id, { draftText: nextText });
                }}
              />
            </div>
          ) : isMarkdownItem(preview.item) ? (
            <div className="pinnedTextPreviewBody markdownBody">
              <MarkdownPreview
                text={preview.text}
                onToggleCheckbox={(lineIndex) => togglePinnedMarkdownCheckbox(preview.id, lineIndex)}
              />
            </div>
          ) : (
            <pre className="pinnedTextPreviewBody">{preview.text}</pre>
          )}
          {preview.truncated && !preview.isEditing && <div className="pinnedTextPreviewFooter">先頭のみ表示しています</div>}
          <div
            className="pinnedTextPreviewResizeHandle"
            onPointerDown={(event) => handlePinnedPreviewResizeStart(event, preview)}
            onPointerMove={handlePinnedPreviewResizeMove}
            onPointerUp={handlePinnedPreviewResizeEnd}
            onPointerCancel={handlePinnedPreviewResizeEnd}
          />
        </div>,
        document.body,
        preview.id
      ))}
      {pinnedPdfPreview && createPortal(
        <div
          className="pinnedPdfPreview"
          style={{
            left: pinnedPdfPreview.x,
            top: pinnedPdfPreview.y,
            width: pinnedPdfPreview.width,
            height: pinnedPdfPreview.height,
            zIndex: pinnedPdfPreview.zIndex ?? 1000,
            "--preview-accent-color": getItemCategoryAccentColor(pinnedPdfPreview.item)
          }}
          onPointerDown={() => bringFloatingToFront("pinnedPdf", pinnedPdfPreview.id)}
        >
          <div
            className="pinnedPdfPreviewHeader"
            onPointerDown={handlePinnedPdfDragStart}
            onPointerMove={handlePinnedPdfDragMove}
            onPointerUp={handlePinnedPdfDragEnd}
            onPointerCancel={handlePinnedPdfDragEnd}
          >
            <span className="pinnedPdfPreviewTitle">{pinnedPdfPreview.item?.name || pinnedPdfPreview.item?.path}</span>
            <div className="pinnedPdfPreviewActions">
              <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={goPrevPdfPage}>Prev</button>
              <span>{pinnedPdfPreview.pageNumber} / {pinnedPdfPreview.pageCount}</span>
              <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={goNextPdfPage}>Next</button>
              <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={togglePdfSpreadMode}>
                {pinnedPdfPreview.spreadMode === "single" ? "1P" : "2P"}
              </button>
              {pinnedPdfPreview.spreadMode === "double" && (
                <button
                  type="button"
                  title={pinnedPdfPreview.bindingDirection === "right" ? "右開き" : "左開き"}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={togglePdfBindingDirection}
                >
                  {pinnedPdfPreview.bindingDirection === "right" ? "→" : "←"}
                </button>
              )}
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setPinnedPdfPreview((prev) => prev ? { ...prev, searchOpen: true } : prev)}
              >
                Find
              </button>
              <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setPinnedPdfPreview(null)}>×</button>
            </div>
          </div>
          {pinnedPdfPreview.searchOpen && (
            <div className="pinnedPdfSearchBar">
              <input
                value={pinnedPdfPreview.searchQuery}
                onChange={(event) => updatePdfSearchQuery(event.target.value)}
                placeholder="PDF内を検索"
              />
              <span>
                {pinnedPdfPreview.searchResults.length
                  ? `${pinnedPdfPreview.searchIndex + 1}/${pinnedPdfPreview.searchResults.length}`
                  : "0/0"}
              </span>
              <button type="button" onClick={goPrevPdfSearchResult}>↑</button>
              <button type="button" onClick={goNextPdfSearchResult}>↓</button>
            </div>
          )}
          <div className={`pinnedPdfCanvasArea mode-${pinnedPdfPreview.spreadMode}`}>
            <canvas ref={pinnedPdfCanvasLeftRef} />
            {pinnedPdfPreview.spreadMode === "double" && <canvas ref={pinnedPdfCanvasRightRef} />}
          </div>
          <div
            className="pinnedPdfPreviewResizeHandle"
            onPointerDown={handlePinnedPdfResizeStart}
            onPointerMove={handlePinnedPdfResizeMove}
            onPointerUp={handlePinnedPdfResizeEnd}
            onPointerCancel={handlePinnedPdfResizeEnd}
          />
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
  pathCheckResults,
  highlightedItemId,
  itemElementRefs,
  onSelectGenre,
  onCategoryHeaderClick,
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
      <header className="genreCompactHeader" onClick={onCategoryHeaderClick}>
        <div className="genreAccentBar" />
        <div className="genreCompactInfo">
          <span className="genreCompactTitle">{genre.name}</span>
          <span className="genreCompactMeta">{genre.cols}×{genre.rows}</span>
          <span className="genreCompactMeta">{itemCount} items</span>
        </div>
        <button
          type="button"
          className="genreCollapseButton"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapsed?.();
          }}
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
                  pathCheck={item ? pathCheckResults[item.id] : null}
                  searchHighlighted={item?.id === highlightedItemId}
                  itemElementRefs={itemElementRefs}
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
  pathCheck,
  searchHighlighted,
  itemElementRefs,
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
  const iconType = getItemIconSetting(item, settings);
  const iconName = item?.icon_name || iconType.icon;
  const iconColor = item?.icon_color || iconType.strokeColor;
  const iconBackground = item ? hexToRgba(
    item.icon_background_color || iconType.backgroundColor,
    item.icon_background_opacity ?? iconType.backgroundOpacity ?? 0.9
  ) : undefined;
  const extensionLabel = getExtensionLabel(item);
  const showTypeBadge = settings?.ui?.cell?.showTypeBadge ?? true;
  const showFileName = settings?.ui?.cell?.showFileName ?? true;
  const isBrokenPath = pathCheck && pathCheck.exists === false;
  const iconCardClassName = [
    "launcherItem",
    "iconCard",
    deleteCellMode ? "deleteMode" : "",
    isBrokenPath ? "brokenPath" : "",
    searchHighlighted ? "searchHighlight" : "",
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
          ref={(element) => {
            if (!itemElementRefs) return;
            if (element) {
              itemElementRefs.current.set(String(item.id), element);
            } else {
              itemElementRefs.current.delete(String(item.id));
            }
          }}
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
  const iconType = getItemIconSetting(item, settings);
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
                {SORTED_LINE_ICON_OPTIONS.map((iconName) => <option key={iconName} value={iconName}>{iconName}</option>)}
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

function SettingsPanel({ settings, onUpdate, onAddExtensionIconTypes, onUpdateIconType, onUpdateExtensionIconType, onDeleteExtensionIconType, onResetIconTypes, onClose }) {
  const current = normalizeSettings(settings || {});
  const [extensionDraft, setExtensionDraft] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState(null);
  const [iconPickerQuery, setIconPickerQuery] = useState("");
  const [iconColorHexDrafts, setIconColorHexDrafts] = useState({});
  const [iconColorHexErrors, setIconColorHexErrors] = useState({});
  const [settingsPanelPosition, setSettingsPanelPosition] = useState({ x: 80, y: 48 });
  const settingsPanelRef = useRef(null);
  const settingsPanelDragRef = useRef(null);
  const extensionIconEntries = Object.entries(current.extensionIconTypes || {}).sort(([left], [right]) => left.localeCompare(right));
  const iconSettingRows = [
    {
      rowType: "kind",
      key: "folder",
      label: "フォルダ",
      fixed: true,
      setting: getIconTypeSetting("folder", current)
    },
    ...extensionIconEntries.map(([extension, setting]) => ({
      rowType: "extension",
      key: extension,
      label: extension,
      fixed: false,
      setting
    }))
  ];
  const normalizedIconPickerQuery = iconPickerQuery.trim().toLowerCase();
  const visibleIconGroups = LINE_ICON_GROUPS
    .map((group) => ({
      ...group,
      icons: group.icons.filter((iconName) => iconName.toLowerCase().includes(normalizedIconPickerQuery))
    }))
    .filter((group) => group.icons.length > 0);

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

  useEffect(() => {
    if (!iconPickerOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setIconPickerOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [iconPickerOpen]);

  useEffect(() => {
    function handleResize() {
      setSettingsPanelPosition((prev) => clampSettingsPanelPosition(prev.x, prev.y));
    }
    window.addEventListener("resize", handleResize);
    window.requestAnimationFrame(handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
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

  function openIconPicker(row) {
    setIconPickerTarget({ type: row.rowType, key: row.key });
    setIconPickerQuery("");
    setIconPickerOpen(true);
  }

  function isIconPickerSelected(iconName) {
    if (!iconPickerTarget) return false;
    if (iconPickerTarget.type === "kind") {
      return getIconTypeSetting(iconPickerTarget.key, current)?.icon === iconName;
    }
    if (iconPickerTarget.type === "extension") {
      return current.extensionIconTypes?.[iconPickerTarget.key]?.icon === iconName;
    }
    return false;
  }

  function applyIconPickerSelection(iconName) {
    if (!iconPickerTarget) return;
    if (iconPickerTarget.type === "kind") {
      onUpdateIconType(iconPickerTarget.key, { icon: iconName });
      return;
    }
    if (iconPickerTarget.type === "extension") {
      onUpdateExtensionIconType(iconPickerTarget.key, { icon: iconName });
    }
  }

  function updateIconSettingRow(row, patch) {
    if (row.rowType === "kind") {
      onUpdateIconType(row.key, patch);
      return;
    }
    onUpdateExtensionIconType(row.key, patch);
  }

  function getIconSettingRowKey(row) {
    return `${row.rowType}:${row.key}`;
  }

  function updateIconRowStrokeColor(row, color) {
    const rowKey = getIconSettingRowKey(row);
    updateIconSettingRow(row, { strokeColor: color });
    setIconColorHexDrafts((prev) => ({ ...prev, [rowKey]: color }));
    setIconColorHexErrors((prev) => ({ ...prev, [rowKey]: "" }));
  }

  function updateIconRowStrokeHexInput(row, value) {
    const rowKey = getIconSettingRowKey(row);
    setIconColorHexDrafts((prev) => ({ ...prev, [rowKey]: value }));
    const normalized = normalizeHexColor(value);
    if (normalized === null) return;
    setIconColorHexErrors((prev) => ({ ...prev, [rowKey]: "" }));
    if (normalized !== "") updateIconSettingRow(row, { strokeColor: normalized });
  }

  function commitIconRowStrokeHexInput(row, currentColor) {
    const rowKey = getIconSettingRowKey(row);
    const value = iconColorHexDrafts[rowKey] ?? currentColor;
    const normalized = normalizeHexColor(value);
    if (normalized === null) {
      setIconColorHexErrors((prev) => ({
        ...prev,
        [rowKey]: "線色HEXは #RGB、RGB、#RRGGBB、RRGGBB の形式で入力してください。"
      }));
      return;
    }
    setIconColorHexErrors((prev) => ({ ...prev, [rowKey]: "" }));
    if (normalized !== "") {
      updateIconSettingRow(row, { strokeColor: normalized });
      setIconColorHexDrafts((prev) => ({ ...prev, [rowKey]: normalized }));
    }
  }

  function clampSettingsPanelPosition(x, y) {
    const padding = 8;
    const rect = settingsPanelRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 720;
    const height = rect?.height ?? 520;
    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const maxY = Math.max(padding, window.innerHeight - height - padding);
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY))
    };
  }

  function handleSettingsPanelDragStart(event) {
    event.preventDefault();
    event.stopPropagation();
    settingsPanelDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: settingsPanelPosition.x,
      originY: settingsPanelPosition.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSettingsPanelDragMove(event) {
    const drag = settingsPanelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    setSettingsPanelPosition(clampSettingsPanelPosition(nextX, nextY));
  }

  function handleSettingsPanelDragEnd(event) {
    if (settingsPanelDragRef.current?.pointerId === event.pointerId) {
      settingsPanelDragRef.current = null;
    }
  }

  return (
    <div className="settingsOverlay" role="presentation" onMouseDown={onClose}>
      <section
        ref={settingsPanelRef}
        className="settingsModal"
        role="dialog"
        aria-modal="true"
        aria-label="設定"
        style={{ left: settingsPanelPosition.x, top: settingsPanelPosition.y }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          className="settingsHeader"
          onPointerDown={handleSettingsPanelDragStart}
          onPointerMove={handleSettingsPanelDragMove}
          onPointerUp={handleSettingsPanelDragEnd}
          onPointerCancel={handleSettingsPanelDragEnd}
        >
          <div>
            <h2><Settings size={19} />設定</h2>
            <span>ワークスペースごとに保存されます</span>
          </div>
          <button onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>閉じる</button>
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
            <label className="check settingCheck">
              <input
                type="checkbox"
                checked={current.ui.autoFitWindowWidth ?? true}
                onChange={(event) => onUpdate({ ui: { autoFitWindowWidth: event.target.checked } })}
              />
              UIを自動でフィット
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
            <div className="extensionIconAddRow">
              <input
                value={extensionDraft}
                placeholder="拡張子を追加: pdf, xlsx, docx"
                onChange={(event) => setExtensionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (onAddExtensionIconTypes(extensionDraft)) setExtensionDraft("");
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (onAddExtensionIconTypes(extensionDraft)) setExtensionDraft("");
                }}
              >
                追加
              </button>
            </div>
            <div className="iconTypeTable extensionIconTable">
              <div className="iconTypeHeader extensionIconHeader">
                <span>種類/拡張子</span>
                <span>アイコン</span>
                <span>線色</span>
                <span>線色HEX</span>
                <span>背景色</span>
                <span>背景透過</span>
                <span>プレビュー</span>
                <span>削除</span>
              </div>
              <div className="extensionIconList">
                {iconSettingRows.map((row) => {
                  const type = row.setting;
                  const strokeColor = type.strokeColor || "#000000";
                  const colorPickerStrokeColor = (normalizeHexColor(strokeColor) || "#000000").toLowerCase();
                  const rowKey = getIconSettingRowKey(row);
                  const strokeColorHexValue = iconColorHexDrafts[rowKey] ?? strokeColor;
                  const strokeColorHexError = iconColorHexErrors[rowKey];
                  return (
                    <div className={`iconTypeRow extensionIconRow ${row.fixed ? "fixed" : ""}`} key={`${row.rowType}:${row.key}`}>
                      <code>{row.label}</code>
                      <div className="iconSettingPickerRow">
                        <span className="iconSettingCurrentIcon" title={type.icon}>
                          <LineIcon name={type.icon} color={type.strokeColor} size={22} />
                        </span>
                        <button type="button" onClick={() => openIconPicker(row)}>アイコンを選択</button>
                      </div>
                      <input type="color" value={colorPickerStrokeColor} onChange={(event) => updateIconRowStrokeColor(row, event.target.value)} />
                      <div className="iconColorHexField">
                        <input
                          type="text"
                          className={`iconColorHexInput ${strokeColorHexError ? "invalid" : ""}`}
                          value={strokeColorHexValue}
                          onChange={(event) => updateIconRowStrokeHexInput(row, event.target.value)}
                          onBlur={() => commitIconRowStrokeHexInput(row, strokeColor)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          onFocus={(event) => event.currentTarget.select()}
                          spellCheck={false}
                        />
                        {strokeColorHexError && <span className="iconColorHexError">{strokeColorHexError}</span>}
                      </div>
                      <input type="color" value={type.backgroundColor} onChange={(event) => updateIconSettingRow(row, { backgroundColor: event.target.value })} />
                      <label className="miniRange">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={type.backgroundOpacity}
                          onChange={(event) => updateIconSettingRow(row, { backgroundOpacity: Number(event.target.value) })}
                        />
                        <output>{Number(type.backgroundOpacity).toFixed(2)}</output>
                      </label>
                      <span
                        className="iconPreview"
                        style={{ background: hexToRgba(type.backgroundColor, type.backgroundOpacity ?? 0.9) }}
                      >
                        <LineIcon name={type.icon} color={type.strokeColor} size={24} />
                      </span>
                      {row.fixed ? (
                        <span className="iconSettingFixedLabel">固定</span>
                      ) : (
                        <button type="button" className="miniDangerButton" onClick={() => onDeleteExtensionIconType(row.key)}>削除</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={onResetIconTypes}>拡張子アイコン設定を初期化</button>
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
        {iconPickerOpen && (
          <div className="iconPickerOverlay" role="presentation" onMouseDown={() => setIconPickerOpen(false)}>
            <div
              className="iconPickerModal"
              role="dialog"
              aria-modal="true"
              aria-label="アイコンを選択"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="iconPickerHeader">
                <div>
                  <strong>アイコンを選択</strong>
                  <div className="iconPickerSubtext">使用するラインアイコンを選択してください</div>
                </div>
                <button type="button" onClick={() => setIconPickerOpen(false)}>×</button>
              </div>
              <input
                className="iconPickerSearch"
                value={iconPickerQuery}
                onChange={(event) => setIconPickerQuery(event.target.value)}
                placeholder="アイコンを検索"
                autoFocus
              />
              <div className="iconPickerGroupList">
                {visibleIconGroups.map((group) => (
                  <section key={group.id} className="iconPickerGroup">
                    <div className="iconPickerGroupTitle">{group.label}</div>
                    <div className="iconPickerGrid">
                      {group.icons.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          className={`iconPickerOption ${isIconPickerSelected(iconName) ? "selected" : ""}`}
                          title={iconName}
                          onClick={() => {
                            applyIconPickerSelection(iconName);
                            setIconPickerOpen(false);
                          }}
                        >
                          <LineIcon name={iconName} size={22} />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
