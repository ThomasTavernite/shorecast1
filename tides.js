// NOAA Tides & Currents API
// Free, no API key. Each beach maps to its nearest active NOAA tide station.
// Verified working stations only (May 2026).

const BEACHES = require('./beaches');

const NJ_STATIONS = [
  { id: '8531680', name: 'Sandy Hook',         lat: 40.4669, lon: -74.0094 },
  { id: '8534720', name: 'Atlantic City',      lat: 39.3550, lon: -74.4183 },
  { id: '8536110', name: 'Cape May',           lat: 38.9683, lon: -74.9600 }
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

const BEACH_TO_STATION = {};
BEACHES.forEach(beach => {
  let nearest = NJ_STATIONS[0];
  let minDist = haversineMiles(beach.lat, beach.lon, nearest.lat, nearest.lon);
  for (const station of NJ_STATIONS) {
    const d = haversineMiles(beach.lat, beach.lon, station.lat, station.lon);
    if (d < minDist) { nearest = station; minDist = d; }
  }
  BEACH_TO_STATION[beach.id] = nearest;
});

function todayStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function fetchTidesForStation(stationId) {
  const date = todayStr();
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=predictions&application=ShoreCast` +
    `&begin_date=${date}&end_date=${date}` +
    `&datum=MLLW&station=${stationId}&time_zone=lst_ldt` +
    `&units=english&interval=hilo&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Tide station ${stationId} returned HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data.predictions) return null;

    return data.predictions.map(p => ({
      time: p.t,
      heightFt: parseFloat(p.v),
      type: p.type === 'H' ? 'high' : 'low'
    }));
  } catch (err) {
    console.error(`Tide fetch failed for station ${stationId}:`, err.message);
    return null;
  }
}

function nextTide(predictions) {
  if (!predictions) return null;
  const now = new Date();
  for (const p of predictions) {
    const t = new Date(p.time.replace(' ', 'T'));
    if (t > now) return { ...p, when: t.toISOString() };
  }
  return null;
}

async function fetchAllTides() {
  const stationCache = {};
  const map = {};

  for (const beach of BEACHES) {
    const station = BEACH_TO_STATION[beach.id];
    if (!stationCache[station.id]) {
      stationCache[station.id] = await fetchTidesForStation(station.id);
    }
    const predictions = stationCache[station.id];
    map[beach.id] = {
      stationName: station.name,
      stationId: station.id,
      todayPredictions: predictions,
      next: nextTide(predictions)
    };
  }
  return map;
}

module.exports = { fetchAllTides, BEACH_TO_STATION };