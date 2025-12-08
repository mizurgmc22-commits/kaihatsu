# 要件定義2: Googleシステムへのデータ連携

## 1. 背景と目的
- 資機材管理・予約・管理者アカウント情報を Google 系システムに蓄積し、分析や共有を容易化する。
- 既存 SQLite（TypeORM）で保持する `users` / `equipments` / `reservations` / `equipment_categories` を 1:1 で同期。
- `createdAt` / `updatedAt` を用いて増分同期し、履歴整合性と運用コストを最適化。

## 2. 連携対象とデータ構造
- **ユーザー情報**: 氏名・メール・部署・ロール・状態など @backend/src/entity/User.ts#15-66
- **資機材情報**: 名称・カテゴリ・数量・保管場所・状態・仕様など @backend/src/entity/Equipment.ts#13-55
- **予約情報**: 申請者／期間／数量／目的／状態など @backend/src/entity/Reservation.ts#20-73
- **カテゴリ情報**: カテゴリ名・説明・紐づく資機材一覧 @backend/src/entity/EquipmentCategory.ts#11-30

## 3. Google側ストレージ案
1. **BigQuery（推奨）**: 大量データ蓄積＋分析用途。MERGE による upsert。
2. **Cloud SQL**: 既存 RDB 互換が必要、外部システムから参照するケース向け。
3. **Google Sheets**: 軽量な共有・参照用途。Apps Script / Sheets API で最新状態のみ反映。

## 4. 推奨アーキテクチャ（BigQuery採用例）
- Node.js 同期スクリプト（TypeORM から増分抽出 → BigQuery SDK で upsert）。
- Cloud Scheduler → Cloud Run Job or GitHub Actions で定期実行。
- 監視: Cloud Logging / 通知（Slack・メール）。

## 5. 実装ステップ
1. **環境準備**: GCP プロジェクト、BigQuery Dataset/Table、SA・キー・Secret 管理。
2. **同期スクリプト**: `backend/src/scripts/syncToBigQuery.ts` などに差分取得＆MERGE 処理。
3. **実行基盤**: Cloud Run Job or CI で `node sync-to-bq.ts` をスケジューリング。
4. **整合性/エラー処理**: 失敗時リトライ、Webhook/キューによる即時同期も検討。
5. **テスト**: ステージング Dataset でフル→増分の流れを検証。

## 6. 運用上の注意
- PII 保護（カラム暗号化・Authorized Views 等）。
- スキーマ変更時は TypeORM ↔ BigQuery を同期的に管理。
- コスト試算（BigQuery クエリ課金、Cloud SQL 常時稼働）。
- 監査ログを BigQuery 側で保持し、ミス検知や分析に活用。
