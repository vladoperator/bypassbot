const fs = require('fs');
const path = require('path');

// Determine local storage directory & file
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const localDir = isServerless ? '/tmp' : path.join(__dirname, 'data');
const localFilePath = path.join(localDir, 'bypass_db.json');

// Cloud storage key (persistent across all serverless restarts)
const CLOUD_APP_KEY = process.env.STORAGE_APP_KEY || '1n25jur1';
const CLOUD_API_BASE = 'https://keyvalue.immanuel.co/api/KeyVal';

// In-memory cache
let inMemoryData = {
  preferences: {}, // { [userId]: { autoMega: boolean } }
  links: []        // Array of recent bypass records (max 200)
};

let isInitialized = false;

// Ensure local directory exists
try {
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
} catch (_) {}

// Read from local file
function loadFromFile() {
  try {
    if (fs.existsSync(localFilePath)) {
      const content = fs.readFileSync(localFilePath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        if (parsed.preferences) inMemoryData.preferences = parsed.preferences;
        if (Array.isArray(parsed.links)) inMemoryData.links = parsed.links;
        return true;
      }
    }
  } catch (err) {
    console.error('[Storage] Error reading local db file:', err.message);
  }
  return false;
}

// Save to local file
function saveToFile() {
  try {
    fs.writeFileSync(localFilePath, JSON.stringify(inMemoryData, null, 2), 'utf8');
  } catch (err) {
    console.error('[Storage] Error writing local db file:', err.message);
  }
}

// Sync from Cloud KV
async function syncFromCloud() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${CLOUD_API_BASE}/GetValue/${CLOUD_APP_KEY}/bot_data`, {
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const b64 = await res.json();
      if (b64 && typeof b64 === 'string' && b64.trim() !== '') {
        const decoded = Buffer.from(b64, 'base64url').toString('utf8');
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object') {
          inMemoryData.preferences = {
            ...inMemoryData.preferences,
            ...(parsed.preferences || {})
          };
          // Merge links, deduplicating by ID
          const existingIds = new Set(inMemoryData.links.map(l => l.id));
          const cloudLinks = Array.isArray(parsed.links) ? parsed.links : [];
          for (const cl of cloudLinks) {
            if (!existingIds.has(cl.id)) {
              inMemoryData.links.push(cl);
            }
          }
          // Sort newest first, keep last 200
          inMemoryData.links.sort((a, b) => b.timestamp - a.timestamp);
          if (inMemoryData.links.length > 200) {
            inMemoryData.links = inMemoryData.links.slice(0, 200);
          }
          saveToFile();
          return true;
        }
      }
    }
  } catch (err) {
    // Cloud sync failure should not crash app
    console.warn('[Storage] Cloud syncFromCloud notice:', err.message);
  }
  return false;
}

// Push to Cloud KV (fire-and-forget or awaited)
let cloudSaveTimer = null;
async function pushToCloud() {
  try {
    const payload = JSON.stringify({
      preferences: inMemoryData.preferences,
      links: inMemoryData.links.slice(0, 150) // Keep payload compact
    });
    const b64 = Buffer.from(payload).toString('base64url');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch(`${CLOUD_API_BASE}/UpdateValue/${CLOUD_APP_KEY}/bot_data/${b64}`, {
      method: 'POST',
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch (err) {
    console.warn('[Storage] pushToCloud notice:', err.message);
  }
}

function scheduleCloudPush() {
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    pushToCloud().catch(() => {});
  }, 1000);
}

// Initialize storage: load local first, then sync cloud
async function initStorage() {
  if (isInitialized) return;
  loadFromFile();
  await syncFromCloud().catch(() => {});
  isInitialized = true;
}

// User preferences helpers
async function getUserPreference(userId) {
  if (!isInitialized) await initStorage();
  const idStr = String(userId);
  return inMemoryData.preferences[idStr] || { autoMega: false };
}

function getUserPreferenceSync(userId) {
  const idStr = String(userId);
  return inMemoryData.preferences[idStr] || { autoMega: false };
}

async function setUserPreference(userId, pref) {
  if (!isInitialized) await initStorage();
  const idStr = String(userId);
  inMemoryData.preferences[idStr] = {
    ...(inMemoryData.preferences[idStr] || {}),
    ...pref
  };
  saveToFile();
  scheduleCloudPush();
  return inMemoryData.preferences[idStr];
}

// Link recording helpers
async function recordBypass(linkData) {
  if (!isInitialized) await initStorage();

  const entry = {
    id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
    timestamp: Date.now(),
    userId: linkData.userId || null,
    username: linkData.username || 'Anonymous',
    originalUrl: linkData.originalUrl || '',
    finalUrl: linkData.finalUrl || '',
    content: linkData.content || '',
    mode: linkData.mode || 'Standard',
    isMega: Boolean(linkData.isMega),
    hops: linkData.hops || 1,
    elapsed: linkData.elapsed || '0.00',
    status: linkData.status || 'success',
    error: linkData.error || null
  };

  inMemoryData.links.unshift(entry);
  if (inMemoryData.links.length > 200) {
    inMemoryData.links = inMemoryData.links.slice(0, 200);
  }

  saveToFile();
  scheduleCloudPush();
  return entry;
}

async function getAllLinks(limit = 100) {
  if (!isInitialized) await initStorage();
  return inMemoryData.links.slice(0, limit);
}

// Initial eager load
loadFromFile();
syncFromCloud().then(() => { isInitialized = true; }).catch(() => {});

module.exports = {
  initStorage,
  getUserPreference,
  getUserPreferenceSync,
  setUserPreference,
  recordBypass,
  getAllLinks
};
