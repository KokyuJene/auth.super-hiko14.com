/**
 * ProxyCheck.io によるVPN/Proxy検知
 */

const API_KEY = process.env.PROXYCHECK_API_KEY;

async function checkIP(ip) {
  if (!API_KEY) {
    return { isProxy: false, reason: null };
  }

  const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${API_KEY}&vpn=1&asn=1&risk=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();

  if (data.status !== 'ok' || !data[ip]) {
    return { isProxy: false, reason: null };
  }

  const info = data[ip];
  const isProxy = info.proxy === 'yes';

  let reason = null;
  if (isProxy) {
    const type = info.type || 'Proxy';
    reason = `${type}が検出されました。VPNをオフにしてください。`;
  }

  return { isProxy, reason, type: info.type, provider: info.provider, risk: info.risk };
}

module.exports = { checkIP };
