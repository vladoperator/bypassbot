require('dotenv').config();
const { bot } = require('./core');

// Register native commands with Telegram
bot.telegram.setMyCommands([
  { command: 'mega', description: '🎯 Auto-bypass chain straight to Mega.nz' },
  { command: 'mode', description: '⚙️ Toggle Auto-Mega mode ON/OFF' },
  { command: 'clear', description: '🧹 Delete previous bypasses & clean chat' },
  { command: 'bypass', description: '⚡ Bypass link (single hop)' },
  { command: 'refresh', description: '🔄 Fresh bypass (skips DB cache)' },
  { command: 'status', description: '🟢 Check bot latency & API status' },
  { command: 'help', description: '📖 Show all commands & usage guide' },
  { command: 'start', description: '👋 Overview & instructions' }
]).catch(err => console.error('Failed to set commands menu:', err.message));

// Launch bot for local long-polling
console.log('🚀 Starting Telegram Bypass Bot (Local Polling Mode)...');
bot.launch(() => {
  console.log('✅ Telegram Bypass Bot is live and listening for messages!');
  console.log(`🤖 Bot username: @bypassersigmabot`);
});

// Local web server for the /links dashboard
const http = require('http');
const linksHandler = require('./api/links');

const server = http.createServer((req, res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  res.send = (body) => {
    res.end(body);
  };

  const pathname = req.url.split('?')[0];
  if (pathname === '/links' || pathname === '/api/links' || pathname === '/') {
    return linksHandler(req, res);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Live Links Dashboard running at: http://localhost:${PORT}/links`);
});

// Graceful stop
process.once('SIGINT', () => {
  server.close();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  server.close();
  bot.stop('SIGTERM');
});

