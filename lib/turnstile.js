/**
 * Cloudflare Turnstile 検証用
 */
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!token || !secret) {
    console.warn('Turnstile: skipped (token or secret missing)');
    return false;
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (ip) params.set('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
    });
    const data = await res.json();
    console.log('Turnstile:', JSON.stringify(data));
    return data.success === true;
  } catch (err) {
    console.error('Turnstile fetch error:', err);
    return false;
  }
}

module.exports = { verifyTurnstile };
