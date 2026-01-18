# データ保存方式の分析と推奨事項

## 1. 現状分析

### 1.1 現在のデータベース構成

| 項目             | 現在の構成                                              |
| ---------------- | ------------------------------------------------------- |
| **データベース** | SQLite（ファイルベース）                                |
| **ORM**          | TypeORM                                                 |
| **保存場所**     | `backend/data/database.sqlite`                          |
| **画像保存**     | ローカルファイルシステム (`backend/uploads/equipment/`) |

### 1.2 管理対象エンティティ

| エンティティ          | 説明         | 主要フィールド                           |
| --------------------- | ------------ | ---------------------------------------- |
| **User**              | ユーザー情報 | 名前、メール、パスワード、部署、ロール   |
| **Equipment**         | 資機材情報   | 名称、カテゴリ、数量、保管場所、画像 URL |
| **Reservation**       | 予約情報     | 申請者、機材、期間、数量、ステータス     |
| **EquipmentCategory** | カテゴリ情報 | カテゴリ名、説明                         |

---

## 2. 要件定義からの抽出サマリー

### requirements-1.md（メイン要件）

- **開発環境**: SQLite
- **本番環境**: PostgreSQL / MySQL を想定
- **将来構成案**: Firebase (Firestore + Cloud Functions)
- **データ保持**: 過去 5 年分のアーカイブ

### requirements-2.md（Google 連携）

- **目的**: Google 系システムへのデータ連携（分析・共有）
- **推奨ストレージ**:
  1. BigQuery（大量データ蓄積＋分析）
  2. Cloud SQL（RDB 互換）
  3. Google Sheets（軽量共有）

### requirements-3.md（次期開発）

- CSV エクスポート機能
- 監査ログ機能
- 通知機能（メール）

---

## 3. 現在の方式のデメリット

### 3.1 SQLite のデメリット

| デメリット           | 影響                                         |
| -------------------- | -------------------------------------------- |
| **同時接続制限**     | 複数ユーザーの同時アクセスでロック競合が発生 |
| **スケーラビリティ** | サーバー 1 台に限定、水平スケール不可        |
| **バックアップ**     | ファイルコピーが必要、運用が煩雑             |
| **本番運用**         | 信頼性・耐障害性が低い                       |

### 3.2 ローカルファイル画像保存のデメリット

| デメリット           | 影響                             |
| -------------------- | -------------------------------- |
| **デプロイ時の同期** | `uploads/`フォルダを別途管理必要 |
| **サーバー移行**     | ファイルのマイグレーションが必要 |
| **ディスク容量**     | サーバーディスクに依存           |
| **孤児ファイル**     | DB と画像ファイルの不整合リスク  |

---

## 4. コストゼロの解決策

### 4.1 データベース：SQLite を継続（社内運用向け）

> [!TIP]
> 社内の小規模運用（同時 50 ユーザー程度）であれば、SQLite でも十分対応可能です。

**現状維持で問題ない理由**:

- 同時アクセス数が限定的（院内利用）
- データ量が少ない（資機材数百件程度）
- シンプルな構成で運用コストが低い

**改善策**（コストゼロ）:

1. **WAL モード有効化**: 読み取り同時実行性向上
2. **定期バックアップスクリプト**: cron で `database.sqlite` をコピー
3. **Git 管理外で永続化**: 環境変数 `DATABASE_PATH` で制御

```typescript
// data-source.ts に WAL モード追加
const AppDataSource = new DataSource({
  type: "sqlite",
  database: dbPath,
  enableWAL: true, // 追加
  // ...
});
```

---

### 4.2 画像保存：Git LFS または共有フォルダ

#### 選択肢 A: Git LFS（推奨）

| メリット           | デメリット                       |
| ------------------ | -------------------------------- |
| バージョン管理可能 | GitHub の無料枠に上限あり（1GB） |
| デプロイと同期     | 設定が必要                       |

```bash
# Git LFS セットアップ
git lfs install
git lfs track "backend/uploads/**/*"
git add .gitattributes
```

#### 選択肢 B: 共有フォルダ（NAS）

| メリット                       | デメリット       |
| ------------------------------ | ---------------- |
| コストゼロ（既存インフラ活用） | ネットワーク依存 |
| 社内で完結                     | 設定・管理が必要 |

```typescript
// 環境変数で uploads パスを外部化
export const UPLOADS_ROOT =
  process.env.UPLOAD_ROOT || "/mnt/shared/sazan-with/uploads";
```

#### 選択肢 C: Base64 DB 保存（小画像のみ）

- 5KB 以下のサムネイルのみ DB 保存
- 大きな画像は非推奨（DB サイズ肥大化）

---

### 4.3 バックアップ戦略（コストゼロ）

```bash
#!/bin/bash
# backup.sh - 定期バックアップスクリプト
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"

# SQLite バックアップ
cp backend/data/database.sqlite "$BACKUP_DIR/database_$DATE.sqlite"

# 画像バックアップ
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" backend/uploads/

# 古いバックアップ削除（30日以上）
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

cron 設定例:

```
0 2 * * * /path/to/backup.sh
```

---

## 5. 将来検討事項（コストが許容される場合）

### 5.1 データベース移行オプション

| 選択肢                         | 特徴                        | 月額コスト目安 |
| ------------------------------ | --------------------------- | -------------- |
| **PostgreSQL（自前サーバー）** | 既存サーバーで運用          | **無料**       |
| **Supabase**                   | PostgreSQL + Auth + Storage | 無料枠あり     |
| **Firebase Firestore**         | NoSQL、Google 連携容易      | 無料枠あり     |

### 5.2 画像ストレージ移行オプション

| 選択肢               | 特徴                  | 月額コスト目安 |
| -------------------- | --------------------- | -------------- |
| **Cloudflare R2**    | S3 互換、エグレス無料 | ほぼ無料       |
| **Firebase Storage** | Google 連携容易       | 無料枠あり     |
| **Supabase Storage** | PostgreSQL 連携       | 無料枠あり     |

---

## 6. 推奨アクション（優先順）

| 優先度 | アクション                 | 効果                 | 工数     |
| ------ | -------------------------- | -------------------- | -------- |
| **高** | SQLite WAL モード有効化    | 同時アクセス性能向上 | 10 分    |
| **高** | バックアップスクリプト作成 | データ保護           | 30 分    |
| **中** | uploads パス外部化         | 柔軟な配置           | 完了済み |
| **低** | Git LFS 導入検討           | 画像のバージョン管理 | 1 時間   |

---

## 7. 関連ドキュメント

- [requirements-1.md](file:///Users/mizuyamatomofumi/Desktop/202601140050/kaihatsu/docs/requirements/requirements-1.md) - メイン要件定義
- [requirements-2.md](file:///Users/mizuyamatomofumi/Desktop/202601140050/kaihatsu/docs/requirements/requirements-2.md) - Google 連携要件
- [requirements-3.md](file:///Users/mizuyamatomofumi/Desktop/202601140050/kaihatsu/docs/requirements/requirements-3.md) - 次期開発項目
