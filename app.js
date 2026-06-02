// FinFeed — feed + calendar views, rendered from data/news.json
const updatedEl = document.getElementById('updated');
const refreshBtn = document.getElementById('refresh');
const feedEl = document.getElementById('view-feed');
const calGrid = document.getElementById('cal-grid');
const calTitle = document.getElementById('cal-title');
const dayContent = document.getElementById('day-content');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

let DATA = { days: [] };
let byIso = {};        // "2026-06-02" -> day object
let view = 'feed';
let calCursor = null;  // { y, m } (m = 0-11) of the month shown in the calendar

const pad = (n) => String(n).padStart(2, '0');

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatUpdated(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return 'Updated ' + d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ---------- view switching ---------- */
function setView(v) {
  view = v;
  document.getElementById('view-feed').hidden = v !== 'feed';
  document.getElementById('view-calendar').hidden = v !== 'calendar';
  document.getElementById('view-day').hidden = v !== 'day';
  document.querySelectorAll('.tab').forEach((t) => {
    // 'day' is a child of the calendar tab
    const active = t.dataset.view === v || (v === 'day' && t.dataset.view === 'calendar');
    t.classList.toggle('is-active', active);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- feed ---------- */
function renderItems(items) {
  return (items || []).map((title, i) => `
    <div class="item" style="animation-delay:${Math.min(i * 22, 420)}ms">
      <span class="dot"></span>
      <span class="title">${escapeHTML(title)}</span>
    </div>`).join('');
}

function renderFeed() {
  const days = DATA.days || [];
  if (!days.length) {
    feedEl.innerHTML = '<div class="empty">No headlines yet. Check back after the next update.</div>';
    return;
  }
  feedEl.innerHTML = days.map((day) => `
    <section class="day">
      <div class="day-head">
        <span class="day-date">${escapeHTML(day.date || '')}</span>
        <span class="day-rule"></span>
        <span class="day-count">${(day.items || []).length}</span>
      </div>
      <div class="list">${renderItems(day.items)}</div>
    </section>`).join('');
}

/* ---------- calendar ---------- */
function latestCursor() {
  const iso = DATA.days[0] && DATA.days[0].iso;
  if (iso) {
    const [y, m] = iso.split('-').map(Number);
    return { y, m: m - 1 };
  }
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() };
}

function isFutureMonth(c) {
  const last = latestCursor();
  return c.y > last.y || (c.y === last.y && c.m > last.m);
}

function renderCalendar() {
  if (!calCursor) calCursor = latestCursor();
  const { y, m } = calCursor;
  calTitle.textContent = `${MONTHS[m]} ${y}`;

  const firstWeekday = new Date(y, m, 1).getDay();   // 0 = Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayIso = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  })();

  let cells = '';
  for (let i = 0; i < firstWeekday; i++) cells += '<span class="cal-cell empty"></span>';
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
    const day = byIso[iso];
    const cls = ['cal-cell'];
    if (day) cls.push('has-news');
    if (iso === todayIso) cls.push('today');
    const badge = day ? `<span class="cal-badge">${(day.items || []).length}</span>` : '';
    const attr = day ? ` data-iso="${iso}" role="button" tabindex="0"` : '';
    cells += `<span class="${cls.join(' ')}"${attr}><span class="cal-num">${d}</span>${badge}</span>`;
  }
  calGrid.innerHTML = cells;

  document.getElementById('cal-next').disabled = isFutureMonth({ y, m: m + 1 });
}

function shiftMonth(delta) {
  let { y, m } = calCursor;
  m += delta;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  if (delta > 0 && isFutureMonth({ y, m })) return;
  calCursor = { y, m };
  renderCalendar();
}

/* ---------- single day ---------- */
function openDay(iso) {
  const day = byIso[iso];
  if (!day) return;
  dayContent.innerHTML = `
    <div class="day-head day-head--detail">
      <span class="day-date">${escapeHTML(day.date || '')}</span>
      <span class="day-rule"></span>
      <span class="day-count">${(day.items || []).length}</span>
    </div>
    <div class="list">${renderItems(day.items)}</div>`;
  setView('day');
}

/* ---------- data load ---------- */
function applyData(data) {
  DATA = data || { days: [] };
  byIso = {};
  (DATA.days || []).forEach((d) => { if (d.iso) byIso[d.iso] = d; });
  updatedEl.textContent = formatUpdated(DATA.updated);
  calCursor = latestCursor();
  renderFeed();
  renderCalendar();
}

async function load() {
  refreshBtn.classList.add('spin');
  try {
    const res = await fetch('./data/news.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    applyData(await res.json());
  } catch (err) {
    feedEl.innerHTML = '<div class="error">Could not load headlines.<br>' +
      escapeHTML(String(err.message || err)) + '</div>';
  } finally {
    refreshBtn.classList.remove('spin');
  }
}

/* ---------- events ---------- */
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => setView(t.dataset.view)));
document.getElementById('cal-prev').addEventListener('click', () => shiftMonth(-1));
document.getElementById('cal-next').addEventListener('click', () => shiftMonth(1));
document.getElementById('day-back').addEventListener('click', () => setView('calendar'));
refreshBtn.addEventListener('click', load);

calGrid.addEventListener('click', (e) => {
  const cell = e.target.closest('.cal-cell.has-news');
  if (cell) openDay(cell.dataset.iso);
});
calGrid.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('has-news')) {
    e.preventDefault();
    openDay(e.target.dataset.iso);
  }
});

load();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
