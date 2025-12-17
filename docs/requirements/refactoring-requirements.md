# プロジェクト構成リファクタリング要件定義書

## 概要

現在のフロントエンド・バックエンド分離構成を、**フロントエンドのみで完結する構成**に統合・リファクタリングする。

---

## 現状分析

### 現在のプロジェクト構成

```
kaihatsu/
├── frontend/          # React + Vite (ポート: 5173)
│   ├── src/
│   │   ├── api/       # Axios APIクライアント
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── types/
│   └── package.json
├── backend/           # Express + TypeORM + SQLite (ポート: 3002)
│   ├── src/
│   │   ├── entity/    # TypeORMエンティティ (User, Equipment, Reservation, EquipmentCategory)
│   │   ├── routes/    # APIルート (auth, dashboard, equipment, reservation)
│   │   └── data-source.ts
│   └── package.json
├── docs/
└── package.json       # モノレポ統合スクリプト
```

### 現在の技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | React 18, TypeScript, Vite, Chakra UI, TanStack Query, FullCalendar |
| バックエンド | Express 5, TypeScript, TypeORM, SQLite |
| 認証 | JWT (jsonwebtoken, bcryptjs) |
| ファイルアップロード | Multer |

### バックエンドの主要機能

1. **認証 (auth.ts)** - ログイン、ユーザー登録、JWT発行
2. **ダッシュボード (dashboard.ts)** - 統計情報取得
3. **資機材管理 (equipment.ts)** - CRUD操作、画像アップロード
4. **予約管理 (reservation.ts)** - 予約CRUD、承認/却下

### データモデル

- **User** - ユーザー情報（認証、権限管理）
- **Equipment** - 資機材情報
- **EquipmentCategory** - カテゴリ
- **Reservation** - 予約情報

---

## リファクタリング目標

### 主要目標

1. **バックエンドを廃止し、フロントエンドのみで完結**
2. **ディレクトリ構成の簡素化**
3. **データ永続化をブラウザストレージで実現**

### 技術的アプローチ

| 現在 | 変更後 |
|------|--------|
| Express + TypeORM + SQLite | IndexedDB (Dexie.js) または localStorage |
| JWT認証 | ローカル認証（セッションストレージ） |
| Multer (ファイルアップロード) | Base64エンコード + IndexedDB |
| Viteプロキシ経由API呼び出し | 直接ローカルストレージ操作 |

---

## 新しいプロジェクト構成（案）

```
kaihatsu/
├── src/
│   ├── components/        # UIコンポーネント
│   │   ├── common/        # 共通コンポーネント
│   │   ├── layout/        # レイアウト
│   │   └── features/      # 機能別コンポーネント
│   ├── pages/             # ページコンポーネント
│   ├── hooks/             # カスタムフック
│   ├── services/          # ビジネスロジック（旧バックエンドロジック）
│   │   ├── auth.ts        # 認証サービス
│   │   ├── equipment.ts   # 資機材サービス
│   │   ├── reservation.ts # 予約サービス
│   │   └── dashboard.ts   # ダッシュボードサービス
│   ├── db/                # ローカルデータベース
│   │   ├── index.ts       # Dexie.js設定
│   │   ├── models/        # データモデル定義
│   │   └── seed.ts        # 初期データ
│   ├── contexts/          # React Context
│   ├── types/             # TypeScript型定義
│   ├── constants/         # 定数
│   ├── utils/             # ユーティリティ
│   └── styles/            # スタイル
├── public/                # 静的ファイル
├── docs/                  # ドキュメント
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 実装要件

### 1. データ永続化

#### 選択肢A: IndexedDB + Dexie.js（推奨）
- 大容量データ対応
- 非同期API
- 画像データ保存可能

#### 選択肢B: localStorage
- シンプルな実装
- 5MB制限あり
- 同期API

**推奨**: Dexie.js を使用したIndexedDB

### 2. 認証機能

| 項目 | 実装方法 |
|------|----------|
| パスワードハッシュ | bcryptjs（ブラウザ版）または Web Crypto API |
| セッション管理 | sessionStorage または Context |
| 権限管理 | ローカルでのロールチェック |

### 3. ファイルアップロード

- 画像をBase64エンコード
- IndexedDBに保存
- 表示時はBlob URLに変換

### 4. 移行対象機能

| 機能 | 優先度 | 複雑度 |
|------|--------|--------|
| ユーザー認証・ログイン | 高 | 中 |
| 資機材一覧・詳細表示 | 高 | 低 |
| 予約作成・一覧 | 高 | 中 |
| 予約承認・却下 | 高 | 中 |
| 資機材CRUD（管理者） | 中 | 中 |
| ユーザー管理（管理者） | 中 | 中 |
| ダッシュボード統計 | 低 | 低 |
| 画像アップロード | 中 | 高 |

---

## 移行手順

### Phase 1: 準備
1. [ ] Secondブランチで作業開始
2. [ ] Dexie.jsのインストール
3. [ ] 新ディレクトリ構成の作成

### Phase 2: データ層の構築
4. [ ] IndexedDBスキーマ定義
5. [ ] データモデル（TypeScript型）の移行
6. [ ] 初期データシード機能

### Phase 3: サービス層の構築
7. [ ] 認証サービスの実装
8. [ ] 資機材サービスの実装
9. [ ] 予約サービスの実装
10. [ ] ダッシュボードサービスの実装

### Phase 4: UI層の統合
11. [ ] APIクライアントをサービス呼び出しに置換
12. [ ] Contextの更新
13. [ ] 各ページコンポーネントの動作確認

### Phase 5: クリーンアップ
14. [ ] backendディレクトリの削除
15. [ ] 不要なパッケージの削除
16. [ ] ルートpackage.jsonの簡素化
17. [ ] READMEの更新

---

## 依存パッケージの変更

### 追加
```json
{
  "dexie": "^4.0.0",
  "dexie-react-hooks": "^1.1.0"
}
```

### 削除（backend関連）
- express, cors, typeorm, sqlite3, jsonwebtoken, multer, pg, reflect-metadata
- 関連する@types/*

### 維持
- react, react-dom, react-router-dom
- @chakra-ui/react, @emotion/react, @emotion/styled
- @tanstack/react-query
- @fullcalendar/*
- axios（削除可能だが、将来のAPI連携用に維持も可）
- date-fns, framer-motion, react-icons

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| データ消失（ブラウザクリア） | エクスポート/インポート機能の実装 |
| 複数端末での同期不可 | 将来的にクラウド同期オプション追加 |
| セキュリティ（クライアント側認証） | 院内利用限定のため許容 |
| 大量データ時のパフォーマンス | IndexedDBのインデックス最適化 |

---

## 成果物

1. 統合されたフロントエンドのみのプロジェクト
2. 更新されたREADME.md
3. 新しいpackage.json
4. 移行完了チェックリスト

---

## 承認事項

この要件定義に基づいてリファクタリングを進めてよいか確認してください。

- [ ] IndexedDB + Dexie.js でのデータ永続化に同意
- [ ] バックエンド廃止に同意
- [ ] 新ディレクトリ構成に同意
- [ ] 移行手順に同意
