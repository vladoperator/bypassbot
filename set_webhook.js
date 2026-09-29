require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN missing in .env');
  process.exit(1);
}

const inputUrl = process.argv[2];

if (!inputUrl) {
  console.log(`
ℹ️  Usage:
  To set webhook for Vercel:
    node set_webhook.js https://your-project.vercel.app

  To delete webhook (switch back to local bot.js):
    node set_webhook.js delete

  To check webhook status:
    node set_webhook.js status
`);
  process.exit(0);
}

async function run() {
  if (inputUrl.toLowerCase() === 'delete') {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    const data = await res.json();
    console.log('Delete Webhook Response:', data);
    return;
  }

  if (inputUrl.toLowerCase() === 'status') {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await res.json();
    console.log('Webhook Status:', data);
    return;
  }

  let domain = inputUrl.trim();
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }
  domain = domain.replace(/\/+$/, '');
  const webhookUrl = domain.endsWith('/api/webhook') ? domain : `${domain}/api/webhook`;

  console.log(`📡 Setting Telegram Webhook to: ${webhookUrl} ...`);
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
  const data = await res.json();

  if (data.ok) {
    console.log('✅ Webhook successfully configured!');
    console.log('Telegram is now routing all updates directly to your Vercel deployment.');
  } else {
    console.error('❌ Failed to set webhook:', data);
  }
}

run();
