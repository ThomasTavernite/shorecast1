// Water quality scorer
// v1: Uses recent rainfall as proxy (NJDEP's own primary indicator for bacterial closures)
// ONE multi-location call for all beaches (returns an array, in order).
// v2 (post-launch): Will add NJDEP API data when their season is active

const BEACHES = require('./beaches');

async function safeFetch(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Sum recent rainfall (24h + 72h) from one location's hourly precip arrays.
function parseRainfall(hourly) {
  if (!hourly || !hourly.precipitation || !hourly.time) return null;

  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms72h = 3 * ms24h;

  let total24h = 0;
  let total72h = 0;

  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    const p = hourly.precipitation[i] || 0;
    const age = now - t;
    if (age < 0) continue;
    if (age <= ms24h) total24h += p;
    if (age <= ms72h) total72h += p;
  }

  return {
    rain24hIn: +total24h.toFixed(2),
    rain72hIn: +total72h.toFixed(2)
  };
}

function scoreWater(r) {
  if (!r) return 70;

  let score = 100;

  if (r.rain24hIn >= 2) score -= 50;
  else if (r.rain24hIn >= 1) score -= 30;
  else if (r.rain24hIn >= 0.5) score -= 15;
  else if (r.rain24hIn >= 0.1) score -= 5;

  if (r.rain72hIn >= 4) score -= 25;
  else if (r.rain72hIn >= 2) score -= 12;
  else if (r.rain72hIn >= 1) score -= 5;

  return Math.max(20, Math.min(100, Math.round(score)));
}

function waterLabel(r, score) {
  if (!r) return { label: 'No recent sample', detail: 'Rainfall data updating — refreshes every 10 min' };
  if (score >= 85) return { label: 'Likely clean', detail: r.rain72hIn === 0 ? 'No recent rain' : `${r.rain72hIn}" rain past 3 days` };
  if (score >= 65) return { label: 'Fair', detail: `${r.rain72hIn}" rain past 3 days` };
  if (score >= 45) return { label: 'Use caution', detail: `${r.rain72hIn}" rain past 3 days — possible runoff` };
  return { label: 'Advisory likely', detail: `${r.rain24hIn}" rain in 24h — high runoff risk` };
}

// One call for every beach. Returns map keyed by beach id.
async function fetchAllWater() {
  const map = {};
  const lats = BEACHES.map(b => b.lat).join(',');
  const lons = BEACHES.map(b => b.lon).join(',');
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lons}` +
    `&hourly=precipitation` +
    `&past_days=3&forecast_days=1` +
    `&precipitation_unit=inch` +
    `&timezone=America/New_York`;

  let arr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await safeFetch(url);
      arr = Array.isArray(data) ? data : [data];
      break;
    } catch (err) {
      if (attempt < 3) { await sleep(attempt * 800); continue; }
      console.error('Water multi-fetch failed:', err.message);
      arr = null;
    }
  }

  BEACHES.forEach((beach, i) => {
    const d = arr ? arr[i] : null;
    const rainfall = d ? parseRainfall(d.hourly) : null;
    const waterScore = scoreWater(rainfall);
    map[beach.id] = {
      id: beach.id,
      rainfall,
      waterScore,
      waterLabel: waterLabel(rainfall, waterScore)
    };
  });

  return map;
}

module.exports = { fetchAllWater, scoreWater };