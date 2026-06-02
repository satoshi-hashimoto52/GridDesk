# GridDesk 修正指示：アイコン設定一覧の先頭にフォルダ設定を固定表示する

今回は以下のみ対応してください。

- アイコン設定の登録済みアイコン一覧で、先頭に「フォルダ」設定をデフォルト表示する
- その下に、これまで通り拡張子アイコン設定の一覧を表示する

## 禁止事項

今回は以下を触らないでください。

- ファイル/フォルダ起動処理
- 右クリックメニュー
- セル登録ロジック
- DBスキーマ
- PDFプレビュー
- テキストホバー/ピン留め機能
- 自動フィット処理
- 設定画面ドラッグ処理
- アイコン選択モーダルの大規模変更

---

# 1. 目的

現在のアイコン設定では、拡張子ごとのアイコン設定一覧のみが表示されています。

しかし、純粋なフォルダは拡張子を持たないため、拡張子一覧に `folder` と登録して管理するのは不自然です。

そのため、登録済みアイコン設定一覧の先頭に、常に「フォルダ」用の設定行を表示してください。

表示順は以下です。

```text
フォルダ
pdf
xlsx
docx
txt
...
```

---

# 2. 基本仕様

## フォルダ設定

フォルダ設定は、拡張子設定とは別扱いにしてください。

```text
フォルダ = item.type === "folder" または isDirectory
拡張子 = 通常ファイルの path 末尾拡張子
```

つまり、`folder` という拡張子設定ではなく、**種類別設定の folder** として扱います。

---

# 3. 表示仕様

アイコン設定の登録済み一覧で、先頭に固定行を追加してください。

## 先頭固定行

```text
種類/拡張子: フォルダ
アイコン: フォルダ用アイコン
線色: フォルダ用線色
背景色: フォルダ用背景色
背景透過: フォルダ用背景透過
プレビュー: フォルダアイコン
削除: 不可
```

削除ボタンは表示しないか、無効化してください。

理由:

* フォルダ設定はデフォルト種別設定なので削除不可
* 拡張子一覧から消す対象ではない

## 以降の行

これまで通り、拡張子設定を表示してください。

```text
pdf
xlsx
docx
...
```

---

# 4. UIラベル

先頭行の表示名は `フォルダ` にしてください。

内部キーは `folder` で構いません。

```jsx
const folderIconSettingRow = {
  kind: "folder",
  label: "フォルダ",
  fixed: true
};
```

---

# 5. settings構造

既存の種類別アイコン設定に `folder` がある場合は、それを使ってください。

候補:

```text
settings.ui.iconTypes.folder
settings.ui.icons.folder
settings.ui.iconSettings.folder
settings.ui.kindIcons.folder
```

既存構造に合わせてください。

もし `folder` 設定がない場合は、デフォルト設定に追加してください。

```js
folder: {
  iconName: "folder",
  color: "#facc15",
  backgroundColor: "#ffffff",
  backgroundOpacity: 0
}
```

既存で `icon` というキーを使っているなら `iconName` ではなく既存キーに合わせてください。

---

# 6. normalizeSettings

既存 settings.json に folder 設定がない場合は補完してください。

例:

```js
settings.ui.iconTypes = {
  ...defaults.ui.iconTypes,
  ...(settings.ui?.iconTypes ?? {}),
  folder: {
    ...defaults.ui.iconTypes.folder,
    ...(settings.ui?.iconTypes?.folder ?? {})
  }
};
```

既存構造に合わせてください。

---

# 7. 一覧データの作り方

拡張子一覧とは別に、フォルダ固定行を先頭に結合してください。

例:

```jsx
const folderIconRow = {
  rowType: "kind",
  key: "folder",
  label: "フォルダ",
  fixed: true,
  setting: settings.ui.iconTypes.folder
};

const extensionIconRows = extensionIconEntries.map((entry) => ({
  rowType: "extension",
  key: entry.extension,
  label: entry.extension,
  fixed: false,
  setting: entry
}));

const iconSettingRows = [
  folderIconRow,
  ...extensionIconRows
];
```

表示側は `iconSettingRows.map(...)` にしてください。

---

# 8. 行の更新処理

## フォルダ行

フォルダ行の編集は、種類別フォルダ設定を更新してください。

```jsx
function updateIconSettingRow(row, patch) {
  if (row.rowType === "kind" && row.key === "folder") {
    updateSettingsLocal((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        iconTypes: {
          ...prev.ui.iconTypes,
          folder: {
            ...prev.ui.iconTypes.folder,
            ...patch
          }
        }
      }
    }));

    return;
  }

  if (row.rowType === "extension") {
    updateExtensionIconSetting(row.key, patch);
  }
}
```

既存構造に合わせてください。

## 拡張子行

拡張子行はこれまで通り、拡張子別設定を更新してください。

---

# 9. 削除処理

フォルダ行は削除不可にしてください。

```jsx
{row.fixed ? (
  <span className="iconSettingFixedLabel">固定</span>
) : (
  <button
    type="button"
    className="dangerButton"
    onClick={() => deleteExtensionIconSetting(row.key)}
  >
    削除
  </button>
)}
```

または削除列を空にしても構いません。

---

# 10. アイコン選択モーダルとの連携

フォルダ行の「アイコンを選択」ボタンを押した場合、`folder` の種類別アイコン設定を変更してください。

例:

```jsx
<button
  type="button"
  onClick={() => {
    setIconPickerTarget({
      type: "kind",
      key: "folder"
    });
    setIconPickerOpen(true);
  }}
>
  アイコンを選択
</button>
```

拡張子行の場合:

```jsx
setIconPickerTarget({
  type: "extension",
  key: row.key
});
```

`applyIconPickerSelection(iconName)` 側では、target type を見て更新先を分けてください。

```jsx
function applyIconPickerSelection(iconName) {
  if (!iconPickerTarget) return;

  if (iconPickerTarget.type === "kind") {
    updateKindIconSetting(iconPickerTarget.key, { iconName });
    return;
  }

  if (iconPickerTarget.type === "extension") {
    updateExtensionIconSetting(iconPickerTarget.key, { iconName });
  }
}
```

既存キーが `icon` の場合は `iconName` ではなく `icon` にしてください。

---

# 11. プレビュー

フォルダ行のプレビューは、フォルダ用アイコン設定を反映してください。

```jsx
<LineIcon
  name={row.setting.iconName ?? row.setting.icon ?? "folder"}
  color={row.setting.color ?? "#facc15"}
/>
```

背景色・背景透過も、既存の拡張子行と同じ表示ロジックを使ってください。

---

# 12. アイコン解決優先順位の確認

フォルダアイコンが実際のセル表示にも反映されるよう、アイコン解決処理を確認してください。

優先順位は以下にしてください。

```text
1. アイテム個別アイコン設定
2. item.type === "folder" または isDirectory の場合は folder 種類設定
3. item.type === "url" の場合は url 種類設定
4. item.type === "app" の場合は app 種類設定
5. 通常ファイルの場合は拡張子別設定
6. file 汎用設定
```

今回最低限必要なのは、**フォルダ行で変更したアイコン設定がフォルダセルに反映されること**です。

---

# 13. 表示領域

先頭にフォルダ固定行が追加されても、前回修正した一覧表示仕様を維持してください。

* データ量に応じて表示領域を伸ばす
* 最大30行程度
* それ以上はスクロール
* ヘッダーと行の列幅を揃える
* 行が巨大化しない

---

# 14. 完了条件

以下を実画面で確認してください。

## 表示

* アイコン設定一覧の先頭に `フォルダ` 行が表示される
* `フォルダ` 行の下に `pdf`, `xlsx`, `docx` などの拡張子行が表示される
* フォルダ行は削除できない
* 拡張子行はこれまで通り削除できる
* 行レイアウトは崩れていない
* 一覧のスクロール仕様は維持されている

## 編集

* フォルダ行のアイコンを変更できる
* フォルダ行の線色を変更できる
* フォルダ行の背景色を変更できる
* フォルダ行の背景透過を変更できる
* フォルダ行のプレビューに反映される
* 設定後、実際のフォルダセルにも反映される

## 保存/復元

* settings.json にフォルダ設定が保存される
* アプリ再起動後もフォルダ設定が維持される
* 拡張子設定もこれまで通り維持される

---

# 作業後の報告形式

```text
対応結果:

アイコン設定一覧 フォルダ固定行追加:
- 先頭にフォルダ行表示: OK / NG
- フォルダ行削除不可: OK / NG
- 拡張子行は従来通り表示: OK / NG
- フォルダアイコン変更: OK / NG
- フォルダ線色変更: OK / NG
- フォルダ背景色変更: OK / NG
- フォルダ背景透過変更: OK / NG
- フォルダセルへの反映: OK / NG
- settings.json保存/復元: OK / NG
- 既存拡張子設定維持: OK / NG

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
