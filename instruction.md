# GridDesk 修正指示：ホバーテキスト全文表示・カテゴリ管理内の項目整理

今回は以下の2点だけ修正してください。

1. ホバーテキストがまだ一部表示になっているため、読み込んだ範囲を最後までスクロール閲覧できるようにする
2. カテゴリ管理の「グリッド設定」と「タブ色設定」を、「カテゴリ変更」コンテナ内へ移動する

## 禁止事項

今回は以下を触らないでください。

* ファイル/フォルダ起動処理
* 右クリックメニュー
* 削除モード
* セル登録ロジック
* DBスキーマ
* 背景透過/ブラー
* セル設定
* ウィンドウ幅自動フィット
* テキストプレビューの対象拡張子
* テキストプレビューの読み込みIPCの大規模変更
* カテゴリ色保存処理の大規模変更

---

# 1. ホバーテキストが一部表示のままになる問題を修正

## 現状

テキスト系ファイルのホバープレビューは表示されますが、まだ一部しか表示されません。

前回対応で `overflow:auto` は入っていますが、実際には以下のどれかが原因で全文閲覧できていない可能性があります。

* main process 側で 20行に切り詰めている
* renderer 側で表示テキストをさらに切っている
* `.textHoverPreview pre` に `max-height` や `overflow:hidden` が残っている
* `.textHoverPreview` 全体の高さ計算で `pre` が伸びていない
* `line-clamp` / `max-lines` / `height` 固定が残っている

---

## 重要方針

今回の目的は「ホバー表示で読み込んだテキストをスクロールで最後まで見られること」です。

軽さは維持しつつ、**20行制限は撤廃または緩和**してください。
読み込み上限は 16KB のままで構いません。

つまり、

```text
読む量: 最大16KB
表示: 読み込んだ範囲は全部スクロールで閲覧可能
```

にしてください。

---

## main process の修正

`electron/main.cjs` の `file:previewText` を確認してください。

現在、以下のような処理がある可能性があります。

```js
const lines = text.split(/\r?\n/).slice(0, 20);

return {
  ok: true,
  text: lines.join("\n"),
  truncated: stat.size > maxBytes || text.split(/\r?\n/).length > 20,
  size: stat.size,
  ext
};
```

この場合、20行以降はそもそも renderer に渡っていません。
以下のように修正してください。

```js
const text = chunk.toString("utf8");

return {
  ok: true,
  text,
  truncated: stat.size > maxBytes,
  size: stat.size,
  ext
};
```

## 注意

* 読み込み上限 `16 * 1024` は維持してよい
* `slice(0, 20)` は削除する
* 表示行数制限ではなく、プレビュー枠内スクロールで対応する
* バイナリ判定は維持する
* 非対象拡張子の除外は維持する

---

## renderer 側の確認

`src/App.jsx` で、hoverPreview の text を表示する直前に `slice` していないか確認してください。

検索してください。

```text
slice(0, 20)
split(/\r?\n/)
hoverPreview.text
textHoverPreview
```

以下のような処理があれば削除または修正してください。

```jsx
hoverPreview.text.split(/\r?\n/).slice(0, 20).join("\n")
```

表示はそのまま以下でよいです。

```jsx
<pre>{hoverPreview.text}</pre>
```

---

## CSS の再修正

`src/styles.css` の `.textHoverPreview` / `.textHoverPreview pre` を確認し、以下のようにしてください。

```css
.textHoverPreview {
  position: fixed;
  z-index: 2147483646;
  width: 420px;
  max-width: min(520px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  user-select: text;
  -webkit-app-region: no-drag;
}

.textHoverPreviewTitle {
  flex-shrink: 0;
}

.textHoverPreview pre {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  height: auto;
  overflow-y: auto;
  overflow-x: auto;
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

以下が残っていたら削除してください。

```css
.textHoverPreview {
  overflow: hidden;
}

.textHoverPreview pre {
  max-height: 240px;
  overflow: hidden;
}
```

ただし `.textHoverPreview` 本体の `overflow: hidden` は、角丸の外へはみ出さない目的なら残して構いません。
その場合でも、`pre` 側は必ず `overflow-y: auto` にしてください。

---

## 高さを確実にするための構造確認

Portal表示部分が以下のようになっているか確認してください。

```jsx
<div
  className="textHoverPreview"
  style={{
    left: hoverPreview.x,
    top: hoverPreview.y
  }}
  onMouseEnter={...}
  onMouseLeave={...}
  onWheel={(event) => event.stopPropagation()}
>
  <div className="textHoverPreviewTitle">
    {hoverPreview.item?.name ?? hoverPreview.item?.path}
  </div>

  <pre>{hoverPreview.text}</pre>

  {hoverPreview.truncated && (
    <div className="textHoverPreviewFooter">
      先頭のみ表示しています
    </div>
  )}
</div>
```

`pre` をさらに別の `div` で包んでいる場合、その親にも `min-height: 0` と `overflow: auto` が必要です。

---

## 完了条件

以下を実画面で確認してください。

* 30行以上ある `.txt` ファイルで、プレビュー内スクロールにより下の行まで見られる
* 30行以上ある `.md` ファイルで、プレビュー内スクロールにより下の行まで見られる
* 20行で切れていない
* 読み込み上限 16KB を超える場合は `先頭のみ表示しています` が出る
* プレビュー領域にカーソルがある間は消えない
* スクロール中に背面のセル領域が不自然にスクロールしない
* UIが重くならない

---

# 2. カテゴリ管理の「グリッド設定」と「タブ色設定」をカテゴリ変更コンテナへ移動

## 現状

左サイドバーのカテゴリ管理内で、以下がカテゴリ変更とは別コンテナになっています。

```text
グリッド設定
タブ色設定
```

しかし、これらは変更対象カテゴリに対する設定なので、**カテゴリ変更** の項目内へ入れてください。

---

## 変更後仕様

カテゴリ管理内の構造を以下のようにしてください。

```text
カテゴリ管理
  カテゴリ追加
    - 新規カテゴリ名
    - 追加ボタン

  カテゴリ変更
    - 変更対象カテゴリ
    - カテゴリ名変更
    - 列数
    - 行数
    - タブ色
    - 更新/保存系ボタン
    - カテゴリ削除
```

つまり、以下の独立サブセクションは不要です。

```text
グリッド設定
タブ色設定
```

これらを削除し、中身を「カテゴリ変更」内へ移動してください。

---

## JSX 方針

現在のような構造になっている場合:

```jsx
<details className="sidebarSubsection">
  <summary>カテゴリ変更</summary>
  ...
</details>

<details className="sidebarSubsection">
  <summary>グリッド設定</summary>
  ...
</details>

<details className="sidebarSubsection">
  <summary>タブ色設定</summary>
  ...
</details>
```

以下のように変更してください。

```jsx
<details className="sidebarSubsection" open>
  <summary className="sidebarSubsectionHeader">
    <span>カテゴリ変更</span>
    <span className="sidebarSectionChevron">›</span>
  </summary>

  <div className="sidebarSubsectionBody">
    {/* 変更対象カテゴリ */}
    {/* カテゴリ名変更 */}

    {/* グリッド設定をここへ移動 */}
    {/* 列数 */}
    {/* 行数 */}

    {/* タブ色設定をここへ移動 */}
    {/* タブ色 */}

    {/* 更新/保存系ボタン */}

    {/* カテゴリ削除は最下段 */}
  </div>
</details>
```

---

## カテゴリ削除ボタン位置

前回指定どおり、カテゴリ削除はカテゴリ変更内の最下段にしてください。

推奨順:

```text
変更対象カテゴリ
カテゴリ名
列数
行数
タブ色
保存/更新系操作
カテゴリ削除
```

削除ボタンは danger 表現を維持してください。

---

## 折りたたみ状態

`settings.json` に `categoryManageSections` のような折りたたみ状態を保存している場合、独立していた `grid` と `color` は不要になります。

以下のように整理してください。

```json
{
  "ui": {
    "categoryManageSections": {
      "add": true,
      "edit": true
    }
  }
}
```

ただし、既存 settings.json に `grid` / `color` が残っていてもアプリが落ちないようにしてください。

---

## CSS

既存の `sidebarSubsection` スタイルをそのまま使って構いません。
ただし、カテゴリ変更内が長くなるため、項目間の余白を少し整理してください。

```css
.sidebarSubsectionBody {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

既に同等のCSSがある場合は重複追加しないでください。

---

## 完了条件

以下を実画面で確認してください。

* カテゴリ管理内に「グリッド設定」という独立項目がない
* カテゴリ管理内に「タブ色設定」という独立項目がない
* 列数/行数は「カテゴリ変更」内にある
* タブ色は「カテゴリ変更」内にある
* 変更対象カテゴリの選択は維持される
* 列数変更が動く
* 行数変更が動く
* タブ色変更が動く
* カテゴリ削除はカテゴリ変更内の最下段にある
* カテゴリ追加は独立したまま

---

# 作業後の報告形式

```text
対応結果:

1. ホバーテキスト全文スクロール
- main側の20行制限削除: OK / NG
- renderer側の行数切り詰め削除: OK / NG
- pre部分 overflow-y:auto: OK / NG
- 30行以上のtxtでスクロール確認: OK / NG
- 30行以上のmdでスクロール確認: OK / NG
- 16KB上限維持: OK / NG

2. カテゴリ管理構造整理
- グリッド設定をカテゴリ変更内へ移動: OK / NG
- タブ色設定をカテゴリ変更内へ移動: OK / NG
- 独立したグリッド設定項目削除: OK / NG
- 独立したタブ色設定項目削除: OK / NG
- カテゴリ削除を最下段に維持: OK / NG
- 既存操作維持: OK / NG

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