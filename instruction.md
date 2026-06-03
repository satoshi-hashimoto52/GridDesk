# GridDesk 実装指示：最近開いたワークスペース削除・macOS/Windows配布アプリ作成

今回は以下の2点を対応してください。

1. 最近開いたワークスペースを個別削除・全削除できるようにする
2. macOS / Windows の両方で配布可能なアプリ形式を作成できるようにする

   * macOS: `.app` / 必要に応じて `.dmg`
   * Windows: `.exe` インストーラー / 必要に応じて portable exe

## 重要な前提

macOS用 `.app` は macOS 環境で作成してください。
Windows用 `.exe` は Windows 環境で作成するのが最も安全です。

macOS上から Windows exe をクロスビルドできる場合もありますが、Electron / ネイティブ依存 / 署名 / Wine などの問題があるため、最終確認は Windows 実機または Windows CI で行ってください。

今回は、GridDesk プロジェクトとして **macOS / Windows の両方をビルドできる設定・スクリプト・ドキュメント** を整備してください。

---

# 禁止事項

今回は以下を変更しないでください。

* セル登録ロジック
* ファイル/フォルダ起動処理
* PDFプレビュー
* テキストホバー/ピン留め機能
* Markdown表示ロジック
* アイコン設定ロジック
* 検索ロジック
* DBスキーマの不要な変更
* 既存ワークスペースデータ構造の破壊

---

# 1. 最近開いたワークスペースを削除できるようにする

## 目的

現在、最近開いたワークスペースが一覧表示されている場合、その履歴を消す手段がありません。

以下を追加してください。

* 最近開いたワークスペースを1件ずつ削除
* 最近開いたワークスペースを全件削除
* 削除は履歴から消すだけで、実フォルダや `launcher.db` は削除しない

---

## 1-1. 保存場所の確認

まず、最近開いたワークスペースの保存場所を確認してください。

候補:

```text
settings.json
app settings
localStorage
electron-store
userData配下のjson
recentWorkspaces
recent_workspace
```

既存実装を尊重してください。

もし未整理なら、Electron の userData 配下に保存されるアプリ設定、または既存の settings 保存処理に合わせてください。

推奨構造:

```json
{
  "recentWorkspaces": [
    {
      "path": "/Users/hashimoto/GridDeskWorkspace",
      "name": "GridDeskWorkspace",
      "lastOpenedAt": "2026-06-02T10:20:30.000Z"
    }
  ]
}
```

既存が文字列配列なら、そのままでも構いません。

```json
{
  "recentWorkspaces": [
    "/Users/hashimoto/GridDeskWorkspace"
  ]
}
```

---

## 1-2. UI仕様

最近開いたワークスペース一覧に、削除ボタンを追加してください。

表示例:

```text
最近開いたワークスペース

GridDeskWorkspace
/Users/hashimoto/GridDeskWorkspace      [開く] [削除]

SampleWorkspace
/Users/hashimoto/SampleWorkspace        [開く] [削除]

[履歴をすべて削除]
```

## 削除ボタン

1件削除時は確認ダイアログを出してください。

```text
このワークスペースを最近開いた履歴から削除しますか？
実際のフォルダやデータベースは削除されません。
```

OKなら履歴から削除。
キャンセルなら何もしない。

## 全削除ボタン

全削除時も確認ダイアログを出してください。

```text
最近開いたワークスペース履歴をすべて削除しますか？
実際のフォルダやデータベースは削除されません。
```

---

## 1-3. 関数例

既存 state 名に合わせてください。

```jsx
function removeRecentWorkspace(workspacePath) {
  const ok = window.confirm(
    [
      "このワークスペースを最近開いた履歴から削除しますか？",
      "実際のフォルダやデータベースは削除されません。"
    ].join("\n")
  );

  if (!ok) return;

  updateSettingsLocal((prev) => {
    const current = prev.recentWorkspaces ?? prev.ui?.recentWorkspaces ?? [];

    const nextRecent = current.filter((entry) => {
      const path = typeof entry === "string" ? entry : entry.path;
      return normalizeWorkspacePath(path) !== normalizeWorkspacePath(workspacePath);
    });

    return {
      ...prev,
      recentWorkspaces: nextRecent,
      ui: {
        ...(prev.ui ?? {}),
        recentWorkspaces: prev.ui?.recentWorkspaces ? nextRecent : prev.ui?.recentWorkspaces
      }
    };
  });
}
```

パス正規化:

```jsx
function normalizeWorkspacePath(path) {
  return String(path ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase();
}
```

全削除:

```jsx
function clearRecentWorkspaces() {
  const ok = window.confirm(
    [
      "最近開いたワークスペース履歴をすべて削除しますか？",
      "実際のフォルダやデータベースは削除されません。"
    ].join("\n")
  );

  if (!ok) return;

  updateSettingsLocal((prev) => ({
    ...prev,
    recentWorkspaces: [],
    ui: {
      ...(prev.ui ?? {}),
      recentWorkspaces: prev.ui?.recentWorkspaces ? [] : prev.ui?.recentWorkspaces
    }
  }));
}
```

既存保存処理が `saveAppSettings` / `saveSettings` / IPC 経由の場合は、それに合わせてください。

---

## 1-4. 完了条件

以下を実画面で確認してください。

* 最近開いたワークスペース一覧が表示される
* 1件ごとに削除ボタンがある
* 削除確認が出る
* OKで履歴から消える
* キャンセルで残る
* 全削除ボタンがある
* 全削除確認が出る
* OKで履歴が空になる
* 実際のワークスペースフォルダやDBは削除されない
* アプリ再起動後も削除状態が維持される

---

# 2. macOS / Windows 向け配布アプリ作成

## 目的

GridDesk を開発起動だけでなく、通常のアプリケーションとして配布できるようにします。

対象:

```text
macOS:
  .app
  .dmg

Windows:
  .exe installer
  portable exe
```

---

# 2-1. electron-builder を導入する

`electron-builder` が未導入なら追加してください。

```bash
npm install --save-dev electron-builder
```

既に導入済みなら重複追加しないでください。

---

# 2-2. package.json を確認・修正

`package.json` に build 用 script を追加してください。

推奨:

```json
{
  "scripts": {
    "dev": "vite",
    "electron": "electron .",
    "start": "concurrently \"npm run dev\" \"wait-on http://127.0.0.1:5173 && electron .\"",
    "build": "vite build",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "dist:dir": "npm run build && electron-builder --dir"
  }
}
```

既存 script がある場合は壊さず統合してください。

---

# 2-3. electron-builder 設定

`package.json` の `build` フィールド、または `electron-builder.yml` を追加してください。

どちらか一方に統一してください。
推奨は `electron-builder.yml` です。

## electron-builder.yml 例

```yaml
appId: jp.griddesk.app
productName: GridDesk

directories:
  output: release
  buildResources: build

files:
  - dist/**/*
  - electron/**/*
  - package.json
  - node_modules/**/*

asar: true

mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  category: public.app-category.productivity
  hardenedRuntime: false
  gatekeeperAssess: false

win:
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
  artifactName: ${productName}-${version}-${os}-${arch}.${ext}

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

extraMetadata:
  main: electron/main.cjs
```

注意:

* 署名や notarization は今回必須にしない
* macOS配布でGatekeeper警告が出る可能性があることを docs に記載
* Windows Defender / SmartScreen 警告が出る可能性があることを docs に記載

---

# 2-4. Vite 本番読み込み確認

Electron main process が開発時と本番時で読み込み先を切り替えているか確認してください。

開発時:

```text
http://127.0.0.1:5173/
```

本番時:

```text
dist/index.html
```

例:

```js
if (process.env.NODE_ENV === "development") {
  mainWindow.loadURL("http://127.0.0.1:5173/");
} else {
  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
```

ただし、実際のディレクトリ構造に合わせてください。

electron-builder で packaged 状態でも `dist/index.html` が正しく読み込めるようにしてください。

---

# 2-5. ネイティブ依存の確認

SQLiteをCLIで使っている場合、配布後に動くか確認してください。

確認対象:

```text
sqlite3 CLI を呼んでいるか
better-sqlite3 を使っているか
node sqlite library を使っているか
外部 sqlite バイナリに依存していないか
```

もし外部 `sqlite3` コマンドに依存している場合、配布アプリでは動作しない可能性があります。
その場合は以下を検討してください。

```text
better-sqlite3 などアプリ同梱可能な方式へ移行
または sqlite バイナリを extraResources で同梱
```

今回すぐにDB実装を変えない場合でも、必ず注意点として記録してください。

---

# 2-6. アイコンファイル

アプリ用アイコンを設定してください。

`build/` フォルダを作成し、以下を配置する前提にしてください。

```text
build/
  icon.icns
  icon.ico
  icon.png
```

まだアイコンファイルが無い場合は、設定だけ準備し、docs に「後で配置」と記載してください。

electron-builder.yml に追加:

```yaml
mac:
  icon: build/icon.icns

win:
  icon: build/icon.ico
```

既にアプリアイコンが存在する場合はそれを使ってください。

---

# 2-7. ビルド成果物

期待する出力先:

```text
release/
  mac/
  GridDesk-0.1.0-arm64.dmg
  GridDesk-0.1.0-x64.dmg
  GridDesk-0.1.0-win-x64.exe
```

実際のファイル名は electron-builder の出力に合わせてください。

---

# 2-8. docs 更新

`README.md` と `/docs/setup.md` または `/docs/build.md` に、ビルド方法を追記してください。

記載内容:

````markdown
## 配布アプリの作成

### macOS

```bash
npm run dist:mac
````

出力:

```text
release/
```

### Windows

```bash
npm run dist:win
```

Windows版は Windows 環境または Windows CI でビルドすることを推奨します。

### 開発確認

```bash
npm start
```

### 本番ビルド確認

```bash
npm run build
npm run dist:dir
```

### 注意

* macOSの未署名アプリはGatekeeper警告が出る場合があります
* Windowsの未署名exeはSmartScreen警告が出る場合があります
* 署名・notarizationは今後対応予定です

````

---

# 2-9. GitHub Actions は任意

余裕があれば、CI設定を追加してください。

```text
.github/workflows/build.yml
````

ただし、今回は必須ではありません。

必須は以下です。

```text
ローカルで npm run dist:mac / npm run dist:win を実行できる設定
```

---

# 2-10. 完了条件

以下を確認してください。

## 設定

* electron-builder が導入されている
* package.json に dist 系 script がある
* electron-builder 設定がある
* 本番時に dist/index.html を読める
* release フォルダへ出力される

## macOS

* `npm run dist:mac` が実行できる
* `.app` または `.dmg` が生成される
* 生成した `.app` を起動できる
* ワークスペース作成/読込ができる

## Windows

Windows環境で以下を確認してください。

* `npm run dist:win` が実行できる
* `.exe` が生成される
* Windowsで起動できる
* ワークスペース作成/読込ができる
* ファイル/フォルダ起動が動く

macOS上で Windows exe の実行確認ができない場合は、未確認として明記してください。

---

# 作業後の報告形式

```text
対応結果:

1. 最近開いたワークスペース削除:
- 1件削除UI追加: OK / NG
- 全削除UI追加: OK / NG
- 削除確認ダイアログ: OK / NG
- 実フォルダを削除しない: OK / NG
- 再起動後も履歴削除維持: OK / NG

2. 配布アプリ作成:
- electron-builder 導入: OK / NG
- package.json scripts追加: OK / NG
- electron-builder設定追加: OK / NG
- 本番dist読み込み確認: OK / NG
- macOS .app/.dmg生成: OK / NG
- Windows .exe生成: OK / NG
- README/docs更新: OK / NG

変更ファイル:
- package.json:
- electron-builder.yml:
- electron/main.cjs:
- electron/preload.cjs:
- src/App.jsx:
- src/styles.css:
- README.md:
- docs/...:
- その他:

確認:
- npm install:
- npm run build:
- npm run dist:dir:
- npm run dist:mac:
- npm run dist:win:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm start:

作業ログ:
- _md/yyyymmdd-hhmmss.md
```

ビルド成功だけで完了扱いにしないでください。
必ず生成物の有無と、実際に起動確認できた環境を明記してください。

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
20260602-203015.md
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
