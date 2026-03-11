/**
 * reCAPTCHA v3 検証用
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token || !secret) return false;

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();
    // data.success が true で、かつスコアが一定以上（例：0.5以上）であることを確認
    return data.success && data.score >= 0.5;
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return false;
  }
}

module.exports = { verifyRecaptcha };
