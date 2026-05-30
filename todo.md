# GridDesk .gitignore 追記指示

GridDesk プロジェクトの `.gitignore` を確認し、Electron + React + Vite + SQLite 構成に合わせて必要な除外設定を追記してください。

今回は `.gitignore` の更新のみ行ってください。

## 禁止事項

以下は変更しないでください。

- src/
- electron/
- docs/
- README.md
- package.json
- package-lock.json
- DBスキーマ
- 実装コード

---

# 1. 現在の .gitignore を確認

まず、既存の `.gitignore` があるか確認してください。

- ある場合: 既存内容を維持し、足りない項目だけ追記
- ない場合: 新規作成

重複項目がある場合は整理して構いません。

---

# 2. 追記したい項目

以下を `.gitignore` に追加してください。

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
dist-electron/
build/
out/
release/
releases/

# Vite
.vite/

# Electron builder / packager
*.asar
*.blockmap
*.dmg
*.exe
*.AppImage
*.deb
*.rpm
*.zip
*.tar.gz

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment files
.env
.env.*
!.env.example

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Editor / IDE
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.swp
*.swo

# SQLite / local database files
*.db
*.db-shm
*.db-wal
*.sqlite
*.sqlite3

# GridDesk workspaces and local user data
GridDeskWorkspace/
GridDeskWorkspaces/
MyGridDeskWorkspace/
workspaces/
workspace/
vaults/
launcher.db
settings.json
path_aliases.json
icons/
backups/
exports/

# Temporary files
tmp/
temp/
.cache/
coverage/

# Local test artifacts
test-workspace/
test-workspaces/
mock-workspace/
mock-workspaces/
```

---

# 3. 注意点

## package-lock.json は除外しない

`package-lock.json` は依存関係固定のため Git 管理対象にしてください。
`.gitignore` に入れないでください。

## README / docs は除外しない

以下は Git 管理対象です。

```text
README.md
docs/
```

## サンプル設定は除外しない

将来的にサンプル設定を置く場合、以下のようなファイルは管理対象にしてください。

```text
settings.example.json
path_aliases.example.json
.env.example
```

---

# 4. 作業後の報告形式

以下の形式で報告してください。

```text
対応結果:

.gitignore 更新:
- 既存 .gitignore 確認: OK / NG
- Electron/Vite/React 用除外追加: OK / NG
- SQLite / GridDesk workspace 除外追加: OK / NG
- package-lock.json を除外していない: OK / NG
- README.md / docs を除外していない: OK / NG

変更ファイル:
- .gitignore

確認:
- git status で意図しない node_modules / dist / launcher.db / settings.json が出ないこと:
```

今回は、.gitignoreのみ変更する。

特に `launcher.db`, `settings.json`, `path_aliases.json`, `backups/`, `exports/` は個人ワークスペース側の実データなので、Git管理から外す方針でよいです。