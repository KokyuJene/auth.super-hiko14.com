const { exchangeCode, getDiscordUser } = require('../lib/discord');
const { logAuth }                      = require('../lib/supabase');

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const expectedState   = process.env.DISCORD_OAUTH_STATE;

  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect('/error/?type=invalid');
  }

  let tokenData;
  try {
    tokenData = await exchangeCode(code);
  } catch {
    return res.redirect('/error/?type=invalid');
  }

  if (!tokenData || !tokenData.access_token) {
    return res.redirect('/error/?type=invalid');
  }

  let user;
  try {
    user = await getDiscordUser(tokenData.access_token);
  } catch {
    return res.redirect('/error/?type=invalid');
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.headers['x-real-ip'] || 'unknown');

  const opts = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300';
  res.setHeader('Set-Cookie', [
    `pending_uid=${user.id}; ${opts}`,
    `pending_usr=${encodeURIComponent(user.username || user.id)}; ${opts}`,
    `pending_ip=${ip}; ${opts}`,
  ]);
  return res.redirect('/verify/');
};
