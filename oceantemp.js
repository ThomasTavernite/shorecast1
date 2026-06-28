// Ocean water temperature via NOAA CO-OPS
// Free, no API key. Uses the same 3 NJ stations as tides.js (nearest-station mapping).
// Display-only — NOT factored into ShoreScore so it can't skew rankings.
// Only a few NJ CO-OPS stations report water_temperature, so every beach maps to
// its nearest reporting station. Water temp barely varies between adjacent towns.

const BEACHES = require('./beaches');

// Same stations as tides.js — all three report water_temperature.
const TEMP_STATIONS = [
  { id: '8531680', name: 'Sandy Hook',    lat: 40.4669, lon: -74.0094 },
  { id: '8534720', name: 'Atlantic City', lat: 39.3550, lon: -74.4183 },
  { id: '8536110', name: 'Cape May',      lat: 38.9683, lon: -74.9600 }
];

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Map each beach to its nearest water-temp station (built once at load).
const BEACH_TO_TEMP_STATION = {};
BEACHES.forEach(beach => {
  let nearest = TEMP_STATIONS[0];
  let minDist = haversineMiles(beach.lat, beach.lon, nearest.lat, nearest.lon);
  for (const station of TEMP_STATIONS) {
    const d = haversineMiles(beach.lat, beach.lon, station.lat, station.lon);
    if (d < minDist) { nearest = station; minDist = d; }
  }
  BEACH_TO_TEMP_STATION[beach.id] = nearest;
});

// Fetch the latest water temperature reading for a station.
// CO-OPS "latest" gives the most recent observation; returns °F.
async function fetchTempForStation(stationId) {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=water_temperature&application=Shorely` +
    `&date=latest&station=${stationId}&time_zone=lst_ldt` +
    `&units=english&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Water temp station ${stationId} returned HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data.data || !data.data.length) return null;

    const latest = data.data[data.data.length - 1];
    const tempF = parseFloat(latest.v);
    if (Number.isNaN(tempF)) return null;

    return {
      tempF: Math.round(tempF),
      observedAt: latest.t || null
    };
  } catch (err) {
    console.error(`Water temp fetch failed for station ${stationId}:`, err.message);
    return null;
  }
}

// Plain-English label for the water temp.
function tempLabel(tempF) {
  if (tempF == null) return null;
  if (tempF < 55) return { label: 'Frigid', detail: 'Wetsuit weather' };
  if (tempF < 62) return { label: 'Cold', detail: 'Brisk — quick dips only' };
  if (tempF < 68) return { label: 'Cool', detail: 'Refreshing once you\u2019re in' };
  if (tempF < 74) return { label: 'Comfortable', detail: 'Great for swimming' };
  if (tempF < 80) return { label: 'Warm', detail: 'Bath-like, easy swimming' };
  return { label: 'Very warm', detail: 'Like a warm bath' };
}

// Fetch water temp for all beaches, caching per-station so we hit NOAA 3x, not 35x.
async function fetchAllOceanTemps() {
  const stationCache = {};
  const map = {};

  for (const beach of BEACHES) {
    const station = BEACH_TO_TEMP_STATION[beach.id];
    if (!(station.id in stationCache)) {
      stationCache[station.id] = await fetchTempForStation(station.id);
    }
    const reading = stationCache[station.id];
    map[beach.id] = reading
      ? {
          tempF: reading.tempF,
          label: tempLabel(reading.tempF),
          stationName: station.name,
          stationId: station.id,
          observedAt: reading.observedAt
        }
      : null;
  }
  return map;
}

module.exports = { fetchAllOceanTemps, BEACH_TO_TEMP_STATION };