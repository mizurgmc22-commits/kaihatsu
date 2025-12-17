# スプレッドシート同期セットアップガイド

## 概要

Cloud SQL のデータを Google スプレッドシートに自動同期するための Apps Script を設定します。
管理者はスプレッドシート上で予約データの確認、統計の閲覧、CSVエクスポートが可能になります。

## セットアップ手順

### 1. スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com) で新しいスプレッドシートを作成
2. 適切な名前を付ける（例: `資機材予約システム - データ`）

### 2. Apps Script の設定

1. スプレッドシートで「拡張機能」→「Apps Script」を開く
2. `scripts/apps-script/Code.gs` の内容をコピー＆ペースト
3. プロジェクト名を設定（例: `EquipmentBookingSync`）

### 3. スクリプトプロパティの設定

1. Apps Script エディタで「プロジェクトの設定」（歯車アイコン）を開く
2. 「スクリプト プロパティ」セクションで以下を追加:

| プロパティ名 | 値 | 説明 |
|------------|-----|------|
| `API_BASE_URL` | `https://your-api-xxxxx-an.a.run.app` | Cloud Run API の URL |
| `API_KEY` | （任意） | API認証キー（設定している場合） |

### 4. 初回実行と権限の承認

1. Apps Script エディタで `syncAllData` 関数を選択
2. 「実行」ボタンをクリック
3. 権限の承認ダイアログが表示されるので、承認する
   - 「詳細」→「（安全でないページ）に移動」をクリック
   - 必要な権限を許可

### 5. 自動同期の設定

スプレッドシートを開くと、メニューバーに「予約システム」メニューが追加されます。

#### 手動同期
- 「予約システム」→「今すぐ同期」

#### 自動同期（トリガー）
- 「予約システム」→「トリガー設定」→「毎日6時に同期」
- または「1時間ごとに同期」

## 生成されるシート

### 予約一覧
| カラム | 説明 |
|--------|------|
| ID | 予約ID |
| 資機材 | 資機材名 |
| 申請者 | 申請者名 |
| 部署 | 部署名 |
| 連絡先 | 連絡先情報 |
| 開始日時 | 予約開始日時 |
| 終了日時 | 予約終了日時 |
| 数量 | 予約数量 |
| 目的 | 使用目的 |
| ステータス | 承認状態 |
| 備考 | 備考 |
| 作成日時 | 予約作成日時 |

### 資機材一覧
| カラム | 説明 |
|--------|------|
| ID | 資機材ID |
| カテゴリ | カテゴリ名 |
| 名称 | 資機材名 |
| 説明 | 説明文 |
| 数量 | 在庫数 |
| 無制限 | 無制限フラグ |
| 保管場所 | 保管場所 |
| ステータス | 有効/無効 |

### 統計サマリー
- 承認待ち予約数
- 本日の予約数
- 有効な資機材数
- 登録ユーザー数
- ステータス別予約数

## カスタマイズ

### 同期頻度の変更

Apps Script エディタで以下の関数を編集:

```javascript
// 毎日特定の時刻に同期
ScriptApp.newTrigger('syncAllData')
  .timeBased()
  .everyDays(1)
  .atHour(9)  // 9時に変更
  .create();

// 週次同期
ScriptApp.newTrigger('syncAllData')
  .timeBased()
  .everyWeeks(1)
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .atHour(6)
  .create();
```

### フィルタリング

特定の期間のデータのみ同期する場合:

```javascript
// syncReservations 関数内の URL を変更
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 1); // 過去1ヶ月
const url = config.apiBaseUrl + '/api/admin/export/reservations?format=json&start_date=' + startDate.toISOString();
```

### 通知設定

同期完了時にメール通知を送信:

```javascript
function syncAllData() {
  try {
    // ... 同期処理 ...
    
    // 成功通知
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: '[予約システム] データ同期完了',
      body: '同期が正常に完了しました。\n日時: ' + new Date().toLocaleString('ja-JP'),
    });
  } catch (error) {
    // エラー通知（既存）
    sendErrorNotification(error);
  }
}
```

## トラブルシューティング

### 「権限がありません」エラー

1. Apps Script の実行ログを確認
2. API_BASE_URL が正しいか確認
3. Cloud Run の IAM 設定で、Apps Script からのアクセスが許可されているか確認

### データが同期されない

1. スプレッドシートの「予約システム」→「今すぐ同期」を実行
2. 「表示」→「実行ログ」でエラーを確認
3. API が正常に動作しているか確認（ブラウザで直接アクセス）

### タイムアウトエラー

大量のデータがある場合、Apps Script の実行時間制限（6分）に達する可能性があります。

対策:
- 同期するデータ期間を制限
- 複数の関数に分割して順次実行

## セキュリティ考慮事項

1. **スプレッドシートの共有設定**: 必要な管理者のみにアクセス権を付与
2. **API認証**: 可能であれば API キーまたはサービスアカウント認証を使用
3. **ログの確認**: 定期的に実行ログを確認し、不正アクセスがないか監視
