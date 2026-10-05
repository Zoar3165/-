// תפריט נגישות: גודל טקסט, ניגודיות גבוהה, גווני אפור, הדגשת קישורים, גופן קריא, עצירת אנימציות, איפוס.
// ההעדפות נשמרות ב-localStorage בלבד. ללא inline – תואם CSP.
const KEY = 'a11y-prefs';
const TOGGLES = ['contrast', 'gray', 'links', 'font', 'still'];
const FS_LEVELS = [100, 115, 130, 150, 175];
const root = document.documentElement;

function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }

export function isStill() {
  return root.classList.contains('a11y-still') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function apply(p) {
  FS_LEVELS.forEach((_, i) => root.classList.toggle(`a11y-fs-${i}`, i > 0 && p.fs === i));
  for (const t of TOGGLES) root.classList.toggle(`a11y-${t}`, !!p[t]);
  const panel = document.getElementById('a11y-panel');
  if (!panel) return;
  for (const t of TOGGLES) panel.querySelector(`[data-a11y="${t}"]`)?.setAttribute('aria-pressed', String(!!p[t]));
  const val = document.getElementById('a11y-fs-val');
  if (val) val.textContent = `${FS_LEVELS[p.fs || 0]}%`;
  panel.querySelector('[data-a11y="fs-down"]').disabled = !p.fs;
  panel.querySelector('[data-a11y="fs-up"]').disabled = (p.fs || 0) >= FS_LEVELS.length - 1;
  document.dispatchEvent(new CustomEvent('a11y-change', { detail: p }));
}

export function initA11y() {
  const btn = document.getElementById('a11y-toggle');
  const panel = document.getElementById('a11y-panel');
  if (!btn || !panel) return;
  let prefs = load();
  apply(prefs);

  const open = () => {
    panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
    panel.querySelector('button, a')?.focus();
  };
  const close = (returnFocus = true) => {
    if (panel.hidden) return;
    panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  };
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  document.addEventListener('click', (e) => { if (!panel.hidden && !e.target.closest('#a11y')) close(false); });
  document.addEventListener('focusin', (e) => { if (!panel.hidden && !e.target.closest('#a11y')) close(false); });

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a11y]');
    if (!b) return;
    const a = b.dataset.a11y;
    if (a === 'close') return close();
    if (a === 'reset') prefs = {};
    else if (a === 'fs-up') prefs.fs = Math.min(FS_LEVELS.length - 1, (prefs.fs || 0) + 1);
    else if (a === 'fs-down') prefs.fs = Math.max(0, (prefs.fs || 0) - 1);
    else if (TOGGLES.includes(a)) prefs[a] = !prefs[a];
    if (!prefs.fs) delete prefs.fs;
    for (const t of TOGGLES) if (!prefs[t]) delete prefs[t];
    save(prefs); apply(prefs);
    if (b.disabled) panel.querySelector('[data-a11y="fs-up"]:not(:disabled), [data-a11y="fs-down"]:not(:disabled)')?.focus();
  });
}
