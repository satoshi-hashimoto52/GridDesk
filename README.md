# GridDesk 修正指示

添付スクリーンショットと作業履歴を確認しました。  
以下を修正してください。

## 配布ビルド

GridDesk の配布物は `electron-builder` で作成します。

```bash
npm run dist:dir
npm run dist:mac
npm run dist:win
```

成果物は `release/` に出力されます。macOS は `build/icon.icns`、Windows は `build/icon.ico` を使用する設定です。詳細は `docs/build.md` を参照してください。

---

# 修正事項

1. 中央セル領域と左サイドバーが縦スクロールしない問題を修正する
2. 背景が完全透明になっているため、背景透過を設定項目として復活させる
3. 背景にもブラー処理を適用する
4. 最上段の重複しているアプリ名・設定アイコンを削除する
5. `GridDesk / No workspace open / + New / Open / Backup / Reveal` の行を、macOS ウィンドウボタンと重ならない位置へ上げて、余分な縦スペースを詰める
6. 左サイドバー折りたたみ時の上2つのアイコンを削除する
7. 左サイドバーのアイコンを変更する
8. 左サイドバーのラベル `ジャンル管理` を `カテゴリ管理` に変更する

---

# 1. 中央セル領域と左サイドバーのスクロール修正

## 現状

- 左サイドバーの高さが不足しても縦スクロールしない
- 中央セル領域も高さ不足時に縦スクロールしない
- 横幅不足時の横スクロールも不安定

## 原因候補

Flex レイアウトの親要素に `min-height: 0` / `min-width: 0` が不足している可能性が高いです。  
Electron / React の全画面レイアウトでは、以下のように **すべての親階層に `min-height: 0` を入れる**必要があります。

## 修正方針

`src/styles.css` で、以下のようにレイアウト階層を整理してください。  
既存クラス名に合わせて統合してください。

```css
html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  background: transparent !important;
  overflow: hidden;
}

.appShell {
  width: 100%;
  height: 100vh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent !important;
}

.appBody,
.workspace,
.mainLayout {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  overflow: hidden;
  background: transparent !important;
}

.sidebar {
  width: 320px;
  min-width: 280px;
  max-width: 380px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
}

.sidebarScroll {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
}

.mainContent,
.gridArea,
.workspaceContent {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent !important;
}

.gridScroll {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 18px;
  box-sizing: border-box;
}

.genreList {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: max-content;
  min-width: 100%;
}

.genreCard {
  width: max-content;
  min-width: 520px;
  max-width: none;
}

.cellGrid {
  display: grid;
  width: max-content;
}
```

## JSX構造の確認

中央領域が以下のような構造になっているか確認してください。

```jsx
<div className="appShell">
  <Header />
  <div className="appBody">
    <aside className="sidebar">
      <div className="sidebarScroll">
        ...
      </div>
    </aside>

    <main className="mainContent">
      <div className="gridScroll">
        <div className="genreList">
          ...
        </div>
      </div>
    </main>
  </div>
</div>
```

`gridScroll` が存在しない場合は追加してください。
中央セル表示を直接 `mainContent` に置かず、必ず `gridScroll` で包んでください。

## スクロールバー

必要な場合だけスクロールバーが出るようにしてください。

```css
.sidebarScroll,
.gridScroll {
  scrollbar-gutter: stable;
}

.sidebarScroll::-webkit-scrollbar,
.gridScroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.sidebarScroll::-webkit-scrollbar-thumb,
.gridScroll::-webkit-scrollbar-thumb {
  background: rgba(80, 90, 100, 0.45);
  border-radius: 999px;
}

.sidebarScroll::-webkit-scrollbar-track,
.gridScroll::-webkit-scrollbar-track {
  background: transparent;
}
```

---

# 2. 背景透過設定を復活させる

## 現状

前回修正で `.appShell` などを完全透明にしたため、背景が完全透明になっている。
ユーザー設定で背景の透過度を調整できるように戻してください。

ただし、`.appShell` 自体に直接背景を持たせるのではなく、**専用の背景オーバーレイ要素**を使ってください。

## JSX追加

`App.jsx` の `.appShell` 直下、実UIより前に背景オーバーレイを追加してください。

```jsx
<div className="appShell">
  <div className="appBackgroundOverlay" />
  <div className="appContent">
    ...
  </div>
</div>
```

既存の `Header` / `appBody` は `.appContent` の中に入れてください。

## CSS

```css
.appShell {
  position: relative;
  width: 100%;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background: transparent !important;
}

.appBackgroundOverlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(246, 247, 244, var(--gd-app-bg-opacity, 0));
  backdrop-filter: var(--gd-background-blur, none);
  -webkit-backdrop-filter: var(--gd-background-blur, none);
  z-index: 0;
}

.appContent {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent !important;
}
```

## 設定値

`settings.json` / default settings に以下を明確に持たせてください。

```json
{
  "ui": {
    "opacity": {
      "appBackground": 0.25,
      "sidebar": 0.85,
      "panel": 0.85,
      "cell": 0.65,
      "iconCard": 0.85
    },
    "blur": {
      "enabled": true,
      "amount": 12,
      "backgroundEnabled": true,
      "backgroundAmount": 10
    }
  }
}
```

## applyThemeVariables 修正

```js
function applyThemeVariables(settings) {
  const ui = settings?.ui ?? {};
  const opacity = ui.opacity ?? {};
  const blur = ui.blur ?? {};

  const root = document.documentElement;

  root.style.setProperty("--gd-app-bg-opacity", String(opacity.appBackground ?? 0.25));
  root.style.setProperty("--gd-sidebar-opacity", String(opacity.sidebar ?? 0.85));
  root.style.setProperty("--gd-panel-opacity", String(opacity.panel ?? 0.85));
  root.style.setProperty("--gd-cell-opacity", String(opacity.cell ?? 0.65));
  root.style.setProperty("--gd-icon-card-opacity", String(opacity.iconCard ?? 0.85));

  root.style.setProperty(
    "--gd-backdrop-blur",
    blur.enabled ? `blur(${blur.amount ?? 12}px)` : "none"
  );

  root.style.setProperty(
    "--gd-background-blur",
    blur.backgroundEnabled
      ? `blur(${blur.backgroundAmount ?? blur.amount ?? 10}px)`
      : "none"
  );
}
```

## 設定画面UI

設定に以下を追加してください。

* 背景透過度
* 背景ブラーON/OFF
* 背景ブラー量

説明文:

```text
背景透過度は、アプリ全体の背景オーバーレイに適用されます。
0にすると完全透明、1にすると不透明に近くなります。
```

---

# 3. 最上段の重複UI削除とヘッダー位置調整

## 現状

スクリーンショットでは、左上の macOS ウィンドウボタン付近に、最上段のアプリ名と設定アイコンが重なって表示されています。
さらにその下にも `GridDesk` とボタン群があり、UIが重複しています。

## 修正方針

### 削除するもの

現在の最上段にある以下を削除してください。

* 最上段のアプリ名
* 最上段の設定アイコン
* 重複しているタイトルバーUI

### 残すもの

以下のヘッダーだけ残してください。

```text
GridDesk
No workspace open または ワークスペースパス
+ New / Open / Backup / Reveal
```

## macOSウィンドウボタンと重ならない位置

`frame: false` のため、macOS の信号ボタン風UIまたはカスタムボタンが左上にある場合、ヘッダー左側に十分な余白を取ってください。

```css
.appHeader {
  height: 64px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px 8px 72px;
  background: rgba(246, 247, 244, var(--gd-panel-opacity, 0.85));
  backdrop-filter: var(--gd-backdrop-blur, none);
  -webkit-backdrop-filter: var(--gd-backdrop-blur, none);
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
  -webkit-app-region: drag;
}

.appHeaderLeft {
  min-width: 0;
  -webkit-app-region: drag;
}

.appHeaderTitle {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.1;
}

.appHeaderPath {
  font-size: 12px;
  opacity: 0.72;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.appHeaderActions {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.appHeaderActions button {
  -webkit-app-region: no-drag;
}
```

もし高さが大きすぎる場合は `64px` ではなく `56px` にしてください。
ただし、macOSボタンと重ならないことを優先してください。

## 余分な縦スペースを詰める

現在のヘッダー上にある空行・重複タイトルバーを削除し、ヘッダーを一段に統合してください。

構造例:

```jsx
<header className="appHeader">
  <div className="appHeaderLeft">
    <div className="appHeaderTitle">GridDesk</div>
    <div className="appHeaderPath">
      {workspacePath || "No workspace open"}
    </div>
  </div>

  <div className="appHeaderActions">
    <button>＋ New</button>
    <button>Open</button>
    <button>Backup</button>
    <button>Reveal</button>
  </div>
</header>
```

設定アイコンはこのヘッダーからは削除して構いません。
設定画面は左サイドバー内、または既存の別導線で開けるようにしてください。

---

# 4. 左サイドバー折りたたみ時の上2つのアイコンを削除

## 現状

左サイドバーを折りたたんだ時、上部に「ジャンル管理」「セル登録」に相当するアイコンが表示されるが、押下しても機能しない。

## 修正

折りたたみ時のサイドバー内アイコンはすべて削除してください。

折りたたみ時は、サイドバーを細く表示し、展開ボタンだけを表示してください。

```jsx
<aside className={sidebarCollapsed ? "sidebar collapsed" : "sidebar"}>
  <button className="sidebarCollapseButton">
    {sidebarCollapsed ? "›" : "‹"}
  </button>

  {!sidebarCollapsed && (
    <div className="sidebarScroll">
      ...
    </div>
  )}
</aside>
```

CSS:

```css
.sidebar.collapsed .sidebarScroll {
  display: none;
}

.sidebar.collapsed {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
}

.sidebarCollapseButton {
  width: 32px;
  height: 32px;
  margin: 12px auto;
  -webkit-app-region: no-drag;
}
```

---

# 5. 左サイドバーのアイコン変更

## 変更内容

左サイドバーのセクションアイコンを変更してください。

| 現在     | 変更後アイコン         |
| ------ | --------------- |
| ジャンル管理 | ディレクトリ系アイコン     |
| セル登録   | セル/四角い枠のマス目アイコン |

既存の `LineIcon` を使う場合:

```jsx
カテゴリ管理: <LineIcon name="folderOpen" />
セル登録: <LineIcon name="grid" />
```

---

# 6. 左サイドバーのラベル変更

## 変更

以下の文言を変更してください。

```text
ジャンル管理
↓
カテゴリ管理
```

変更対象:

* サイドバー見出し
* 設定保存キー名は互換性のため変えなくてもよい
* README/docs に記載があれば後で修正対象

---

# 7. セル表示の再確認

前回対応した以下も維持してください。

* 空セル左上に座標を表示しない
* 登録済みアイテムだけ左上に `.app`, `.pdf`, `Folder`, `URL` を表示
* ファイル名は拡張子なし表示
* フォルダ名はそのまま表示

---

# 8. 動作確認

修正後、以下を実行してください。

```bash
npm run build
node --check electron/main.cjs
node --check electron/preload.cjs
npm start
```

## 手動確認

### 透過/背景

* 背景が完全透明固定ではなく、設定の「背景透過度」で調整できる
* 背景透過度 0 で完全透明になる
* 背景透過度 0.25 で薄い背景オーバーレイが出る
* 背景ブラーONで背景にもブラーがかかる
* サイドバーやカードの透明度設定は維持される

### スクロール

* 左サイドバーの高さが足りない場合に縦スクロールできる
* 中央セル領域の高さが足りない場合に縦スクロールできる
* 中央セル領域の幅が足りない場合に横スクロールできる
* 不足していなければ不要なスクロールバーは出ない

### ヘッダー

* 最上段の重複アプリ名・設定アイコンが消えている
* `GridDesk / workspace path / + New / Open / Backup / Reveal` が1段に整理されている
* macOS ウィンドウボタンと重ならない
* 余分な縦スペースが減っている
* ヘッダーの余白部分をドラッグしてウィンドウ移動できる
* ボタンはクリックできる

### サイドバー

* 折りたたみ時に機能しないアイコンが表示されない
* 展開ボタンのみ表示される
* `ジャンル管理` が `カテゴリ管理` に変更されている
* カテゴリ管理アイコンがディレクトリ系になっている
* セル登録アイコンがグリッド/マス目系になっている
