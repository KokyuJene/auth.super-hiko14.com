/**
 * Discord API ヘルパー
 */

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ROLE_ID = process.env.DISCORD_ROLE_ID;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

const API = 'https://discord.com/api/v10';

/**
 * OAuthコードをアクセストークンに交換
 */
async function exchangeCode(code) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  return res.json();
}

/**
 * アクセストークンからユーザー情報を取得
 */
async function getDiscordUser(accessToken) {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to get user: ${res.status}`);
  }

  return res.json();
}

/**
 * Discord Snowflakeからアカウント作成日を計算し、経過日数を返す
 */
function getAccountAgeInDays(userId) {
  const DISCORD_EPOCH = 1420070400000n;
  const snowflake = BigInt(userId);
  const createdAt = Number((snowflake >> 22n) + DISCORD_EPOCH);
  const now = Date.now();
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
}

/**
 * ユーザーに認証済みロールを付与
 */
async function assignRole(userId) {
  if (!BOT_TOKEN || !GUILD_ID || !ROLE_ID) {
    throw new Error('Bot configuration missing');
  }

  const res = await fetch(`${API}/guilds/${GUILD_ID}/members/${userId}/roles/${ROLE_ID}`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });

  if (res.status === 404) {
    throw new Error('NOT_IN_GUILD');
  }

  if (!res.ok) {
    throw new Error(`Failed to assign role: ${res.status}`);
  }
}

module.exports = { exchangeCode, getDiscordUser, getAccountAgeInDays, assignRole };
