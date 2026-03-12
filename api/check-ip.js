const { checkIP } = require('../lib/proxycheck');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://auth.super-hiko14.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.headers['x-real-ip'] || '');

  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return res.json({ clean: true });
  }

  try {
    const result = await checkIP(ip);
    if (result.isProxy) {
      return res.json({ clean: false, reason: result.reason });
    }
    return res.json({ clean: true });
  } catch {
    return res.json({ clean: true });
  }
};
