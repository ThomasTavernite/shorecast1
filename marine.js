// Open-Meteo Marine API — wave height, period, direction
// Free, no API key. ONE multi-location call for all beaches (returns an array, in order).
// Docs: https://open-meteo.com/en/docs/marine-weather-api

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

function parseMarine(c) {
  if (!c) return null;
  return {
    waveHeightFt: c.wave_height != null ? +c.wave_height.toFixed(1) : null,
    wavePeriodSec: c.wave_period != null ? +c.wave_period.toFixed(1) : null,
    waveDirectionDeg: c.wave_direction,
    windWaveHeightFt: c.wind_wave_height != null ? +c.wind_wave_height.toFixed(1) : null,
    swellHeightFt: c.swell_wave_height != null ? +c.swell_wave_height.toFixed(1) : null,
    swellPeriodSec: c.swell_wave_period != null ? +c.swell_wave_period.toFixed(1) : null
  };
}

// Score surf 0-100. Sweet spot 2-4 ft with longer period.
function scoreSurf(m) {
  if (!m || m.waveHeightFt == null) return 50;

  const h = m.waveHeightFt;
  const p = m.wavePeriodSec || 6;

  let score = 70;

  if (h < 0.5) score -= 20;
  else if (h < 1) score -= 5;
  else if (h <= 2) score += 10;
  else if (h <= 4) score += 15;
  else if (h <= 6) score -= 5;
  else if (h <= 8) score -= 25;
  else score -= 50;

  if (p >= 10) score += 10;
  else if (p >= 8) score += 5;
  else if (p < 5) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function bearingToCompass(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// One call for every beach. Returns map keyed by beach id.
async function fetchAllMarine() {
  const map = {};
  const lats = BEACHES.map(b => b.lat).join(',');
  const lons = BEACHES.map(b => b.lon).join(',');
  const url = `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lats}&longitude=${lons}` +
    `&current=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_period` +
    `&length_unit=imperial` +
    `&timezone=America/New_York`;

  let arr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await safeFetch(url);
      arr = Array.isArray(data) ? data : [data];
      break;
    } catch (err) {
      if (attempt < 3) { await sleep(attempt * 800); continue; }
      console.error('Marine multi-fetch failed:', err.message);
      arr = null;
    }
  }

  BEACHES.forEach((beach, i) => {
    const d = arr ? arr[i] : null;
    const marine = d ? parseMarine(d.current) : null;
    map[beach.id] = {
      id: beach.id,
      marine: marine ? { ...marine, waveDirection: bearingToCompass(marine.waveDirectionDeg) } : null,
      surfScore: scoreSurf(marine)
    };
  });

  return map;
}

module.exports = { fetchAllMarine, scoreSurf };