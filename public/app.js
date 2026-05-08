// Shorely frontend
const list = document.getElementById('beachList');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error');
const lastUpdatedEl = document.getElementById('lastUpdated');

function scoreClass(score) {
  if (score >= 75) return 'good';
  if (score >= 55) return 'mid';
  return 'bad';
}

function rankMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function vibeClass(vibe) {
  return `vibe-${(vibe || '').toLowerCase()}`;
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

function timeOfDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
  return { icon, label, detail: `${h} ft waves${periodTxt}${dirTxt}` };
}

function waterIcon(score) {
  if (score >= 85) return '💧';
  if (score >= 65) return '🌊';
  if (score >= 45) return '⚠️';
  return '🚫';
}

function tideSnippet(td) {
  if (!td || !td.next) return '';
  const next = td.next;
  const t = new Date(next.when);
  const timeStr = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const arrow = next.type === 'high' ? '↑' : '↓';
  const diff = Math.round((t.getTime() - Date.now()) / 60000);
  const inHrs = diff >= 60
    ? `in ${Math.floor(diff / 60)}h ${diff % 60}m`
    : (diff > 0 ? `in ${diff}m` : 'now');
  const labelText = next.type === 'high' ? 'High tide' : 'Low tide';
  return `<span class="td-icon">🌊</span><span class="td-label">${arrow} ${labelText} ${timeStr}</span><span class="td-detail">${next.heightFt} ft · ${inHrs}</span>`;
}

async function submitReport(beachId, level, btnEl) {
  btnEl.disabled = true;
  btnEl.textContent = 'Sending…';
  try {
    const res = await fetch(`/api/beaches/${beachId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    btnEl.parentElement.innerHTML = `<div class="report-thanks">Thanks! Your report is in. (${data.totalReports} total)</div>`;
    setTimeout(load, 1500);
  } catch (err) {
    btnEl.disabled = false;
    btnEl.textContent = 'Try again';
    alert(err.message);
  }
}

let lastDataUpdated = null;

function renderBeach(beach, rank) {
  const li = document.createElement('li');
  li.className = 'beach-card';
  if (rank <= 3) li.classList.add('top-rank', `rank-${rank}`);
  li.dataset.id = beach.id;

  const cls = scoreClass(beach.shoreScore);
  const w = beach.weatherDetails;
  const m = beach.marineDetails;
  const wd = beach.waterDetails;
  const cd = beach.crowdDetails;
  const td = beach.tideDetails;
  const wl = w ? weatherLabel(w.weatherCode) : null;
  const sl = surfLabel(m);
  const medal = rankMedal(rank);
  const updatedAt = lastDataUpdated ? timeOfDay(lastDataUpdated) : '';

  const weatherSummary = w
    ? `<span class="w-icon">${wl.icon}</span><span class="w-temp">${w.tempF}°</span><span class="w-feels">Feels ${w.feelsLikeF}°</span><span class="w-label">${wl.label}</span>`
    : `<span class="w-label">Weather unavailable</span>`;

  const weatherDetail = w
    ? `Wind ${w.windMph} mph${w.gustsMph > w.windMph + 5 ? ` (gusts ${w.gustsMph})` : ''}${w.precipIn > 0 ? ` · ${w.precipIn}" rain` : ''}${w.uvIndex >= 6 ? ` · UV ${Math.round(w.uvIndex)} (high)` : ''}${updatedAt ? ` · as of ${updatedAt}` : ''}`
    : '';

  const waterScore = beach.factors.water;
  const waterSummary = wd
    ? `<span class="wt-icon">${waterIcon(waterScore)}</span><span class="wt-label">${wd.label.label}</span>${wd.label.detail ? `<span class="wt-detail">${wd.label.detail}</span>` : ''}`
    : '';

  const tideSummary = tideSnippet(td);

  const crowdSummary = cd && cd.label
    ? `<span class="cr-icon">${cd.label.icon}</span><span class="cr-label">${cd.label.label}</span><span class="cr-detail">${cd.label.detail}</span><span class="cr-source">${cd.source}</span>`
    : '';

  li.innerHTML = `
    <div class="beach-row">
      <div class="rank">${medal ? `<span class="medal">${medal}</span>` : `#${rank}`}</div>
      <div class="beach-info">
        <div class="beach-name">${beach.name}</div>
        <div class="beach-town">${beach.town}, ${beach.county} County</div>
      </div>
      <div class="score ${cls}">${beach.shoreScore}</div>
    </div>
    <div class="beach-details">
      <div class="weather-summary">${weatherSummary}</div>
      ${weatherDetail ? `<div class="weather-detail">${weatherDetail}</div>` : ''}
      <div class="weather-disclaimer">Weather forecasts vary by source. Numbers shown reflect NOAA model data and may differ slightly from your phone's weather app.</div>
      <div class="surf-summary">
        <span class="s-icon">${sl.icon}</span>
        <span class="s-label">${sl.label}</span>
        ${sl.detail ? `<span class="s-detail">${sl.detail}</span>` : ''}
      </div>
      ${waterSummary ? `<div class="water-summary">${waterSummary}</div>` : ''}
      ${tideSummary ? `<div class="tide-summary">${tideSummary}</div>` : ''}
      ${crowdSummary ? `<div class="crowd-summary">${crowdSummary}</div>` : ''}
      ${beach.parkingDetails ? `
        <div class="parking-summary">
          <span class="pk-icon">${beach.parkingDetails.label.icon}</span>
          <span class="pk-label">${beach.parkingDetails.label.label} parking</span>
          <span class="pk-detail">${beach.parkingDetails.label.detail}</span>
        </div>
      ` : ''}
      <div class="report-block">
        <div class="report-prompt">At the beach? Help others — how crowded is it?</div>
        <div class="report-buttons">
          <button class="report-btn" data-level="10">🟢 Empty</button>
          <button class="report-btn" data-level="35">🟢 Light</button>
          <button class="report-btn" data-level="55">🟡 Moderate</button>
          <button class="report-btn" data-level="75">🟠 Busy</button>
          <button class="report-btn" data-level="92">🔴 Packed</button>
        </div>
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
        <div class="badge-disclaimer">Prices reflect 2026 published rates and may change. Confirm with the town before purchasing.</div>
        <span class="vibe-tag ${vibeClass(beach.vibe)}">${beach.vibe}</span>
        ${beach.webcamUrl ? `<a class="webcam-link" href="${beach.webcamUrl}" target="_blank" rel="noopener">📹 Watch live webcam →</a>` : ''}
      </div>
    </div>
  `;

  li.addEventListener('click', (e) => {
    if (e.target.closest('.report-btn') || e.target.closest('.report-block')) return;
    li.classList.toggle('expanded');
  });

  li.querySelectorAll('.report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const level = parseInt(btn.dataset.level, 10);
      submitReport(beach.id, level, btn);
    });
  });

  return li;
}

async function load() {
  try {
    const res = await fetch('/api/beaches');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    lastDataUpdated = data.lastUpdated;
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