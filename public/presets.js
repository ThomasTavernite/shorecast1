// Shorely chat presets — floating button + preset query panel
// Operates entirely on client-side data from /api/beaches
// No backend changes required

(function() {
  const VIBE_OPTIONS = [
    { vibe: 'family',  icon: '👨‍👩‍👧', label: 'Family-friendly' },
    { vibe: 'lively',  icon: '🎢', label: 'Lively / boardwalk' },
    { vibe: 'quiet',   icon: '🤫', label: 'Quiet & low-key' },
    { vibe: 'surf',    icon: '🏄', label: 'Surfing' },
    { vibe: 'wild',    icon: '🌿', label: 'Wild / natural' },
    { vibe: 'classic', icon: '🌅', label: 'Classic shore' }
  ];

  const PRESETS = [
    { id: 'near-me',   icon: '📍', label: 'Best beach near me',       run: filterNearMe },
    { id: 'top-3',     icon: '🏆', label: "Today's top 3",            run: filterTop3 },
    { id: 'low-crowd', icon: '🟢', label: 'Where it\'s least crowded', run: filterLowCrowd },
    { id: 'free',      icon: '💸', label: 'Free beaches (no badge)',  run: filterFree },
    { id: 'vibe',      icon: '✨', label: 'Browse by vibe',           run: null /* opens submenu */ }
  ];

  const RESULT_LIMIT = 3;

  let cachedBeaches = null;
  let userCoords = null;

  // ===== Data fetch =====
  async function getBeaches() {
    if (cachedBeaches) return cachedBeaches;
    const res = await fetch('/api/beaches');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedBeaches = data.beaches;
    return cachedBeaches;
  }

  // ===== Filters (always return 3) =====
  function filterByVibe(vibe) {
    return getBeaches().then(beaches =>
      beaches.filter(b => b.vibe === vibe).slice(0, RESULT_LIMIT)
    );
  }
  function filterLowCrowd() {
    return getBeaches().then(beaches =>
      [...beaches].sort((a, b) => b.factors.crowd - a.factors.crowd).slice(0, RESULT_LIMIT)
    );
  }
  function filterFree() {
    return getBeaches().then(beaches =>
      beaches.filter(b => b.badgePrice === 0).slice(0, RESULT_LIMIT)
    );
  }
  function filterTop3() {
    return getBeaches().then(beaches => beaches.slice(0, RESULT_LIMIT));
  }
  function filterNearMe() {
    return new Promise((resolve, reject) => {
      if (userCoords) { resolve(rankByDistance(userCoords)); return; }
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          resolve(await rankByDistance(userCoords));
        },
        () => reject(new Error('Location permission denied — try another option')),
        { timeout: 8000 }
      );
    });
  }
  async function rankByDistance(coords) {
    const beaches = await getBeaches();
    const withDist = beaches.map(b => ({
      ...b,
      _distMi: haversine(coords.lat, coords.lon, b.lat, b.lon)
    }));
    const nearby = withDist.filter(b => b._distMi <= 30);
    const pool = nearby.length >= 3 ? nearby : withDist.slice().sort((a, b) => a._distMi - b._distMi).slice(0, RESULT_LIMIT);
    return pool.sort((a, b) => b.shoreScore - a.shoreScore).slice(0, RESULT_LIMIT);
  }
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ===== UI =====
  function scoreClass(score) {
    if (score >= 75) return 'good';
    if (score >= 55) return 'mid';
    return 'bad';
  }

  function renderBeach(b) {
    const distNote = b._distMi != null ? ` · ${b._distMi.toFixed(0)} mi` : '';
    return `
      <div class="ch-result">
        <div class="ch-result-info">
          <div class="ch-result-name">${b.name}</div>
          <div class="ch-result-town">${b.town}, ${b.county} County${distNote}</div>
        </div>
        <div class="ch-result-score ${scoreClass(b.shoreScore)}">${b.shoreScore}</div>
      </div>
    `;
  }

  function renderResults(beaches, intro) {
    const root = document.getElementById('ch-results');
    if (!beaches || beaches.length === 0) {
      root.innerHTML = `<div class="ch-empty">No beaches matched right now. Try another option!</div>
        <button class="ch-back" id="ch-back">← Ask something else</button>`;
      document.getElementById('ch-back').addEventListener('click', renderPresets);
      return;
    }
    root.innerHTML = `
      <div class="ch-intro">${intro}</div>
      ${beaches.map(renderBeach).join('')}
      <button class="ch-back" id="ch-back">← Ask something else</button>
    `;
    document.getElementById('ch-back').addEventListener('click', renderPresets);
  }

  function renderVibeMenu() {
    const root = document.getElementById('ch-results');
    root.innerHTML = `
      <div class="ch-greeting">What kind of beach are you in the mood for?</div>
      <div class="ch-presets">
        ${VIBE_OPTIONS.map(v => `
          <button class="ch-preset" data-vibe="${v.vibe}">
            <span class="ch-preset-icon">${v.icon}</span>
            <span class="ch-preset-label">${v.label}</span>
          </button>
        `).join('')}
      </div>
      <button class="ch-back" id="ch-back">← Back</button>
    `;
    root.querySelectorAll('.ch-preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const vibe = btn.dataset.vibe;
        const option = VIBE_OPTIONS.find(v => v.vibe === vibe);
        root.innerHTML = `<div class="ch-loading">Checking the shore…</div>`;
        try {
          const beaches = await filterByVibe(vibe);
          renderResults(beaches, option.label);
        } catch (err) {
          root.innerHTML = `<div class="ch-error">${err.message}</div>
            <button class="ch-back" id="ch-back">← Back</button>`;
          document.getElementById('ch-back').addEventListener('click', renderPresets);
        }
      });
    });
    document.getElementById('ch-back').addEventListener('click', renderPresets);
  }

  function renderPresets() {
    const root = document.getElementById('ch-results');
    root.innerHTML = `
      <div class="ch-greeting">Hey! 👋 I can help you pick a beach. Tap one:</div>
      <div class="ch-presets">
        ${PRESETS.map(p => `
          <button class="ch-preset" data-id="${p.id}">
            <span class="ch-preset-icon">${p.icon}</span>
            <span class="ch-preset-label">${p.label}</span>
          </button>
        `).join('')}
      </div>
    `;
    root.querySelectorAll('.ch-preset').forEach(btn => {
      btn.addEventListener('click', () => handlePreset(btn.dataset.id));
    });
  }

  async function handlePreset(id) {
    if (id === 'vibe') {
      renderVibeMenu();
      return;
    }
    const preset = PRESETS.find(p => p.id === id);
    if (!preset) return;
    const root = document.getElementById('ch-results');
    root.innerHTML = `<div class="ch-loading">Checking the shore…</div>`;
    try {
      const beaches = await preset.run();
      renderResults(beaches, preset.label);
    } catch (err) {
      root.innerHTML = `<div class="ch-error">${err.message || 'Something went wrong'}</div>
        <button class="ch-back" id="ch-back">← Back</button>`;
      document.getElementById('ch-back').addEventListener('click', renderPresets);
    }
  }

  // ===== Mount =====
  function mount() {
    const root = document.getElementById('chat-root');
    if (!root) return;
    root.innerHTML = `
      <button class="ch-fab" id="ch-fab" aria-label="Ask Shorely">
        <span class="ch-fab-emoji">🌊</span>
        <span class="ch-fab-text">Ask</span>
      </button>
      <div class="ch-panel" id="ch-panel" hidden>
        <div class="ch-header">
          <div class="ch-title">Ask Shorely</div>
          <button class="ch-close" id="ch-close" aria-label="Close">×</button>
        </div>
        <div class="ch-body" id="ch-results"></div>
      </div>
    `;
    document.getElementById('ch-fab').addEventListener('click', () => {
      document.getElementById('ch-panel').hidden = false;
      document.getElementById('ch-fab').hidden = true;
      renderPresets();
    });
    document.getElementById('ch-close').addEventListener('click', () => {
      document.getElementById('ch-panel').hidden = true;
      document.getElementById('ch-fab').hidden = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();