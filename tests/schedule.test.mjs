// בדיקת חישוב הזמנים: node tests/schedule.test.mjs
// משתמש בעותק המקומי של hebcal (assets/vendor) – אין צורך בהתקנה.
import * as hc from '../assets/vendor/hebcal-core.min.js';
import { CONFIG } from '../assets/js/config.js';
import { computeDay, nextShabbatYmd } from '../assets/js/schedule.js';

let fail = 0;
const eq = (name, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${got}${ok ? '' : ` (expected ${want})`}`);
};
const show = (d) => {
  console.log(`\n=== ${d.key} ${d.dayName} | ${d.hebrewDate} | ${d.seasonLabel}${d.parasha ? ' | ' + d.parasha : ''}${d.holidays.length ? ' | ' + d.holidays.join(', ') : ''}`);
  console.log(`  נץ ${d.zmanim.sunriseStr} | שקיעה ${d.zmanim.sunsetStr} | צאת ${d.zmanim.tzeitStr}${d.zmanim.candleStr ? ' | הדלקת נרות ' + d.zmanim.candleStr : ''}`);
  for (const p of d.prayers) console.log(`  ${p.label}: ${p.time}${p.note ? ' (' + p.note + ')' : ''}`);
  for (const l of d.lessons) console.log(`  ${l.label}: ${l.time || l.after}`);
  for (const n of d.notes) console.log(`  * ${n}`);
  if (d.kollel) console.log(`  כולל: ${d.kollel.start}-${d.kollel.end}`);
};
const LOC = new hc.Location(CONFIG.location.latitude, CONFIG.location.longitude, true, 'Asia/Jerusalem', CONFIG.location.hebcalCity);
const hm = (date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
const P = (d, k) => d.prayers.find((p) => p.key === k)?.time;
const floorHM = (date, minus) => hm(new Date(Math.floor((date.getTime() - minus * 60000) / 60000) * 60000));

eq('default location = Tel Aviv', `${CONFIG.location.hebcalCity} ${CONFIG.location.latitude},${CONFIG.location.longitude}`, 'Tel Aviv 32.0853,34.7818');

// 1) היום – יום ראשון 4.10.2026 (קיץ)
const today = computeDay(hc, CONFIG, { y: 2026, m: 10, d: 4 }); show(today);
eq('today season', today.season, 'summer');
eq('today hebrew date', today.hebrewDate, 'כ״ג תשרי תשפ״ז');
eq('shacharit = netz-40 floor', P(today, 'shacharit'), floorHM(new hc.Zmanim(LOC, new Date(2026, 9, 4), false).sunrise(), 40));
eq('mincha gedola summer weekday', P(today, 'minchaG'), '13:15');
eq('arvit = shkia', P(today, 'arvit'), today.zmanim.sunsetStr);

// 2) שבת הקרובה 10.10.2026 – בראשית
const sh = computeDay(hc, CONFIG, nextShabbatYmd({ y: 2026, m: 10, d: 4 })); show(sh);
eq('next shabbat date', sh.key, '2026-10-10');
eq('parasha', sh.parasha, 'פרשת בראשית');
eq('shabbat shacharit', P(sh, 'shacharit'), '08:00');
eq('shabbat mincha gedola summer', P(sh, 'minchaG'), '13:15');
eq('arvit motzash = hebcal havdalah (Tel Aviv)', P(sh, 'arvit'), '18:51');
const fri = computeDay(hc, CONFIG, { y: 2026, m: 10, d: 9 }); show(fri);
eq('friday candle lighting (Tel Aviv convention, hebcal)', fri.zmanim.candleStr, '17:55');
eq('Tel Aviv candle minutes = 20', fri.zmanim.candleMinsBeforeSunset, 20);
const JLM = { ...CONFIG, location: { ...CONFIG.location, name: 'ירושלים', hebcalCity: 'Jerusalem', latitude: 31.778, longitude: 35.2354 } };
const friJ = computeDay(hc, JLM, { y: 2026, m: 10, d: 9 });
eq('Jerusalem override: candle lighting 40 min', `${friJ.zmanim.candleStr} (${friJ.zmanim.candleMinsBeforeSunset})`, '17:34 (40)');
const friX = computeDay(hc, { ...CONFIG, location: { ...CONFIG.location, candleLightingMins: 30 } }, { y: 2026, m: 10, d: 9 });
eq('explicit candleLightingMins=30 respected', friX.zmanim.candleMinsBeforeSunset, 30);
eq('friday has no arvit (kabbalat shabbat not invented)', P(fri, 'arvit'), undefined);

// 3) יום חול בחורף – רביעי 13.1.2027
const w = computeDay(hc, CONFIG, { y: 2027, m: 1, d: 13 }); show(w);
eq('winter season', w.season, 'winter');
eq('mincha gedola winter weekday', P(w, 'minchaG'), '12:30');
eq('wednesday special lesson', !!w.lessons.find((l) => l.key === 'wednesday'), true);
eq('kollel winter', w.kollel && `${w.kollel.start}-${w.kollel.end}`, '09:30-12:30');

// 4) שבת בחורף 16.1.2027
const ws = computeDay(hc, CONFIG, { y: 2027, m: 1, d: 16 }); show(ws);
eq('shabbat mincha gedola winter', P(ws, 'minchaG'), '12:45');
const mk = ws.prayers.find((p) => p.key === 'minchaK');
eq('shabbat mincha ketana = shkia-50', mk.time, floorHM(new hc.Zmanim(LOC, new Date(2027, 0, 16), false).sunset(), 50));
eq('shabbat lesson = mincha ketana - 60', ws.lessons[0].time, hm(new Date(mk.date - 3600000)));

// 5) שבת בקיץ 11.7.2026
const ss = computeDay(hc, CONFIG, { y: 2026, m: 7, d: 11 }); show(ss);
eq('summer shabbat season', ss.season, 'summer');

// 6) מעבר שעון חורף: 24.10.2026 (קיץ) / 25.10.2026 (חורף)
eq('DST last day (Sat 24.10)', computeDay(hc, CONFIG, { y: 2026, m: 10, d: 24 }).season, 'summer');
eq('winter first day (Sun 25.10)', computeDay(hc, CONFIG, { y: 2026, m: 10, d: 25 }).season, 'winter');

// 7) יום כיפור 2027 ושמיני עצרת 2026
show(computeDay(hc, CONFIG, { y: 2026, m: 10, d: 3 }));
show(computeDay(hc, CONFIG, { y: 2027, m: 10, d: 11 }));

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
