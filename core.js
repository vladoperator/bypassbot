const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEY = process.env.BYPASS_API_KEY;
const BASE_URL = process.env.BYPASS_BASE_URL || 'https://api.bypass.vip/premium';

if (!BOT_TOKEN || !API_KEY) {
  console.warn('WARNING: BOT_TOKEN or BYPASS_API_KEY missing in environment!');
}

const bot = new Telegraf(BOT_TOKEN || 'dummy');

const storage = require('./storage');

function getTgUsername(ctx) {
  if (ctx?.from?.username) return '@' + ctx.from.username;
  const parts = [ctx?.from?.first_name, ctx?.from?.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'User ' + (ctx?.from?.id || 'Unknown');
}

// In-memory URL store & chat cleanup trackers
const urlStore = new Map();
const chatMessages = new Map();

function trackMsg(chatId, messageId) {
  if (!chatId || !messageId) return;
  if (!chatMessages.has(chatId)) chatMessages.set(chatId, new Set());
  const set = chatMessages.get(chatId);
  set.add(messageId);
  if (set.size > 200) {
    const oldest = set.values().next().value;
    set.delete(oldest);
  }
}

function storeUrl(url) {
  const id = Math.random().toString(36).substring(2, 9);
  urlStore.set(id, { url, time: Date.now() });
  return id;
}

function getStoredUrl(id, fallbackText = '') {
  const item = urlStore.get(id);
  if (item && item.url) return item.url;
  // Stateless fallback: extract URL from Telegram message text if lambda restarted
  if (fallbackText) {
    const urls = extractAllUrls(fallbackText);
    if (urls.length > 0) return urls[0];
  }
  return null;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidHttpUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function extractAllUrls(text) {
  if (!text) return [];
  const regex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
  const matches = text.match(regex) || [];
  const cleaned = [];
  for (let u of matches) {
    u = u.replace(/[.,;!?)]+$/, '').trim();
    if (isValidHttpUrl(u) && !cleaned.includes(u)) {
      cleaned.push(u);
    }
  }
  return cleaned;
}

function isMegaUrl(url) {
  return /https?:\/\/(?:www\.)?mega\.(?:nz|co\.nz|io)/i.test(url);
}

function findMegaUrl(text) {
  const urls = extractAllUrls(text);
  for (const url of urls) {
    if (isMegaUrl(url)) return url;
  }
  return null;
}

function extractUrlsFromMessage(ctx) {
  const text = ctx.message?.text || ctx.message?.caption || '';
  const urls = [];

  const entities = ctx.message?.entities || ctx.message?.caption_entities || [];
  for (const entity of entities) {
    if (entity.type === 'url') {
      let rawUrl = text.substring(entity.offset, entity.offset + entity.length).trim();
      if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'https://' + rawUrl;
      }
      if (isValidHttpUrl(rawUrl) && !urls.includes(rawUrl)) {
        urls.push(rawUrl);
      }
    } else if (entity.type === 'text_link' && entity.url) {
      if (isValidHttpUrl(entity.url) && !urls.includes(entity.url)) {
        urls.push(entity.url);
      }
    }
  }

  const textUrls = extractAllUrls(text);
  for (const tu of textUrls) {
    if (!urls.includes(tu)) urls.push(tu);
  }
  return urls;
}

async function requestBypass(targetUrl, isRefresh = false) {
  const endpoint = isRefresh ? 'refresh' : 'bypass';
  const apiUrl = `${BASE_URL}/${endpoint}?url=${encodeURIComponent(targetUrl)}`;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'User-Agent': 'BypassVipTelegramBot/2.1'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await response.json().catch(() => null);

    if (!data) {
      return { success: false, error: `Invalid API response (HTTP ${response.status})`, elapsed, isRefresh };
    }

    if (data.status === 'success' || (data.result && !data.error && data.status !== 'error')) {
      return { success: true, result: data.result, elapsed, isRefresh };
    }

    return { success: false, error: data.message || data.error || 'Unable to bypass this link.', elapsed, isRefresh };
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Request timed out after 25s.' : (err.message || 'Network error.'),
      elapsed,
      isRefresh
    };
  }
}

async function runChainBypass(startUrl, isRefresh = false, onProgress = null) {
  const maxHops = 8;
  const history = [];
  let currentUrl = startUrl;
  const chainStartTime = Date.now();

  for (let hop = 1; hop <= maxHops; hop++) {
    if (isMegaUrl(currentUrl)) {
      return {
        success: true,
        megaUrl: currentUrl,
        history,
        totalElapsed: ((Date.now() - chainStartTime) / 1000).toFixed(2),
        hops: hop - 1
      };
    }

    if (onProgress) {
      await onProgress(hop, currentUrl, history).catch(() => {});
    }

    const res = await requestBypass(currentUrl, isRefresh);
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        failedAtUrl: currentUrl,
        history,
        totalElapsed: ((Date.now() - chainStartTime) / 1000).toFixed(2),
        hops: hop
      };
    }

    history.push({ hop, from: currentUrl, result: res.result, elapsed: res.elapsed });

    const megaInResult = findMegaUrl(res.result);
    if (megaInResult) {
      return {
        success: true,
        megaUrl: megaInResult,
        history,
        totalElapsed: ((Date.now() - chainStartTime) / 1000).toFixed(2),
        hops: hop
      };
    }

    const urlsInResult = extractAllUrls(res.result);
    const nextUrl = urlsInResult.find(u => u !== currentUrl && !history.some(h => h.from === u));

    if (!nextUrl) {
      return {
        success: true,
        finalUrl: isValidHttpUrl(res.result) ? res.result : null,
        finalContent: res.result,
        history,
        totalElapsed: ((Date.now() - chainStartTime) / 1000).toFixed(2),
        hops: hop,
        isFinalNonMega: true
      };
    }

    currentUrl = nextUrl;
  }

  return {
    success: false,
    error: `Exceeded hop limit (${maxHops} hops) without reaching Mega.nz.`,
    history,
    totalElapsed: ((Date.now() - chainStartTime) / 1000).toFixed(2)
  };
}

function buildSingleResult(originalUrl, res) {
  const urlId = storeUrl(originalUrl);
  const modeText = res.isRefresh ? '🔄 Refresh (Skip Cache)' : '⚡ Premium Fast';

  if (!res.success) {
    let message = `❌ <b>Bypass Failed</b>\n\n`;
    message += `🔗 <b>Target:</b>\n<code>${escapeHtml(originalUrl)}</code>\n\n`;
    message += `⚠️ <b>Error:</b> <i>${escapeHtml(res.error)}</i>\n\n`;
    message += `⏱ <b>Time:</b> ${res.elapsed}s | <b>Mode:</b> ${modeText}`;

    const buttons = [];
    if (!res.isRefresh) {
      buttons.push([Markup.button.callback('🔄 Try Fresh Bypass (Skip Cache)', `refresh:${urlId}`)]);
    }
    return { text: message, markup: Markup.inlineKeyboard(buttons) };
  }

  const destination = res.result;
  const isUrl = isValidHttpUrl(destination);
  const megaUrl = findMegaUrl(destination);

  if (megaUrl) {
    let message = `🎉 <b>Mega.nz Target Reached!</b>\n\n`;
    message += `🔗 <b>Source Link:</b>\n<code>${escapeHtml(originalUrl)}</code>\n\n`;
    message += `📁 <b>Mega.nz Destination:</b>\n<code>${escapeHtml(megaUrl)}</code>\n\n`;
    message += `⏱ <b>Time:</b> ${res.elapsed}s | <b>Mode:</b> ${modeText}`;

    const buttons = [
      [Markup.button.url('📥 Open Mega.nz Link', megaUrl)],
      [Markup.button.callback('🔄 Refresh Bypass (Skip Cache)', `refresh:${urlId}`)]
    ];
    return { text: message, markup: Markup.inlineKeyboard(buttons) };
  }

  const candidateUrls = extractAllUrls(destination).filter(u => u !== originalUrl);
  const nextHopUrl = candidateUrls.length > 0 ? candidateUrls[0] : (isUrl ? destination : null);

  let message = `✅ <b>Bypass Successful!</b>\n\n`;
  message += `🔗 <b>Source Link:</b>\n<code>${escapeHtml(originalUrl)}</code>\n\n`;

  if (isUrl) {
    message += `🔓 <b>Direct Destination:</b>\n<code>${escapeHtml(destination)}</code>\n\n`;
  } else {
    message += `🔓 <b>Extracted Key / Content:</b>\n<pre>${escapeHtml(destination)}</pre>\n\n`;
    if (nextHopUrl) {
      message += `👉 <b>Next Link Found:</b>\n<code>${escapeHtml(nextHopUrl)}</code>\n\n`;
    }
  }

  message += `⏱ <b>Time:</b> ${res.elapsed}s | <b>Mode:</b> ${modeText}`;

  const buttons = [];
  if (nextHopUrl) {
    const nextId = storeUrl(nextHopUrl);
    buttons.push([Markup.button.callback('🎯 Auto-Bypass to Mega.nz', `auto_mega:${urlId}`)]);
    buttons.push([Markup.button.callback('⏩ Bypass Next Link', `next:${nextId}`)]);
  }

  const subRow = [];
  if (isUrl) {
    subRow.push(Markup.button.url('🌐 Open Link', destination));
  } else if (nextHopUrl) {
    subRow.push(Markup.button.url('🌐 Open Next Link', nextHopUrl));
  }
  if (!res.isRefresh) {
    subRow.push(Markup.button.callback('🔄 Refresh (Skip Cache)', `refresh:${urlId}`));
  }
  if (subRow.length > 0) buttons.push(subRow);

  return { text: message, markup: Markup.inlineKeyboard(buttons) };
}

function buildChainResult(startUrl, chainRes) {
  const startId = storeUrl(startUrl);

  if (chainRes.success && chainRes.megaUrl) {
    let msg = `🎉 <b>Mega.nz Link Found!</b>\n\n`;
    msg += `📁 <b>Mega.nz Destination:</b>\n<code>${escapeHtml(chainRes.megaUrl)}</code>\n\n`;

    msg += `📋 <b>Bypass Chain Trace (${chainRes.hops} hop${chainRes.hops > 1 ? 's' : ''} | ${chainRes.totalElapsed}s):</b>\n`;
    chainRes.history.forEach((h, idx) => {
      let label = 'Hop ' + (idx + 1);
      try { label = new URL(h.from).hostname; } catch (_) {}
      msg += `${idx + 1}️⃣ <code>${escapeHtml(label)}</code> (${h.elapsed}s)\n`;
    });
    msg += `🎯 <b>Final Target:</b> <code>Mega.nz</code>\n\n`;
    msg += `⚡ <b>Total Speed:</b> ${chainRes.totalElapsed}s`;

    const buttons = [
      [Markup.button.url('📥 Open Mega.nz Link', chainRes.megaUrl)],
      [Markup.button.callback('🔄 Force Re-run Chain (Fresh)', `refresh_chain:${startId}`)]
    ];
    return { text: msg, markup: Markup.inlineKeyboard(buttons) };
  }

  if (chainRes.success && chainRes.isFinalNonMega) {
    let msg = `🏁 <b>Final Destination Reached (No Mega Link Found)</b>\n\n`;
    if (chainRes.finalUrl) {
      msg += `🔓 <b>Direct Destination:</b>\n<code>${escapeHtml(chainRes.finalUrl)}</code>\n\n`;
    } else {
      msg += `🔓 <b>Extracted Content:</b>\n<pre>${escapeHtml(chainRes.finalContent)}</pre>\n\n`;
    }
    msg += `⏱ <b>Hops:</b> ${chainRes.hops} | <b>Total Time:</b> ${chainRes.totalElapsed}s`;

    const buttons = [];
    if (chainRes.finalUrl) buttons.push([Markup.button.url('🌐 Open Destination', chainRes.finalUrl)]);
    buttons.push([Markup.button.callback('🔄 Force Re-run Chain (Fresh)', `refresh_chain:${startId}`)]);
    return { text: msg, markup: Markup.inlineKeyboard(buttons) };
  }

  let msg = `❌ <b>Chain Bypass Interrupted</b>\n\n`;
  msg += `🔗 <b>Started at:</b> <code>${escapeHtml(startUrl)}</code>\n`;
  if (chainRes.failedAtUrl) {
    msg += `🛑 <b>Stopped at:</b> <code>${escapeHtml(chainRes.failedAtUrl)}</code>\n`;
  }
  msg += `⚠️ <b>Error:</b> <i>${escapeHtml(chainRes.error || 'Failed to complete chain.')}</i>\n\n`;
  msg += `⏱ <b>Completed:</b> ${chainRes.history?.length || 0} hops in ${chainRes.totalElapsed}s`;

  return {
    text: msg,
    markup: Markup.inlineKeyboard([[Markup.button.callback('🔄 Retry Chain (Fresh)', `refresh_chain:${startId}`)]])
  };
}

// Bot Command Handlers
bot.start(async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const name = ctx.from?.first_name || 'there';
  const userId = ctx.from?.id;
  const userPref = await storage.getUserPreference(userId);
  const isAutoMega = Boolean(userPref?.autoMega);

  const text =
    `👋 <b>Hello, ${escapeHtml(name)}!</b>\n\n` +
    `I am your <b>Premium Link Bypass Bot</b> with <b>Mega.nz Auto-Chaining</b>.\n\n` +
    `🚀 <b>Quick Start:</b>\n` +
    `• Simply paste any shortlink or adlink directly here!\n` +
    `• Click <b>🎯 Auto-Bypass to Mega.nz</b> to automatically resolve all hops straight to the final Mega link.\n` +
    `• Click <b>⏩ Bypass Next Link</b> to step through one link at a time.\n\n` +
    `<b>Commands Menu:</b>\n` +
    `• <code>/mega &lt;link&gt;</code> - Auto-bypass all hops straight to Mega.nz\n` +
    `• <code>/mode</code> - Toggle Auto-Mega mode ON/OFF (Current: <b>${isAutoMega ? 'ON 🎯' : 'OFF ⚡'}</b>)\n` +
    `• <code>/bypass &lt;link&gt;</code> - Single-hop bypass\n` +
    `• <code>/refresh &lt;link&gt;</code> - Fresh bypass without cache\n` +
    `• <code>/clear</code> - Delete all previous bypasses & clean chat 🧹\n` +
    `• <code>/status</code> - Check bot latency & API status\n` +
    `• <code>/help</code> - Detailed command reference`;

  const sent = await ctx.replyWithHTML(text, { disable_web_page_preview: true });
  trackMsg(ctx.chat.id, sent.message_id);
});

bot.help(async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const text =
    `📖 <b>All Available Commands:</b>\n\n` +
    `🎯 <b>/mega &lt;link&gt;</b> - Resolves all hops until <code>mega.nz</code>\n` +
    `⚙️ <b>/mode</b> - Toggle default Auto-Mega mode\n` +
    `⚡ <b>/bypass &lt;link&gt;</b> - Single-hop bypass\n` +
    `🔄 <b>/refresh &lt;link&gt;</b> - Fresh bypass (skips cache)\n` +
    `🧹 <b>/clear</b> - Deletes all previous bypasses & messages\n` +
    `🟢 <b>/status</b> - Checks ping and API status\n` +
    `👋 <b>/start</b> - Overview and quick start`;

  const sent = await ctx.replyWithHTML(text, { disable_web_page_preview: true });
  trackMsg(ctx.chat.id, sent.message_id);
});

bot.command(['clear', 'clearall'], async (ctx) => {
  const chatId = ctx.chat.id;
  const currentMsgId = ctx.message.message_id;
  trackMsg(chatId, currentMsgId);

  const statusMsg = await ctx.reply('🧹 Clearing previous bypass messages...');

  const idsToDelete = new Set(chatMessages.get(chatId) || []);
  for (let i = 0; i <= 50; i++) {
    const id = currentMsgId - i;
    if (id > 0) idsToDelete.add(id);
  }
  idsToDelete.delete(statusMsg.message_id);

  for (const msgId of idsToDelete) {
    try {
      await ctx.telegram.deleteMessage(chatId, msgId);
    } catch (_) {}
  }

  chatMessages.set(chatId, new Set());

  try {
    await ctx.telegram.editMessageText(
      chatId,
      statusMsg.message_id,
      null,
      '✨ <b>All previous bypasses and messages cleared!</b>',
      { parse_mode: 'HTML' }
    );
    setTimeout(() => {
      ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    }, 3500);
  } catch (_) {
    ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
  }
});

bot.command(['mode', 'automode'], async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const userId = ctx.from.id;
  const currentPref = await storage.getUserPreference(userId);
  const updated = !currentPref.autoMega;
  await storage.setUserPreference(userId, { autoMega: updated });

  const sent = await ctx.replyWithHTML(
    updated
      ? `🎯 <b>Auto-Mega Mode is now ENABLED!</b>\n\nEvery link you paste will be automatically bypassed straight to <b>Mega.nz</b>! 🎉\n<i>(Preference saved permanently)</i>`
      : `⚡ <b>Standard Mode is now ENABLED!</b>\n\nLinks will be bypassed one step at a time with action buttons.\n<i>(Preference saved permanently)</i>`
  );
  trackMsg(ctx.chat.id, sent.message_id);
});

bot.command('mega', async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const args = ctx.message.text.split(/\s+/).slice(1);
  const targetUrl = args[0];

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    const sent = await ctx.replyWithHTML('⚠️ Please provide a valid URL:\n<code>/mega https://direct-link.net/...</code>');
    return trackMsg(ctx.chat.id, sent.message_id);
  }
  await handleChainBypass(ctx, targetUrl, false);
});

bot.command('status', async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const pingMsg = await ctx.reply('⏳ Checking API status and latency...');
  trackMsg(ctx.chat.id, pingMsg.message_id);
  const start = Date.now();

  try {
    const testUrl = 'https://tinyurl.com/app';
    const testRes = await requestBypass(testUrl, false);
    const latency = Date.now() - start;

    const statusText =
      `🟢 <b>System Status</b>\n\n` +
      `• <b>Bot:</b> Online & Operational\n` +
      `• <b>Bypass.vip API:</b> Connected (${testRes.elapsed}s)\n` +
      `• <b>Total Roundtrip:</b> ${latency}ms\n` +
      `• <b>Multi-Hop / Mega.nz Engine:</b> Active 🚀`;

    await ctx.telegram.editMessageText(ctx.chat.id, pingMsg.message_id, null, statusText, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.telegram.editMessageText(ctx.chat.id, pingMsg.message_id, null, `⚠️ Status failed: ${escapeHtml(err.message)}`, { parse_mode: 'HTML' });
  }
});

bot.command('bypass', async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const args = ctx.message.text.split(/\s+/).slice(1);
  const targetUrl = args[0];

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    const sent = await ctx.replyWithHTML('⚠️ Please provide a valid URL:\n<code>/bypass https://example.com/link</code>');
    return trackMsg(ctx.chat.id, sent.message_id);
  }
  await handleSingleBypass(ctx, targetUrl, false);
});

bot.command('refresh', async (ctx) => {
  trackMsg(ctx.chat.id, ctx.message.message_id);
  const args = ctx.message.text.split(/\s+/).slice(1);
  const targetUrl = args[0];

  if (!targetUrl || !isValidHttpUrl(targetUrl)) {
    const sent = await ctx.replyWithHTML('⚠️ Please provide a valid URL:\n<code>/refresh https://example.com/link</code>');
    return trackMsg(ctx.chat.id, sent.message_id);
  }
  await handleSingleBypass(ctx, targetUrl, true);
});

// Callbacks
bot.action(/^next:(.+)$/, async (ctx) => {
  const urlId = ctx.match[1];
  const targetUrl = getStoredUrl(urlId, ctx.callbackQuery?.message?.text);

  if (!targetUrl) {
    return ctx.answerCbQuery('⚠️ Session expired. Please send the link again.', { show_alert: true });
  }
  await ctx.answerCbQuery('⏩ Bypassing next link...');
  await handleSingleBypass(ctx, targetUrl, false);
});

bot.action(/^auto_mega:(.+)$/, async (ctx) => {
  const urlId = ctx.match[1];
  const targetUrl = getStoredUrl(urlId, ctx.callbackQuery?.message?.text);

  if (!targetUrl) {
    return ctx.answerCbQuery('⚠️ Session expired. Please send the link again.', { show_alert: true });
  }
  await ctx.answerCbQuery('🎯 Initiating Auto-Bypass chain to Mega.nz...');
  await handleChainBypass(ctx, targetUrl, false);
});

bot.action(/^refresh_chain:(.+)$/, async (ctx) => {
  const urlId = ctx.match[1];
  const targetUrl = getStoredUrl(urlId, ctx.callbackQuery?.message?.text);

  if (!targetUrl) {
    return ctx.answerCbQuery('⚠️ Session expired. Please send the link again.', { show_alert: true });
  }
  await ctx.answerCbQuery('🔄 Re-running full chain without cache...');
  await handleChainBypass(ctx, targetUrl, true);
});

bot.action(/^refresh:(.+)$/, async (ctx) => {
  const urlId = ctx.match[1];
  const targetUrl = getStoredUrl(urlId, ctx.callbackQuery?.message?.text);

  if (!targetUrl) {
    return ctx.answerCbQuery('⚠️ Session expired. Please send the link again.', { show_alert: true });
  }
  await ctx.answerCbQuery('🔄 Fetching fresh bypass without cache...');

  try {
    await ctx.editMessageText(
      `⏳ <b>Performing Fresh Bypass...</b>\n\n` +
      `🔗 <b>Link:</b> <code>${escapeHtml(targetUrl)}</code>\n` +
      `<i>Contacting bypass.vip premium refresh endpoint...</i>`,
      { parse_mode: 'HTML', disable_web_page_preview: true }
    );
  } catch (_) {}

  const res = await requestBypass(targetUrl, true);
  const formatted = buildSingleResult(targetUrl, res);

  try {
    await ctx.editMessageText(formatted.text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...formatted.markup
    });
  } catch (_) {
    const sent = await ctx.replyWithHTML(formatted.text, {
      disable_web_page_preview: true,
      ...formatted.markup
    });
    trackMsg(ctx.chat.id, sent.message_id);
  }
});

async function handleSingleBypass(ctx, url, isRefresh = false) {
  const modeNotice = isRefresh ? '🔄 Running fresh bypass...' : '⚡ Bypassing link...';
  const statusMsg = await ctx.replyWithHTML(
    `${modeNotice}\n<code>${escapeHtml(url)}</code>`,
    { disable_web_page_preview: true }
  );
  trackMsg(ctx.chat.id, statusMsg.message_id);

  const res = await requestBypass(url, isRefresh);
  const formatted = buildSingleResult(url, res);

  // Record to persistent storage
  const megaTarget = res.success ? findMegaUrl(res.result) : null;
  storage.recordBypass({
    userId: ctx.from?.id,
    username: getTgUsername(ctx),
    originalUrl: url,
    finalUrl: res.success ? res.result : '',
    content: res.success ? res.result : '',
    mode: isRefresh ? 'Refresh' : 'Standard',
    isMega: Boolean(megaTarget),
    hops: 1,
    elapsed: res.elapsed,
    status: res.success ? 'success' : 'failed',
    error: res.error || null
  }).catch(() => {});

  try {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      formatted.text,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...formatted.markup
      }
    );
  } catch (_) {
    const sent = await ctx.replyWithHTML(formatted.text, {
      disable_web_page_preview: true,
      ...formatted.markup
    });
    trackMsg(ctx.chat.id, sent.message_id);
  }
}

async function handleChainBypass(ctx, url, isRefresh = false) {
  let hostname = 'link';
  try { hostname = new URL(url).hostname; } catch (_) {}

  const statusMsg = await ctx.replyWithHTML(
    `🎯 <b>Auto-Bypassing to Mega.nz...</b>\n\n` +
    `• Hop 1: <code>${escapeHtml(hostname)}</code> ➔ <i>Resolving...</i>`,
    { disable_web_page_preview: true }
  );
  trackMsg(ctx.chat.id, statusMsg.message_id);

  let lastEditTime = Date.now();
  const updateProgress = async (hop, current, history) => {
    const now = Date.now();
    if (now - lastEditTime < 1000 && hop > 1) return;
    lastEditTime = now;

    let progressText = `🎯 <b>Auto-Bypassing to Mega.nz...</b>\n\n`;
    history.forEach((h, idx) => {
      let host = 'link';
      try { host = new URL(h.from).hostname; } catch (_) {}
      progressText += `• Hop ${idx + 1}: <code>${escapeHtml(host)}</code> (${h.elapsed}s) ✅\n`;
    });

    let currentHost = 'link';
    try { currentHost = new URL(current).hostname; } catch (_) {}
    progressText += `• Hop ${hop}: <code>${escapeHtml(currentHost)}</code> ➔ <i>Resolving...</i>`;

    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        null,
        progressText,
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
    } catch (_) {}
  };

  const chainRes = await runChainBypass(url, isRefresh, updateProgress);
  const formatted = buildChainResult(url, chainRes);

  // Record to persistent storage
  const finalDest = chainRes.megaUrl || chainRes.finalUrl || chainRes.finalContent || '';
  storage.recordBypass({
    userId: ctx.from?.id,
    username: getTgUsername(ctx),
    originalUrl: url,
    finalUrl: finalDest,
    content: chainRes.finalContent || '',
    mode: 'Auto-Mega',
    isMega: Boolean(chainRes.megaUrl),
    hops: chainRes.hops || 1,
    elapsed: chainRes.totalElapsed,
    status: chainRes.success ? 'success' : 'failed',
    error: chainRes.error || null
  }).catch(() => {});

  try {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      formatted.text,
      {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...formatted.markup
      }
    );
  } catch (_) {
    const sent = await ctx.replyWithHTML(formatted.text, {
      disable_web_page_preview: true,
      ...formatted.markup
    });
    trackMsg(ctx.chat.id, sent.message_id);
  }
}

bot.on('message', async (ctx) => {
  if (ctx.message.text && ctx.message.text.startsWith('/')) return;
  trackMsg(ctx.chat.id, ctx.message.message_id);

  const urls = extractUrlsFromMessage(ctx);
  if (urls.length === 0) {
    if (ctx.chat.type === 'private') {
      const userPref = await storage.getUserPreference(ctx.from?.id);
      const isAuto = Boolean(userPref?.autoMega);
      const sent = await ctx.replyWithHTML(
        `💡 <i>Send me any supported link, and I will bypass it for you!</i>\n\n` +
        `Current Mode: <b>${isAuto ? '🎯 Auto-Mega' : '⚡ Standard'}</b> (Use /mode to toggle).\n` +
        `Use /clear to wipe the chat history.`,
        { disable_web_page_preview: true }
      );
      return trackMsg(ctx.chat.id, sent.message_id);
    }
    return;
  }

  const userId = ctx.from?.id;
  const userPref = await storage.getUserPreference(userId);
  const isAutoMega = Boolean(userPref?.autoMega);

  for (const url of urls.slice(0, 3)) {
    if (isAutoMega) {
      await handleChainBypass(ctx, url, false);
    } else {
      await handleSingleBypass(ctx, url, false);
    }
  }
});

bot.catch((err, ctx) => {
  console.error(`[Error] Update ${ctx?.update?.update_id}:`, err);
});

module.exports = {
  bot,
  requestBypass,
  runChainBypass
};
