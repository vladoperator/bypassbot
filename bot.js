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

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
