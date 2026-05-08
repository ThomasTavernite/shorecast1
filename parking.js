// Parking estimator
// No public real-time parking data exists for NJ shore towns.
// We use a smart heuristic: capacity tier + crowd level + day/time + holiday.
// Will add real garage data later if any town publishes it (Long Branch, AC casinos, etc).

const BEACHES = require('./beaches');

// Per-beach parking ease tier:
// 5 = abundant paid garages, hard to NOT find spot (AC casinos, Pier Village garage)
// 4 = big public lots (Sandy Hook NPS, Island Beach State Park, Jenkinson's)
// 3 = decent metered street + small lots (Belmar, Bradley, most middle-tier)
// 2 = limited metered street, fills up (Spring Lake, Avon, Manasquan)
// 1 = residential / permit-only / tiny lot (Mantoloking, Bay Head, Deal, Harvey Cedars)
const PARKING_CAPACITY = {
  'sandy-hook': 4,
  'sea-bright': 3,
  'monmouth-beach': 2,
  'long-branch': 5,        // Pier Village garage + lots
  'deal': 1,               // residential streets only
  'asbury-park': 4,        // garage + metered + ParkMobile coverage
  'ocean-grove': 3,
  'bradley-beach': 3,
  'avon': 2,
  'belmar': 4,             // big lot + ample metered
  'spring-lake': 2,        // residential, walk in
  'manasquan': 2,
  'point-pleasant': 4,     // Jenkinson's giant lot
  'bay-head': 1,           // residents only
  'mantoloking': 1,        // residents priority
  'lavallette': 3,
  'seaside-heights': 4,    // boardwalk lots
  'seaside-park': 3,
  'island-beach': 4,       // state park lot, but caps when full
  'barnegat-light': 3,     // lighthouse lot
  'harvey-cedars': 1,      // residential
  'surf-city': 3,
  'ship-bottom': 3,
  'beach-haven': 3,
  'atlantic-city': 5,      // casino garages, never full
  'ventnor': 3,
  'ocean-city': 3,         // popular but lots of metered
  'sea-isle-city': 3,
  'avalon': 3,
  'cape-may': 2            // metered, fills fast in season
};

// Score parking ease 0-100. HIGHER = easier to park.
// Two factors: capacity tier (static) and current demand (crowd-driven).
function scoreParking(beach, crowdLevel, now = new Date()) {
  const capacity = PARKING_CAPACITY[beach.id] ?? 3;
  const dow = now.getDay();
  const hour = now.getHours();
  const month = now.getMonth();

  // Start from capacity (1-5 -> 30-90 base ease)
  let ease = 20 + capacity * 14;

  // Subtract demand pressure based on crowd level
  // Light crowd (level 30) hardly affects parking, packed (level 90) crushes it
  // But high-capacity lots stay easier even when packed
  const demandPenalty = (crowdLevel / 100) * (40 - capacity * 5);
  ease -= demandPenalty;

  // Weekend mornings (10am-1pm Sat/Sun): worst time, lots fill in waves
  if ((dow === 0 || dow === 6) && hour >= 10 && hour <= 13) ease -= 8;

  // Off-hours bonus — early morning, evening
  if (hour < 8 || hour >= 19) ease += 15;

  // Off-season — tons of free parking everywhere
  if (month < 4 || month > 8) ease += 20;

  return Math.max(0, Math.min(100, Math.round(ease)));
}

function parkingLabel(score) {
  if (score >= 80) return { icon: '🅿️', label: 'Easy', detail: 'Plenty of spots' };
  if (score >= 60) return { icon: '🅿️', label: 'Manageable', detail: 'Some spots, may circle a bit' };
  if (score >= 40) return { icon: '⚠️', label: 'Tight', detail: 'Arrive early or be patient' };
  if (score >= 20) return { icon: '⚠️', label: 'Tough', detail: 'Likely full by midday' };
  return { icon: '🚫', label: 'Forget it', detail: 'Try a neighboring beach' };
}

function estimateAllParking(crowdMap) {
  const map = {};
  const now = new Date();
  BEACHES.forEach(beach => {
    const crowdLevel = crowdMap?.[beach.id]?.level ?? 50;
    const score = scoreParking(beach, crowdLevel, now);
    map[beach.id] = {
      parkingScore: score,
      parkingLabel: parkingLabel(score)
    };
  });
  return map;
}

module.exports = { estimateAllParking, scoreParking, PARKING_CAPACITY };