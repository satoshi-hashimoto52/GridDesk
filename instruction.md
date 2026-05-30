# GridDesk 修正指示：セル設定の追加調整とウィンドウ幅自動フィット修正

今回は以下の2点のみ対応してください。

1. セル設定の「ラベル文字サイズ」をもっと小さく設定できるようにする
2. セル設定で「ラベル文字のフォント」を選択できるようにする
3. セル幅・セル高さ・セル間隔を小さくした後、ウィンドウ幅自動フィットが追従しない問題を修正する

## 禁止事項

今回は以下を触らないでください。

* 右クリックメニュー
* ファイル/フォルダ起動処理
* 削除モード
* DBスキーマ
* Electron main/preload の大規模変更
* 背景透過/ブラー
* サイドバー構造
* カテゴリ管理ロジック
* アイコン編集機能
* ドラッグ移動処理

---

# 1. ラベル文字サイズをもっと小さくできるようにする

## 現状

セル設定に「ラベル文字サイズ」がありますが、最小値がまだ大きいです。

## 変更後仕様

ラベル文字サイズの設定範囲を以下に変更してください。

| 項目           |   現在 | 変更後 |
| ------------ | ---: | --: |
| ラベル文字サイズ min |  9程度 |   6 |
| ラベル文字サイズ max | 18程度 |  18 |
| step         |    1 |   1 |
| 初期値          |   12 |  12 |

## 修正対象

設定画面の `labelFontSize` range input を確認し、`min="6"` にしてください。

例:

```jsx
<input
  type="range"
  min="6"
  max="18"
  step="1"
  value={settings.ui.cell.labelFontSize}
  onChange={(event) =>
    updateSettingsLocal((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        cell: {
          ...prev.ui.cell,
          labelFontSize: Number(event.target.value)
        }
      }
    }))
  }
/>
```

## 完了条件

* ラベル文字サイズを 6px まで下げられる
* 中央セルのファイル名ラベルに即時反映される
* settings.json に保存される
* 再起動後も維持される

---

# 2. ラベル文字フォントを選択できるようにする

## 追加仕様

セル設定に「ラベルフォント」を追加してください。

ユーザーが中央セルのファイル名ラベルに使うフォントを選択できるようにします。

## settings.json 構造

`ui.cell` に `labelFontFamily` を追加してください。

```json
{
  "ui": {
    "cell": {
      "labelFontFamily": "system"
    }
  }
}
```

## デフォルト設定

`getDefaultSettings()` または既存のデフォルト設定に追加してください。

```js
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
```

既存の `ui.cell` 設定を壊さないでください。

---

## normalizeSettings の更新

既存 settings.json に `labelFontFamily` がない場合は、`system` で補完してください。

```js
cell: {
  ...defaults.ui.cell,
  ...(settings.ui?.cell ?? {})
}
```

この補完の中で `labelFontFamily` が入るようにしてください。

---

## フォント選択肢

設定画面の「セル設定」に select を追加してください。

選択肢はまず以下でお願いします。

```text
system
sans
serif
mono
rounded
```

表示ラベルは日本語で構いません。

| value   | 表示名      | CSS                                                                         |
| ------- | -------- | --------------------------------------------------------------------------- |
| system  | システム     | system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif        |
| sans    | ゴシック     | "Helvetica Neue", Arial, sans-serif                                         |
| serif   | 明朝/Serif | Georgia, "Times New Roman", serif                                           |
| mono    | 等幅       | "SFMono-Regular", Consolas, "Liberation Mono", monospace                    |
| rounded | 丸ゴシック風   | ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif |

## 設定UI例

```jsx
<label>
  ラベルフォント
  <select
    value={settings.ui.cell.labelFontFamily ?? "system"}
    onChange={(event) =>
      updateSettingsLocal((prev) => ({
        ...prev,
        ui: {
          ...prev.ui,
          cell: {
            ...prev.ui.cell,
            labelFontFamily: event.target.value
          }
        }
      }))
    }
  >
    <option value="system">システム</option>
    <option value="sans">ゴシック</option>
    <option value="serif">明朝/Serif</option>
    <option value="mono">等幅</option>
    <option value="rounded">丸ゴシック風</option>
  </select>
</label>
```

---

## CSS変数へ反映

`applyThemeVariables(settings)` に `--gd-label-font-family` を追加してください。

```js
function getLabelFontFamilyValue(fontFamily) {
  if (fontFamily === "sans") {
    return `"Helvetica Neue", Arial, sans-serif`;
  }

  if (fontFamily === "serif") {
    return `Georgia, "Times New Roman", serif`;
  }

  if (fontFamily === "mono") {
    return `"SFMono-Regular", Consolas, "Liberation Mono", monospace`;
  }

  if (fontFamily === "rounded") {
    return `ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif`;
  }

  return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}
```

```js
root.style.setProperty(
  "--gd-label-font-family",
  getLabelFontFamilyValue(cell.labelFontFamily ?? "system")
);
```

---

## ラベルCSSへ適用

中央セルのファイル名ラベルに適用してください。

既存クラス名に合わせてください。

```css
.iconLabel,
.itemName,
.launcherItemName {
  font-size: var(--gd-label-font-size, 12px);
  font-family: var(--gd-label-font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}
```

必要なら種別バッジにも同じフォントを適用して構いません。

```css
.cellTypeBadge {
  font-family: var(--gd-label-font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}
```

---

# 3. セルサイズ変更後、ウィンドウ幅自動フィットが追従しない問題を修正

## 現状

セル幅・セル高さを小さくした後、中央セルグリッドの表示サイズは小さくなるが、Electronウィンドウ幅の自動フィットが追従していません。

特にセル幅を小さくした時に、アプリウィンドウ幅が以前の大きい幅のまま残ります。

## 原因候補

以下の可能性があります。

* 自動フィット処理の `useEffect` 依存配列に `settings.ui.cell.width` / `height` / `gap` が入っていない
* ResizeObserver が `genreList` のサイズ変更を検知できていない
* CSS変数変更だけでは `scrollWidth` の再計測タイミングが遅い
* `requestFitWindowWidth()` がセル設定変更後に呼ばれていない
* setWindowWidth に前回より小さい値を送っていない

---

## 修正方針

セル設定の以下が変更された時、必ずウィンドウ幅自動フィットを再計算してください。

```text
cell.width
cell.height
cell.gap
cell.iconSize
cell.labelFontSize
cell.labelFontFamily
showTypeBadge
showFileName
```

特に重要なのは以下です。

```text
cell.width
cell.gap
showFileName
labelFontSize
labelFontFamily
```

---

## useEffect 依存配列の修正

`requestFitWindowWidth()` を呼ぶ `useEffect` を確認し、セル設定を依存配列に追加してください。

例:

```jsx
const cellSettings = settings?.ui?.cell ?? {};

useEffect(() => {
  if (settings?.ui?.autoFitWindowWidth === false) return;

  const timer = window.setTimeout(() => {
    requestFitWindowWidth();
  }, 120);

  return () => window.clearTimeout(timer);
}, [
  sidebarCollapsed,
  categories,
  items,
  cellSettings.width,
  cellSettings.height,
  cellSettings.gap,
  cellSettings.iconSize,
  cellSettings.labelFontSize,
  cellSettings.labelFontFamily,
  cellSettings.showTypeBadge,
  cellSettings.showFileName
]);
```

既存の state 名が `genres`, `workspace`, `items` などの場合は実装に合わせてください。

---

## requestFitWindowWidth の計測を見直す

`genreListRef.current.scrollWidth` が古い値を返す場合があります。
計測時は `getBoundingClientRect().width` と `scrollWidth` の両方を見て、必要に応じて小さい幅にも追従できるようにしてください。

```jsx
function requestFitWindowWidth() {
  if (settings?.ui?.autoFitWindowWidth === false) return;

  const sidebarWidth = sidebarRef.current?.getBoundingClientRect().width ?? 0;

  const genreListEl = genreListRef.current;
  if (!genreListEl) return;

  const rectWidth = genreListEl.getBoundingClientRect().width;
  const scrollWidth = genreListEl.scrollWidth;

  const genreWidth = Math.max(rectWidth, scrollWidth);

  const padding = 48;
  const minWidth = 520;
  const maxWidth = Math.min(window.screen.availWidth, 1800);

  const nextWidth = Math.round(
    Math.max(
      minWidth,
      Math.min(maxWidth, sidebarWidth + genreWidth + padding)
    )
  );

  console.debug("GridDesk fit window width", {
    sidebarWidth,
    rectWidth,
    scrollWidth,
    genreWidth,
    nextWidth
  });

  window.griddesk?.setWindowWidth?.(nextWidth);
}
```

ただし、`genreList` が `min-width: 100%` のままだと小さくなりません。CSSも必ず確認してください。

---

## CSSの確認

以下のように、中央の中身が画面幅に引き伸ばされないようにしてください。

```css
.genreList {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  width: max-content;
  min-width: 0;
}

.genreCard {
  width: max-content;
  min-width: unset;
  max-width: none;
  align-self: flex-start;
}

.cellGrid {
  display: grid;
  width: max-content;
}
```

以下が残っている場合は削除または修正してください。

```css
.genreList {
  min-width: 100%;
}

.genreCard {
  width: 100%;
}
```

---

## CSS変数変更後に次フレームで再計測する

CSS変数の反映直後はレイアウト値が更新前の場合があります。
`requestAnimationFrame` を使って再計測してください。

```jsx
function scheduleFitWindowWidth() {
  if (settings?.ui?.autoFitWindowWidth === false) return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      requestFitWindowWidth();
    });
  });
}
```

useEffect からは `scheduleFitWindowWidth()` を呼んでください。

```jsx
useEffect(() => {
  scheduleFitWindowWidth();
}, [
  sidebarCollapsed,
  categories,
  items,
  cellSettings.width,
  cellSettings.height,
  cellSettings.gap,
  cellSettings.iconSize,
  cellSettings.labelFontSize,
  cellSettings.labelFontFamily,
  cellSettings.showTypeBadge,
  cellSettings.showFileName
]);
```

---

## ResizeObserver も維持

既存の ResizeObserver がある場合は維持してください。
ただし、ResizeObserver だけに頼らず、セル設定変更時にも明示的に再計測してください。

```jsx
useEffect(() => {
  if (!genreListRef.current) return;

  const observer = new ResizeObserver(() => {
    scheduleFitWindowWidth();
  });

  observer.observe(genreListRef.current);

  return () => observer.disconnect();
}, []);
```

---

# 4. 完了条件

## ラベル文字サイズ

* ラベル文字サイズを 6px まで小さくできる
* 中央セルの表示に即時反映される
* settings.json に保存される
* 再起動後も維持される

## ラベルフォント

* セル設定に「ラベルフォント」が表示される
* システム / ゴシック / 明朝 / 等幅 / 丸ゴシック風 を選べる
* 中央セルのファイル名ラベルに即時反映される
* settings.json に保存される
* 再起動後も維持される

## ウィンドウ幅自動フィット

* セル幅を小さくすると、ウィンドウ幅も小さく再調整される
* セル幅を大きくすると、必要に応じてウィンドウ幅も広がる
* セル間隔を小さくすると、ウィンドウ幅も再調整される
* ファイル名表示OFF時にも、必要幅が再計算される
* ラベル文字サイズ変更後も、必要幅が再計算される
* サイドバー折りたたみ/展開後も再計算される
* 高さは変更されない

---

# 5. 作業後の報告形式

```text
対応結果:

ラベル文字サイズ拡張:
- min 6px 対応: OK / NG
- 即時反映: OK / NG
- settings.json 保存/復元: OK / NG

ラベルフォント選択:
- labelFontFamily デフォルト追加: OK / NG
- normalizeSettings 補完: OK / NG
- 設定UI追加: OK / NG
- CSS変数反映: OK / NG
- 中央セルラベル反映: OK / NG
- settings.json 保存/復元: OK / NG

ウィンドウ幅自動フィット修正:
- セル設定を useEffect 依存配列に追加: OK / NG
- CSS変数変更後の再計測: OK / NG
- requestAnimationFrame による再計測: OK / NG
- ResizeObserver 維持: OK / NG
- セル幅縮小後のウィンドウ幅縮小確認: OK / NG
- セル幅拡大後のウィンドウ幅拡大確認: OK / NG

変更ファイル:
- src/App.jsx:
- src/styles.css:
- electron/main.cjs:
- その他:

確認:
- npm run build:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:
```