# 配布ビルド

GridDesk は `electron-builder` で macOS 向けの配布物を作成します。

## 事前準備

```bash
npm install
```

アプリアイコンは次の場所に配置してください。未配置でも開発ビルドは可能ですが、配布物では既定アイコンまたはビルドエラーになる場合があります。

| ファイル | 用途 |
| --- | --- |
| `build/icon.icns` | macOS |
| `build/icon.png` | 予備素材 |

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dist` | 現在の OS 向けに配布物を作成 |
| `npm run dist:dir` | インストーラなしの展開ディレクトリを作成 |
| `npm run dist:mac` | macOS の `.dmg` / `.zip` を作成 |

成果物は `release/` に出力されます。

## 注意点

- macOS で作成する `.app` は署名・公証を設定していません。配布先では Gatekeeper の警告が出る可能性があります。
- SQLite は macOS では `sqlite3` CLI を使います。
