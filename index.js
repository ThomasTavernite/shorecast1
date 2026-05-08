const express = require('express');
const path = require('path');
const BEACHES = require('./beaches');
const { fetchAllWeather } = require('./weather');
const { fetchAllMarine } = require('./marine');
const { fetchAllWater } = require('./water');
const { estimateAllCrowds } = require('./crowd');
const { fetchAllGoogleCrowds } = require('./google_crowd');
const { addReport, getReportedCrowd, getAllStats } = require('./reports');
const { getWebcam } = require('./webcams');
const { estimateAllParking } = require('./parking');
const { fetchAllTides } = require('./tides');

const app = express();
const PORT = process.env.PORT || 3000;

const USE_GOOGLE_CROWDS = false; // disabled locally for fast cold start, re-enable on Vercel
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

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
  const [weatherMap, marineMap, waterMap, googleMap, tideMap] = await Promise.all([
    fetchAllWeather(),
    fetchAllMarine(),
    fetchAllWater(),
    USE_GOOGLE_CROWDS ? fetchAllGoogleCrowds().catch(() => ({})) : Promise.resolve({}),
    fetchAllTides().catch(() => ({}))
  ]);

  const heuristicMap = estimateAllCrowds(weatherMap);

  const resolvedCrowds = {};
  BEACHES.forEach(beach => {
    let level = heuristicMap[beach.id]?.crowdLevel ?? 50;
    let source = 'estimate';
    const googleCrowd = googleMap[beach.id];
    if (googleCrowd) {
      level = Math.round(googleCrowd.level * 0.6 + level * 0.4);
      source = 'google live';
    }
    const reported = getReportedCrowd(beach.id);
    if (reported) {
      level = Math.round(reported.avgLevel * 0.7 + level * 0.3);
      source = `${reported.reportCount} reports`;
    }
    resolvedCrowds[beach.id] = { level, source };
  });

  const parkingMap = estimateAllParking(resolvedCrowds);

  return BEACHES.map(beach => {
    const wData = weatherMap[beach.id];
    const mData = marineMap[beach.id];
    const waData = waterMap[beach.id];
    const cResolved = resolvedCrowds[beach.id];
    const pData = parkingMap[beach.id];
    const tData = tideMap[beach.id];

    const weather = wData?.weatherScore ?? 50;
    const weatherDetails = wData?.weather ?? null;

    const surf = mData?.surfScore ?? 50;
    const marineDetails = mData?.marine ?? null;

    const water = waData?.waterScore ?? 70;
    const waterDetails = waData ? { rainfall: waData.rainfall, label: waData.waterLabel } : null;

    const crowd = 100 - cResolved.level;
    const crowdDetails = { level: cResolved.level, label: labelFromLevel(cResolved.level), source: cResolved.source };

    const parking = pData?.parkingScore ?? 50;
    const parkingDetails = pData ? { score: parking, label: pData.parkingLabel } : null;

    const tideDetails = tData || null;

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
      crowdDetails,
      parkingDetails,
      tideDetails,
      webcamUrl: getWebcam(beach.id)
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
  res.json({ lastUpdated, count: beachCache.length, beaches: beachCache });
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
    lastUpdated = null;
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