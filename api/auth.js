const { randomBytes } = require('crypto');
const { verifyRecaptcha } = require('../lib/recaptcha');

module.exports = async (req, res) => {
  const { recaptcha } = req.query;
  const clientId   = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.redirect('/error/?type=unknown');
  }

  // reCAPTCHA 検証（null=スキップ扱い、0.1以下のみボット判定）
  try {
    const score = await verifyRecaptcha(recaptcha);
    if (score !== null && score < 0.1) {
      console.error('Bot detected: score =', score);
      return res.redirect('/error/?type=bot');
    }
  } catch (err) {
    console.error('Internal reCAPTCHA error:', err);
    // reCAPTCHA 自体のエラーは続行（VPN チェックが本命）
  }

  // CSRF 対策: ランダムな state を生成してクッキーに保存
  const state = randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'identify guilds.members.read',
    state,
    prompt:        'consent',
  });

  res.setHeader(
    'Set-Cookie',
    `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`
  );
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
};
