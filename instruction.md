# GridDesk 修正指示：検索ハイライトの蛍光グリーン枠を明確にする

今回は以下のみ対応してください。

* 検索時のアイコンハイライトがほぼ見えないため、アイコン枠の蛍光グリーン発光を明確にする

## 禁止事項

今回は以下を触らないでください。

* 検索ロジック
* 検索結果スクロール処理
* ファイル/フォルダ起動処理
* 右クリックメニュー
* セル登録ロジック
* DBスキーマ
* PDFプレビュー
* テキストホバー/ピン留め機能
* アイコン設定ロジック
* 自動フィット処理

---

# 1. 現状

検索結果のアイコン枠に蛍光グリーンのハイライトを付けたが、実画面ではほぼ見えていません。

原因候補:

* `outline` が透明背景上で見えにくい
* `box-shadow` が弱い
* `.iconCard` の既存背景・枠線に負けている
* 親要素の `overflow: hidden` で外側の発光が切れている
* 検索ハイライト対象が `.iconCard` ではなく別要素に付いている
* CSS優先度が不足している

---

# 2. 変更後仕様

検索結果のアイコンは、背景を塗らずに、**枠だけが蛍光グリーンで明確に点滅発光**するようにしてください。

期待表示:

```text
アイコン背景: 既存のまま
アイコン枠: 蛍光グリーン
外側発光: 強め
内側発光: あり
点滅: あり
```

---

# 3. CSS修正方針

`outline` だけでは弱いので、`.searchHighlight::before` と `.searchHighlight::after` を使って、内側・外側の発光リングを重ねてください。

## 重要

`.iconCard` 系には `position: relative` が必要です。

```css
.iconCard,
.launcherItem,
.itemCard {
  position: relative;
}
```

---

# 4. 既存 searchHighlight CSS を置き換える

現在の `.searchHighlight` 関連CSSを探してください。

検索:

```text
searchHighlight
searchHighlightGreenPulse
searchHighlightBorderPulse
```

古い検索ハイライトCSSは、今回のCSSに置き換えてください。

---

# 5. 新しいCSS

以下を追加・置換してください。

```css
.iconCard.searchHighlight,
.launcherItem.searchHighlight,
.itemCard.searchHighlight {
  position: relative;
  border-color: rgba(57, 255, 20, 1) !important;
  outline: none !important;
  box-shadow:
    inset 0 0 0 2px rgba(57, 255, 20, 0.95),
    0 0 0 2px rgba(57, 255, 20, 0.85),
    0 0 12px rgba(57, 255, 20, 0.95),
    0 0 26px rgba(57, 255, 20, 0.70),
    0 0 44px rgba(57, 255, 20, 0.42) !important;
  animation: searchHighlightNeonPulse 0.85s ease-in-out infinite;
  isolation: isolate;
}

.iconCard.searchHighlight::before,
.launcherItem.searchHighlight::before,
.itemCard.searchHighlight::before {
  content: "";
  position: absolute;
  inset: -5px;
  border: 2px solid rgba(57, 255, 20, 0.92);
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  box-shadow:
    0 0 8px rgba(57, 255, 20, 0.95),
    0 0 18px rgba(57, 255, 20, 0.72),
    0 0 34px rgba(57, 255, 20, 0.46);
  animation: searchHighlightNeonRingPulse 0.85s ease-in-out infinite;
}

.iconCard.searchHighlight::after,
.launcherItem.searchHighlight::after,
.itemCard.searchHighlight::after {
  content: "";
  position: absolute;
  inset: 3px;
  border: 1px solid rgba(210, 255, 190, 0.9);
  border-radius: calc(var(--gd-cell-radius, 8px) - 2px);
  pointer-events: none;
  z-index: 5;
  box-shadow:
    inset 0 0 8px rgba(57, 255, 20, 0.34);
}

@keyframes searchHighlightNeonPulse {
  0%, 100% {
    filter: brightness(1);
    box-shadow:
      inset 0 0 0 2px rgba(57, 255, 20, 0.78),
      0 0 0 2px rgba(57, 255, 20, 0.65),
      0 0 10px rgba(57, 255, 20, 0.72),
      0 0 22px rgba(57, 255, 20, 0.48),
      0 0 36px rgba(57, 255, 20, 0.26);
  }

  50% {
    filter: brightness(1.18);
    box-shadow:
      inset 0 0 0 3px rgba(57, 255, 20, 1),
      0 0 0 3px rgba(57, 255, 20, 0.95),
      0 0 16px rgba(57, 255, 20, 1),
      0 0 34px rgba(57, 255, 20, 0.82),
      0 0 58px rgba(57, 255, 20, 0.48);
  }
}

@keyframes searchHighlightNeonRingPulse {
  0%, 100% {
    opacity: 0.76;
    transform: scale(1);
  }

  50% {
    opacity: 1;
    transform: scale(1.035);
  }
}
```

---

# 6. 親要素の overflow を確認する

外側発光が切れている場合があります。

以下の親要素を確認してください。

```text
gridCell
cellGrid
cellGridWrap
genreCard
gridScroll
```

`gridCell` に `overflow: hidden` がある場合、検索ハイライト中だけ見えるようにしてください。

```css
.gridCell:has(.searchHighlight) {
  overflow: visible;
}
```

`:has()` を避けたい場合は、アイコンカードの外側に `searchHighlightCell` クラスを付けても構いません。

JSX例:

```jsx
<div
  className={`gridCell ${highlightedItemId === item.id ? "searchHighlightCell" : ""}`}
>
```

CSS:

```css
.gridCell.searchHighlightCell {
  overflow: visible;
  z-index: 3;
}
```

推奨は `searchHighlightCell` クラス追加です。

---

# 7. JSX側の確認

検索ハイライトクラスが実際に表示対象のアイコンに付いているか確認してください。

```jsx
const isSearchHighlighted = highlightedItemId === item.id;
```

アイコンカード:

```jsx
className={[
  "iconCard",
  isSearchHighlighted ? "searchHighlight" : "",
  ...
].filter(Boolean).join(" ")}
```

セル側にもクラスを付けてください。

```jsx
className={[
  "gridCell",
  isSearchHighlighted ? "searchHighlightCell" : "",
  ...
].filter(Boolean).join(" ")}
```

---

# 8. リンク切れ表示との競合

リンク切れの `brokenPath` と検索ハイライトが同時に付いた場合は、検索ハイライトを優先してください。

```css
.iconCard.brokenPath.searchHighlight,
.launcherItem.brokenPath.searchHighlight,
.itemCard.brokenPath.searchHighlight {
  border-color: rgba(57, 255, 20, 1) !important;
}
```

---

# 9. 完了条件

以下を実画面で確認してください。

* 検索結果のアイコン枠がはっきり蛍光グリーンに光る
* アイコン背景は塗りつぶされない
* 点滅が明確に見える
* セルの外側発光が切れていない
* 検索結果を移動すると、対象アイコンの発光も移動する
* 検索解除で発光が消える
* リンク切れ赤枠と重なっても検索ハイライトが分かる

---

# 作業後の報告形式

```text
対応結果:

検索ハイライト視認性改善:
- searchHighlight CSS置換: OK / NG
- ::before 外側リング追加: OK / NG
- ::after 内側リング追加: OK / NG
- gridCell searchHighlightCell追加: OK / NG
- overflow切れ対策: OK / NG
- brokenPath競合対策: OK / NG
- 実画面で蛍光グリーン発光確認: OK / NG

変更ファイル:
- src/App.jsx:
- src/styles.css:
- その他:

確認:
- npm run build:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:

作業ログ:
- _md/yyyymmdd-hhmmss.md
```

ビルド成功だけで完了扱いにしないでください。
必ず実画面で検索し、対象アイコンの枠が明確に蛍光グリーンで発光することを確認してください。

---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

## 出力先

プロジェクトルート直下に `_md/` フォルダを作成してください。
既に存在する場合はそのまま使用してください。

## ファイル名

ファイル名は、作業完了時点の日時を使って以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

例:

```text
20260602-193012.md
```

## 必須記載内容

作成する Markdown には、以下を必ず記載してください。

```markdown
# 作業ログ: yyyymmdd-hhmmss

## 1. 指示内容

今回ユーザーから依頼された内容、または読ませた指示文の要点を記載してください。

## 2. 対応内容

実際に対応した内容を箇条書きで記載してください。

## 3. 変更ファイル

変更したファイルをすべて記載してください。

## 4. 実装詳細

主要な実装内容を、機能単位で説明してください。

## 5. 確認結果

実行した確認コマンドと結果を記載してください。

## 6. 未対応・注意点

未対応の項目、制約、注意点、確認できなかったことがあれば記載してください。
```

この作業ログ作成も完了条件に含めてください。
ログファイルが作成されていない場合は作業完了扱いにしないでください。



---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

## 出力先

プロジェクトルート直下に `_md/` フォルダを作成してください。
既に存在する場合はそのまま使用してください。

```text
<project-root>/
└─ _md/
```

## ファイル名

ファイル名は、作業完了時点の日時を使って以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

例:

```text
20260529-153012.md
```

日時はローカル環境の現在時刻で構いません。

## 必須記載内容

作成する Markdown には、以下を必ず記載してください。

```markdown
# 作業ログ: yyyymmdd-hhmmss

## 1. 指示内容

今回ユーザーから依頼された内容、または読ませた指示文の要点を記載してください。

## 2. 対応内容

実際に対応した内容を箇条書きで記載してください。

## 3. 変更ファイル

変更したファイルをすべて記載してください。

## 4. 実装詳細

主要な実装内容を、機能単位で説明してください。

## 5. 確認結果

実行した確認コマンドと結果を記載してください。

## 6. 未対応・注意点

未対応の項目、制約、注意点、確認できなかったことがあれば記載してください。

---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

## 出力先

プロジェクトルート直下に `_md/` フォルダを作成してください。
既に存在する場合はそのまま使用してください。

```text
<project-root>/
└─ _md/
```

## ファイル名

ファイル名は、作業完了時点の日時を使って以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

例:

```text
20260529-153012.md
```

日時はローカル環境の現在時刻で構いません。

## 必須記載内容

作成する Markdown には、以下を必ず記載してください。

```markdown
# 作業ログ: yyyymmdd-hhmmss

## 1. 指示内容

今回ユーザーから依頼された内容、または読ませた指示文の要点を記載してください。

## 2. 対応内容

実際に対応した内容を箇条書きで記載してください。

## 3. 変更ファイル

変更したファイルをすべて記載してください。

## 4. 実装詳細

主要な実装内容を、機能単位で説明してください。

## 5. 確認結果

実行した確認コマンドと結果を記載してください。

## 6. 未対応・注意点

未対応の項目、制約、注意点、確認できなかったことがあれば記載してください。
```

この作業ログ作成も完了条件に含めてください。
ログファイルが作成されていない場合は作業完了扱いにしないでください。

---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

## 出力先

プロジェクトルート直下に `_md/` フォルダを作成してください。
既に存在する場合はそのまま使用してください。

```text
<project-root>/
└─ _md/
```

## ファイル名

ファイル名は、作業完了時点の日時を使って以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

例:

```text
20260529-153012.md
```

日時はローカル環境の現在時刻で構いません。

## 必須記載内容

作成する Markdown には、以下を必ず記載してください。

```markdown
# 作業ログ: yyyymmdd-hhmmss

## 1. 指示内容

今回ユーザーから依頼された内容、または読ませた指示文の要点を記載してください。

## 2. 対応内容

実際に対応した内容を箇条書きで記載してください。

## 3. 変更ファイル

変更したファイルをすべて記載してください。

例:

- src/App.jsx
- src/styles.css
- electron/main.cjs
- electron/preload.cjs

## 4. 実装詳細

主要な実装内容を、機能単位で説明してください。

## 5. 確認結果

実行した確認コマンドと結果を記載してください。

例:

- npm run build: OK / NG
- node --check electron/main.cjs: OK / NG
- node --check electron/preload.cjs: OK / NG
- npm start: OK / NG

## 6. 未対応・注意点

未対応の項目、制約、注意点、確認できなかったことがあれば記載してください。

なければ「なし」と記載してください。
```

## 注意事項

* `_md/` フォルダが存在しない場合は作成してください。
* 作業ログは、実装完了後に必ず作成してください。
* ビルド成功だけでなく、実画面確認の有無も記載してください。
* 既存のログファイルは上書きしないでください。
* 毎回新しい `yyyymmdd-hhmmss.md` を作成してください。
* `instruction.md` など既存の指示ファイルは、このログ出力のために変更しないでください。

## 作業後の報告

Codexの最終報告には、作成したログファイル名も含めてください。

例:

```text
作業ログ:
- _md/20260529-153012.md
```
