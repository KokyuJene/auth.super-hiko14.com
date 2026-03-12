const { exchangeCode, getDiscordUser } = require('../lib/discord');
const { logAuth }                      = require('../lib/supabase');

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const expectedState   = process.env.DISCORD_OAUTH_STATE;

  // ① state 検証（CSRF 防止）
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect('/error/?type=invalid');
  }

  // ② コードをトークンに交換
  let tokenData;
  try {
    tokenData = await exchangeCode(code);
  } catch {
    return res.redirect('/error/?type=invalid');
  }

  if (!tokenData || !tokenData.access_token) {
    return res.redirect('/error/?type=invalid');
  }

  // ③ ユーザー情報取得
  let user;
  try {
    user = await getDiscordUser(tokenData.access_token);
  } catch {
    return res.redirect('/error/?type=invalid');
  }

  // ④ IP 取得
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers['x-real-ip'] || 'unknown');

  // ⑤ セッションを Cookie に保存して Turnstile へ（VPN チェックは Turnstile 通過後）
  const opts = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300';
  res.setHeader('Set-Cookie', [
    `pending_uid=${user.id}; ${opts}`,
    `pending_usr=${encodeURIComponent(user.username || user.id)}; ${opts}`,
    `pending_ip=${ip}; ${opts}`,
  ]);
  return res.redirect('/verify/');
};

const MIN_AGE_DAYS = 14;

function sendWebhook(user, ip, status, detail) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const COLOR_MAP = {
    blocked_vpn: 0xe05252,
    blocked_age: 0xf0b429,
    blocked_unknown: 0x888888,
  };
  const color = COLOR_MAP[status] || 0x888888;

  fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: `? �F�؃u���b�N: ${status}`,
        color,
        fields: [
          { name: '���[�U�[', value: user ? `${user.username || user.id} (${user.id})` : 'unknown', inline: true },
          { name: 'IP',       value: ip || 'unknown', inline: true },
          ...(detail ? [{ name: '���R', value: detail, inline: false }] : []),
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => {});
}

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const expectedState   = process.env.DISCORD_OAUTH_STATE;

  // �@ state ���؁iCSRF �h�~�j
  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect('/error/?type=invalid');
  }

  // �A IP �擾
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers['x-real-ip'] || 'unknown');

  // �B VPN �`�F�b�N
  try {
    const ipResult = await checkIP(ip);
    if (ipResult.isProxy) {
      await logAuth({ id: 'unknown', username: 'unknown' }, ip, 'blocked_vpn', ipResult.reason);
      sendWebhook(null, ip, 'blocked_vpn', ipResult.reason);
      return res.redirect('/error/?type=vpn');
    }
  } catch {
    // ProxyCheck ���s�͑��s
  }

  // �C �R�[�h���g�[�N���Ɍ���
  let tokenData;
  try {
    tokenData = await exchangeCode(code);
  } catch {
    return res.redirect('/error/?type=invalid');
  }

  if (!tokenData || !tokenData.access_token) {
    return res.redirect('/error/?type=invalid');
  }

  // �D ���[�U�[���擾
  let user;
  try {
    user = await getDiscordUser(tokenData.access_token);
  } catch {
    return res.redirect('/error/?type=invalid');
  }

  // �E �A�J�E���g�N��`�F�b�N
  const ageDays = getAccountAgeInDays(user.id);
  if (ageDays < MIN_AGE_DAYS) {
    await logAuth(user, ip, 'blocked_age', `�A�J�E���g�쐬���� ${ageDays} ��`);
    sendWebhook(user, ip, 'blocked_age', `�A�J�E���g�쐬���� ${ageDays} ��`);
    return res.redirect('/error/?type=age');
  }

  // �F �Z�b�V������ Cookie �ɕۑ����� Turnstile ��
  const opts = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300';
  res.setHeader('Set-Cookie', [
    `pending_uid=${user.id}; ${opts}`,
    `pending_usr=${encodeURIComponent(user.username || user.id)}; ${opts}`,
    `pending_ip=${ip}; ${opts}`,
  ]);
  return res.redirect('/verify/');
};
