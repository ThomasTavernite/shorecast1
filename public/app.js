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

function renderBeach(beach, rank) {
  const li = document.createElement('li');
  li.className = 'beach-card';
  li.dataset.id = beach.id;

  const cls = scoreClass(beach.shoreScore);

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