const { checkIP }                          = require('../lib/proxycheck');
const { getAccountAgeInDays, assignRole }  = require('../lib/discord');
const { logAuth, checkDuplicateIP }        = require('../lib/supabase');
const { verifyTurnstile }                  = require('../lib/turnstile');

const MIN_AGE_DAYS = 14;

const CLEAR = [
  'pending_uid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  'pending_usr=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  'pending_ip=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
];

function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie;
  if (!header) return list;
  header.split(';').forEach(c => {
    const [k, ...rest] = c.split('=');
    list[k.trim()] = rest.join('=').trim();
  });
  return list;
}

async function sendWebhook(userId, username, ip, status, detail) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { logWebhookMessage } = require('../lib/supabase');

  // カスタム絵文字（Discord）
  const EMOJI_SUCCESS = '<:check_1:1426764161261633566>';
  const EMOJI_FAIL    = '<:cross_1:1426764173458673674>';
  const statusEmoji = status === 'success' ? EMOJI_SUCCESS : EMOJI_FAIL;

  const hiddenIp = `||${ip}||`;  // Discord スポイラー記法で自動隠蔽
  
  const content = `${statusEmoji} **${status === 'success' ? '認証成功' : 'ブロック'}**\n` +
    `ユーザー: ${username} (${userId})\n` +
    `IP: ${hiddenIp}\n` +
    `${detail ? `理由: ${detail}\n` : ''}` +
    `タイムスタンプ: <t:${Math.floor(Date.now() / 1000)}:F>`;

  try {
    const response = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    
    const data = await response.json();
    if (data.id) {
      await logWebhookMessage(data.id, ip, status);
    }
  } catch (e) {
    // webhook 失敗は続行
  }
}

module.exports = async (req, res) => {
  const { ts } = req.query;
  const cookies  = parseCookies(req);
  const userId   = cookies.pending_uid;
  const username = decodeURIComponent(cookies.pending_usr || 'unknown');
  const ip       = cookies.pending_ip;

  if (!userId || !ip) {
    return res.redirect('/error/?type=invalid');
  }

  const tsOk = await verifyTurnstile(ts, ip);
  if (!tsOk) {
    sendWebhook(userId, username, ip, 'blocked_bot', 'Turnstile 失敗');
    return res.redirect('/verify/?retry=1');
  }

  try {
    const ipResult = await checkIP(ip);
    if (ipResult.isProxy) {
      res.setHeader('Set-Cookie', CLEAR);
      await logAuth({ id: userId, username }, ip, 'blocked_vpn', ipResult.reason);
      sendWebhook(userId, username, ip, 'blocked_vpn', ipResult.reason);
      return res.redirect('/error/?type=vpn');
    }
  } catch {
  }

  const ageDays = getAccountAgeInDays(userId);
  if (ageDays < MIN_AGE_DAYS) {
    res.setHeader('Set-Cookie', CLEAR);
    await logAuth({ id: userId, username }, ip, 'blocked_age', `アカウント作成から ${ageDays} 日`);
    sendWebhook(userId, username, ip, 'blocked_age', `アカウント作成から ${ageDays} 日`);
    return res.redirect('/error/?type=age');
  }

  res.setHeader('Set-Cookie', CLEAR);

  const duplicateId = await checkDuplicateIP(ip, userId);
  if (duplicateId) {
    await logAuth({ id: userId, username }, ip, 'blocked_duplicate', `既存認証: ${duplicateId}`);
    sendWebhook(userId, username, ip, 'blocked_duplicate', `既存認証: ${duplicateId}`);
    return res.redirect('/error/?type=duplicate');
  }

  try {
    await assignRole(userId);
  } catch (e) {
    if (e.message === 'NOT_IN_GUILD') {
      await logAuth({ id: userId, username }, ip, 'blocked_guild', 'サーバー未参加');
      sendWebhook(userId, username, ip, 'blocked_guild', 'サーバー未参加');
      return res.redirect('/error/?type=guild');
    }
    await logAuth({ id: userId, username }, ip, 'blocked_unknown', e.message);
    sendWebhook(userId, username, ip, 'blocked_unknown', e.message);
    return res.redirect('/error/?type=unknown');
  }

  await logAuth({ id: userId, username }, ip, 'success');
  sendWebhook(userId, username, ip, 'success');
  res.redirect('/success/');
};
