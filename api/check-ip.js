const { checkIP } = require('../lib/proxycheck');

module.exports = async (req, res) => {
  // CORS: 自サイトからのみ許可
  res.setHeader('Access-Control-Allow-Origin', 'https://auth.super-hiko14.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.headers['x-real-ip'] || '');

  // ローカル / 開発環境はクリーン扱い
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
    // ProxyCheck が落ちても認証继续（コールバック側でも再チェック）
    return res.json({ clean: true });
  }
};
