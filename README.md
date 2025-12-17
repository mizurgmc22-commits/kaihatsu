# 資機材予約システム (サザンウィズ)

医療機関向けの資機材貸出予約管理システムです。

## 🚀 クイックスタート

### 新しい端末での初回セットアップ

```bash
# 1. 依存パッケージを一括インストール
npm run install:all

# 2. 開発サーバーを起動
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
├── frontend/          # React + Vite + IndexedDB
│   ├── src/
│   │   ├── components/   # UIコンポーネント
│   │   ├── pages/        # ページコンポーネント
│   │   ├── services/     # ビジネスロジック
│   │   ├── db/           # IndexedDB (Dexie.js)
│   │   ├── api/          # APIラッパー（サービス呼び出し）
│   │   ├── contexts/     # React Context
│   │   └── types/        # TypeScript型定義
│   └── package.json
├── docs/              # ドキュメント
└── package.json       # ルートスクリプト
```

## 🛠️ 利用可能なコマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルド |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run install:all` | 全パッケージを一括インストール |
| `npm run clean` | node_modulesを削除 |

## 🔧 技術スタック

- **React 18** + **TypeScript**
- **Vite** - 高速な開発サーバー
- **Chakra UI** - UIコンポーネント
- **TanStack Query** - データフェッチング
- **FullCalendar** - カレンダー表示
- **Dexie.js** - IndexedDBラッパー（ローカルデータベース）

## 🗄️ データ永続化

このアプリケーションはブラウザのIndexedDBを使用してデータを保存します。

- **バックエンドサーバー不要** - 完全にフロントエンドで動作
- **オフライン対応** - インターネット接続なしで使用可能
- **データはブラウザに保存** - ブラウザのデータをクリアするとデータが消えます

### データのリセット

ブラウザの開発者ツールから：
1. Application タブを開く
2. Storage > IndexedDB > EquipmentBookingDB を削除
3. ページをリロード

## 🐛 トラブルシューティング

### ポートが使用中の場合

```bash
# Mac/Linux
lsof -i :5173
kill -9 <PID>
```

### 依存関係のエラー

```bash
npm run clean
npm run install:all
```

### データが表示されない場合

1. ブラウザのキャッシュをクリア
2. IndexedDBをリセット（上記参照）
3. ページをリロード

## 📄 ライセンス

Private - 院内利用専用
