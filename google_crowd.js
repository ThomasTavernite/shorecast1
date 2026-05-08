// Google Popular Times scraper
// FRAGILE BY DESIGN — Google can break this anytime by changing their HTML.
// Always paired with the heuristic fallback in crowd.js. If this returns null,
// the heuristic stands in. Cached aggressively to minimize requests.

const BEACHES = require('./beaches');

const FETCH_TIMEOUT_MS = 5000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Pull "Live: X% busier than usual" or "Live: less busy" snippets from a Google
// search results page. Returns 0-100 crowd level, or null if unavailable.
function parseLiveCrowd(html) {
  if (!html) return null;

  // Pattern 1: "X% busier than usual"
  let match = html.match(/Live[^<>]{0,40}?(\d{1,3})%\s*(busier|less busy)/i);
  if (match) {
    const pct = parseInt(match[1], 10);
    const direction = match[2].toLowerCase();
    // Baseline normal usage maps to ~50 on our 0-100 scale.
    // "X% busier" -> 50 + (X/2) capped, "X% less busy" -> 50 - (X/2) floored.
    const offset = Math.min(50, pct / 2);
    return direction === 'busier'
      ? Math.min(100, Math.round(50 + offset))
      : Math.max(0, Math.round(50 - offset));
  }

  // Pattern 2: "Usually as busy as it gets" or "Usually not busy"
  if (/Usually as busy as it gets/i.test(html)) return 90;
  if (/Usually a little busy/i.test(html)) return 60;
  if (/Usually not too busy/i.test(html)) return 35;
  if (/Usually not busy/i.test(html)) return 20;

  return null;
}

async function fetchGoogleCrowdForBeach(beach) {
  const query = encodeURIComponent(`${beach.name} ${beach.town} NJ popular times`);
  const url = `https://www.google.com/search?q=${query}&hl=en&gl=us`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const level = parseLiveCrowd(html);
    return level == null ? null : { level, source: 'google' };
  } catch (err) {
    // Network error, abort, captcha — fail silently and let the fallback handle it
    return null;
  }
}

async function fetchAllGoogleCrowds() {
  // Sequential, not parallel — hammering Google with 30 simultaneous requests
  // is the fastest way to get rate-limited or captcha-walled.
  // Small delay between each request to be polite.
  const map = {};
  for (const beach of BEACHES) {
    const result = await fetchGoogleCrowdForBeach(beach);
    if (result) map[beach.id] = result;
    await new Promise(r => setTimeout(r, 250));
  }
  return map;
}

module.exports = { fetchAllGoogleCrowds, parseLiveCrowd };