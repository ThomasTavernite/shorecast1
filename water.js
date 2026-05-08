// Water quality scorer
// v1: Uses recent rainfall as proxy (NJDEP's own primary indicator for bacterial closures)
// v2 (post-launch): Will add NJDEP API data when their season is active

const BEACHES = require('./beaches');

async function fetchRainfallForBeach(beach) {
  // Pull last 3 days of hourly precipitation
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&hourly=precipitation` +
    `&past_days=3&forecast_days=1` +
    `&precipitation_unit=inch` +
    `&timezone=America/New_York` +
    `&models=gfs_hrrr`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hourly = data.hourly;
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
      if (age < 0) continue;        // future
      if (age <= ms24h) total24h += p;
      if (age <= ms72h) total72h += p;
    }

    return {
      rain24hIn: +total24h.toFixed(2),
      rain72hIn: +total72h.toFixed(2)
    };
  } catch (err) {
    console.error(`Rainfall fetch failed for ${beach.id}:`, err.message);
    return null;
  }
}

// Score water quality 0-100. Lower rainfall = better.
// Threshold logic mirrors what NJDEP uses informally:
// - >1" in 24h or >2" in 72h: high risk of advisory
// - 0" recent: ideal
function scoreWater(r) {
  if (!r) return 70; // unknown -> neutral-ish

  let score = 100;

  // Last 24h rainfall is the biggest factor
  if (r.rain24hIn >= 2) score -= 50;
  else if (r.rain24hIn >= 1) score -= 30;
  else if (r.rain24hIn >= 0.5) score -= 15;
  else if (r.rain24hIn >= 0.1) score -= 5;

  // 72h cumulative, since runoff lingers
  if (r.rain72hIn >= 4) score -= 25;
  else if (r.rain72hIn >= 2) score -= 12;
  else if (r.rain72hIn >= 1) score -= 5;

  return Math.max(20, Math.min(100, Math.round(score)));
}

// Plain-English description
function waterLabel(r, score) {
  if (!r) return { label: 'Estimated', detail: '' };
  if (score >= 85) return { label: 'Likely clean', detail: r.rain72hIn === 0 ? 'No recent rain' : `${r.rain72hIn}" rain past 3 days` };
  if (score >= 65) return { label: 'Fair', detail: `${r.rain72hIn}" rain past 3 days` };
  if (score >= 45) return { label: 'Use caution', detail: `${r.rain72hIn}" rain past 3 days — possible runoff` };
  return { label: 'Advisory likely', detail: `${r.rain24hIn}" rain in 24h — high runoff risk` };
}

async function fetchAllWater() {
  const results = await Promise.all(
    BEACHES.map(async beach => {
      const rainfall = await fetchRainfallForBeach(beach);
      const waterScore = scoreWater(rainfall);
      return {
        id: beach.id,
        rainfall,
        waterScore,
        waterLabel: waterLabel(rainfall, waterScore)
      };
    })
  );

  const map = {};
  results.forEach(r => { map[r.id] = r; });
  return map;
}

module.exports = { fetchAllWater, scoreWater };