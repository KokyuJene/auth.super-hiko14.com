const { verifyRecaptcha } = require('../lib/recaptcha');

module.exports = async (req, res) => {
  const { recaptcha } = req.query;
  const clientId    = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  const state       = process.env.DISCORD_OAUTH_STATE;

  if (!clientId || !redirectUri || !state) {
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

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'identify guilds.members.read',
    state,
    prompt:        'consent',
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
};
