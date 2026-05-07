// Open-Meteo weather scraper
// Free, no API key. Docs: https://open-meteo.com/en/docs

const BEACHES = require('./beaches');

// Fetches current weather + today's forecast for a single beach
async function fetchWeatherForBeach(beach) {
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,cloud_cover` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=America/New_York` +
    `&models=gfs_hrrr`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const c = data.current;

    return {
      tempF: Math.round(c.temperature_2m),
      feelsLikeF: Math.round(c.apparent_temperature),
      precipIn: c.precipitation,
      windMph: Math.round(c.wind_speed_10m),
      gustsMph: Math.round(c.wind_gusts_10m),
      uvIndex: c.uv_index,
      cloudPct: c.cloud_cover,
      weatherCode: c.weather_code
    };
  } catch (err) {
    console.error(`Weather fetch failed for ${beach.id}:`, err.message);
    return null;
  }
}

// Score weather 0-100. Higher = better beach weather.
// Penalize: cold, hot, rain, high winds, full clouds
// Reward: 75-85F, sunny, light winds
function scoreWeather(w) {
  if (!w) return 50; // neutral fallback if API failed

  let score = 100;

  // Temperature: ideal 75-85F
  if (w.feelsLikeF < 65) score -= (65 - w.feelsLikeF) * 2;
  else if (w.feelsLikeF > 90) score -= (w.feelsLikeF - 90) * 2;
  else if (w.feelsLikeF >= 75 && w.feelsLikeF <= 85) score += 0; // ideal
  else score -= 5; // 65-74 or 86-90, slight ding

  // Precipitation: any rain hurts a lot
  if (w.precipIn > 0.05) score -= 30;
  else if (w.precipIn > 0) score -= 10;

  // Wind: under 10 mph fine, 10-20 ding, 20+ rough
  if (w.windMph > 20) score -= 20;
  else if (w.windMph > 10) score -= 8;

  // Cloud cover: full overcast is a beach buzzkill
  if (w.cloudPct > 80) score -= 10;
  else if (w.cloudPct > 50) score -= 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Fetch all beaches in parallel
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