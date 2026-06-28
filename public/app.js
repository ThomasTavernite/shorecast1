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

// Ocean water temperature (display-only)
function oceanTempSnippet(ot) {
  if (!ot || ot.tempF == null) return '';
  const labelText = ot.label ? ot.label.label : '';
  const detailText = ot.label ? ot.label.detail : '';
  return `
    <div class="ocean-temp-summary">
      <span class="ot-icon">🌡️</span>
      <span class="ot-heading">Ocean temp</span>
      <span class="ot-temp">${ot.tempF}°</span>
      <span class="ot-label">${labelText}</span>
      <span class="ot-detail">${detailText}${ot.stationName ? ` · ${ot.stationName} buoy` : ''}</span>
    </div>
  `;
}

// Next-12-hours forecast strip (accessible, scrollable)
function hourlyStrip(hours) {
  if (!hours || !hours.length) return '';
  const cells = hours.map(h => {
    const wl = weatherLabel(h.weatherCode);
    const t = new Date(h.time);
    const hr = t.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(':00', '');
    const precip = (h.precipProb != null && h.precipProb >= 20)
      ? `<span class="hr-precip">${h.precipProb}%</span>`
      : `<span class="hr-precip hr-dry">&nbsp;</span>`;
    return `
      <div class="hr-cell">
        <span class="hr-time">${hr}</span>
        <span class="hr-icon">${wl.icon}</span>
        <span class="hr-temp">${h.tempF != null ? h.tempF + '°' : '—'}</span>
        ${precip}
      </div>
    `;
  }).join('');
  return `
    <div class="hourly-block">
      <div class="forecast-heading">Next 12 hours</div>
      <div class="hourly-wrap">
        <button class="hr-nav hr-prev" type="button" aria-label="Show earlier hours">‹</button>
        <div class="hourly-scroll" role="group" aria-label="Hourly forecast for the next 12 hours" tabindex="0">${cells}</div>
        <button class="hr-nav hr-next" type="button" aria-label="Show later hours">›</button>
      </div>
    </div>
  `;
}

// Wire up the accessible interactions for a card's hourly strip
function wireHourlyStrip(li) {
  const scroll = li.querySelector('.hourly-scroll');
  if (!scroll) return;
  const prev = li.querySelector('.hr-prev');
  const next = li.querySelector('.hr-next');
  const step = () => Math.max(120, Math.round(scroll.clientWidth * 0.8));

  function updateArrows() {
    const max = scroll.scrollWidth - scroll.clientWidth - 1;
    const x = scroll.scrollLeft;
    if (prev) prev.disabled = x <= 0;
    if (next) next.disabled = x >= max;
  }
  // expose so the card can refresh arrow state when it expands
  li._updateHrArrows = updateArrows;

  if (prev) prev.addEventListener('click', (e) => {
    e.stopPropagation();
    scroll.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  if (next) next.addEventListener('click', (e) => {
    e.stopPropagation();
    scroll.scrollBy({ left: step(), behavior: 'smooth' });
  });

  scroll.addEventListener('scroll', updateArrows, { passive: true });

  // Mouse wheel -> horizontal scroll (desktop)
  scroll.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already a horizontal gesture
    if (scroll.scrollWidth <= scroll.clientWidth) return; // nothing to scroll
    e.preventDefault();
    scroll.scrollLeft += e.deltaY;
  }, { passive: false });

  // Keyboard support when the strip is focused
  scroll.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scroll.scrollBy({ left: step(), behavior: 'smooth' }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); scroll.scrollBy({ left: -step(), behavior: 'smooth' }); }
    else if (e.key === 'Home') { e.preventDefault(); scroll.scrollTo({ left: 0, behavior: 'smooth' }); }
    else if (e.key === 'End') { e.preventDefault(); scroll.scrollTo({ left: scroll.scrollWidth, behavior: 'smooth' }); }
  });

  // Click-and-drag to scroll (desktop pointer; touch uses native scroll)
  let dragging = false, startX = 0, startLeft = 0, moved = false;
  scroll.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    dragging = true; moved = false;
    startX = e.clientX; startLeft = scroll.scrollLeft;
    scroll.classList.add('dragging');
  });
  scroll.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    scroll.scrollLeft = startLeft - dx;
  });
  const endDrag = () => { dragging = false; scroll.classList.remove('dragging'); };
  scroll.addEventListener('pointerup', endDrag);
  scroll.addEventListener('pointerleave', endDrag);
  // swallow the click that follows a drag so it doesn't do anything unexpected
  scroll.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } });

  requestAnimationFrame(updateArrows);
}

// Tomorrow's forecast summary
function tomorrowSnippet(tm) {
  if (!tm) return '';
  const wl = weatherLabel(tm.weatherCode);
  const hi = tm.highF != null ? `${tm.highF}°` : '—';
  const lo = tm.lowF != null ? `${tm.lowF}°` : '—';
  const rain = (tm.precipProb != null && tm.precipProb >= 20) ? ` · ${tm.precipProb}% rain` : '';
  return `
    <div class="tomorrow-summary">
      <span class="tm-icon">${wl.icon}</span>
      <span class="tm-label">Tomorrow: ${wl.label}</span>
      <span class="tm-detail">${hi} / ${lo}${rain}</span>
    </div>
  `;
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
  const ot = beach.oceanTempDetails;
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
  const oceanTemp = oceanTempSnippet(ot);
  const hourly = hourlyStrip(beach.hourly);
  const tomorrow = tomorrowSnippet(beach.tomorrow);

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
      ${oceanTemp}
      ${hourly}
      ${tomorrow}
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
    // don't collapse the card when interacting with reports or the forecast strip
    if (e.target.closest('.report-btn') || e.target.closest('.report-block') || e.target.closest('.hourly-block')) return;
    li.classList.toggle('expanded');
    if (li.classList.contains('expanded') && li._updateHrArrows) {
      requestAnimationFrame(li._updateHrArrows);
    }
  });

  li.querySelectorAll('.report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const level = parseInt(btn.dataset.level, 10);
      submitReport(beach.id, level, btn);
    });
  });

  wireHourlyStrip(li);

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