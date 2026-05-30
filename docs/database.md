# SQLite DB 仕様

GridDesk の DB ファイル名は `launcher.db` です。ワークスペースフォルダ直下に作成されます。

## テーブル一覧

| テーブル | 役割 |
| --- | --- |
| `genres` | ジャンル定義 |
| `items` | 登録アイコン |
| `disabled_cells` | 削除済みセル |
| `app_settings` | DB 内設定用。現在は作成のみ |
| `path_aliases` | DB 内 alias 用。現在は作成のみ |

現在の実装では、設定と alias の実体は主に `settings.json` と `path_aliases.json` を使います。

## genres

ジャンルごとのグリッド設定を保存します。

```sql
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cols INTEGER NOT NULL DEFAULT 6,
  rows INTEGER NOT NULL DEFAULT 3,
  collapsed INTEGER NOT NULL DEFAULT 0,
  accent_color TEXT,
  memo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

主なカラム:

| カラム | 内容 |
| --- | --- |
| `name` | ジャンル名。一意 |
| `sort_order` | 表示順 |
| `cols` / `rows` | グリッド列数/行数 |
| `collapsed` | 折りたたみ状態 |
| `accent_color` | ジャンルのアクセント色 |

## items

セル上に配置するアイコンを保存します。

```sql
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  path_type TEXT NOT NULL DEFAULT 'absolute',
  item_type TEXT NOT NULL DEFAULT 'default',
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  icon_path TEXT,
  memo TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);
```

主なカラム:

| カラム | 内容 |
| --- | --- |
| `genre_id` | 所属ジャンル |
| `name` | 表示名 |
| `path` | 登録パスまたは URL |
| `path_type` | `absolute`, `relative`, `alias`, `url` |
| `item_type` | `folder`, `pdf`, `excel`, `image`, `app`, `note`, `link`, `default` |
| `x` / `y` | セル座標 |
| `enabled` | 論理削除フラグ |

## disabled_cells

削除済みセルを保存します。

```sql
CREATE TABLE IF NOT EXISTS disabled_cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_id INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (genre_id, x, y),
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);
```

## app_settings

DB 内に設定を保存する将来拡張用テーブルです。現在の MVP では `settings.json` が主に使われています。

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## path_aliases

DB 内に alias を保存する将来拡張用テーブルです。現在の MVP では `path_aliases.json` が主に使われています。

```sql
CREATE TABLE IF NOT EXISTS path_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT NOT NULL UNIQUE,
  real_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## リレーション

```text
genres 1 -- N items
genres 1 -- N disabled_cells
```

`genres` を削除すると、関連する `items` と `disabled_cells` は `ON DELETE CASCADE` で削除されます。

## 一意制約

同じジャンル内の同じセルに複数アイコンを置かない方針です。

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_genre_cell
ON items (genre_id, x, y)
WHERE enabled = 1;
```

削除済みセルも同じ座標を重複登録しないようにしています。

```sql
UNIQUE (genre_id, x, y)
```

## 同じ path の再登録

現在の実装では、同じ `path` が `enabled = 1` で存在する場合、新規追加ではなく既存 item を更新します。

更新される主な項目:

- `genre_id`
- `name`
- `path_type`
- `item_type`
- `x`
- `y`
- `updated_at`

移動先セルに既存アイコンがある場合、renderer 側では登録/移動をキャンセルします。

## DB 更新前バックアップ

以下の操作前に `backups/` へバックアップを作成します。

- ジャンル追加/変更/削除
- アイコン登録/移動/削除
- セル削除/復活

## 将来的なマイグレーション方針

現在は `CREATE TABLE IF NOT EXISTS` による初期化です。将来的には次のような方式に移行する予定です。

- `schema_migrations` テーブルを追加
- SQL ファイル単位で migration を管理
- 起動時に未適用 migration を順に適用
- 破壊的変更前に必ずバックアップを作成
