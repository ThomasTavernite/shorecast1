// User-submitted crowd reports
// v1: in-memory storage (resets on serverless cold start, fine for prototype validation)
// v2: move to Vercel KV or Postgres once we have real volume

// Structure: { beachId: [{level, ts, ip}, ...] }
const reports = {};

const REPORT_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours — old reports stop counting
const RATE_LIMIT_MS = 5 * 60 * 1000;       // 5 min between reports per IP per beach

function pruneOldReports(beachId) {
  if (!reports[beachId]) return;
  const cutoff = Date.now() - REPORT_TTL_MS;
  reports[beachId] = reports[beachId].filter(r => r.ts >= cutoff);
}

function canReport(beachId, ip) {
  if (!reports[beachId]) return true;
  const recent = reports[beachId].find(r => r.ip === ip);
  if (!recent) return true;
  return Date.now() - recent.ts >= RATE_LIMIT_MS;
}

function addReport(beachId, level, ip) {
  // Validate
  if (typeof level !== 'number' || level < 0 || level > 100) {
    throw new Error('Level must be 0-100');
  }
  if (!canReport(beachId, ip)) {
    throw new Error('Please wait before reporting again');
  }

  if (!reports[beachId]) reports[beachId] = [];
  reports[beachId].push({ level, ts: Date.now(), ip });
  pruneOldReports(beachId);
  return reports[beachId].length;
}

// Get the average crowd level from recent reports for a beach.
// Returns null if there aren't enough reports to be meaningful.
function getReportedCrowd(beachId, minReports = 3) {
  pruneOldReports(beachId);
  const list = reports[beachId] || [];
  if (list.length < minReports) return null;

  // Weight more recent reports heavier
  const now = Date.now();
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of list) {
    const ageHours = (now - r.ts) / (60 * 60 * 1000);
    const weight = Math.max(0.1, 1 - ageHours / 3); // 1.0 at 0h, 0.1 at 3h
    weightedSum += r.level * weight;
    totalWeight += weight;
  }

  return {
    avgLevel: Math.round(weightedSum / totalWeight),
    reportCount: list.length,
    latestTs: Math.max(...list.map(r => r.ts))
  };
}

// Get all reports stats (for an internal dashboard later)
function getAllStats() {
  const stats = {};
  for (const beachId of Object.keys(reports)) {
    pruneOldReports(beachId);
    if (reports[beachId].length === 0) continue;
    stats[beachId] = {
      count: reports[beachId].length,
      avgLevel: Math.round(reports[beachId].reduce((s, r) => s + r.level, 0) / reports[beachId].length)
    };
  }
  return stats;
}

module.exports = { addReport, getReportedCrowd, getAllStats };