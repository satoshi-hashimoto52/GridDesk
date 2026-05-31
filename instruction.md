
# GridDesk 修正指示：設定折りたたみ高さ・ホバーテキストスクロール・サイドバー見出し線削除

今回は以下の3点だけ修正してください。

1. 設定内の折りたたみ項目を開いた時に、内容が途中で切れず最後まで開くようにする
2. テキストホバープレビューをスクロールで全文閲覧できるようにする
3. 左サイドバー各項目の項目名直下の線が最初のボタン/ラベルと重なるため、その線を削除する

## 禁止事項

今回は以下を触らないでください。

- ファイル/フォルダ起動処理
- 右クリックメニュー
- 削除モード
- セル登録ロジック
- DBスキーマ
- 背景透過/ブラーの設定値
- カテゴリ管理ロジック
- ウィンドウ幅自動フィット
- テキストプレビューの読み込み上限
- テキストプレビューの対象拡張子

---

# 1. 設定内の折りたたみ項目が開き切らない問題

## 症状

設定画面内の `<details>` 形式の折りたたみ項目を開いた時、内容が途中で切れたり、最後まで開き切らないことがあります。

## 原因候補

以下のようなCSSが原因の可能性があります。

```css
.settingsSection {
  overflow: hidden;
  max-height: ...
}

.settingsSectionBody {
  max-height: ...
  overflow: hidden;
}

.settingsModal {
  overflow: hidden;
}
```

`details[open]` の中身が、親要素の `max-height` や `overflow: hidden` によって切れている可能性があります。

---

## 修正方針

設定モーダル全体はスクロール可能にし、各設定セクションは開いた分だけ自然な高さになるようにしてください。

## CSS修正

`src/styles.css` の設定画面関連CSSを確認し、以下を反映してください。

```css
.settingsModal,
.settingsPanel,
.settingsContent {
  min-height: 0;
}

.settingsModal {
  max-height: calc(100vh - 48px);
  overflow: hidden;
}

.settingsContent {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(100vh - 96px);
  padding-right: 6px;
}

.settingsSection {
  overflow: visible;
}

.settingsSection[open] {
  overflow: visible;
}

.settingsSectionBody {
  overflow: visible;
  max-height: none;
  height: auto;
}
```

既存クラス名が異なる場合は、実際に使われている設定モーダルのクラスに合わせてください。

---

## 注意

`settingsSection` にアニメーション目的で `max-height` を使っている場合は、一旦削除してください。
今回の優先は、開いた内容が確実に見えることです。

削除対象例:

```css
.settingsSectionBody {
  max-height: 0;
  transition: max-height ...
}

.settingsSection[open] .settingsSectionBody {
  max-height: 300px;
}
```

このような固定 `max-height` は、内容が増えると切れる原因になります。

---

## 完了条件

* 設定内の各セクションを開いた時、内容が最後まで表示される
* セル設定を開いても途中で切れない
* アイコン設定を開いても途中で切れない
* 設定モーダル全体は必要に応じて縦スクロールできる
* 開いた設定項目が他の項目に重ならない

---

# 2. テキストホバープレビューをスクロールで全文閲覧可能にする

## 現状

テキストホバープレビューは表示されるが、内容が長い場合に全文を閲覧できません。

## 変更後仕様

ホバーテキスト表示領域内でスクロールして、読み込んだ範囲の全文を閲覧できるようにしてください。

重要:
読み込み上限は現状のままで構いません。
今回は **表示領域内でスクロール可能にする** ことが目的です。

---

## CSS修正

現在 `.textHoverPreview` や `.textHoverPreview pre` に以下のような指定がある可能性があります。

```css
overflow: hidden;
max-height: 320px;
```

これを、プレビュー全体または `pre` 部分でスクロール可能にしてください。

推奨:

```css
.textHoverPreview {
  position: fixed;
  z-index: 2147483646;
  width: 420px;
  max-width: min(520px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  user-select: text;
}

.textHoverPreviewTitle {
  flex-shrink: 0;
}

.textHoverPreview pre {
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow: auto;
  margin: 0;
  padding: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  overscroll-behavior: contain;
}

.textHoverPreviewFooter {
  flex-shrink: 0;
}
```

## スクロールバー見た目

必要なら以下も追加してください。

```css
.textHoverPreview pre::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

.textHoverPreview pre::-webkit-scrollbar-thumb {
  background: rgba(80, 90, 100, 0.45);
  border-radius: 999px;
}

.textHoverPreview pre::-webkit-scrollbar-track {
  background: transparent;
}
```

---

## イベント注意

プレビュー内でホイールスクロールしても、背後の中央セル領域がスクロールしすぎないように、必要なら `onWheel` で伝播を止めてください。

JSX例:

```jsx
<div
  className="textHoverPreview"
  onMouseEnter={...}
  onMouseLeave={...}
  onWheel={(event) => event.stopPropagation()}
>
```

---

## 完了条件

* 長い `.txt` や `.md` のプレビュー内でスクロールできる
* プレビュー領域上にカーソルがある間は消えない
* スクロールしても背面のセル領域が不自然にスクロールしない
* 読み込み上限は現状維持
* UIが重くならない

---

# 3. 左サイドバー各項目名直下の線を削除する

## 症状

左サイドバーの各項目で、項目名直下の線が最初のボタンまたはラベルと重なっています。

対象例:

* カテゴリ管理
* セル登録
* 設定
* カテゴリ管理内のサブセクション
* 設定内サブセクションではなく、今回は左サイドバー側のみ

## 原因候補

以下のCSSが原因の可能性があります。

```css
.sidebarSectionHeader {
  border-bottom: 1px solid ...
}

.sidebarSubsectionHeader {
  border-bottom: 1px solid ...
}
```

この線が本文先頭のボタン/ラベルと近すぎて重なって見えています。

---

## 修正方針

左サイドバーの見出し直下の `border-bottom` を削除してください。
セクション全体の枠線は残して構いません。

## CSS修正

以下を追加または既存CSSを修正してください。

```css
.sidebar .sidebarSectionHeader,
.sidebar .sidebarSubsectionHeader {
  border-bottom: none;
}
```

もし `details[open]` 時だけ border が追加されている場合も削除してください。

```css
.sidebar .sidebarSection[open] .sidebarSectionHeader,
.sidebar .sidebarSubsection[open] .sidebarSubsectionHeader {
  border-bottom: none;
}
```

## 余白調整

線を消した後、本文との間隔が詰まりすぎる場合は、body側に余白を付けてください。

```css
.sidebarSectionBody,
.sidebarSubsectionBody {
  padding-top: 8px;
}
```

ただし、既に十分な余白がある場合は不要です。

---

## 完了条件

* 左サイドバーの項目名直下の線が消えている
* カテゴリ管理内の項目名直下の線も消えている
* 最初のボタン/ラベルと線が重ならない
* セクション外枠は維持されている
* 左サイドバー全体の視認性は落ちていない

---

# 作業後の報告形式

```text
対応結果:

1. 設定折りたたみ開き切り修正
- settingsSectionBody max-height解除: OK / NG
- settingsContent 縦スクロール: OK / NG
- セル設定が最後まで表示される: OK / NG
- アイコン設定が最後まで表示される: OK / NG

2. ホバーテキストスクロール対応
- textHoverPreview flex化: OK / NG
- pre部分 overflow:auto: OK / NG
- ホイール伝播抑制: OK / NG
- 長文スクロール確認: OK / NG

3. 左サイドバー見出し直下線削除
- sidebarSectionHeader border-bottom削除: OK / NG
- sidebarSubsectionHeader border-bottom削除: OK / NG
- 外枠維持: OK / NG
- 重なり解消: OK / NG

変更ファイル:
- src/styles.css:
- src/App.jsx:
- その他:

確認:
- npm run build:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:
```
