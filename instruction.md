了解です。いまの報告を見る限り、**Windows実機でUIが表示されない件はまだ未確認・未修正**のままです。
次に Codex へ渡すなら、前回の「配布設定」ではなく、**Windows版のUI非表示を実機前提で切り分ける指示**に絞った方がよいです。

以下をそのまま渡してください。

# GridDesk 緊急修正指示：Windows版で起動するがUIが表示されない問題の切り分けと修正

## 現状

macOS版 `.app` は正常に起動し、UIも表示されます。
Windows版は以下のどちらも起動はしますが、UIが表示されません。

* `GridDesk-0.1.0-win-x64-setup.exe`
* `GridDesk-0.1.0-win-x64-portable.exe`

前回作業では Windows版のビルド生成までは確認されていますが、Windows実機起動確認は未実施です。

今回は **Windows版でUIが表示されること** を最優先で修正してください。

---

# 禁止事項

今回は以下を触らないでください。

* 最近開いたワークスペース削除機能
* セル登録ロジック
* DBスキーマ
* PDFプレビュー
* テキストホバー/ピン留め機能
* Markdown表示
* アイコン設定
* 検索機能
* カテゴリ管理
* ワークスペース仕様

---

# 1. Windowsでは透明ウィンドウを無効化する

## 目的

Windowsで `transparent: true` / `frame: false` の組み合わせにより、UIが表示されない可能性があります。

Windowsではまず確実にUIを表示するため、以下にしてください。

```text
transparent: false
backgroundColor: "#f6f7f4"
frame: true
```

macOSでは従来の透過/独自フレームを維持して構いません。

---

## 修正対象

`electron/main.cjs` の `createWindow()` を確認してください。

現在の `BrowserWindow` 設定をOS別にしてください。

```js
const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";

function createWindow() {
  const useTransparentWindow = isMac;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 260,
    minHeight: 260,
    title: "GridDesk",

    backgroundColor: useTransparentWindow ? "#00000000" : "#f6f7f4",
    transparent: useTransparentWindow,

    frame: isWindows ? true : false,

    titleBarStyle: isMac ? "hiddenInset" : undefined,
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ...
}
```

重要:

```text
Windows:
  transparent: false
  backgroundColor: "#f6f7f4"
  frame: true

macOS:
  transparent: true
  backgroundColor: "#00000000"
  frame: false
```

---

# 2. Windows版で renderer 読み込みログを出す

Windows実機で原因を確認できるよう、以下のログを `mainWindow` 作成直後に追加してください。

```js
mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
  console.error("Renderer did-fail-load", {
    errorCode,
    errorDescription,
    validatedURL
  });
});

mainWindow.webContents.on("render-process-gone", (_event, details) => {
  console.error("Renderer process gone", details);
});

mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
  console.log("Renderer console:", {
    level,
    message,
    line,
    sourceId
  });
});
```

---

# 3. WindowsでDevToolsを開けるようにする

デバッグ時だけ DevTools を開けるようにしてください。

```js
if (process.env.GRIDDESK_DEBUG_RENDERER === "1") {
  mainWindow.webContents.openDevTools({ mode: "detach" });
}
```

Windows確認時は以下で起動してください。

PowerShell:

```powershell
$env:GRIDDESK_DEBUG_RENDERER="1"
.\GridDesk.exe
```

cmd:

```bat
set GRIDDESK_DEBUG_RENDERER=1
GridDesk.exe
```

---

# 4. Vite asset path を再確認する

macOS版が動いていても、Windows版パッケージで `dist/index.html` が壊れていないか確認してください。

`dist/index.html` は以下になっている必要があります。

OK:

```html
<script type="module" crossorigin src="./assets/index-xxxx.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-xxxx.css">
```

NG:

```html
<script type="module" crossorigin src="/assets/index-xxxx.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-xxxx.css">
```

`/assets/...` の場合は、Vite設定に `base: "./"` を追加または再確認してください。

---

# 5. Windows向けビルドを再生成する

macOS側で修正後、以下を実行してください。

```bash
node --check electron/main.cjs
node --check electron/preload.cjs
npm run build
npm run dist:win
```

生成物:

```text
release/GridDesk-0.1.0-win-x64-setup.exe
release/GridDesk-0.1.0-win-x64-portable.exe
release/win-unpacked/
```

Windowsへ渡す場合:

* portable exe を渡す
* または `release/win-unpacked/` フォルダ一式を渡す
* `win-unpacked/GridDesk.exe` 単体では渡さない

---

# 6. Windows実機で確認すること

Windows実機で以下を確認してください。

## portable版

```text
GridDesk-0.1.0-win-x64-portable.exe
```

確認:

* 起動する
* UIが表示される
* ワークスペース選択画面が見える
* ワークスペース作成/読込ができる

## installer版

```text
GridDesk-0.1.0-win-x64-setup.exe
```

確認:

* インストールできる
* 起動する
* UIが表示される
* ワークスペース作成/読込ができる

## win-unpacked版

`win-unpacked` フォルダごとWindowsへコピーして確認してください。

```text
win-unpacked/
  GridDesk.exe
  resources/
  *.dll
  locales/
  ...
```

`GridDesk.exe` 単体コピーでは不可です。

---

# 7. Windows版UIが出た後の扱い

Windows版で UI が表示されることを確認できたら、Windowsの透明化は一旦不要です。

Windowsの最終推奨設定:

```js
transparent: false,
backgroundColor: "#f6f7f4",
frame: true
```

macOSの最終推奨設定:

```js
transparent: true,
backgroundColor: "#00000000",
frame: false,
titleBarStyle: "hiddenInset"
```

---

# 完了条件

* Windows portable exe でUIが表示される
* Windows installer exe でUIが表示される
* Windowsでワークスペース選択画面が表示される
* Windowsでワークスペース作成/読込ができる
* macOS app の表示が壊れていない
* `dist/index.html` の asset path が `./assets/...` である
* renderer load error が出ていない

---

# 作業後の報告形式

```text
対応結果:

Windows版UI非表示修正:
- BrowserWindow設定をOS別分岐: OK / NG
- Windows transparent:false: OK / NG
- Windows frame:true: OK / NG
- Windows backgroundColor設定: OK / NG
- rendererログ追加: OK / NG
- debug DevTools起動対応: OK / NG
- dist/index.html asset path確認: OK / NG
- Windows portable exe起動確認: OK / NG
- Windows installer exe起動確認: OK / NG
- macOS app継続確認: OK / NG

変更ファイル:
- electron/main.cjs:
- その他:

確認:
- node --check electron/main.cjs:
- node --check electron/preload.cjs:
- npm run build:
- npm run dist:win:
- npm run dist:mac:
- Windows portable exe起動:
- Windows installer exe起動:
- macOS app起動:

作業ログ:
- _md/yyyymmdd-hhmmss.md
```

ビルド成功だけで完了扱いにしないでください。
Windows実機で portable版または installer版を起動し、UIが表示されることを必ず確認してください。

---

# 作業ログ出力ルール

今回の作業完了後、対応内容をプロジェクトディレクトリ内の `_md/` フォルダへ Markdown ファイルとして必ず書き出してください。

ファイル名は以下の形式にしてください。

```text
yyyymmdd-hhmmss.md
```

この作業ログ作成も完了条件に含めてください。
ログファイルが作成されていない場合は作業完了扱いにしないでください。

今回のポイントは、**Windowsだけ透明ウィンドウをやめる**ことです。Mac版が正常なら、まずWindows版は通常フレーム・不透明背景で安定表示を優先するのが安全です。

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
