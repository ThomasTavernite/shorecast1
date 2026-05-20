// Open-Meteo weather scraper
// Free, no API key. Tries HRRR (high-res US model) first, falls back to default.
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

async function fetchOnce(beach, model) {
  const modelParam = model ? `&models=${model}` : '';
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America/New_York` +
    modelParam;

  const data = await safeFetch(url);
  const c = data.current;

  // HRRR sometimes returns nulls for coastal grid cells
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

// Small helper to wait between retries
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWeatherForBeach(beach) {
  // Try up to 3 times total, with HRRR first then best_match fallback each round
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Try HRRR first (1km resolution, NOAA US)
      const hrrr = await fetchOnce(beach, 'gfs_hrrr');
      if (hrrr) return hrrr;
      // Fallback: best_match (Open-Meteo auto-picks model)
      const best = await fetchOnce(beach, null);
      if (best) return best;
    } catch (err) {
      // Transient failure (rate limit / timeout) — wait and retry
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
        const weather = await fetchWeatherForBeach(beach);
        return {
          id: beach.id,
          weather,
          weatherScore: scoreWeather(weather)
        };
      })
    );
    results.forEach(r => { map[r.id] = r; });

    // Brief pause between batches so we don't hammer the API all at once
    if (i + BATCH_SIZE < BEACHES.length) {
      await sleep(300);
    }
  }

  return map;
}

module.exports = { fetchAllWeather, scoreWeather };