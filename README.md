# 資機材予約システム (サザンウィズ)

医療機関向けの資機材貸出予約管理システムです。

## 🚀 クイックスタート

### 新しい端末での初回セットアップ

```bash
# 1. 依存パッケージを一括インストール
npm run install:all

# 2. 開発サーバーを起動（フロントエンド＋バックエンド同時起動）
npm run dev
```

これだけで完了です！ブラウザで <http://localhost:5173> を開いてください。

### 開発用アカウント

| 項目 | 値 |
|------|-----|
| メールアドレス | `admin@sazan-with.local` |
| パスワード | Sazan-Admin@2025 |

## 📁 プロジェクト構成

```text
kaihatsu/
├── frontend/          # React + Vite (ポート: 5173)
├── backend/           # Express + TypeORM + SQLite (ポート: 3002)
├── package.json       # 統合起動スクリプト
└── .env.example       # 環境変数テンプレート
```

## 🛠️ 利用可能なコマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | フロント＋バックを同時起動（推奨） |
| `npm run dev:backend` | バックエンドのみ起動 |
| `npm run dev:frontend` | フロントエンドのみ起動 |
| `npm run install:all` | 全パッケージを一括インストール |
| `npm run build` | 本番用ビルド |
| `npm run clean` | node_modulesを削除 |

## 🔧 技術スタック

### フロントエンド

- **React 18** + **TypeScript**
- **Vite** - 高速な開発サーバー
- **Chakra UI** - UIコンポーネント
- **TanStack Query** - データフェッチング
- **FullCalendar** - カレンダー表示

### バックエンド

- **Express 5** + **TypeScript**
- **TypeORM** - ORM
- **SQLite** - 開発用データベース
- **JWT** - 認証

## 🔄 API連携の仕組み

開発環境では、Viteのプロキシ機能を使用してAPI連携を実現しています：

```text
ブラウザ → http://localhost:5173/api/* 
         ↓ (Viteプロキシ)
バックエンド → http://localhost:3002/api/*
```

これにより：

- CORSの問題が発生しない
- 本番環境と同じパス構造でAPI呼び出し可能
- フロントエンドとバックエンドを別々に起動する必要がない

## 📝 環境変数

環境変数を変更する場合は `.env.example` を `.env` にコピーして編集してください：

```bash
cp .env.example .env
```

## 🗄️ データベース

- 開発環境では SQLite を使用
- データベースファイル: `backend/data/database.sqlite`
- サーバー起動時に自動的にスキーマが同期されます

### データベースのリセット

```bash
# データベースファイルを削除して再起動
rm backend/data/database.sqlite
npm run dev
```

## 🐛 トラブルシューティング

### ポートが使用中の場合

```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3002
kill -9 <PID>
```

### 依存関係のエラー

```bash
npm run clean
npm run install:all
```

## 📄 ライセンス

Private - 院内利用専用
