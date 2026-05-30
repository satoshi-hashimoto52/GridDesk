# GridDesk 修正指示：ウィンドウボタン・自動起動・削除済みセル復活削除・カテゴリ色・カテゴリ項目折りたたみ

今回は以下の5点だけ対応してください。

1. ウィンドウボタンの色と実際のボタン位置がずれている問題を修正する
2. 設定に「PC起動時に自動起動する」ON/OFFを追加する。デフォルトOFF
3. 設定内の「削除済みセル復活」ボタンと機能を削除する
4. 左サイドバーのカテゴリ管理で、カテゴリごとのタブ色を変更できるようにする
5. 左サイドバーのカテゴリ管理で、カテゴリごとの項目を個別に折りたためるようにする

## 禁止事項

今回は以下を触らないでください。

- ファイル/フォルダ起動処理
- 右クリックメニュー
- 削除モード
- セル登録ロジック
- ドラッグ移動
- 背景透過/ブラー
- セル設定
- ウィンドウ幅自動フィット
- DBスキーマの不要な変更

---

# 1. ウィンドウボタンの色と実際のボタン位置のずれ修正

## 症状

ウィンドウボタン3つに色は付いていますが、色付きの丸と実際にクリックできるボタン位置がずれています。

## 原因候補

- button本体とは別の疑似要素に色を付けている
- buttonの中のspanだけに色が付いている
- absolute配置の色丸とbutton位置がずれている
- padding/marginによりクリック領域と表示位置が一致していない

## 期待仕様

赤・黄・緑の丸そのものがクリック可能領域になること。  
見えている丸と実際のボタン領域が完全に一致すること。

## 実装方針

ウィンドウボタンは、別要素や疑似要素ではなく、`button` 自体に色を付けてください。

### JSX例

```jsx
<div className="windowControls">
  <button
    type="button"
    className="windowButton windowClose"
    aria-label="閉じる"
    onClick={handleCloseWindow}
  />
  <button
    type="button"
    className="windowButton windowMinimize"
    aria-label="最小化"
    onClick={handleMinimizeWindow}
  />
  <button
    type="button"
    className="windowButton windowMaximize"
    aria-label="最大化"
    onClick={handleToggleMaximizeWindow}
  />
</div>
```

### CSS

```css
.windowControls {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.windowButton {
  width: 12px;
  height: 12px;
  min-width: 12px;
  min-height: 12px;
  max-width: 12px;
  max-height: 12px;
  padding: 0;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  cursor: pointer;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  background-clip: padding-box;
  -webkit-app-region: no-drag;
}

.windowButton.windowClose {
  background: #ff5f57;
}

.windowButton.windowMinimize {
  background: #ffbd2e;
}

.windowButton.windowMaximize {
  background: #28c840;
}

.windowButton:hover {
  filter: brightness(0.94);
}
```

## 注意

以下のような実装は避けてください。

```css
.windowButton::before {
  background: red;
}
```

疑似要素ではなく、button自体に背景色を付けてください。

## 完了条件

* 赤丸そのものをクリックすると閉じる
* 黄丸そのものをクリックすると最小化
* 緑丸そのものをクリックすると最大化/復元
* 見えている丸とクリック可能領域がずれていない

---

# 2. PC起動時に自動起動する設定を追加

## 目的

設定画面に「PC起動時に自動起動する」ON/OFFを追加してください。
デフォルトはOFFです。

## 設定保存

`settings.json` に以下を追加してください。

```json
{
  "system": {
    "openAtLogin": false
  }
}
```

既存の設定構造に合わせても構いませんが、ユーザー設定として保存してください。

## デフォルト設定

`getDefaultSettings()` または既存のデフォルト設定に追加してください。

```js
system: {
  openAtLogin: false
}
```

既存 settings.json に `system.openAtLogin` がない場合は `false` で補完してください。

---

## Electron main 側

Electron の `app.setLoginItemSettings()` / `app.getLoginItemSettings()` を使ってください。

`electron/main.cjs` に IPC を追加してください。

```js
const { app, ipcMain } = require("electron");

ipcMain.handle("system:getOpenAtLogin", async () => {
  const settings = app.getLoginItemSettings();
  return {
    ok: true,
    openAtLogin: Boolean(settings.openAtLogin)
  };
});

ipcMain.handle("system:setOpenAtLogin", async (_event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled)
    });

    const settings = app.getLoginItemSettings();

    return {
      ok: true,
      openAtLogin: Boolean(settings.openAtLogin)
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message ?? error)
    };
  }
});
```

macOS / Windows での動作差はありますが、まずは Electron 標準APIで実装してください。

---

## preload

`electron/preload.cjs` の `window.griddesk` に追加してください。

```js
getOpenAtLogin: () => ipcRenderer.invoke("system:getOpenAtLogin"),
setOpenAtLogin: (enabled) => ipcRenderer.invoke("system:setOpenAtLogin", enabled)
```

既存APIを消さないでください。

---

## Renderer設定画面

設定画面に以下の項目を追加してください。

```jsx
<label className="settingsCheckRow">
  <input
    type="checkbox"
    checked={settings?.system?.openAtLogin ?? false}
    onChange={async (event) => {
      const enabled = event.target.checked;

      updateSettingsLocal((prev) => ({
        ...prev,
        system: {
          ...(prev.system ?? {}),
          openAtLogin: enabled
        }
      }));

      const result = await window.griddesk?.setOpenAtLogin?.(enabled);

      if (result?.ok === false) {
        alert(result.error || "自動起動設定の変更に失敗しました");
      }
    }}
  />
  <span>PC起動時に自動起動する</span>
</label>
```

起動時または設定画面表示時に、可能なら実OS側の状態も確認してください。

```jsx
useEffect(() => {
  window.griddesk?.getOpenAtLogin?.().then((result) => {
    if (!result?.ok) return;

    updateSettingsLocal((prev) => ({
      ...prev,
      system: {
        ...(prev.system ?? {}),
        openAtLogin: result.openAtLogin
      }
    }));
  });
}, []);
```

ただし、settings保存と競合しないよう注意してください。

## 完了条件

* 設定画面に「PC起動時に自動起動する」が表示される
* 初期値はOFF
* ON/OFF変更が settings.json に保存される
* Electron の `app.setLoginItemSettings()` が呼ばれる
* 再起動後も設定表示が維持される

---

# 3. 設定の「削除済みセル復活」ボタンと機能を削除

## 目的

設定内にある「削除済みセル復活」ボタンと機能を削除してください。

## 削除対象

設定画面内の以下に相当するUIを削除してください。

```text
削除済みセルを復活
削除済みセルを全て復活
Restore deleted cells
restore disabled cells
```

## 関数削除または未使用化

以下のような関数が設定画面専用で使われている場合は削除してください。

```text
restoreAllDeletedCells
restoreDisabledCells
clearDisabledCells
handleRestoreCells
```

ただし、**登録時・移動時に削除済みセルを自動復活させる内部機能は残してください。**

重要:

* 設定画面の手動復活ボタンだけ削除
* 登録/移動時の自動復活は削除しない
* disabled_cells テーブルや自動復活IPCを削除しない

## 完了条件

* 設定画面から削除済みセル復活ボタンが消えている
* 登録/移動時の削除済みセル自動復活は維持されている

---

# 4. カテゴリごとのタブ色を変更できるようにする

## 目的

左サイドバーのカテゴリ管理で、カテゴリごとのタブ色を変更できるようにしてください。

ここでいう「タブ色」は、中央セル側のカテゴリカード/カテゴリタブ/カテゴリヘッダーに反映される色です。
実装上の該当UIに合わせてください。

## DB/データ構造

カテゴリに色を保存する項目がすでにあるか確認してください。

検索:

```text
accent_color
accentColor
color
categoryColor
genre color
```

既に `accent_color` / `accentColor` がある場合はそれを使ってください。

なければ、カテゴリデータに色を保存する必要があります。

SQLite例:

```sql
ALTER TABLE genres ADD COLUMN accent_color TEXT DEFAULT '#60a5fa';
```

または実際のテーブル名が `categories` なら:

```sql
ALTER TABLE categories ADD COLUMN accent_color TEXT DEFAULT '#60a5fa';
```

既存のスキーマ命名に合わせてください。
すでにカラムがある場合は追加しないでください。

## カテゴリ管理UI

左サイドバーのカテゴリ管理で、変更対象カテゴリに対して色を変更できるようにしてください。

例:

```jsx
<label>
  タブ色
  <input
    type="color"
    value={selectedCategory?.accent_color ?? selectedCategory?.accentColor ?? "#60a5fa"}
    onChange={(event) => updateSelectedCategoryColor(event.target.value)}
  />
</label>
```

## 更新処理

既存のカテゴリ更新APIを使ってください。

候補:

```text
updateCategory
updateGenre
category:update
genre:update
```

色変更時に保存してください。

```jsx
async function updateSelectedCategoryColor(color) {
  if (!selectedManageCategoryId) return;

  await updateCategory(selectedManageCategoryId, {
    accent_color: color
  });

  await reloadWorkspaceData();
}
```

既存の命名に合わせてください。

## 表示反映

中央セル側のカテゴリカード/ヘッダーに色を反映してください。

例:

```jsx
<div
  className="genreCard"
  style={{
    "--category-accent-color": category.accent_color ?? "#60a5fa"
  }}
>
```

CSS:

```css
.genreCard {
  border-color: color-mix(in srgb, var(--category-accent-color, #60a5fa) 45%, transparent);
}

.genreHeader,
.genreCardHeader {
  border-left: 4px solid var(--category-accent-color, #60a5fa);
}

.genreTitle {
  color: var(--category-accent-color, inherit);
}
```

`color-mix()` の互換性が気になる場合は、単純に以下でも構いません。

```css
.genreCard {
  border-color: var(--category-accent-color, var(--gd-border-subtle));
}

.genreHeader,
.genreCardHeader {
  border-left: 4px solid var(--category-accent-color, #60a5fa);
}
```

## 完了条件

* カテゴリ管理でカテゴリごとの色を変更できる
* 色はDBに保存される
* アプリ再起動後も色が残る
* 中央セルのカテゴリタブ/ヘッダー/カードに色が反映される

---

# 5. カテゴリ管理で項目ごとに個別折りたたみできるようにする

## 目的

左サイドバーのカテゴリ管理内で、カテゴリ操作項目をさらに個別に折りたためるようにしてください。

ユーザー要望:
「左サイドバーのカテゴリ管理で項目毎に他宛に折りたためるようにする」

これは、カテゴリ管理セクション内の以下のような項目を個別に折りたためるようにする意味として実装してください。

## 対象項目

カテゴリ管理内を以下のサブセクションに分けてください。

```text
カテゴリ追加
カテゴリ変更
グリッド設定
タブ色設定
```

可能なら現在のUIに合わせて調整してください。

## JSX例

```jsx
<div className="categoryManageSubsections">
  <details className="sidebarSubsection" open>
    <summary className="sidebarSubsectionHeader">
      <span>カテゴリ追加</span>
      <span className="sidebarSectionChevron">›</span>
    </summary>
    <div className="sidebarSubsectionBody">
      ...
    </div>
  </details>

  <details className="sidebarSubsection" open>
    <summary className="sidebarSubsectionHeader">
      <span>カテゴリ変更</span>
      <span className="sidebarSectionChevron">›</span>
    </summary>
    <div className="sidebarSubsectionBody">
      ...
    </div>
  </details>

  <details className="sidebarSubsection" open>
    <summary className="sidebarSubsectionHeader">
      <span>グリッド設定</span>
      <span className="sidebarSectionChevron">›</span>
    </summary>
    <div className="sidebarSubsectionBody">
      ...
    </div>
  </details>

  <details className="sidebarSubsection" open>
    <summary className="sidebarSubsectionHeader">
      <span>タブ色設定</span>
      <span className="sidebarSectionChevron">›</span>
    </summary>
    <div className="sidebarSubsectionBody">
      ...
    </div>
  </details>
</div>
```

## CSS

```css
.sidebarSubsection {
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 9px;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.10);
}

.sidebarSubsectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 8px 9px;
  font-size: 12px;
  font-weight: 700;
}

.sidebarSubsectionBody {
  padding: 8px 9px 10px;
}

.sidebarSubsection summary::-webkit-details-marker {
  display: none;
}

.sidebarSubsection[open] .sidebarSectionChevron {
  transform: rotate(90deg);
}
```

## 折りたたみ状態保存

可能なら `settings.json` に保存してください。

例:

```json
{
  "ui": {
    "categoryManageSections": {
      "add": true,
      "edit": true,
      "grid": true,
      "color": true
    }
  }
}
```

MVPでは `<details>` のブラウザ標準開閉だけでも構いませんが、可能なら保存してください。

## 完了条件

* カテゴリ管理内にサブセクションができている
* カテゴリ追加を折りたためる
* カテゴリ変更を折りたためる
* グリッド設定を折りたためる
* タブ色設定を折りたためる
* 各サブセクション右端に `>` がある
* 既存のカテゴリ追加/変更/列数/行数変更は壊れていない

---

# 作業後の報告形式

```text
対応結果:

1. ウィンドウボタンずれ修正
- button自体への色付け: OK / NG
- 表示位置とクリック領域一致: OK / NG
- close/minimize/maximize 動作維持: OK / NG

2. PC起動時自動起動設定
- settings.json デフォルトOFF追加: OK / NG
- normalizeSettings 補完: OK / NG
- 設定UI追加: OK / NG
- main IPC追加: OK / NG
- preload API追加: OK / NG
- app.setLoginItemSettings 呼び出し: OK / NG

3. 削除済みセル復活ボタン削除
- 設定UIから削除: OK / NG
- 手動復活機能削除/未使用化: OK / NG
- 登録/移動時の自動復活維持: OK / NG

4. カテゴリタブ色変更
- 色保存カラム確認/追加: OK / NG
- カテゴリ管理UI追加: OK / NG
- 色保存: OK / NG
- 中央カテゴリ表示への反映: OK / NG

5. カテゴリ管理内サブセクション折りたたみ
- カテゴリ追加: OK / NG
- カテゴリ変更: OK / NG
- グリッド設定: OK / NG
- タブ色設定: OK / NG
- 既存操作維持: OK / NG

変更ファイル:
- src/App.jsx:
- src/styles.css:
- electron/main.cjs:
- electron/preload.cjs:
- その他:

確認:
- npm run build:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:
```
