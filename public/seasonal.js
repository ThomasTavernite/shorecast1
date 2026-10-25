// seasonal.js — year-round seasonal theming, hero + date-aware "things to do" for Shorely
// Self-contained. Applies the season's look instantly (no flash), fills the hero
// from /api/season, and renders per-season activity cards.
// Reversible: delete this file + its <script> tag.
//
// Preview any season by adding ?season=winter (or fall / summer / spring) to the URL.

(function () {
  function getSeason(d = new Date()) {
    const m = d.getMonth();                 // 0 = Jan ... 11 = Dec
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4)             return 'spring';
    if (m <= 7)             return 'summer';
    return 'fall';
  }

  const VALID = ['summer', 'fall', 'winter', 'spring'];
  const forced = new URLSearchParams(location.search).get('season');
  const season = (forced && VALID.includes(forced)) ? forced : getSeason();

  document.documentElement.dataset.season = season;

  // ===== Date-aware activity pools =====
  // Each item: { e: emoji, t: title, d: detail, when: pill label, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
  // - Items with an `end` in the past are hidden automatically (no manual cleanup needed).
  // - Items with no `end` are ongoing and always eligible.
  // - Dated items sort soonest-first; ongoing items fill in after. Max MAX_SHOWN cards.
  // Keep more than MAX_SHOWN in each pool so the list stays full as events pass.
  const MAX_SHOWN = 6;   // total cards
  const MAX_DATED = 4;   // dated events shown before ongoing activities fill the rest
  const TODO_TITLE = { summer: 'this summer ☀️', fall: 'this fall 🍂', winter: 'this winter ❄️', spring: 'this spring 🌷' };

  const SEASON_ACTIVITIES = {
    fall: [
      // Early fall (auto-expire)
      { e:'🦀', t:'LBI Chowderfest',            d:'Chowder cook-off in Beach Haven',          when:'Oct 3–4',    start:'2026-10-03', end:'2026-10-04' },
      { e:'🏛️', t:'Cape May Victorian Weekend', d:'Historic tours, ghost walks & fall charm', when:'Oct 9–12',   start:'2026-10-09', end:'2026-10-12' },
      { e:'💡', t:'NJ Lighthouse Challenge',    d:"Climb the coast's lighthouses in a weekend", when:'Oct 17–18', start:'2026-10-17', end:'2026-10-18' },
      // Late fall
      { e:'🎃', t:'Ocean City Halloween Parade', d:'7:15 PM down Asbury Avenue',              when:'Oct 29',     start:'2026-10-29', end:'2026-10-29' },
      { e:'🏃', t:'Trail of Two Cities 5K',      d:'9th St Bridge, Ocean City to Somers Point', when:'Nov 7',    start:'2026-11-07', end:'2026-11-07' },
      { e:'❄️', t:'Winterfest by the Sea',       d:'Holiday market at the OC Civic Center',    when:'Nov 14',     start:'2026-11-14', end:'2026-11-14' },
      { e:'🦃', t:'OC Boardwalk Turkey Trot',    d:'Thanksgiving-morning 5K on the boards',    when:'Nov 26',     start:'2026-11-26', end:'2026-11-26' },
      { e:'🎄', t:'Christmas in the Downtown',   d:"Ocean City's holiday kickoff on Asbury Ave", when:'Nov 27',   start:'2026-11-27', end:'2026-11-27' },
      { e:'✨', t:'Winter Wonderland, Congress Hall', d:'Cape May holiday village opens',     when:'Nov 27',     start:'2026-11-27', end:'2026-12-31' },
      // Ongoing
      { e:'🐋', t:'Whale & dolphin watching',    d:'Boats still running out of Cape May',      when:'Thru Nov',   end:'2026-11-30' },
      { e:'🎣', t:'Surf fishing',                d:'The striped bass run is peaking',          when:'Peak now' },
      { e:'🏄', t:'Cold-water surfing',          d:"Fall's the cleanest swell of the year",    when:'All season' },
      { e:'🏖️', t:'Empty beaches',               d:'Free parking, no badges, zero crowds',     when:'All season' }
    ],
    winter: [
      { e:'✨', t:'Winter Wonderland, Congress Hall', d:'Cape May holiday village & tree lighting', when:'Thru Dec 31', start:'2026-11-27', end:'2026-12-31' },
      { e:'🎶', t:'Caroling in Victorian Cape May', d:'Sunday walking tours, 3:30 PM',       when:'Sun thru Dec 27', start:'2026-11-29', end:'2026-12-27' },
      { e:'🎅', t:'Santa in Downtown Ocean City', d:'Weekends on Asbury Avenue',              when:'Weekends',   start:'2026-11-28', end:'2026-12-20' },
      { e:'🎆', t:'First Night Ocean City',       d:'Drone show, concerts & midnight fireworks', when:'Dec 31',  start:'2026-12-31', end:'2026-12-31' },
      { e:'🥶', t:'Polar plunges',                d:"New Year's dips up and down the coast",    when:'Jan 1',      start:'2027-01-01', end:'2027-01-01' },
      { e:'🥾', t:'First Day hikes',              d:'Guided walks at Island Beach State Park',  when:'Jan 1',      start:'2027-01-01', end:'2027-01-01' },
      { e:'🏄', t:'Winter surf',                  d:'Cold water, clean lines, empty lineups',   when:'All season' },
      { e:'🌊', t:"Storm & nor'easter watching",  d:'Dramatic surf from the boardwalk',         when:'As they hit' },
      { e:'🦅', t:'Winter birding',               d:'Snowy owls & raptors at Sandy Hook',       when:'All season' }
    ],
    spring: [
      { e:'🐋', t:'Whale watching',            d:'Migration season opens back up',          when:'Apr–May' },
      { e:'🏄', t:'Spring surf',               d:'Building swell, lighter wetsuits',        when:'All season' },
      { e:'🌡️', t:'Water warming',             d:'Watch the countdown to swimmable',        when:'Now' },
      { e:'🌸', t:'Spring festivals',          d:'Shore towns shake off winter',            when:'Apr–May' },
      { e:'🎣', t:'Spring fishing',            d:'Bass & bluefish return to the surf',      when:'Spring run' },
      { e:'🏖️', t:'Quiet pre-season beaches',  d:'Free parking before the summer rush',     when:'All season' }
    ],
    summer: [
      { e:'🎆', t:'Boardwalk fireworks',       d:'Weekly shows all season long',            when:'All summer' },
      { e:'🍦', t:'Boardwalk classics',        d:'Custard, funnel cake & the arcades',      when:'All summer' },
      { e:'🏄', t:'Dawn patrol surf',          d:'Best waves before the crowds',            when:'All summer' },
      { e:'🎣', t:'Party-boat fishing',        d:'Fluke & sea bass offshore',               when:'All summer' },
      { e:'🌅', t:'Sunrise beach walks',       d:'Beat the heat and the parking',           when:'All summer' },
      { e:'🦀', t:'Seafood shacks',            d:'Fresh catch all along the coast',         when:'All summer' }
    ]
  };

  // Today as 'YYYY-MM-DD' in local time (string compare works for ISO dates).
  function todayISO() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // Filter out expired, sort dated-soonest-first then ongoing, cap the list.
  function pickActivities(pool) {
    const today = todayISO();
    const live = pool.filter(a => !a.end || a.end >= today);
    const dated = live.filter(a => a.start).sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
    const ongoing = live.filter(a => !a.start);
    return dated.slice(0, MAX_DATED).concat(ongoing).slice(0, MAX_SHOWN);
  }

  // ===== Seasonal look: override CSS variables + card strips per season. =====
  const THEME_CSS = `
    :root[data-season="fall"] {
      --deep:#7a3b1f; --ocean:#c05f33; --sky:#e79a5c;
      --sun:#ffb057; --sun-soft:#ffd9a8;
      --coral:#c0603a; --coral-soft:#e0a07a; --peach:#f5e2cf;
      --bg:#fdf3e8;
    }
    :root[data-season="winter"] {
      --deep:#16283f; --ocean:#33597d; --sky:#7fa0bd;
      --sun:#cfe2f0; --sun-soft:#e6eff7;
      --coral:#4fa3c7; --coral-soft:#9cc6dc; --peach:#dce8f1;
      --bg:#eef3f7;
    }
    :root[data-season="spring"] {
      --deep:#12564f; --ocean:#2e9fb6; --sky:#8fd3c0;
      --sun:#a8e6c9; --sun-soft:#d5f3e5;
      --coral:#2bb37a; --coral-soft:#8fd8b6; --peach:#dcf3e8;
      --bg:#eff9f3;
    }

    /* ===== FULL CARD RE-TINT — every condition strip, per season ===== */
    [data-season="fall"] .weather-summary   { background:linear-gradient(135deg,#fbe6d1 0%,#f6ceaa 100%); }
    [data-season="fall"] .surf-summary       { background:linear-gradient(135deg,#e9e6c2 0%,#d6cf94 100%); }
    [data-season="fall"] .water-summary      { background:linear-gradient(135deg,#f4ddc3 0%,#e4bd94 100%); }
    [data-season="fall"] .tide-summary       { background:linear-gradient(135deg,#edd0ad 0%,#d8ad80 100%); }
    [data-season="fall"] .ocean-temp-summary { background:linear-gradient(135deg,#f7e1c8 0%,#eec096 100%); }
    [data-season="fall"] .hourly-block       { background:linear-gradient(135deg,#fbe9d5 0%,#f3d7b5 100%); }
    [data-season="fall"] .tomorrow-summary   { background:linear-gradient(135deg,#f4e0c8 0%,#e6c7a1 100%); }
    [data-season="fall"] .crowd-summary      { background:linear-gradient(135deg,#f7e2c0 0%,#edc78d 100%); }
    [data-season="fall"] .parking-summary    { background:linear-gradient(135deg,#efddbd 0%,#dabf8d 100%); }

    [data-season="winter"] .weather-summary   { background:linear-gradient(135deg,#dbe6ef 0%,#bcd0e2 100%); }
    [data-season="winter"] .surf-summary       { background:linear-gradient(135deg,#d3e2ec 0%,#aecbdd 100%); }
    [data-season="winter"] .water-summary      { background:linear-gradient(135deg,#dde7ee 0%,#c0d3e0 100%); }
    [data-season="winter"] .tide-summary       { background:linear-gradient(135deg,#d4e0ea 0%,#aec6d8 100%); }
    [data-season="winter"] .ocean-temp-summary { background:linear-gradient(135deg,#d9e6ef 0%,#b8d0e2 100%); }
    [data-season="winter"] .hourly-block       { background:linear-gradient(135deg,#e2edf4 0%,#cddfeb 100%); }
    [data-season="winter"] .tomorrow-summary   { background:linear-gradient(135deg,#e0eaf1 0%,#c6d8e5 100%); }
    [data-season="winter"] .crowd-summary      { background:linear-gradient(135deg,#e3e9ef 0%,#cbd8e3 100%); }
    [data-season="winter"] .parking-summary    { background:linear-gradient(135deg,#dfe6ec 0%,#c4d2de 100%); }

    [data-season="spring"] .weather-summary   { background:linear-gradient(135deg,#dcf0e6 0%,#bfe3cf 100%); }
    [data-season="spring"] .surf-summary       { background:linear-gradient(135deg,#d7efdb 0%,#b6e0bf 100%); }
    [data-season="spring"] .water-summary      { background:linear-gradient(135deg,#d6eef1 0%,#b4dde2 100%); }
    [data-season="spring"] .tide-summary       { background:linear-gradient(135deg,#cfece9 0%,#a6d6cf 100%); }
    [data-season="spring"] .ocean-temp-summary { background:linear-gradient(135deg,#d8f0ea 0%,#b6e2d3 100%); }
    [data-season="spring"] .hourly-block       { background:linear-gradient(135deg,#e4f4ec 0%,#cfeadb 100%); }
    [data-season="spring"] .tomorrow-summary   { background:linear-gradient(135deg,#e2f2e9 0%,#c8e6d4 100%); }
    [data-season="spring"] .crowd-summary      { background:linear-gradient(135deg,#e6f2df 0%,#cfe6bf 100%); }
    [data-season="spring"] .parking-summary    { background:linear-gradient(135deg,#e2efdd 0%,#c9e0bb 100%); }

    /* ===== Seasonal hero banner (matches main width) ===== */
    .seasonal-hero { max-width:640px; width:100%; margin:16px auto 0; padding:0 16px; }
    .seasonal-hero-inner {
      background:var(--foam); border:1px solid var(--sand);
      border-radius:18px; padding:16px 18px; box-shadow:var(--shadow);
      display:flex; align-items:center; gap:14px;
    }
    .sh-badge {
      flex:0 0 auto; min-width:54px; height:54px; padding:0 10px;
      display:flex; align-items:center; justify-content:center;
      background:linear-gradient(135deg, var(--ocean), var(--deep));
      color:#fff; border-radius:14px; font-weight:800; font-size:1.5rem;
      font-variant-numeric:tabular-nums; letter-spacing:-0.02em;
    }
    .sh-text { flex:1; min-width:0; }
    .sh-label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; font-weight:800; color:var(--coral); }
    .sh-value { font-size:1.35rem; font-weight:800; color:var(--deep); line-height:1.15; letter-spacing:-0.01em; }
    .sh-sub { font-size:0.82rem; color:var(--muted); margin-top:2px; }

    /* ===== "Things to do" — cards that match the beach cards, full width ===== */
    .season-todo { max-width:640px; width:100%; margin:6px auto 0; padding:16px 16px 0; }
    .season-todo-head { font-size:1rem; font-weight:800; color:var(--deep); margin:0 0 10px; padding-left:2px; letter-spacing:-0.01em; }
    .todo-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
    .todo-card {
      background:var(--foam); border:1px solid var(--sand); border-radius:18px;
      box-shadow:var(--shadow); padding:13px 15px; display:flex; align-items:center; gap:12px;
    }
    .todo-emoji {
      flex:0 0 auto; width:42px; height:42px; display:flex; align-items:center; justify-content:center;
      font-size:1.4rem; background:var(--peach); border-radius:12px;
    }
    .todo-text { flex:1; min-width:0; }
    .todo-title { font-weight:700; color:var(--deep); font-size:0.98rem; }
    .todo-detail { color:var(--muted); font-size:0.82rem; margin-top:2px; line-height:1.3; }
    .todo-when {
      flex:0 0 auto; font-size:0.7rem; font-weight:800; color:var(--coral);
      border:1.5px solid var(--coral-soft); padding:4px 10px; border-radius:100px;
      white-space:nowrap; text-transform:uppercase; letter-spacing:0.02em;
    }
    .todo-when.is-today { background:var(--coral); color:#fff; border-color:var(--coral); }
    @media (max-width: 460px) {
      .todo-card { padding:12px 13px; gap:10px; }
      .todo-emoji { width:38px; height:38px; font-size:1.25rem; }
      .todo-title { font-size:0.92rem; }
      .todo-detail { font-size:0.78rem; }
      .todo-when { font-size:0.62rem; padding:3px 8px; letter-spacing:0.01em; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.id = 'seasonal-style';
  styleEl.textContent = THEME_CSS;
  document.head.appendChild(styleEl);

  function insertAfterHeader(node) {
    const anchor = document.getElementById('seasonalHero') || document.querySelector('header');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(node, anchor.nextSibling);
    else document.body.insertBefore(node, document.body.firstChild);
  }

  // Seasonal hero (live data from /api/season)
  function mountHero() {
    if (document.getElementById('seasonalHero')) return document.getElementById('seasonalHero');
    const host = document.createElement('div');
    host.className = 'seasonal-hero';
    host.id = 'seasonalHero';
    host.hidden = true;
    const header = document.querySelector('header');
    if (header && header.parentNode) header.parentNode.insertBefore(host, header.nextSibling);
    else document.body.insertBefore(host, document.body.firstChild);
    return host;
  }
  async function loadHero() {
    const host = mountHero();
    if (!host) return;
    try {
      const url = '/api/season' + (forced ? ('?season=' + encodeURIComponent(forced)) : '');
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const h = data.hero;
      if (!h) return;
      host.innerHTML =
        '<div class="seasonal-hero-inner">' +
          '<div class="sh-badge">' + (h.badge || '') + '</div>' +
          '<div class="sh-text">' +
            '<div class="sh-label">' + (h.label || '') + '</div>' +
            '<div class="sh-value">' + (h.value || '') + '</div>' +
            (h.sub ? '<div class="sh-sub">' + h.sub + '</div>' : '') +
          '</div>' +
        '</div>';
      host.hidden = false;
    } catch (e) { /* hero optional — fail quietly */ }
  }

  // Seasonal "things to do" — one card per activity, date-aware
  function mountTodo() {
    if (document.getElementById('seasonTodo')) return;
    const items = pickActivities(SEASON_ACTIVITIES[season] || []);
    if (!items.length) return;
    const today = todayISO();
    const rows = items.map(function (a) {
      const isToday = !!a.start && a.start === today;
      const label = isToday ? 'Today' : a.when;
      const when = label ? '<span class="todo-when' + (isToday ? ' is-today' : '') + '">' + label + '</span>' : '';
      return '<li class="todo-card">' +
               '<div class="todo-emoji">' + a.e + '</div>' +
               '<div class="todo-text">' +
                 '<div class="todo-title">' + a.t + '</div>' +
                 '<div class="todo-detail">' + a.d + '</div>' +
               '</div>' +
               when +
             '</li>';
    }).join('');
    const host = document.createElement('section');
    host.className = 'season-todo';
    host.id = 'seasonTodo';
    host.innerHTML =
      '<h2 class="season-todo-head">Things to do ' + (TODO_TITLE[season] || '') + '</h2>' +
      '<ul class="todo-list">' + rows + '</ul>';
    insertAfterHeader(host);
  }

  function init() { mountHero(); mountTodo(); loadHero(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();