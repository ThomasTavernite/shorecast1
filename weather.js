// Open-Meteo weather scraper
// Free, no API key. Tries HRRR (high-res US model) first, falls back to default.

const BEACHES = require('./beaches');

async function fetchOnce(beach, model) {
  const modelParam = model ? `&models=${model}` : '';
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America/New_York` +
    modelParam;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current;

  // HRRR sometimes returns nulls for coastal grid cells
  if (c.temperature_2m == null) return null;

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

async function fetchWeatherForBeach(beach) {
  try {
    const hrrr = await fetchOnce(beach, 'gfs_hrrr');
    if (hrrr) return hrrr;
  } catch (err) {
    // HRRR failed entirely, fall through
  }
  try {
    return await fetchOnce(beach, null);
  } catch (err) {
    console.error(`Weather fetch failed for ${beach.id}:`, err.message);
    return null;
  }
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

async function fetchAllWeather() {
  const results = await Promise.all(
    BEACHES.map(async beach => {
      const weather = await fetchWeatherForBeach(beach);
      return {
        id: beach.id,
        weather,
        weatherScore: scoreWeather(weather)
      };
    })
  );

  const map = {};
  results.forEach(r => { map[r.id] = r; });
  return map;
}

module.exports = { fetchAllWeather, scoreWeather };