// FinFeed — render the daily headline feed from data/news.json
const feedEl = document.getElementById('feed');
const updatedEl = document.getElementById('updated');
const refreshBtn = document.getElementById('refresh');

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({
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

function render(data) {
  const days = (data && data.days) || [];
  updatedEl.textContent = formatUpdated(data && data.updated);

  if (!days.length) {
    feedEl.innerHTML = '<div class="empty">No headlines yet. Check back after the next update.</div>';
    return;
  }

  const html = days.map((day) => {
    const items = (day.items || []).map((title, i) => `
      <div class="item" style="animation-delay:${Math.min(i * 22, 400)}ms">
        <span class="dot"></span>
        <span class="title">${escapeHTML(title)}</span>
      </div>`).join('');
    return `
      <section class="day">
        <div class="day-head">
          <span class="day-date">${escapeHTML(day.date || '')}</span>
          <span class="day-rule"></span>
          <span class="day-count">${(day.items || []).length}</span>
        </div>
        <div class="list">${items}</div>
      </section>`;
  }).join('');

  feedEl.innerHTML = html;
}

async function load() {
  refreshBtn.classList.add('spin');
  try {
    // cache-bust so a fresh daily commit shows up immediately
    const res = await fetch('./data/news.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    render(data);
  } catch (err) {
    feedEl.innerHTML = '<div class="error">Could not load headlines.<br>' +
      escapeHTML(String(err.message || err)) + '</div>';
  } finally {
    refreshBtn.classList.remove('spin');
  }
}

refreshBtn.addEventListener('click', load);
load();

// Register the service worker for offline / installable PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
