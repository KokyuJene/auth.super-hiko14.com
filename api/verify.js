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

function sendWebhook(userId, username, ip, status, detail) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  const COLOR_MAP = {
    success:           0x6ddbb0,
    blocked_bot:       0xe05252,
    blocked_vpn:       0xe05252,
    blocked_age:       0xf0b429,
    blocked_duplicate: 0xe05252,
    blocked_guild:     0xaaaaaa,
    blocked_unknown:   0x888888,
  };
  fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: status === 'success' ? '✅ 認証成功' : `❌ 認証ブロック: ${status}`,
        color: COLOR_MAP[status] || 0x888888,
        fields: [
          { name: 'ユーザー', value: `${username} (${userId})`, inline: true },
          { name: 'IP',       value: ip || 'unknown',           inline: true },
          ...(detail ? [{ name: '理由', value: detail, inline: false }] : []),
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => {});
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
