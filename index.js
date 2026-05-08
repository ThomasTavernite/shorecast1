const express = require('express');
const path = require('path');
const BEACHES = require('./beaches');
const { fetchAllWeather } = require('./weather');
const { fetchAllMarine } = require('./marine');
const { fetchAllWater } = require('./water');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let beachCache = [];
let lastUpdated = null;
let inFlight = null;

const CACHE_TTL_MS = 10 * 60 * 1000;

function isStale() {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > CACHE_TTL_MS;
}

async function computeShoreScores() {
  // Fetch weather, marine, water in parallel
  const [weatherMap, marineMap, waterMap] = await Promise.all([
    fetchAllWeather(),
    fetchAllMarine(),
    fetchAllWater()
  ]);

  return BEACHES.map(beach => {
    const wData = weatherMap[beach.id];
    const mData = marineMap[beach.id];
    const waData = waterMap[beach.id];

    const weather = wData?.weatherScore ?? 50;
    const weatherDetails = wData?.weather ?? null;

    const surf = mData?.surfScore ?? 50;
    const marineDetails = mData?.marine ?? null;

    const water = waData?.waterScore ?? 70;
    const waterDetails = waData ? { rainfall: waData.rainfall, label: waData.waterLabel } : null;

    // Mock for now — crowd + parking still placeholders
    const crowd = 40 + Math.floor(Math.random() * 60);
    const parking = 30 + Math.floor(Math.random() * 70);

    const shoreScore = Math.round(
      water * 0.30 +
      weather * 0.25 +
      surf * 0.15 +
      crowd * 0.15 +
      parking * 0.15
    );

    return {
      ...beach,
      shoreScore,
      factors: { water, surf, weather, crowd, parking },
      weatherDetails,
      marineDetails,
      waterDetails
    };
  }).sort((a, b) => b.shoreScore - a.shoreScore);
}

async function refreshCache() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      beachCache = await computeShoreScores();
      lastUpdated = new Date().toISOString();
      console.log(`[${lastUpdated}] Cache refreshed, ${beachCache.length} beaches`);
    } catch (err) {
      console.error('Cache refresh failed:', err.message);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function ensureCache() {
  if (beachCache.length === 0 || isStale()) {
    await refreshCache();
  }
}

app.get('/api/beaches', async (req, res) => {
  await ensureCache();
  res.json({
    lastUpdated,
    count: beachCache.length,
    beaches: beachCache
  });
});

app.get('/api/beaches/:id', async (req, res) => {
  await ensureCache();
  const beach = beachCache.find(b => b.id === req.params.id);
  if (!beach) return res.status(404).json({ error: 'Beach not found' });
  res.json(beach);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', lastUpdated, cached: beachCache.length });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ShoreCast running on http://localhost:${PORT}`);
  });
}

module.exports = app;