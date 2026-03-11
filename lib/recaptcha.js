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
    console.log('reCAPTCHA response:', data);
    return data.success && data.score >= 0.3;
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return false;
  }
}

module.exports = { verifyRecaptcha };
