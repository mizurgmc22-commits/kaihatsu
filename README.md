# 資機材予約システム (サザンウィズ)

医療機関向けの資機材貸出予約管理システムです。

## 🏗️ アーキテクチャ

```
ユーザー端末（ブラウザ）
  ├─ Firebase Authentication (Email/Password + カスタムクレーム)
  ├─ REST API（HTTPS）
  │    ├─ Cloud Run (Express API)
  │    │    ├─ Cloud SQL (PostgreSQL)
  │    │    ├─ Google Cloud Storage (画像)
  │    │    └─ スプレッドシート連携
  └─ IndexedDB（読み取り専用キャッシュ）
```

## 🚀 クイックスタート

### ローカル開発環境

```bash
# 1. 依存パッケージを一括インストール
npm run install:all

# 2. 環境変数を設定
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
# .envファイルを編集して必要な値を設定

# 3. バックエンドを起動
cd backend && npm run dev

# 4. フロントエンドを起動（別ターミナル）
cd frontend && npm run dev
```

フロントエンド: http://localhost:5173
バックエンドAPI: http://localhost:8080

### 本番環境へのデプロイ

詳細は `docs/setup/` 以下のドキュメントを参照:
- [Firebase認証セットアップ](docs/setup/FIREBASE_SETUP.md)
- [スプレッドシート同期](docs/setup/SPREADSHEET_SYNC.md)

## 📁 プロジェクト構成

```text
kaihatsu/
├── frontend/              # React + Vite フロントエンド
│   ├── src/
│   │   ├── components/    # UIコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── lib/           # Firebase, API クライアント
│   │   ├── hooks/         # React Query カスタムフック
│   │   ├── cache/         # IndexedDB キャッシュ層
│   │   ├── contexts/      # React Context (Auth)
│   │   └── types/         # TypeScript型定義
│   └── package.json
├── backend/               # Express API (Cloud Run)
│   ├── src/
│   │   ├── routes/        # APIルート
│   │   ├── middleware/    # 認証ミドルウェア
│   │   ├── db/            # DB接続・マイグレーション
│   │   ├── scripts/       # 管理スクリプト
│   │   └── types/         # TypeScript型定義
│   ├── Dockerfile
│   └── package.json
├── scripts/               # ユーティリティスクリプト
│   └── apps-script/       # スプレッドシート同期
├── docs/                  # ドキュメント
│   ├── requirements/      # 要件定義
│   └── setup/             # セットアップガイド
└── package.json           # ルートスクリプト
```

## 🛠️ 利用可能なコマンド

### ルート
| コマンド | 説明 |
|----------|------|
| `npm run install:all` | 全パッケージを一括インストール |
| `npm run clean` | node_modulesを削除 |

### フロントエンド (`frontend/`)
| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルド |
| `npm run preview` | ビルド結果をプレビュー |

### バックエンド (`backend/`)
| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | TypeScriptビルド |
| `npm run migrate` | DBマイグレーション実行 |
| `npm run seed` | 初期データ投入 |
| `npm run set-admin-claim` | Firebase管理者権限付与 |

## 🔧 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** - 高速な開発サーバー
- **Chakra UI** - UIコンポーネント
- **TanStack Query** - データフェッチング・キャッシュ
- **Firebase Auth** - 認証
- **Dexie.js** - IndexedDBキャッシュ

### バックエンド
- **Express** + **TypeScript**
- **PostgreSQL** (Cloud SQL)
- **Firebase Admin SDK** - トークン検証
- **Google Cloud Storage** - ファイル保存
- **Zod** - バリデーション

### インフラ
- **Cloud Run** - APIホスティング
- **Cloud SQL** - データベース
- **Firebase Authentication** - 認証基盤
- **Google Cloud Storage** - ファイルストレージ

## 🔐 認証・権限

### 一般ユーザー（予約申請者）
- ログイン不要
- 資機材の閲覧、予約申請が可能
- 予約フォームで部署・連絡先を入力

### 管理者
- Firebase Authentication でログイン
- カスタムクレーム `role: 'admin'` が必要
- 予約の承認/却下、資機材管理、統計閲覧が可能

## 🗄️ データベース

### マイグレーション

```bash
cd backend

# マイグレーション実行
npm run migrate

# 初期データ投入
npm run seed
```

### スキーマ

主要テーブル:
- `users` - ユーザー情報
- `equipment_categories` - 資機材カテゴリ
- `equipment` - 資機材
- `reservations` - 予約
- `files` - ファイルメタデータ
- `audit_logs` - 監査ログ

詳細は `backend/src/db/schema.sql` を参照。

## 📊 スプレッドシート連携

Cloud SQL のデータを Google スプレッドシートに自動同期できます。

1. `scripts/apps-script/Code.gs` を Apps Script にコピー
2. API URLを設定
3. トリガーを設定（毎日/毎時）

詳細は [スプレッドシート同期ガイド](docs/setup/SPREADSHEET_SYNC.md) を参照。

## 🐛 トラブルシューティング

### ポートが使用中の場合

```bash
# Mac/Linux
lsof -i :5173
lsof -i :8080
kill -9 <PID>
```

### 依存関係のエラー

```bash
npm run clean
npm run install:all
```

### Firebase認証エラー

1. `.env` のFirebase設定を確認
2. Firebase Consoleで承認済みドメインを確認
3. カスタムクレームが設定されているか確認

### データベース接続エラー

1. `DATABASE_URL` が正しいか確認
2. Cloud SQL Proxy が起動しているか確認（ローカル開発時）
3. IAM権限を確認

## 📄 ライセンス

Private - 院内利用専用
