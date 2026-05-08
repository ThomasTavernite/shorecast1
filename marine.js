// Open-Meteo Marine API — wave height, period, direction
// Free, no API key. Docs: https://open-meteo.com/en/docs/marine-weather-api

const BEACHES = require('./beaches');

async function fetchMarineForBeach(beach) {
  const url = `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&current=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_period` +
    `&length_unit=imperial` +
    `&timezone=America/New_York`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const c = data.current;

    return {
      waveHeightFt: c.wave_height != null ? +c.wave_height.toFixed(1) : null,
      wavePeriodSec: c.wave_period != null ? +c.wave_period.toFixed(1) : null,
      waveDirectionDeg: c.wave_direction,
      windWaveHeightFt: c.wind_wave_height != null ? +c.wind_wave_height.toFixed(1) : null,
      swellHeightFt: c.swell_wave_height != null ? +c.swell_wave_height.toFixed(1) : null,
      swellPeriodSec: c.swell_wave_period != null ? +c.swell_wave_period.toFixed(1) : null
    };
  } catch (err) {
    console.error(`Marine fetch failed for ${beach.id}:`, err.message);
    return null;
  }
}

// Score surf 0-100. "Good surf" depends on the user.
// Heuristic: 2-5 ft waves with 8+ sec period = ideal swimming + light surfing
// Bigger waves = dangerous for swimming, better for surfers
// Flat (<1 ft) = boring but safe
function scoreSurf(m) {
  if (!m || m.waveHeightFt == null) return 50;

  const h = m.waveHeightFt;
  const p = m.wavePeriodSec || 6;

  let score = 70;

  // Wave height — sweet spot 2-4 ft for general beachgoing
  if (h < 0.5) score -= 20;            // dead flat, no fun
  else if (h < 1) score -= 5;          // tiny
  else if (h <= 2) score += 10;        // playful
  else if (h <= 4) score += 15;        // ideal
  else if (h <= 6) score -= 5;         // big, surfer-friendly but rough
  else if (h <= 8) score -= 25;        // dangerous for swimming
  else score -= 50;                    // hazardous

  // Period — longer = more organized, cleaner
  if (p >= 10) score += 10;
  else if (p >= 8) score += 5;
  else if (p < 5) score -= 10;         // choppy

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Compass bearing -> cardinal direction
function bearingToCompass(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function fetchAllMarine() {
  const results = await Promise.all(
    BEACHES.map(async beach => {
      const marine = await fetchMarineForBeach(beach);
      return {
        id: beach.id,
        marine: marine ? { ...marine, waveDirection: bearingToCompass(marine.waveDirectionDeg) } : null,
        surfScore: scoreSurf(marine)
      };
    })
  );

  const map = {};
  results.forEach(r => { map[r.id] = r; });
  return map;
}

module.exports = { fetchAllMarine, scoreSurf };