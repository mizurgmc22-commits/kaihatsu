# クラウド統合要件定義（Google連携版）

## 目的
- フロントエンドのみで完結していた現行構成から、Google Cloud を中心としたクラウド連携アーキテクチャへ移行する。
- 管理者のみが主要データへアクセス・更新でき、一般ユーザーは予約閲覧・作成のみを許可する。
- オフライン閲覧体験を維持しつつ、統計・分析・ファイル管理をクラウドで一元化する。

## システム全体像
```
ユーザー端末（ブラウザ）
  ├─ Firebase Authentication (Email/Password + カスタムクレーム)
  ├─ REST API（HTTPS）
  │    ├─ Cloud Run (Express API)
  │    │    ├─ Cloud SQL (PostgreSQL)
  │    │    ├─ Google Cloud Storage (画像)
  │    │    └─ BigQuery / スプレッドシート連携
  └─ IndexedDB（読み取り専用キャッシュ）
```

---

## 1. Cloud SQL（PostgreSQL）スキーマ

### users
| カラム | 型 | 備考 |
|--------|----|------|
| id | UUID | 主キー |
| name | varchar | 氏名 |
| email | varchar(unique) | ログインID |
| role | enum('admin','user') | Firebaseカスタムクレームと同期 |
| department | varchar | 所属 |
| phone | varchar | 連絡先 |
| created_at / updated_at | timestamptz | 監査用 |

### equipment_categories
- `id`, `name`, `description`, `created_at`, `updated_at`

### equipment
- `id`, `category_id`, `name`, `description`, `quantity`, `is_unlimited`, `location`, `image_file_id`, `status(enum: active/inactive)`, `specs(JSONB)`, `created_at`, `updated_at`

### reservations
- `id`, `user_id (nullable)`, `equipment_id`, `custom_equipment_name`, `department`, `applicant_name`, `contact_info`, `start_time`, `end_time`, `quantity`, `purpose`, `location`, `status(enum: pending/approved/rejected/cancelled/completed)`, `notes`, `created_at`, `updated_at`

### files
- `id`, `gcs_path`, `mime_type`, `size`, `created_by`, `created_at`

### audit_logs（任意）
- 操作種別、対象テーブル、対象ID、実行者、差分、タイムスタンプ

## 2. APIアーキテクチャ
- **Cloud Run + Express** を採用。理由: 既存Expressロジックを移行しやすく、ルーティングの柔軟性が高い。
- `npm run build && docker build` でコンテナ化し、Cloud Run にデプロイ。
- Cloud SQL へは Cloud SQL Auth Proxy (sidecar) もしくは DB接続用VPCコネクタで接続。
- エンドポイント例:
  - `/api/auth/login`, `/api/auth/me`
  - `/api/equipment`, `/api/equipment/:id`, `/api/reservations`
  - `/api/admin/dashboard`, `/api/admin/equipment/import`
- Cloud Run では Firebase Admin SDK でIDトークン検証 → ロール判定。
- 管理者専用ルートは Express middleware で `role === 'admin'` を確認。

## 3. 認証・権限
- **一般ユーザー（予約申請者）**: 現状は **完全オープンな受付窓口** とし、ログイン不要。予約フォームでは「部署名」「連絡先（メール/電話）」を必須入力にして本人確認情報を収集し、承認フローで管理者が後追い確認する。
- **管理者ユーザー**: Firebase Authentication（Email/Password + optional Google Sign-In）でログイン。管理者アカウントには Firebase カスタムクレーム `role: 'admin'` を付与。
- フロントは管理者ログイン時のみ `firebase/auth` でIDトークンを取得し、API呼び出し時に `Authorization: Bearer <token>` を送付。
- Cloud Run 側で Firebase Admin SDK によりトークン検証し、`req.user.role` を設定。 `/api/admin/*` ルートでは `role === 'admin'` を必須とする。
- Google Workspace SSO も将来のオプションとして残し、組織アカウントで統制したいケースに対応できるよう仕様を拡張可能。

## 4. 画像ファイル管理
- 画像は **Google Cloud Storage (GCS)** に保存。`equipment.image_file_id` でファイルIDを参照。
- アップロード手順:
  1. 管理者が管理画面から画像を選択
  2. Cloud Run API が署名付きURLを発行
  3. フロントが直接GCSへPUT → 完了後にメタデータ（ファイルID）をAPIに登録
- 一般ユーザーにはダウンロード用の署名付きURL（短時間有効）を発行し、公開期限を設定。

## 5. 統計・レポート
- Cloud SQL のデータを **Googleスプレッドシート** に同期（Apps Script or Data Connector）。
- 週次/日次の自動エクスポートを設定し、管理者がシート上で集計・グラフ化可能。
- 必要に応じて BigQuery へもデータ連携し、Looker Studio で可視化を強化。

## 6. フロントエンド再構成
- `frontend/src/services/*` を API呼び出しベースに再実装。
  - 例: `reservationService.create()` → Cloud Run API `/api/reservations` を呼ぶ。
- IndexedDB は `frontend/src/cache/` として分離し、React Query の `queryFn` 経由で以下を実装:
  1. API取得成功時にIndexedDBへ保存
  2. オフライン時はIndexedDBデータを返す
  3. 書き込み系は常にAPI経由（IndexedDBは読み取り専用キャッシュ）
- 認証済みユーザー情報やロールは AuthContext で管理し、管理者向けUIを制御。

## 7. デプロイ・運用
- Cloud BuildでCI/CDパイプラインを構築（テスト → Dockerビルド → Cloud Runデプロイ）。
- Firebase Auth設定値／DB接続情報は Cloud Secret Manager に格納し、Cloud Run 環境変数で利用。
- ログは Cloud Logging、メトリクスは Cloud Monitoring で一元管理。
- 災害復旧: Cloud SQL 自動バックアップ + GCS オブジェクトバージョニング。

## 8. ロードマップ
1. Cloud SQL インスタンス作成＆マイグレーションスクリプト準備
2. 既存ExpressロジックをCloud Run用APIに移植（ロールミドルウェア実装）
3. Firebase Authプロジェクト作成＆管理者アカウント登録
4. フロントエンドサービス層のAPI化＆IndexedDBキャッシュ導入
5. 画像アップロードワークフロー（署名付きURL）実装
6. スプレッドシート同期スクリプト（Apps Script）作成

---
以上の要件を基に、Google連携アーキテクチャへの移行を進める。
