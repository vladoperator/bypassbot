const { getAllLinks, initStorage } = require('../storage');

function renderHtml(links) {
  const jsonLinks = JSON.stringify(links).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚡ BypassBot Hub | Live Bypassed Links</title>
  <meta name="description" content="Live monitoring dashboard of links bypassed via Telegram Bypass Bot.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --bg-card: rgba(18, 24, 38, 0.7);
      --bg-card-hover: rgba(24, 33, 53, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(99, 102, 241, 0.5);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #6366f1;
      --primary-glow: rgba(99, 102, 241, 0.35);
      --accent: #8b5cf6;
      --mega: #ea4335;
      --mega-glow: rgba(234, 67, 53, 0.3);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.25);
      --warning: #f59e0b;
      --font-heading: 'Outfit', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(99, 102, 241, 0.12) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.1) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 60%);
      background-attachment: fixed;
      color: var(--text-main);
      font-family: var(--font-body);
      min-height: 100vh;
      line-height: 1.5;
      padding-bottom: 60px;
    }

    /* Ambient top glow bar */
    .top-accent-bar {
      height: 3px;
      background: linear-gradient(90deg, #4f46e5, #06b6d4, #10b981, #f59e0b, #ef4444);
      width: 100%;
    }

    .container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 32px 20px;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-badge {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #4f46e5, #9333ea);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 8px 24px var(--primary-glow);
    }

    .title-box h1 {
      font-family: var(--font-heading);
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 40%, #c7d2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .title-box p {
      color: var(--text-muted);
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--success);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 10px var(--success);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .tg-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      text-decoration: none;
      padding: 9px 18px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
    }

    .tg-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 18px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(14px);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.16);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--accent-color, var(--primary));
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .stat-val {
      font-family: var(--font-heading);
      font-size: 32px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .stat-sub {
      color: var(--text-dim);
      font-size: 12px;
      margin-top: 4px;
    }

    /* Controls Bar */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: var(--bg-card);
      backdrop-filter: blur(14px);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .search-box {
      flex: 1;
      min-width: 260px;
      position: relative;
    }

    .search-box svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-dim);
    }

    .search-input {
      width: 100%;
      background: rgba(10, 14, 23, 0.8);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 11px 16px 11px 42px;
      color: var(--text-main);
      font-family: var(--font-body);
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .filters-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
    }

    .filter-btn.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      box-shadow: 0 4px 14px var(--primary-glow);
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 9px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .refresh-btn svg.spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Links List Stream */
    .links-stream {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .link-item {
      background: var(--bg-card);
      backdrop-filter: blur(14px);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      transition: all 0.2s ease;
      position: relative;
    }

    .link-item:hover {
      background: var(--bg-card-hover);
      border-color: rgba(255, 255, 255, 0.18);
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .user-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #c7d2fe;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }

    .user-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: white;
    }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 6px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .badge-mega {
      background: rgba(234, 67, 53, 0.15);
      border: 1px solid rgba(234, 67, 53, 0.4);
      color: #ff6b6b;
      box-shadow: 0 0 10px var(--mega-glow);
    }

    .badge-direct {
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.35);
      color: #22d3ee;
    }

    .badge-speed {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    .item-time {
      color: var(--text-dim);
      font-size: 12px;
    }

    /* URL Details */
    .urls-wrapper {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .url-block {
      background: rgba(7, 10, 18, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .url-content {
      flex: 1;
      overflow: hidden;
    }

    .url-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-dim);
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .url-text {
      font-family: var(--font-mono);
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-main);
      display: block;
    }

    .url-text.final {
      color: #38bdf8;
      font-weight: 500;
    }

    .url-text.mega {
      color: #f87171;
      font-weight: 600;
    }

    .url-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-icon-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      transition: all 0.2s;
    }

    .action-icon-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: white;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .action-icon-btn.primary {
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: white;
      border: none;
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .action-icon-btn.primary:hover {
      box-shadow: 0 4px 14px var(--primary-glow);
      transform: translateY(-1px);
    }

    .action-icon-btn.mega-btn {
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: white;
      border: none;
      box-shadow: 0 2px 8px var(--mega-glow);
    }

    .action-icon-btn.mega-btn:hover {
      box-shadow: 0 4px 14px var(--mega-glow);
      transform: translateY(-1px);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: 20px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      display: inline-block;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .empty-state h3 {
      font-family: var(--font-heading);
      font-size: 20px;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 420px;
      margin: 0 auto 20px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .container { padding: 20px 14px; }
      header { flex-direction: column; align-items: flex-start; }
      .controls-bar { flex-direction: column; align-items: stretch; }
      .search-box { min-width: 100%; }
      .filters-group { overflow-x: auto; padding-bottom: 4px; }
      .url-block { flex-direction: column; align-items: flex-start; }
      .url-actions { width: 100%; justify-content: flex-end; }
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--border);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 9999;
    }

    #toast.show {
      transform: translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="top-accent-bar"></div>

  <div class="container">
    <header>
      <div class="logo-area">
        <div class="logo-badge">⚡</div>
        <div class="title-box">
          <h1>BypassBot Link Hub</h1>
          <p>Live stream of links bypassed via Telegram bot</p>
        </div>
      </div>

      <div class="header-actions">
        <div class="live-indicator">
          <span class="pulse-dot"></span>
          <span>Live Sync Active</span>
        </div>
        <a href="https://t.me/bypassersigmabot" target="_blank" rel="noopener" class="tg-btn" id="open-tg-bot">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
          Open @bypassersigmabot
        </a>
      </div>
    </header>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card" style="--accent-color: #6366f1;">
        <div class="stat-label">Total Bypassed</div>
        <div class="stat-val" id="stat-total">0</div>
        <div class="stat-sub">Across all user sessions</div>
      </div>
      <div class="stat-card" style="--accent-color: #ef4444;">
        <div class="stat-label">🎯 Mega.nz Reached</div>
        <div class="stat-val" id="stat-mega" style="color: #f87171;">0</div>
        <div class="stat-sub">Resolved direct downloads</div>
      </div>
      <div class="stat-card" style="--accent-color: #06b6d4;">
        <div class="stat-label">⚡ Direct Links</div>
        <div class="stat-val" id="stat-direct" style="color: #38bdf8;">0</div>
        <div class="stat-sub">Cleaned shortlinks & pastebins</div>
      </div>
      <div class="stat-card" style="--accent-color: #10b981;">
        <div class="stat-label">Active Users</div>
        <div class="stat-val" id="stat-users" style="color: #34d399;">0</div>
        <div class="stat-sub">Distinct Telegram accounts</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="search-input" class="search-input" placeholder="Search by link URL, domain, or @username...">
      </div>

      <div class="filters-group">
        <button class="filter-btn active" data-filter="all" id="filter-all">All Links</button>
        <button class="filter-btn" data-filter="mega" id="filter-mega">🎯 Mega.nz Only</button>
        <button class="filter-btn" data-filter="direct" id="filter-direct">⚡ Direct Links</button>
      </div>

      <button class="refresh-btn" id="btn-refresh">
        <svg id="refresh-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>Refresh</span>
      </button>
    </div>

    <!-- Links Stream -->
    <div id="links-container" class="links-stream"></div>
  </div>

  <div id="toast">✅ Link copied to clipboard!</div>

  <script>
    let linksData = ${jsonLinks};
    let currentFilter = 'all';
    let searchQuery = '';

    function timeAgo(timestamp) {
      if (!timestamp) return 'Recently';
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 30) return 'Just now';
      if (seconds < 60) return seconds + 's ago';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + 'h ago';
      const days = Math.floor(hours / 24);
      return days + 'd ago';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied to clipboard!');
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('📋 Copied to clipboard!');
      });
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function updateStats() {
      const total = linksData.length;
      const megaCount = linksData.filter(l => l.isMega || (l.finalUrl && /mega\.(nz|io)/i.test(l.finalUrl))).length;
      const directCount = total - megaCount;
      const distinctUsers = new Set(linksData.map(l => l.username || l.userId)).size;

      document.getElementById('stat-total').innerText = total;
      document.getElementById('stat-mega').innerText = megaCount;
      document.getElementById('stat-direct').innerText = directCount >= 0 ? directCount : 0;
      document.getElementById('stat-users').innerText = distinctUsers;
    }

    function renderLinks() {
      const container = document.getElementById('links-container');
      updateStats();

      const q = searchQuery.toLowerCase().trim();
      const filtered = linksData.filter(item => {
        if (currentFilter === 'mega') {
          const isMega = item.isMega || (item.finalUrl && /mega\.(nz|io)/i.test(item.finalUrl));
          if (!isMega) return false;
        } else if (currentFilter === 'direct') {
          const isMega = item.isMega || (item.finalUrl && /mega\.(nz|io)/i.test(item.finalUrl));
          if (isMega) return false;
        }

        if (q) {
          const u = (item.username || '').toLowerCase();
          const orig = (item.originalUrl || '').toLowerCase();
          const fin = (item.finalUrl || item.content || '').toLowerCase();
          return u.includes(q) || orig.includes(q) || fin.includes(q);
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-icon">🔗</div>
            <h3>No Bypassed Links Found</h3>
            <p>\${searchQuery ? 'No results matched your search query. Try clearing the search bar.' : 'No links have been bypassed yet! Send any link to <b>@bypassersigmabot</b> on Telegram and it will appear here in real-time.'}</p>
            <a href="https://t.me/bypassersigmabot" target="_blank" rel="noopener" class="tg-btn">
              ⚡ Open Telegram Bot
            </a>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(item => {
        const username = item.username || 'Anonymous';
        const initial = username.replace(/^@/, '').charAt(0).toUpperCase() || '?';
        const isMega = item.isMega || (item.finalUrl && /mega\.(nz|io)/i.test(item.finalUrl));
        const finalDest = item.finalUrl || item.content || '(Direct Content)';
        const isHttp = /^https?:\\/\\//i.test(finalDest);

        return \`
          <div class="link-item" id="item-\${item.id}">
            <div class="item-header">
              <div class="user-pill">
                <span class="user-avatar">\${escapeHtml(initial)}</span>
                <span>\${escapeHtml(username)}</span>
              </div>

              <div class="item-meta">
                \${isMega 
                  ? '<span class="badge badge-mega">🎯 Mega.nz Reached</span>' 
                  : '<span class="badge badge-direct">⚡ Direct Link</span>'}
                <span class="badge badge-speed">\${item.elapsed ? item.elapsed + 's' : ''} \${item.hops > 1 ? '• ' + item.hops + ' hops' : ''}</span>
                <span class="item-time" title="\${new Date(item.timestamp).toLocaleString()}">\${timeAgo(item.timestamp)}</span>
              </div>
            </div>

            <div class="urls-wrapper">
              <div class="url-block">
                <div class="url-content">
                  <div class="url-label">
                    <span>Source Link</span>
                  </div>
                  <span class="url-text" title="\${escapeHtml(item.originalUrl)}">\${escapeHtml(item.originalUrl)}</span>
                </div>
                <div class="url-actions">
                  <button class="action-icon-btn" onclick="copyToClipboard('\${escapeHtml(item.originalUrl)}')">
                    <span>Copy</span>
                  </button>
                  <a href="\${escapeHtml(item.originalUrl)}" target="_blank" rel="noopener" class="action-icon-btn">
                    <span>Open ↗</span>
                  </a>
                </div>
              </div>

              <div class="url-block">
                <div class="url-content">
                  <div class="url-label">
                    <span>\${isMega ? '🎯 Final Mega.nz Destination' : '🔓 Bypassed Destination'}</span>
                  </div>
                  <span class="url-text \${isMega ? 'mega' : 'final'}" title="\${escapeHtml(finalDest)}">\${escapeHtml(finalDest)}</span>
                </div>
                <div class="url-actions">
                  <button class="action-icon-btn" onclick="copyToClipboard('\${escapeHtml(finalDest)}')">
                    <span>Copy</span>
                  </button>
                  \${isHttp ? \`
                    <a href="\${escapeHtml(finalDest)}" target="_blank" rel="noopener" class="action-icon-btn \${isMega ? 'mega-btn' : 'primary'}">
                      <span>\${isMega ? '📥 Download' : 'Open Link ↗'}</span>
                    </a>
                  \` : ''}
                </div>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Refresh fetch
    async function fetchFreshData() {
      const icon = document.getElementById('refresh-icon');
      icon.classList.add('spin');
      try {
        const res = await fetch('/api/links?format=json&t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.links)) {
            linksData = data.links;
            renderLinks();
            showToast('✨ Links refreshed!');
          }
        }
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setTimeout(() => icon.classList.remove('spin'), 400);
      }
    }

    // Event listeners
    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderLinks();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderLinks();
      });
    });

    document.getElementById('btn-refresh').addEventListener('click', fetchFreshData);

    // Initial render
    renderLinks();

    // Auto-poll every 12 seconds
    setInterval(fetchFreshData, 12000);
  </script>
</body>
</html>`;
}

module.exports = async (req, res) => {
  await initStorage().catch(() => {});
  const links = await getAllLinks(100);

  const url = req.url || '';
  const isJson = url.includes('format=json') || 
                 (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isJson) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      success: true,
      count: links.length,
      links
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).send(renderHtml(links));
};

module.exports.renderHtml = renderHtml;
