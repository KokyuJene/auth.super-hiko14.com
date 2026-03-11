/**
 * reCAPTCHA v3 検証用
 */
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token) {
    console.error('reCAPTCHA Error: No token provided');
    return false;
  }
  if (!secret) {
    console.error('reCAPTCHA Error: Secret Key is missing in env');
    return false;
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();
    console.log('reCAPTCHA Full Response:', JSON.stringify(data));
    
    if (!data.success) {
      console.error('reCAPTCHA Failed:', data['error-codes']);
      return false;
    }
    return data.score >= 0.3;
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return false;
  }
}

module.exports = { verifyRecaptcha };
