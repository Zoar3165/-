// רכיבי תצוגה משותפים ללוח הזמנים (עמוד הבית ועמוד הזמנים)
import { el } from './main.js';
import { ymdInTz, ymdKey, nextItem } from './schedule.js';
import { isStill } from './a11y.js';

/** רשימת תפילות ושיעורים ליום, עם סימון "הבא" ו"עבר" אם זה היום */
export function renderDayList(day, { now = null, compact = false, tomorrow = null } = {}) {
  const items = [...day.prayers, ...day.lessons];
  const dated = items.filter((i) => i.date).sort((a, b) => a.date - b.date);
  const undated = items.filter((i) => !i.date);
  const next = now ? nextItem(day, now) : null;
  const ul = el('ul', { class: 'time-list' });
  const row = (it, timeText, isTxt) => {
    const cls = [it === next ? 'next' : '', now && it.date && it.date <= now ? 'past' : '', it.special ? 'special' : ''].filter(Boolean).join(' ');
    return el('li', { class: cls || null },
      el('span', { class: 'lbl' }, it.label, !compact && it.note ? el('small', { text: it.note }) : null),
      el('span', { class: isTxt ? 't txt' : 't', dir: isTxt ? null : 'ltr', text: timeText }));
  };
  for (const it of dated) ul.append(row(it, it.time, false));
  for (const it of undated) ul.append(row(it, it.after || '', true));
  if (day.kollel && !compact) ul.append(row({ label: day.kollel.title }, `${day.kollel.start}–${day.kollel.end}`, false));
  const frag = [ul];
  for (const n of day.notes) frag.push(el('p', { class: 'note', text: n }));
  if (now && !next && tomorrow && tomorrow.timeline[0]) {
    const t = tomorrow.timeline[0];
    frag.push(el('p', { class: 'note next-day', text: `התפילה הבאה: ${t.label} מחר (${tomorrow.dayName}) בשעה ${t.time}` }));
  }
  return frag;
}

export function dayChips(day) {
  const chips = [el('span', { class: 'badge navy', text: day.seasonLabel })];
  if (day.parasha) chips.push(el('span', { class: 'badge', text: day.parasha }));
  for (const h of day.holidays) chips.push(el('span', { class: 'badge', text: h }));
  return chips;
}

/** שעון חי + רענון בחצות (ובדיקה כל דקה, למקרה שהלשונית "ישנה") */
export function startClock(tz, onSecond, onNewDay) {
  // בהעדפת "עצירת אנימציות" / prefers-reduced-motion – השעון מוצג ללא שניות ומתעדכן פעם בדקה
  const fmtS = new Intl.DateTimeFormat('he-IL', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const fmtM = new Intl.DateTimeFormat('he-IL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fmt = { format: (d) => (isStill() ? fmtM : fmtS).format(d) };
  let key = ymdKey(ymdInTz(new Date(), tz));
  let lastMinute = -1;
  const tick = () => {
    const now = new Date();
    onSecond?.(fmt.format(now), now, now.getMinutes() !== lastMinute);
    lastMinute = now.getMinutes();
    const k = ymdKey(ymdInTz(now, tz));
    if (k !== key) { key = k; onNewDay?.(); }
  };
  tick();
  // יישור לתחילת השנייה
  setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  document.addEventListener('a11y-change', tick);
}
