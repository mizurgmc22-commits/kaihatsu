# Firebase Authentication セットアップガイド

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `equipment-booking-system`）
4. Google Analyticsは任意で設定
5. プロジェクトを作成

## 2. Authentication の有効化

1. Firebase Console で作成したプロジェクトを開く
2. 左メニューから「Authentication」を選択
3. 「始める」をクリック
4. 「Sign-in method」タブを開く
5. 「メール/パスワード」を有効化
   - 「メール/パスワード」をクリック
   - 「有効にする」をON
   - 「保存」をクリック

## 3. Webアプリの登録

1. プロジェクト設定（歯車アイコン）を開く
2. 「マイアプリ」セクションで「</>」（Web）をクリック
3. アプリのニックネームを入力（例: `equipment-booking-web`）
4. 「アプリを登録」をクリック
5. 表示される設定情報をコピー:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## 4. サービスアカウントの作成（バックエンド用）

1. プロジェクト設定 → 「サービスアカウント」タブ
2. 「新しい秘密鍵の生成」をクリック
3. JSONファイルをダウンロード
4. ファイルを `backend/firebase-service-account.json` として保存
5. **重要**: このファイルは `.gitignore` に追加済み。絶対にGitにコミットしないこと

## 5. 環境変数の設定

### バックエンド (.env)

```bash
# backend/.env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

### フロントエンド (.env)

```bash
# frontend/.env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 6. 管理者アカウントの作成

### 6.1 Firebase Consoleで管理者ユーザーを作成

1. Firebase Console → Authentication → Users
2. 「ユーザーを追加」をクリック
3. 管理者のメールアドレスとパスワードを入力
4. 「ユーザーを追加」をクリック

### 6.2 カスタムクレームの付与

バックエンドのスクリプトを使用して管理者権限を付与:

```bash
cd backend

# 依存関係をインストール
npm install

# 管理者クレームを付与
npm run set-admin-claim -- admin@example.com

# 管理者一覧を確認
npm run set-admin-claim -- list

# 管理者権限を削除（必要な場合）
npm run set-admin-claim -- remove admin@example.com
```

## 7. Cloud Run での設定

Cloud Run にデプロイする場合、サービスアカウントJSONファイルの代わりに、
Cloud Run のサービスアカウントに Firebase Admin SDK の権限を付与します。

### 7.1 IAM権限の設定

1. GCP Console → IAM & Admin → IAM
2. Cloud Run のサービスアカウント（通常は `PROJECT_NUMBER-compute@developer.gserviceaccount.com`）を編集
3. 以下のロールを追加:
   - `Firebase Admin SDK Administrator Service Agent`
   - または `Firebase Authentication Admin`

### 7.2 環境変数の設定

Cloud Run の環境変数に以下を設定:

```
FIREBASE_PROJECT_ID=your-project-id
```

`GOOGLE_APPLICATION_CREDENTIALS` は Cloud Run 環境では不要（自動的にサービスアカウントが使用される）

## 8. セキュリティルール

### Firestore（使用する場合）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 管理者のみ全アクセス可能
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

### Storage（使用する場合）

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /equipment/{allPaths=**} {
      // 読み取りは全員可能
      allow read: if true;
      // 書き込みは管理者のみ
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
  }
}
```

## トラブルシューティング

### カスタムクレームが反映されない

- ユーザーは一度サインアウトしてから再度サインインする必要があります
- IDトークンは1時間でリフレッシュされます
- 即座に反映させたい場合は `firebase.auth().currentUser.getIdToken(true)` を呼び出す

### 「Permission denied」エラー

1. サービスアカウントの権限を確認
2. `GOOGLE_APPLICATION_CREDENTIALS` のパスが正しいか確認
3. Firebase プロジェクトIDが正しいか確認

### CORS エラー

Firebase Authentication は自動的にCORSを処理しますが、
カスタムドメインを使用する場合は Firebase Console で承認済みドメインに追加してください。

1. Firebase Console → Authentication → Settings
2. 「承認済みドメイン」にドメインを追加
