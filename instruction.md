# GridDesk 修正指示：ウィンドウボタン・サイドバー開閉ボタン・上部タブ高さ調整

今回は以下の3点だけ修正してください。

1. ウィンドウボタン3つに色を付ける
2. 左サイドバー開閉ボタンをアプリ名の左へ移動し、macOS風ウィンドウボタンと重ならないようにする
3. UI上部タブの高さをできるだけ詰めて、ベゼルを細くする

## 禁止事項

今回は以下を触らないでください。

- ファイル/フォルダ起動処理
- 右クリックメニュー
- 削除モード
- セル登録ロジック
- DBスキーマ
- 背景透過/ブラー
- セル設定
- ウィンドウ幅自動フィット処理
- Electron main/preload の大規模変更

---

# 1. ウィンドウボタン3つに色を付ける

## 目的

現在のウィンドウボタン3つが視認しにくいため、macOS風に色を付けてください。

## 期待仕様

左上のウィンドウボタン3つを以下の色にしてください。

| ボタン | 色 |
|---|---|
| 閉じる | 赤 |
| 最小化 | 黄 |
| 最大化/復元 | 緑 |

## CSS例

既存のクラス名に合わせてください。  
候補クラス名:

```text
.windowControls
.windowButton
.windowClose
.windowMinimize
.windowMaximize
```

既存クラス名がない場合は追加してください。

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
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  padding: 0;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.windowButton.close,
.windowClose {
  background: #ff5f57;
}

.windowButton.minimize,
.windowMinimize {
  background: #ffbd2e;
}

.windowButton.maximize,
.windowMaximize {
  background: #28c840;
}

.windowButton:hover {
  filter: brightness(0.95);
}
```

JSX側が必要なら以下のようにしてください。

```jsx
<div className="windowControls">
  <button type="button" className="windowButton close" onClick={handleCloseWindow} />
  <button type="button" className="windowButton minimize" onClick={handleMinimizeWindow} />
  <button type="button" className="windowButton maximize" onClick={handleToggleMaximizeWindow} />
</div>
```

既存のウィンドウ操作関数を使い、新しく重複定義しないでください。

---

# 2. 左サイドバー開閉ボタンをアプリ名の左へ移動する

## 現状

左サイドバーの開閉ボタンが、タブのウィンドウボタンと重なりやすい位置にあります。

## 変更後仕様

左サイドバーの開閉ボタンを、アプリ名 `GridDesk` の左側へ移動してください。
ウィンドウボタン3つとは重ならないようにしてください。

イメージ:

```text
[● ● ●]   [‹] GridDesk   /path/to/workspace
```

サイドバー開閉ボタンは、上部タブ内の `GridDesk` の左に置く形で構いません。

## JSX例

現在の上部ヘッダーを以下のような構造に整理してください。

```jsx
<header className="appHeader">
  <div className="windowControls">
    ...
  </div>

  <div className="appHeaderLeft">
    <button
      type="button"
      className="sidebarToggleInHeader"
      onClick={toggleSidebarCollapsed}
      aria-label={sidebarCollapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
    >
      {sidebarCollapsed ? "›" : "‹"}
    </button>

    <span className="appHeaderTitle">GridDesk</span>

    <span className="appHeaderPath">
      {workspacePath || "No workspace open"}
    </span>
  </div>
</header>
```

既存の関数名に合わせてください。

## サイドバー内の開閉ボタン削除

開閉ボタンを上部ヘッダーへ移動した場合、左サイドバー内にある既存の開閉ボタンは削除してください。

削除対象候補:

```text
sidebarCollapseButton
sidebarHeader 内の開閉ボタン
```

ただし、上部ヘッダー側の `sidebarToggleInHeader` は残してください。

---

# 3. 左サイドバーを閉じた時、左のベゼルをなくす

## 現状

左サイドバーを閉じた時にも、左側に細いベゼル/バーが残っています。

## 変更後仕様

左サイドバーを閉じた時は、サイドバー領域を完全に消してください。

つまり、collapsed 時に `44px` などの幅を残さないでください。

## CSS修正

現在、以下のようになっている可能性があります。

```css
.sidebar.collapsed {
  width: 44px;
  min-width: 44px;
  max-width: 44px;
}
```

これを以下のように変更してください。

```css
.sidebar.collapsed {
  width: 0;
  min-width: 0;
  max-width: 0;
  padding: 0;
  border-right: 0;
  overflow: hidden;
}
```

通常時はこれまで通り表示してください。

```css
.sidebar {
  width: 320px;
  min-width: 280px;
  max-width: 380px;
}
```

重要:

* collapsed時に `sidebarScroll` は表示しない
* collapsed時に開閉ボタンをサイドバー内に残さない
* 開閉操作は上部ヘッダーの `sidebarToggleInHeader` で行う
* collapsed時に左ベゼルが残らないこと

---

# 4. UI上部タブの高さをギリギリまで詰める

## 現状

上部タブ/ヘッダーの高さがやや大きく、ベゼルが太いです。

## 変更後仕様

上部タブの高さをできるだけ細くしてください。
ただし、以下は維持してください。

* ウィンドウボタン3つが押せる
* サイドバー開閉ボタンが押せる
* `GridDesk` と参照パスが読める
* macOS風ウィンドウボタンとテキストが重ならない
* ヘッダー余白部分をドラッグしてウィンドウ移動できる

## CSS例

```css
.appHeader {
  height: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 10px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--gd-border-subtle);
  background: rgba(246, 247, 244, var(--gd-panel-opacity, 0.85));
  backdrop-filter: var(--gd-backdrop-blur, none);
  -webkit-backdrop-filter: var(--gd-backdrop-blur, none);
  -webkit-app-region: drag;
}

.appHeaderLeft {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  flex: 1;
  -webkit-app-region: drag;
}

.sidebarToggleInHeader {
  width: 22px;
  height: 22px;
  min-width: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gd-border-subtle);
  border-radius: 7px;
  padding: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.18);
  -webkit-app-region: no-drag;
}

.appHeaderTitle {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.appHeaderPath {
  min-width: 0;
  font-size: 11px;
  opacity: 0.72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

もし 32px が厳しければ 34px まで上げても構いません。
ただし、現在より明確に細くしてください。

---

# 5. ドラッグ領域とボタン操作の確認

上部ヘッダーはドラッグ可能にし、ボタン類は no-drag にしてください。

```css
.appHeader {
  -webkit-app-region: drag;
}

.windowControls,
.windowControls button,
.sidebarToggleInHeader {
  -webkit-app-region: no-drag;
}
```

`GridDesk` やパス表示部分はドラッグ領域のままで構いません。

---

# 完了条件

## ウィンドウボタン

* 3つのウィンドウボタンに赤・黄・緑の色が付いている
* クリック操作はこれまで通り動く
* ボタンはドラッグ領域扱いになっていない

## サイドバー開閉ボタン

* 開閉ボタンが `GridDesk` の左に表示される
* ウィンドウボタン3つと重ならない
* サイドバー開閉はこれまで通り動く
* サイドバー内の古い開閉ボタンは消えている

## サイドバー折りたたみ

* サイドバーを閉じた時に左ベゼルが残らない
* collapsed 時のサイドバー幅が 0 になる
* 中央セル領域が左端まで寄る

## 上部タブ

* 上部タブの高さが以前より細くなっている
* `GridDesk` と参照パスは横並びで見える
* ヘッダー余白部分をドラッグしてウィンドウ移動できる
* ウィンドウボタン、サイドバー開閉ボタンはクリックできる

---

# 作業後の報告形式

```text
対応結果:

1. ウィンドウボタン色付け
- 赤/黄/緑の表示: OK / NG
- クリック動作維持: OK / NG

2. サイドバー開閉ボタン移動
- GridDesk 左側へ移動: OK / NG
- ウィンドウボタン非重複: OK / NG
- 旧サイドバー内ボタン削除: OK / NG

3. サイドバー閉時の左ベゼル削除
- collapsed width 0: OK / NG
- 左ベゼルなし: OK / NG
- 中央セル領域が左へ寄る: OK / NG

4. 上部タブ高さ調整
- appHeader 高さ縮小: OK / NG
- GridDesk/path 横並び維持: OK / NG
- ドラッグ移動維持: OK / NG

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