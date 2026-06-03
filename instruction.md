# GridDesk 緊急修正指示：設定アイコン反映不具合・フォルダ起動不具合の修正

## 症状

現在、以下の不具合が発生しています。

1. 設定からアイコンを変更しても、既に配置済みのセルアイコンが変化しない
2. フォルダをダブルクリックしても開かなくなった

今回はこの2点のみ修正してください。

---

# 禁止事項

今回は以下を触らないでください。

* DBスキーマ
* セル登録仕様
* カテゴリ管理仕様
* PDFプレビュー
* テキストホバー/ピン留め
* Markdown表示
* 検索機能
* 最近開いたワークスペース履歴
* Windows版 better-sqlite3 対応
* 配布ビルド設定の大幅変更

---

# 1. 設定からアイコン変更しても配置済みアイコンが変化しない問題

## 想定原因

最近の修正で、配置済みアイテム側に以下のような個別アイコン値を保存・優先する実装が残っている可能性があります。

```text
item.iconName
item.icon_name
item.icon_color
item.icon_background_color
item.icon_background_opacity
```

そのため、設定画面で種類別・拡張子別・フォルダ用アイコンを変更しても、既存アイテムが item 側の古い値を優先してしまい、表示が更新されない可能性があります。

---

## 変更後仕様

設定のアイコン変更は、配置済みアイコンにも即時反映してください。

基本方針:

```text
通常表示:
  設定側のアイコンルールを使って描画する

個別アイコン変更を明示したアイテムのみ:
  item個別設定を優先する
```

ただし、現状で個別アイコン編集が不安定なら、まずは **配置済みアイコンも常に設定側を参照する** 形に戻してください。

---

## アイコン解決優先順位

`resolveItemIconConfig(item)` または類似の関数を確認し、以下の優先順位にしてください。

```text
1. item に明示的な個別アイコン設定がある場合のみ、それを使う
2. フォルダなら settings の folder 設定
3. URLなら settings の url 設定
4. アプリなら settings の app 設定
5. 通常ファイルなら拡張子別設定
6. 通常ファイル汎用設定
```

重要:

* 登録時に自動保存された古い `iconName` / `icon_color` を「個別設定」とみなさないこと
* ユーザーが右クリック等で明示的に個別変更した場合のみ、個別設定として扱うこと
* その判定用のフラグが無いなら、今回は item 側の icon 系カラムを表示解決で使わないこと

---

## 修正例

現在このようになっている場合:

```js
function resolveItemIconConfig(item) {
  if (item.iconName || item.icon_name) {
    return {
      iconName: item.iconName ?? item.icon_name,
      color: item.iconColor ?? item.icon_color,
      backgroundColor: item.iconBackgroundColor ?? item.icon_background_color,
      backgroundOpacity: item.iconBackgroundOpacity ?? item.icon_background_opacity
    };
  }

  return resolveFromSettings(item);
}
```

以下のように修正してください。

```js
function resolveItemIconConfig(item) {
  const hasExplicitItemIcon =
    item.custom_icon_enabled === 1 ||
    item.customIconEnabled === true ||
    item.icon_override === 1 ||
    item.iconOverride === true;

  if (hasExplicitItemIcon) {
    return {
      iconName: item.iconName ?? item.icon_name,
      color: item.iconColor ?? item.icon_color,
      backgroundColor: item.iconBackgroundColor ?? item.icon_background_color,
      backgroundOpacity: item.iconBackgroundOpacity ?? item.icon_background_opacity
    };
  }

  return resolveIconConfigFromSettings(item);
}
```

もし `custom_icon_enabled` のようなフラグが存在しない場合は、今回は安全優先で以下にしてください。

```js
function resolveItemIconConfig(item) {
  return resolveIconConfigFromSettings(item);
}
```

---

## settings変更時の再描画

設定変更後、配置済みアイコンが再描画されるようにしてください。

以下を確認してください。

```text
settings state が更新されている
resolveItemIconConfig が settings を参照している
React の render 内で resolveItemIconConfig(item) を呼んでいる
useMemo の依存配列に settings が入っている
```

NG例:

```js
const renderedItems = useMemo(() => {
  return items.map(...)
}, [items]);
```

settings を使っているなら、依存配列に settings を追加してください。

```js
const renderedItems = useMemo(() => {
  return items.map(...)
}, [items, settings]);
```

また、アイコン設定変更後に `items` の再読込だけに頼らないでください。
settings state 更新だけで即時反映されるのが望ましいです。

---

## フォルダ固定行との関係

アイコン設定一覧の先頭にある `フォルダ` 行でアイコン・線色・背景色・背景透過を変更したら、既に配置済みのフォルダセルにも反映してください。

確認対象:

```text
フォルダ行のアイコン変更
フォルダ行の線色変更
フォルダ行の背景色変更
フォルダ行の背景透過変更
```

---

## 完了条件

以下を実画面で確認してください。

* 設定画面で `pdf` のアイコンを変更すると、既存の pdf セルアイコンが変わる
* 設定画面で `txt` の色を変更すると、既存の txt セルアイコン色が変わる
* 設定画面で `フォルダ` のアイコンを変更すると、既存のフォルダセルアイコンが変わる
* 設定画面で `フォルダ` の色を変更すると、既存のフォルダセルアイコン色が変わる
* アプリ再起動後も設定が維持される
* 明示的な個別アイコン変更機能がある場合、その個別変更だけは優先される

---

# 2. フォルダが開かなくなった問題

## 想定原因

Mac安定版復旧、Windows対応、または起動処理変更の中で、フォルダ起動時の `shell.openPath()` / `shell.showItemInFolder()` の分岐が壊れた可能性があります。

または、item type 判定が変わり、フォルダが通常ファイルやURL扱いになっている可能性があります。

---

## 変更後仕様

フォルダセルをダブルクリックした場合、OS標準のファイルマネージャでそのフォルダを開いてください。

macOS:

```text
Finder でフォルダを開く
```

Windows:

```text
Explorer でフォルダを開く
```

Electronでは基本的に以下を使ってください。

```js
shell.openPath(folderPath)
```

---

## main 側の起動処理を確認

`electron/main.cjs` で以下を検索してください。

```text
item:open
openPath
showItemInFolder
shell.openExternal
shell.openPath
open item
```

フォルダの場合は必ず `shell.openPath(item.path)` を使ってください。

例:

```js
ipcMain.handle("item:open", async (_event, item) => {
  try {
    const targetPath = item?.path;

    if (!targetPath) {
      return { ok: false, error: "パスが空です" };
    }

    if (/^https?:\/\//i.test(targetPath)) {
      await shell.openExternal(targetPath);
      return { ok: true };
    }

    const stat = await fs.promises.stat(targetPath);

    if (stat.isDirectory()) {
      const errorMessage = await shell.openPath(targetPath);

      if (errorMessage) {
        return { ok: false, error: errorMessage };
      }

      return { ok: true };
    }

    const errorMessage = await shell.openPath(targetPath);

    if (errorMessage) {
      return { ok: false, error: errorMessage };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message ?? error)
    };
  }
});
```

重要:

* フォルダは `shell.showItemInFolder(folderPath)` ではなく `shell.openPath(folderPath)` を使う
* `showItemInFolder()` はファイルの場所を開く用途
* フォルダそのものを開きたい場合は `openPath()`

---

## renderer 側のダブルクリック処理を確認

`src/App.jsx` で以下を検索してください。

```text
onDoubleClick
handleIconDoubleClick
openItem
api.openItem
deleteCellMode
registerMode
```

以下を確認してください。

```text
通常モードでダブルクリックしたときだけ openItem が呼ばれる
削除モードでは起動しない
登録モードでは起動しない
フォルダ item も openItem に渡される
```

例:

```js
function handleIconDoubleClick(event, item) {
  event.preventDefault();
  event.stopPropagation();

  if (registerMode || deleteCellMode) {
    return;
  }

  openItem(item);
}
```

---

## preload 側の API を確認

`electron/preload.cjs` で `openItem` が公開されていることを確認してください。

```js
openItem: (item) => ipcRenderer.invoke("item:open", item)
```

名前が既存と違う場合は既存名に合わせてください。

---

## ログ追加

フォルダが開かない場合に原因が見えるよう、一時ログを追加してください。

```js
console.log("Opening item", {
  path: targetPath,
  type: item?.type,
  kind: item?.kind
});
```

失敗時は renderer 側で alert または console.error に出してください。

```js
const result = await window.griddesk.openItem(item);

if (result?.ok === false) {
  console.error("Failed to open item", result);
  alert(result.error || "開けませんでした");
}
```

---

## 完了条件

以下を実画面で確認してください。

* macOSでフォルダセルをダブルクリックするとFinderで開く
* macOSでファイルセルをダブルクリックすると既定アプリで開く
* URLセルをダブルクリックするとブラウザで開く
* WindowsではフォルダセルをダブルクリックするとExplorerで開く
* 起動失敗時にエラー内容が確認できる
* 削除モードではダブルクリック起動しない
* 登録モードではダブルクリック起動しない

---

# 作業後の報告形式

```text
対応結果:

1. 設定アイコン反映修正:
- アイコン解決優先順位確認: OK / NG
- item側古いicon値の自動優先を停止: OK / NG
- settings変更で既存配置アイコン即時反映: OK / NG
- フォルダ設定変更の既存フォルダ反映: OK / NG
- useMemo依存配列確認: OK / NG

2. フォルダ起動修正:
- item:open 処理確認: OK / NG
- フォルダは shell.openPath 使用: OK / NG
- showItemInFolder誤用修正: OK / NG
- rendererダブルクリック処理確認: OK / NG
- preload API確認: OK / NG
- macOS Finderでフォルダ起動確認: OK / NG
- ファイル/URL起動維持: OK / NG

変更ファイル:
- src/App.jsx:
- electron/main.cjs:
- electron/preload.cjs:
- その他:

確認:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm run build:
- npm run dist:dir:
- macOS .app 起動:
- フォルダ起動:
- 設定アイコン変更反映:

作業ログ:
- _md/yyyymmdd-hhmmss.md
```

ビルド成功だけで完了扱いにしないでください。
必ず実画面で、設定変更後に配置済みアイコンが変わることと、フォルダがFinder/Explorerで開くことを確認してください。

---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

ファイル名は以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

この作業ログ作成も完了条件に含めてください。
ログファイルが作成されていない場合は作業完了扱いにしないでください。


---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

ファイル名は以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

この作業ログ作成も完了条件に含めてください。
ログファイルが作成されていない場合は作業完了扱いにしないでください。

---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

ファイル名は以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
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
