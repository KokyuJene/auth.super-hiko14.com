-- ============================================
-- auth.super-hiko14.com  Supabase スキーマ
-- ============================================

CREATE TABLE IF NOT EXISTS auth_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id       TEXT NOT NULL,
  discord_username TEXT,
  ip_address       TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN (
    'success',
    'blocked_vpn',
    'blocked_age',
    'blocked_duplicate',
    'blocked_guild',
    'blocked_unknown'
  )),
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 重複IPチェック用インデックス
CREATE INDEX IF NOT EXISTS idx_auth_logs_ip_status
  ON auth_logs(ip_address, status);

-- ユーザー検索用インデックス
CREATE INDEX IF NOT EXISTS idx_auth_logs_discord_id
  ON auth_logs(discord_id);

-- ============================================
-- Webhook メッセージの IP 削除管理
-- ============================================
CREATE TABLE IF NOT EXISTS auth_webhook_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  TEXT NOT NULL UNIQUE,
  ip_address  TEXT NOT NULL,
  status      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IP 削除対象検索用インデックス
CREATE INDEX IF NOT EXISTS idx_webhook_messages_created
  ON auth_webhook_messages(created_at);
