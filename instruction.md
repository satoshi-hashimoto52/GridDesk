
# GridDesk 修正指示：セル表示中央寄せ・テキストホバープレビュー保持

今回は以下の2点だけ修正してください。

1. セル設定で「種別バッジ」または「ファイル名表示」をOFFにした時、残った表示要素がアイコンカード内で中央に配置されるようにする
2. テキストホバープレビューは、プレビュー表示領域からカーソルを外に出さない限り表示したままにする

## 禁止事項

今回は以下を触らないでください。

* ファイル/フォルダ起動処理
* 右クリックメニュー
* 削除モード
* セル登録ロジック
* DBスキーマ
* 背景透過/ブラー
* セル設定の項目追加
* カテゴリ管理
* ウィンドウ幅自動フィット
* Electron main/preload の大規模変更

---

# 1. 種別バッジ/ファイル名表示OFF時の中央寄せ

## 現状

セル設定で以下をOFFにした時、アイコンカード内の残った表示要素の位置が不自然になります。

* 種別バッジ表示OFF
* ファイル名表示OFF

例えば、

* 種別バッジのみOFF
* ファイル名のみOFF
* 両方OFF

の状態で、アイコンや残ったラベルが上寄り・下寄りになっている可能性があります。

## 期待仕様

表示されている要素だけで、アイコンカード内の中央にまとまって見えるようにしてください。

### 表示状態ごとの期待

| 種別バッジ | ファイル名 | 期待表示                            |
| ----- | ----- | ------------------------------- |
| ON    | ON    | 既存に近い表示。バッジは左上、アイコンと名前はバランスよく配置 |
| OFF   | ON    | アイコン + ファイル名が中央寄せ               |
| ON    | OFF   | バッジは左上、アイコンは中央寄せ                |
| OFF   | OFF   | アイコンのみ完全中央寄せ                    |

---

## 実装方針

アイコンカードに状態別クラスを付けてください。

```jsx
const showTypeBadge = settings?.ui?.cell?.showTypeBadge ?? true;
const showFileName = settings?.ui?.cell?.showFileName ?? true;

const iconCardClassName = [
  "iconCard",
  deleteCellMode ? "deleteMode" : "",
  showTypeBadge ? "hasTypeBadge" : "noTypeBadge",
  showFileName ? "hasFileName" : "noFileName"
].filter(Boolean).join(" ");
```

JSX例:

```jsx
<div
  className={iconCardClassName}
  onClick={(event) => handleIconClick(event, item)}
  onDoubleClick={(event) => handleIconDoubleClick(event, item)}
  onContextMenu={(event) => handleItemContextMenu(event, item)}
  onMouseEnter={(event) => handleIconHoverStart(event, item)}
  onMouseLeave={handleIconHoverEnd}
>
  {showTypeBadge && (
    <div className="cellTypeBadge">
      {getExtensionLabel(item)}
    </div>
  )}

  <div className="iconVisualWrap">
    <LineIcon
      name={item.icon_name ?? iconSetting.icon}
      color={item.icon_color ?? iconSetting.strokeColor}
      size={settings?.ui?.cell?.iconSize ?? 32}
    />
  </div>

  {showFileName && (
    <div className="iconLabel">
      {getDisplayNameWithoutExtension(item)}
    </div>
  )}
</div>
```

既存のクラス名・構造が異なる場合は、現在の実装に合わせてください。

---

## CSS修正

アイコンカード内を flex レイアウトに整理してください。

```css
.iconCard,
.launcherItem,
.itemCard {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
}
```

種別バッジは従来通り左上固定で構いません。

```css
.cellTypeBadge {
  position: absolute;
  top: 6px;
  left: 7px;
  z-index: 2;
  pointer-events: none;
}
```

アイコン本体のラッパーを中央配置してください。

```css
.iconVisualWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

ラベル表示も中央にしてください。

```css
.iconLabel,
.itemName,
.launcherItemName {
  text-align: center;
  max-width: 100%;
  line-height: 1.2;
}
```

---

## 状態別の微調整

### ファイル名あり

```css
.iconCard.hasFileName,
.launcherItem.hasFileName,
.itemCard.hasFileName {
  justify-content: center;
}
```

### ファイル名なし

ファイル名がない場合は、アイコンを中央に寄せてください。

```css
.iconCard.noFileName,
.launcherItem.noFileName,
.itemCard.noFileName {
  justify-content: center;
}

.iconCard.noFileName .iconVisualWrap,
.launcherItem.noFileName .iconVisualWrap,
.itemCard.noFileName .iconVisualWrap {
  margin: 0;
}
```

### バッジなし・ファイル名なし

アイコンのみ完全中央にしてください。

```css
.iconCard.noTypeBadge.noFileName,
.launcherItem.noTypeBadge.noFileName,
.itemCard.noTypeBadge.noFileName {
  justify-content: center;
  align-items: center;
}
```

### バッジあり・ファイル名なし

バッジは左上、アイコンは中央で構いません。

```css
.iconCard.hasTypeBadge.noFileName,
.launcherItem.hasTypeBadge.noFileName,
.itemCard.hasTypeBadge.noFileName {
  justify-content: center;
}
```

---

## 完了条件

以下を実画面で確認してください。

* 種別バッジON / ファイル名ONで既存表示が崩れない
* 種別バッジOFF / ファイル名ONでアイコン+名前が中央寄せされる
* 種別バッジON / ファイル名OFFでアイコンが中央寄せされる
* 種別バッジOFF / ファイル名OFFでアイコンのみ完全中央になる
* セル幅・セル高さを小さくしても極端にズレない

---

# 2. テキストホバープレビューを、プレビュー領域から外れるまで表示保持する

## 現状

テキスト系ファイルのホバープレビューは、アイコンからマウスが離れるとすぐ消えます。

## 変更後仕様

以下のようにしてください。

1. アイコンにホバーする
2. 少し遅れてテキストプレビューが表示される
3. アイコンからプレビュー表示領域へマウスを移動しても消えない
4. プレビュー表示領域からマウスが外れたら消える
5. アイコンにもプレビューにも乗っていない状態になったら消える

つまり、**ホバーしたテキスト表示領域からカーソルを外に出さない限りは表示したまま**にしてください。

---

## 実装方針

アイコン領域とプレビュー領域の両方を hover 対象として扱ってください。

以下の state / ref を追加または修正してください。

```jsx
const [hoverPreview, setHoverPreview] = useState(null);
const hoverPreviewTimerRef = useRef(null);
const hoverPreviewCloseTimerRef = useRef(null);
const isHoveringIconRef = useRef(false);
const isHoveringPreviewRef = useRef(false);
```

---

## 閉じる処理を遅延させる

すぐ消すのではなく、短い遅延を入れて、プレビュー領域へ移動する時間を確保してください。

```jsx
function scheduleCloseHoverPreview() {
  if (hoverPreviewCloseTimerRef.current) {
    window.clearTimeout(hoverPreviewCloseTimerRef.current);
  }

  hoverPreviewCloseTimerRef.current = window.setTimeout(() => {
    if (!isHoveringIconRef.current && !isHoveringPreviewRef.current) {
      setHoverPreview(null);
    }
  }, 180);
}
```

---

## アイコン側の hover start / end

```jsx
function handleIconHoverStart(event, item) {
  isHoveringIconRef.current = true;

  if (hoverPreviewCloseTimerRef.current) {
    window.clearTimeout(hoverPreviewCloseTimerRef.current);
    hoverPreviewCloseTimerRef.current = null;
  }

  if (!item?.path) return;

  const anchorRect = event.currentTarget.getBoundingClientRect();

  if (hoverPreviewTimerRef.current) {
    window.clearTimeout(hoverPreviewTimerRef.current);
  }

  hoverPreviewTimerRef.current = window.setTimeout(async () => {
    const path = item.path;

    if (previewCacheRef.current.has(path)) {
      const cached = previewCacheRef.current.get(path);

      if (cached?.ok) {
        setHoverPreview({
          x: anchorRect.right + 10,
          y: anchorRect.top,
          item,
          ...cached
        });
      }

      return;
    }

    try {
      const result = await window.griddesk?.previewTextFile?.(path);

      previewCacheRef.current.set(path, result);

      if (result?.ok) {
        setHoverPreview({
          x: anchorRect.right + 10,
          y: anchorRect.top,
          item,
          ...result
        });
      }
    } catch (error) {
      console.debug("Text preview failed", error);
    }
  }, 400);
}
```

```jsx
function handleIconHoverEnd() {
  isHoveringIconRef.current = false;

  if (hoverPreviewTimerRef.current) {
    window.clearTimeout(hoverPreviewTimerRef.current);
    hoverPreviewTimerRef.current = null;
  }

  scheduleCloseHoverPreview();
}
```

---

## プレビュー側の mouse enter / leave

React Portal で表示している `.textHoverPreview` に以下を追加してください。

```jsx
{textHoverPreview &&
  createPortal(
    <div
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
    >
      ...
    </div>,
    document.body
  )}
```

実際の state 名が `hoverPreview` なら、`textHoverPreview` ではなく既存名に合わせてください。

---

## CSS修正

現在 `.textHoverPreview` に `pointer-events: none;` が設定されている場合、プレビュー領域の hover を拾えません。

これを変更してください。

```css
.textHoverPreview {
  pointer-events: auto;
}
```

ただし、プレビュー内でテキスト選択やクリックが不要なら、見た目だけ維持で構いません。

```css
.textHoverPreview {
  pointer-events: auto;
  user-select: text;
}
```

---

## メモリリーンアップ

コンポーネント unmount 時に timer を掃除してください。

```jsx
useEffect(() => {
  return () => {
    if (hoverPreviewTimerRef.current) {
      window.clearTimeout(hoverPreviewTimerRef.current);
    }

    if (hoverPreviewCloseTimerRef.current) {
      window.clearTimeout(hoverPreviewCloseTimerRef.current);
    }
  };
}, []);
```

---

## 完了条件

以下を実画面で確認してください。

* テキスト系ファイルにホバーするとプレビューが出る
* アイコンからプレビュー領域へカーソルを移動しても消えない
* プレビュー領域上にカーソルがある間は表示され続ける
* プレビュー領域からカーソルを外すと消える
* アイコンから離れてプレビューにも乗らない場合は消える
* フォルダやPDFなど非対象ファイルでは表示されない
* 動作が重くならない

---

# 作業後の報告形式

```text
対応結果:

1. セル表示中央寄せ
- noTypeBadge / hasTypeBadge クラス追加: OK / NG
- noFileName / hasFileName クラス追加: OK / NG
- 種別バッジOFF時の中央寄せ: OK / NG
- ファイル名OFF時の中央寄せ: OK / NG
- 両方OFF時のアイコン完全中央: OK / NG

2. テキストホバープレビュー保持
- プレビュー領域の pointer-events:auto: OK / NG
- アイコン hover と preview hover の両方を管理: OK / NG
- close timer 追加: OK / NG
- アイコンからプレビューへ移動しても保持: OK / NG
- プレビューから外れると消える: OK / NG
- timer cleanup: OK / NG

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

