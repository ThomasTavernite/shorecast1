const express = require('express');
const path = require('path');
const BEACHES = require('./beaches');
const { fetchAllWeather } = require('./weather');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cache for computed beach data
let beachCache = [];
let lastUpdated = null;

// Compute ShoreScore for each beach using real weather + mock for other factors
async function computeShoreScores() {
  const weatherMap = await fetchAllWeather();

  return BEACHES.map(beach => {
    const wData = weatherMap[beach.id];
    const weather = wData?.weatherScore ?? 50;
    const weatherDetails = wData?.weather ?? null;

    // Mock for now, real scrapers come next
    const water = 70 + Math.floor(Math.random() * 30);
    const surf = 50 + Math.floor(Math.random() * 50);
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
      weatherDetails
    };
  }).sort((a, b) => b.shoreScore - a.shoreScore);
}

// Refresh cache
async function refreshCache() {
  try {
    beachCache = await computeShoreScores();
    lastUpdated = new Date().toISOString();
    console.log(`[${lastUpdated}] Cache refreshed, ${beachCache.length} beaches`);
  } catch (err) {
    console.error('Cache refresh failed:', err.message);
  }
}

// Initial load
refreshCache();

// Refresh every 15 minutes
setInterval(refreshCache, 15 * 60 * 1000);

// API: all beaches ranked
app.get('/api/beaches', (req, res) => {
  res.json({
    lastUpdated,
    count: beachCache.length,
    beaches: beachCache
  });
});

// API: single beach by id
app.get('/api/beaches/:id', (req, res) => {
  const beach = beachCache.find(b => b.id === req.params.id);
  if (!beach) return res.status(404).json({ error: 'Beach not found' });
  res.json(beach);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', lastUpdated });
});

app.listen(PORT, () => {
  console.log(`ShoreCast running on http://localhost:${PORT}`);
});

module.exports = app;