# セットアップ

このドキュメントでは、GridDesk の開発環境構築と起動方法を説明します。

## 前提環境

| 項目 | 用途 |
| --- | --- |
| Node.js | npm scripts と Vite/Electron の実行 |
| npm | 依存関係のインストール |
| Electron | デスクトップアプリ実行 |
| SQLite CLI | `launcher.db` の作成/更新 |

SQLite は Node のネイティブパッケージではなく、`sqlite3` コマンドを `electron/main.cjs` から呼び出しています。次のコマンドで確認できます。

```bash
sqlite3 --version
```

## インストール

```bash
npm install
```

## 開発起動

Vite dev server を起動します。

```bash
npm run dev
```

Electron を別ターミナルで起動します。

```bash
npm run electron
```

まとめて起動する場合は次を使います。

```bash
npm start
```

`npm start` は `concurrently` と `wait-on` を使い、Vite の起動後に Electron を開きます。

## ビルド

```bash
npm run build
```

`build` は Vite の production build です。配布アプリを作成する場合は `electron-builder` を使います。
成果物は `release/` に出力されます。詳細は [配布ビルド](./build.md) を参照してください。

## main/preload の構文チェック

```bash
node --check electron/main.cjs
node --check electron/preload.cjs
```

## macOS の権限について

macOS では Electron の初回起動時に GUI アプリ起動やファイルアクセスに関する権限が必要になる場合があります。サンドボックス環境から起動すると `SIGABRT` で終了することがあります。その場合は、通常のターミナルや許可済みの実行環境から起動してください。

## npm audit について

`npm audit` は npm registry にアクセスします。ネットワーク制限や DNS 制限がある環境では、次のようなエラーで失敗する場合があります。

```text
getaddrinfo ENOTFOUND registry.npmjs.org
```

これはアプリのビルド失敗とは別問題です。ネットワークが利用できる環境で再実行してください。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm install` | 依存関係をインストール |
| `npm run dev` | Vite dev server を起動 |
| `npm run electron` | Electron を起動 |
| `npm start` | Vite と Electron をまとめて起動 |
| `npm run build` | renderer をビルド |
| `node --check electron/main.cjs` | main process の構文チェック |
| `node --check electron/preload.cjs` | preload の構文チェック |
| `sqlite3 --version` | SQLite CLI の確認 |
