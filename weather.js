// Open-Meteo weather scraper
// Free, no API key. Single best_match call per beach: current + 12h hourly + 2-day daily.
// (Reverted from HRRR-first + backfill, which doubled calls and timed out on Vercel.)
// Includes timeout + retry to handle transient rate-limiting on burst requests.

const BEACHES = require('./beaches');

// Fetch with an abort timeout so hung requests fail fast instead of hanging
async function safeFetch(url, timeoutMs = 8000) {
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

// Build the next-12-hours strip from Open-Meteo hourly arrays.
function buildHourlyStrip(hourly) {
  if (!hourly || !hourly.time) return null;
  const now = Date.now();
  const out = [];
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < now - 30 * 60 * 1000) continue; // skip hours already well past
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

// Pull tomorrow's summary from Open-Meteo daily arrays (index 1 = tomorrow).
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

// One request per beach: current conditions + hourly + daily, all together.
async function fetchOnce(beach) {
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset` +
    `&forecast_days=2` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America/New_York`;

  const data = await safeFetch(url);
  const c = data.current;
  if (!c || c.temperature_2m == null) return null;

  return {
    current: {
      tempF: Math.round(c.temperature_2m),
      feelsLikeF: Math.round(c.apparent_temperature),
      precipIn: c.precipitation || 0,
      windMph: Math.round(c.wind_speed_10m),
      gustsMph: Math.round(c.wind_gusts_10m),
      uvIndex: c.uv_index,
      cloudPct: c.cloud_cover,
      weatherCode: c.weather_code
    },
    hourly: buildHourlyStrip(data.hourly),
    tomorrow: buildTomorrow(data.daily)
  };
}

// Small helper to wait between retries
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWeatherForBeach(beach) {
  // Up to 3 attempts, single call each — handles transient rate limits / timeouts.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await fetchOnce(beach);
      if (data) return data;
      return null;
    } catch (err) {
      if (attempt < 3) {
        await sleep(attempt * 600); // 600ms, then 1200ms
        continue;
      }
      console.error(`Weather fetch failed for ${beach.id} after ${attempt} attempts:`, err.message);
      return null;
    }
  }
  return null;
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

// Fetch weather for all beaches in small batches to avoid burst rate-limiting
async function fetchAllWeather() {
  const map = {};
  const BATCH_SIZE = 6;

  for (let i = 0; i < BEACHES.length; i += BATCH_SIZE) {
    const batch = BEACHES.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async beach => {
        const data = await fetchWeatherForBeach(beach);
        return {
          id: beach.id,
          weather: data ? data.current : null,
          hourly: data ? data.hourly : null,
          tomorrow: data ? data.tomorrow : null,
          weatherScore: scoreWeather(data ? data.current : null)
        };
      })
    );
    results.forEach(r => { map[r.id] = r; });

    if (i + BATCH_SIZE < BEACHES.length) {
      await sleep(300);
    }
  }

  return map;
}

module.exports = { fetchAllWeather, scoreWeather };