import React from "react";

export const LINE_ICON_GROUPS = [
  {
    id: "series1",
    label: "シリーズ1",
    icons: [
      "folder", "folderOpen", "file", "fileText", "fileCode", "fileImage",
      "fileSpreadsheet", "fileArchive", "filePdf", "filePlus", "fileMinus",
      "fileSearch", "document", "documents", "book", "notebook", "memo",
      "clipboard", "paperclip", "tag", "bookmark", "archive", "box", "package"
    ]
  },
  {
    id: "series2",
    label: "シリーズ2",
    icons: [
      "diagram", "blueprint", "circuit", "chip", "cpu", "layers", "grid",
      "layout", "ruler", "compass", "cube", "blocks", "component", "plug",
      "cable", "terminalBlock", "panel", "wiring", "tool", "wrench", "hammer",
      "gear", "settings", "sliders"
    ]
  },
  {
    id: "series3",
    label: "シリーズ3",
    icons: [
      "code", "terminal", "database", "server", "network", "cloud", "api",
      "branch", "git", "bug", "shield", "lock", "key", "monitor", "laptop",
      "keyboard", "mouse", "hardDrive", "download", "upload", "sync", "refresh",
      "search", "filter"
    ]
  },
  {
    id: "series4",
    label: "シリーズ4",
    icons: [
      "briefcase", "calendar", "clock", "mail", "user", "users", "task",
      "check", "checkCircle", "x", "xCircle", "alert", "warning", "info",
      "star", "pin", "flag", "home", "building", "printer", "scanner",
      "chart", "table", "list"
    ]
  },
  {
    id: "series5",
    label: "シリーズ5",
    icons: [
      "image", "camera", "movie", "music", "palette", "eye", "eyeOff",
      "link", "globe", "map", "location", "lightbulb", "spark", "heart",
      "copy", "edit", "pencil", "note", "trash", "plus", "minus", "arrowRight",
      "arrowLeft", "arrowUp", "arrowDown"
    ]
  }
];

export const LINE_ICON_OPTIONS = Array.from(new Set(LINE_ICON_GROUPS.flatMap((group) => group.icons)));

const fileShape = (
  <>
    <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z" />
    <path d="M14 3.5V8h4" />
  </>
);

const iconPaths = {
  folder: (
    <>
      <path d="M3 6.5h6l1.6 2H21v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5z" />
      <path d="M3 8.5h18" />
    </>
  ),
  folderOpen: (
    <>
      <path d="M3.5 8h6l1.4 2h9.6" />
      <path d="M4 8v10.5a1.5 1.5 0 0 0 1.5 1.5h12.8a1.7 1.7 0 0 0 1.6-1.2L22 11H7.2a1.7 1.7 0 0 0-1.6 1.2L4 18" />
    </>
  ),
  file: fileShape,
  fileText: (
    <>
      {fileShape}
      <path d="M9 12h6" />
      <path d="M9 15h6" />
      <path d="M9 18h4" />
    </>
  ),
  fileCode: (
    <>
      {fileShape}
      <path d="M10 13l-2 2 2 2" />
      <path d="M14 13l2 2-2 2" />
    </>
  ),
  fileArchive: (
    <>
      {fileShape}
      <path d="M10 11h4" />
      <path d="M10 14h4" />
      <path d="M11 17h2" />
    </>
  ),
  fileImage: (
    <>
      {fileShape}
      <circle cx="10" cy="12" r="1" />
      <path d="M9 18l2.5-3 2 2 1.5-1.5 2 2.5" />
    </>
  ),
  fileSpreadsheet: (
    <>
      {fileShape}
      <path d="M9 12h7" />
      <path d="M9 15h7" />
      <path d="M12 12v6" />
    </>
  ),
  table: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M6.5 17l4.2-4.2 2.8 2.8 2-2L19 17" />
    </>
  ),
  appWindow: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 9h16" />
      <path d="M8 7h.01" />
      <path d="M11 7h.01" />
    </>
  ),
  terminal: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M7.5 10l2.5 2-2.5 2" />
      <path d="M12 15h4" />
    </>
  ),
  link: (
    <>
      <path d="M10.5 13.5l3-3" />
      <path d="M9.5 8.5l1.2-1.2a4 4 0 0 1 5.6 5.6l-1.2 1.2" />
      <path d="M14.5 15.5l-1.2 1.2a4 4 0 0 1-5.6-5.6l1.2-1.2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.3 3.2 5 3.2 8.5s-1 6.2-3.2 8.5" />
      <path d="M12 3.5C9.8 5.8 8.8 8.5 8.8 12s1 6.2 3.2 8.5" />
    </>
  ),
  note: (
    <>
      <path d="M6 4.5h12v15H6z" />
      <path d="M9 8h6" />
      <path d="M9 11.5h6" />
      <path d="M9 15h4" />
    </>
  ),
  book: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 5.5v16" />
      <path d="M8 7h7" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>
  ),
  server: (
    <>
      <rect x="5" y="4" width="14" height="6" rx="2" />
      <rect x="5" y="14" width="14" height="6" rx="2" />
      <path d="M8 7h.01" />
      <path d="M8 17h.01" />
      <path d="M12 10v4" />
    </>
  ),
  hardDrive: (
    <>
      <path d="M6 5h12l3 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
      <path d="M3 13h18" />
      <path d="M17 17h.01" />
    </>
  ),
  cloud: <path d="M7 18h10.5a4 4 0 0 0 .6-7.9A6 6 0 0 0 6.7 8.5 4.8 4.8 0 0 0 7 18z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12.8a7 7 0 0 0 .1-1.6l2-1.5-2-3.4-2.4 1a7.2 7.2 0 0 0-1.4-.8L15 4h-4l-.4 2.5c-.5.2-1 .5-1.4.8l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 1.6l-2 1.5 2 3.4 2.4-1c.4.3.9.6 1.4.8L11 20h4l.4-2.5c.5-.2 1-.5 1.4-.8l2.4 1 2-3.4z" />
    </>
  ),
  tool: <path d="M14.5 5.5a4.5 4.5 0 0 0 5.9 5.9L11 20.8a2.2 2.2 0 0 1-3.1-3.1z" />,
  wrench: (
    <>
      <path d="M14.5 5.5a4.5 4.5 0 0 0 5.9 5.9L10 21a2.5 2.5 0 0 1-3.5-3.5z" />
      <path d="M8 18l-2 2" />
    </>
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9.5 1.5v3M14.5 1.5v3M9.5 19.5v3M14.5 19.5v3M1.5 9.5h3M1.5 14.5h3M19.5 9.5h3M19.5 14.5h3" />
    </>
  ),
  box: (
    <>
      <path d="M4 8l8-4 8 4-8 4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </>
  ),
  package: (
    <>
      <path d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9M8 5.3l8 4.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3.5l9 5-9 5-9-5z" />
      <path d="M3 12l9 5 9-5M3 15.5l9 5 9-5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  layout: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M10 10v9" />
    </>
  ),
  monitor: (
    <>
      <rect x="3.5" y="5" width="17" height="11" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  laptop: (
    <>
      <path d="M6 6h12v9H6z" />
      <path d="M3 18h18l-2-3H5z" />
    </>
  ),
  keyboard: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 11h.01M10 11h.01M13 11h.01M16 11h.01M8 14h8" />
    </>
  ),
  mouse: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="4" />
      <path d="M12 3v6" />
    </>
  ),
  printer: (
    <>
      <path d="M7 8V4h10v4" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
      <path d="M5 8h14a2 2 0 0 1 2 2v5h-3M6 15H3v-5a2 2 0 0 1 2-2M8 17h8" />
    </>
  ),
  camera: (
    <>
      <path d="M8 7l1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  star: <path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.3 6.7 19.1l1-5.8-4.2-4.1 5.9-.9z" />,
  pin: (
    <>
      <path d="M14 4l6 6-3 1-4 4-1 5-2-2-2-2-2-2 5-1 4-4z" />
      <path d="M9 15l-5 5" />
    </>
  ),
  tag: (
    <>
      <path d="M4 5v6l8.5 8.5a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8L11 4H5a1 1 0 0 0-1 1z" />
      <path d="M8 8h.01" />
    </>
  ),
  bookmark: <path d="M7 4h10v17l-5-3-5 3z" />,
  home: (
    <>
      <path d="M3.5 11.5L12 4l8.5 7.5" />
      <path d="M6 10.5V20h12v-9.5M10 20v-6h4v6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M9 7V5h6v2M4 12h16" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 5a3 3 0 0 1 6 0M9 10h6M9 14h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M4 8l8 6 8-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3.5 20a6 6 0 0 1 11 0M14.5 17a5 5 0 0 1 6 3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-2.9 8.5-7 10-4.1-1.5-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </>
  )
};

Object.assign(iconPaths, {
  filePdf: iconPaths.fileText,
  filePlus: iconPaths.file,
  fileMinus: iconPaths.file,
  fileSearch: iconPaths.search,
  document: iconPaths.fileText,
  documents: iconPaths.fileArchive,
  notebook: iconPaths.book,
  memo: iconPaths.note,
  paperclip: iconPaths.link,
  archive: iconPaths.fileArchive,
  diagram: iconPaths.layout,
  blueprint: iconPaths.fileImage,
  circuit: iconPaths.grid,
  chip: iconPaths.cpu,
  ruler: iconPaths.layout,
  compass: iconPaths.search,
  cube: iconPaths.box,
  blocks: iconPaths.layers,
  component: iconPaths.box,
  plug: iconPaths.tool,
  cable: iconPaths.link,
  terminalBlock: iconPaths.terminal,
  panel: iconPaths.layout,
  wiring: iconPaths.link,
  hammer: iconPaths.tool,
  gear: iconPaths.settings,
  sliders: iconPaths.settings,
  code: iconPaths.fileCode,
  network: iconPaths.server,
  api: iconPaths.cloud,
  branch: iconPaths.arrowRight,
  git: iconPaths.branch,
  bug: iconPaths.alert,
  key: iconPaths.lock,
  download: iconPaths.arrowDown,
  upload: iconPaths.arrowRight,
  sync: iconPaths.refresh ?? iconPaths.arrowRight,
  refresh: iconPaths.arrowRight,
  filter: iconPaths.search,
  task: iconPaths.check,
  checkCircle: iconPaths.check,
  xCircle: iconPaths.x,
  warning: iconPaths.alert,
  info: iconPaths.alert,
  flag: iconPaths.bookmark,
  building: iconPaths.home,
  scanner: iconPaths.printer,
  chart: iconPaths.table,
  list: iconPaths.clipboard,
  movie: iconPaths.image,
  music: iconPaths.note,
  palette: iconPaths.image,
  eye: iconPaths.search,
  eyeOff: iconPaths.x,
  map: iconPaths.globe,
  location: iconPaths.pin,
  lightbulb: iconPaths.alert,
  spark: iconPaths.star,
  heart: iconPaths.star,
  copy: iconPaths.documents,
  edit: iconPaths.note,
  pencil: iconPaths.note,
  trash: iconPaths.x,
  arrowLeft: iconPaths.arrowRight,
  arrowUp: iconPaths.arrowDown
});

export const lineIconNames = LINE_ICON_OPTIONS;

export default function LineIcon({
  name = "file",
  color = "currentColor",
  size = 30,
  strokeWidth = 1.8
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name] ?? iconPaths.file}
    </svg>
  );
}
