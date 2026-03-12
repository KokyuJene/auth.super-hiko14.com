const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

/**
 * 認証ログを記録
 */
async function logAuth(user, ip, status, reason) {
  try {
    await supabase.from('auth_logs').insert({
      discord_id: user?.id || 'unknown',
      discord_username: user?.global_name || user?.username || 'unknown',
      ip_address: ip,
      status,
      reason: reason || null,
    });
  } catch {
    // ログ記録失敗は認証をブロックしない
  }
}

/**
 * 同一IPで異なるユーザーが認証済みか確認
 * @returns 重複ユーザーのdiscord_id または null
 */
async function checkDuplicateIP(ip, currentUserId) {
  try {
    const { data } = await supabase
      .from('auth_logs')
      .select('discord_id')
      .eq('ip_address', ip)
      .eq('status', 'success')
      .neq('discord_id', currentUserId)
      .limit(1)
      .single();

    return data?.discord_id || null;
  } catch {
    return null;
  }
}

async function logWebhookMessage(messageId, ipAddress, status) {
  try {
    await supabase.from('auth_webhook_messages').insert({
      message_id: messageId,
      ip_address: ipAddress,
      status: status,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Webhook メッセージ記録失敗は認証をブロックしない
  }
}

module.exports = { logAuth, checkDuplicateIP, logWebhookMessage };
