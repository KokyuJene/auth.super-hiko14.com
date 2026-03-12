module.exports = (req, res) => {
  const clientId    = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;
  const state       = process.env.DISCORD_OAUTH_STATE;

  if (!clientId || !redirectUri || !state) {
    return res.redirect('/error/?type=unknown');
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
