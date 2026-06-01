大きな疑問点はありません。
一点だけ、**ノートアイコン押下時は「保存して編集を閉じる」**という仕様として指示にしています。保存せず閉じたい場合は後で変更できます。

# GridDesk 修正指示：ピン留めテキストのコピー・編集・表示範囲制御・折りたたみアイコン統一

今回は以下の3点だけ対応してください。

1. テキストピン留め時でも、本文を範囲選択したらコピーボタンが表示され、コピーできるようにする
2. ピン留めテキストをUI表示内に収め、ペンアイコンで編集モード、ノートアイコンで保存して閲覧モードへ戻せるようにする
3. 左サイドバーの折りたたみボタン表示を統一する

## 禁止事項

今回は以下を触らないでください。

* ファイル/フォルダ起動処理
* 右クリックメニュー
* 削除モード
* セル登録ロジック
* DBスキーマ
* 背景透過/ブラー
* カテゴリ管理ロジック
* ウィンドウ幅自動フィット
* テキストプレビューの対象拡張子
* テキストプレビューの読み込み上限
* 通常ホバープレビューの基本挙動

---

# 1. ピン留めテキストでも本文範囲選択時にコピーボタンを表示する

## 現状

通常のホバーテキストでは、本文をドラッグ選択するとコピーボタンが表示されます。
しかし、ピン留めしたテキスト表示では同じ機能が動いていません。

## 変更後仕様

ピン留めテキストでも、本文を範囲選択したら右上に `Copy` ボタンを表示してください。
押下で選択中テキストをクリップボードへコピーします。

## 実装方針

通常ホバー用の選択コピー処理を、ピン留め用にも分離して実装してください。

### state追加

```jsx
const [pinnedPreviewSelection, setPinnedPreviewSelection] = useState("");
const [pinnedPreviewCopied, setPinnedPreviewCopied] = useState(false);
const pinnedPreviewRef = useRef(null);
```

### 選択範囲判定

```jsx
function isSelectionInsidePinnedPreview() {
  const selection = window.getSelection?.();
  const root = pinnedPreviewRef.current;

  if (!selection || !root || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);

  return (
    root.contains(range.startContainer) ||
    root.contains(range.endContainer)
  );
}

function updatePinnedPreviewSelection() {
  if (!isSelectionInsidePinnedPreview()) {
    setPinnedPreviewSelection("");
    return;
  }

  const selection = window.getSelection?.();
  const selectedText = selection?.toString?.() ?? "";

  if (!selectedText.trim()) {
    setPinnedPreviewSelection("");
    return;
  }

  setPinnedPreviewSelection(selectedText);
  setPinnedPreviewCopied(false);
}
```

### コピー処理

```jsx
async function copyPinnedPreviewSelection(event) {
  event.preventDefault();
  event.stopPropagation();

  const text = pinnedPreviewSelection;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setPinnedPreviewCopied(true);

    window.setTimeout(() => {
      setPinnedPreviewCopied(false);
    }, 1200);
  } catch (error) {
    console.error("Failed to copy pinned preview selection", error);
    alert("コピーに失敗しました");
  }
}
```

### JSX

ピン留めプレビューのルートに `ref` と選択イベントを追加してください。

```jsx
<div
  ref={pinnedPreviewRef}
  className="pinnedTextPreview"
  style={{
    left: pinnedHoverPreview.x,
    top: pinnedHoverPreview.y,
    width: pinnedHoverPreview.width,
    height: pinnedHoverPreview.height
  }}
  onMouseUp={updatePinnedPreviewSelection}
  onKeyUp={updatePinnedPreviewSelection}
  onWheel={(event) => event.stopPropagation()}
>
```

ピン留めヘッダー右側に Copy ボタンを追加してください。

```jsx
{pinnedPreviewSelection && (
  <button
    type="button"
    className="pinnedTextPreviewCopyButton"
    onClick={copyPinnedPreviewSelection}
  >
    {pinnedPreviewCopied ? "Copied" : "Copy"}
  </button>
)}
```

## クリア処理

ピン留めプレビューを閉じる時は、選択状態もクリアしてください。

```jsx
setPinnedHoverPreview(null);
setPinnedPreviewSelection("");
setPinnedPreviewCopied(false);
```

---

# 2. ピン留めテキストをUI表示内に収める

## 現状

ピン留めしたホバーテキストが、アプリUIの表示範囲外へはみ出す可能性があります。

## 変更後仕様

ピン留め時、移動時、リサイズ時のすべてで、ピン留めプレビューをアプリ表示内に収めてください。

## 実装方針

ピン留め作成時にも位置とサイズを clamp してください。

```jsx
function clampPinnedPreviewBounds(next) {
  const padding = 8;

  const width = Math.max(
    280,
    Math.min(next.width ?? 420, window.innerWidth - padding * 2)
  );

  const height = Math.max(
    180,
    Math.min(next.height ?? 360, window.innerHeight - padding * 2)
  );

  const x = Math.max(
    padding,
    Math.min(next.x ?? padding, window.innerWidth - width - padding)
  );

  const y = Math.max(
    padding,
    Math.min(next.y ?? padding, window.innerHeight - height - padding)
  );

  return {
    ...next,
    x,
    y,
    width,
    height
  };
}
```

ピン留め作成時:

```jsx
setPinnedHoverPreview(
  clampPinnedPreviewBounds({
    id: String(Date.now()),
    x: hoverPreview.x,
    y: hoverPreview.y,
    width: 420,
    height: 360,
    item: hoverPreview.item,
    text: hoverPreview.text,
    truncated: hoverPreview.truncated,
    isEditing: false,
    draftText: hoverPreview.text
  })
);
```

ドラッグ移動時:

```jsx
setPinnedHoverPreview((prev) =>
  clampPinnedPreviewBounds({
    ...prev,
    x: nextX,
    y: nextY
  })
);
```

リサイズ時:

```jsx
setPinnedHoverPreview((prev) =>
  clampPinnedPreviewBounds({
    ...prev,
    width: nextWidth,
    height: nextHeight
  })
);
```

ウィンドウリサイズ時にも、表示範囲内へ戻してください。

```jsx
useEffect(() => {
  function handleResize() {
    setPinnedHoverPreview((prev) => {
      if (!prev) return prev;
      return clampPinnedPreviewBounds(prev);
    });
  }

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

---

# 3. ピン留め時にペンアイコンで編集、ノートアイコンで保存して閉じる

## 目的

ピン留めしたテキストプレビューを、その場で編集できるようにしてください。

## 仕様

* ピン留め表示中、右上の `×` ボタンの左にペンアイコンを表示する
* ペンアイコン押下で編集モードに入る
* 編集モードでは、本文を textarea で編集できる
* 編集モードでは、左側に行番号を表示する
* 編集モード中、ペンアイコンはノートアイコンに変化する
* ノートアイコン押下で、編集内容をテキストファイルへ保存し、閲覧モードへ戻る
* 保存後は表示テキストも更新する
* 編集対象はテキストファイルのみ
* URL / フォルダ / 非対象ファイルでは編集モードにしない

## アイコン表現

まずは文字アイコンで構いません。

| 状態    | 表示 |
| ----- | -- |
| 閲覧モード | ✎  |
| 編集モード | 📝 |

可能なら既存の `LineIcon` を使ってください。

| 状態    | LineIcon候補      |
| ----- | --------------- |
| 閲覧モード | edit / pencil   |
| 編集モード | note / fileText |

---

## state構造

`pinnedHoverPreview` に以下を持たせてください。

```js
{
  ...
  isEditing: false,
  draftText: text
}
```

## 編集開始

```jsx
function startPinnedPreviewEdit() {
  setPinnedHoverPreview((prev) => {
    if (!prev) return prev;

    return {
      ...prev,
      isEditing: true,
      draftText: prev.text ?? ""
    };
  });
}
```

---

## 保存して編集終了

実ファイルへ保存するため、Electron IPCを追加してください。

### main.cjs

`electron/main.cjs` に軽量保存IPCを追加してください。

```js
const fs = require("fs/promises");
const path = require("path");

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

ipcMain.handle("file:saveText", async (_event, payload) => {
  try {
    const targetPath = payload?.path;
    const text = payload?.text;

    if (!targetPath || typeof targetPath !== "string") {
      return { ok: false, error: "パスが空です" };
    }

    if (typeof text !== "string") {
      return { ok: false, error: "保存するテキストが不正です" };
    }

    if (/^https?:\/\//i.test(targetPath)) {
      return { ok: false, error: "URLは編集できません" };
    }

    const ext = path.extname(targetPath).toLowerCase();

    if (!TEXT_PREVIEW_EXTENSIONS.has(ext)) {
      return { ok: false, error: "編集対象外のファイルです" };
    }

    const stat = await fs.stat(targetPath);

    if (!stat.isFile()) {
      return { ok: false, error: "ファイルではありません" };
    }

    await fs.writeFile(targetPath, text, "utf8");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message ?? error)
    };
  }
});
```

既に `TEXT_PREVIEW_EXTENSIONS` が定義済みなら重複定義しないで再利用してください。

### preload.cjs

```js
saveTextFile: (payload) => ipcRenderer.invoke("file:saveText", payload)
```

既存 `window.griddesk` に追加してください。

### renderer

```jsx
async function savePinnedPreviewEdit() {
  const preview = pinnedHoverPreview;
  if (!preview) return;

  const targetPath = preview.item?.path;

  if (!targetPath) {
    alert("保存先パスがありません");
    return;
  }

  try {
    const result = await window.griddesk?.saveTextFile?.({
      path: targetPath,
      text: preview.draftText ?? ""
    });

    if (result?.ok === false) {
      alert(result.error || "保存に失敗しました");
      return;
    }

    previewCacheRef.current.set(targetPath, {
      ok: true,
      text: preview.draftText ?? "",
      truncated: false,
      size: new Blob([preview.draftText ?? ""]).size,
      ext: ""
    });

    setPinnedHoverPreview((prev) => ({
      ...prev,
      text: prev.draftText ?? "",
      isEditing: false
    }));
  } catch (error) {
    console.error("Failed to save pinned preview edit", error);
    alert("保存に失敗しました");
  }
}
```

---

## JSX

ヘッダー右側を以下のようにしてください。

```jsx
<div className="pinnedTextPreviewActions">
  {pinnedPreviewSelection && !pinnedHoverPreview.isEditing && (
    <button
      type="button"
      className="pinnedTextPreviewCopyButton"
      onClick={copyPinnedPreviewSelection}
    >
      {pinnedPreviewCopied ? "Copied" : "Copy"}
    </button>
  )}

  <button
    type="button"
    className="pinnedTextPreviewEditButton"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();

      if (pinnedHoverPreview.isEditing) {
        savePinnedPreviewEdit();
      } else {
        startPinnedPreviewEdit();
      }
    }}
    title={pinnedHoverPreview.isEditing ? "保存して閲覧に戻る" : "編集する"}
  >
    {pinnedHoverPreview.isEditing ? "📝" : "✎"}
  </button>

  <button
    type="button"
    className="pinnedTextPreviewCloseButton"
    onClick={() => {
      setPinnedHoverPreview(null);
      setPinnedPreviewSelection("");
      setPinnedPreviewCopied(false);
    }}
  >
    ×
  </button>
</div>
```

本文表示は、編集モードで切り替えてください。

```jsx
{pinnedHoverPreview.isEditing ? (
  <div className="pinnedTextEditor">
    <div className="pinnedTextEditorLineNumbers">
      {(pinnedHoverPreview.draftText ?? "").split(/\r?\n/).map((_, index) => (
        <div key={index}>{index + 1}</div>
      ))}
    </div>

    <textarea
      className="pinnedTextEditorTextarea"
      value={pinnedHoverPreview.draftText ?? ""}
      onChange={(event) => {
        const nextText = event.target.value;

        setPinnedHoverPreview((prev) => ({
          ...prev,
          draftText: nextText
        }));
      }}
      spellCheck={false}
    />
  </div>
) : (
  <pre className="pinnedTextPreviewBody">
    {pinnedHoverPreview.text}
  </pre>
)}
```

---

## CSS

```css
.pinnedTextPreviewActions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.pinnedTextPreviewCopyButton,
.pinnedTextPreviewEditButton,
.pinnedTextPreviewCloseButton {
  border: 1px solid rgba(60, 70, 80, 0.34);
  border-radius: 7px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.26);
  color: inherit;
  -webkit-app-region: no-drag;
}

.pinnedTextPreviewCopyButton:hover,
.pinnedTextPreviewEditButton:hover,
.pinnedTextPreviewCloseButton:hover {
  background: rgba(255, 255, 255, 0.38);
}

.pinnedTextEditor {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  overflow: hidden;
}

.pinnedTextEditorLineNumbers {
  overflow: hidden;
  padding: 10px 7px;
  border-right: 1px solid var(--gd-border-subtle);
  background: rgba(0, 0, 0, 0.04);
  color: rgba(60, 70, 80, 0.65);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  line-height: 1.35;
  text-align: right;
  user-select: none;
}

.pinnedTextEditorTextarea {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  resize: none;
  outline: none;
  padding: 10px;
  background: transparent;
  color: inherit;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  line-height: 1.35;
  white-space: pre;
  overflow: auto;
}
```

### 行番号スクロール同期

textarea の縦スクロールに行番号を合わせてください。

```jsx
const pinnedTextEditorLineNumbersRef = useRef(null);

function handlePinnedEditorScroll(event) {
  if (pinnedTextEditorLineNumbersRef.current) {
    pinnedTextEditorLineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
  }
}
```

```jsx
<div
  ref={pinnedTextEditorLineNumbersRef}
  className="pinnedTextEditorLineNumbers"
>
```

```jsx
<textarea
  ...
  onScroll={handlePinnedEditorScroll}
/>
```

---

# 4. 左サイドバー折りたたみボタンの向きを統一する

## 仕様

左サイドバーの折りたたみボタンは、すべて以下に統一してください。

| 状態    | 表示       |
| ----- | -------- |
| 閉じている | `<`      |
| 開いている | 下向きの `<` |

「下向きの `<`」は、文字 `<` をCSSで回転して表現してください。

## 対象

* 左サイドバーのメインセクション

  * カテゴリ管理
  * セル登録
  * 設定
* カテゴリ管理内のサブセクション

  * カテゴリ追加
  * カテゴリ変更
* その他、左サイドバー内にある折りたたみ可能項目

## JSX

表示文字をすべて `<` に統一してください。

```jsx
<span className="sidebarSectionChevron">&lt;</span>
```

## CSS

閉じている時は左向き `<` のまま。

```css
.sidebarSectionChevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: rotate(0deg);
  transition: transform 0.14s ease;
}
```

開いている時は下向きになるように回転してください。

```css
.sidebarSection[open] .sidebarSectionChevron,
.sidebarSubsection[open] .sidebarSectionChevron {
  transform: rotate(-90deg);
}
```

もし見た目が逆なら `rotate(90deg)` に調整してください。
重要なのは、**閉じている時は左向き、開いている時は下向き**に見えることです。

## 完了条件

* 閉じている項目は `<`
* 開いている項目は下向きの `<`
* `>` や `v` 表示が残っていない
* 左サイドバー内の折りたたみボタン表示が統一されている

---

# 作業後の報告形式

```text
対応結果:

1. ピン留め時のコピー機能
- ピン留め本文選択検知: OK / NG
- Copyボタン表示: OK / NG
- コピー動作: OK / NG
- 選択解除時の非表示: OK / NG

2. ピン留め表示範囲制御
- ピン留め作成時のclamp: OK / NG
- 移動時のclamp: OK / NG
- リサイズ時のclamp: OK / NG
- ウィンドウリサイズ時のclamp: OK / NG

3. ピン留め編集機能
- ペンアイコン表示: OK / NG
- 編集モード切替: OK / NG
- ノートアイコン表示: OK / NG
- ノート押下で保存して閲覧へ戻る: OK / NG
- 左行番号表示: OK / NG
- 行番号スクロール同期: OK / NG
- saveTextFile IPC: OK / NG

4. サイドバー折りたたみアイコン統一
- 閉状態 `<`: OK / NG
- 開状態 下向き`<`: OK / NG
- `>` / `v` 残存なし: OK / NG

変更ファイル:
- src/App.jsx:
- src/styles.css:
- electron/main.cjs:
- electron/preload.cjs:

確認:
- npm run build:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:
```

ビルド成功だけで完了扱いにしないでください。
必ず実画面で、ピン留め本文選択コピー、編集保存、移動/リサイズ、折りたたみアイコン向きを確認してください。

実装上の解釈は、**ノートアイコン押下 = 保存して編集終了** にしています。
保存せず閉じる動作も必要になったら、次に「キャンセル」ボタンを追加するのがよいです。
