# auth.super-hiko14.com

高級ジェネ Discordサーバーの認証システム。

## 機能

- **VPN / Proxy 検知** — ProxyCheck.io でVPN・プロキシ・Tor・DC回線を遮断
- **アカウント年齢チェック** — 作成14日未満のアカウントを拒否
- **重複IPチェック** — 同一IPでの複数アカウント認証をブロック
- **State検証** — OAuth2のCSRF対策
- **Webhook通知** — 認証結果をDiscordチャンネルに自動通知

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして値を埋める。

```bash
cp .env.local.example .env.local
```

### 3. Supabase テーブル作成

`setup.sql` をSupabaseのSQL Editorで実行。

### 4. Discord Developer Portal

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. OAuth2 → Redirects に `https://auth.super-hiko14.com/api/callback` を追加
3. Bot を作成し、サーバーに招待（`Manage Roles` 権限が必要）

### 5. Vercel へデプロイ

1. GitHubリポジトリをVercelに接続
2. Environment Variables に `.env.local` の内容を設定
3. Custom Domain に `auth.super-hiko14.com` を設定

## 開発

```bash
npm run dev
```

`http://localhost:3000` で確認。

## 認証フロー

```
ユーザー → auth.super-hiko14.com
        → IPチェック (VPN?)
        → Discordでログイン
        → Discord OAuth2
        → コールバック
           ├─ State検証
           ├─ IP再チェック
           ├─ アカウント年齢 (≥14日?)
           ├─ 重複IP (別ユーザーが同一IP?)
           └─ ロール付与
        → 成功 or エラー
```
