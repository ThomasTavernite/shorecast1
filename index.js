const express = require('express');
const path = require('path');
const BEACHES = require('./beaches');
const { fetchAllWeather } = require('./weather');
const { fetchAllMarine } = require('./marine');
const { fetchAllWater } = require('./water');
const { estimateAllCrowds } = require('./crowd');
const { fetchAllGoogleCrowds } = require('./google_crowd');
const { addReport, getReportedCrowd, getAllStats } = require('./reports');

const app = express();
const PORT = process.env.PORT || 3000;

// Feature flag — set to false to disable Google scraping if it breaks
const USE_GOOGLE_CROWDS = process.env.USE_GOOGLE_CROWDS !== 'false';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
}

let beachCache = [];
let lastUpdated = null;
let inFlight = null;

const CACHE_TTL_MS = 10 * 60 * 1000;

function isStale() {
  if (!lastUpdated) return true;
  return Date.now() - new Date(lastUpdated).getTime() > CACHE_TTL_MS;
}

function labelFromLevel(level) {
  if (level < 20) return { icon: '🟢', label: 'Empty', detail: 'Beach to yourself' };
  if (level < 40) return { icon: '🟢', label: 'Light', detail: 'Easy to find space' };
  if (level < 60) return { icon: '🟡', label: 'Moderate', detail: 'Normal crowd' };
  if (level < 80) return { icon: '🟠', label: 'Busy', detail: 'Bring a small blanket' };
  return { icon: '🔴', label: 'Packed', detail: 'Arrive early or skip' };
}

async function computeShoreScores() {
  // Run weather + marine + water + Google in parallel.
  // Google takes longer (sequential 30 fetches), but won't slow weather.
  const [weatherMap, marineMap, waterMap, googleMap] = await Promise.all([
    fetchAllWeather(),
    fetchAllMarine(),
    fetchAllWater(),
    USE_GOOGLE_CROWDS ? fetchAllGoogleCrowds().catch(() => ({})) : Promise.resolve({})
  ]);

  const heuristicMap = estimateAllCrowds(weatherMap);

  return BEACHES.map(beach => {
    const wData = weatherMap[beach.id];
    const mData = marineMap[beach.id];
    const waData = waterMap[beach.id];
    const heuristic = heuristicMap[beach.id];
    const googleCrowd = googleMap[beach.id]; // {level, source} or undefined

    const weather = wData?.weatherScore ?? 50;
    const weatherDetails = wData?.weather ?? null;

    const surf = mData?.surfScore ?? 50;
    const marineDetails = mData?.marine ?? null;

    const water = waData?.waterScore ?? 70;
    const waterDetails = waData ? { rainfall: waData.rainfall, label: waData.waterLabel } : null;

    // ===== Crowd resolution: reports > google > heuristic =====
    let crowdLevel = heuristic?.crowdLevel ?? 50;
    let crowdSource = 'estimate';

    // Google overrides heuristic (if available)
    if (googleCrowd) {
      // Blend 60% Google + 40% heuristic for stability
      crowdLevel = Math.round(googleCrowd.level * 0.6 + crowdLevel * 0.4);
      crowdSource = 'google live';
    }

    // User reports override everything (when ≥3 fresh)
    const reported = getReportedCrowd(beach.id);
    if (reported) {
      // Blend 70% reports + 30% prior estimate
      crowdLevel = Math.round(reported.avgLevel * 0.7 + crowdLevel * 0.3);
      crowdSource = `${reported.reportCount} reports`;
    }

    const crowd = 100 - crowdLevel;
    const crowdDetails = { level: crowdLevel, label: labelFromLevel(crowdLevel), source: crowdSource };

    // Parking still placeholder
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
      waterDetails,
      crowdDetails
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

app.post('/api/beaches/:id/report', (req, res) => {
  const beachId = req.params.id;
  const { level } = req.body || {};

  if (!BEACHES.find(b => b.id === beachId)) {
    return res.status(404).json({ error: 'Beach not found' });
  }

  try {
    const ip = getIp(req);
    const count = addReport(beachId, level, ip);
    lastUpdated = null; // force refresh next request
    res.json({ ok: true, beachId, totalReports: count });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({ reports: getAllStats(), cacheAge: lastUpdated, googleEnabled: USE_GOOGLE_CROWDS });
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