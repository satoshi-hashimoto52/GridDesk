ß
# GridDesk 修正指示：ホバーテキスト選択時にコピーボタンを表示する

今回は以下のみ対応してください。

* ホバーテキスト表示領域内でテキストを範囲ドラッグ選択している時、テキスト右上付近に「コピー」ボタンを表示する
* ボタン押下で選択中テキストをクリップボードへコピーする

## 禁止事項

今回は以下を触らないでください。

* ファイル/フォルダ起動処理
* 右クリックメニュー
* 削除モード
* セル登録ロジック
* DBスキーマ
* 背景透過/ブラー
* カテゴリ管理
* ウィンドウ幅自動フィット
* テキストプレビューの読み込み上限
* テキストプレビューの対象拡張子
* main/preload の大規模変更

---

# 1. 目的

現在、テキストファイルのホバープレビューは表示され、スクロールもできます。

追加で、プレビュー内のテキストをドラッグ選択した時に、選択範囲をコピーしやすくするため、プレビュー右上付近に「コピー」ボタンを表示してください。

---

# 2. 期待仕様

## 表示条件

以下の条件を満たした時だけ、コピーボタンを表示してください。

```text
ホバーテキストプレビューが表示されている
かつ
プレビュー内のテキストが範囲選択されている
```

## 非表示条件

以下の場合はコピーボタンを非表示にしてください。

```text
選択範囲が空
プレビューを閉じた
プレビュー外をクリックした
Escapeで閉じた
選択が解除された
```

## 表示位置

コピーボタンは、ホバーテキスト表示領域の右上付近に表示してください。

```text
┌──────────────────────────────┐
│ ファイル名              Copy │
├──────────────────────────────┤
│ 選択可能なテキスト本文        │
│ ...                          │
└──────────────────────────────┘
```

---

# 3. state を追加

`src/App.jsx` に選択中テキスト用 state を追加してください。

```jsx
const [hoverPreviewSelection, setHoverPreviewSelection] = useState("");
```

必要なら、コピー完了表示用 state も追加してください。

```jsx
const [hoverPreviewCopied, setHoverPreviewCopied] = useState(false);
```

---

# 4. プレビュー内の選択状態を検知する

ホバープレビュー内で `onMouseUp` / `onKeyUp` を使い、選択範囲を取得してください。

```jsx
function updateHoverPreviewSelection() {
  const selection = window.getSelection?.();

  if (!selection) {
    setHoverPreviewSelection("");
    return;
  }

  const selectedText = selection.toString();

  if (!selectedText || !selectedText.trim()) {
    setHoverPreviewSelection("");
    return;
  }

  setHoverPreviewSelection(selectedText);
}
```

ただし、アプリ全体の選択ではなく、ホバープレビュー内で選択された時だけ反応させてください。

---

# 5. プレビュー内選択かどうかを確認する

`textHoverPreview` に ref を追加してください。

```jsx
const hoverPreviewRef = useRef(null);
```

選択範囲がホバープレビュー内か確認する関数を追加してください。

```jsx
function isSelectionInsideHoverPreview() {
  const selection = window.getSelection?.();
  const root = hoverPreviewRef.current;

  if (!selection || !root || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);

  return (
    root.contains(range.startContainer) ||
    root.contains(range.endContainer)
  );
}
```

`updateHoverPreviewSelection` を以下のようにしてください。

```jsx
function updateHoverPreviewSelection() {
  if (!isSelectionInsideHoverPreview()) {
    setHoverPreviewSelection("");
    return;
  }

  const selection = window.getSelection?.();
  const selectedText = selection?.toString?.() ?? "";

  if (!selectedText.trim()) {
    setHoverPreviewSelection("");
    return;
  }

  setHoverPreviewSelection(selectedText);
  setHoverPreviewCopied(false);
}
```

---

# 6. ホバープレビュー JSX を修正

現在の `textHoverPreview` 表示部分に、ref とイベントを追加してください。

```jsx
{hoverPreview &&
  createPortal(
    <div
      ref={hoverPreviewRef}
      className="textHoverPreview"
      style={{
        left: hoverPreview.x,
        top: hoverPreview.y
      }}
      onMouseEnter={() => {
        isHoveringPreviewRef.current = true;

        if (hoverPreviewCloseTimerRef.current) {
          window.clearTimeout(hoverPreviewCloseTimerRef.current);
          hoverPreviewCloseTimerRef.current = null;
        }
      }}
      onMouseLeave={() => {
        isHoveringPreviewRef.current = false;
        scheduleCloseHoverPreview();
      }}
      onMouseUp={updateHoverPreviewSelection}
      onKeyUp={updateHoverPreviewSelection}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="textHoverPreviewTitle">
        <span className="textHoverPreviewTitleText">
          {hoverPreview.item?.name ?? hoverPreview.item?.path}
        </span>

        {hoverPreviewSelection && (
          <button
            type="button"
            className="textHoverPreviewCopyButton"
            onClick={copyHoverPreviewSelection}
          >
            {hoverPreviewCopied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <pre>{hoverPreview.text}</pre>

      {hoverPreview.truncated && (
        <div className="textHoverPreviewFooter">
          先頭のみ表示しています
        </div>
      )}
    </div>,
    document.body
  )}
```

既存の変数名が違う場合は、現在の実装に合わせてください。

---

# 7. コピー処理を追加

選択中テキストをクリップボードへコピーしてください。

まずは renderer 側の Clipboard API を使ってください。

```jsx
async function copyHoverPreviewSelection(event) {
  event.preventDefault();
  event.stopPropagation();

  const text = hoverPreviewSelection;

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setHoverPreviewCopied(true);

    window.setTimeout(() => {
      setHoverPreviewCopied(false);
    }, 1200);
  } catch (error) {
    console.error("Failed to copy hover preview selection", error);
    alert("コピーに失敗しました");
  }
}
```

Electron環境で `navigator.clipboard` が使えない場合だけ、preload/main 経由の clipboard API を追加してください。

ただし、まずは `navigator.clipboard.writeText()` を優先してください。

---

# 8. プレビューを閉じる時に選択状態もクリア

プレビューを閉じる処理で、選択状態もクリアしてください。

```jsx
setHoverPreview(null);
setHoverPreviewSelection("");
setHoverPreviewCopied(false);
```

たとえば `scheduleCloseHoverPreview()` 内では以下のようにしてください。

```jsx
function scheduleCloseHoverPreview() {
  if (hoverPreviewCloseTimerRef.current) {
    window.clearTimeout(hoverPreviewCloseTimerRef.current);
  }

  hoverPreviewCloseTimerRef.current = window.setTimeout(() => {
    if (!isHoveringIconRef.current && !isHoveringPreviewRef.current) {
      setHoverPreview(null);
      setHoverPreviewSelection("");
      setHoverPreviewCopied(false);
    }
  }, 180);
}
```

また、別ファイルのプレビューに切り替わった時もクリアしてください。

```jsx
setHoverPreviewSelection("");
setHoverPreviewCopied(false);
```

---

# 9. 外クリック / Escape 時にもクリア

すでにホバープレビューの close 処理がある場合は、そこに以下を追加してください。

```jsx
setHoverPreviewSelection("");
setHoverPreviewCopied(false);
```

---

# 10. CSS を追加

`src/styles.css` に追加してください。

```css
.textHoverPreviewTitle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.textHoverPreviewTitleText {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.textHoverPreviewCopyButton {
  flex-shrink: 0;
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

.textHoverPreviewCopyButton:hover {
  background: rgba(255, 255, 255, 0.38);
}

.textHoverPreviewCopyButton:active {
  transform: translateY(1px);
}
```

選択部分が見やすいように、必要なら以下も追加してください。

```css
.textHoverPreview ::selection {
  background: rgba(59, 130, 246, 0.35);
}
```

---

# 11. 注意点

* `pre` 内のテキストは選択可能にしてください
* `.textHoverPreview` に `user-select: text` を維持してください
* `.textHoverPreview` に `pointer-events: auto` を維持してください
* コピーボタンを押した時にホバープレビューが即閉じないようにしてください
* コピーボタン押下時は `event.stopPropagation()` してください
* 選択中に背面UIがドラッグ/クリックされないようにしてください

---

# 12. 完了条件

以下を実画面で確認してください。

* `.txt` のホバープレビュー内でテキスト範囲選択できる
* テキストを範囲選択すると右上に `Copy` ボタンが出る
* `Copy` ボタン押下で選択中テキストがクリップボードへコピーされる
* コピー後、一時的に `Copied` 表示になる
* 選択解除すると `Copy` ボタンが消える
* プレビューから外れると `Copy` ボタンも消える
* `.md` でも同様に動く
* フォルダやPDFではプレビュー自体が出ない
* 既存のホバープレビュー保持・スクロール動作が壊れていない

---

# 作業後の報告形式

```text
対応結果:

ホバーテキスト選択コピー:
- 選択中テキスト state 追加: OK / NG
- プレビュー内選択判定: OK / NG
- Copy ボタン表示: OK / NG
- クリップボードコピー: OK / NG
- Copied 表示: OK / NG
- 選択解除/プレビュー終了時のクリア: OK / NG
- 既存ホバー保持維持: OK / NG
- 既存スクロール維持: OK / NG

変更ファイル:
- src/App.jsx:
- src/styles.css:
- その他:

確認:
- npm run build:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:
```
