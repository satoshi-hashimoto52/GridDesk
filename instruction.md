# GridDesk 追加実装指示：設定内に「セル設定」を追加

GridDesk の設定画面に、新しく「セル設定」セクションを追加してください。

今回は以下のみ対応してください。

1. 設定画面に「セル設定」セクションを追加
2. セルサイズ、間隔、アイコンサイズ、ラベル表示などを設定可能にする
3. 設定値を `settings.json` に保存・復元する
4. 設定変更を中央セル表示へ即時反映する

## 禁止事項

今回は以下を触らないでください。

- 右クリックメニュー
- ファイル/フォルダ起動処理
- 削除モード
- DBスキーマ
- Electron main/preload の大規模変更
- カテゴリ管理ロジック
- ワークスペース作成処理
- 背景透過/ブラー設定の既存挙動

---

# 1. 追加する設定項目

設定画面に「セル設定」というセクションを追加してください。

設定項目は以下です。

| 項目 | 型 | 初期値 | 範囲 |
|---|---:|---:|---:|
| セル幅 | number/range | 92 | 64〜160 |
| セル高さ | number/range | 92 | 64〜160 |
| セル間隔 | number/range | 12 | 4〜32 |
| アイコンサイズ | number/range | 32 | 20〜72 |
| ラベル文字サイズ | number/range | 12 | 9〜18 |
| 種別バッジ表示 | boolean | true | - |
| ファイル名ラベル表示 | boolean | true | - |
| セル角丸 | number/range | 12 | 0〜28 |
| セル枠線の濃さ | number/range | 0.28 | 0〜1 |

---

# 2. settings.json の構造

`settings.json` の `ui` 配下に `cell` を追加してください。

```json
{
  "ui": {
    "cell": {
      "width": 92,
      "height": 92,
      "gap": 12,
      "iconSize": 32,
      "labelFontSize": 12,
      "showTypeBadge": true,
      "showFileName": true,
      "borderRadius": 12,
      "borderOpacity": 0.28
    }
  }
}
```

既存の `settings.json` に `ui.cell` がない場合は、デフォルト値で補完してください。

---

# 3. デフォルト設定の更新

`getDefaultSettings()` または既存のデフォルト設定生成処理に以下を追加してください。

```js
cell: {
  width: 92,
  height: 92,
  gap: 12,
  iconSize: 32,
  labelFontSize: 12,
  showTypeBadge: true,
  showFileName: true,
  borderRadius: 12,
  borderOpacity: 0.28
}
```

既存の `ui.opacity` や `ui.blur` は壊さないでください。

---

# 4. normalizeSettings の更新

既存設定を読み込む時、`ui.cell` の不足項目を補完してください。

例:

```js
function normalizeSettings(rawSettings) {
  const defaults = getDefaultSettings();
  const settings = structuredClone(rawSettings ?? {});

  settings.ui = {
    ...defaults.ui,
    ...(settings.ui ?? {}),
    opacity: {
      ...defaults.ui.opacity,
      ...(settings.ui?.opacity ?? {})
    },
    blur: {
      ...defaults.ui.blur,
      ...(settings.ui?.blur ?? {})
    },
    cell: {
      ...defaults.ui.cell,
      ...(settings.ui?.cell ?? {})
    }
  };

  return settings;
}
```

既存の `normalizeSettings` がある場合は、その中に `cell` 補完を統合してください。

---

# 5. CSS変数へ反映

`applyThemeVariables(settings)` にセル設定用のCSS変数を追加してください。

```js
function applyThemeVariables(settings) {
  const ui = settings?.ui ?? {};
  const cell = ui.cell ?? {};

  const root = document.documentElement;

  root.style.setProperty("--gd-cell-width", `${cell.width ?? 92}px`);
  root.style.setProperty("--gd-cell-height", `${cell.height ?? 92}px`);
  root.style.setProperty("--gd-cell-gap", `${cell.gap ?? 12}px`);
  root.style.setProperty("--gd-icon-size", `${cell.iconSize ?? 32}px`);
  root.style.setProperty("--gd-label-font-size", `${cell.labelFontSize ?? 12}px`);
  root.style.setProperty("--gd-cell-radius", `${cell.borderRadius ?? 12}px`);
  root.style.setProperty("--gd-cell-border-opacity", String(cell.borderOpacity ?? 0.28));

  // 既存の opacity / blur / icon 設定反映は維持する
}
```

---

# 6. セル表示CSSの修正

セル・アイコンカード・ラベル表示にCSS変数を使ってください。

```css
.gridCell {
  width: var(--gd-cell-width, 92px);
  height: var(--gd-cell-height, 92px);
  border-radius: var(--gd-cell-radius, 12px);
  border: 1px solid rgba(255, 255, 255, var(--gd-cell-border-opacity, 0.28));
}

.cellGrid {
  gap: var(--gd-cell-gap, 12px);
}

.iconCard,
.launcherItem,
.itemCard {
  width: var(--gd-cell-width, 92px);
  height: var(--gd-cell-height, 92px);
  border-radius: var(--gd-cell-radius, 12px);
}

.iconCard svg,
.launcherItem svg,
.itemCard svg {
  width: var(--gd-icon-size, 32px);
  height: var(--gd-icon-size, 32px);
}

.iconLabel,
.itemName,
.launcherItemName {
  font-size: var(--gd-label-font-size, 12px);
}
```

既存クラス名に合わせて統合してください。

---

# 7. cellGrid の列サイズも設定値に合わせる

現在 `gridTemplateColumns` を JS で `repeat(cols, 92px)` のように固定している場合、CSS変数に変更してください。

悪い例:

```jsx
style={{
  gridTemplateColumns: `repeat(${category.cols}, 92px)`
}}
```

良い例:

```jsx
style={{
  gridTemplateColumns: `repeat(${category.cols}, var(--gd-cell-width, 92px))`,
  gridTemplateRows: `repeat(${category.rows}, var(--gd-cell-height, 92px))`,
  gap: "var(--gd-cell-gap, 12px)"
}}
```

---

# 8. 種別バッジ表示のON/OFF

セル左上に `.pdf`, `.app`, `Folder`, `URL` などを表示している箇所に、設定を反映してください。

```jsx
const showTypeBadge = settings?.ui?.cell?.showTypeBadge ?? true;
```

表示側:

```jsx
{showTypeBadge && (
  <div className="cellTypeBadge">
    {getExtensionLabel(item)}
  </div>
)}
```

---

# 9. ファイル名ラベル表示のON/OFF

アイコン下のファイル名ラベル表示にも設定を反映してください。

```jsx
const showFileName = settings?.ui?.cell?.showFileName ?? true;
```

表示側:

```jsx
{showFileName && (
  <div className="iconLabel">
    {getDisplayNameWithoutExtension(item)}
  </div>
)}
```

---

# 10. 設定画面UI

設定画面に「セル設定」セクションを追加してください。

配置場所は、表示設定やアイコン設定の近くで構いません。

例:

```jsx
<section className="settingsSection">
  <h3>セル設定</h3>

  <label>
    セル幅
    <input
      type="range"
      min="64"
      max="160"
      step="1"
      value={settings.ui.cell.width}
      onChange={(event) =>
        updateSettingsLocal((prev) => ({
          ...prev,
          ui: {
            ...prev.ui,
            cell: {
              ...prev.ui.cell,
              width: Number(event.target.value)
            }
          }
        }))
      }
    />
  </label>

  <label>
    セル高さ
    <input
      type="range"
      min="64"
      max="160"
      step="1"
      value={settings.ui.cell.height}
      onChange={(event) =>
        updateSettingsLocal((prev) => ({
          ...prev,
          ui: {
            ...prev.ui,
            cell: {
              ...prev.ui.cell,
              height: Number(event.target.value)
            }
          }
        }))
      }
    />
  </label>
</section>
```

同様に以下も追加してください。

* セル間隔
* アイコンサイズ
* ラベル文字サイズ
* 種別バッジ表示
* ファイル名ラベル表示
* セル角丸
* セル枠線の濃さ

---

# 11. 設定更新関数

既存の `updateSettingsLocal` / `saveSettings` / `scheduleSaveSettings` を使ってください。

新しく保存処理を重複実装しないでください。

設定変更時は以下を満たしてください。

* React state が即時更新される
* CSS変数に即時反映される
* settings.json に保存される
* アプリ再起動後も復元される

---

# 12. UI例

設定画面では以下のような表示にしてください。

```text
セル設定

セル幅              [----●-------] 92
セル高さ            [----●-------] 92
セル間隔            [--●---------] 12
アイコンサイズ      [----●-------] 32
ラベル文字サイズ    [--●---------] 12
種別バッジ表示      [ON/OFF]
ファイル名表示      [ON/OFF]
セル角丸            [----●-------] 12
セル枠線の濃さ      [----●-------] 0.28
```

数値が分かるように、スライダー横に現在値を表示してください。

---

# 13. 完了条件

以下を実画面で確認してください。

## 設定画面

* 設定内に「セル設定」が表示される
* セル幅を変更できる
* セル高さを変更できる
* セル間隔を変更できる
* アイコンサイズを変更できる
* ラベル文字サイズを変更できる
* 種別バッジ表示をON/OFFできる
* ファイル名表示をON/OFFできる
* セル角丸を変更できる
* セル枠線の濃さを変更できる

## 中央セル表示

* セル幅変更が即時反映される
* セル高さ変更が即時反映される
* セル間隔変更が即時反映される
* アイコンサイズ変更が即時反映される
* ラベル文字サイズ変更が即時反映される
* 種別バッジOFFで `.pdf` / `Folder` などが消える
* ファイル名表示OFFで名前ラベルが消える
* セル角丸変更が即時反映される
* セル枠線の濃さが即時反映される

## 保存/復元

* 設定変更後、settings.json に保存される
* アプリ再起動後もセル設定が維持される

---

# 14. 作業後の報告形式

```text
対応結果:

設定内セル設定追加:
- settings.json デフォルト追加: OK / NG
- normalizeSettings 補完追加: OK / NG
- applyThemeVariables CSS変数追加: OK / NG
- 設定画面UI追加: OK / NG
- セル幅即時反映: OK / NG
- セル高さ即時反映: OK / NG
- セル間隔即時反映: OK / NG
- アイコンサイズ即時反映: OK / NG
- ラベル文字サイズ即時反映: OK / NG
- 種別バッジON/OFF: OK / NG
- ファイル名ON/OFF: OK / NG
- セル角丸即時反映: OK / NG
- セル枠線濃さ即時反映: OK / NG
- settings.json 保存/復元: OK / NG

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
