// ShoreCast frontend
// Fetches /api/beaches, renders ranked list, handles expand-on-tap

const list = document.getElementById('beachList');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error');
const lastUpdatedEl = document.getElementById('lastUpdated');

function scoreClass(score) {
  if (score >= 75) return 'good';
  if (score >= 55) return 'mid';
  return 'bad';
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}

function weatherLabel(code) {
  const map = {
    0: { icon: '☀️', label: 'Clear' },
    1: { icon: '🌤️', label: 'Mostly sunny' },
    2: { icon: '⛅', label: 'Partly cloudy' },
    3: { icon: '☁️', label: 'Overcast' },
    45: { icon: '🌫️', label: 'Foggy' },
    48: { icon: '🌫️', label: 'Foggy' },
    51: { icon: '🌦️', label: 'Light drizzle' },
    53: { icon: '🌦️', label: 'Drizzle' },
    55: { icon: '🌦️', label: 'Heavy drizzle' },
    61: { icon: '🌧️', label: 'Light rain' },
    63: { icon: '🌧️', label: 'Rain' },
    65: { icon: '🌧️', label: 'Heavy rain' },
    71: { icon: '🌨️', label: 'Light snow' },
    73: { icon: '🌨️', label: 'Snow' },
    75: { icon: '❄️', label: 'Heavy snow' },
    80: { icon: '🌦️', label: 'Showers' },
    81: { icon: '🌧️', label: 'Showers' },
    82: { icon: '⛈️', label: 'Heavy showers' },
    95: { icon: '⛈️', label: 'Thunderstorm' },
    96: { icon: '⛈️', label: 'Storm w/ hail' },
    99: { icon: '⛈️', label: 'Severe storm' }
  };
  return map[code] || { icon: '🌤️', label: 'Mild' };
}

// Plain-English label for surf condition
function surfLabel(m) {
  if (!m || m.waveHeightFt == null) return { icon: '🌊', label: 'Surf data unavailable', detail: '' };
  const h = m.waveHeightFt;

  let label, icon;
  if (h < 1) { icon = '🟦'; label = 'Flat'; }
  else if (h < 2) { icon = '🌊'; label = 'Small'; }
  else if (h < 4) { icon = '🌊'; label = 'Playful'; }
  else if (h < 6) { icon = '🏄'; label = 'Surfable'; }
  else if (h < 8) { icon = '⚠️'; label = 'Rough'; }
  else { icon = '🚫'; label = 'Hazardous'; }

  const periodTxt = m.wavePeriodSec ? ` · ${m.wavePeriodSec}s period` : '';
  const dirTxt = m.waveDirection ? ` · ${m.waveDirection} swell` : '';
  return {
    icon,
    label,
    detail: `${h} ft waves${periodTxt}${dirTxt}`
  };
}

function renderBeach(beach, rank) {
  const li = document.createElement('li');
  li.className = 'beach-card';
  li.dataset.id = beach.id;

  const cls = scoreClass(beach.shoreScore);
  const w = beach.weatherDetails;
  const m = beach.marineDetails;
  const wl = w ? weatherLabel(w.weatherCode) : null;
  const sl = surfLabel(m);

  const weatherSummary = w
    ? `<span class="w-icon">${wl.icon}</span><span class="w-temp">${w.tempF}°</span><span class="w-label">${wl.label}</span>`
    : `<span class="w-label">Weather unavailable</span>`;

  const feelsDiff = w ? Math.abs(w.tempF - w.feelsLikeF) : 0;
  const weatherDetail = w
    ? `${feelsDiff >= 3 ? `Feels like ${w.feelsLikeF}° · ` : ''}Wind ${w.windMph} mph${w.gustsMph > w.windMph + 5 ? ` (gusts ${w.gustsMph})` : ''}${w.precipIn > 0 ? ` · ${w.precipIn}" rain` : ''}${w.uvIndex >= 6 ? ` · UV ${Math.round(w.uvIndex)} (high)` : ''}`
    : '';

  li.innerHTML = `
    <div class="beach-row">
      <div class="rank">#${rank}</div>
      <div class="beach-info">
        <div class="beach-name">${beach.name}</div>
        <div class="beach-town">${beach.town}, ${beach.county} County</div>
      </div>
      <div class="score ${cls}">${beach.shoreScore}</div>
    </div>
    <div class="beach-details">
      <div class="weather-summary">${weatherSummary}</div>
      ${weatherDetail ? `<div class="weather-detail">${weatherDetail}</div>` : ''}
      <div class="surf-summary">
        <span class="s-icon">${sl.icon}</span>
        <span class="s-label">${sl.label}</span>
        ${sl.detail ? `<span class="s-detail">${sl.detail}</span>` : ''}
      </div>
      <div class="factors">
        <div class="factor"><div class="factor-label">Water</div><div class="factor-value">${beach.factors.water}</div></div>
        <div class="factor"><div class="factor-label">Surf</div><div class="factor-value">${beach.factors.surf}</div></div>
        <div class="factor"><div class="factor-label">Weather</div><div class="factor-value">${beach.factors.weather}</div></div>
        <div class="factor"><div class="factor-label">Crowd</div><div class="factor-value">${beach.factors.crowd}</div></div>
        <div class="factor"><div class="factor-label">Parking</div><div class="factor-value">${beach.factors.parking}</div></div>
      </div>
      <div class="meta">
        <div>Badge: ${beach.badgePrice === 0 ? 'Free' : '$' + beach.badgePrice}</div>
        <div>Parking: ${beach.parkingNotes}</div>
        <span class="vibe-tag">${beach.vibe}</span>
      </div>
    </div>
  `;

  li.addEventListener('click', () => {
    li.classList.toggle('expanded');
  });

  return li;
}

async function load() {
  try {
    const res = await fetch('/api/beaches');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    loading.hidden = true;
    lastUpdatedEl.textContent = `Updated ${timeAgo(data.lastUpdated)}`;

    list.innerHTML = '';
    data.beaches.forEach((beach, i) => {
      list.appendChild(renderBeach(beach, i + 1));
    });
  } catch (err) {
    loading.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = `Couldn't load beaches: ${err.message}`;
    console.error(err);
  }
}

load();

setInterval(load, 5 * 60 * 1000);