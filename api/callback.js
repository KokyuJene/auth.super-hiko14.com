const { checkIP }                                          = require('../lib/proxycheck');
const { exchangeCode, getDiscordUser, getAccountAgeInDays, assignRole } = require('../lib/discord');
const { logAuth, checkDuplicateIP }                        = require('../lib/supabase');

const MIN_AGE_DAYS = 14;

function sendWebhook(user, ip, status, detail) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const COLOR_MAP = { success: 0x6ddbb0, blocked_vpn: 0xe05252, blocked_age: 0xf0b429, blocked_duplicate: 0xe05252, blocked_guild: 0xaaaaaa, blocked_unknown: 0x888888 };
  const color = COLOR_MAP[status] || 0x888888;

  const body = {
    embeds: [{
      title: status === 'success' ? '✅ 認証成功' : `❌ 認証ブロック: ${status}`,
      color,
      fields: [
        { name: 'ユーザー', value: user ? `${user.username} (${user.id})` : 'unknown', inline: true },
        { name: 'IP',       value: ip || 'unknown',  inline: true },
        ...(detail ? [{ name: '理由', value: detail, inline: false }] : []),
      ],
      timestamp: new Date().toISOString(),
    }],
  };

  // fire-and-forget
  fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  }).catch(() => {});
}

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const expectedState = process.env.DISCORD_OAUTH_STATE;

  // ① state 検証（環境変数の固定 state と照合）
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect('/error/?type=invalid');
  }

  // ② IP 再チェック
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers['x-real-ip'] || 'unknown');

  try {
    const ipResult = await checkIP(ip);
    if (ipResult.isProxy) {
      await logAuth({ id: 'unknown', username: 'unknown' }, ip, 'blocked_vpn', ipResult.reason);
      sendWebhook(null, ip, 'blocked_vpn', ipResult.reason);
      return res.redirect('/error/?type=vpn');
    }
  } catch {
    // ProxyCheck 失敗は続行
  }

  // ③ コードをトークンに交換
  let tokenData;
  try {
    tokenData = await exchangeCode(code);
  } catch {
    res.setHeader('Set-Cookie', CLEAR_COOKIE);
    return res.redirect('/error/?type=invalid');
  }

  if (!tokenData || !tokenData.access_token) {
    res.setHeader('Set-Cookie', CLEAR_COOKIE);
    return res.redirect('/error/?type=invalid');
  }

  // ⑤ ユーザー情報取得
  let user;
  try {
    user = await getDiscordUser(tokenData.access_token);
  } catch {
    res.setHeader('Set-Cookie', CLEAR_COOKIE);
    return res.redirect('/error/?type=invalid');
  }

  // ⑤ アカウント年齢チェック
  const ageDays = getAccountAgeInDays(user.id);
  if (ageDays < MIN_AGE_DAYS) {
    await logAuth(user, ip, 'blocked_age', `アカウント作成から ${ageDays} 日`);
    sendWebhook(user, ip, 'blocked_age', `アカウント作成から ${ageDays} 日`);
    return res.redirect('/error/?type=age');
  }

  // ⑦ 重複 IP チェック（サブアカ検知）
  const duplicateId = await checkDuplicateIP(ip, user.id);
  if (duplicateId) {
    await logAuth(user, ip, 'blocked_duplicate', `既存認証: ${duplicateId}`);
    sendWebhook(user, ip, 'blocked_duplicate', `既存認証: ${duplicateId}`);
    return res.redirect('/error/?type=duplicate');
  }

  // ⑦ ロール付与
  try {
    await assignRole(user.id);
  } catch (e) {
    if (e.message === 'NOT_IN_GUILD') {
      await logAuth(user, ip, 'blocked_guild', 'サーバー未参加');
      sendWebhook(user, ip, 'blocked_guild', 'サーバー未参加');
      return res.redirect('/error/?type=guild');
    }
    await logAuth(user, ip, 'blocked_unknown', e.message);
    sendWebhook(user, ip, 'blocked_unknown', e.message);
    return res.redirect('/error/?type=unknown');
  }

  // ⑧ 成功ログ & リダイレクト
  await logAuth(user, ip, 'success');
  sendWebhook(user, ip, 'success');
  res.redirect('/success/');
};
