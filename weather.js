// Open-Meteo weather scraper
// Free, no API key. ONE multi-location call for all beaches (current + 12h hourly + 2-day daily).
// Open-Meteo returns an array (one entry per coordinate, in order) when given comma-separated coords.
// This replaces ~35 separate requests with a single call — no burst rate-limiting.

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

// Build the next-12-hours strip from one location's hourly arrays.
function buildHourlyStrip(hourly) {
  if (!hourly || !hourly.time) return null;
  const now = Date.now();
  const out = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < now - 30 * 60 * 1000) continue;
    out.push({
      time: hourly.time[i],
      tempF: hourly.temperature_2m?.[i] != null ? Math.round(hourly.temperature_2m[i]) : null,
      precipProb: hourly.precipitation_probability?.[i] ?? null,
      weatherCode: hourly.weather_code?.[i] ?? null,
      windMph: hourly.wind_speed_10m?.[i] != null ? Math.round(hourly.wind_speed_10m[i]) : null
    });
    if (out.length >= 12) break;
  }
  return out.length ? out : null;
}

// Pull tomorrow's summary from one location's daily arrays (index 1 = tomorrow).
function buildTomorrow(daily) {
  if (!daily || !daily.time || daily.time.length < 2) return null;
  const i = 1;
  return {
    date: daily.time[i],
    highF: daily.temperature_2m_max?.[i] != null ? Math.round(daily.temperature_2m_max[i]) : null,
    lowF: daily.temperature_2m_min?.[i] != null ? Math.round(daily.temperature_2m_min[i]) : null,
    weatherCode: daily.weather_code?.[i] ?? null,
    precipProb: daily.precipitation_probability_max?.[i] ?? null,
    sunrise: daily.sunrise?.[i] ?? null,
    sunset: daily.sunset?.[i] ?? null
  };
}

function parseCurrent(c) {
  if (!c || c.temperature_2m == null) return null;
  return {
    tempF: Math.round(c.temperature_2m),
    feelsLikeF: Math.round(c.apparent_temperature),
    precipIn: c.precipitation || 0,
    windMph: Math.round(c.wind_speed_10m),
    gustsMph: Math.round(c.wind_gusts_10m),
    uvIndex: c.uv_index,
    cloudPct: c.cloud_cover,
    weatherCode: c.weather_code
  };
}

function scoreWeather(w) {
  if (!w) return 50;
  let score = 100;

  if (w.feelsLikeF < 65) score -= (65 - w.feelsLikeF) * 2;
  else if (w.feelsLikeF > 90) score -= (w.feelsLikeF - 90) * 2;
  else if (w.feelsLikeF >= 75 && w.feelsLikeF <= 85) score += 0;
  else score -= 5;

  if (w.precipIn > 0.05) score -= 30;
  else if (w.precipIn > 0) score -= 10;

  if (w.windMph > 20) score -= 20;
  else if (w.windMph > 10) score -= 8;

  if (w.cloudPct > 80) score -= 10;
  else if (w.cloudPct > 50) score -= 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// One call for every beach. Returns map keyed by beach id.
async function fetchAllWeather() {
  const map = {};
  const lats = BEACHES.map(b => b.lat).join(',');
  const lons = BEACHES.map(b => b.lon).join(',');
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset` +
    `&forecast_days=2` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America/New_York`;

  let arr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await safeFetch(url);
      arr = Array.isArray(data) ? data : [data];
      break;
    } catch (err) {
      if (attempt < 3) { await sleep(attempt * 800); continue; }
      console.error('Weather multi-fetch failed:', err.message);
      arr = null;
    }
  }

  BEACHES.forEach((beach, i) => {
    const d = arr ? arr[i] : null;
    const current = d ? parseCurrent(d.current) : null;
    map[beach.id] = {
      id: beach.id,
      weather: current,
      hourly: d ? buildHourlyStrip(d.hourly) : null,
      tomorrow: d ? buildTomorrow(d.daily) : null,
      weatherScore: scoreWeather(current)
    };
  });

  return map;
}

module.exports = { fetchAllWeather, scoreWeather };