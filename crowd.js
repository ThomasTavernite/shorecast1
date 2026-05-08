// Crowd estimator
// v1: Heuristic based on day, time, weather, popularity, and holidays.
// Combined later with user reports + scraped Google Popular Times when available.

const BEACHES = require('./beaches');

// Popularity tier per beach. Roughly: how crowded is this place at peak?
// 5 = packed boardwalk destination, 1 = locals-only quiet
const POPULARITY = {
  'sandy-hook': 4,
  'sea-bright': 3,
  'monmouth-beach': 2,
  'long-branch': 5,        // Pier Village, packed
  'deal': 2,
  'asbury-park': 5,        // Asbury packs out
  'ocean-grove': 3,
  'bradley-beach': 3,
  'avon': 3,
  'belmar': 5,             // Belmar is a scene
  'spring-lake': 3,
  'manasquan': 4,          // surf crowd + beach crowd
  'point-pleasant': 5,     // Jenkinson's = peak NJ
  'bay-head': 2,
  'mantoloking': 1,        // residents only basically
  'lavallette': 3,
  'seaside-heights': 5,    // boardwalk magnet
  'seaside-park': 3,
  'island-beach': 3,       // limited capacity, fills up
  'barnegat-light': 2,
  'harvey-cedars': 2,
  'surf-city': 3,
  'ship-bottom': 3,
  'beach-haven': 4,
  'atlantic-city': 4,      // casinos draw crowds
  'ventnor': 3,
  'ocean-city': 5,         // family destination, packed
  'sea-isle-city': 4,
  'avalon': 3,
  'cape-may': 4
};

// US federal holidays + NJ summer events that pack the shore
function isHoliday(date) {
  const m = date.getMonth(); // 0-indexed
  const d = date.getDate();
  const dow = date.getDay();

  // Memorial Day: last Monday of May
  if (m === 4 && dow === 1 && d >= 25) return true;
  // July 4th week
  if (m === 6 && d >= 1 && d <= 7) return true;
  // Labor Day: first Monday of September
  if (m === 8 && dow === 1 && d <= 7) return true;
  return false;
}

// Score crowd 0-100 where HIGHER = LESS crowded (more pleasant)
// This stays consistent with other factors where higher is better.
function scoreCrowd(beach, weatherScore, now = new Date()) {
  const popularity = POPULARITY[beach.id] ?? 3;
  const dow = now.getDay();              // 0=Sun, 6=Sat
  const hour = now.getHours();           // 0-23
  const month = now.getMonth();          // 0-indexed
  const holiday = isHoliday(now);

  // Start optimistic — empty beach
  let crowdLevel = 0; // 0=empty, 100=packed

  // Base from popularity (1-5 -> 10-50 base level)
  crowdLevel += popularity * 10;

  // Day of week multiplier
  if (dow === 6) crowdLevel += 25;            // Saturday
  else if (dow === 0) crowdLevel += 18;       // Sunday
  else if (dow === 5) crowdLevel += 10;       // Friday
  else crowdLevel += 0;                        // Mon-Thu

  // Time of day — peak is 11am-3pm
  if (hour >= 11 && hour <= 15) crowdLevel += 20;
  else if (hour >= 9 && hour <= 17) crowdLevel += 10;
  else if (hour < 8 || hour >= 19) crowdLevel -= 30; // dawn/dusk
  else crowdLevel -= 10;

  // Weather drives everything — bad weather empties beaches fast
  if (weatherScore >= 85) crowdLevel += 15;
  else if (weatherScore >= 70) crowdLevel += 5;
  else if (weatherScore >= 50) crowdLevel -= 10;
  else crowdLevel -= 30;

  // Season — summer is peak
  if (month === 6 || month === 7) crowdLevel += 15;     // Jul/Aug
  else if (month === 5 || month === 8) crowdLevel += 5; // Jun/Sep
  else crowdLevel -= 25;                                 // off-season, dead

  // Holiday surge
  if (holiday) crowdLevel += 25;

  // Clamp 0-100
  crowdLevel = Math.max(0, Math.min(100, crowdLevel));

  // Invert to "pleasantness" score for the UI
  const score = 100 - crowdLevel;

  return { score, crowdLevel };
}

function crowdLabel(crowdLevel) {
  if (crowdLevel < 20) return { icon: '🟢', label: 'Empty', detail: 'Beach to yourself' };
  if (crowdLevel < 40) return { icon: '🟢', label: 'Light', detail: 'Easy to find space' };
  if (crowdLevel < 60) return { icon: '🟡', label: 'Moderate', detail: 'Normal crowd' };
  if (crowdLevel < 80) return { icon: '🟠', label: 'Busy', detail: 'Bring a small blanket' };
  return { icon: '🔴', label: 'Packed', detail: 'Arrive early or skip' };
}

function estimateAllCrowds(weatherMap) {
  const map = {};
  const now = new Date();
  BEACHES.forEach(beach => {
    const wScore = weatherMap?.[beach.id]?.weatherScore ?? 70;
    const { score, crowdLevel } = scoreCrowd(beach, wScore, now);
    map[beach.id] = {
      crowdScore: score,
      crowdLevel,
      crowdLabel: crowdLabel(crowdLevel),
      source: 'estimate' // will be 'reports' or 'google' once those land
    };
  });
  return map;
}

module.exports = { estimateAllCrowds, scoreCrowd, POPULARITY };