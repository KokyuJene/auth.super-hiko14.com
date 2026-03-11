/**
 * reCAPTCHA v3 検証用
 */
/**
 * reCAPTCHA v3 スコアを返す。
 * トークンなし・キーなし・通信失敗の場合は null を返す（呼び出し側で判断）。
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token || !secret) {
    console.warn('reCAPTCHA: skipped (token or secret missing)');
    return null;
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    console.log('reCAPTCHA:', JSON.stringify(data));
    if (!data.success) {
      console.warn('reCAPTCHA failed:', data['error-codes']);
      return null;
    }
    return data.score; // 0.0 〜 1.0
  } catch (err) {
    console.error('reCAPTCHA fetch error:', err);
    return null;
  }
}

module.exports = { verifyRecaptcha };
