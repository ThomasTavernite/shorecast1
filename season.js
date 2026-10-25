// season.js
// Seasonal router for the year-round pivot.
// - getSeason(): which season are we in (by date)
// - SEASON_CONFIG: per-season theme tokens + mode metadata the frontend consumes
// - buildSeasonalHero(): derives the homepage hero from the SAME beach objects
//   computeShoreScores() already produces. No new fetches, no new data sources.

function getSeason(date = new Date()) {
  const m = date.getMonth();               // 0 = Jan ... 11 = Dec
  if (m === 11 || m <= 1) return 'winter';  // Dec, Jan, Feb
  if (m <= 4)             return 'spring';  // Mar, Apr, May
  if (m <= 7)             return 'summer';  // Jun, Jul, Aug
  return 'fall';                            // Sep, Oct, Nov
}

// Theme tokens here are the single source of truth for the frontend's per-season
// look. The homepage reads seasonConfig.theme and sets CSS custom properties.
const SEASON_CONFIG = {
  summer: {
    key: 'summer', label: 'Summer', mode: 'Beach Mode',
    theme: { top: '#FFB347', mid: '#FF8C5A', bot: '#0077B6', accent: '#10B981', hero: '#0077B6', sun: '#FFF3D0' },
    cards: ['rankings', 'watertemp', 'crowds', 'forecast'],
    chips: ['Beach days', 'Boardwalks', 'Swimming', 'Sunbathing']
  },
  fall: {
    key: 'fall', label: 'Fall', mode: 'Shoulder Mode',
    theme: { top: '#F2A24E', mid: '#C85F38', bot: '#254B6B', accent: '#C0603A', hero: '#B24E2E', sun: '#FFE2BC' },
    cards: ['weekend', 'surf', 'watertemp', 'events'],
    chips: ['Cold-water surf', 'Cape May fall', 'Storm watch', 'Off-season weekends']
  },
  winter: {
    key: 'winter', label: 'Winter', mode: 'Surf & Storm Mode',
    theme: { top: '#7C97B3', mid: '#3E5C7E', bot: '#16283F', accent: '#4FA3C7', hero: '#3E86AE', sun: '#DCE8F1' },
    cards: ['surf', 'wetsuit', 'storm', 'events'],
    chips: ['Winter surf', "Nor'easters", 'Polar plunges', 'Holiday boardwalks']
  },
  spring: {
    key: 'spring', label: 'Spring', mode: 'Reawakening Mode',
    theme: { top: '#5FC9A8', mid: '#2E9FB6', bot: '#0F6FA6', accent: '#2BB37A', hero: '#1E8F8A', sun: '#DBF5EA' },
    cards: ['warming', 'surf', 'whale', 'events'],
    chips: ['Whale watching', 'Water warming', 'Spring hikes', 'Pre-season']
  }
};

// Wetsuit recommendation from water temp (°F). Winter hero + card use this.
function wetsuitFor(tempF) {
  if (tempF == null) return null;
  if (tempF >= 72) return 'boardshorts';
  if (tempF >= 65) return 'springsuit / 2mm';
  if (tempF >= 58) return '3/2 wetsuit';
  if (tempF >= 52) return '4/3 + booties';
  if (tempF >= 45) return '5/4 + boots + gloves';
  return '6/5 + boots, gloves & hood';
}

function join(parts) {
  return parts.filter(Boolean).join(' · ');
}

// Given the already-sorted beaches array (from computeShoreScores) + season,
// derive the homepage hero. Reuses existing fields only.
function buildSeasonalHero(beaches, season) {
  if (!Array.isArray(beaches) || beaches.length === 0) return null;

  if (season === 'winter') {
    // Best surf right now, ranked by the existing surf factor.
    const ranked = [...beaches]
      .filter(b => b.marineDetails)
      .sort((a, b) => (b.factors?.surf ?? 0) - (a.factors?.surf ?? 0));
    const top = ranked[0] || beaches[0];
    const m = top.marineDetails || {};
    const tempF = top.oceanTempDetails?.tempF ?? null;
    return {
      label: "Today's Best Surf",
      value: m.waveHeightFt != null ? `${m.waveHeightFt} ft` : '—',
      badge: '\uD83C\uDF0A',
      sub: join([
        m.waveDirection ? `${m.waveDirection} swell` : null,
        m.wavePeriodSec != null ? `${m.wavePeriodSec}s period` : null,
        tempF != null ? `${tempF}\u00B0 water` : null,
        tempF != null ? wetsuitFor(tempF) : null
      ]),
      beach: top.name, beachId: top.id
    };
  }

  if (season === 'spring') {
    // Warmest water + whether it's swimmable yet. Uses ocean temp.
    const withTemp = beaches.filter(b => b.oceanTempDetails?.tempF != null);
    const warmest = withTemp.sort((a, b) => b.oceanTempDetails.tempF - a.oceanTempDetails.tempF)[0];
    const tempF = warmest?.oceanTempDetails?.tempF ?? null;
    return {
      label: 'Water Watch',
      value: tempF != null ? `${tempF}\u00B0` : '—',
      badge: '\uD83C\uDF21\uFE0F',
      sub: join([
        warmest ? `warmest at ${warmest.name}` : null,
        tempF != null ? (tempF >= 68 ? 'swimmable now' : 'warming toward swimmable') : null
      ]),
      beach: warmest?.name, beachId: warmest?.id
    };
  }

  if (season === 'fall') {
    // Best beach day from the forecast we already have (today vs tomorrow).
    // NOTE: this is a 2-day read for now — see "next step" (bump weather.js to
    // forecast_days=7) to make this a true "best day this week".
    const top = beaches[0];
    return {
      label: 'Best Shore Day',
      value: bestDayLabel(top),
      badge: '\u2600',
      sub: join([
        top.name,
        top.weatherDetails ? `${top.weatherDetails.tempF}\u00B0 air` : null,
        top.oceanTempDetails?.tempF != null ? `${top.oceanTempDetails.tempF}\u00B0 water` : null,
        top.weatherDetails?.windMph != null ? `${top.weatherDetails.windMph} mph wind` : null,
        'no badges, no crowds'
      ]),
      beach: top.name, beachId: top.id
    };
  }

  // summer (default): top beach by ShoreScore.
  const top = beaches[0];
  return {
    label: "Today's Top Beach",
    value: top.name,
    badge: String(top.shoreScore),
    sub: join([
      `ShoreScore ${top.shoreScore}`,
      top.oceanTempDetails?.tempF != null ? `${top.oceanTempDetails.tempF}\u00B0 water` : null,
      top.crowdDetails?.label?.label ? `${top.crowdDetails.label.label.toLowerCase()} crowds` : null
    ]),
    beach: top.name, beachId: top.id
  };
}

// Pick the better of today / tomorrow from existing weather data.
function bestDayLabel(topBeach) {
  const t = topBeach?.tomorrow;
  const todayWeatherScore = topBeach?.factors?.weather ?? 50;
  if (t && t.precipProb != null && t.precipProb < 30 && (t.highF ?? 0) >= 68) return 'Tomorrow';
  return todayWeatherScore >= 60 ? 'Today' : 'This weekend';
}

module.exports = { getSeason, SEASON_CONFIG, buildSeasonalHero, wetsuitFor };