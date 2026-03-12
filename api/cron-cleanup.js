/**
 * Cron Job: 10日以上経過した Webhook メッセージから IP を削除
 * Vercel Cron で毎日実行
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

async function removeIPFromMessage(messageId) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_WEBHOOK_CHANNEL_ID;
    
    if (!botToken || !channelId) {
      console.log('Missing DISCORD_BOT_TOKEN or DISCORD_WEBHOOK_CHANNEL_ID');
      return false;
    }

    // 現在のメッセージ内容を取得
    const getRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bot ${botToken}` },
    });

    if (!getRes.ok) {
      console.log(`Failed to get message ${messageId}`);
      return false;
    }

    const message = await getRes.json();
    let newContent = message.content;

    newContent = newContent.replace(/\|\|[\d.]+\|\|/g, '||[削除済み]||');

    // メッセージを編集
    const editRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: newContent }),
    });

    if (!editRes.ok) {
      console.log(`Failed to edit message ${messageId}`);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error removing IP from message:', e);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.headers['x-vercel-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 10日以上前のメッセージを取得
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const { data: messages } = await supabase
      .from('auth_webhook_messages')
      .select('message_id')
      .lt('created_at', tenDaysAgo.toISOString());

    if (!messages || messages.length === 0) {
      return res.status(200).json({ message: 'No messages to clean up', processed: 0 });
    }

    let processed = 0;
    for (const msg of messages) {
      const success = await removeIPFromMessage(msg.message_id);
      
      if (success) {
        // Supabase から削除
        await supabase
          .from('auth_webhook_messages')
          .delete()
          .eq('message_id', msg.message_id);
        processed++;
      }
    }

    res.status(200).json({ message: 'Cleanup completed', processed });
  } catch (e) {
    console.error('Cron cleanup error:', e);
    res.status(500).json({ error: e.message });
  }
};
