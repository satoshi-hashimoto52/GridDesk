# GridDesk 修正指示：カテゴリタブを1行コンパクトバー型に変更

今回は、中央セル領域のカテゴリタブ表示を修正してください。

## 目的

現在のカテゴリカード/タブの表示を、情報を1行にまとめたコンパクトバー型に変更します。
また、タブの高さをできるだけ細くし、セルグリッド部分を広く使えるようにしてください。

## 対象

中央セル領域に表示されるカテゴリごとのヘッダー/タブ部分。

---

# 1. 変更後の表示イメージ

カテゴリタブは以下のような1行表示にしてください。

```text
01_設計    4×3    8 items    −
────────────────────────────
セルグリッド
```

または、よりコンパクトに以下でもよいです。

```text
▌ 01_設計   4×3   8 items                              −
```

## 表示要素

1行内に以下を表示してください。

| 位置   | 内容                 |
| ---- | ------------------ |
| 左端   | カテゴリ色のアクセントバー      |
| 左側   | カテゴリ名              |
| 中央付近 | グリッドサイズ `列数×行数`    |
| 中央付近 | 登録アイテム数 `n items`  |
| 右端   | 折りたたみボタン `−` / `+` |

---

# 2. タブの高さを細くする

## 期待仕様

カテゴリタブの高さは、できるだけ細くしてください。

推奨値:

```css
height: 30px;
min-height: 30px;
```

厳しければ 32px まで許容します。

```css
height: 32px;
min-height: 32px;
```

---

# 3. JSX構造

中央セルのカテゴリカード部分を探してください。

検索キーワード:

```text
genreCard
genreHeader
genreTitle
category
collapse
collapsed
cellGrid
```

カテゴリヘッダーを以下のような構造にしてください。

```jsx
<div
  className="genreCard"
  style={{
    "--category-accent-color": category.accent_color ?? category.accentColor ?? "#60a5fa"
  }}
>
  <div className="genreCompactHeader">
    <div className="genreAccentBar" />

    <div className="genreCompactInfo">
      <span className="genreCompactTitle">
        {category.name}
      </span>

      <span className="genreCompactMeta">
        {category.cols}×{category.rows}
      </span>

      <span className="genreCompactMeta">
        {getCategoryItemCount(category.id)} items
      </span>
    </div>

    <button
      type="button"
      className="genreCollapseButton"
      onClick={() => toggleCategoryCollapsed(category.id)}
      aria-label={isCategoryCollapsed(category.id) ? "カテゴリを開く" : "カテゴリを閉じる"}
    >
      {isCategoryCollapsed(category.id) ? "+" : "−"}
    </button>
  </div>

  {!isCategoryCollapsed(category.id) && (
    <div className="cellGridWrap">
      <div className="cellGrid">
        ...
      </div>
    </div>
  )}
</div>
```

既存の関数名・変数名に合わせてください。

例えば実装上 `genre` を使っている場合は `category` ではなく `genre` のままで構いません。
ただしユーザー向け表示名は「カテゴリ」のままで問題ありません。

---

# 4. 登録アイテム数を表示する

カテゴリ内の登録アイテム数を表示してください。

既に `items` 配列がある場合は、カテゴリIDで数えてください。

例:

```jsx
function getCategoryItemCount(categoryId) {
  return items.filter((item) => {
    return String(item.genre_id ?? item.category_id) === String(categoryId);
  }).length;
}
```

既存のデータ構造に合わせてください。

注意:

* 削除済み/無効アイテムがある場合は数に含めない
* `enabled === 0` のようなフラグがある場合は除外する

例:

```jsx
function getCategoryItemCount(categoryId) {
  return items.filter((item) => {
    const itemCategoryId = item.genre_id ?? item.category_id;
    const enabled = item.enabled ?? 1;

    return String(itemCategoryId) === String(categoryId) && enabled !== 0;
  }).length;
}
```

---

# 5. CSS

`src/styles.css` に以下を追加・統合してください。

```css
.genreCard {
  width: max-content;
  min-width: 0;
  max-width: none;
  align-self: flex-start;
  border: 1px solid var(--gd-border-subtle);
  border-radius: 12px;
  overflow: hidden;
}

.genreCompactHeader {
  height: 30px;
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 6px 3px 0;
  box-sizing: border-box;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--category-accent-color, #60a5fa) 18%, transparent),
      rgba(255, 255, 255, 0.08)
    );
  border-bottom: 1px solid var(--gd-border-subtle);
  user-select: none;
}

.genreAccentBar {
  width: 4px;
  align-self: stretch;
  flex-shrink: 0;
  background: var(--category-accent-color, #60a5fa);
}

.genreCompactInfo {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  overflow: hidden;
}

.genreCompactTitle {
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.genreCompactMeta {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1;
  opacity: 0.68;
  white-space: nowrap;
}

.genreCollapseButton {
  width: 22px;
  height: 22px;
  min-width: 22px;
  border: 1px solid var(--gd-border-subtle);
  border-radius: 7px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
  -webkit-app-region: no-drag;
}

.genreCollapseButton:hover {
  background: rgba(255, 255, 255, 0.24);
}
```

## color-mix が不安な場合

Electron/Chromiumで `color-mix()` が効かない場合に備え、単純な背景でも構いません。

```css
.genreCompactHeader {
  background: rgba(255, 255, 255, 0.10);
}
```

その場合でも、左アクセントバーと枠線でカテゴリ色が分かるようにしてください。

---

# 6. タブをさらに細くする場合

より細くしたい場合は以下にしてください。

```css
.genreCompactHeader {
  height: 28px;
  min-height: 28px;
  padding: 2px 6px 2px 0;
}

.genreCollapseButton {
  width: 20px;
  height: 20px;
  min-width: 20px;
  font-size: 14px;
}

.genreCompactTitle {
  font-size: 12px;
}

.genreCompactMeta {
  font-size: 10px;
}
```

ただし、クリックしにくくなりすぎる場合は 30px を推奨します。

---

# 7. セルグリッドとの間隔

タブを細くした分、セルグリッドとの間隔も詰めてください。

```css
.cellGridWrap {
  padding: 8px;
}
```

現在 `padding: 12px` や `18px` がある場合、必要に応じて小さくしてください。

---

# 8. 折りたたみ時の表示

カテゴリを折りたたんだ時は、タブ1行だけ残してください。

```text
▌ 01_設計   4×3   8 items                              +
```

セルグリッド部分は非表示にしてください。

既存の折りたたみ状態管理はそのまま使ってください。

---

# 9. 完了条件

以下を実画面で確認してください。

* カテゴリタブの情報が1行に収まっている
* カテゴリ名、列数×行数、アイテム数が表示されている
* 左端にカテゴリ色のアクセントバーが表示される
* タブ色設定がアクセントバーに反映される
* 折りたたみボタンが右端にある
* 開いている時は `−`
* 閉じている時は `+`
* タブ高さが以前より細くなっている
* セルグリッドとの余白が詰まっている
* カテゴリ名が長い場合は省略表示される
* 折りたたみ動作は壊れていない

---

# 作業後の報告形式

```text
対応結果:

カテゴリタブ1行コンパクト化:
- 1行表示化: OK / NG
- カテゴリ名表示: OK / NG
- 列数×行数表示: OK / NG
- アイテム数表示: OK / NG
- カテゴリ色アクセントバー: OK / NG
- タブ高さ縮小: OK / NG
- 折りたたみ + / − 維持: OK / NG
- セルグリッド余白調整: OK / NG

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

ビルド成功だけで完了扱いにしないでください。
必ず実画面で、カテゴリタブが1行かつ細く表示されることを確認してください。