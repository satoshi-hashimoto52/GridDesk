# トラブルシューティング

## npm install が失敗する

依存関係の取得には npm registry へのアクセスが必要です。ネットワーク制限、プロキシ、DNS を確認してください。

```bash
npm install
```

Electron はパッケージサイズが大きいため、ダウンロードに時間がかかる場合があります。

## Electron のダウンロードに失敗する

ネットワーク制限やプロキシの影響が考えられます。社内ネットワークや制限付き環境では、npm/Electron のダウンロード先に到達できるか確認してください。

## npm audit が失敗する

`npm audit` は npm registry にアクセスします。次のようなエラーはネットワーク起因の可能性があります。

```text
getaddrinfo ENOTFOUND registry.npmjs.org
```

ビルド確認とは切り分けて、ネットワーク利用可能な環境で再実行してください。

## Electron が SIGABRT で落ちる

macOS のサンドボックスや GUI 起動権限の影響で、Electron が `SIGABRT` になる場合があります。

対処:

- 通常のターミナルから `npm run electron` を実行する
- VS Code の統合ターミナルから起動する
- セキュリティ許可が必要な場合は macOS の設定を確認する
- Vite dev server が起動済みか確認する

## 画面が真っ白になる

主な原因:

- Vite dev server が起動していない
- `index.html` の script entry が誤っている
- renderer で JavaScript エラーが発生している
- preload API が見つからない

確認:

```bash
npm run dev
npm run electron
```

現在の `index.html` は次を読み込む必要があります。

```html
<script type="module" src="/src/main.jsx"></script>
```

## preload API が見つからない

通常ブラウザで `http://127.0.0.1:5173/` を開くと、`window.gridDesk` は存在しません。GridDesk は Electron preload API を前提としているため、Electron 画面で操作してください。

確認点:

- `electron/preload.cjs` が存在する
- `BrowserWindow` の `preload` が正しい
- `contextIsolation: true`
- `nodeIntegration: false`

## ファイルが開かない

原因:

- パスが存在しない
- 権限がない
- 登録パスが別 PC の絶対パスのまま
- alias path が `path_aliases.json` と一致していない

現在は起動失敗時にトーストを表示します。リンク切れ一覧や修正 UI は今後実装予定です。

## フォルダが開かない

`shell.openPath` は存在しないフォルダや権限のないフォルダでは失敗します。Finder/Explorer で実際に開けるパスか確認してください。

## DB が作成されない

確認点:

- `sqlite3 --version` が成功する
- ワークスペースフォルダに書き込み権限がある
- `launcher.db` がロックされていない
- Electron main process のエラーを確認する

## DB が壊れた場合

`backups/` から直近の `launcher_*.db` を復元します。

基本手順:

1. GridDesk を終了します。
2. 現在の `launcher.db` を別名退避します。
3. `backups/launcher_*.db` から復元したいファイルを `launcher.db` としてコピーします。
4. GridDesk を再起動します。

復元 UI は今後実装予定です。

## ドラッグ＆ドロップできない

確認点:

- Electron 画面で操作しているか
- ドロップ先が削除済みセルではないか
- ドロップ先に既存アイコンがないか
- OS 側の権限やセキュリティ制限によりファイルパスが渡っているか

通常ブラウザでは Electron 固有のファイルパス取得が期待通り動かない場合があります。

## 権限やセキュリティ制限

GridDesk はローカルファイルを開くため、OS のセキュリティ制限の影響を受けます。

- macOS のファイルアクセス権限
- ダウンロードした Electron アプリの実行制限
- ネットワークドライブのアクセス権限
- OneDrive/Dropbox の同期中ロック
- 読み取り専用フォルダ

ワークスペースは書き込み可能なローカルフォルダで試すのが安全です。
